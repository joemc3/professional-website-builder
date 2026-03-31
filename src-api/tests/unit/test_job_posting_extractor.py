import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.job_posting_extractor import (
    extract_from_html,
    build_extraction_prompt,
    parse_extraction_response,
    extract_from_url,
    extract_from_text,
)


SAMPLE_EXTRACTION_JSON = json.dumps({
    "title": "Senior Backend Engineer",
    "company": "Acme Corp",
    "description": "We are looking for a senior backend engineer to join our platform team.",
    "requirements": {
        "required_skills": ["Python", "PostgreSQL", "Docker"],
        "preferred_skills": ["Kubernetes", "Go"],
        "experience_level": "5+ years",
        "qualifications": ["BS in Computer Science or equivalent"],
    },
})


class TestExtractFromHtml:
    def test_strips_html_tags(self):
        html = "<html><body><h1>Job Title</h1><p>Description here.</p></body></html>"
        text = extract_from_html(html)
        assert "Job Title" in text
        assert "Description here" in text
        assert "<h1>" not in text

    def test_removes_script_and_style(self):
        html = "<html><body><script>var x=1;</script><style>.a{}</style><p>Content</p></body></html>"
        text = extract_from_html(html)
        assert "Content" in text
        assert "var x" not in text
        assert ".a{}" not in text


class TestBuildExtractionPrompt:
    def test_includes_raw_text(self):
        messages = build_extraction_prompt("Some job posting text about Python development")
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert "JSON" in messages[0]["content"]
        assert messages[1]["role"] == "user"
        assert "Python development" in messages[1]["content"]


class TestParseExtractionResponse:
    def test_parses_valid_json(self):
        result = parse_extraction_response(SAMPLE_EXTRACTION_JSON)
        assert result["title"] == "Senior Backend Engineer"
        assert result["company"] == "Acme Corp"
        assert "Python" in result["requirements"]["required_skills"]

    def test_handles_markdown_code_block(self):
        wrapped = f"```json\n{SAMPLE_EXTRACTION_JSON}\n```"
        result = parse_extraction_response(wrapped)
        assert result["title"] == "Senior Backend Engineer"

    def test_invalid_json_raises(self):
        with pytest.raises(ValueError, match="Invalid JSON"):
            parse_extraction_response("not json at all")


class TestExtractFromUrl:
    @pytest.mark.asyncio
    async def test_fetches_and_extracts(self):
        mock_db = AsyncMock()
        user_id = MagicMock()

        with (
            patch("app.services.job_posting_extractor.httpx.AsyncClient") as mock_client_cls,
            patch("app.services.job_posting_extractor.llm_service") as mock_llm,
        ):
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.text = "<html><body><h1>Senior Engineer</h1><p>Build things.</p></body></html>"
            mock_response.raise_for_status = MagicMock()

            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            mock_llm.complete = AsyncMock(return_value=SAMPLE_EXTRACTION_JSON)

            result = await extract_from_url(
                url="https://example.com/jobs/123",
                model="anthropic/claude-sonnet-4-20250514",
                user_id=user_id,
                db=mock_db,
            )

            assert result["title"] == "Senior Backend Engineer"
            assert result["source_url"] == "https://example.com/jobs/123"
            assert "raw_text" in result


class TestExtractFromText:
    @pytest.mark.asyncio
    async def test_parses_text(self):
        mock_db = AsyncMock()
        user_id = MagicMock()

        with patch("app.services.job_posting_extractor.llm_service") as mock_llm:
            mock_llm.complete = AsyncMock(return_value=SAMPLE_EXTRACTION_JSON)

            result = await extract_from_text(
                raw_text="Senior Engineer at Acme. Requirements: Python.",
                model="anthropic/claude-sonnet-4-20250514",
                user_id=user_id,
                db=mock_db,
            )

            assert result["title"] == "Senior Backend Engineer"
            assert result["raw_text"] == "Senior Engineer at Acme. Requirements: Python."
