# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **containerized web application** for generating professional portfolio websites from user documents (resumes, PDFs, etc.). Built with **Rust** (REST API backend) + **React** (web UI) + **Next.js** (website generation) and deployed via **Docker**.

**Architecture**: Microservices with Docker orchestration (4 services: PostgreSQL, Rust API, React Frontend, Next.js Generator)

> **Note**: This project was originally a Tauri desktop application and has been completely migrated to a web-based architecture. The desktop version still exists in `src-tauri/` but is deprecated.

## Documentation

### Primary Documentation

- **DOCKER.md** - Complete Docker deployment guide (15+ pages)
- **DOCKER_QUICKSTART.md** - Quick reference for Docker operations
- **DOCKER_MIGRATION_COMPLETE.md** - Architecture overview and migration details
- **src-api/README.md** - REST API documentation
- **src-ui/README.md** - Frontend documentation

### Original Specifications

Located in `project_standards/`:
- **Data Structure Specification.md** - Complete JSON schema for portfolio data
- **Technical Specification.md** - Architecture, tech stack, API contracts
- **Product Requirements Document (PRD) - Professional Website Builder.md** - Features, target audience, error handling
- **UI_UX Design Document.md** - Screen layouts, user flows, mockups
- **IMPLEMENTATION_PLAN.md** - Phased development roadmap (COMPLETED)

## CRITICAL NOTES

### Security: .gitignore Maintenance

**ALWAYS check and update `.gitignore` when adding new frameworks, libraries, or components.** Ensure that:
- Environment files (`.env`, `.env.local`, etc.) are excluded
- API keys and secrets are never committed
- Cloud provider configuration files are excluded
- Framework-specific ignore patterns are added (e.g., `.next/`, `target/`, `node_modules/`)
- Docker runtime artifacts excluded (`docker-volumes/`, `postgres-data/`, etc.)

Review `.gitignore` before every commit that adds new dependencies or configuration.

### Agent Usage for Complex Tasks

**When working on multi-step or specialized tasks, ALWAYS create agents with specific expertise for those tasks.** Use the Task tool with appropriate subagent types:
- Launch agents proactively for complex implementations
- Provide agents with detailed context about what needs to be accomplished
- Use multiple agents in parallel when tasks are independent
- Ensure agents have the right expertise (e.g., Rust for backend, React for UI, Next.js for generator)

This improves code quality, reduces errors, and leverages specialized knowledge for each component of the system.

## Architecture

### Monorepo Structure

```
/professional-website-builder/
├── src-api/                # Rust REST API backend (Axum + PostgreSQL)
├── src-ui/                 # React web frontend (browser-based)
├── src-generator/          # Next.js (website theme generation)
├── src-tauri/              # Legacy desktop app (DEPRECATED)
├── docker-compose.yml      # Production orchestration
├── docker-compose.dev.yml  # Development configuration
└── init-db.sql            # PostgreSQL schema
```

### Services Architecture

```
Frontend (Nginx + React) ──▶ Backend API (Rust + Axum) ──▶ PostgreSQL
                                        │
                                        │ spawns
                                        ▼
                              Next.js Generator (themes)
```

### Three-Tier Processing Model

The application supports three processing modes for converting documents to website content:

1. **Tier 1 (Manual)**: User manually fills forms from extracted text
2. **Tier 2 (Cloud AI)**: Cloud LLM APIs (Anthropic/OpenAI/Gemini) auto-generate JSON from documents
3. **Tier 3 (Local AI)**: Local LLM (Ollama/LM Studio) auto-generate JSON from documents

### Data Flow (Web Application)

1. **User Registration/Login**: Browser → `/api/auth/register` or `/api/auth/login` → JWT token
2. **File Upload**: Browser → FormData → `/api/files/ingest` → Parse → PostgreSQL
3. **Content Processing**:
   - Tier 1: Raw text → Manual editing in React UI
   - Tier 2/3: Raw text → `/api/ai/generate` → LLM API → validated JSON → React UI (review mode)
4. **Website Generation**: Approved JSON → `/api/generate/website` → Rust spawns Next.js → static site output

### Core Data Structure

All portfolio data follows a strict JSON schema defined in `project_standards/Data Structure Specification.md`:
- `profile`: Name, title, summary
- `contact`: Email, phone, social links
- `workExperience[]`: Company, title, dates, responsibilities
- `projects[]`: Name, description, technologies, URL
- `education[]`: Institution, degree, field, dates
- `skills[]`: Categories with items
- `theme`: Selected theme name and options

### REST API Endpoints

The React frontend communicates with Rust backend via HTTP REST API:

**Authentication** (Public):
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Login (returns JWT)
- `POST /api/auth/logout` - Logout

**Files** (Protected):
- `POST /api/files/ingest` - Upload and parse documents (multipart)
- `GET /api/files/aggregated-text` - Retrieve parsed text

**AI Processing** (Protected):
- `POST /api/ai/generate` - Generate portfolio JSON via LLM

**Website Generation** (Protected):
- `POST /api/generate/website` - Build static site

**Settings** (Protected):
- `POST /api/settings/api-keys` - Save encrypted API key
- `GET /api/settings/api-keys/:provider` - Get API key
- `DELETE /api/settings/api-keys/:provider` - Delete key
- `POST /api/settings/test-connection` - Test LLM connection

**Utility**:
- `GET /health` - Health check

### Database Schema

**PostgreSQL Tables**:
- `users` - User accounts (id, email, password_hash)
- `sessions` - JWT session tracking
- `api_keys` - Encrypted LLM API keys (AES-256-GCM)
- `documents` - Uploaded files and parsed text
- `portfolios` - Generated portfolio data (JSONB)

All tables use UUID primary keys and automatic timestamps.

### Document Processing

Rust backend (`src-api/src/document_parser.rs`) handles:
- `.md` files: Using `comrak`
- `.docx` files: Office Open XML parsing via `zip` + `quick-xml`
- `.pdf` files: Using `pdf-extract`
- `.xlsx`, `.pptx`: Office Open XML parsing

All parsing logic ported from original Tauri implementation.

### Theme System

Each theme in `src-generator/app/themes/[theme-name]/`:
- `page.tsx`: Next.js page component
- `theme.config.json`: Metadata (name, thumbnail path)
- `components/`: Theme-specific React components
- `thumbnail.png`: 400x300 preview image

Themes: **onyx** (dark), **quartz** (light), **serene** (soft), **jade** (nature), **coral** (vibrant)

### Security & Authentication

**Web Application (Current)**:
- JWT tokens (24-hour expiration)
- bcrypt password hashing (cost 10)
- AES-256-GCM encryption for API keys in PostgreSQL
- CORS protection (configurable origins)
- Rate limiting (10 req/s via Nginx)
- SQL injection prevention (SQLx parameterized queries)
- HTTPS-ready with reverse proxy support

**Desktop App (Deprecated)**:
- OS-native secret managers (macOS Keychain, Windows Credential Manager)
- `tauri-plugin-keychain` (no longer used)

## Development Prerequisites

### For Docker Deployment (Recommended)

- **Docker**: 24.0+
- **Docker Compose**: 2.0+
- 4GB+ RAM
- 10GB+ disk space

### For Local Development (without Docker)

- **Node.js**: v20.x+
- **npm**: v10.x+
- **Rust**: v1.75.x+ (via rustup)
- **PostgreSQL**: 16+ (for API development)

### For Legacy Desktop App (Deprecated)

- All of the above plus:
- **Tauri CLI**: `cargo install tauri-cli`
- Platform-specific dependencies: https://tauri.app/v1/guides/getting-started/prerequisites

## Common Commands

### Docker Deployment

```bash
# Verify setup
./verify-docker-setup.sh

# Build images
./docker-build.sh

# Start services (production)
./docker-run.sh

# Start services (development with hot reload)
./docker-run.sh --dev

# View logs
docker compose logs -f

# Stop services
docker compose down

# Run E2E tests
./test-e2e.sh
```

### Local Development (API)

```bash
# Navigate to API
cd src-api

# Build
cargo build

# Run tests
cargo test

# Run server
cargo run

# Lint
cargo clippy
```

### Local Development (Frontend)

```bash
# Navigate to UI
cd src-ui

# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

### Local Development (Generator)

```bash
# Navigate to generator
cd src-generator

# Install dependencies
npm install

# Run dev server
npm run dev

# Build
npm run build
```

### Legacy Desktop App (Deprecated)

```bash
# Install dependencies (monorepo)
npm install

# Run Tauri dev server (hot reload)
npm run tauri dev

# Build desktop app
npm run tauri build
```

## Important Implementation Notes

### LLM Integration

Located in `src-api/src/llm_client.rs`:
- All LLM prompts must request JSON output matching the Data Structure Specification
- Supports 4 providers: Anthropic Claude, OpenAI GPT, Google Gemini, Local (Ollama/LM Studio)
- Validation layer checks LLM JSON responses before returning to frontend
- Handle malformed responses with retry logic (max 1 retry)
- Display clear error messages for API failures, rate limits, invalid keys
- 60-second timeout on all LLM requests

### Authentication Flow

1. User registers via `/api/auth/register` (email + password)
2. Password hashed with bcrypt (cost 10) and stored in PostgreSQL
3. User logs in via `/api/auth/login`
4. Server generates JWT token (24-hour expiration)
5. Frontend stores token in localStorage
6. All protected endpoints require `Authorization: Bearer <token>` header
7. Middleware validates JWT on each request

### Error Handling

Per PRD error handling requirements:
- Unsupported file types: Return 400 with clear message
- Corrupted files: Return error with filename in response
- Invalid API keys: Return 401 from `/api/settings/test-connection`
- Network failures: Handle timeouts gracefully (60s for LLM calls)
- API rate limits: Return 429 with retry-after information
- Malformed LLM responses: Automatic retry (once), then return error

### File Exchange Mechanism

Website generation process:
1. User approves portfolio JSON in React UI
2. Frontend calls `/api/generate/website` with JSON and theme
3. Rust API validates JSON via `validator.rs`
4. Rust writes JSON to temporary file (session-based)
5. Rust spawns Next.js build process as child process with env vars:
   - `THEME_NAME`: selected theme
   - `SESSION_FILE`: path to JSON file
6. Next.js reads JSON, builds static site
7. Output written to user-specific directory
8. Download URL returned to frontend

This decouples the generator and allows independent testing.

### Database Migrations

Database schema defined in `init-db.sql` and applied on first startup.

For schema changes:
1. Update `init-db.sql`
2. Create migration file in `src-api/migrations/`
3. Rebuild Docker images
4. Or manually apply via: `docker compose exec postgres psql -U pwbuser < migration.sql`

## File Types Supported

- `.md` (Markdown)
- `.docx` (Microsoft Word)
- `.pdf` (PDF documents)
- `.xlsx` (Microsoft Excel)
- `.pptx` (Microsoft PowerPoint)

## Tech Stack Summary

### Web Application (Current)

- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL 16
- **Backend API**: Rust + Axum + Tokio (async)
- **Authentication**: JWT + bcrypt
- **Encryption**: AES-256-GCM
- **Frontend UI**: React 18 + TypeScript + Vite
- **Reverse Proxy**: Nginx (Alpine)
- **Styling**: Tailwind CSS
- **Website Generator**: Next.js 14 (Static Site Generation)
- **HTTP Client**: reqwest (Rust) + Axios (JavaScript)
- **Document Parsers**: comrak, pdf-extract, zip, quick-xml (Rust)
- **Database Driver**: SQLx (async PostgreSQL)

### Desktop App (Deprecated)

- **Desktop Framework**: Tauri v1.x
- **Backend**: Rust (file I/O, LLM APIs, document parsing)
- **Frontend UI**: React + TypeScript
- **IPC**: Tauri invoke commands (no longer used)

## Deployment Environments

### Development

```bash
./docker-run.sh --dev
```

- Hot reload enabled
- Vite dev server on port 5173
- Adminer database UI on port 8080
- Exposed PostgreSQL port (5432)
- Development logging (`RUST_LOG=debug`)

### Production

```bash
./docker-run.sh
```

- Optimized builds
- Nginx serving React SPA
- PostgreSQL internal only
- Production logging (`RUST_LOG=warn`)
- HTTPS recommended (via reverse proxy)

### Environment Variables

Required in `.env`:
- `POSTGRES_PASSWORD` - Database password
- `SECRET_KEY` - AES encryption key (32+ characters)
- `JWT_SECRET` - JWT signing key (32+ characters)

Optional:
- `ANTHROPIC_API_KEY` - For Claude AI
- `OPENAI_API_KEY` - For GPT AI
- `GEMINI_API_KEY` - For Gemini AI
- `OLLAMA_URL` - For local LLM
- `CORS_ORIGINS` - Allowed origins (comma-separated)

See `.env.example` for complete list.

## Testing

### Unit Tests

```bash
# Rust API
cd src-api && cargo test

# React UI
cd src-ui && npm test

# Next.js Generator
cd src-generator && npm test
```

### Integration Tests

```bash
# End-to-end tests (requires running containers)
./test-e2e.sh
```

Tests:
- Service health checks
- User authentication flow
- File upload and parsing
- API key management
- Website generation

### Manual Testing

1. Start services: `./docker-run.sh --dev`
2. Open http://localhost
3. Register account
4. Upload sample resume
5. Generate portfolio with AI
6. Select theme and generate website

## Migration Notes

This project has been **completely migrated** from Tauri desktop to Docker web application:

**What Changed**:
- Tauri IPC → REST API
- OS file dialogs → Browser file upload
- OS keychain → PostgreSQL encrypted storage
- Single-user → Multi-user with auth
- Desktop app → Web browser
- Platform builds → Docker images

**What Remained**:
- Document parsing logic (Rust)
- LLM integration logic (Rust)
- Portfolio JSON schema
- Theme system (Next.js)
- React UI components (updated for web)

**Backward Compatibility**:
- Desktop app still runnable via `npm run tauri dev`
- Session JSON format compatible
- Theme structure unchanged

See `DOCKER_MIGRATION_COMPLETE.md` for complete migration documentation.

## Troubleshooting

### Docker Issues

```bash
# View all logs
docker compose logs -f

# Check specific service
docker compose logs api

# Restart services
docker compose restart

# Rebuild without cache
docker compose build --no-cache
```

### Database Issues

```bash
# Check database connectivity
docker compose exec postgres pg_isready -U pwbuser

# Access database shell
docker compose exec postgres psql -U pwbuser professional_website_builder

# View database logs
docker compose logs postgres
```

### API Issues

```bash
# Check API health
curl http://localhost:3001/health

# View API logs
docker compose logs api

# Test authentication
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

See **DOCKER.md** for comprehensive troubleshooting guide.

## Best Practices

1. **Always use Docker for deployment** - Consistent environment
2. **Never commit `.env`** - Contains secrets
3. **Test with `./test-e2e.sh`** before deploying
4. **Review `./verify-docker-setup.sh`** before building
5. **Use development mode** for active development (`./docker-run.sh --dev`)
6. **Enable HTTPS in production** via reverse proxy (Caddy/Traefik)
7. **Backup PostgreSQL regularly** (`pg_dump`)
8. **Rotate secrets periodically** (JWT_SECRET, SECRET_KEY)
9. **Monitor logs** via `docker compose logs -f`
10. **Scale horizontally** when needed (`--scale api=3`)

## Additional Resources

- **Docker Documentation**: `DOCKER.md`
- **API Documentation**: `src-api/README.md`
- **Frontend Documentation**: `src-ui/README.md`
- **Quick Reference**: `DOCKER_QUICKSTART.md`
- **Migration Guide**: `DOCKER_MIGRATION_COMPLETE.md`
