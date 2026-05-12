import uuid
from pathlib import Path
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from testcontainers.postgres import PostgresContainer

from app.database import get_db
from app.main import app
from app.models import Base
from app.models.document import Document
from app.services.document_parser import parse_document

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"


@pytest.fixture(scope="module")
def postgres_container():
    with PostgresContainer("postgres:16-alpine") as postgres:
        yield postgres


@pytest.fixture(scope="module")
def db_url(postgres_container):
    return postgres_container.get_connection_url().replace("psycopg2", "asyncpg")


@pytest.fixture
async def test_env(db_url, tmp_path):
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    upload_dir = str(tmp_path / "uploads")

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    app.state.arq_pool = AsyncMock()

    from app.config import settings
    original_upload_dir = settings.upload_dir
    settings.upload_dir = upload_dir

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac, session_factory, upload_dir

    settings.upload_dir = original_upload_dir
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


class TestDocumentUpload:
    async def test_upload_markdown_returns_processing(self, test_env):
        client, _, _ = test_env
        token = await _register_and_get_token(client)
        with open(FIXTURES_DIR / "sample.md", "rb") as f:
            resp = await client.post(
                "/api/documents",
                files={"files": ("resume.md", f, "text/markdown")},
                headers=_auth_headers(token),
            )
        assert resp.status_code == 201
        data = resp.json()
        assert len(data) == 1
        assert data[0]["status"] == "processing"
        assert data[0]["filename"] == "resume.md"
        assert data[0]["parsed_text"] is None

    async def test_upload_rejects_unsupported_type(self, test_env):
        client, _, _ = test_env
        token = await _register_and_get_token(client)
        resp = await client.post(
            "/api/documents",
            files={"files": ("evil.exe", b"binary stuff", "application/x-msdownload")},
            headers=_auth_headers(token),
        )
        assert resp.status_code == 415

    async def test_upload_requires_auth(self, test_env):
        client, _, _ = test_env
        resp = await client.post(
            "/api/documents",
            files={"files": ("test.md", b"# Test", "text/markdown")},
        )
        assert resp.status_code == 401 or resp.status_code == 403


class TestDocumentLifecycle:
    async def test_upload_parse_list_get_delete(self, test_env):
        client, session_factory, upload_dir = test_env
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        with open(FIXTURES_DIR / "sample.md", "rb") as f:
            resp = await client.post(
                "/api/documents",
                files={"files": ("resume.md", f, "text/markdown")},
                headers=headers,
            )
        assert resp.status_code == 201
        doc_id = resp.json()[0]["id"]

        async with session_factory() as session:
            result = await session.execute(
                select(Document).where(Document.id == uuid.UUID(doc_id))
            )
            doc = result.scalar_one()
            full_path = str(Path(upload_dir) / doc.file_path)
            doc.parsed_text = parse_document(full_path, doc.content_type)
            doc.status = "completed"
            await session.commit()

        resp = await client.get(f"/api/documents/{doc_id}", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "completed"
        assert "John Doe" in data["parsed_text"]

        resp = await client.get("/api/documents", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1
        assert any(d["id"] == doc_id for d in resp.json())

        resp = await client.delete(f"/api/documents/{doc_id}", headers=headers)
        assert resp.status_code == 204

        resp = await client.get(f"/api/documents/{doc_id}", headers=headers)
        assert resp.status_code == 404

        assert not Path(full_path).exists()


class TestDocumentOwnership:
    async def test_cannot_access_other_users_documents(self, test_env):
        client, _, _ = test_env
        token1 = await _register_and_get_token(client)
        token2 = await _register_and_get_token(client)

        with open(FIXTURES_DIR / "sample.md", "rb") as f:
            resp = await client.post(
                "/api/documents",
                files={"files": ("resume.md", f, "text/markdown")},
                headers=_auth_headers(token1),
            )
        doc_id = resp.json()[0]["id"]

        resp = await client.get(f"/api/documents/{doc_id}", headers=_auth_headers(token2))
        assert resp.status_code == 404

        resp = await client.delete(f"/api/documents/{doc_id}", headers=_auth_headers(token2))
        assert resp.status_code == 404
