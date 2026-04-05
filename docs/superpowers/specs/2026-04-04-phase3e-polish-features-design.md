# Phase 3e-A: Polish Features — Design Spec

## Overview

Three features that complete the user-facing experience before deployment: a two-tier live preview system for theme selection, profile photo upload, and a resume download link on portfolio sites.

Phase 3e is split into two sub-phases:
- **3e-A** (this spec): Features — live preview, photo upload, resume download link
- **3e-B** (separate spec): Deployment — Dockerfile fixes, Nginx config, docker-compose verification, README, E2E phase documentation

## Feature 1: Live Preview System

### Problem

Picking a theme is currently a blind choice. You select a name, trigger a full Next.js static export (30+ seconds), and hope it looks good. There's no way to compare themes or see how your content fits before committing.

### Solution: Two-Tier Preview

**Tier 1 — Theme Showcase (instant).** Static screenshots of each theme shown in a gallery on the admin Sites page. These are pre-built assets bundled with the admin app — not generated per-user. Each theme card shows portfolio and targeted variants (5 themes x 2 variants = 10 images). Clicking a card selects the theme and reveals the Tier 2 button.

**Tier 2 — Live Preview (on demand).** A "Preview with my data" button renders the selected theme with actual profile data via Next.js SSR. The result is displayed in an iframe in the admin UI. Takes a few seconds but shows exactly what the generated site will look like.

### Architecture

```
Admin UI                API                       Generator
────────               ────                      ─────────
Theme gallery    →   (static assets, no API)
"Preview" click  →   POST /api/preview        →  write data, start/reuse SSR process
                 ←   { preview_id }
iframe src       →   GET /api/preview/:id      →  proxy to Next.js SSR on internal port
                 ←   rendered HTML
```

### Generator SSR Mode

The Next.js generator currently only runs as a static export (`next build` + `next export`). For preview, it runs in dev/SSR mode (`next dev`) on an internal port, rendering pages on request. Dev mode is used because it requires no build step — each preview request reads fresh data from disk via a dynamic route.

- The API manages the generator process lifecycle: started on first preview request, kept warm, killed after inactivity (e.g. 5 minutes).
- Preview data (profile JSON + theme config) is written to a temp directory. The generator reads from this directory.
- Each preview request gets a unique ID. The generator serves the page at a path like `/:preview_id`.
- The API proxies requests from `/api/preview/:id` to the generator's internal port, avoiding CORS issues.
- No database record for previews — they're ephemeral.

### Preview Variants

Both portfolio and targeted previews are supported:
- **Portfolio preview**: Uses current profile data.
- **Targeted preview**: Uses current profile data + selected job posting. The admin UI passes the job posting ID; the API includes job posting data in the preview payload.

### Theme Showcase Assets

Static screenshots are generated once during development using the preview system itself with sample data. Stored as optimized PNGs in `src-ui/public/showcases/{theme}-{variant}.png` (e.g. `onyx-portfolio.png`, `coral-targeted.png`).

A sample portfolio data JSON file (`src-generator/sample-data/showcase.json`) provides realistic fictional content that exercises all theme features (work history with multiple roles, projects, skills grid, education, certifications).

When a new theme is added in the future, the developer generates new screenshots as part of that work. This is a manual step documented in the generator README.

### API Endpoints

- `POST /api/preview` — Start a preview. Body: `{ theme, site_type, job_posting_id? }`. Returns `{ preview_id }`. Writes data, ensures generator is running.
- `GET /api/preview/:id` — Proxy the rendered preview page (HTML). The admin UI loads this in an iframe.
- `DELETE /api/preview/:id` — Clean up preview data (optional, data expires anyway).

### Admin UI Changes

The Sites page gets a redesigned theme selection flow:
1. **Theme gallery** replaces the current theme dropdown. Cards show the showcase screenshot, theme name, and a brief description.
2. Clicking a theme card selects it and shows a **"Preview with my data"** button.
3. Clicking preview opens a modal/panel with an iframe showing the live-rendered page. Loading state while the preview renders.
4. From the preview, user can **"Generate Site"** (proceeds with full static export as today) or **"Back to Themes"** (return to gallery).
5. For targeted sites, the job posting selector appears before the theme gallery.

## Feature 2: Photo Upload

### Profile Photo Storage

- New nullable column `photo_path` on the `profiles` table (string, stores relative path like `photos/{user_id}/profile.jpg`).
- New Alembic migration for the column.

### Upload Endpoint

`POST /api/profile/photo`
- Accepts multipart file upload (single image).
- Validates: file type (JPEG, PNG, WebP), file size (max 5MB).
- Resizes to max 800px on the longest dimension (preserves aspect ratio). Uses Pillow.
- Saves to `{UPLOAD_DIR}/photos/{user_id}/profile.{ext}`. Overwrites any existing photo.
- Updates `photo_path` on the profile record.
- Returns the updated profile.

`DELETE /api/profile/photo`
- Removes the file from disk.
- Clears `photo_path` on the profile.
- Returns the updated profile.

### Generator Integration

- The portfolio data JSON gains a `photo` field (URL string or null).
- During site generation, the photo file is copied to the output directory so it's served as a static asset.
- Themes that support a photo render it (hero section, about section). Themes that don't ignore the field.
- All 5 existing themes should add photo support in their portfolio variant. Placement is theme-specific.

### Admin UI

The profile page gets a photo section at the top:
- Current photo preview (or placeholder).
- File picker button ("Upload Photo").
- Remove button (if photo exists).
- Drag-and-drop support.
- No cropping UI — users crop before uploading.

### Resume Exclusion

Resume templates deliberately skip the profile photo. This avoids bias concerns in job applications where photo-on-resume is culturally inappropriate or actively harmful.

## Feature 3: Resume Download Link on Portfolio Sites

### Data Flow

- The API adds a `has_resume` boolean to the portfolio data JSON when building the site generation payload.
- `has_resume` is true when a non-stale general resume exists for the user.
- The generator passes this field through to theme templates.

### Theme Integration

Each theme conditionally renders a "Download Resume" link when `has_resume` is true. The link points to `resume.pdf` (relative to site root — the file is already published there by the worker).

Placement is theme-specific:
- Some themes may put it in the hero/header area.
- Some in navigation.
- Some in a contact or footer section.

No link is rendered when `has_resume` is false.

## Phase 3e-B: Deployment (Separate Cycle)

Documented here for completeness. Gets its own spec and plan.

- **Dockerfile**: Add WeasyPrint system dependencies (libpango, libcairo, libgdk-pixbuf, libffi) and Pillow dependencies (libjpeg, zlib) to API container.
- **Nginx config**: Verify resume.pdf serving from output directory.
- **Docker Compose**: Full-stack smoke test — manual verification checklist.
- **README**: Update to reflect current feature set, architecture, and deployment instructions.
- **E2E documentation**: Document E2E testing as planned Phase 4 in superpowers docs.

## Future Phase: E2E Testing

Comprehensive end-to-end testing is explicitly deferred to the next phase (Phase 4). Scope includes:
- Full pipeline tests (upload → synthesize → generate → verify output)
- Cross-service integration validation
- Automated smoke tests for Docker Compose deployment

This decision keeps Phase 3e focused on features and deployment readiness. E2E testing deserves its own dedicated cycle with proper test infrastructure design.

## Testing Strategy (Phase 3e-A)

### Unit Tests
- Preview service: process lifecycle management, data preparation, cleanup
- Photo upload: file validation, resize logic, path management
- Resume link: `has_resume` flag computation (stale vs. non-stale)
- API endpoints: preview CRUD, photo upload/delete, preview proxy

### Integration Tests
- Preview flow: request preview → verify generator starts → verify proxy returns HTML
- Photo flow: upload → verify file on disk → verify profile updated → generate site → verify photo in output
- Resume link flow: generate resume → generate site → verify `has_resume` in payload

### Generator Tests
- Themes render photo when present, skip when absent
- Themes render resume link when `has_resume` true, skip when false
- Preview SSR mode renders correctly for all themes
