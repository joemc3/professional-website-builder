use anyhow::{Context, Result};
use reqwest::blocking::Client;
use serde_json::{json, Value};

use crate::types::LLMProvider;

const ANTHROPIC_API_URL: &str = "https://api.anthropic.com/v1/messages";
const OPENAI_API_URL: &str = "https://api.openai.com/v1/chat/completions";
const GEMINI_API_URL: &str = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

pub struct LLMClient {
    client: Client,
}

impl LLMClient {
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(60))
                .build()
                .expect("Failed to create HTTP client"),
        }
    }

    /// Send a request to the specified LLM provider
    pub fn request_json_generation(
        &self,
        provider: LLMProvider,
        api_key: &str,
        aggregated_text: &str,
        endpoint_url: Option<&str>,
    ) -> Result<String> {
        let prompt = self.create_prompt(aggregated_text);

        match provider {
            LLMProvider::Anthropic => self.request_anthropic(api_key, &prompt),
            LLMProvider::OpenAI => self.request_openai(api_key, &prompt),
            LLMProvider::Gemini => self.request_gemini(api_key, &prompt),
            LLMProvider::Local => {
                let url = endpoint_url.ok_or_else(|| {
                    anyhow::anyhow!("Local LLM endpoint URL is required")
                })?;
                self.request_local(url, &prompt)
            }
        }
    }

    /// Create the prompt for the LLM
    fn create_prompt(&self, aggregated_text: &str) -> String {
        format!(
            r#"You are an expert assistant that helps create professional portfolio websites.

I will provide you with raw text extracted from professional documents (resumes, CVs, project descriptions, etc.).

Your task is to analyze this text and generate a structured JSON object that follows this exact schema:

{{
  "profile": {{
    "fullName": "string (required)",
    "title": "string (required - professional title)",
    "summary": "string (optional - 2-4 sentence professional summary)"
  }},
  "contact": {{
    "email": "string (optional)",
    "phone": "string (optional)",
    "website": "string (optional)",
    "socialLinks": [
      {{
        "platform": "string (e.g., GitHub, LinkedIn)",
        "url": "string (full URL)"
      }}
    ]
  }},
  "workExperience": [
    {{
      "company": "string (required)",
      "location": "string (optional)",
      "title": "string (required)",
      "startDate": "string (required, YYYY-MM format)",
      "endDate": "string (required, YYYY-MM format or 'Present')",
      "responsibilities": ["string (optional)"]
    }}
  ],
  "projects": [
    {{
      "name": "string (required)",
      "description": "string (required)",
      "technologies": ["string (optional)"],
      "url": "string (optional)"
    }}
  ],
  "education": [
    {{
      "institution": "string (required)",
      "degree": "string (required)",
      "fieldOfStudy": "string (optional)",
      "startDate": "string (optional, YYYY format)",
      "endDate": "string (required, YYYY format)"
    }}
  ],
  "skills": [
    {{
      "category": "string (required, e.g., 'Programming Languages')",
      "items": ["string (required)"]
    }}
  ],
  "theme": {{
    "name": "onyx"
  }}
}}

Instructions:
1. Extract information from the provided text
2. Organize it according to the schema above
3. Use professional language and proper formatting
4. If information is missing, use empty arrays or omit optional fields
5. Ensure dates are in the correct format (YYYY-MM or YYYY)
6. Return ONLY the JSON object, no additional text or explanation

Here is the text to analyze:

---
{}
---

Return the JSON object now:"#,
            aggregated_text
        )
    }

    /// Request from Anthropic Claude API
    fn request_anthropic(&self, api_key: &str, prompt: &str) -> Result<String> {
        let body = json!({
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 4096,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        });

        let response = self
            .client
            .post(ANTHROPIC_API_URL)
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .context("Failed to send request to Anthropic API")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().unwrap_or_default();
            return Err(anyhow::anyhow!(
                "Anthropic API error ({}): {}",
                status,
                error_text
            ));
        }

        let response_json: Value = response.json()
            .context("Failed to parse Anthropic API response")?;

        // Extract the text content from the response
        let text = response_json["content"][0]["text"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid Anthropic API response format"))?;

        Ok(text.to_string())
    }

    /// Request from OpenAI API
    fn request_openai(&self, api_key: &str, prompt: &str) -> Result<String> {
        let body = json!({
            "model": "gpt-4-turbo-preview",
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert assistant that generates structured JSON data for professional portfolios."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "response_format": { "type": "json_object" },
            "temperature": 0.7
        });

        let response = self
            .client
            .post(OPENAI_API_URL)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .context("Failed to send request to OpenAI API")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().unwrap_or_default();
            return Err(anyhow::anyhow!("OpenAI API error ({}): {}", status, error_text));
        }

        let response_json: Value = response.json()
            .context("Failed to parse OpenAI API response")?;

        let text = response_json["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid OpenAI API response format"))?;

        Ok(text.to_string())
    }

    /// Request from Google Gemini API
    fn request_gemini(&self, api_key: &str, prompt: &str) -> Result<String> {
        let url = format!("{}?key={}", GEMINI_API_URL, api_key);

        let body = json!({
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 4096
            }
        });

        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .context("Failed to send request to Gemini API")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().unwrap_or_default();
            return Err(anyhow::anyhow!("Gemini API error ({}): {}", status, error_text));
        }

        let response_json: Value = response.json()
            .context("Failed to parse Gemini API response")?;

        let text = response_json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid Gemini API response format"))?;

        Ok(text.to_string())
    }

    /// Request from Local LLM (Ollama, LM Studio, etc.)
    fn request_local(&self, endpoint_url: &str, prompt: &str) -> Result<String> {
        // Most local LLM servers follow OpenAI-compatible API
        let body = json!({
            "prompt": prompt,
            "stream": false,
            "max_tokens": 4096
        });

        let response = self
            .client
            .post(endpoint_url)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .context("Failed to send request to local LLM")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().unwrap_or_default();
            return Err(anyhow::anyhow!("Local LLM error ({}): {}", status, error_text));
        }

        let response_json: Value = response.json()
            .context("Failed to parse local LLM response")?;

        // Try different response formats (Ollama vs LM Studio)
        let text = response_json["response"]
            .as_str()
            .or_else(|| response_json["choices"][0]["text"].as_str())
            .or_else(|| response_json["text"].as_str())
            .ok_or_else(|| anyhow::anyhow!("Invalid local LLM response format"))?;

        Ok(text.to_string())
    }

    /// Test API connection
    pub fn test_connection(
        &self,
        provider: LLMProvider,
        api_key: &str,
        endpoint_url: Option<&str>,
    ) -> Result<bool> {
        let test_prompt = "Respond with the word 'OK' if you can read this message.";

        match self.request_json_generation(provider, api_key, test_prompt, endpoint_url) {
            Ok(_) => Ok(true),
            Err(e) => Err(e),
        }
    }
}

impl Default for LLMClient {
    fn default() -> Self {
        Self::new()
    }
}
