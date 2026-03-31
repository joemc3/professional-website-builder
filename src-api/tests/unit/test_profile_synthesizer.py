import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.profile import ProfileData
from app.services.profile_synthesizer import (
    build_prompt,
    parse_profile_response,
    synthesize_profile,
)


SAMPLE_PROFILE_JSON = json.dumps({
    "basics": {
        "name": "Jane Doe",
        "title": "Senior Software Engineer",
        "summary": "10 years experience in distributed systems.",
    },
    "skills": [
        {"category": "Languages", "items": ["Python", "Go"]},
    ],
    "experience": [
        {
            "company": "Acme Corp",
            "title": "Staff Engineer",
            "start_date": "2020-01",
            "current": True,
            "description": "Leading platform team.",
            "highlights": ["Built CI/CD pipeline"],
        },
    ],
    "education": [
        {
            "institution": "MIT",
            "degree": "BS",
            "field": "Computer Science",
        },
    ],
})

SAMPLE_PARTIAL_JSON = json.dumps({
    "basics": {"name": "John", "summary": "A developer."},
    "skills": [{"category": "Languages", "items": ["JavaScript"]}],
})


class TestBuildPrompt:
    def test_includes_all_documents(self):
        documents = [
            MagicMock(filename="resume.pdf", parsed_text="I am Jane Doe, a senior engineer."),
            MagicMock(filename="projects.md", parsed_text="Project Alpha: Built a distributed cache."),
        ]
        messages = build_prompt(documents, guidance=None)

        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert "ProfileData" in messages[0]["content"] or "JSON" in messages[0]["content"]
        assert messages[1]["role"] == "user"
        assert "resume.pdf" in messages[1]["content"]
        assert "projects.md" in messages[1]["content"]
        assert "I am Jane Doe" in messages[1]["content"]
        assert "Project Alpha" in messages[1]["content"]

    def test_includes_guidance_when_provided(self):
        documents = [MagicMock(filename="resume.pdf", parsed_text="Some text.")]
        messages = build_prompt(documents, guidance="Emphasize leadership experience")

        user_content = messages[1]["content"]
        assert "Emphasize leadership experience" in user_content

    def test_no_guidance_no_extra_instructions(self):
        documents = [MagicMock(filename="resume.pdf", parsed_text="Some text.")]
        messages = build_prompt(documents, guidance=None)

        user_content = messages[1]["content"]
        assert "Emphasize" not in user_content

    def test_empty_documents_raises(self):
        with pytest.raises(ValueError, match="No documents"):
            build_prompt([], guidance=None)


class TestParseProfileResponse:
    def test_parses_valid_json(self):
        profile = parse_profile_response(SAMPLE_PROFILE_JSON)
        assert isinstance(profile, ProfileData)
        assert profile.basics.name == "Jane Doe"
        assert len(profile.skills) == 1
        assert len(profile.experience) == 1

    def test_parses_partial_json(self):
        profile = parse_profile_response(SAMPLE_PARTIAL_JSON)
        assert profile.basics.name == "John"
        assert profile.education is None
        assert profile.certifications is None

    def test_invalid_json_raises(self):
        with pytest.raises(ValueError, match="Invalid JSON"):
            parse_profile_response("this is not json {{{")

    def test_extracts_json_from_markdown_code_block(self):
        """LLMs sometimes wrap JSON in markdown code blocks."""
        wrapped = f"```json\n{SAMPLE_PARTIAL_JSON}\n```"
        profile = parse_profile_response(wrapped)
        assert profile.basics.name == "John"


class TestSynthesizeProfile:
    @pytest.mark.asyncio
    async def test_full_synthesis_flow(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        mock_doc = MagicMock()
        mock_doc.filename = "resume.pdf"
        mock_doc.parsed_text = "Jane Doe, Senior Engineer at Acme."

        mock_doc_result = MagicMock()
        mock_doc_result.scalars.return_value.all.return_value = [mock_doc]
        mock_db.execute.return_value = mock_doc_result

        with (
            patch("app.services.profile_synthesizer.llm_service") as mock_llm,
            patch("app.services.profile_synthesizer.profile_service") as mock_ps,
        ):
            mock_llm.complete = AsyncMock(return_value=SAMPLE_PROFILE_JSON)
            mock_ps.update_profile = AsyncMock(return_value=MagicMock())

            profile_data, profile = await synthesize_profile(
                db=mock_db,
                user_id=user_id,
                model="anthropic/claude-sonnet-4-20250514",
                guidance=None,
            )

        assert profile_data.basics.name == "Jane Doe"
        mock_llm.complete.assert_called_once()
        mock_ps.update_profile.assert_called_once()

    @pytest.mark.asyncio
    async def test_retries_on_invalid_json(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        mock_doc = MagicMock()
        mock_doc.filename = "resume.pdf"
        mock_doc.parsed_text = "Some text."

        mock_doc_result = MagicMock()
        mock_doc_result.scalars.return_value.all.return_value = [mock_doc]
        mock_db.execute.return_value = mock_doc_result

        with (
            patch("app.services.profile_synthesizer.llm_service") as mock_llm,
            patch("app.services.profile_synthesizer.profile_service") as mock_ps,
        ):
            mock_llm.complete = AsyncMock(
                side_effect=["not valid json", SAMPLE_PARTIAL_JSON]
            )
            mock_ps.update_profile = AsyncMock(return_value=MagicMock())

            profile_data, profile = await synthesize_profile(
                db=mock_db,
                user_id=user_id,
                model="anthropic/claude-sonnet-4-20250514",
                guidance=None,
            )

        assert profile_data.basics.name == "John"
        assert mock_llm.complete.call_count == 2

    @pytest.mark.asyncio
    async def test_raises_after_retry_exhausted(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        mock_doc = MagicMock()
        mock_doc.filename = "resume.pdf"
        mock_doc.parsed_text = "Some text."

        mock_doc_result = MagicMock()
        mock_doc_result.scalars.return_value.all.return_value = [mock_doc]
        mock_db.execute.return_value = mock_doc_result

        with patch("app.services.profile_synthesizer.llm_service") as mock_llm:
            mock_llm.complete = AsyncMock(
                side_effect=["bad json", "still bad json"]
            )

            with pytest.raises(ValueError, match="Invalid JSON"):
                await synthesize_profile(
                    db=mock_db,
                    user_id=user_id,
                    model="anthropic/claude-sonnet-4-20250514",
                    guidance=None,
                )

    @pytest.mark.asyncio
    async def test_no_completed_documents_raises(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        mock_doc_result = MagicMock()
        mock_doc_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_doc_result

        with pytest.raises(ValueError, match="No documents"):
            await synthesize_profile(
                db=mock_db,
                user_id=user_id,
                model="anthropic/claude-sonnet-4-20250514",
                guidance=None,
            )

    @pytest.mark.asyncio
    async def test_stores_guidance(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        mock_doc = MagicMock()
        mock_doc.filename = "resume.pdf"
        mock_doc.parsed_text = "Content."

        mock_doc_result = MagicMock()
        mock_doc_result.scalars.return_value.all.return_value = [mock_doc]
        mock_db.execute.return_value = mock_doc_result

        with (
            patch("app.services.profile_synthesizer.llm_service") as mock_llm,
            patch("app.services.profile_synthesizer.profile_service") as mock_ps,
        ):
            mock_llm.complete = AsyncMock(return_value=SAMPLE_PARTIAL_JSON)
            mock_profile = MagicMock()
            mock_ps.update_profile = AsyncMock(return_value=mock_profile)

            await synthesize_profile(
                db=mock_db,
                user_id=user_id,
                model="anthropic/claude-sonnet-4-20250514",
                guidance="Focus on leadership",
            )

        update_call = mock_ps.update_profile.call_args
        assert update_call is not None
