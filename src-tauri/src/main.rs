// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod document_parser;
mod llm_client;
mod storage;
mod types;
mod validator;

use commands::*;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ingest_files,
            get_aggregated_text,
            get_json_from_ai,
            generate_website,
            save_api_key,
            get_api_key,
            delete_api_key,
            test_api_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
