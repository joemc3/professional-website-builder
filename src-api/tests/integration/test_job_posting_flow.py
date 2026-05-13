import json
import uuid
from unittest.mock import AsyncMock, patch

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


class TestJobPostingCRUD:
    @pytest.mark.asyncio
    async def test_create_and_list(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        resp = await client.post(
            "/api/job-postings",
            headers=headers,
            json={
                "title": "Senior Engineer",
                "company": "Acme Corp",
                "description": "Build distributed systems.",
            },
        )
        assert resp.status_code == 201
        posting_id = resp.json()["id"]

        # List
        resp = await client.get("/api/job-postings", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["id"] == posting_id

    @pytest.mark.asyncio
    async def test_update_and_get(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        resp = await client.post(
            "/api/job-postings",
            headers=headers,
            json={
                "title": "Engineer",
                "company": "Acme",
                "description": "Description.",
            },
        )
        posting_id = resp.json()["id"]

        resp = await client.put(
            f"/api/job-postings/{posting_id}",
            headers=headers,
            json={"title": "Senior Engineer"},
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Senior Engineer"

        resp = await client.get(f"/api/job-postings/{posting_id}", headers=headers)
        assert resp.json()["title"] == "Senior Engineer"

    @pytest.mark.asyncio
    async def test_delete(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        resp = await client.post(
            "/api/job-postings",
            headers=headers,
            json={
                "title": "Engineer",
                "company": "Acme",
                "description": "Desc.",
            },
        )
        posting_id = resp.json()["id"]

        resp = await client.delete(f"/api/job-postings/{posting_id}", headers=headers)
        assert resp.status_code == 204

        resp = await client.get(f"/api/job-postings/{posting_id}", headers=headers)
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_from_text_returns_draft(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        # Need an API key with selected model
        from sqlalchemy import text as sql_text
        async for db in app.dependency_overrides[get_db]():
            from app.middleware.auth import auth_service
            payload = auth_service.decode_access_token(token)
            user_id = payload["sub"]

            await db.execute(
                sql_text(
                    "INSERT INTO api_keys (id, user_id, provider, encrypted_key, nonce, selected_model) "
                    "VALUES (gen_random_uuid(), :uid, 'anthropic', :key, :nonce, 'anthropic/claude-sonnet-4-20250514')"
                ),
                {"uid": user_id, "key": b"fake", "nonce": b"fake12bytes!"},
            )
            await db.commit()

        extraction_json = json.dumps({
            "title": "Backend Dev",
            "company": "TestCo",
            "description": "Build APIs.",
            "requirements": {"required_skills": ["Python"]},
        })

        with patch("app.services.job_posting_extractor.llm_service") as mock_llm:
            mock_llm.complete = AsyncMock(return_value=extraction_json)

            resp = await client.post(
                "/api/job-postings/from-text",
                headers=headers,
                json={"raw_text": "Backend Dev at TestCo. Requirements: Python."},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["title"] == "Backend Dev"
            assert data["company"] == "TestCo"
