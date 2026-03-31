# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **containerized web application** for generating professional portfolio websites and targeted resumes from a user's document repository. Built with **Python** (FastAPI backend) + **React** (admin UI) + **Next.js** (site generation) + **PostgreSQL**, deployed via Docker Compose.

**Architecture**: 5 services in production — PostgreSQL, Python API, Admin App (Nginx + React), Next.js Generator, Public Sites (Nginx static).

## Product Model

Users build a **document repository** over time — uploading resumes, project descriptions, accomplishment summaries, certifications, and other professional documents. AI synthesizes a unified professional profile from this corpus and produces three output types:

1. **Portfolio site** — a long-lived public presence generated from the full document repository
2. **Targeted site** — generated for a specific job posting, shareable via URL (e.g. `resume.joe.com/abc123`)
3. **Targeted resume PDF** — generated for a specific job posting, downloadable for applications

The document repository is the core asset. Sites and resumes are views into it.

### Two Separate Surfaces

- **Public sites** — static HTML served by Nginx. No login, no admin links, no CMS hints. Just clean portfolio content.
- **Admin app** — React SPA for document management, profile editing, and site generation. Separate subdomain.

## Architecture

```
Admin App (Nginx + React)  →  API (Python/FastAPI)  →  PostgreSQL
   app.domain.com                      │
                                       │ spawns
                                       ▼
                             Generator (Next.js)
                                       │
                                       ▼
                             Static output files
                                       │
Public Sites (Nginx)  ←── serves ────┘
   domain.com
```

## Monorepo Structure

```
/professional-website-builder/
├── src-api/          # Python REST API (FastAPI + SQLAlchemy + Alembic)
│   ├── app/
│   │   ├── main.py           # FastAPI app, middleware, startup lifespan
│   │   ├── config.py         # Settings via pydantic-settings
│   │   ├── database.py       # SQLAlchemy async engine + session factory
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── routers/          # Endpoint groups (one file per resource)
│   │   ├── services/         # Business logic (testable without HTTP)
│   │   ├── middleware/       # Auth middleware
│   │   └── schemas/          # Pydantic request/response models
│   ├── migrations/           # Alembic migrations
│   ├── tests/
│   │   ├── unit/             # Fast, no external dependencies
│   │   └── integration/      # Uses testcontainers (real PostgreSQL)
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── uv.lock
├── src-ui/           # React admin frontend (Vite + TypeScript)
├── src-generator/    # Next.js site/theme generator
├── docs/superpowers/ # Design specs and implementation plans
│   ├── specs/        # Approved specs (brainstorm → spec phase output)
│   └── plans/        # Implementation plans (plan phase output)
└── docker-compose.yml
```

## Tech Stack

- **API**: Python 3.12, FastAPI, Uvicorn, SQLAlchemy 2.0 (async), Alembic, Pydantic v2
- **Package management**: `uv` with committed `uv.lock`
- **Auth**: JWT (`python-jose`) + bcrypt
- **Database**: PostgreSQL 16 with `asyncpg`
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Generator**: Next.js 14
- **Containers**: Docker Compose with profiles (`dev`)

## Common Commands

```bash
# Docker (recommended for full-stack dev)
docker compose --profile dev up --build    # Start dev environment
docker compose --profile dev down          # Stop

# API — local development
cd src-api
uv run uvicorn app.main:app --reload      # Run API (port 8000)
uv run pytest tests/unit/ -v              # Unit tests (fast, no Docker needed)
uv run pytest tests/integration/ -v       # Integration tests (needs Docker for PostgreSQL)
uv run alembic upgrade head               # Run migrations

# Worker — local development
cd src-api
uv run arq app.worker.WorkerSettings        # Run ARQ worker

# Frontend — local development
cd src-ui
npm install && npm run dev                # Run admin app (port 5173)
npm run build                             # Production build
npm run lint                              # Lint
```

## REST API Endpoints

### Currently Implemented

- `GET /health` — Health check with database connectivity
- `POST /api/auth/register` — User registration (returns JWT)
- `POST /api/auth/login` — Login (returns JWT)
- `POST /api/auth/logout` — Logout (JWT required)
- `GET /api/auth/me` — Get current user info (JWT required)
- `POST /api/documents` — Upload documents (multipart, returns processing status)
- `GET /api/documents` — List all documents (optional status filter)
- `GET /api/documents/:id` — Get document details and parsed text
- `DELETE /api/documents/:id` — Remove document and file
- `POST /api/settings/api-keys` — Save encrypted API key
- `GET /api/settings/api-keys/:provider` — Check if API key is set
- `DELETE /api/settings/api-keys/:provider` — Delete API key
- `POST /api/settings/test-connection` — Test LLM provider connectivity

### Planned (Phase 2b+)

**Profile Synthesis** (protected):
- `POST /api/profile/synthesize` — (Re)generate unified profile from all documents via LLM
- `GET /api/profile` — Get current synthesized profile
- `PUT /api/profile` — Manually edit synthesized profile

**Sites** (protected):
- `POST /api/sites/portfolio` — Generate portfolio site from profile
- `POST /api/sites/targeted` — Generate targeted site for a job posting
- `GET /api/sites` — List all generated sites
- `GET /api/sites/:slug` — Get site details
- `DELETE /api/sites/:slug` — Remove a targeted site

**Resumes** (protected):
- `POST /api/resumes/general` — Generate general resume PDF
- `POST /api/resumes/targeted` — Generate targeted resume PDF for a job posting
- `GET /api/resumes` — List all generated resumes
- `GET /api/resumes/:id/download` — Download resume PDF

**Job Postings** (protected):
- `POST /api/job-postings` — Save a job posting for targeting
- `GET /api/job-postings` — List saved job postings
- `DELETE /api/job-postings/:id` — Remove a job posting

## Database

- Schema managed by Alembic migrations in `src-api/migrations/versions/`
- Migrations run automatically on API startup (via `alembic upgrade head` in the lifespan hook)
- **Current tables**: `users`, `documents`, `api_keys`
- **Planned tables**: `profiles`, `sites`, `job_postings`, `resumes`

All tables use UUID primary keys and automatic timestamps.

To create a new migration:
```bash
cd src-api
uv run alembic revision --autogenerate -m "description"
```

## Authentication Flow

1. User registers via `POST /api/auth/register` (email + password)
2. Password hashed with bcrypt and stored in PostgreSQL
3. User logs in via `POST /api/auth/login`
4. Server returns JWT token (24-hour expiration)
5. Frontend stores token in localStorage
6. Protected endpoints require `Authorization: Bearer <token>` header
7. `get_current_user` dependency validates JWT on each request

## Environment Variables

See `.env.example` for the full list. Key variables:

```
# Required
POSTGRES_PASSWORD=        # Database password
SECRET_KEY=               # Encryption key (32+ chars)
JWT_SECRET=               # JWT signing key (32+ chars)

# URLs (for CORS and link generation)
SITE_URL=                 # Public sites base URL (e.g. https://resume.joe.com)
ADMIN_URL=                # Admin app base URL (e.g. https://app.resume.joe.com)

# LLM providers (all optional)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
OLLAMA_URL=               # Default: http://localhost:11434
```

## Testing

- **Framework**: pytest + pytest-asyncio
- **Unit tests**: `tests/unit/` — fast, no external dependencies
- **Integration tests**: `tests/integration/` — uses `testcontainers` (spins up real PostgreSQL)
- **TDD is mandatory**: write failing test → implement → verify passing → commit

```bash
# Run unit tests (fast)
cd src-api && uv run pytest tests/unit/ -v

# Run integration tests (needs Docker)
cd src-api && uv run pytest tests/integration/ -v

# Run all tests
cd src-api && uv run pytest -v
```

## Development Workflow (superpowers)

This project uses the **superpowers workflow** for all non-trivial work:

1. **Brainstorm** — explore the problem space and user intent
2. **Spec** — write a design document in `docs/superpowers/specs/`
3. **Plan** — write a step-by-step implementation plan in `docs/superpowers/plans/`
4. **TDD** — write failing tests
5. **Implement** — make tests pass
6. **Review** — verify correctness before declaring done

Current design spec: `docs/superpowers/specs/2026-03-30-project-revival-design.md`

## Current Phase

**Phase 2a (Document Pipeline) is complete.** Includes:
- Document upload and storage (local filesystem)
- Document parsing (5 formats: .md, .docx, .pdf, .xlsx, .pptx)
- Background job processing via ARQ + Redis
- API key encryption (AES-256-GCM) and management
- Docker Compose with Redis and Worker services

**Phase 2b** is next: LiteLLM integration, profile synthesis via SSE, profile editing.

See `docs/superpowers/specs/2026-03-30-project-revival-design.md` for the full phase plan.

## CRITICAL NOTES

### Security: .gitignore Maintenance

**Always check and update `.gitignore` when adding new frameworks, libraries, or components.** Ensure:
- `.env`, `.env.local` and similar are excluded
- API keys and secrets are never committed
- Framework artifacts excluded (`.next/`, `__pycache__/`, `node_modules/`, etc.)
- Docker runtime artifacts excluded (`docker-volumes/`, `postgres-data/`, etc.)

### Never Commit Secrets

- Never commit `.env`
- Parameterized queries only — SQLAlchemy handles this automatically
- Encryption keys must be randomly generated (see `.env.example` instructions)

### Agent Usage for Complex Tasks

When working on multi-step or specialized tasks, create agents with specific expertise. Use the Task tool with appropriate subagent types. Launch agents proactively, in parallel when tasks are independent.

## Troubleshooting

```bash
# View all service logs
docker compose --profile dev logs -f

# Check specific service
docker compose --profile dev logs api-dev

# Check API health
curl http://localhost:8000/health

# Access database shell
docker compose --profile dev exec postgres-dev psql -U pwbuser professional_website_builder

# Rebuild without cache
docker compose --profile dev build --no-cache
```
