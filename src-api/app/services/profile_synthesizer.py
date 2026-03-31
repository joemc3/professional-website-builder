import json
import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.schemas.profile import ProfileData
from app.services import llm_service, profile_service

SYSTEM_PROMPT = """You are a professional profile synthesizer. You will receive a collection of professional documents (resumes, project descriptions, certifications, etc.) and must synthesize them into a single unified professional profile.

Return ONLY valid JSON matching this exact structure. Every field is optional — only include sections and fields that are supported by the provided documents. Do not invent information.

{
  "basics": {
    "name": "string",
    "title": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin": "string",
    "website": "string",
    "summary": "string"
  },
  "skills": [{"category": "string", "items": ["string"]}],
  "experience": [{
    "company": "string",
    "title": "string",
    "start_date": "string",
    "end_date": "string",
    "current": true/false,
    "description": "string",
    "highlights": ["string"]
  }],
  "education": [{
    "institution": "string",
    "degree": "string",
    "field": "string",
    "start_date": "string",
    "end_date": "string",
    "notes": "string"
  }],
  "certifications": [{
    "name": "string",
    "issuer": "string",
    "date_obtained": "string",
    "expiration": "string",
    "credential_id": "string"
  }],
  "projects": [{
    "name": "string",
    "description": "string",
    "role": "string",
    "technologies": ["string"],
    "outcomes": ["string"]
  }],
  "publications": [{
    "title": "string",
    "venue": "string",
    "date": "string",
    "url": "string"
  }],
  "awards": [{
    "title": "string",
    "issuer": "string",
    "date": "string",
    "description": "string"
  }],
  "volunteer": [{
    "organization": "string",
    "role": "string",
    "start_date": "string",
    "end_date": "string",
    "description": "string"
  }],
  "languages": [{
    "language": "string",
    "proficiency": "string"
  }]
}

Omit any section entirely if the documents provide no information for it. Do not include empty arrays or objects. Return ONLY the JSON object, no markdown formatting, no explanation."""


def build_prompt(documents: list, guidance: str | None) -> list[dict]:
    """Build the LLM messages from documents and optional guidance."""
    if not documents:
        raise ValueError("No documents available for synthesis")

    doc_texts = []
    for doc in documents:
        doc_texts.append(f"--- Document: {doc.filename} ---\n{doc.parsed_text}")

    user_content = "Here are the professional documents to synthesize:\n\n" + "\n\n".join(doc_texts)

    if guidance:
        user_content += f"\n\nAdditional instructions: {guidance}"

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]


def parse_profile_response(response_text: str) -> ProfileData:
    """Parse an LLM response into a ProfileData object."""
    text = response_text.strip()

    # Strip markdown code blocks if present
    code_block_match = re.match(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if code_block_match:
        text = code_block_match.group(1).strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in LLM response: {e}") from e

    return ProfileData(**data)


async def synthesize_profile(
    db: AsyncSession,
    user_id: uuid.UUID,
    model: str,
    guidance: str | None,
) -> tuple[ProfileData, object]:
    """Synthesize a profile from the user's documents via LLM."""
    # Load completed documents
    result = await db.execute(
        select(Document).where(
            Document.user_id == user_id,
            Document.status == "completed",
        )
    )
    documents = result.scalars().all()

    if not documents:
        raise ValueError("No documents available for synthesis")

    messages = build_prompt(documents, guidance)

    # First attempt
    response_text = await llm_service.complete(model, messages, user_id, db)

    try:
        profile_data = parse_profile_response(response_text)
    except ValueError:
        # Retry once with correction instruction
        messages.append({"role": "assistant", "content": response_text})
        messages.append({
            "role": "user",
            "content": "Your response was not valid JSON. Please respond with ONLY valid JSON matching the schema. No markdown, no explanation.",
        })
        response_text = await llm_service.complete(model, messages, user_id, db)
        profile_data = parse_profile_response(response_text)

    # Save to database
    profile_dict = profile_data.model_dump(exclude_none=True)
    profile = await profile_service.update_profile(db, user_id, profile_dict)

    # Store guidance and generation timestamp
    profile.guidance = guidance
    profile.generated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(profile)

    return profile_data, profile
