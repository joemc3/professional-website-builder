import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


class TestUploadPhoto:
    @pytest.mark.asyncio
    async def test_requires_auth(self, client):
        resp = await client.post("/api/profile/photo")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_rejects_missing_file(self, client):
        from app.middleware.auth import get_current_user

        fake_user = {"id": str(uuid.uuid4()), "email": "t@t.com"}
        app.dependency_overrides[get_current_user] = lambda: fake_user
        try:
            resp = await client.post("/api/profile/photo")
            assert resp.status_code == 422
        finally:
            app.dependency_overrides.pop(get_current_user, None)


class TestDeletePhoto:
    @pytest.mark.asyncio
    async def test_requires_auth(self, client):
        resp = await client.delete("/api/profile/photo")
        assert resp.status_code == 401


class TestGetPhotoFile:
    @pytest.mark.asyncio
    async def test_requires_auth(self, client):
        resp = await client.get("/api/profile/photo/file")
        assert resp.status_code == 401
