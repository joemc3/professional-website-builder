import json
import re
import uuid

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession

from app.services import llm_service

EXTRACTION_SYSTEM_PROMPT = """You are a job posting parser. You will receive the text content of a job posting and must extract structured information from it.

Return ONLY valid JSON matching this exact structure:

{
  "title": "string — the job title",
  "company": "string — the company name",
  "description": "string — cleaned-up job description",
  "requirements": {
    "required_skills": ["string"],
    "preferred_skills": ["string"],
    "experience_level": "string",
    "qualifications": ["string"]
  }
}

If a field cannot be determined from the text, omit it. Return ONLY the JSON object, no markdown formatting, no explanation."""


def extract_from_html(html: str) -> str:
    """Extract clean text content from HTML."""
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    return soup.get_text(separator="\n", strip=True)


def build_extraction_prompt(raw_text: str) -> list[dict]:
    """Build LLM messages for job posting extraction."""
    return [
        {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
        {"role": "user", "content": f"Extract structured information from this job posting:\n\n{raw_text}"},
    ]


def parse_extraction_response(response_text: str) -> dict:
    """Parse an LLM response into a job posting dict."""
    text = response_text.strip()

    code_block_match = re.match(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if code_block_match:
        text = code_block_match.group(1).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in LLM response: {e}") from e


async def extract_from_url(
    url: str,
    model: str,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> dict:
    """Fetch a URL, extract text, and parse via LLM."""
    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        raw_text = extract_from_html(response.text)

    messages = build_extraction_prompt(raw_text)
    response_text = await llm_service.complete(model, messages, user_id, db)
    parsed = parse_extraction_response(response_text)

    parsed["source_url"] = url
    parsed["raw_text"] = raw_text
    return parsed


async def extract_from_text(
    raw_text: str,
    model: str,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> dict:
    """Parse raw text via LLM."""
    messages = build_extraction_prompt(raw_text)
    response_text = await llm_service.complete(model, messages, user_id, db)
    parsed = parse_extraction_response(response_text)

    parsed["raw_text"] = raw_text
    return parsed
