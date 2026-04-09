# Vitae Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the project from "Professional Website Builder" to "Vitae" across every layer of the stack — code, infra, database, docs, branding — leaving behind zero references to the old name (outside historical record).

**Architecture:** This is a cross-cutting rename, not a feature. It touches the Python API package, two Node packages, Docker Compose, Postgres (name + user + password default), branding in the admin UI, the encryption key-derivation salt, and every doc that mentions the old name. No new behavior; verification is "everything still builds and runs after the rename." Commits are grouped by layer so any failing layer can be bisected cleanly.

**Tech Stack:** Python 3.12 + FastAPI + uv, React 18 + Vite + npm, Next.js 14 + npm, PostgreSQL 16, Docker Compose.

---

## Naming Decisions (pinned)

These are the exact strings used throughout the plan. Do not improvise — substitute literally.

| Old | New |
|---|---|
| `professional-website-builder` (dir, package slug) | `vitae` |
| `Professional Website Builder` (display) | `Vitae` |
| `professional-website-builder-api` (Python pkg) | `vitae-api` |
| `professional-website-builder-ui` (npm pkg) | `vitae-ui` |
| `professional-website-generator` (npm pkg) | `vitae-generator` |
| `professional_website_builder` (DB name) | `vitae` |
| `pwbuser` (DB user) | `vitae` |
| `pwbpass` (default DB password) | `vitaepass` |
| `pwb-static-salt` (HKDF salt) | `vitae-static-salt` |
| `PWB Admin` (nav branding) | `Vitae Admin` |
| `Professional Website Builder API` (FastAPI title) | `Vitae API` |
| `Generated with Professional Website Builder` | `Generated with Vitae` |

**Scope note:** `docs/superpowers/plans/2026-03-*.md` and `docs/superpowers/specs/2026-03-*.md` are historical records of completed work. Their inline text references to the old name are updated for consistency, but the filenames are NOT changed. The new spec `docs/superpowers/specs/project-rename-vitae.md` is already correctly named and its content is not modified.

**Destructive action warning:** This rename drops and recreates the dev Postgres volume (the DB name is changing, and Postgres cannot rename a live DB while connected). It also changes the HKDF salt, which would invalidate any stored encrypted API keys even if the data survived. **Any API keys in the current dev DB will be gone.** This is acceptable because the project is still pre-deployment and the user will re-enter them on first boot of the renamed stack.

**Out of scope for this plan:**
- Rewriting `src-ui/README.md` and `src-generator/README.md` (both are severely out of date for unrelated reasons — Tauri references, wrong ports). Task 8 does a surgical rename-only edit; a separate follow-up should rewrite them accurately.
- Changing the git remote URL or renaming the GitHub repository — that's a hosting concern, handled manually by the user.
- Renaming the working directory on the filesystem — Task 13 documents the manual steps for the user to run after the code changes are complete.

---

## File Structure

**Modified files by layer:**

- **Infra / compose:** `docker-compose.yml`, `.env.example`
- **Python API:** `src-api/pyproject.toml`, `src-api/uv.lock` (regenerated), `src-api/app/config.py`, `src-api/app/main.py`, `src-api/app/services/encryption_service.py`
- **Frontend:** `src-ui/package.json`, `src-ui/package-lock.json` (regenerated), `src-ui/index.html`, `src-ui/src/layouts/app-layout.tsx`
- **Generator:** `src-generator/package.json`, `src-generator/app/layout.tsx`
- **Primary docs:** `README.md`, `CLAUDE.md`
- **Subproject docs (surgical rename only):** `src-ui/README.md`, `src-generator/README.md`
- **Legacy docs (inline text updates):** `project_standards/Data Structure Specification.md`, `project_standards/IMPLEMENTATION_PLAN.md`, `project_standards/Product Requirements Document (PRD) - Professional Website Builder.md`, `project_standards/Technical Specification.md`, `project_standards/UI_UX Design Document.md`
- **Historical plans/specs (inline text updates, filenames unchanged):** `docs/superpowers/plans/2026-03-30-phase1-foundation.md`, `docs/superpowers/plans/2026-03-31-phase2a-document-pipeline.md`, `docs/superpowers/plans/2026-03-31-phase3b-admin-ui.md`, `docs/superpowers/plans/2026-04-04-phase3e-polish-features.md`, `docs/superpowers/specs/2026-03-30-project-revival-design.md`

**Files NOT modified:**
- `docs/superpowers/specs/project-rename-vitae.md` — this is the spec itself; its content is the source of truth
- `docs/superpowers/plans/2026-04-09-vitae-rename.md` — this plan
- `nginx/sites.conf` — contains no old-name references
- `src-api/tests/conftest.py`, any `src-api/tests/**/*.py` — testcontainers create their own ephemeral Postgres, no old-name strings
- `src-api/alembic.ini` — no hardcoded DB URL
- `src-api/migrations/versions/*.py` — migrations don't reference the DB name

**Suggested commit cadence:** one commit per task. Tasks are ordered so that intermediate commits leave the repo in a bisectable state (each layer can be inspected independently).

---

### Task 1: Create worktree for the rename work

**Files:** none modified — this task sets up an isolated workspace.

**Why a worktree:** The rename is cross-cutting and benefits from isolation. If it gets interrupted, main is unaffected. Invoke the worktree creation skill at the start.

- [ ] **Step 1: Invoke the worktree skill**

Use the Skill tool to invoke `superpowers:using-git-worktrees`. Follow its instructions to create a worktree named `vitae-rename` branching from `main`.

- [ ] **Step 2: Confirm starting state**

Inside the worktree, run:

```bash
git status
git log --oneline -5
```

Expected: working tree clean, HEAD at `a39239a docs: add Vitae rename spec (approved, not started)` or later.

- [ ] **Step 3: Verify baseline builds still pass**

Run the current-state smoke checks so we know the starting point is green:

```bash
cd src-api && uv run pytest tests/unit/ -v
```

Expected: all unit tests pass. (Integration tests are not run here — they need Docker and a database, which will be reset later in the plan.)

No commit for this task.

---

### Task 2: Rename the Python API package (pyproject.toml + main.py)

**Files:**
- Modify: `src-api/pyproject.toml` (lines 2, 4)
- Modify: `src-api/app/main.py` (line 49)
- Regenerate: `src-api/uv.lock`

- [ ] **Step 1: Update `src-api/pyproject.toml`**

Change:

```toml
[project]
name = "professional-website-builder-api"
version = "0.1.0"
description = "REST API for Professional Website Builder"
```

to:

```toml
[project]
name = "vitae-api"
version = "0.1.0"
description = "REST API for Vitae"
```

- [ ] **Step 2: Update FastAPI app title in `src-api/app/main.py`**

At line 49, change:

```python
app = FastAPI(
    title="Professional Website Builder API",
    version="0.2.0",
    lifespan=lifespan,
)
```

to:

```python
app = FastAPI(
    title="Vitae API",
    version="0.2.0",
    lifespan=lifespan,
)
```

- [ ] **Step 3: Regenerate the lockfile**

```bash
cd src-api && uv lock
```

Expected: `uv.lock` is rewritten with `name = "vitae-api"` at the top of the root package section.

- [ ] **Step 4: Verify unit tests still pass**

```bash
cd src-api && uv run pytest tests/unit/ -v
```

Expected: all unit tests pass. The rename is purely metadata; no test should break.

- [ ] **Step 5: Commit**

```bash
git add src-api/pyproject.toml src-api/uv.lock src-api/app/main.py
git commit -m "rename(api): professional-website-builder-api → vitae-api"
```

---

### Task 3: Update the encryption salt in `encryption_service.py`

**Files:**
- Modify: `src-api/app/services/encryption_service.py` (line 14)

**Context:** This is the HKDF salt used to derive the AES-GCM key that encrypts user API keys at rest. Changing it invalidates every encrypted row in the `api_keys` table. We accept that cost: the dev DB is being dropped anyway in Task 5, and the project is pre-deployment so no real users are affected. We do it in its own commit so the invariant "commit X changes the salt → all encrypted data from before commit X is unreadable" is crystal clear in git history.

- [ ] **Step 1: Change the salt literal**

In `src-api/app/services/encryption_service.py`, change:

```python
def _derive_key() -> bytes:
    hkdf = HKDF(
        algorithm=SHA256(),
        length=32,
        salt=b"pwb-static-salt",
        info=b"api-key-encryption",
    )
    return hkdf.derive(settings.secret_key.encode("utf-8"))
```

to:

```python
def _derive_key() -> bytes:
    hkdf = HKDF(
        algorithm=SHA256(),
        length=32,
        salt=b"vitae-static-salt",
        info=b"api-key-encryption",
    )
    return hkdf.derive(settings.secret_key.encode("utf-8"))
```

- [ ] **Step 2: Verify unit tests still pass**

```bash
cd src-api && uv run pytest tests/unit/ -v
```

Expected: all unit tests pass. Unit tests don't persist across runs, so the salt change is invisible to them.

- [ ] **Step 3: Commit**

```bash
git add src-api/app/services/encryption_service.py
git commit -m "rename(api): update HKDF salt pwb-static-salt → vitae-static-salt

Breaking change: invalidates any existing encrypted api_keys rows.
Safe here because the rename also recreates the dev database."
```

---

### Task 4: Update the API DB default connection string

**Files:**
- Modify: `src-api/app/config.py` (line 6)

- [ ] **Step 1: Change the default `database_url`**

In `src-api/app/config.py`, change:

```python
class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://pwbuser:pwbpass@localhost:5432/professional_website_builder"
```

to:

```python
class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://vitae:vitaepass@localhost:5432/vitae"
```

- [ ] **Step 2: Verify unit tests still pass**

```bash
cd src-api && uv run pytest tests/unit/ -v
```

Expected: all unit tests pass. Unit tests don't connect to Postgres.

- [ ] **Step 3: Commit**

```bash
git add src-api/app/config.py
git commit -m "rename(api): update default DATABASE_URL to vitae"
```

---

### Task 5: Update Docker Compose DB identity and wipe old volume

**Files:**
- Modify: `docker-compose.yml` (lines 7–9, 13, 40, 73)
- Modify: `.env.example` (lines 1–2, 8)

**Context:** This is the cutover. Before applying it, drop the existing dev volume so Postgres initializes fresh with the new DB name on first boot. Docker Compose will NOT rename an existing database for you — if you skip the volume wipe, the old DB stays and the new `vitae` DB is never created.

- [ ] **Step 1: Bring everything down and delete the existing Postgres volume**

```bash
docker compose --profile dev down -v
```

Expected: all containers stopped, named volumes (`postgres-data`, `uploads-data`, `generation-data`, `output-data`) removed. This wipes dev data.

- [ ] **Step 2: Update `docker-compose.yml`**

Change the `postgres` service block:

```yaml
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: professional_website_builder
      POSTGRES_USER: pwbuser
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-pwbpass}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pwbuser -d professional_website_builder"]
```

to:

```yaml
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: vitae
      POSTGRES_USER: vitae
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-vitaepass}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vitae -d vitae"]
```

Then update the `api` service's `DATABASE_URL` (line 40):

```yaml
      DATABASE_URL: postgresql+asyncpg://pwbuser:${POSTGRES_PASSWORD:-pwbpass}@postgres:5432/professional_website_builder
```

to:

```yaml
      DATABASE_URL: postgresql+asyncpg://vitae:${POSTGRES_PASSWORD:-vitaepass}@postgres:5432/vitae
```

And the `worker` service's `DATABASE_URL` (line 73), same substitution:

```yaml
      DATABASE_URL: postgresql+asyncpg://pwbuser:${POSTGRES_PASSWORD:-pwbpass}@postgres:5432/professional_website_builder
```

to:

```yaml
      DATABASE_URL: postgresql+asyncpg://vitae:${POSTGRES_PASSWORD:-vitaepass}@postgres:5432/vitae
```

- [ ] **Step 3: Update `.env.example`**

Change the header (lines 1–3):

```
# =============================================================================
# Professional Website Builder — Environment Configuration
# =============================================================================
```

to:

```
# =============================================================================
# Vitae — Environment Configuration
# =============================================================================
```

And the default password (line 8):

```
POSTGRES_PASSWORD=pwbpass
```

to:

```
POSTGRES_PASSWORD=vitaepass
```

- [ ] **Step 4: Bring the stack up and verify it comes up clean**

```bash
docker compose --profile dev up --build -d
docker compose --profile dev ps
```

Expected: `postgres-dev`, `redis-dev`, `api-dev`, `worker-dev`, `frontend-dev`, `public-sites-dev` all healthy. Then:

```bash
curl -sf http://localhost:8000/health
```

Expected: `{"status":"ok","database":"connected"}`. This confirms the API is connecting to the new `vitae` database as `vitae`.

- [ ] **Step 5: Confirm the new DB exists with the new name**

```bash
docker compose --profile dev exec postgres-dev psql -U vitae -d vitae -c '\dt'
```

Expected: the full list of tables (`users`, `documents`, `api_keys`, `profiles`, `job_postings`, `sites`, `resumes`) — migrations ran on API startup into the new DB.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "rename(infra): Postgres DB/user → vitae, password default → vitaepass"
```

---

### Task 6: Rename the frontend package (src-ui)

**Files:**
- Modify: `src-ui/package.json` (line 2)
- Modify: `src-ui/index.html` (line 7)
- Modify: `src-ui/src/layouts/app-layout.tsx` (lines 57, 116)
- Regenerate: `src-ui/package-lock.json`

- [ ] **Step 1: Update `src-ui/package.json`**

Change:

```json
{
  "name": "professional-website-builder-ui",
  "version": "0.1.0",
```

to:

```json
{
  "name": "vitae-ui",
  "version": "0.1.0",
```

- [ ] **Step 2: Update the HTML title in `src-ui/index.html`**

Change line 7:

```html
    <title>Professional Website Builder</title>
```

to:

```html
    <title>Vitae</title>
```

- [ ] **Step 3: Update the sidebar branding in `src-ui/src/layouts/app-layout.tsx`**

Change line 57:

```tsx
        <h1 className="text-lg font-semibold tracking-tight">PWB Admin</h1>
```

to:

```tsx
        <h1 className="text-lg font-semibold tracking-tight">Vitae Admin</h1>
```

And change line 116:

```tsx
        <h1 className="ml-3 text-lg font-semibold">PWB Admin</h1>
```

to:

```tsx
        <h1 className="ml-3 text-lg font-semibold">Vitae Admin</h1>
```

- [ ] **Step 4: Regenerate the lockfile**

```bash
cd src-ui && npm install
```

Expected: `package-lock.json` is rewritten with `"name": "vitae-ui"` in the top-level and root-package entries.

- [ ] **Step 5: Verify the frontend still builds**

```bash
cd src-ui && npm run build
```

Expected: build succeeds, no TypeScript errors. `dist/index.html` contains `<title>Vitae</title>`.

- [ ] **Step 6: Verify the lint passes**

```bash
cd src-ui && npm run lint
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src-ui/package.json src-ui/package-lock.json src-ui/index.html src-ui/src/layouts/app-layout.tsx
git commit -m "rename(ui): professional-website-builder-ui → vitae-ui, PWB Admin → Vitae Admin"
```

---

### Task 7: Rename the generator package (src-generator)

**Files:**
- Modify: `src-generator/package.json` (lines 2, 5)
- Modify: `src-generator/app/layout.tsx` (line 6)

- [ ] **Step 1: Update `src-generator/package.json`**

Change:

```json
{
  "name": "professional-website-generator",
  "version": "1.0.0",
  "private": true,
  "description": "Next.js static site generator for professional portfolio websites",
```

to:

```json
{
  "name": "vitae-generator",
  "version": "1.0.0",
  "private": true,
  "description": "Next.js static site generator for Vitae portfolio websites",
```

**Note:** `src-generator` does not have a checked-in lockfile in the current repo. If `package-lock.json` exists after `npm install`, include it in the commit; otherwise skip.

- [ ] **Step 2: Update the Next.js metadata in `src-generator/app/layout.tsx`**

Change:

```tsx
export const metadata: Metadata = {
  title: 'Professional Portfolio',
  description: 'Generated with Professional Website Builder',
};
```

to:

```tsx
export const metadata: Metadata = {
  title: 'Professional Portfolio',
  description: 'Generated with Vitae',
};
```

(The title `'Professional Portfolio'` is generic, unrelated to the rename, and stays as-is.)

- [ ] **Step 3: Verify the generator still builds**

```bash
cd src-generator && npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src-generator/package.json src-generator/app/layout.tsx
git commit -m "rename(generator): professional-website-generator → vitae-generator"
```

(If a `package-lock.json` was generated in this directory for the first time, include it in the `git add`.)

---

### Task 8: Surgical rename in stale subproject READMEs

**Files:**
- Modify: `src-ui/README.md` (lines 1, 3)
- Modify: `src-generator/README.md` (line 109)

**Context:** Both of these READMEs are severely out of date for reasons unrelated to this rename — `src-ui/README.md` still talks about Tauri conversion and references the wrong port (3001); `src-generator/README.md` references a `/home/user/professional-website-builder/...` path and Tauri integration. This task does a **rename-only** edit: fix the old-name strings and nothing else. A follow-up pass to rewrite both of these accurately is flagged in Task 13's handoff notes but is not part of this plan.

- [ ] **Step 1: Update `src-ui/README.md`**

Change line 1:

```markdown
# Professional Website Builder - Web UI
```

to:

```markdown
# Vitae - Web UI
```

Change line 3:

```markdown
This is the React-based web application for the Professional Website Builder. It has been converted from a Tauri desktop application to a standalone web application.
```

to:

```markdown
This is the React-based web application for Vitae. It has been converted from a Tauri desktop application to a standalone web application.
```

- [ ] **Step 2: Update `src-generator/README.md`**

Change line 109:

```markdown
See `/home/user/professional-website-builder/user-data/session.json` for a complete example.
```

to:

```markdown
See `/home/user/vitae/user-data/session.json` for a complete example.
```

- [ ] **Step 3: Commit**

```bash
git add src-ui/README.md src-generator/README.md
git commit -m "rename(docs): update old-name references in subproject READMEs"
```

---

### Task 9: Update the primary `README.md`

**Files:**
- Modify: `README.md` (lines 1, 7)

- [ ] **Step 1: Update the title and opening paragraph**

Change line 1:

```markdown
# Professional Website Builder
```

to:

```markdown
# Vitae
```

Change line 7:

```markdown
Professional Website Builder uses a **document repository model**: you upload many documents over time — resumes, project write-ups, certifications, bios, anything — and AI synthesizes them into a unified professional profile. From that profile the app can generate:
```

to:

```markdown
Vitae uses a **document repository model**: you upload many documents over time — resumes, project write-ups, certifications, bios, anything — and AI synthesizes them into a unified professional profile. From that profile the app can generate:
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "rename(docs): update README.md title and prose to Vitae"
```

---

### Task 10: Update `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md` (line 45, line 283)

**Context:** `CLAUDE.md` is the project-level instructions for Claude Code. It has two old-name references:
- Line 45: a monorepo-structure diagram labelling the root directory
- Line 283: the `docker compose exec ... psql` troubleshooting command

The first line is cosmetic — the diagram uses `/professional-website-builder/` as a label. The second is a live command users will run.

- [ ] **Step 1: Update the monorepo structure diagram label**

On line 45, change:

```
/professional-website-builder/
```

to:

```
/vitae/
```

- [ ] **Step 2: Update the psql troubleshooting command**

On line 283, change:

```
docker compose --profile dev exec postgres-dev psql -U pwbuser professional_website_builder
```

to:

```
docker compose --profile dev exec postgres-dev psql -U vitae vitae
```

- [ ] **Step 3: Verify with a grep that no old-name strings remain in `CLAUDE.md`**

```bash
grep -n -iE 'professional[-_ ]?website[-_ ]?builder|pwbuser|pwbpass|pwb-static-salt' CLAUDE.md
```

Expected: no output. If any line matches, update it in the same commit.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "rename(docs): update CLAUDE.md references to Vitae"
```

---

### Task 11: Update inline text in `project_standards/` legacy docs

**Files:**
- Modify: `project_standards/Data Structure Specification.md`
- Modify: `project_standards/IMPLEMENTATION_PLAN.md`
- Modify: `project_standards/Product Requirements Document (PRD) - Professional Website Builder.md`
- Modify: `project_standards/Technical Specification.md`
- Modify: `project_standards/UI_UX Design Document.md`

**Context:** These are pre-superpowers-era legacy docs. They've been superseded by `docs/superpowers/specs/2026-03-30-project-revival-design.md` but are still checked in for historical value. We update inline text references for consistency but leave filenames alone (including the one PRD file with the old name in the filename — filename changes would break any historical links, and these docs are frozen).

- [ ] **Step 1: Find every occurrence in these 5 files**

```bash
grep -n -iE 'professional[-_ ]?website[-_ ]?builder' project_standards/*.md
```

Record every line number and the exact old string (the exact casing matters: it may be `Professional Website Builder`, `professional-website-builder`, or `professional website builder`).

- [ ] **Step 2: Replace `Professional Website Builder` → `Vitae` across the 5 files**

For every match from Step 1 with the casing `Professional Website Builder`, use the Edit tool to substitute in `Vitae` in-place. Do them one file at a time so an error in one doesn't corrupt the others.

For occurrences using `professional-website-builder` (slug casing), substitute `vitae`.

For occurrences using `professional website builder` (all-lower prose), substitute `Vitae`.

- [ ] **Step 3: Verify no old-name strings remain in `project_standards/`**

```bash
grep -n -iE 'professional[-_ ]?website[-_ ]?builder' project_standards/*.md
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add project_standards/
git commit -m "rename(docs): update legacy project_standards references to Vitae"
```

---

### Task 12: Update historical `docs/superpowers/` plan and spec files

**Files:**
- Modify: `docs/superpowers/specs/2026-03-30-project-revival-design.md`
- Modify: `docs/superpowers/plans/2026-03-30-phase1-foundation.md`
- Modify: `docs/superpowers/plans/2026-03-31-phase2a-document-pipeline.md`
- Modify: `docs/superpowers/plans/2026-03-31-phase3b-admin-ui.md`
- Modify: `docs/superpowers/plans/2026-04-04-phase3e-polish-features.md`

**Do NOT modify:**
- `docs/superpowers/specs/project-rename-vitae.md` (the spec that drives this rename — content must be preserved as the source of truth)
- `docs/superpowers/plans/2026-04-09-vitae-rename.md` (this plan)

**Context:** These files are historical records of completed work. Their inline references to the old name make grep results noisy going forward. We substitute names but preserve all other content and leave filenames unchanged — those filenames anchor historical references.

Note that one of these files — `2026-03-31-phase3b-admin-ui.md` — references the `PWB Admin` sidebar string in a code example from when that component was first written. Update it alongside the project name.

One file — `2026-03-31-phase2a-document-pipeline.md` — contains a reference to the HKDF salt (`salt=b"pwb-static-salt"`) from when the encryption service was first written. Update it to `salt=b"vitae-static-salt"` for historical consistency with the live code.

- [ ] **Step 1: Enumerate all old-name occurrences**

```bash
grep -n -iE 'professional[-_ ]?website[-_ ]?builder|pwbuser|pwbpass|pwb-static-salt|pwb admin' \
  docs/superpowers/specs/2026-03-30-project-revival-design.md \
  docs/superpowers/plans/2026-03-30-phase1-foundation.md \
  docs/superpowers/plans/2026-03-31-phase2a-document-pipeline.md \
  docs/superpowers/plans/2026-03-31-phase3b-admin-ui.md \
  docs/superpowers/plans/2026-04-04-phase3e-polish-features.md
```

Record every match.

- [ ] **Step 2: Substitute each match**

Use the Edit tool file-by-file. Apply this mapping:

| Old string | New string |
|---|---|
| `Professional Website Builder` | `Vitae` |
| `professional-website-builder` | `vitae` |
| `professional_website_builder` | `vitae` |
| `pwbuser` | `vitae` |
| `pwbpass` | `vitaepass` |
| `pwb-static-salt` | `vitae-static-salt` |
| `PWB Admin` | `Vitae Admin` |

- [ ] **Step 3: Verify no old-name strings remain in these files**

```bash
grep -n -iE 'professional[-_ ]?website[-_ ]?builder|pwbuser|pwbpass|pwb-static-salt|pwb admin' \
  docs/superpowers/specs/2026-03-30-project-revival-design.md \
  docs/superpowers/plans/2026-03-30-phase1-foundation.md \
  docs/superpowers/plans/2026-03-31-phase2a-document-pipeline.md \
  docs/superpowers/plans/2026-03-31-phase3b-admin-ui.md \
  docs/superpowers/plans/2026-04-04-phase3e-polish-features.md
```

Expected: no output.

- [ ] **Step 4: Confirm the exclusion list is still intact**

Confirm the following files were NOT modified:

```bash
git status docs/superpowers/specs/project-rename-vitae.md docs/superpowers/plans/2026-04-09-vitae-rename.md
```

Expected: no changes listed for either file.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/
git commit -m "rename(docs): update historical specs and plans to Vitae"
```

---

### Task 13: Full-stack verification and sweep

**Files:** none modified — this task is verification only.

- [ ] **Step 1: Repo-wide old-name sweep**

```bash
grep -rn -iE 'professional[-_ ]?website[-_ ]?builder|pwbuser|pwbpass|pwb-static-salt|pwb admin' \
  --exclude-dir=.git \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude=uv.lock \
  --exclude=package-lock.json \
  .
```

Expected output: ONLY these two files, which are intentionally excluded:

```
./docs/superpowers/specs/project-rename-vitae.md
./docs/superpowers/plans/2026-04-09-vitae-rename.md
```

If anything else shows up, fix it and append to Task 12's commit (or create a follow-up `rename(docs): final sweep` commit if Task 12 has already been pushed).

- [ ] **Step 2: Lockfile sweep**

Lockfiles are intentionally excluded from Step 1 because they may contain substring matches in unrelated packages or URLs. Do a targeted check to confirm the only references are the root-package self-references, which should now say `vitae-*`:

```bash
grep -n 'professional-website-builder\|professional-website-generator' src-api/uv.lock src-ui/package-lock.json 2>/dev/null
```

Expected: no output. If anything matches, regenerate the lockfile (`uv lock` in src-api, `npm install` in src-ui) and commit it as a fixup.

- [ ] **Step 3: Restart the stack cleanly**

```bash
docker compose --profile dev down -v
docker compose --profile dev up --build -d
```

Expected: all services come up healthy.

- [ ] **Step 4: Verify the API health endpoint**

```bash
curl -sf http://localhost:8000/health
```

Expected: `{"status":"ok","database":"connected"}`.

- [ ] **Step 5: Verify the admin app loads with new branding**

Open `http://localhost:5173` in a browser (or `curl -sf http://localhost:5173 | grep -i '<title>'`). Expected: the `<title>` is `Vitae` and the sidebar shows `Vitae Admin`.

- [ ] **Step 6: Register a user, upload a document, and generate a portfolio site end-to-end**

This is the smoke test that confirms the rename hasn't broken any cross-service wiring (API ↔ Postgres ↔ worker ↔ generator ↔ public-sites).

1. Register a new user via `POST /api/auth/register`
2. Upload a sample document via `POST /api/documents`
3. Wait for it to parse (poll `GET /api/documents/:id` until `status=completed`)
4. Add an API key via `POST /api/settings/api-keys` and trigger profile synthesis
5. Generate a portfolio site via `POST /api/sites/portfolio`
6. Confirm the site is reachable at the public sites URL

Exact commands are documented in `CLAUDE.md`'s REST API section. If any step fails, diagnose the failure — do not mark this task complete.

- [ ] **Step 7: Run the full unit test suite**

```bash
cd src-api && uv run pytest tests/unit/ -v
```

Expected: all unit tests pass.

- [ ] **Step 8: Run integration tests**

```bash
cd src-api && uv run pytest tests/integration/ -v
```

Expected: all integration tests pass. Testcontainers spin up their own ephemeral Postgres, so they don't depend on the dev DB name — this test is about confirming nothing in the test infrastructure was broken by adjacent changes.

No commit for this task — verification only.

---

### Task 14: Update CLAUDE.md phase status, finish worktree, hand off directory rename to user

**Files:**
- Modify: `CLAUDE.md` (Current Phase section, around the bottom)

**Context:** After the rename lands, the user still needs to do two things that only they can do:
1. Rename the working directory on the filesystem (can't be done from inside the directory that's being renamed)
2. Optionally rename the GitHub repository and update the git remote URL

Document both in CLAUDE.md's phase status so the next session has a clear picture, then use the `finishing-a-development-branch` skill to land the worktree.

- [ ] **Step 1: Update the Current Phase section in `CLAUDE.md`**

Find the `## Current Phase` section and prepend a new paragraph noting the rename:

```markdown
## Current Phase

**Project renamed to Vitae** (2026-04-09). The rename landed on main as a standalone mini-phase ahead of Phase 3e-B. The working directory on disk is still `professional-website-builder/` until the user renames it manually — see the post-rename checklist below.

**Phase 3e-A (Polish Features) is complete.** [... existing content unchanged ...]
```

Then, at the very bottom of the `## Current Phase` section (before the next `##` heading), add:

```markdown
### Post-rename manual steps

The following steps cannot be performed from inside the Claude session and are left to the user:

1. Rename the working directory on disk:
   ```bash
   docker compose --profile dev down -v
   cd ..
   mv professional-website-builder vitae
   cd vitae
   docker compose --profile dev up --build -d
   ```
2. Optionally rename the GitHub repository and update the git remote URL:
   ```bash
   git remote set-url origin <new-url>
   ```
3. `src-ui/README.md` and `src-generator/README.md` were only *surgically* renamed in the Vitae rename pass. Both are still severely out of date (Tauri references, wrong ports, wrong features) and should be rewritten as a follow-up.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: note Vitae rename completion and post-rename manual steps in CLAUDE.md"
```

- [ ] **Step 3: Invoke the finishing-a-development-branch skill**

Use the Skill tool to invoke `superpowers:finishing-a-development-branch`. Follow its guidance to merge the `vitae-rename` worktree branch into `main` (or prepare a PR, depending on what it recommends). Do NOT push to any remote unless the user explicitly asks.

- [ ] **Step 4: Report summary to the user**

Report:

- Number of commits on the rename branch
- The post-rename manual steps from CLAUDE.md (directory rename, optional GitHub repo rename)
- The follow-up TODO: rewrite `src-ui/README.md` and `src-generator/README.md`

---

## Self-Review

**Spec coverage check:**

| Spec item | Plan task |
|---|---|
| Repository directory name | Task 14 (hand-off — manual, user only) |
| Docker Compose service/container/network name | Task 5 (service env); container/network names auto-derive from dir, covered by Task 14 handoff |
| Docker image names / Dockerfile references | None needed — Dockerfiles don't hard-code the name |
| Database name | Task 5 |
| Environment variables and `.env.example` | Task 5 |
| `pyproject.toml` package name | Task 2 |
| Database connection strings | Tasks 4 (config default) + 5 (compose) |
| Any string references to the old name (API) | Tasks 2, 3 (salt), 4, 5 |
| Alembic config | Verified clean — no old-name refs in `alembic.ini`, no task needed |
| `package.json` name (src-ui) | Task 6 |
| Page titles, branding text (src-ui) | Task 6 (`index.html` title + `app-layout.tsx` sidebar) |
| `package.json` name/description (src-generator) | Task 7 |
| `CLAUDE.md` — all references | Task 10 + Task 14 (phase status) |
| `README.md` | Task 9 |
| Spec and plan documents | Tasks 11 (project_standards) + 12 (docs/superpowers) |
| Nginx config | Verified clean — no old-name refs in `nginx/sites.conf`, no task needed |
| Database rename migration path | Task 5 — wipe-and-recreate (acceptable for dev) |
| Docker volume migration path | Task 5 — wipe-and-recreate |
| Git remote URL | Task 14 — user-only manual step, documented in CLAUDE.md |

**Gap check:** All spec items are accounted for, either as an explicit task or as a "verified clean" confirmation.

**Placeholder scan:** no TBDs, no "add appropriate handling", no "similar to Task N". Every step has exact file paths, exact strings, exact commands.

**Type consistency:** naming is pinned at the top of the plan and referenced literally throughout.

**Net discoveries beyond the spec (all included in the plan):**
1. `src-api/app/services/encryption_service.py` HKDF salt → Task 3
2. `src-ui/src/layouts/app-layout.tsx` "PWB Admin" branding → Task 6
3. `src-ui/README.md` and `src-generator/README.md` are stale for unrelated reasons → rename-only in Task 8, flagged as follow-up in Task 14
