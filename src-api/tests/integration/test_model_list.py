import uuid
from unittest.mock import AsyncMock, patch, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from testcontainers.postgres import PostgresContainer

from app.database import get_db
from app.main import app
from app.models import Base


@pytest.fixture(scope="module")
def postgres_container():
    with PostgresContainer("postgres:16-alpine") as postgres:
        yield postgres


@pytest.fixture(scope="module")
def db_url(postgres_container):
    return postgres_container.get_connection_url().replace("psycopg2", "asyncpg")


@pytest.fixture
async def client(db_url):
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


async def _register_and_get_token(client: AsyncClient) -> str:
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    resp = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "SecurePass123!"},
    )
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestModelSelection:
    @pytest.mark.asyncio
    async def test_set_and_get_selected_model(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        # Save an API key first
        await client.post(
            "/api/settings/api-keys",
            headers=headers,
            json={"provider": "anthropic", "api_key": "sk-test-key"},
        )

        # Set selected model
        resp = await client.put(
            "/api/settings/api-keys/anthropic/model",
            headers=headers,
            json={"model": "claude-sonnet-4-20250514"},
        )
        assert resp.status_code == 204

        # Verify selected_model is returned in status
        resp = await client.get("/api/settings/api-keys/anthropic", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["selected_model"] == "claude-sonnet-4-20250514"

    @pytest.mark.asyncio
    async def test_set_model_404_no_key(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        resp = await client.put(
            "/api/settings/api-keys/anthropic/model",
            headers=headers,
            json={"model": "claude-sonnet-4-20250514"},
        )
        assert resp.status_code == 404


class TestTestConnection:
    @pytest.mark.asyncio
    async def test_connection_via_litellm(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        # Save key and set model
        await client.post(
            "/api/settings/api-keys",
            headers=headers,
            json={"provider": "anthropic", "api_key": "sk-test-key"},
        )
        await client.put(
            "/api/settings/api-keys/anthropic/model",
            headers=headers,
            json={"model": "claude-sonnet-4-20250514"},
        )

        # Mock the LLM complete call
        with patch("app.routers.settings.llm_service") as mock_llm:
            mock_llm.complete = AsyncMock(return_value="ok")

            resp = await client.post(
                "/api/settings/test-connection",
                headers=headers,
                json={"provider": "anthropic"},
            )
            assert resp.status_code == 200
            assert resp.json()["status"] == "ok"

    @pytest.mark.asyncio
    async def test_connection_with_explicit_model(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        await client.post(
            "/api/settings/api-keys",
            headers=headers,
            json={"provider": "openai", "api_key": "sk-test-key"},
        )

        with patch("app.routers.settings.llm_service") as mock_llm:
            mock_llm.complete = AsyncMock(return_value="ok")

            resp = await client.post(
                "/api/settings/test-connection",
                headers=headers,
                json={"provider": "openai", "model": "openai/gpt-4o"},
            )
            assert resp.status_code == 200
            assert resp.json()["status"] == "ok"

    @pytest.mark.asyncio
    async def test_connection_error_reported(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        await client.post(
            "/api/settings/api-keys",
            headers=headers,
            json={"provider": "anthropic", "api_key": "sk-bad-key"},
        )
        await client.put(
            "/api/settings/api-keys/anthropic/model",
            headers=headers,
            json={"model": "claude-sonnet-4-20250514"},
        )

        with patch("app.routers.settings.llm_service") as mock_llm:
            from app.services.llm_service import LLMError
            mock_llm.complete = AsyncMock(side_effect=LLMError("Invalid API key"))

            resp = await client.post(
                "/api/settings/test-connection",
                headers=headers,
                json={"provider": "anthropic"},
            )
            assert resp.status_code == 200
            assert resp.json()["status"] == "error"
            assert "Invalid API key" in resp.json()["message"]
