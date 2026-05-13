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


SAMPLE_PROFILE_JSON = json.dumps({
    "basics": {"name": "Jane Doe", "title": "Engineer", "summary": "10 years experience."},
    "skills": [{"category": "Languages", "items": ["Python", "Go"]}],
    "experience": [{"company": "Acme", "title": "Staff Engineer", "current": True}],
})


class TestProfileSynthesis:
    @pytest.mark.asyncio
    async def test_synthesize_returns_sse_stream(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        # Upload a document first
        from io import BytesIO
        file = BytesIO(b"# Jane Doe\nSenior Engineer with 10 years experience.")
        resp = await client.post(
            "/api/documents",
            headers=headers,
            files={"files": ("resume.md", file, "text/markdown")},
        )
        assert resp.status_code == 201
        doc_id = resp.json()[0]["id"]

        # Manually mark document as completed (since no worker running)
        from sqlalchemy import text as sql_text
        async for db in app.dependency_overrides[get_db]():
            await db.execute(
                sql_text("UPDATE documents SET status = 'completed', parsed_text = 'Jane Doe, Senior Engineer' WHERE id = :id"),
                {"id": doc_id},
            )
            await db.commit()

        # Mock the llm_service.complete function that profile_synthesizer calls
        with patch("app.services.profile_synthesizer.llm_service") as mock_llm:
            mock_llm.complete = AsyncMock(return_value=SAMPLE_PROFILE_JSON)

            # Synthesize
            resp = await client.post(
                "/api/profile/synthesize",
                headers=headers,
                json={"model": "anthropic/claude-sonnet-4-20250514"},
            )
            assert resp.status_code == 200
            assert resp.headers["content-type"].startswith("text/event-stream")

            # Parse SSE events
            events = _parse_sse(resp.text)
            event_types = [e["event"] for e in events]

            assert "status" in event_types
            assert "section" in event_types
            assert "complete" in event_types

            # Verify sections delivered
            section_events = [e for e in events if e["event"] == "section"]
            section_names = [e["data"]["section"] for e in section_events]
            assert "basics" in section_names
            assert "skills" in section_names


class TestProfileCRUD:
    @pytest.mark.asyncio
    async def test_get_profile_404_when_none(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        resp = await client.get("/api/profile", headers=headers)
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_put_creates_and_returns_profile(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        profile_data = {
            "basics": {"name": "Jane Doe", "title": "Engineer"},
            "skills": [{"category": "Languages", "items": ["Python"]}],
        }
        resp = await client.put("/api/profile", headers=headers, json=profile_data)
        assert resp.status_code == 200
        body = resp.json()
        assert body["data"]["basics"]["name"] == "Jane Doe"

        # GET should return same profile
        resp = await client.get("/api/profile", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["basics"]["name"] == "Jane Doe"

    @pytest.mark.asyncio
    async def test_patch_merges_into_existing(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        # Create profile first
        await client.put(
            "/api/profile",
            headers=headers,
            json={
                "basics": {"name": "Jane Doe", "title": "Engineer", "email": "jane@test.com"},
                "skills": [{"category": "Languages", "items": ["Python"]}],
            },
        )

        # Patch only basics.summary
        resp = await client.patch(
            "/api/profile",
            headers=headers,
            json={"basics": {"summary": "Updated summary."}},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["basics"]["name"] == "Jane Doe"
        assert data["basics"]["summary"] == "Updated summary."
        assert data["skills"][0]["category"] == "Languages"

    @pytest.mark.asyncio
    async def test_patch_404_when_no_profile(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        resp = await client.patch(
            "/api/profile",
            headers=headers,
            json={"basics": {"name": "Jane"}},
        )
        assert resp.status_code == 404


def _parse_sse(text: str) -> list[dict]:
    """Parse SSE text into a list of {event, data} dicts."""
    events = []
    current_event = None
    current_data = None

    for line in text.strip().split("\n"):
        line = line.strip()
        if line.startswith("event: "):
            current_event = line[7:]
        elif line.startswith("data: "):
            current_data = json.loads(line[6:])
        elif line == "" and current_event is not None:
            events.append({"event": current_event, "data": current_data})
            current_event = None
            current_data = None

    # Handle last event if no trailing newline
    if current_event is not None:
        events.append({"event": current_event, "data": current_data})

    return events
