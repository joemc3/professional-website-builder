import json
import uuid
from pathlib import Path
from unittest.mock import patch

import pytest

from app.services.preview_service import (
    prepare_preview_data,
    cleanup_preview,
)


SAMPLE_PROFILE = {
    "basics": {"name": "Jane", "title": "Engineer"},
    "skills": [],
    "experience": [],
}


class TestPreparePreviewData:
    def test_writes_json_file(self, tmp_path):
        preview_id = uuid.uuid4()
        with patch("app.services.preview_service.settings") as mock_settings:
            mock_settings.generation_dir = str(tmp_path)
            prepare_preview_data(
                preview_id=preview_id,
                theme="onyx",
                site_type="portfolio",
                profile_data=SAMPLE_PROFILE,
            )

        data_file = tmp_path / "preview" / str(preview_id) / "portfolio-data.json"
        assert data_file.exists()
        data = json.loads(data_file.read_text())
        assert data["profile"]["fullName"] == "Jane"
        assert data["theme"]["name"] == "onyx"
        assert data["siteType"] == "portfolio"

    def test_targeted_includes_job_posting(self, tmp_path):
        preview_id = uuid.uuid4()
        job_posting = {"title": "Dev", "company": "Acme", "description": "Build"}
        with patch("app.services.preview_service.settings") as mock_settings:
            mock_settings.generation_dir = str(tmp_path)
            prepare_preview_data(
                preview_id=preview_id,
                theme="coral",
                site_type="targeted",
                profile_data=SAMPLE_PROFILE,
                job_posting=job_posting,
            )

        data_file = tmp_path / "preview" / str(preview_id) / "portfolio-data.json"
        data = json.loads(data_file.read_text())
        assert data["siteType"] == "targeted"
        assert data["jobPosting"]["company"] == "Acme"

    def test_includes_has_resume(self, tmp_path):
        preview_id = uuid.uuid4()
        with patch("app.services.preview_service.settings") as mock_settings:
            mock_settings.generation_dir = str(tmp_path)
            prepare_preview_data(
                preview_id=preview_id,
                theme="onyx",
                site_type="portfolio",
                profile_data=SAMPLE_PROFILE,
                has_resume=True,
            )

        data_file = tmp_path / "preview" / str(preview_id) / "portfolio-data.json"
        data = json.loads(data_file.read_text())
        assert data["hasResume"] is True

    def test_includes_photo_url(self, tmp_path):
        preview_id = uuid.uuid4()
        with patch("app.services.preview_service.settings") as mock_settings:
            mock_settings.generation_dir = str(tmp_path)
            prepare_preview_data(
                preview_id=preview_id,
                theme="onyx",
                site_type="portfolio",
                profile_data=SAMPLE_PROFILE,
                photo_url="/api/profile/photo/file",
            )

        data_file = tmp_path / "preview" / str(preview_id) / "portfolio-data.json"
        data = json.loads(data_file.read_text())
        assert data["profile"]["photo"] == "/api/profile/photo/file"


class TestCleanupPreview:
    def test_removes_preview_directory(self, tmp_path):
        preview_id = uuid.uuid4()
        preview_dir = tmp_path / "preview" / str(preview_id)
        preview_dir.mkdir(parents=True)
        (preview_dir / "portfolio-data.json").write_text("{}")

        with patch("app.services.preview_service.settings") as mock_settings:
            mock_settings.generation_dir = str(tmp_path)
            cleanup_preview(preview_id)

        assert not preview_dir.exists()

    def test_ignores_missing_directory(self, tmp_path):
        with patch("app.services.preview_service.settings") as mock_settings:
            mock_settings.generation_dir = str(tmp_path)
            cleanup_preview(uuid.uuid4())  # no error
