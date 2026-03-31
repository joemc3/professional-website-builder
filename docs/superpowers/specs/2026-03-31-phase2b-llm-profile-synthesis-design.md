# Phase 2b: LLM Integration & Profile Synthesis — Design Spec

**Date:** 2026-03-31
**Status:** Approved
**Scope:** LiteLLM integration, profile synthesis via SSE, profile editing, dynamic model selection
**Builds on:** Phase 2a (document pipeline, API key management, background jobs)
**Followed by:** Phase 3 (site generation, themes, resume PDFs)

## Overview

Phase 2b adds the AI layer. Users select an LLM provider and model, then synthesize a unified professional profile from their document repository. The profile is a structured JSON object with well-defined sections (basics, skills, experience, etc.) — any section can be empty depending on what the user's documents contain. Users can edit the profile directly (field-level or full replacement) and re-synthesize with optional free-form guidance ("emphasize my leadership experience"). Synthesis progress streams to the frontend via Server-Sent Events.

## Architecture Decisions

### LiteLLM as Unified LLM Gateway

The original design spec listed 5 separate provider SDKs. Instead, we use **LiteLLM** — a single library that abstracts all providers behind `litellm.acompletion()`. One integration handles Anthropic, OpenAI, Gemini, OpenRouter, and Ollama. This eliminates 5 client implementations and their provider-specific quirks.

LiteLLM model identifiers use the format `provider/model-name` (e.g., `anthropic/claude-sonnet-4-20250514`, `openai/gpt-4o`, `ollama/llama3`).

### Thin Wrapper, Not Abstraction Layer

The LLM service (`llm_service.py`) is a thin wrapper around LiteLLM, not an abstraction layer. It handles:
- API key decryption from the database
- Ollama URL injection (Ollama needs no key, just a base URL)
- 60-second timeout
- One retry on malformed JSON responses
- Error mapping to clean exceptions

LiteLLM handles everything else — provider routing, auth header formatting, response normalization, streaming.

### Structured JSON Profile Output

The LLM returns a JSON object matching a Pydantic-defined schema (`ProfileData`). Every section is optional — the LLM populates only what the documents support. This structured format is essential for Phase 3, where theme generators and resume builders need to programmatically access specific profile sections for targeted output.

### SSE: Status Updates Then Section Delivery

During synthesis, the API streams Server-Sent Events to the frontend. The flow is:

1. **Status phase** — while the LLM is working, send status messages ("Analyzing 12 documents...", "Synthesizing profile...")
2. **Delivery phase** — once the LLM response is complete and parsed, send each non-empty section as its own event in quick succession

The LLM call itself is not streamed section-by-section (that's fragile with JSON output). Instead, we stream the LLM response internally, parse the complete JSON at the end, then fan out only the populated sections over SSE. If the user has no certifications, the certifications event simply never arrives — no awkward empty sections.

### Dynamic Model Lists from Providers

No hardcoded model lists. When the user selects a provider and has a valid API key, the API queries the provider's model list endpoint in real time and returns available models. New models appear automatically the day they launch. For Ollama, the list reflects whatever models the user has pulled locally.

Model listing uses raw `httpx` calls to provider APIs (not LiteLLM, whose model listing is unreliable). The `test-connection` endpoint, however, routes through LiteLLM to test the full synthesis path.

## Profile Data Schema

Loosely modeled on the [JSON Resume](https://jsonresume.org/schema) schema. Every field is optional — the profile is a superset of all possible sections.

```
ProfileData:
  basics:
    name: str
    title: str
    email: str
    phone: str
    location: str
    linkedin: str
    website: str
    summary: str

  skills: list of
    category: str
    items: list of str

  experience: list of
    company: str
    title: str
    start_date: str
    end_date: str
    current: bool
    description: str
    highlights: list of str

  education: list of
    institution: str
    degree: str
    field: str
    start_date: str
    end_date: str
    notes: str

  certifications: list of
    name: str
    issuer: str
    date_obtained: str
    expiration: str
    credential_id: str

  projects: list of
    name: str
    description: str
    role: str
    technologies: list of str
    outcomes: list of str

  publications: list of
    title: str
    venue: str
    date: str
    url: str

  awards: list of
    title: str
    issuer: str
    date: str
    description: str

  volunteer: list of
    organization: str
    role: str
    start_date: str
    end_date: str
    description: str

  languages: list of
    language: str
    proficiency: str
```

All top-level sections are nullable. All fields within each section are optional strings (or optional lists). The Pydantic model enforces structure but not presence.

## Database Changes

### New Table: `profiles`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK, default uuid4 |
| `user_id` | UUID | FK -> users.id, unique (one profile per user) |
| `data` | JSONB | The `ProfileData` structure |
| `guidance` | Text | Free-form guidance from last synthesis, nullable |
| `generated_at` | DateTime(tz) | When LLM synthesis last ran |
| `created_at` | DateTime(tz) | server_default=now() |
| `updated_at` | DateTime(tz) | auto-updated |

Unique constraint on `user_id` — one profile per user. Synthesis upserts.

The `guidance` field stores the instructions from the last synthesis run so the user can see what they asked for and refine it.

### Migration: Add `selected_model` to `api_keys`

New nullable `selected_model` column (String) on the existing `api_keys` table. Stores the LiteLLM model identifier (e.g., `anthropic/claude-sonnet-4-20250514`). Set via a new endpoint, used as the default model for synthesis and connection testing.

## LLM Service

### `app/services/llm_service.py`

Thin wrapper around `litellm.acompletion()`.

**`complete(model, messages, user_id, db) -> str`**
- Decrypts the user's API key for the model's provider from the `api_keys` table
- For Ollama: sets `api_base` to the configured `OLLAMA_URL`, no key needed
- Calls `litellm.acompletion()` with 60-second timeout
- Returns the response content string
- On malformed JSON (when JSON is expected): one retry with "respond with valid JSON only" appended
- Maps LiteLLM exceptions to clean application exceptions

**`stream(model, messages, user_id, db) -> AsyncGenerator`**
- Same setup as `complete`, but yields chunks for SSE consumption
- Used during synthesis to detect progress (we stream internally, parse at end)

### Provider Key Mapping

The service extracts the provider prefix from the model string (`anthropic/claude-sonnet-4-20250514` → `anthropic`) and looks up the corresponding encrypted key. Provider names in `api_keys.provider` match LiteLLM's provider prefixes.

## Profile Synthesis

### `app/services/profile_synthesizer.py`

Orchestrates the full synthesis flow:

1. Load all documents with `status: "completed"` for the user
2. Build the LLM prompt:
   - System prompt: defines the `ProfileData` JSON schema, instructs to populate only sections supported by the documents, return valid JSON
   - User message: concatenated document texts with filename headers as context
   - If guidance provided: appended as additional instructions
3. Call `llm_service.complete()` with the user's selected model
4. Parse the JSON response, validate with Pydantic `ProfileData`
5. One retry if JSON is malformed (re-prompt including the parse error)
6. Upsert the profile record in the database

### SSE Endpoint: `POST /api/profile/synthesize`

Returns `text/event-stream`. Request body:

```json
{
  "model": "anthropic/claude-sonnet-4-20250514",
  "guidance": "emphasize leadership experience"
}
```

`model` is required — the LiteLLM model identifier to use for synthesis. The frontend pre-fills this from the user's configured provider/model settings. `guidance` is optional free-form text appended to the synthesis prompt.

Event sequence:

```
event: status
data: {"message": "Analyzing 12 documents..."}

event: status
data: {"message": "Synthesizing profile..."}

event: status
data: {"message": "Processing response..."}

event: section
data: {"section": "basics", "content": {...}}

event: section
data: {"section": "skills", "content": [...]}

event: section
data: {"section": "experience", "content": [...]}

event: complete
data: {"profile_id": "uuid"}
```

Only non-empty sections are emitted. On error:

```
event: error
data: {"message": "LLM returned invalid response after retry"}
```

## Profile CRUD Endpoints

Router: `app/routers/profile.py`, prefix `/api/profile`, all require auth.

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| `POST` | `/synthesize` | `{ model, guidance? }` | SSE stream | Synthesis with streaming progress |
| `GET` | `/` | — | `200` — full profile + metadata | 404 if no profile exists |
| `PUT` | `/` | Complete `ProfileData` | `200` — updated profile | Full replacement |
| `PATCH` | `/` | Partial `ProfileData` | `200` — updated profile | Merges provided sections into existing |

**PUT vs PATCH:** PUT replaces the entire profile data. PATCH accepts a subset of sections and merges them into the existing JSONB — only provided keys are overwritten, omitted sections are untouched.

PATCH body example (update only the summary):
```json
{
  "basics": {
    "summary": "Updated summary text here"
  }
}
```

### `app/services/profile_service.py`

Business logic for profile CRUD:
- `get_profile(db, user_id)` — fetch profile, return None if not found
- `update_profile(db, user_id, data)` — full replacement of profile data
- `patch_profile(db, user_id, patch)` — deep merge patch into existing data
- Coordinates with `profile_synthesizer` for synthesis requests

## Settings Changes

### New Endpoints

Added to `app/routers/settings.py`:

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| `GET` | `/models/{provider}` | — | `{ provider, models[] }` | Fetch live model list from provider |
| `PUT` | `/api-keys/{provider}/model` | `{ model }` | `204` | Set selected model |

`GET /models/{provider}` decrypts the user's API key and queries the provider's model list endpoint via `httpx`. For Ollama, queries `{OLLAMA_URL}/api/tags` (no key needed). Returns `{ "provider": "anthropic", "models": [{"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet 4"}, ...] }`.

### `test-connection` Refactor

The existing `POST /api/settings/test-connection` is refactored to use LiteLLM. Instead of raw HTTP calls to provider APIs, it sends a minimal prompt (`"respond with ok"`, `max_tokens=5`) through `llm_service.complete()`. This tests the full path: key decryption → LiteLLM → provider API → response.

Requires `selected_model` to be set on the provider's `api_keys` record, or a `model` field in the request body.

### Schema Updates

`APIKeyStatusResponse` gains `selected_model: str | None` so the frontend knows what model is configured for each provider.

## New Dependencies

### Production

| Package | Purpose |
|---------|---------|
| `litellm` | Unified LLM gateway — single interface for all 5 providers |

### Dev

No new dev dependencies. Existing pytest, pytest-asyncio, httpx, testcontainers cover testing needs.

## Testing Strategy

### Unit Tests

| Test file | Coverage |
|-----------|----------|
| `test_llm_service.py` | Mock LiteLLM calls. Verify key decryption, Ollama URL injection, timeout handling, retry on malformed JSON, error mapping. |
| `test_profile_synthesizer.py` | Mock `llm_service`. Verify prompt construction includes all documents + guidance. Verify JSON parsing, Pydantic validation, handling of empty sections, retry on invalid JSON. |
| `test_profile_service.py` | Mock DB. Verify get, full update, partial merge logic (PATCH overwrites only provided keys, untouched sections preserved). |
| `test_profile_schema.py` | Verify `ProfileData` validates with all sections, some sections, no sections. Verify optional fields behave correctly. |

### Integration Tests

| Test file | Coverage |
|-----------|----------|
| `test_profile_flow.py` | Upload docs → synthesize (mocked LiteLLM returning valid JSON) → verify profile stored → GET profile → PATCH a section → verify merge → re-synthesize with guidance → verify updated. |
| `test_model_list.py` | Save API key → fetch models (mocked provider response) → set selected model → verify stored → test connection (mocked LiteLLM). |

### LLM Mocking Approach

Unit and integration tests mock at the LiteLLM boundary (`litellm.acompletion`). No real LLM API calls in tests. Mocks return realistic JSON matching `ProfileData`.

### SSE Testing

Integration tests for the synthesize endpoint use `httpx` streaming to consume the SSE response, verify event sequence (status → sections → complete), and verify only non-empty sections are emitted.

## File Structure

### New Files

```
src-api/
├── app/
│   ├── models/
│   │   └── profile.py              # Profile ORM model
│   ├── routers/
│   │   └── profile.py              # Profile CRUD + SSE synthesis
│   ├── schemas/
│   │   └── profile.py              # ProfileData, synthesis request/response
│   ├── services/
│   │   ├── llm_service.py          # Thin LiteLLM wrapper
│   │   ├── profile_service.py      # Profile CRUD logic
│   │   └── profile_synthesizer.py  # Prompt building, synthesis orchestration
├── migrations/versions/
│   ├── 004_profiles.py             # profiles table
│   └── 005_api_keys_selected_model.py  # add selected_model to api_keys
└── tests/
    ├── unit/
    │   ├── test_llm_service.py
    │   ├── test_profile_synthesizer.py
    │   ├── test_profile_service.py
    │   └── test_profile_schema.py
    └── integration/
        ├── test_profile_flow.py
        └── test_model_list.py
```

### Modified Files

- `app/routers/settings.py` — add `/models/{provider}`, refactor `test-connection`, add `/api-keys/{provider}/model`
- `app/schemas/settings.py` — add model list response, update `APIKeyStatusResponse` with `selected_model`
- `app/models/__init__.py` — export Profile model
- `app/main.py` — register profile router
- `pyproject.toml` — add `litellm`

## Open Questions

None — all design decisions validated during brainstorming.
