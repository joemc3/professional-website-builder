import uuid
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


class TestCreatePreview:
    @pytest.mark.asyncio
    async def test_requires_auth(self, client):
        resp = await client.post("/api/preview", json={"theme": "onyx"})
        assert resp.status_code == 401


class TestGetPreview:
    @pytest.mark.asyncio
    async def test_no_auth_required(self, client):
        """GET preview doesn't require auth (UUID is the token).
        Should return 503 since no generator is running in tests."""
        resp = await client.get(f"/api/preview/{uuid.uuid4()}")
        # Should be 503 (generator not running) not 401
        assert resp.status_code == 503


class TestDeletePreview:
    @pytest.mark.asyncio
    async def test_requires_auth(self, client):
        resp = await client.delete(f"/api/preview/{uuid.uuid4()}")
        assert resp.status_code == 401
