# Phase 3e-B — Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Vitae to the user's VPS behind Pangolin/Traefik via push-to-main GitHub Actions deploys, with an invited-group access model (registration disabled, accounts created via CLI).

**Architecture:** Two GHCR images (`vitae-api` shared by api+worker, `vitae-ui`) plus a stock `nginx:alpine` for public sites. A dedicated `deploy` user on the VPS runs `docker compose pull && up -d` against `/opt/vitae/docker-compose.prod.yml` after each push. Pangolin routes traffic by hostname to containers on the existing `pangolin` Docker network.

**Tech Stack:** Docker, Docker Compose, GitHub Actions, GitHub Container Registry (GHCR), nginx, Pangolin/Traefik (external), Python 3.13, Node 20.

**Spec:** `docs/superpowers/specs/2026-05-12-phase3e-b-deployment-design.md`

---

## Task 1: Add `REGISTRATION_ENABLED` flag and gate `/api/auth/register`

**Files:**
- Modify: `src-api/app/config.py`
- Modify: `src-api/app/routers/auth.py`
- Create: `src-api/tests/unit/test_registration_flag.py`
- Modify: `src-api/tests/integration/test_auth_flow.py` (override the flag in existing tests)
- Modify: `docker-compose.yml` (set `REGISTRATION_ENABLED=true` for dev)
- Modify: `.env.example`

- [ ] **Step 1.1: Write a failing unit test for the disabled-registration case**

Create `src-api/tests/unit/test_registration_flag.py`:

```python
from unittest.mock import patch

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
        with patch("app.routers.auth.settings.registration_enabled", True):
            resp = await client.post(
                "/api/auth/register",
                json={"email": "new@test.com", "password": "supersecret"},
            )
        # 201 (created) or 409 (conflict if test DB persists). Anything except 403/307 proves the gate isn't blocking.
        assert resp.status_code not in (403, 307)
```

- [ ] **Step 1.2: Run the test to confirm it fails**

Run: `cd src-api && .venv/bin/python -m pytest tests/unit/test_registration_flag.py -v`
Expected: FAIL with `AttributeError: 'Settings' object has no attribute 'registration_enabled'` or similar — the field doesn't exist yet.

- [ ] **Step 1.3: Add the `registration_enabled` field to `Settings`**

In `src-api/app/config.py`, add inside the `Settings` class (alongside `jwt_secret` and friends):

```python
    # Registration gate (prod default: False; dev compose sets to True)
    registration_enabled: bool = False
```

- [ ] **Step 1.4: Gate `/api/auth/register` on the flag**

In `src-api/app/routers/auth.py`, add `from app.config import settings` to the imports, and modify the `register` function to check the flag first:

```python
@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if not settings.registration_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public registration is disabled on this instance.",
        )

    result = await db.execute(select(User).where(User.email == request.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=request.email,
        password_hash=auth_service.hash_password(request.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = auth_service.create_access_token(user_id=str(user.id), email=user.email)
    return TokenResponse(access_token=token)
```

- [ ] **Step 1.5: Run the new test to confirm it passes**

Run: `cd src-api && .venv/bin/python -m pytest tests/unit/test_registration_flag.py -v`
Expected: both tests PASS.

- [ ] **Step 1.6: Update existing auth tests that exercise `/register`**

In `src-api/tests/integration/test_auth_flow.py`, add this autouse fixture at the top of the file (under the imports):

```python
@pytest.fixture(autouse=True)
def enable_registration():
    """Existing auth-flow tests register users — flag must be on."""
    with patch("app.routers.auth.settings.registration_enabled", True):
        yield
```

Ensure `from unittest.mock import patch` is imported at the top of the file.

Look for `_register_and_get_token` helpers in other integration tests (`test_document_flow.py`, `test_profile_flow.py`, `test_job_posting_flow.py`, `test_site_flow.py`). Each of those files needs the same autouse fixture pattern. Search:

```bash
grep -lE 'api/auth/register' src-api/tests/integration/*.py
```

Add the autouse fixture to every file listed.

- [ ] **Step 1.7: Run the full test suite to confirm nothing else broke**

Run: `cd src-api && .venv/bin/python -m pytest -q`
Expected: 231 + 2 = 233 tests PASS (was 231, added 2 new ones).

- [ ] **Step 1.8: Update dev compose to enable registration locally**

In `docker-compose.yml`, under the `api-dev` service `environment:` block, add:

```yaml
      REGISTRATION_ENABLED: ${REGISTRATION_ENABLED:-true}
```

Do the same under `worker-dev` (the worker itself doesn't hit the route, but the env stays consistent across both services that share the image).

- [ ] **Step 1.9: Update `.env.example`**

In `.env.example`, add at an appropriate spot:

```
# Set to true to allow public sign-ups. Prod default: false.
REGISTRATION_ENABLED=true
```

- [ ] **Step 1.10: Commit**

```bash
git -C /Users/joemc3/tmp/vitae add src-api/app/config.py src-api/app/routers/auth.py src-api/tests/unit/test_registration_flag.py src-api/tests/integration/test_auth_flow.py src-api/tests/integration/test_document_flow.py src-api/tests/integration/test_profile_flow.py src-api/tests/integration/test_job_posting_flow.py src-api/tests/integration/test_site_flow.py docker-compose.yml .env.example
git -C /Users/joemc3/tmp/vitae commit -m "$(cat <<'EOF'
feat(auth): add REGISTRATION_ENABLED flag, gate /api/auth/register

Public registration is disabled by default. The dev compose flips the
flag back on so local development is unaffected. Prod deployments will
ship with REGISTRATION_ENABLED=false; accounts will be created via the
upcoming create_user CLI.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add the `create_user` CLI

**Files:**
- Create: `src-api/app/scripts/__init__.py` (empty)
- Create: `src-api/app/scripts/create_user.py`
- Create: `src-api/tests/unit/test_create_user.py`

- [ ] **Step 2.1: Create the empty package marker**

Create `src-api/app/scripts/__init__.py` as an empty file.

- [ ] **Step 2.2: Write failing tests for `create_user`**

Create `src-api/tests/unit/test_create_user.py`:

```python
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.scripts.create_user import create_user, run


class TestCreateUser:
    @pytest.mark.asyncio
    async def test_creates_user_with_hashed_password(self):
        db = AsyncMock()
        # Email-not-found path
        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=result)

        with patch("app.scripts.create_user.auth_service.hash_password", return_value="hashed-pw"):
            user = await create_user(db, "joe@example.com", "supersecret")

        assert user.email == "joe@example.com"
        assert user.password_hash == "hashed-pw"
        db.add.assert_called_once()
        db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_refuses_duplicate_email(self):
        db = AsyncMock()
        existing = MagicMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = existing
        db.execute = AsyncMock(return_value=result)

        with pytest.raises(ValueError, match="already exists"):
            await create_user(db, "joe@example.com", "supersecret")

    @pytest.mark.asyncio
    async def test_validates_email_format(self):
        db = AsyncMock()
        with pytest.raises(ValueError, match="email"):
            await create_user(db, "not-an-email", "supersecret")

    @pytest.mark.asyncio
    async def test_requires_min_password_length(self):
        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=result)
        with pytest.raises(ValueError, match="password"):
            await create_user(db, "joe@example.com", "short")


class TestRunCLI:
    def test_prompts_for_password_and_confirmation(self, monkeypatch, capsys):
        """`run` should prompt twice and call create_user with the matched password."""
        prompts = iter(["supersecret", "supersecret"])
        monkeypatch.setattr("getpass.getpass", lambda prompt="": next(prompts))

        async def fake_create_user(db, email, password):
            assert email == "joe@example.com"
            assert password == "supersecret"
            user = MagicMock()
            user.id = "abc-123"
            user.email = email
            return user

        with patch("app.scripts.create_user.create_user", side_effect=fake_create_user), \
             patch("app.scripts.create_user._open_session") as mock_session:
            ctx = MagicMock()
            ctx.__aenter__ = AsyncMock(return_value=AsyncMock())
            ctx.__aexit__ = AsyncMock(return_value=None)
            mock_session.return_value = ctx

            import asyncio
            asyncio.run(run("joe@example.com"))

        captured = capsys.readouterr()
        assert "Created user joe@example.com" in captured.out

    def test_aborts_on_password_mismatch(self, monkeypatch, capsys):
        prompts = iter(["password-one", "password-two"])
        monkeypatch.setattr("getpass.getpass", lambda prompt="": next(prompts))

        with pytest.raises(SystemExit):
            import asyncio
            asyncio.run(run("joe@example.com"))

        captured = capsys.readouterr()
        assert "match" in captured.err.lower() or "match" in captured.out.lower()
```

- [ ] **Step 2.3: Run tests to confirm they fail**

Run: `cd src-api && .venv/bin/python -m pytest tests/unit/test_create_user.py -v`
Expected: FAIL — module `app.scripts.create_user` doesn't exist.

- [ ] **Step 2.4: Implement `create_user.py`**

Create `src-api/app/scripts/create_user.py`:

```python
"""CLI to create a user account.

Usage (inside the running container):
    python -m app.scripts.create_user <email>
"""
from __future__ import annotations

import asyncio
import contextlib
import getpass
import re
import sys
from typing import AsyncIterator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.middleware.auth import auth_service
from app.models.user import User

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_MIN_PASSWORD_LEN = 8


@contextlib.asynccontextmanager
async def _open_session() -> AsyncIterator[AsyncSession]:
    async with async_session_factory() as session:
        yield session


async def create_user(db: AsyncSession, email: str, password: str) -> User:
    if not _EMAIL_RE.match(email):
        raise ValueError(f"Invalid email format: {email!r}")
    if len(password) < _MIN_PASSWORD_LEN:
        raise ValueError(
            f"Password must be at least {_MIN_PASSWORD_LEN} characters"
        )

    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none() is not None:
        raise ValueError(f"User with email {email!r} already exists")

    user = User(
        email=email,
        password_hash=auth_service.hash_password(password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def run(email: str) -> None:
    password = getpass.getpass("Password: ")
    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Passwords do not match. Aborting.", file=sys.stderr)
        sys.exit(1)

    async with _open_session() as db:
        try:
            user = await create_user(db, email, password)
        except ValueError as exc:
            print(f"Error: {exc}", file=sys.stderr)
            sys.exit(2)

    print(f"Created user {user.email} ({user.id})")


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python -m app.scripts.create_user <email>", file=sys.stderr)
        sys.exit(64)  # EX_USAGE
    asyncio.run(run(sys.argv[1]))


if __name__ == "__main__":
    main()
```

- [ ] **Step 2.5: Confirm `async_session_factory` exists with that name**

Run: `grep -n 'async_session_factory\|async_sessionmaker' src-api/app/database.py`

If the symbol is named differently (e.g. `AsyncSessionLocal`), adjust the import in `create_user.py` accordingly. The intent is "an `async_session_factory`-style callable that produces an `AsyncSession` in a context manager."

- [ ] **Step 2.6: Run unit tests to confirm they pass**

Run: `cd src-api && .venv/bin/python -m pytest tests/unit/test_create_user.py -v`
Expected: all 6 tests PASS.

- [ ] **Step 2.7: Add an integration test against a real testcontainer Postgres**

Create `src-api/tests/integration/test_create_user.py`:

```python
import os

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from testcontainers.postgres import PostgresContainer

from app.models.user import User
from app.scripts.create_user import create_user


@pytest.fixture(scope="module")
def postgres_container():
    with PostgresContainer("postgres:16") as pg:
        yield pg


@pytest.fixture(scope="module")
def db_url(postgres_container):
    raw = postgres_container.get_connection_url()
    return raw.replace("postgresql+psycopg2://", "postgresql+asyncpg://").replace(
        "postgresql://", "postgresql+asyncpg://"
    )


@pytest.fixture
async def session_factory(db_url):
    engine = create_async_engine(db_url)
    from app.models.user import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    yield factory
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


class TestCreateUserIntegration:
    @pytest.mark.asyncio
    async def test_creates_real_user_with_hashed_password(self, session_factory):
        async with session_factory() as db:
            user = await create_user(db, "real@example.com", "supersecret")
            assert user.id is not None
            assert user.password_hash != "supersecret"
            assert user.password_hash.startswith("$2")  # bcrypt prefix

        # Confirm row persisted in a fresh session
        async with session_factory() as db:
            result = await db.execute(select(User).where(User.email == "real@example.com"))
            assert result.scalar_one().email == "real@example.com"

    @pytest.mark.asyncio
    async def test_refuses_duplicate_in_real_db(self, session_factory):
        async with session_factory() as db:
            await create_user(db, "dup@example.com", "supersecret")
        async with session_factory() as db:
            with pytest.raises(ValueError, match="already exists"):
                await create_user(db, "dup@example.com", "supersecret")
```

Note: if `app.models.user` does not expose `Base` directly, adjust the import to wherever the SQLAlchemy `DeclarativeBase` is defined (likely `app.models.base` or `app.database`). Search:

```bash
grep -rE 'class Base|DeclarativeBase' src-api/app/models/ src-api/app/database.py
```

- [ ] **Step 2.8: Run the integration test**

Run: `cd src-api && .venv/bin/python -m pytest tests/integration/test_create_user.py -v`
Expected: both tests PASS (takes ~10s while testcontainer Postgres boots).

- [ ] **Step 2.9: Smoke-test the CLI against the dev stack**

Run:
```bash
docker compose --profile dev up -d --build
docker compose --profile dev exec api-dev python -m app.scripts.create_user clitest@example.com
```

When prompted, type `clitest-password` twice. Expected output: `Created user clitest@example.com (<uuid>)`.

Then verify by logging in:
```bash
curl -X POST http://localhost:8000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"clitest@example.com","password":"clitest-password"}'
```
Expected: 200 with an `access_token`.

Tear down: `docker compose --profile dev down`.

- [ ] **Step 2.10: Commit**

```bash
git -C /Users/joemc3/tmp/vitae add src-api/app/scripts/__init__.py src-api/app/scripts/create_user.py src-api/tests/unit/test_create_user.py src-api/tests/integration/test_create_user.py
git -C /Users/joemc3/tmp/vitae commit -m "$(cat <<'EOF'
feat(scripts): add create_user CLI for invited-group account bootstrap

The script is invoked inside the running container via
`docker compose exec vitae-api python -m app.scripts.create_user <email>`.
Prompts for password twice, validates email + min length, refuses
duplicates, and reuses the existing bcrypt path. This is the bootstrap
mechanism for Phase 3e-B's invited-group access model.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Rewrite `src-api/Dockerfile` to include Node + generator

**Files:**
- Modify: `src-api/Dockerfile`
- Create: `.dockerignore` (repo root)
- Modify: `docker-compose.yml` (build context, dockerfile path)

- [ ] **Step 3.1: Create a repo-root `.dockerignore`**

Create `.dockerignore`:

```
**/__pycache__
**/.pytest_cache
**/.venv
**/node_modules
**/.next
**/out
**/dist
.git
.github
docs
backups
postgres-data
docker-volumes
*.log
.DS_Store
.env
.env.local
```

- [ ] **Step 3.2: Rewrite `src-api/Dockerfile`**

Replace the entire contents of `src-api/Dockerfile` with:

```dockerfile
# syntax=docker/dockerfile:1
#
# Vitae API + worker image.
# Used by both `vitae-api` (uvicorn) and `vitae-worker` (arq) — command differs in compose.
# Contains Python deps for the API and Node + the Next.js generator for site generation.
#
# Build context: repo root.
#   docker build -f src-api/Dockerfile -t vitae-api .

FROM python:3.13-slim

# System deps:
#   - nodejs 20 (for the Next.js generator the worker shells out to)
#   - WeasyPrint runtime libs (Cairo, Pango, GDK, JPEG)
#   - utilities used by the entrypoint
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl ca-certificates gnupg \
        libcairo2 libpango-1.0-0 libpangoft2-1.0-0 libgdk-pixbuf-2.0-0 \
        libjpeg62-turbo libxml2 libffi8 shared-mime-info fonts-dejavu \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Python deps (cached when pyproject.toml + uv.lock don't change)
COPY src-api/pyproject.toml src-api/uv.lock ./
RUN uv sync --frozen --no-dev

# Generator deps (cached when package.json + package-lock.json don't change)
COPY src-generator/package.json src-generator/package-lock.json* ./generator/
RUN cd generator && npm ci --omit=dev

# Application code
COPY src-api/app/ app/
COPY src-api/migrations/ migrations/
COPY src-api/alembic.ini ./

# Generator code (full tree, on top of the already-installed node_modules)
COPY src-generator/ generator/

EXPOSE 8000

# Default command is uvicorn; the worker service overrides this in compose
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 3.3: Update `docker-compose.yml` build contexts**

In `docker-compose.yml`, change both `api-dev` and `worker-dev` build blocks from:

```yaml
    build:
      context: ./src-api
      dockerfile: Dockerfile
```

to:

```yaml
    build:
      context: .
      dockerfile: src-api/Dockerfile
```

- [ ] **Step 3.4: Build the new image**

Run from the repo root:

```bash
docker compose --profile dev build api-dev
```

Expected: build completes without error. First build will take 2–4 minutes (downloading Node, Cairo, etc.); subsequent rebuilds use cache.

- [ ] **Step 3.5: Verify the image has Node and the generator**

```bash
docker compose --profile dev run --rm --entrypoint /bin/sh api-dev -c "node --version && ls /app/generator/generate.js /app/generator/node_modules/.package-lock.json"
```

Expected: prints `v20.x.x`, lists both files (no errors).

- [ ] **Step 3.6: Verify dev compose still works end-to-end**

```bash
docker compose --profile dev up -d
sleep 10
curl -fsS http://localhost:8000/health
docker compose --profile dev logs api-dev worker-dev 2>&1 | tail -30
docker compose --profile dev down
```

Expected: `/health` returns 200 with `{"status":"healthy",...}`; no errors in api/worker logs at the tail.

- [ ] **Step 3.7: Commit**

```bash
git -C /Users/joemc3/tmp/vitae add .dockerignore src-api/Dockerfile docker-compose.yml
git -C /Users/joemc3/tmp/vitae commit -m "$(cat <<'EOF'
build(api): bundle Node + Next.js generator into the API/worker image

Closes the long-standing gap where worker-dispatched site generation
crashed in-container with 'node: not found'. The Dockerfile now installs
Node 20, copies src-generator, and runs npm ci. The dev compose build
context moves to the repo root so the Dockerfile can reach both
src-api/ and src-generator/.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Update `src-ui/nginx.conf` upstream for prod

**Files:**
- Modify: `src-ui/nginx.conf`

Note: dev does not use this nginx (the dev frontend runs the Vite dev server). The change is safe.

- [ ] **Step 4.1: Update the upstream hostname**

In `src-ui/nginx.conf`, change the two `proxy_pass` directives. Old:

```
    location /api/ {
        proxy_pass http://api:8000;
```

New:

```
    location /api/ {
        proxy_pass http://vitae-api:8000;
```

And:

```
    location /health {
        proxy_pass http://api:8000;
```

becomes:

```
    location /health {
        proxy_pass http://vitae-api:8000;
```

- [ ] **Step 4.2: Commit**

```bash
git -C /Users/joemc3/tmp/vitae add src-ui/nginx.conf
git -C /Users/joemc3/tmp/vitae commit -m "$(cat <<'EOF'
build(ui): point nginx proxy upstream at vitae-api for prod

Pangolin handles /api/* routing at the edge, but the nginx proxy block
acts as a backstop. Update the upstream from the legacy `api` service
name to the prod `vitae-api` container name. Dev is unaffected (frontend
runs Vite, not this nginx).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Create `docker-compose.prod.yml`

**Files:**
- Create: `docker-compose.prod.yml`

- [ ] **Step 5.1: Write the prod compose file**

Create `docker-compose.prod.yml` at the repo root:

```yaml
# Vitae production stack — lives at /opt/vitae/docker-compose.prod.yml on the VPS.
# Synced from the repo by the GitHub Actions deploy job.
#
# Reads secrets from /opt/vitae/.env (POSTGRES_PASSWORD, JWT_SECRET, SECRET_KEY, SITE_URL, ADMIN_URL).
# All routable services attach to the existing `pangolin` Docker network; Pangolin's admin UI
# maps hostnames -> containers (no Traefik labels needed).

services:
  vitae-postgres:
    image: postgres:16
    container_name: vitae-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: vitae
      POSTGRES_USER: vitae
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set in .env}
    volumes:
      - vitae-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vitae -d vitae"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - vitae-internal

  vitae-redis:
    image: redis:7-alpine
    container_name: vitae-redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - vitae-internal

  vitae-api:
    image: ghcr.io/joemc3/vitae-api:latest
    container_name: vitae-api
    restart: unless-stopped
    depends_on:
      vitae-postgres:
        condition: service_healthy
      vitae-redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql+asyncpg://vitae:${POSTGRES_PASSWORD}@vitae-postgres:5432/vitae
      JWT_SECRET: ${JWT_SECRET:?JWT_SECRET must be set in .env}
      SECRET_KEY: ${SECRET_KEY:?SECRET_KEY must be set in .env}
      REDIS_URL: redis://vitae-redis:6379/0
      SITE_URL: ${SITE_URL:?SITE_URL must be set in .env}
      ADMIN_URL: ${ADMIN_URL:?ADMIN_URL must be set in .env}
      CORS_ORIGINS: ${ADMIN_URL}
      REGISTRATION_ENABLED: "false"
      UPLOAD_DIR: /data/uploads
      GENERATION_DIR: /data/generation
      OUTPUT_DIR: /data/output
      LOG_LEVEL: info
    volumes:
      - vitae-uploads:/data/uploads
      - vitae-generation:/data/generation
      - vitae-output:/data/output
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    networks:
      - vitae-internal
      - pangolin
    command: ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

  vitae-worker:
    image: ghcr.io/joemc3/vitae-api:latest
    container_name: vitae-worker
    restart: unless-stopped
    depends_on:
      vitae-postgres:
        condition: service_healthy
      vitae-redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql+asyncpg://vitae:${POSTGRES_PASSWORD}@vitae-postgres:5432/vitae
      SECRET_KEY: ${SECRET_KEY}
      REDIS_URL: redis://vitae-redis:6379/0
      SITE_URL: ${SITE_URL}
      UPLOAD_DIR: /data/uploads
      GENERATION_DIR: /data/generation
      OUTPUT_DIR: /data/output
      LOG_LEVEL: info
    volumes:
      - vitae-uploads:/data/uploads
      - vitae-generation:/data/generation
      - vitae-output:/data/output
    networks:
      - vitae-internal
    command: ["uv", "run", "arq", "app.worker.WorkerSettings"]

  vitae-ui:
    image: ghcr.io/joemc3/vitae-ui:latest
    container_name: vitae-ui
    restart: unless-stopped
    networks:
      - pangolin

  vitae-public-sites:
    image: nginx:alpine
    container_name: vitae-public-sites
    restart: unless-stopped
    volumes:
      - vitae-output:/usr/share/nginx/html:ro
      - ./public-sites.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - pangolin

volumes:
  vitae-postgres-data:
  vitae-uploads:
  vitae-generation:
  vitae-output:

networks:
  vitae-internal:
    driver: bridge
  pangolin:
    external: true
    name: pangolin
```

- [ ] **Step 5.2: Validate the compose file syntax**

Validation needs the env vars set (because of `${VAR:?msg}`), so create a throwaway env and run config:

```bash
cd /Users/joemc3/tmp/vitae
POSTGRES_PASSWORD=x JWT_SECRET=x SECRET_KEY=x SITE_URL=x ADMIN_URL=x \
    docker compose -f docker-compose.prod.yml config > /dev/null
```

Expected: no output (success). Errors print to stderr.

- [ ] **Step 5.3: Commit**

```bash
git -C /Users/joemc3/tmp/vitae add docker-compose.prod.yml
git -C /Users/joemc3/tmp/vitae commit -m "$(cat <<'EOF'
feat(infra): add docker-compose.prod.yml for VPS deployment

Six services: postgres, redis, api, worker (same image as api), ui,
public-sites (stock nginx with bind-mounted slug-routing config).
Routable services attach to the existing pangolin network; internal
services stay on vitae-internal. Secrets read from /opt/vitae/.env with
required-var guards so missing config fails fast.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Add `Makefile` with deployment helpers

**Files:**
- Create: `Makefile` (repo root)

- [ ] **Step 6.1: Write the Makefile**

Create `Makefile`:

```makefile
# Vitae developer / operator helpers.
# `make` with no target prints help.

.DEFAULT_GOAL := help
COMPOSE_DEV := docker compose --profile dev
COMPOSE_PROD := sudo docker compose -f /opt/vitae/docker-compose.prod.yml
BACKUP_DIR := backups

.PHONY: help
help:
	@echo "Vitae targets:"
	@echo ""
	@echo "  Local development:"
	@echo "    make up         — start the dev stack"
	@echo "    make down       — stop the dev stack"
	@echo "    make rebuild    — rebuild images and restart"
	@echo "    make test       — run the API test suite"
	@echo ""
	@echo "  Operations (run on the VPS unless noted):"
	@echo "    make logs              — tail prod logs"
	@echo "    make shell             — shell into the prod API container"
	@echo "    make migrate           — run alembic upgrade head against prod"
	@echo "    make create-user EMAIL=foo@bar.com  — create a prod user account"
	@echo "    make backup            — pg_dump + uploads tar to ./backups/"

# --- Local dev ---

.PHONY: up
up:
	$(COMPOSE_DEV) up -d --build

.PHONY: down
down:
	$(COMPOSE_DEV) down

.PHONY: rebuild
rebuild:
	$(COMPOSE_DEV) build --no-cache
	$(COMPOSE_DEV) up -d

.PHONY: test
test:
	cd src-api && .venv/bin/python -m pytest -q

# --- Prod ops (VPS) ---

.PHONY: logs
logs:
	$(COMPOSE_PROD) logs -f --tail=200

.PHONY: shell
shell:
	$(COMPOSE_PROD) exec vitae-api /bin/bash

.PHONY: migrate
migrate:
	$(COMPOSE_PROD) exec vitae-api uv run alembic upgrade head

.PHONY: create-user
create-user:
	@if [ -z "$(EMAIL)" ]; then echo "Usage: make create-user EMAIL=foo@bar.com"; exit 64; fi
	$(COMPOSE_PROD) exec vitae-api uv run python -m app.scripts.create_user $(EMAIL)

.PHONY: backup
backup:
	@mkdir -p $(BACKUP_DIR)
	@TS=$$(date +%Y%m%d-%H%M%S); \
	echo "Backing up to $(BACKUP_DIR)/vitae-$$TS.{sql.gz,uploads.tar.gz}"; \
	$(COMPOSE_PROD) exec -T vitae-postgres pg_dump -U vitae vitae | gzip > $(BACKUP_DIR)/vitae-$$TS.sql.gz; \
	$(COMPOSE_PROD) run --rm -v vitae-uploads:/source:ro -v $$(pwd)/$(BACKUP_DIR):/dest alpine tar -czf /dest/vitae-$$TS.uploads.tar.gz -C /source .; \
	echo "Done."
```

- [ ] **Step 6.2: Verify Make can parse the file**

Run: `make help`
Expected: prints the help text. No "missing separator" or syntax errors.

- [ ] **Step 6.3: Commit**

```bash
git -C /Users/joemc3/tmp/vitae add Makefile
git -C /Users/joemc3/tmp/vitae commit -m "$(cat <<'EOF'
chore: add Makefile with dev + prod operator targets

Local: up/down/rebuild/test. Prod (VPS): logs, shell, migrate,
create-user, backup. `make backup` does pg_dump + uploads tar to
./backups/ — manual replacement for the deferred automated-backup
work tracked in docs/future-work.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Add `.github/workflows/deploy.yml`

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 7.1: Write the workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch: {}

concurrency:
  group: vitae-deploy
  cancel-in-progress: true

permissions:
  contents: read
  packages: write

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    outputs:
      sha: ${{ steps.meta.outputs.sha }}
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - id: meta
        run: echo "sha=$(echo ${GITHUB_SHA} | cut -c1-7)" >> "$GITHUB_OUTPUT"

      - name: Build and push vitae-api
        uses: docker/build-push-action@v5
        with:
          context: .
          file: src-api/Dockerfile
          push: true
          tags: |
            ghcr.io/joemc3/vitae-api:sha-${{ steps.meta.outputs.sha }}
            ghcr.io/joemc3/vitae-api:latest
          cache-from: type=gha,scope=vitae-api
          cache-to: type=gha,mode=max,scope=vitae-api

      - name: Build and push vitae-ui
        uses: docker/build-push-action@v5
        with:
          context: src-ui
          file: src-ui/Dockerfile
          target: prod
          push: true
          tags: |
            ghcr.io/joemc3/vitae-ui:sha-${{ steps.meta.outputs.sha }}
            ghcr.io/joemc3/vitae-ui:latest
          cache-from: type=gha,scope=vitae-ui
          cache-to: type=gha,mode=max,scope=vitae-ui

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.VPS_SSH_KEY }}

      - name: Add VPS to known_hosts
        run: ssh-keyscan -H ${{ secrets.VPS_HOST }} >> ~/.ssh/known_hosts

      - name: Sync compose + nginx config to VPS
        run: |
          scp docker-compose.prod.yml ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }}:/opt/vitae/docker-compose.prod.yml
          scp nginx/sites.conf ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }}:/opt/vitae/public-sites.conf

      - name: Pull images and restart stack
        run: |
          ssh ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} bash <<'EOF'
          set -euo pipefail
          cd /opt/vitae
          sudo docker compose -f docker-compose.prod.yml pull
          sudo docker compose -f docker-compose.prod.yml up -d --remove-orphans
          sudo docker image prune -f
          EOF

      - name: Smoke check
        run: |
          for i in $(seq 1 12); do
            if curl -fsS "https://app.vitae.2524.cloud/api/health" >/dev/null; then
              echo "Health check passed on attempt $i"
              exit 0
            fi
            echo "Attempt $i failed, retrying in 5s..."
            sleep 5
          done
          echo "Smoke check failed after 60s"
          exit 1
```

- [ ] **Step 7.2: Commit**

```bash
git -C /Users/joemc3/tmp/vitae add .github/workflows/deploy.yml
git -C /Users/joemc3/tmp/vitae commit -m "$(cat <<'EOF'
ci: add deploy workflow for push-to-main VPS deploys

Two jobs: build-and-push (vitae-api + vitae-ui to GHCR, with GHA build
cache) and deploy (scp compose + nginx config to VPS, pull, up -d,
smoke-check /api/health). Workflow won't succeed end-to-end until the
VPS bootstrap and GitHub Actions secrets are in place (see
docs/deployment.md).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Write `docs/deployment.md`

**Files:**
- Create: `docs/deployment.md`

- [ ] **Step 8.1: Write the deployment runbook**

Create `docs/deployment.md`:

````markdown
# Deployment

Vitae deploys to a single VPS behind Pangolin/Traefik. Every push to `main` triggers a GitHub Actions workflow that builds two images, pushes them to GHCR, and SSHes into the VPS to restart the stack. This document covers the **one-time bootstrap** (manual) and the **steady-state operations** (everyday tasks once bootstrap is done).

## Architecture (one-page summary)

- **Containers** live under `/opt/vitae/` on the VPS.
- **Network:** all routable services attach to the existing `pangolin` Docker network. Pangolin's admin UI handles hostname → container routing. No host ports exposed.
- **Hostnames:**
  - `app.vitae.2524.cloud` — admin UI (`/`) + API (`/api/*`), both via `vitae-ui` and `vitae-api`
  - `vitae.2524.cloud` — public portfolio + targeted sites, served by `vitae-public-sites`
- **Images:** `ghcr.io/joemc3/vitae-api:latest` (used by both `vitae-api` and `vitae-worker`) and `ghcr.io/joemc3/vitae-ui:latest`. Public sites is stock `nginx:alpine`.
- **Secrets:** `/opt/vitae/.env` on the VPS, never in git.
- **Deploy trigger:** push to `main` → `.github/workflows/deploy.yml`.

See `docs/superpowers/specs/2026-05-12-phase3e-b-deployment-design.md` for the full design.

## One-time bootstrap

Run these steps once, when you're ready for the first real deploy.

### 1. DNS

Point the two hostnames at the VPS / Pangolin edge:

- `vitae.2524.cloud` → VPS IP
- `app.vitae.2524.cloud` → VPS IP

Use whichever DNS provider hosts `2524.cloud`.

### 2. Create a `deploy` user on the VPS

SSH in as your normal user, then:

```bash
sudo useradd -m -s /bin/bash deploy
sudo mkdir -p /home/deploy/.ssh
sudo chown -R deploy:deploy /home/deploy
sudo usermod -aG docker deploy
```

Add a sudoers entry restricting `deploy` to exactly the operations the GHA workflow needs. As root:

```bash
sudo visudo -f /etc/sudoers.d/vitae-deploy
```

Contents:

```
deploy ALL=(root) NOPASSWD: /usr/bin/docker compose -f /opt/vitae/docker-compose.prod.yml *, /usr/bin/docker image prune -f
```

### 3. Generate and install an SSH key for GitHub Actions

On your local machine:

```bash
ssh-keygen -t ed25519 -C "vitae-gha-deploy" -f ~/.ssh/vitae-deploy -N ""
```

Append the **public** key to the VPS:

```bash
ssh-copy-id -i ~/.ssh/vitae-deploy.pub deploy@2524.cloud
```

You'll add the **private** key (`~/.ssh/vitae-deploy`) to GitHub Actions secrets in step 8.

### 4. Create `/opt/vitae/`

On the VPS:

```bash
sudo mkdir -p /opt/vitae
sudo chown deploy:deploy /opt/vitae
```

Then, from your local machine, scp the initial files (the deploy workflow will keep them in sync from here on):

```bash
scp docker-compose.prod.yml deploy@2524.cloud:/opt/vitae/docker-compose.prod.yml
scp nginx/sites.conf deploy@2524.cloud:/opt/vitae/public-sites.conf
```

### 5. Generate `/opt/vitae/.env`

On the VPS, as the `deploy` user:

```bash
cd /opt/vitae
umask 077
cat > .env <<EOF
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
JWT_SECRET=$(openssl rand -base64 32)
SECRET_KEY=$(openssl rand -base64 32)
SITE_URL=https://vitae.2524.cloud
ADMIN_URL=https://app.vitae.2524.cloud
EOF
chmod 600 .env
```

**Keep a copy of `.env` somewhere safe** (password manager). If you ever lose it, the encrypted API keys in the database become unrecoverable (they're encrypted with `SECRET_KEY`).

### 6. Authenticate the VPS with GHCR

So the `deploy` user can `docker compose pull` the private images:

1. On GitHub, go to your account settings → Developer settings → Personal access tokens → Tokens (classic). Create a token with **`read:packages`** scope only. Copy it.
2. On the VPS, as `deploy`:

```bash
echo "<your-PAT>" | docker login ghcr.io -u joemc3 --password-stdin
```

This writes credentials to `~deploy/.docker/config.json`.

### 7. First boot

You need the images in GHCR before this works. Push a commit to `main` (any commit — even a no-op) and let the `build-and-push` job complete. The `deploy` job will fail (no secrets yet, expected). Then on the VPS:

```bash
cd /opt/vitae
sudo docker compose -f docker-compose.prod.yml pull
sudo docker compose -f docker-compose.prod.yml up -d
sudo docker compose -f docker-compose.prod.yml logs -f vitae-api vitae-worker
```

Alembic runs migrations during API startup. Wait for `Application startup complete.` in the api logs. Ctrl-C to detach.

### 8. Register Pangolin resources

In Pangolin's admin UI, create three resources:

| Resource name        | Hostname                       | Path        | Target container     | Port |
|----------------------|--------------------------------|-------------|----------------------|------|
| `vitae-admin`        | `app.vitae.2524.cloud`         | `/`         | `vitae-ui`           | 80   |
| `vitae-api`          | `app.vitae.2524.cloud`         | `/api/*`    | `vitae-api`          | 8000 |
| `vitae-public-sites` | `vitae.2524.cloud`             | `/`         | `vitae-public-sites` | 80   |

Pangolin handles TLS via your existing cert setup. (If your Pangolin version doesn't support multi-target routes on a single resource, create the api route as a sibling resource on the same hostname with a higher priority.)

### 9. Smoke checks

```bash
curl -fsS https://app.vitae.2524.cloud/api/health
# {"status":"healthy",...}
```

Open `https://app.vitae.2524.cloud` in a browser — the admin UI loads.

`https://vitae.2524.cloud` may return 404 until the first portfolio site is generated — that's expected.

### 10. Create your account

On the VPS, as `deploy` (or any user with docker access):

```bash
cd /opt/vitae
make create-user EMAIL=joemc3@gmail.com
# When prompted, type and confirm your password.
```

Log in via the admin UI.

### 11. Add GitHub Actions secrets

In the GitHub repo → Settings → Secrets and variables → Actions, add:

| Name           | Value                                                                |
|----------------|----------------------------------------------------------------------|
| `VPS_HOST`     | `2524.cloud` (or the SSH endpoint of the VPS)                        |
| `VPS_USER`     | `deploy`                                                             |
| `VPS_SSH_KEY`  | contents of `~/.ssh/vitae-deploy` (the private key, full file)       |

Push any commit to `main` — the deploy job should succeed end-to-end. From here on, push-to-main is the deploy mechanism.

## Steady-state operations

All commands run on the VPS unless noted.

### Read logs

```bash
make logs                   # tail all services
sudo docker compose -f /opt/vitae/docker-compose.prod.yml logs -f vitae-api
```

### Shell into a container

```bash
make shell                  # shells into vitae-api
sudo docker compose -f /opt/vitae/docker-compose.prod.yml exec vitae-worker /bin/bash
```

### Manually run migrations

Migrations run on API startup, but you can re-run idempotently:

```bash
make migrate
```

### Create a new user

```bash
make create-user EMAIL=newperson@example.com
```

### Manual backup

```bash
make backup
# Writes ./backups/vitae-<timestamp>.sql.gz and ./backups/vitae-<timestamp>.uploads.tar.gz
```

Copy the resulting files off the VPS to wherever you keep backups. Automated remote backups are tracked in `docs/future-work.md`.

### Restart the stack

```bash
sudo docker compose -f /opt/vitae/docker-compose.prod.yml restart
# or specific service:
sudo docker compose -f /opt/vitae/docker-compose.prod.yml restart vitae-api
```

### Rolling back

Each push tags two images: `:latest` (moving) and `:sha-<short>` (immutable). To roll back to a previous commit's images:

1. Find the SHA of the working commit (look at `git log` or the GHA run page).
2. On the VPS:

```bash
SHA=abc1234   # short SHA of the target commit
for img in vitae-api vitae-ui; do
    sudo docker pull ghcr.io/joemc3/$img:sha-$SHA
    sudo docker tag ghcr.io/joemc3/$img:sha-$SHA ghcr.io/joemc3/$img:latest
done
sudo docker compose -f /opt/vitae/docker-compose.prod.yml up -d
```

The next push to `main` will overwrite `:latest` again — so do `git revert` if you want the rollback to persist past the next deploy.

### Updating the compose file

Edit `docker-compose.prod.yml` in the repo, commit, push to `main`. The deploy job `scp`s the new file to `/opt/vitae/` before pulling images and restarting.

For an out-of-band tweak: edit `/opt/vitae/docker-compose.prod.yml` directly on the VPS and run `sudo docker compose -f docker-compose.prod.yml up -d`. The next deploy will overwrite your edit — sync it back to the repo first if you want it to stick.

### Updating the `.env` file

`.env` is **not** synced from the repo. Edit it on the VPS directly, then:

```bash
cd /opt/vitae
sudo docker compose -f docker-compose.prod.yml up -d
# Compose detects the env change and recreates the affected containers.
```

## Troubleshooting

**`/api/health` returns 502** — Pangolin can't reach `vitae-api`. Check that the container is healthy (`docker ps`), and that it's on the `pangolin` network (`docker inspect vitae-api | grep -A5 Networks`).

**Alembic migration fails on startup** — read the api logs. Most common cause: a hand-edited migration file that doesn't apply cleanly. Roll back to the previous image while you fix forward.

**GHA deploy job hangs on smoke check** — the deploy succeeded but the health check is failing. Either the API is still warming up (it takes ~20s on a cold cache) or Pangolin needs reconfiguring. Check logs.

**`/api/auth/register` returns 403** — that's correct. `REGISTRATION_ENABLED=false` is the production default. Create accounts with `make create-user`.

**Worker not picking up jobs** — ARQ consumes from the same Redis the API enqueues to; if the API was started without redis being healthy, jobs queue but the worker might be in a broken state. `docker compose restart vitae-worker` usually fixes it.
````

- [ ] **Step 8.2: Commit**

```bash
git -C /Users/joemc3/tmp/vitae add docs/deployment.md
git -C /Users/joemc3/tmp/vitae commit -m "$(cat <<'EOF'
docs: add deployment runbook covering bootstrap and ops

One-time bootstrap (DNS, deploy user, /opt/vitae setup, secrets, GHCR
auth, Pangolin resources, first account, GHA secrets) plus steady-state
operations (logs, shell, migrate, create-user, backup, rollback, env
edits) and a troubleshooting section.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Refresh `README.md`, `CLAUDE.md`, and `.env.example`

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `.env.example`

- [ ] **Step 9.1: Rewrite the stale parts of `README.md`**

In `README.md`, replace the "Current Status" section (currently claims Phase 2a complete and "Phase 2b is next"):

```markdown
## Current Status

**Phase 3e-B (Deployment) is complete.** Vitae deploys to a VPS behind Pangolin/Traefik via push-to-main GitHub Actions. Registration is gated behind `REGISTRATION_ENABLED` — small invited group only at launch; public sign-up is tracked in [`docs/future-work.md`](docs/future-work.md).

Prior phases (1, 2a, 2b, 3a–3e-A) are all complete. Phase 4 (end-to-end browser testing) is deliberately deferred.

See `docs/superpowers/specs/` for design specs and `docs/superpowers/plans/` for implementation plans.
```

Replace the "Roadmap" section with:

```markdown
## Roadmap

- Phase 1: Foundation ✅
- Phase 2a: Document Repository & Parsing ✅
- Phase 2b: LiteLLM & Profile Synthesis ✅
- Phase 3a: Sites & Generator Wiring ✅
- Phase 3b: Admin UI Rebuild ✅
- Phase 3c: Site Themes ✅
- Phase 3d: Resume PDF Generation ✅
- Phase 3e-A: Polish Features ✅
- Phase 3e-B: Deployment ✅
- Phase 4: End-to-end testing (deferred — see `docs/future-work.md`)
```

In the Tech Stack table, change the API row from `Python 3.12 / FastAPI` to `Python 3.13 / FastAPI`.

Add a new top-level section between "Project Structure" and "Development":

```markdown
## Deployment

Vitae deploys to a VPS via push-to-main GitHub Actions. See [`docs/deployment.md`](docs/deployment.md) for the one-time bootstrap procedure and steady-state operations (logs, rollback, backups, user creation).
```

- [ ] **Step 9.2: Update `CLAUDE.md`**

In `CLAUDE.md`:

1. Update the "Current Phase" section. Replace the existing paragraph block starting with "**Project renamed to Vitae** (2026-04-09)" through the end of that section with:

```markdown
**Phase 3e-B (Deployment) is complete.** Vitae deploys to a VPS behind Pangolin/Traefik via push-to-main GitHub Actions. The API/worker image now bundles Node 20 + the Next.js generator (closing the long-standing "Node not in worker" gap). Registration is disabled in prod by default (`REGISTRATION_ENABLED=false`); accounts are created via the `python -m app.scripts.create_user` CLI inside the running container. See `docs/deployment.md` for the deploy runbook.

**Previous phases:**
- Phase 3e-A (Polish Features) — live preview, profile photo upload, conditional resume download
- Phase 3d (Resume PDF Generation) — LLM-tailored resumes with WeasyPrint, 6 theme templates, two-pass page fitting
- Phase 3c (Theme Design) — 5 site themes with content primitives composition architecture
- Phase 3b (Admin UI) — full React admin app rebuild with shadcn/ui
- Phase 3a (Sites & Generator Wiring) — backend pipeline, job postings, site generation, public Nginx
- Phase 2b (Profile & Settings) — profile synthesis, API key management, document parsing
- Vitae rename (2026-04-09) — cross-cutting rename from "Professional Website Builder"

**Phase 4 (End-to-end testing)** is deferred. See `docs/future-work.md` for all deferred items.
```

Delete the entire "Post-rename verification results" section and "Known pre-existing gap: generator not in worker container" section — both resolved.

2. In the "Environment Variables" section, add to the list of key variables:

```
REGISTRATION_ENABLED=     # Public sign-up gate. Prod: false. Dev: true.
```

3. Bump the Python version mention in the tech stack section from `Python 3.12` to `Python 3.13`.

- [ ] **Step 9.3: Verify `.env.example`**

`.env.example` was updated in Task 1 (Step 1.9). Verify the `REGISTRATION_ENABLED` entry is present:

```bash
grep REGISTRATION_ENABLED .env.example
```

Expected: prints the line. If missing, re-add the snippet from Step 1.9.

- [ ] **Step 9.4: Run the full test suite to confirm nothing regressed**

```bash
cd src-api && .venv/bin/python -m pytest -q
cd src-generator && npm test
```

Expected: 233 API tests pass, 14 generator tests pass.

- [ ] **Step 9.5: Commit**

```bash
git -C /Users/joemc3/tmp/vitae add README.md CLAUDE.md
git -C /Users/joemc3/tmp/vitae commit -m "$(cat <<'EOF'
docs: refresh README and CLAUDE.md for Phase 3e-B completion

README's Current Status had been stuck on Phase 2a. Rewrite to reflect
3e-B complete, add Deployment section linking to docs/deployment.md,
update Python version (3.12 → 3.13).

CLAUDE.md: replace the stale "Project renamed to Vitae" / pre-rename
verification / known-gap sections with the current state. Add
REGISTRATION_ENABLED to the env-var docs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final verification

- [ ] **Step F.1: Push to origin**

```bash
git -C /Users/joemc3/tmp/vitae push origin main
```

This will trigger the GitHub Actions workflow for the first time. Expect:
- `build-and-push` job to succeed (images land in GHCR).
- `deploy` job to fail at the SSH step (no `VPS_*` secrets yet, expected).

That's the cue to start the manual bootstrap procedure in `docs/deployment.md` from Step 1.

- [ ] **Step F.2: Bootstrap the VPS**

Follow `docs/deployment.md` § "One-time bootstrap" steps 1–11. The next push to `main` (or a workflow_dispatch re-run) deploys end-to-end.

- [ ] **Step F.3: Verify success**

After the deploy workflow goes green:
- `curl https://app.vitae.2524.cloud/api/health` returns 200
- Admin UI loads at `https://app.vitae.2524.cloud`
- You can log in as the account created via `make create-user`
- Upload a document, synthesize a profile, generate a portfolio site → site is reachable at `https://vitae.2524.cloud`
- Confirm `/api/auth/register` returns 403 (`curl -X POST https://app.vitae.2524.cloud/api/auth/register -H 'Content-Type: application/json' -d '{"email":"x@y.z","password":"abcdefgh"}'`)
- `sudo docker ps` on the VPS shows the original apps (da-rag, ollama, crucix, it-tools, pangolin, gerbil, traefik) still healthy

If anything fails, the troubleshooting section of `docs/deployment.md` is the first stop.
