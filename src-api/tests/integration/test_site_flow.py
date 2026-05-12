import uuid
from unittest.mock import AsyncMock

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
    app.state.arq_pool = AsyncMock()

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


async def _setup_user_with_profile(client, token, headers):
    """Set username and create a profile."""
    resp = await client.put(
        "/api/auth/username",
        headers=headers,
        json={"username": f"testuser{uuid.uuid4().hex[:6]}"},
    )
    assert resp.status_code == 200

    resp = await client.put(
        "/api/profile",
        headers=headers,
        json={
            "basics": {"name": "Jane Doe", "title": "Engineer"},
            "skills": [{"category": "Languages", "items": ["Python"]}],
        },
    )
    assert resp.status_code == 200


class TestSiteGeneration:
    @pytest.mark.asyncio
    async def test_portfolio_generation_requires_username(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        await client.put(
            "/api/profile",
            headers=headers,
            json={"basics": {"name": "Jane Doe"}},
        )

        resp = await client.post(
            "/api/sites/portfolio",
            headers=headers,
            json={"theme": "minimal"},
        )
        assert resp.status_code == 400
        assert "username" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_portfolio_generation_requires_profile(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        await client.put(
            "/api/auth/username",
            headers=headers,
            json={"username": f"testuser{uuid.uuid4().hex[:6]}"},
        )

        resp = await client.post(
            "/api/sites/portfolio",
            headers=headers,
            json={"theme": "minimal"},
        )
        assert resp.status_code == 400
        assert "profile" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_portfolio_creates_site_and_enqueues_job(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)
        await _setup_user_with_profile(client, token, headers)

        resp = await client.post(
            "/api/sites/portfolio",
            headers=headers,
            json={"theme": "minimal"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["type"] == "portfolio"
        assert data["status"] == "queued"
        assert data["theme"] == "minimal"

        app.state.arq_pool.enqueue_job.assert_called_once()

    @pytest.mark.asyncio
    async def test_list_sites(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)
        await _setup_user_with_profile(client, token, headers)

        await client.post(
            "/api/sites/portfolio",
            headers=headers,
            json={"theme": "minimal"},
        )

        resp = await client.get("/api/sites", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    @pytest.mark.asyncio
    async def test_cannot_delete_portfolio(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)
        await _setup_user_with_profile(client, token, headers)

        resp = await client.post(
            "/api/sites/portfolio",
            headers=headers,
            json={"theme": "minimal"},
        )
        site_id = resp.json()["id"]

        resp = await client.delete(f"/api/sites/{site_id}", headers=headers)
        assert resp.status_code == 400
        assert "portfolio" in resp.json()["detail"].lower()
