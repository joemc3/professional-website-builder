# Professional Website Builder

A **containerized web application** for generating professional portfolio websites from user documents (resumes, PDFs, CVs, etc.). Built with **Rust** (REST API) + **React** (UI) + **Next.js** (website generation) and deployed via **Docker**.

> **Note**: This application was originally built as a Tauri desktop app and has been completely transformed into a modern, scalable web application. The desktop version is still available in `src-tauri/` but is deprecated.

## 🌟 Features

- **🌐 Web-Based & Multi-User**: Access from any browser with secure authentication
- **📁 Multi-format document support**: Markdown, DOCX, PDF, XLSX, PPTX
- **🤖 Three processing modes**:
  - **Manual Mode**: Extract text and manually fill in your portfolio
  - **Cloud AI Mode**: Use Claude, GPT-4, or Gemini to auto-generate content
  - **Local AI Mode**: Use Ollama or LM Studio for privacy-focused generation
- **🎨 Five professional themes**: Onyx (dark), Quartz (light), Serene (soft), Jade (nature), Coral (vibrant)
- **🔒 Secure**: JWT authentication, encrypted API key storage, HTTPS-ready
- **⚡ Static website generation**: Fast, SEO-friendly, deployable anywhere
- **🐳 Docker-powered**: Easy deployment on any platform
- **📊 PostgreSQL database**: Robust data persistence and multi-user support

## 🚀 Quick Start (Docker - Recommended)

### Prerequisites

- **Docker** 24.0+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose** 2.0+
- 4GB+ RAM available
- 10GB+ disk space

### 1. Clone and Configure

```bash
git clone <repository-url>
cd professional-website-builder

# Copy environment template
cp .env.example .env

# Edit .env and set required variables:
# - POSTGRES_PASSWORD (required)
# - SECRET_KEY (required, 32+ characters)
# - JWT_SECRET (required, 32+ characters)
# - ANTHROPIC_API_KEY or OPENAI_API_KEY (optional, for AI features)
nano .env
```

### 2. Verify Setup

```bash
./verify-docker-setup.sh
```

This checks Docker installation, file structure, environment config, and code compilation.

### 3. Build Images

```bash
./docker-build.sh
```

Builds three optimized Docker images (~850MB total).

### 4. Start Services

**Production Mode:**
```bash
./docker-run.sh
```

**Development Mode** (with hot reload):
```bash
./docker-run.sh --dev
```

### 5. Access Application

- **Frontend**: http://localhost
- **API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Database UI** (dev only): http://localhost:8080

### 6. Create Your First Account

1. Open http://localhost in your browser
2. Click "Register" and create an account
3. Login with your credentials
4. Upload documents and generate your portfolio!

### 7. Run End-to-End Tests

```bash
./test-e2e.sh
```

## 📁 Project Structure

```
professional-website-builder/
├── src-api/                    # Rust REST API backend ⭐ NEW
│   ├── src/
│   │   ├── main.rs            # Axum server
│   │   ├── handlers/          # REST endpoints
│   │   ├── auth.rs            # JWT & bcrypt
│   │   ├── crypto.rs          # AES-256 encryption
│   │   ├── document_parser.rs # File parsing
│   │   ├── llm_client.rs      # LLM integration
│   │   └── validator.rs       # JSON validation
│   ├── Cargo.toml
│   └── Dockerfile
│
├── src-ui/                     # React web frontend ⭐ UPDATED
│   ├── src/
│   │   ├── services/api.ts    # REST API client
│   │   ├── contexts/AuthContext.tsx
│   │   ├── components/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── FileIngestion.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── MainEditor.tsx
│   │   │   ├── ThemeSelection.tsx
│   │   │   └── GenerationSuccess.tsx
│   │   └── App.tsx
│   ├── nginx.conf             # Nginx reverse proxy
│   ├── Dockerfile
│   └── package.json
│
├── src-generator/              # Next.js static site generator
│   ├── app/
│   │   ├── themes/            # 5 website themes
│   │   │   ├── onyx/          # Dark professional
│   │   │   ├── quartz/        # Light minimalist
│   │   │   ├── serene/        # Soft calming
│   │   │   ├── jade/          # Nature-inspired
│   │   │   └── coral/         # Vibrant modern
│   │   └── lib/
│   ├── Dockerfile
│   └── package.json
│
├── src-tauri/                  # Original desktop app (DEPRECATED)
│   └── ...
│
├── docker-compose.yml          # Production orchestration
├── docker-compose.dev.yml      # Development overrides
├── init-db.sql                 # Database schema
├── .env.example                # Environment template
│
├── DOCKER.md                   # Complete Docker guide
├── DOCKER_QUICKSTART.md        # Quick reference
└── DOCKER_MIGRATION_COMPLETE.md # Migration overview
```

## 🏗️ Architecture

### Services

The application consists of 4 containerized services:

```
┌─────────────────────────────────────────────────┐
│         Frontend (Nginx + React SPA)            │
│              http://localhost:80                │
└───────────────────┬─────────────────────────────┘
                    │
                    │ /api/* → Proxy
                    ▼
┌─────────────────────────────────────────────────┐
│         Backend API (Rust + Axum)               │
│            http://localhost:3001                │
└────────┬──────────────────────┬─────────────────┘
         │                      │
         │                      │ Spawns builds
         ▼                      ▼
┌──────────────────┐   ┌──────────────────────┐
│   PostgreSQL     │   │  Next.js Generator   │
│   (Port 5432)    │   │   (Port 3002)        │
└──────────────────┘   └──────────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React 18 + TypeScript + Vite | User interface |
| **Backend API** | Rust + Axum + Tokio | REST API server |
| **Database** | PostgreSQL 16 | Data persistence |
| **Generator** | Next.js 14 (SSG) | Static site generation |
| **Reverse Proxy** | Nginx (Alpine) | Frontend + API routing |
| **Containerization** | Docker + Docker Compose | Orchestration |
| **Authentication** | JWT + bcrypt | User security |
| **Encryption** | AES-256-GCM | API key protection |

## 📊 API Endpoints

### Public
- `GET /health` - Health check

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (returns JWT)
- `POST /api/auth/logout` - Logout

### Files (Protected)
- `POST /api/files/ingest` - Upload documents
- `GET /api/files/aggregated-text` - Get parsed text

### AI Processing (Protected)
- `POST /api/ai/generate` - Generate portfolio JSON

### Website Generation (Protected)
- `POST /api/generate/website` - Build static site

### Settings (Protected)
- `POST /api/settings/api-keys` - Save API key
- `GET /api/settings/api-keys/:provider` - Get API key
- `DELETE /api/settings/api-keys/:provider` - Delete key
- `POST /api/settings/test-connection` - Test LLM connection

## 🔧 Development

### Development Mode

```bash
# Start all services with hot reload
./docker-run.sh --dev
```

This enables:
- React hot reload (Vite dev server on port 5173)
- API auto-restart on file changes
- Database UI (Adminer on port 8080)
- Exposed database port (5432)
- Development logging

### Local Development (without Docker)

**Backend API:**
```bash
cd src-api
cargo run
```

**Frontend:**
```bash
cd src-ui
npm run dev
```

**Generator:**
```bash
cd src-generator
npm run dev
```

### Running Tests

```bash
# Rust unit tests
cd src-api
cargo test

# React tests
cd src-ui
npm test

# E2E tests (requires running containers)
./test-e2e.sh
```

### Linting

```bash
# Rust (Clippy)
cd src-api && cargo clippy

# TypeScript/React (ESLint)
cd src-ui && npm run lint
cd src-generator && npm run lint

# Format all code
npm run format
```

## 🎨 Theme Development

Each theme is self-contained in `src-generator/app/themes/[theme-name]/`:

```
themes/onyx/
├── page.tsx                # Main template
├── theme.config.json       # Metadata
├── components/             # Theme components
│   ├── Header.tsx
│   ├── Profile.tsx
│   ├── WorkExperience.tsx
│   ├── Projects.tsx
│   ├── Education.tsx
│   ├── Skills.tsx
│   └── Contact.tsx
└── thumbnail.png           # 400x300 preview
```

To create a new theme:
1. Copy an existing theme directory
2. Update `theme.config.json`
3. Customize styles and components
4. Create a thumbnail
5. Rebuild the generator container

## 🤖 LLM Integration

### Supported Providers

- **Anthropic Claude** (Cloud) - Recommended
- **OpenAI GPT-4** (Cloud)
- **Google Gemini** (Cloud)
- **Ollama** (Local)
- **LM Studio** (Local)

### Configuration

API keys are stored encrypted in PostgreSQL. Configure in the **Settings** page after logging in.

## 📊 Data Structure

Portfolio data follows a strict JSON schema. See `project_standards/Data Structure Specification.md` for complete details.

```typescript
{
  profile: {
    fullName: string;
    title: string;
    summary?: string;
  };
  contact: { ... };
  workExperience: [ ... ];
  projects: [ ... ];
  education: [ ... ];
  skills: [ ... ];
  theme: { name: string };
}
```

## 🔒 Security

- ✅ **JWT authentication** (24-hour expiration)
- ✅ **bcrypt password hashing** (cost 10)
- ✅ **AES-256-GCM encryption** for API keys
- ✅ **CORS protection** (configurable origins)
- ✅ **Rate limiting** (10 req/s)
- ✅ **SQL injection prevention** (parameterized queries)
- ✅ **Non-root containers**
- ✅ **Security headers** (CSP, X-Frame-Options, etc.)
- ✅ **Network isolation**
- ✅ **HTTPS-ready**

## 🚢 Deployment

### Production Checklist

- [ ] Change `POSTGRES_PASSWORD` to a strong password
- [ ] Generate new `SECRET_KEY` (32+ bytes, random)
- [ ] Generate new `JWT_SECRET` (32+ bytes, random)
- [ ] Set `CORS_ORIGINS` to your domain
- [ ] Configure LLM API keys (optional)
- [ ] Set `NODE_ENV=production`
- [ ] Set `RUST_LOG=warn` or `error`
- [ ] Setup HTTPS reverse proxy (Caddy/Traefik recommended)
- [ ] Configure database backups
- [ ] Setup monitoring
- [ ] Configure resource limits

### Cloud Deployment

**AWS, GCP, Azure, DigitalOcean:**
1. Provision a VM with Docker
2. Clone repository
3. Configure `.env` with production values
4. Run `./docker-build.sh`
5. Run `./docker-run.sh`
6. Setup HTTPS with Let's Encrypt
7. Configure firewall rules

**Kubernetes:**
- Helm charts coming soon
- See `DOCKER.md` for migration notes

### Scaling

```bash
# Horizontal scaling
docker compose up -d --scale api=3

# Resource limits (edit docker-compose.yml)
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
```

## 🛠️ Troubleshooting

### Services won't start

```bash
docker compose logs         # Check all logs
docker compose logs api     # Check specific service
docker compose restart      # Restart services
```

### Database connection errors

```bash
docker compose exec postgres pg_isready -U pwbuser
docker compose logs postgres
```

### Frontend can't reach API

- Check CORS configuration in `.env`
- Verify API is running: `curl http://localhost:3001/health`
- Check nginx.conf proxy settings

See **DOCKER.md** for comprehensive troubleshooting.

## 📚 Documentation

- **DOCKER.md** - Complete deployment guide (15+ pages)
- **DOCKER_QUICKSTART.md** - Quick reference commands
- **DOCKER_MIGRATION_COMPLETE.md** - Migration overview and architecture
- **src-api/README.md** - API documentation
- **src-ui/README.md** - Frontend documentation
- **project_standards/** - Original specifications

## 🎯 Roadmap

- [x] Phase 1: Project scaffolding
- [x] Phase 2: Core functionality (Manual mode)
- [x] Phase 3: AI integration (Cloud & Local)
- [x] Phase 4: Themes and finalization
- [x] Phase 5: Docker migration and web deployment
- [ ] Cloud storage integration (S3)
- [ ] Real-time WebSocket progress
- [ ] User profiles and preferences
- [ ] Portfolio sharing and collaboration
- [ ] Custom domain mapping
- [ ] Kubernetes Helm charts
- [ ] Export to PDF/DOCX
- [ ] Analytics integration
- [ ] Additional themes

## 🏛️ Legacy Desktop App

The original Tauri desktop application is still available in `src-tauri/` but is **deprecated** and no longer maintained. To run it:

```bash
# Install Tauri prerequisites
cargo install tauri-cli

# Run desktop app
cd src-tauri
cargo tauri dev
```

See legacy documentation in `DEVELOPMENT.md` for desktop app details.

## 🤝 Contributing

This project follows best practices:

- **EditorConfig** for consistent formatting
- **Prettier** for code formatting
- **ESLint** for JavaScript/TypeScript linting
- **Clippy** for Rust linting
- **TypeScript** strict mode enabled

Run formatters before committing:

```bash
npm run format
```

## 📄 License

[Add your license here]

## 📧 Support

For issues and feature requests, please create an issue in the repository.

### Quick Links

- **Getting Started**: See Quick Start section above
- **API Documentation**: See `src-api/README.md`
- **Docker Guide**: See `DOCKER.md`
- **Troubleshooting**: See `DOCKER.md` troubleshooting section

---

**Built with** ❤️ **using Rust, React, Next.js, and Docker**

## 📊 Statistics

- **3 microservices** (API, Frontend, Generator)
- **15 REST endpoints**
- **5 professional themes**
- **1,971 lines** of Rust backend code
- **5 database tables**
- **100% Docker-native**
- **Production-ready security**
- **Multi-user support**
- **Horizontal scaling capable**
