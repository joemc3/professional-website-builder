import uuid

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


class TestAPIKeySave:
    async def test_save_key_returns_201(self, client):
        token = await _register_and_get_token(client)
        resp = await client.post(
            "/api/settings/api-keys",
            json={"provider": "anthropic", "api_key": "sk-ant-test-key"},
            headers=_auth_headers(token),
        )
        assert resp.status_code == 201
        assert resp.json()["provider"] == "anthropic"
        assert resp.json()["saved"] is True

    async def test_save_key_upserts(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)
        await client.post(
            "/api/settings/api-keys",
            json={"provider": "openai", "api_key": "sk-old-key"},
            headers=headers,
        )
        resp = await client.post(
            "/api/settings/api-keys",
            json={"provider": "openai", "api_key": "sk-new-key"},
            headers=headers,
        )
        assert resp.status_code == 201

    async def test_save_invalid_provider_returns_400(self, client):
        token = await _register_and_get_token(client)
        resp = await client.post(
            "/api/settings/api-keys",
            json={"provider": "invalid", "api_key": "key"},
            headers=_auth_headers(token),
        )
        assert resp.status_code == 400

    async def test_save_requires_auth(self, client):
        resp = await client.post(
            "/api/settings/api-keys",
            json={"provider": "anthropic", "api_key": "key"},
        )
        assert resp.status_code == 401 or resp.status_code == 403


class TestAPIKeyStatus:
    async def test_key_is_set_after_save(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)
        await client.post(
            "/api/settings/api-keys",
            json={"provider": "anthropic", "api_key": "sk-ant-test"},
            headers=headers,
        )
        resp = await client.get("/api/settings/api-keys/anthropic", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["is_set"] is True

    async def test_key_not_set_by_default(self, client):
        token = await _register_and_get_token(client)
        resp = await client.get(
            "/api/settings/api-keys/gemini",
            headers=_auth_headers(token),
        )
        assert resp.status_code == 200
        assert resp.json()["is_set"] is False

    async def test_status_never_returns_actual_key(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)
        await client.post(
            "/api/settings/api-keys",
            json={"provider": "openai", "api_key": "sk-secret-key-12345"},
            headers=headers,
        )
        resp = await client.get("/api/settings/api-keys/openai", headers=headers)
        body = resp.text
        assert "sk-secret-key-12345" not in body


class TestAPIKeyDelete:
    async def test_delete_existing_key(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)
        await client.post(
            "/api/settings/api-keys",
            json={"provider": "anthropic", "api_key": "sk-key"},
            headers=headers,
        )
        resp = await client.delete("/api/settings/api-keys/anthropic", headers=headers)
        assert resp.status_code == 204

        resp = await client.get("/api/settings/api-keys/anthropic", headers=headers)
        assert resp.json()["is_set"] is False

    async def test_delete_nonexistent_key_returns_404(self, client):
        token = await _register_and_get_token(client)
        resp = await client.delete(
            "/api/settings/api-keys/openai",
            headers=_auth_headers(token),
        )
        assert resp.status_code == 404
