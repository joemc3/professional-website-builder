# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a desktop application for generating professional portfolio websites from user documents (resumes, PDFs, etc.). Built with Tauri (Rust backend) + React (UI) + Next.js (website generation).

## Documentation

Detailed specifications are located in `project_standards/`:
- **Data Structure Specification.md** - Complete JSON schema for portfolio data
- **Technical Specification.md** - Architecture, tech stack, API contracts
- **Product Requirements Document (PRD) - Professional Website Builder.md** - Features, target audience, error handling
- **UI_UX Design Document.md** - Screen layouts, user flows, mockups
- **IMPLEMENTATION_PLAN.md** - Phased development roadmap

## CRITICAL NOTES

### 🚨 AUTONOMOUS DEVELOPMENT MODE
**UNTIL FURTHER NOTICE (until this note is removed): Make all implementation decisions independently.**
- Research and choose appropriate libraries, patterns, and solutions without asking
- Make architectural decisions based on best practices and the specifications
- Only interact with the user for critical blockers or fundamental requirement clarifications
- Goal: Deliver MVP+ (all features from Phase 1-4 in IMPLEMENTATION_PLAN.md) with minimal user interaction
- Use your judgment and expertise - the specifications provide the requirements, you determine the implementation details

When this mode is complete, this note will be removed from the file.

### Security: .gitignore Maintenance
**ALWAYS check and update `.gitignore` when adding new frameworks, libraries, or components.** Ensure that:
- Environment files (`.env`, `.env.local`, etc.) are excluded
- API keys and secrets are never committed
- Cloud provider configuration files are excluded
- Framework-specific ignore patterns are added (e.g., `.next/`, `target/`, `node_modules/`)

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
├── src-tauri/              # Rust backend (file processing, LLM integration)
├── src-ui/                 # React frontend (desktop app UI)
├── src-generator/          # Next.js (website theme generation)
└── user-data/              # Runtime directory (not in repo)
    ├── source-files/       # User's uploaded documents
    └── generated-site/     # Final website output
```

### Three-Tier Processing Model

The application supports three processing modes for converting documents to website content:

1. **Tier 1 (Manual)**: User manually fills forms from extracted text. May use embedded LLM for basic extraction.
2. **Tier 2 (Cloud AI)**: Cloud LLM APIs (Anthropic/OpenAI/Gemini) auto-generate JSON from documents.
3. **Tier 3 (Local AI)**: Local LLM (Ollama/LM Studio) auto-generate JSON from documents.

### Data Flow

1. **File Ingestion**: Files dropped → Tauri copies to `user-data/source-files/` → Rust parses documents
2. **Content Processing**:
   - Tier 1: Raw text → UI forms (manual entry)
   - Tier 2/3: Raw text → LLM API → validated JSON → pre-filled UI forms (review mode)
3. **Website Generation**: Approved JSON → written to `user-data/session.json` → Next.js build process → static site output

### Core Data Structure

All portfolio data follows a strict JSON schema defined in `project_standards/Data Structure Specification.md`:
- `profile`: Name, title, summary
- `contact`: Email, phone, social links
- `workExperience[]`: Company, title, dates, responsibilities
- `projects[]`: Name, description, technologies, URL
- `education[]`: Institution, degree, field, dates
- `skills[]`: Categories with items
- `theme`: Selected theme name and options

### Tauri API Commands

The React frontend communicates with Rust backend via these commands:

- `ingest_files(files: Vec<String>) -> Result<(), String>`
- `get_aggregated_text() -> Result<String, String>`
- `get_json_from_ai(tier: String, aggregated_text: String) -> Result<String, String>`
- `generate_website(json_data: String, theme: String) -> Result<(), String>`

### Document Processing

Rust backend handles:
- `.md` files: Using `comrak` or similar
- `.docx` files: Office Open XML parsing
- `.pdf` files: Using `pdf-extract` or similar
- `.xlsx`, `.pptx`: Office Open XML parsing

### Theme System

Each theme in `src-generator/themes/[theme-name]/`:
- `theme.config.json`: Metadata (name, thumbnail path)
- `[...slug].js`: Next.js page template
- `styles.css`: Theme-specific styles
- `thumbnail.png`: 400x300 preview image

Themes are selected in UI, then Next.js builds the static site using the selected theme's components.

### Security & API Key Storage

- API keys stored in OS-native secret managers (macOS Keychain, Windows Credential Manager)
- Use `tauri-plugin-keychain` or similar for secure storage
- Never store keys in plaintext

## Development Prerequisites

- Node.js v20.x+
- npm v10.x+ (or pnpm/yarn)
- Rust v1.75.x+ (via rustup)
- Tauri CLI v1.x: `cargo install tauri-cli`
- Platform-specific dependencies: https://tauri.app/v1/guides/getting-started/prerequisites

## Common Commands

### Development
```bash
# Install dependencies (monorepo)
npm install

# Run Tauri dev server (hot reload)
npm run tauri dev

# Run React UI only
cd src-ui && npm run dev

# Run Next.js generator (for theme development)
cd src-generator && npm run dev
```

### Building
```bash
# Build full application
npm run tauri build

# Build for specific platform
npm run tauri build -- --target [platform]
```

### Testing
```bash
# Rust backend tests
cd src-tauri && cargo test

# React UI tests
cd src-ui && npm test

# Next.js generator tests
cd src-generator && npm test
```

### Linting
```bash
# Rust (Clippy)
cd src-tauri && cargo clippy

# TypeScript/React (ESLint)
cd src-ui && npm run lint
cd src-generator && npm run lint

# Format (Prettier)
npm run format
```

## Important Implementation Notes

### LLM Integration

When implementing or debugging LLM features:
- All LLM prompts must request JSON output matching the Data Structure Specification
- Implement validation layer to check LLM JSON responses before passing to UI
- Handle malformed responses with retry logic (max 1 retry)
- Display clear error messages for API failures, rate limits, invalid keys

### Error Handling

Per PRD error handling requirements:
- Unsupported file types: transient notification
- Corrupted files: persistent error next to filename in file list
- Invalid API keys: clear error in Settings screen
- Network failures: non-modal error message
- API rate limits: informative message with retry suggestion
- Malformed LLM responses: automatic retry (once), then show error

### File Exchange Mechanism

Website generation uses filesystem for data exchange:
1. Tauri writes approved JSON to `user-data/session.json`
2. Tauri spawns Next.js build process as child process
3. Next.js `getStaticProps` reads `session.json` for data
4. Output written to `user-data/generated-site/`

This decouples the generator and allows independent testing.

## File Types Supported

- `.md` (Markdown)
- `.docx` (Microsoft Word)
- `.pdf` (PDF documents)
- `.xlsx` (Microsoft Excel)
- `.pptx` (Microsoft PowerPoint)

## Tech Stack Summary

- **Desktop Framework**: Tauri v1.x
- **Backend**: Rust (file I/O, LLM APIs, document parsing)
- **Frontend UI**: React + TypeScript
- **Styling**: Tailwind CSS
- **Website Generator**: Next.js (Static Site Generation)
- **HTTP Client**: reqwest (Rust)
- **Markdown Parser**: comrak (Rust)
- **PDF Parser**: pdf-extract (Rust)
