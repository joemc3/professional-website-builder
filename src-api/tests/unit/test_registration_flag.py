from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


class TestRegistrationFlag:
    @pytest.mark.asyncio
    async def test_register_returns_403_when_disabled(self, client):
        with patch("app.routers.auth.settings.registration_enabled", False):
            resp = await client.post(
                "/api/auth/register",
                json={"email": "new@test.com", "password": "supersecret"},
            )
        assert resp.status_code == 403
        assert "registration" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_register_allowed_when_enabled(self, client):
        mock_session = AsyncMock()
        # Simulate no existing user (scalar_one_or_none is sync on the mock result)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result

        async def override_get_db():
            yield mock_session

        from app.database import get_db
        app.dependency_overrides[get_db] = override_get_db
        try:
            with patch("app.routers.auth.settings.registration_enabled", True):
                resp = await client.post(
                    "/api/auth/register",
                    json={"email": "new@test.com", "password": "supersecret"},
                )
            # DB is mocked to return no existing user, so happy path should yield 201.
            assert resp.status_code == 201
            assert "access_token" in resp.json()
        finally:
            app.dependency_overrides.pop(get_db, None)
