# Project Rename: professional-website-builder → Vitae

## Status: Approved (not started)

## Decision

Rename the project from "Professional Website Builder" to **Vitae**.

From Latin *curriculum vitae* — "course of life." Connects to the professional/resume domain without being literal. Works as a CLI name (`vitae`), service name, and product name.

## Scope

This is a cross-cutting rename touching every layer of the stack:

### Infrastructure
- Repository directory name
- Docker Compose: service names, container names, network name
- Docker image names / Dockerfile references
- Database name: `professional_website_builder` → `vitae`
- Environment variables and `.env.example`

### Python API (`src-api/`)
- `pyproject.toml` package name
- Database connection strings
- Any string references to the old name
- Alembic config if it references the DB name

### Frontend (`src-ui/`)
- `package.json` name
- Page titles, branding text

### Generator (`src-generator/`)
- `package.json` name and description

### Docs
- `CLAUDE.md` — all references
- `README.md` — title, description, all references
- Spec and plan documents that reference the old name

### Nginx
- Config file references if any

## Migration Notes

- The database rename requires either recreating the DB or using `ALTER DATABASE ... RENAME TO`.
- Docker volumes may reference the old name — need a migration path for existing data.
- The git remote URL won't change automatically — that's a GitHub/hosting concern, not a code concern.

## Timing

To be done as part of Phase 3e-B (deployment polish) or as a standalone mini-phase before deployment.
