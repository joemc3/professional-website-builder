import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.site_service import (
    create_portfolio_site,
    create_targeted_site,
    get_site,
    list_sites,
    delete_site,
    is_portfolio_stale,
    generate_slug,
)


class TestGenerateSlug:
    def test_produces_url_safe_string(self):
        slug = generate_slug()
        assert all(c.isalnum() or c in "-_" for c in slug)
        assert len(slug) >= 6

    def test_unique_each_call(self):
        slugs = {generate_slug() for _ in range(100)}
        assert len(slugs) == 100


class TestCreatePortfolioSite:
    @pytest.mark.asyncio
    async def test_creates_site_with_correct_fields(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()
        profile_id = uuid.uuid4()

        # No existing portfolio
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        site = await create_portfolio_site(
            db=mock_db,
            user_id=user_id,
            profile_id=profile_id,
            username="joe",
            theme="minimal",
        )

        mock_db.add.assert_called_once()
        added = mock_db.add.call_args[0][0]
        assert added.type == "portfolio"
        assert added.output_path == "joe"
        assert added.slug == "joe"
        assert added.theme == "minimal"
        assert added.status == "queued"


class TestCreateTargetedSite:
    @pytest.mark.asyncio
    async def test_creates_site_with_slug(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()
        profile_id = uuid.uuid4()
        job_posting_id = uuid.uuid4()

        site = await create_targeted_site(
            db=mock_db,
            user_id=user_id,
            profile_id=profile_id,
            job_posting_id=job_posting_id,
            username="joe",
            theme="minimal",
        )

        mock_db.add.assert_called_once()
        added = mock_db.add.call_args[0][0]
        assert added.type == "targeted"
        assert added.job_posting_id == job_posting_id
        assert added.output_path.startswith("joe/")
        assert added.status == "queued"


class TestIsPortfolioStale:
    def test_stale_when_profile_updated_after_generation(self):
        profile_updated = datetime(2026, 3, 31, 12, 0, tzinfo=timezone.utc)
        site_generated = datetime(2026, 3, 31, 10, 0, tzinfo=timezone.utc)
        assert is_portfolio_stale(profile_updated, site_generated) is True

    def test_not_stale_when_generated_after_profile(self):
        profile_updated = datetime(2026, 3, 31, 10, 0, tzinfo=timezone.utc)
        site_generated = datetime(2026, 3, 31, 12, 0, tzinfo=timezone.utc)
        assert is_portfolio_stale(profile_updated, site_generated) is False

    def test_stale_when_never_generated(self):
        profile_updated = datetime(2026, 3, 31, 12, 0, tzinfo=timezone.utc)
        assert is_portfolio_stale(profile_updated, None) is True


class TestDeleteSite:
    @pytest.mark.asyncio
    async def test_cannot_delete_portfolio(self):
        mock_db = AsyncMock()
        mock_site = MagicMock()
        mock_site.type = "portfolio"
        mock_site.user_id = uuid.uuid4()

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_site
        mock_db.execute.return_value = mock_result

        with pytest.raises(ValueError, match="Cannot delete portfolio"):
            await delete_site(mock_db, mock_site.id, mock_site.user_id)

    @pytest.mark.asyncio
    async def test_deletes_targeted_site(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()
        site_id = uuid.uuid4()

        mock_site = MagicMock()
        mock_site.type = "targeted"
        mock_site.user_id = user_id
        mock_site.output_path = "joe/abc123"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_site
        mock_db.execute.return_value = mock_result

        result = await delete_site(mock_db, site_id, user_id)
        assert result == "joe/abc123"
        mock_db.delete.assert_called_once_with(mock_site)
