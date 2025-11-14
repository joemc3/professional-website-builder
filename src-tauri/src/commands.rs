use std::fs;
use std::path::PathBuf;
use tauri::api::path::app_data_dir;

use crate::document_parser;
use crate::llm_client::LLMClient;
use crate::storage;
use crate::types::LLMProvider;
use crate::validator;

/// State to track ingested files
static mut INGESTED_FILES: Option<Vec<String>> = None;
static mut AGGREGATED_TEXT: Option<String> = None;

/// Get the user data directory
fn get_user_data_dir(app_handle: tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data = app_data_dir(&app_handle.config())
        .ok_or_else(|| "Failed to get app data directory".to_string())?;

    let user_data = app_data.join("user-data");

    // Create directories if they don't exist
    fs::create_dir_all(&user_data).map_err(|e| e.to_string())?;
    fs::create_dir_all(user_data.join("source-files")).map_err(|e| e.to_string())?;
    fs::create_dir_all(user_data.join("generated-site")).map_err(|e| e.to_string())?;

    Ok(user_data)
}

/// Ingest files: copy to user-data directory and parse
#[tauri::command]
pub fn ingest_files(
    files: Vec<String>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let user_data_dir = get_user_data_dir(app_handle)?;
    let source_files_dir = user_data_dir.join("source-files");

    let mut ingested_paths = Vec::new();
    let mut text_parts = Vec::new();

    for file_path in files {
        let path = PathBuf::from(&file_path);

        // Get filename
        let filename = path
            .file_name()
            .ok_or_else(|| format!("Invalid file path: {}", file_path))?
            .to_str()
            .ok_or_else(|| "Invalid filename".to_string())?;

        // Copy file to source-files directory
        let dest_path = source_files_dir.join(filename);
        fs::copy(&path, &dest_path).map_err(|e| {
            format!("Failed to copy file {}: {}", filename, e)
        })?;

        // Parse the document
        match document_parser::parse_document(dest_path.to_str().unwrap()) {
            Ok(text) => {
                text_parts.push(format!("=== {} ===\n{}\n", filename, text));
                ingested_paths.push(dest_path.to_string_lossy().to_string());
            }
            Err(e) => {
                return Err(format!("Failed to parse {}: {}", filename, e));
            }
        }
    }

    // Store the aggregated text and file paths
    unsafe {
        INGESTED_FILES = Some(ingested_paths);
        AGGREGATED_TEXT = Some(text_parts.join("\n\n"));
    }

    Ok(())
}

/// Get aggregated text from all ingested documents
#[tauri::command]
pub fn get_aggregated_text() -> Result<String, String> {
    unsafe {
        AGGREGATED_TEXT
            .clone()
            .ok_or_else(|| "No documents have been ingested yet".to_string())
    }
}

/// Get JSON from AI (Cloud or Local)
#[tauri::command]
pub fn get_json_from_ai(
    tier: String,
    aggregated_text: Option<String>,
) -> Result<String, String> {
    // Get the text to process
    let text = if let Some(t) = aggregated_text {
        t
    } else {
        unsafe {
            AGGREGATED_TEXT
                .clone()
                .ok_or_else(|| "No aggregated text available".to_string())?
        }
    };

    // Parse the provider
    let provider = LLMProvider::from_string(&tier)
        .map_err(|e| format!("Invalid LLM provider: {}", e))?;

    // Get API key or endpoint
    let (api_key, endpoint) = match provider {
        LLMProvider::Local => {
            let endpoint = storage::get_api_key("local_endpoint")
                .map_err(|_| "Local LLM endpoint not configured".to_string())?;
            (String::new(), Some(endpoint))
        }
        _ => {
            let key = storage::get_api_key(&tier.to_lowercase())
                .map_err(|_| format!("API key for {} not found", tier))?;
            (key, None)
        }
    };

    // Create LLM client and make request
    let client = LLMClient::new();
    let response = client
        .request_json_generation(
            provider,
            &api_key,
            &text,
            endpoint.as_deref(),
        )
        .map_err(|e| format!("LLM request failed: {}", e))?;

    // Extract JSON from response (handles markdown formatting)
    let json_str = validator::extract_json_from_response(&response)
        .map_err(|e| format!("Failed to extract JSON: {}", e))?;

    // Validate the JSON
    validator::validate_portfolio_json(&json_str)
        .map_err(|e| format!("Invalid portfolio JSON: {}", e))?;

    Ok(json_str)
}

/// Generate website from JSON data
#[tauri::command]
pub fn generate_website(
    json_data: String,
    theme: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    // Validate the JSON data first
    validator::validate_portfolio_json(&json_data)
        .map_err(|e| format!("Invalid portfolio data: {}", e))?;

    // Get user data directory
    let user_data_dir = get_user_data_dir(app_handle.clone())?;

    // Write JSON to session.json
    let session_file = user_data_dir.join("session.json");
    fs::write(&session_file, &json_data)
        .map_err(|e| format!("Failed to write session file: {}", e))?;

    // Get the project root directory (parent of src-tauri)
    let app_dir = app_handle
        .path_resolver()
        .app_dir()
        .ok_or_else(|| "Failed to get app directory".to_string())?;

    let project_root = app_dir
        .parent()
        .ok_or_else(|| "Failed to get project root".to_string())?;

    // Build the Next.js site
    let output = std::process::Command::new("npm")
        .args(&["run", "generator:build"])
        .current_dir(project_root)
        .env("THEME_NAME", &theme)
        .env("SESSION_FILE", session_file.to_string_lossy().to_string())
        .output()
        .map_err(|e| format!("Failed to run build command: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Build failed: {}", stderr));
    }

    Ok(())
}

/// Save an API key securely
#[tauri::command]
pub fn save_api_key(provider: String, api_key: String) -> Result<(), String> {
    storage::save_api_key(&provider.to_lowercase(), &api_key)
        .map_err(|e| format!("Failed to save API key: {}", e))
}

/// Get an API key (returns empty string if not found)
#[tauri::command]
pub fn get_api_key(provider: String) -> Result<String, String> {
    storage::get_api_key(&provider.to_lowercase())
        .map_err(|e| format!("API key not found: {}", e))
}

/// Delete an API key
#[tauri::command]
pub fn delete_api_key(provider: String) -> Result<(), String> {
    storage::delete_api_key(&provider.to_lowercase())
        .map_err(|e| format!("Failed to delete API key: {}", e))
}

/// Test API connection
#[tauri::command]
pub fn test_api_connection(provider: String) -> Result<bool, String> {
    let provider_enum = LLMProvider::from_string(&provider)
        .map_err(|e| format!("Invalid provider: {}", e))?;

    let (api_key, endpoint) = match provider_enum {
        LLMProvider::Local => {
            let endpoint = storage::get_api_key("local_endpoint")
                .map_err(|_| "Local endpoint not configured".to_string())?;
            (String::new(), Some(endpoint))
        }
        _ => {
            let key = storage::get_api_key(&provider.to_lowercase())
                .map_err(|_| "API key not found".to_string())?;
            (key, None)
        }
    };

    let client = LLMClient::new();
    client
        .test_connection(provider_enum, &api_key, endpoint.as_deref())
        .map_err(|e| format!("Connection test failed: {}", e))
}
