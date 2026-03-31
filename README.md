# Professional Website Builder

Upload your professional documents, get a gorgeous portfolio website and targeted resumes.

## Concept

Professional Website Builder uses a **document repository model**: you upload many documents over time — resumes, project write-ups, certifications, bios, anything — and AI synthesizes them into a unified professional profile. From that profile the app can generate:

- **Portfolio sites** — a long-lived personal site that serves as your permanent professional presence
- **Targeted sites** — custom sites tuned for a specific job posting, shareable as a URL
- **Targeted resumes** — PDFs tailored to a specific role, ready to attach to an email

### Two Surfaces

**Public sites** are served separately from the admin app — no login prompt, no nav bar, just gorgeous content at a clean URL.

**Admin app** is where you manage your document repository, run AI synthesis, and kick off site and resume generation.

## Tech Stack

| Layer | Technology |
|-------|------------|
| API | Python 3.12 / FastAPI |
| Admin app | React 18 / Vite |
| Site generator | Next.js 14 |
| Database | PostgreSQL 16 |
| Background jobs | Redis + ARQ |
| Deployment | Docker Compose |

## Document Repository

The core workflow: upload documents, let the system parse and index them, then generate professional outputs.

Supported formats: Markdown, Word (.docx), PDF, Excel (.xlsx), PowerPoint (.pptx).

Uploads return immediately with a job ID. Parsing runs in the background via ARQ + Redis — poll the document endpoint to check status.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your settings
docker compose --profile dev up --build
```

This starts the API, PostgreSQL, Redis, and the ARQ background worker.

- Admin app: http://localhost:5173
- API: http://localhost:8000
- API docs: http://localhost:8000/docs

## Project Structure

```
├── src-api/          # Python API (FastAPI)
├── src-ui/           # React admin app (Vite)
├── src-generator/    # Next.js site generator
├── docs/             # Design specs and plans
└── docker-compose.yml
```

## Development

### Running Tests

```bash
cd src-api
uv run pytest tests/unit/ -v           # Unit tests
uv run pytest tests/integration/ -v    # Integration tests (needs Docker)
```

## Environment Variables

Copy `.env.example` and fill in the required values. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SECRET_KEY` | Yes | App secret key (32+ characters) |
| `JWT_SECRET` | Yes | JWT signing key (32+ characters) |
| `ANTHROPIC_API_KEY` | No | For Claude AI synthesis |
| `OPENAI_API_KEY` | No | For GPT AI synthesis |

See `.env.example` for the full list.

## Current Status

**Phase 2a is complete**: document repository — upload, parse (5 formats), background processing via ARQ + Redis, API key management with AES-256-GCM encryption.

Phase 2b is next: LiteLLM integration and profile synthesis. See `docs/` for the full design spec.

## Roadmap

- Phase 1: Foundation (complete)
- Phase 2a: Document Repository & Parsing (complete)
- Phase 2b: LiteLLM & Profile Synthesis
- Phase 3: Sites & Resumes
- Phase 4: Production Ready

## License

MIT
