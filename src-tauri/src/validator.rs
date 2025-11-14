use anyhow::{Context, Result};
use serde_json::Value;

use crate::types::PortfolioData;

/// Validate and parse JSON string into PortfolioData
pub fn validate_portfolio_json(json_str: &str) -> Result<PortfolioData> {
    // First, try to parse as JSON
    let json_value: Value = serde_json::from_str(json_str)
        .context("Invalid JSON format")?;

    // Try to deserialize into PortfolioData structure
    let portfolio: PortfolioData = serde_json::from_value(json_value.clone())
        .context("JSON does not match PortfolioData schema")?;

    // Perform additional validation
    validate_portfolio_data(&portfolio)?;

    Ok(portfolio)
}

/// Perform semantic validation on portfolio data
fn validate_portfolio_data(data: &PortfolioData) -> Result<()> {
    // Validate profile
    if data.profile.full_name.trim().is_empty() {
        return Err(anyhow::anyhow!("Profile fullName cannot be empty"));
    }

    if data.profile.title.trim().is_empty() {
        return Err(anyhow::anyhow!("Profile title cannot be empty"));
    }

    // Validate work experience dates
    for (idx, exp) in data.work_experience.iter().enumerate() {
        if exp.company.trim().is_empty() {
            return Err(anyhow::anyhow!(
                "Work experience #{} company name cannot be empty",
                idx + 1
            ));
        }

        if exp.title.trim().is_empty() {
            return Err(anyhow::anyhow!(
                "Work experience #{} title cannot be empty",
                idx + 1
            ));
        }

        // Validate date format (YYYY-MM or "Present")
        if exp.end_date != "Present" && !is_valid_date_format(&exp.end_date, true) {
            return Err(anyhow::anyhow!(
                "Work experience #{} end date has invalid format (expected YYYY-MM or 'Present')",
                idx + 1
            ));
        }

        if !is_valid_date_format(&exp.start_date, true) {
            return Err(anyhow::anyhow!(
                "Work experience #{} start date has invalid format (expected YYYY-MM)",
                idx + 1
            ));
        }
    }

    // Validate projects
    for (idx, project) in data.projects.iter().enumerate() {
        if project.name.trim().is_empty() {
            return Err(anyhow::anyhow!(
                "Project #{} name cannot be empty",
                idx + 1
            ));
        }

        if project.description.trim().is_empty() {
            return Err(anyhow::anyhow!(
                "Project #{} description cannot be empty",
                idx + 1
            ));
        }
    }

    // Validate education
    for (idx, edu) in data.education.iter().enumerate() {
        if edu.institution.trim().is_empty() {
            return Err(anyhow::anyhow!(
                "Education #{} institution cannot be empty",
                idx + 1
            ));
        }

        if edu.degree.trim().is_empty() {
            return Err(anyhow::anyhow!(
                "Education #{} degree cannot be empty",
                idx + 1
            ));
        }

        // Validate year format (YYYY)
        if !is_valid_date_format(&edu.end_date, false) {
            return Err(anyhow::anyhow!(
                "Education #{} end date has invalid format (expected YYYY)",
                idx + 1
            ));
        }

        if let Some(start_date) = &edu.start_date {
            if !is_valid_date_format(start_date, false) {
                return Err(anyhow::anyhow!(
                    "Education #{} start date has invalid format (expected YYYY)",
                    idx + 1
                ));
            }
        }
    }

    // Validate skills
    for (idx, skill) in data.skills.iter().enumerate() {
        if skill.category.trim().is_empty() {
            return Err(anyhow::anyhow!(
                "Skill category #{} name cannot be empty",
                idx + 1
            ));
        }

        if skill.items.is_empty() {
            return Err(anyhow::anyhow!(
                "Skill category #{} must have at least one item",
                idx + 1
            ));
        }
    }

    // Validate theme
    if data.theme.name.trim().is_empty() {
        return Err(anyhow::anyhow!("Theme name cannot be empty"));
    }

    Ok(())
}

/// Validate date format (YYYY or YYYY-MM)
fn is_valid_date_format(date_str: &str, include_month: bool) -> bool {
    if include_month {
        // Format: YYYY-MM
        let parts: Vec<&str> = date_str.split('-').collect();
        if parts.len() != 2 {
            return false;
        }

        let year = parts[0].parse::<i32>();
        let month = parts[1].parse::<i32>();

        if let (Ok(y), Ok(m)) = (year, month) {
            y >= 1900 && y <= 2100 && m >= 1 && m <= 12
        } else {
            false
        }
    } else {
        // Format: YYYY
        if let Ok(year) = date_str.parse::<i32>() {
            year >= 1900 && year <= 2100
        } else {
            false
        }
    }
}

/// Extract JSON from LLM response (handles cases where LLM adds markdown formatting)
pub fn extract_json_from_response(response: &str) -> Result<String> {
    let trimmed = response.trim();

    // Check if wrapped in markdown code block
    if trimmed.starts_with("```json") || trimmed.starts_with("```") {
        let lines: Vec<&str> = trimmed.lines().collect();
        if lines.len() >= 3 {
            // Remove first and last lines (``` markers)
            let json_lines = &lines[1..lines.len() - 1];
            return Ok(json_lines.join("\n"));
        }
    }

    // Try to find JSON object in the response
    if let Some(start) = trimmed.find('{') {
        if let Some(end) = trimmed.rfind('}') {
            if end > start {
                return Ok(trimmed[start..=end].to_string());
            }
        }
    }

    // If no processing needed, return as-is
    Ok(trimmed.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_date_formats() {
        assert!(is_valid_date_format("2020", false));
        assert!(is_valid_date_format("2020-01", true));
        assert!(is_valid_date_format("2020-12", true));
        assert!(!is_valid_date_format("2020-13", true));
        assert!(!is_valid_date_format("20-01", true));
        assert!(!is_valid_date_format("abc", false));
    }

    #[test]
    fn test_extract_json() {
        let markdown_json = "```json\n{\"test\": \"value\"}\n```";
        let extracted = extract_json_from_response(markdown_json).unwrap();
        assert_eq!(extracted, "{\"test\": \"value\"}");

        let plain_json = "{\"test\": \"value\"}";
        let extracted = extract_json_from_response(plain_json).unwrap();
        assert_eq!(extracted, "{\"test\": \"value\"}");
    }
}
