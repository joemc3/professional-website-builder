# Professional Website Builder — Project Revival Design Spec

**Date:** 2026-03-30
**Status:** Approved
**Scope:** Full project revival — Rust→Python API rewrite, TDD retrofit, Docker cleanup, theme redesign

## Problem Statement

This project is a brownfield codebase for building professional portfolio websites and targeted resumes from a repository of user documents. It was originally a Tauri desktop app, then migrated to a Dockerized web application with a Rust API backend. The migration was never completed — Docker builds don't work, dependencies aren't locked, and the API has never successfully run in containers.

The owner is a 25+ year developer whose current stack is Python, JS, and Dart/Flutter. Rust is not in their wheelhouse, making the existing API unmaintainable without heavy AI assistance for every change.

## Product Vision

Users build a **document repository** over time — uploading resumes, project descriptions, accomplishment summaries, certifications, recommendation letters, and other professional documents. The AI synthesizes a unified professional profile from this corpus and produces three types of output:

1. **Long-lived portfolio site** — a permanent professional presence generated from the full document repository. Optionally auto-updated as new documents are added. Includes a downloadable general resume.
2. **Targeted site** — generated for a specific job posting, pulling the most relevant experience, skills, and accomplishments from the repository to match the role. Accessible at a shareable URL (subdomain or `site.com/<guid>`) so the user can include it in a job application.
3. **Targeted resume PDF** — generated for a specific job posting, downloadable for email attachments. Tailored the same way as the targeted site.

The document repository is the core asset. The sites and resumes are views into it, shaped by context (general vs. targeted to a specific role).

## Goals

1. **Get the project running** — a working `docker compose up` that serves the full application
2. **Replace the Rust API with Python (FastAPI)** — maintainable by the owner, faster to develop
3. **Retrofit TDD** — every new piece of code is test-first, critical paths fully covered
4. **Adopt the superpowers workflow** — brainstorm → spec → plan → TDD → implementation for all future work
5. **Make the themes genuinely gorgeous** — no AI slop, real design quality
6. **Keep documentation accurate at all times** — README.md updated in every phase, same PR as code
7. **Document repository as first-class concept** — users accumulate documents over time, not single-shot uploads

## Non-Goals

- SaaS / multi-tenant at scale (this is an open-source portfolio tool)
- Mobile app
- Real-time collaboration
- Payment processing
- ATS optimization or job board integration

## Architecture

### Service Topology

Four Docker Compose services, same as the existing design:

```
Frontend (Nginx + React) → API (Python + FastAPI) → PostgreSQL
                                    │
                                    │ spawns
                                    ▼
                          Generator (Next.js → static site)
```

### What Changes

| Component | Old (Rust) | New (Python) |
|-----------|-----------|--------------|
| HTTP framework | Axum | FastAPI + Uvicorn |
| Database driver | SQLx (compile-time macros) | SQLAlchemy async + Alembic |
| Document parsing | comrak, pdf-extract, zip+quick-xml | python-docx, PyPDF2/pymupdf, openpyxl, python-pptx, markdown |
| LLM HTTP client | reqwest | httpx (async) |
| Auth | Manual JWT + bcrypt | python-jose + passlib |
| Encryption | Manual AES-256-GCM | cryptography library |
| Package manager | cargo (no lock file committed) | uv (lock file committed) |
| Dockerfile | Multi-stage Rust compilation | Single-stage python:3.12-slim |

### What Stays The Same

- **React frontend** (src-ui/) — same SPA, same API contract
- **Next.js generator** (src-generator/) — same theme structure, same static site output
- **PostgreSQL schema** — same tables (users, documents, portfolios, api_keys, sessions)
- **REST API contract** — same endpoints, same request/response shapes
- **Portfolio JSON schema** — the data structure spec is unchanged
- **Docker Compose orchestration** — same 4-service architecture

### What Gets Deleted

- `src-tauri/` — deprecated desktop app code (deleted in Phase 1)
- `src-api/` (Rust) — replaced entirely by new Python `src-api/` (deleted in Phase 1)
- Existing 5 themes (onyx, quartz, serene, jade, coral) — replaced with 3 new themes in Phase 3

## Python API Design

### Project Structure

```
src-api/
├── app/
│   ├── main.py              # FastAPI app, middleware, startup
│   ├── config.py             # Settings via pydantic-settings
│   ├── database.py           # SQLAlchemy async engine + session
│   ├── models/               # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── document.py
│   │   ├── profile.py
│   │   ├── site.py
│   │   ├── job_posting.py
│   │   ├── resume.py
│   │   └── api_key.py
│   ├── routers/              # Endpoint groups (one file per resource)
│   │   ├── auth.py
│   │   ├── documents.py
│   │   ├── profile.py
│   │   ├── sites.py
│   │   ├── resumes.py
│   │   ├── job_postings.py
│   │   └── settings.py
│   ├── services/             # Business logic (testable without HTTP)
│   │   ├── auth_service.py
│   │   ├── document_parser.py
│   │   ├── llm_client.py
│   │   ├── profile_synthesizer.py   # Synthesize profile from document corpus
│   │   ├── resume_generator.py      # Generate PDF resumes (general + targeted)
│   │   ├── encryption.py
│   │   └── site_generator.py
│   ├── middleware/            # Auth middleware, rate limiting
│   └── schemas/              # Pydantic request/response models
├── migrations/               # Alembic
├── tests/
├── Dockerfile
├── pyproject.toml
└── uv.lock
```

### Key Design Decisions

**Services layer:** Business logic lives in `services/`, not in route handlers. Route handlers validate input, call a service, and format the response. This makes TDD practical — services are testable without HTTP.

**Pydantic schemas:** Request/response validation via Pydantic models in `schemas/`. FastAPI generates OpenAPI docs automatically from these.

**uv for package management:** Fast, deterministic lock files. Solves the missing lock file problem that plagued the Rust build.

**SQLAlchemy async + Alembic:** No compile-time SQL magic. Alembic handles migrations properly — versioned, reversible, and explicit.

### REST API Endpoints

**Authentication** (Public):
- `POST /api/auth/register` — User registration
- `POST /api/auth/login` — Login (returns JWT)
- `POST /api/auth/logout` — Logout

**Document Repository** (Protected):
- `POST /api/documents` — Upload and parse one or more documents (multipart)
- `GET /api/documents` — List all documents in repository
- `GET /api/documents/:id` — Get document details and parsed text
- `DELETE /api/documents/:id` — Remove document from repository

**Profile Synthesis** (Protected):
- `POST /api/profile/synthesize` — (Re)generate unified profile from all documents via LLM
- `GET /api/profile` — Get current synthesized profile
- `PUT /api/profile` — Manually edit synthesized profile (user curation)

**Sites** (Protected):
- `POST /api/sites/portfolio` — Generate long-lived portfolio site from profile
- `POST /api/sites/targeted` — Generate targeted site for a job posting (accepts job posting data)
- `GET /api/sites` — List all generated sites (portfolio + targeted)
- `GET /api/sites/:slug` — Get site details
- `DELETE /api/sites/:slug` — Remove a targeted site

**Resumes** (Protected):
- `POST /api/resumes/general` — Generate general resume PDF from profile
- `POST /api/resumes/targeted` — Generate targeted resume PDF for a job posting
- `GET /api/resumes` — List all generated resumes
- `GET /api/resumes/:id/download` — Download resume PDF

**Job Postings** (Protected):
- `POST /api/job-postings` — Save a job posting for targeting
- `GET /api/job-postings` — List saved job postings
- `DELETE /api/job-postings/:id` — Remove a job posting

**Settings** (Protected):
- `POST /api/settings/api-keys` — Save encrypted API key
- `GET /api/settings/api-keys/:provider` — Get API key
- `DELETE /api/settings/api-keys/:provider` — Delete key
- `POST /api/settings/test-connection` — Test LLM connection

**Public Site Serving:**
- `GET /s/:slug` — Serve a generated site (portfolio or targeted) — public, no auth

**Utility:**
- `GET /health` — Health check

### Document Parsing

Python libraries for each supported format:

| Format | Library | Notes |
|--------|---------|-------|
| .md | `markdown` | Markdown → plain text extraction |
| .docx | `python-docx` | Paragraph and table extraction |
| .pdf | `pymupdf` (fitz) | Better extraction than PyPDF2 |
| .xlsx | `openpyxl` | Cell content extraction |
| .pptx | `python-pptx` | Slide text extraction |

### LLM Integration

5 providers, same prompt strategy (request JSON matching the Data Structure Specification):

- **Anthropic Claude** — via `anthropic` Python SDK
- **OpenAI GPT** — via `openai` Python SDK
- **Google Gemini** — via `google-generativeai` SDK
- **OpenRouter** — via `httpx` to OpenRouter API (OpenAI-compatible endpoint, supports hundreds of models)
- **Ollama (local or remote)** — via `httpx` to configurable endpoint (supports both `http://localhost:11434` and remote network addresses like `http://ollama.lan:11434`)

OpenRouter uses an OpenAI-compatible API, so the implementation can share the same request/response handling as the OpenAI provider with a different base URL and API key. The user selects a specific model from OpenRouter's catalog via the UI.

Ollama is configured via `OLLAMA_URL` which defaults to `http://localhost:11434` but can point to any network-accessible Ollama instance. LM Studio uses the same OpenAI-compatible protocol and can be reached the same way.

60-second timeout. One retry on malformed responses. Clear error messages for API failures, rate limits, and invalid keys.

### Authentication & Security

- JWT tokens (24-hour expiration) via `python-jose`
- bcrypt password hashing (cost 10) via `passlib`
- AES-256-GCM encryption for API keys via `cryptography`
- CORS protection (configurable origins)
- SQL injection prevention (SQLAlchemy parameterized queries)

## Testing Strategy

### Philosophy

Every new piece of code is written test-first (TDD). For existing logic being ported (document parsing, LLM client), write characterization tests first to lock expected behavior, then implement.

### Test Structure

```
src-api/tests/
├── unit/                    # Fast, no external deps
│   ├── test_document_parser.py
│   ├── test_llm_client.py
│   ├── test_encryption.py
│   ├── test_auth_service.py
│   └── test_site_generator.py
├── integration/             # Needs PostgreSQL (via testcontainers)
│   ├── test_auth_flow.py
│   ├── test_file_upload.py
│   ├── test_portfolio_crud.py
│   └── test_api_keys.py
├── e2e/                     # Full stack (all services running)
│   └── test_full_pipeline.py
├── fixtures/                # Sample .docx, .pdf, .md files
└── conftest.py              # Shared fixtures, test DB setup
```

### Testing Tools

- **pytest** + **pytest-asyncio** for async support
- **httpx** `AsyncClient` for testing FastAPI endpoints directly (no server needed)
- **testcontainers-python** for spinning up PostgreSQL in integration tests
- **Factory Boy** for test data generation

### Test Tiers

| Tier | Scope | Speed | When to Run |
|------|-------|-------|-------------|
| Unit | Services, parsers, business logic | <5s | Every change |
| Integration | Database operations, API endpoints | <30s | Before commit |
| E2E | Full pipeline across all services | <2min | Before merge/deploy |

### Coverage Approach

Cover critical paths (auth, document parsing, LLM response handling, encryption), not a coverage percentage target. Test what would hurt if it broke.

### Frontend Tests

Add Vitest to `src-ui/` for component testing. Not the priority for Phase 1, but infrastructure should be in place.

## Docker & Deployment

### Single Compose File with Profiles

One `docker-compose.yml` with `dev` and `prod` profiles instead of separate files. Eliminates drift between configurations.

### Development Profile

```bash
docker compose --profile dev up
```

- All ports exposed to host (frontend :5173, API :8000, PostgreSQL :5432, generator :3000)
- Hot reload on API (Uvicorn `--reload`) and frontend (Vite)
- Volume mounts for live code editing
- Debug logging (`LOG_LEVEL=debug`)

### Production Profile

```bash
docker compose --profile prod up -d
```

- Zero exposed ports — all services communicate on internal Docker network
- Joins external network (e.g. `pangolin_net`) for Traefik routing
- Traefik labels on frontend service for HTTPS routing
- Health checks on all services (`/health` endpoints)
- Production logging (`LOG_LEVEL=warning`)
- PostgreSQL data on persistent volume

### Python API Dockerfile

Simple single-stage build:

```dockerfile
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY app/ app/
COPY migrations/ migrations/
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

No multi-stage Rust compilation. No shared library debugging. No diagnostic echo commands.

### Health Checks

Every service exposes a health endpoint:
- **API:** `GET /health` — checks DB connectivity
- **Frontend:** Nginx returns 200 on `/`
- **Generator:** `GET /api/health` (Next.js API route)
- **PostgreSQL:** `pg_isready`

Required for `depends_on: condition: service_healthy` and for Traefik routing.

## Theme System

### Approach

Scrap the existing 5 AI-generated themes. Design 3 new themes from scratch, each with a distinct personality. Themes must look like a human designer made them — no purple gradients, no generic AI aesthetic.

### Design Principles

- Restrained color palettes (2-3 colors max)
- Strong typography (one display font, one body font, from Google Fonts)
- Intentional whitespace
- Mobile-first responsive
- Real content in previews, not lorem ipsum

### Three Themes

1. **Minimal / Editorial** — generous whitespace, serif typography, content-forward. Inspiration: magazine profiles, NYT feature pages.
2. **Modern Professional** — clean sans-serif, subtle color accents, structured sections. Inspiration: well-designed alternatives to LinkedIn profiles.
3. **Bold / Creative** — stronger visual identity, more layout variety, for designers and creatives. Inspiration: Awwwards portfolio winners.

Each theme gets its own brainstorm → spec → implementation cycle when we reach Phase 3. The visual companion will be used to iterate on specific designs.

### Theme Structure (Unchanged)

```
src-generator/app/themes/[theme-name]/
├── page.tsx              # Next.js page component
├── theme.config.json     # Metadata
├── components/           # Theme-specific components
├── styles/               # Theme CSS/Tailwind
└── thumbnail.png         # 400x300 preview
```

### Resume PDF Generation

Each theme provides a resume template. Python generates a matching PDF server-side using WeasyPrint (HTML/CSS → PDF). Two flavors:

- **General resume** — generated from the full synthesized profile, downloadable from the portfolio site
- **Targeted resume** — generated for a specific job posting, pulling the most relevant content from the profile and tailoring emphasis/language to match the role

### Site Types

Each theme supports two modes:

- **Portfolio mode** — long-lived site showing the full professional profile. Permanent URL. Optionally auto-regenerated when the profile is updated.
- **Targeted mode** — focused site generated for a specific job posting. Shareable URL at `/s/<slug>`. Emphasizes experience and skills relevant to the role. Can optionally expire.

## Implementation Phases

Each phase gets its own implementation plan via the superpowers writing-plans workflow. Documentation (README.md, CLAUDE.md) is updated in the same phase and same PR as the code it describes.

### Phase 1: Foundation (Get It Running)

**Goal:** Working `docker compose --profile dev up` with Python API serving health check and auth endpoints.

- Switch to `main` branch, create a new feature branch
- Delete `src-tauri/` (deprecated desktop code) and commit
- Delete old Rust `src-api/` code and commit (separate commit from scaffold so git history is clean)
- Scaffold new Python `src-api/` with FastAPI + uv in the now-empty `src-api/` directory
- Set up SQLAlchemy + Alembic with PostgreSQL schema
- Implement auth endpoints (register, login, logout) — TDD
- Implement health check endpoint
- Write `docker-compose.yml` with dev profile
- Clean up stale documentation files (CONVERSION_SUMMARY.md, WEB_CONVERSION_COMPLETE.md, DOCKER_MIGRATION_COMPLETE.md, RUST_API_IMPLEMENTATION_NOTES.md, IMPLEMENTATION_SUMMARY.md, DEVELOPMENT.md)
- Update README.md and CLAUDE.md to reflect new Python architecture
- Update .gitignore for Python patterns (__pycache__, .venv, etc.)

### Phase 2: Document Repository & AI Pipeline

**Goal:** Users can upload documents, build a repository, and synthesize a unified professional profile.

- Document parsing for all 5 formats — TDD
- Document repository CRUD endpoints — TDD
- LLM client for all 5 providers (Anthropic, OpenAI, Gemini, OpenRouter, Ollama) — TDD
- Profile synthesis from document corpus — TDD
- Profile editing/curation endpoints — TDD
- API key encryption/storage — TDD
- Integration tests with testcontainers
- Update README.md with current capabilities

### Phase 3: Sites & Resumes (The Payoff)

**Goal:** Generate gorgeous portfolio sites, targeted sites for job postings, and downloadable resumes.

- Wire Next.js generator to Python API
- Brainstorm and design 3 new themes (separate design cycle with visual companion)
- Implement themes
- Long-lived portfolio site generation from synthesized profile
- Job posting ingestion and targeted site generation
- Shareable site URLs (`/s/:slug`) — public serving without auth
- Resume PDF generation via WeasyPrint (general + targeted)
- E2E tests for full pipeline
- Update README.md with theme and site documentation

### Phase 4: Production Ready

**Goal:** Deployable to VPS behind Pangolin/Traefik.

- Production Docker profile (Traefik labels, external network, no ports)
- CI pipeline (GitHub Actions: lint, test, build)
- Frontend tests (Vitest)
- Final README.md polish with deployment instructions

## Environment Variables

Required in `.env`:
- `POSTGRES_PASSWORD` — Database password
- `SECRET_KEY` — AES encryption key (32+ characters)
- `JWT_SECRET` — JWT signing key (32+ characters)

Optional:
- `ANTHROPIC_API_KEY` — For Claude AI
- `OPENAI_API_KEY` — For GPT AI
- `GEMINI_API_KEY` — For Gemini AI
- `OPENROUTER_API_KEY` — For OpenRouter (access to hundreds of models)
- `OLLAMA_URL` — For Ollama (default: `http://localhost:11434`, set to remote address for network Ollama instances)
- `CORS_ORIGINS` — Allowed origins (comma-separated)
- `LOG_LEVEL` — Logging level (debug/info/warning/error)

## Database Schema

Expanded from existing design to support the document repository and targeted outputs. All tables use UUID primary keys and automatic timestamps.

### Core Tables

- `users` — id, email, password_hash, created_at, updated_at
- `sessions` — id, user_id, token, expires_at, created_at
- `api_keys` — id, user_id, provider, encrypted_key, nonce, created_at

### Document Repository

- `documents` — id, user_id, filename, content_type, parsed_text, uploaded_at, updated_at
  - Documents are persistent — users accumulate them over time
  - `parsed_text` stores the extracted content for AI synthesis

### Synthesized Profile

- `profiles` — id, user_id, data (JSONB), generated_at, updated_at
  - The unified professional profile synthesized from all documents
  - Regenerated when documents are added/removed (optionally automatic)
  - This is what powers the long-lived portfolio site

### Sites & Resumes

- `sites` — id, user_id, profile_id, slug (unique), theme, type (enum: 'portfolio' | 'targeted'), job_posting_id (nullable), generated_at, expires_at (nullable)
  - `slug` is the shareable URL path (e.g. `site.com/<slug>`)
  - Portfolio sites have no expiration; targeted sites can optionally expire
- `job_postings` — id, user_id, title, company, description, url (nullable), created_at
  - Stores the job posting that a targeted site/resume was generated against
- `resumes` — id, user_id, job_posting_id (nullable), format (enum: 'pdf'), data (JSONB), generated_at
  - General resume (job_posting_id null) or targeted resume (linked to a posting)

## Open Questions

None — all design decisions have been validated with the user.
