import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


@pytest.fixture
def mock_auth():
    """Patch get_current_user to return a fake user."""
    with patch("app.routers.resumes.get_current_user") as mock:
        mock.return_value = {"id": str(uuid.uuid4()), "email": "test@test.com"}
        yield mock


@pytest.fixture
def mock_db():
    """Patch get_db to return a mock session."""
    mock_session = AsyncMock()
    with patch("app.routers.resumes.get_db") as mock:
        async def gen():
            yield mock_session
        mock.return_value = gen()
        yield mock_session


class TestListResumes:
    @pytest.mark.asyncio
    async def test_requires_auth(self, client):
        resp = await client.get("/api/resumes")
        assert resp.status_code == 401


class TestGetResume:
    @pytest.mark.asyncio
    async def test_requires_auth(self, client):
        resp = await client.get(f"/api/resumes/{uuid.uuid4()}")
        assert resp.status_code == 401


class TestDeleteResume:
    @pytest.mark.asyncio
    async def test_requires_auth(self, client):
        resp = await client.delete(f"/api/resumes/{uuid.uuid4()}")
        assert resp.status_code == 401
