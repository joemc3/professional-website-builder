import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database import get_db
from app.main import app
from app.models import Base

from testcontainers.postgres import PostgresContainer


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


class TestRegister:
    async def test_register_success(self, client):
        response = await client.post(
            "/api/auth/register",
            json={"email": "new@example.com", "password": "SecurePass123!"},
        )
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_register_duplicate_email(self, client):
        await client.post(
            "/api/auth/register",
            json={"email": "dupe@example.com", "password": "SecurePass123!"},
        )
        response = await client.post(
            "/api/auth/register",
            json={"email": "dupe@example.com", "password": "SecurePass123!"},
        )
        assert response.status_code == 409

    async def test_register_invalid_email(self, client):
        response = await client.post(
            "/api/auth/register",
            json={"email": "not-an-email", "password": "SecurePass123!"},
        )
        assert response.status_code == 422


class TestLogin:
    async def test_login_success(self, client):
        await client.post(
            "/api/auth/register",
            json={"email": "login@example.com", "password": "SecurePass123!"},
        )
        response = await client.post(
            "/api/auth/login",
            json={"email": "login@example.com", "password": "SecurePass123!"},
        )
        assert response.status_code == 200
        assert "access_token" in response.json()

    async def test_login_wrong_password(self, client):
        await client.post(
            "/api/auth/register",
            json={"email": "wrongpw@example.com", "password": "SecurePass123!"},
        )
        response = await client.post(
            "/api/auth/login",
            json={"email": "wrongpw@example.com", "password": "WrongPassword"},
        )
        assert response.status_code == 401

    async def test_login_nonexistent_user(self, client):
        response = await client.post(
            "/api/auth/login",
            json={"email": "nobody@example.com", "password": "SecurePass123!"},
        )
        assert response.status_code == 401


class TestProtectedEndpoints:
    async def test_me_with_valid_token(self, client):
        reg = await client.post(
            "/api/auth/register",
            json={"email": "me@example.com", "password": "SecurePass123!"},
        )
        token = reg.json()["access_token"]
        response = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json()["email"] == "me@example.com"

    async def test_me_without_token(self, client):
        response = await client.get("/api/auth/me")
        assert response.status_code == 401

    async def test_me_with_invalid_token(self, client):
        response = await client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert response.status_code == 401

    async def test_logout(self, client):
        reg = await client.post(
            "/api/auth/register",
            json={"email": "logout@example.com", "password": "SecurePass123!"},
        )
        token = reg.json()["access_token"]
        response = await client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 204
