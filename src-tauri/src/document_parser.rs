use anyhow::{Context, Result};
use std::fs;
use std::path::Path;

/// Parses a document and extracts raw text
pub fn parse_document(file_path: &str) -> Result<String> {
    let path = Path::new(file_path);
    let extension = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    match extension.as_str() {
        "md" => parse_markdown(file_path),
        "docx" => parse_docx(file_path),
        "pdf" => parse_pdf(file_path),
        "xlsx" => parse_xlsx(file_path),
        "pptx" => parse_pptx(file_path),
        _ => Err(anyhow::anyhow!("Unsupported file type: {}", extension)),
    }
}

/// Parse Markdown files
fn parse_markdown(file_path: &str) -> Result<String> {
    let content = fs::read_to_string(file_path)
        .context("Failed to read markdown file")?;

    // Use comrak to parse markdown and extract text
    let arena = comrak::Arena::new();
    let root = comrak::parse_document(&arena, &content, &comrak::ComrakOptions::default());

    // Convert back to text (we could also convert to HTML if needed)
    let mut text = Vec::new();
    comrak::format_commonmark(root, &comrak::ComrakOptions::default(), &mut text)?;

    String::from_utf8(text).context("Failed to convert markdown to string")
}

/// Parse DOCX files
fn parse_docx(file_path: &str) -> Result<String> {
    let file = fs::File::open(file_path)
        .context("Failed to open docx file")?;

    let mut archive = zip::ZipArchive::new(file)
        .context("Failed to read docx archive")?;

    // Read the document.xml file from the DOCX archive
    let mut document = archive.by_name("word/document.xml")
        .context("Failed to find document.xml in docx file")?;

    let mut content = String::new();
    std::io::Read::read_to_string(&mut document, &mut content)
        .context("Failed to read document.xml")?;

    // Parse XML and extract text nodes
    extract_text_from_xml(&content)
}

/// Parse PDF files
fn parse_pdf(file_path: &str) -> Result<String> {
    let bytes = fs::read(file_path)
        .context("Failed to read PDF file")?;

    let out = pdf_extract::extract_text_from_mem(&bytes)
        .context("Failed to extract text from PDF")?;

    Ok(out)
}

/// Parse XLSX files
fn parse_xlsx(file_path: &str) -> Result<String> {
    let file = fs::File::open(file_path)
        .context("Failed to open xlsx file")?;

    let mut archive = zip::ZipArchive::new(file)
        .context("Failed to read xlsx archive")?;

    let mut text_parts = Vec::new();

    // XLSX files have multiple sheet files
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let name = file.name().to_string();

        // Look for worksheet XML files
        if name.starts_with("xl/worksheets/") && name.ends_with(".xml") {
            let mut content = String::new();
            std::io::Read::read_to_string(&mut file, &mut content)?;

            if let Ok(text) = extract_text_from_xml(&content) {
                text_parts.push(text);
            }
        }
    }

    Ok(text_parts.join("\n\n"))
}

/// Parse PPTX files
fn parse_pptx(file_path: &str) -> Result<String> {
    let file = fs::File::open(file_path)
        .context("Failed to open pptx file")?;

    let mut archive = zip::ZipArchive::new(file)
        .context("Failed to read pptx archive")?;

    let mut text_parts = Vec::new();

    // PPTX files have slide XML files
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let name = file.name().to_string();

        // Look for slide XML files
        if name.starts_with("ppt/slides/") && name.ends_with(".xml") {
            let mut content = String::new();
            std::io::Read::read_to_string(&mut file, &mut content)?;

            if let Ok(text) = extract_text_from_xml(&content) {
                text_parts.push(text);
            }
        }
    }

    Ok(text_parts.join("\n\n"))
}

/// Extract text content from XML
fn extract_text_from_xml(xml_content: &str) -> Result<String> {
    use quick_xml::events::Event;
    use quick_xml::Reader;

    let mut reader = Reader::from_str(xml_content);
    reader.trim_text(true);

    let mut text_parts = Vec::new();
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Text(e)) => {
                if let Ok(text) = e.unescape() {
                    let trimmed = text.trim();
                    if !trimmed.is_empty() {
                        text_parts.push(trimmed.to_string());
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(anyhow::anyhow!("XML parse error: {}", e)),
            _ => {}
        }
        buf.clear();
    }

    Ok(text_parts.join(" "))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_markdown_parse() {
        let md_content = "# Test\n\nThis is a test.";
        let result = parse_markdown(&md_content);
        // This test would need a temporary file
    }
}
