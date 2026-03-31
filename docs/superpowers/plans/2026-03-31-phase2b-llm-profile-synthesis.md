# Phase 2b: LLM Integration & Profile Synthesis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add LLM-powered profile synthesis from the document repository, with SSE streaming, profile editing, and dynamic model selection.

**Architecture:** LiteLLM as unified LLM gateway, structured JSON profile output validated by Pydantic, SSE streaming with status-then-section delivery pattern. Thin wrapper service around LiteLLM handles key decryption and error mapping. Profile CRUD with PUT (full replace) and PATCH (deep merge).

**Tech Stack:** LiteLLM, FastAPI SSE (StreamingResponse), Pydantic v2, SQLAlchemy async, Alembic, pytest + pytest-asyncio

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src-api/app/schemas/profile.py` | Pydantic models for ProfileData and all nested sections |
| `src-api/app/models/profile.py` | SQLAlchemy ORM model for profiles table |
| `src-api/app/services/llm_service.py` | Thin LiteLLM wrapper — key decryption, completion, error mapping |
| `src-api/app/services/profile_service.py` | Profile CRUD — get, update, patch (deep merge) |
| `src-api/app/services/profile_synthesizer.py` | Prompt building, LLM orchestration, JSON parsing |
| `src-api/app/routers/profile.py` | Profile endpoints — GET, PUT, PATCH, POST /synthesize (SSE) |
| `src-api/migrations/versions/005_profiles.py` | Create profiles table |
| `src-api/migrations/versions/006_api_keys_selected_model.py` | Add selected_model column to api_keys |
| `src-api/tests/unit/test_profile_schema.py` | ProfileData validation — full, partial, empty |
| `src-api/tests/unit/test_llm_service.py` | LLM service — key decryption, provider routing, errors |
| `src-api/tests/unit/test_profile_service.py` | Profile CRUD — get, update, deep merge |
| `src-api/tests/unit/test_profile_synthesizer.py` | Prompt construction, JSON parsing, retry logic |
| `src-api/tests/integration/test_profile_flow.py` | End-to-end profile synthesis and editing |
| `src-api/tests/integration/test_model_list.py` | Model listing, selection, test-connection via LiteLLM |

### Modified Files

| File | Change |
|------|--------|
| `src-api/pyproject.toml` | Add `litellm` dependency |
| `src-api/app/models/__init__.py` | Export Profile model |
| `src-api/app/models/api_key.py` | Add `selected_model` column |
| `src-api/app/main.py` | Register profile router |
| `src-api/app/routers/settings.py` | Add `/models/{provider}`, `/api-keys/{provider}/model`, refactor `test-connection` |
| `src-api/app/schemas/settings.py` | Add ModelListResponse, ModelSelectRequest, update APIKeyStatusResponse |
| `src-api/CLAUDE.md` | Update with Phase 2b capabilities |

---

### Task 1: Add LiteLLM Dependency

**Files:**
- Modify: `src-api/pyproject.toml`

- [ ] **Step 1: Add litellm to dependencies**

In `src-api/pyproject.toml`, add `litellm` to the `dependencies` list:

```toml
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.34.0",
    "sqlalchemy[asyncio]>=2.0.36",
    "asyncpg>=0.30.0",
    "alembic>=1.14.0",
    "pydantic-settings>=2.7.0",
    "python-jose[cryptography]>=3.3.0",
    "bcrypt>=4.0.0",
    "python-multipart>=0.0.18",
    "httpx>=0.28.0",
    "email-validator>=2.3.0",
    "arq>=0.26.0",
    "cryptography>=44.0.0",
    "markdown>=3.7",
    "beautifulsoup4>=4.12.0",
    "python-docx>=1.1.0",
    "pymupdf>=1.25.0",
    "openpyxl>=3.1.0",
    "python-pptx>=1.0.0",
    "litellm>=1.60.0",
]
```

- [ ] **Step 2: Lock dependencies**

Run:
```bash
cd src-api && uv lock
```

Expected: `uv.lock` updated with litellm and its transitive dependencies.

- [ ] **Step 3: Verify import works**

Run:
```bash
cd src-api && uv run python -c "import litellm; print(litellm.__version__)"
```

Expected: Prints the litellm version number.

- [ ] **Step 4: Commit**

```bash
cd src-api
git add pyproject.toml uv.lock
git commit -m "Add litellm dependency for unified LLM gateway"
```

---

### Task 2: Profile Data Schema (Pydantic Models)

**Files:**
- Create: `src-api/app/schemas/profile.py`
- Create: `src-api/tests/unit/test_profile_schema.py`

- [ ] **Step 1: Write the failing tests for ProfileData**

Create `src-api/tests/unit/test_profile_schema.py`:

```python
import pytest

from app.schemas.profile import (
    Award,
    Basics,
    Certification,
    Education,
    Experience,
    LanguageSkill,
    ProfileData,
    Project,
    Publication,
    Skill,
    Volunteer,
)


class TestProfileDataValidation:
    def test_empty_profile_is_valid(self):
        """All sections are optional — an empty profile is valid."""
        profile = ProfileData()
        assert profile.basics is None
        assert profile.skills is None
        assert profile.experience is None

    def test_full_profile_is_valid(self):
        """A profile with every section populated validates correctly."""
        profile = ProfileData(
            basics=Basics(
                name="Jane Doe",
                title="Senior Engineer",
                email="jane@example.com",
                phone="555-0100",
                location="San Francisco, CA",
                linkedin="linkedin.com/in/janedoe",
                website="janedoe.dev",
                summary="Experienced engineer with 10 years in distributed systems.",
            ),
            skills=[
                Skill(category="Languages", items=["Python", "Go", "TypeScript"]),
                Skill(category="Tools", items=["Docker", "Kubernetes"]),
            ],
            experience=[
                Experience(
                    company="Acme Corp",
                    title="Staff Engineer",
                    start_date="2020-01",
                    end_date=None,
                    current=True,
                    description="Leading platform team.",
                    highlights=["Built CI/CD pipeline", "Reduced deploy time 80%"],
                ),
            ],
            education=[
                Education(
                    institution="MIT",
                    degree="BS",
                    field="Computer Science",
                    start_date="2008",
                    end_date="2012",
                    notes=None,
                ),
            ],
            certifications=[
                Certification(
                    name="AWS Solutions Architect",
                    issuer="Amazon",
                    date_obtained="2023-03",
                    expiration="2026-03",
                    credential_id="ABC123",
                ),
            ],
            projects=[
                Project(
                    name="Open Source Router",
                    description="High-performance HTTP router.",
                    role="Creator & maintainer",
                    technologies=["Go", "Linux"],
                    outcomes=["5k GitHub stars", "Used by 200+ companies"],
                ),
            ],
            publications=[
                Publication(
                    title="Scaling Distributed Systems",
                    venue="ACM Queue",
                    date="2022-06",
                    url="https://example.com/paper",
                ),
            ],
            awards=[
                Award(
                    title="Engineer of the Year",
                    issuer="Acme Corp",
                    date="2023",
                    description="For platform reliability improvements.",
                ),
            ],
            volunteer=[
                Volunteer(
                    organization="Code for America",
                    role="Mentor",
                    start_date="2019",
                    end_date="2021",
                    description="Mentored junior developers.",
                ),
            ],
            languages=[
                LanguageSkill(language="English", proficiency="Native"),
                LanguageSkill(language="Spanish", proficiency="Conversational"),
            ],
        )
        assert profile.basics.name == "Jane Doe"
        assert len(profile.skills) == 2
        assert len(profile.experience) == 1
        assert profile.experience[0].current is True
        assert len(profile.certifications) == 1
        assert len(profile.projects) == 1
        assert len(profile.publications) == 1
        assert len(profile.awards) == 1
        assert len(profile.volunteer) == 1
        assert len(profile.languages) == 2

    def test_partial_profile_only_basics_and_skills(self):
        """A profile with only basics and skills, everything else null."""
        profile = ProfileData(
            basics=Basics(name="John", summary="Developer"),
            skills=[Skill(category="Languages", items=["Python"])],
        )
        assert profile.basics.name == "John"
        assert profile.basics.title is None
        assert profile.basics.email is None
        assert profile.education is None
        assert profile.certifications is None
        assert profile.projects is None

    def test_profile_serialization_excludes_none(self):
        """model_dump(exclude_none=True) omits null sections."""
        profile = ProfileData(
            basics=Basics(name="Jane"),
        )
        data = profile.model_dump(exclude_none=True)
        assert "basics" in data
        assert "skills" not in data
        assert "experience" not in data

    def test_profile_from_dict(self):
        """ProfileData can be constructed from a raw dict (LLM JSON output)."""
        raw = {
            "basics": {"name": "Jane", "title": "Engineer"},
            "skills": [{"category": "Tools", "items": ["Git"]}],
        }
        profile = ProfileData(**raw)
        assert profile.basics.name == "Jane"
        assert profile.skills[0].items == ["Git"]

    def test_experience_defaults(self):
        """Experience fields default to None, current defaults to None."""
        exp = Experience(company="Acme", title="Engineer")
        assert exp.start_date is None
        assert exp.end_date is None
        assert exp.current is None
        assert exp.highlights is None


class TestBasicsModel:
    def test_all_fields_optional(self):
        """Every field in Basics is optional."""
        basics = Basics()
        assert basics.name is None
        assert basics.title is None
        assert basics.email is None
        assert basics.phone is None
        assert basics.location is None
        assert basics.linkedin is None
        assert basics.website is None
        assert basics.summary is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd src-api && uv run pytest tests/unit/test_profile_schema.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.schemas.profile'`

- [ ] **Step 3: Implement ProfileData and all nested models**

Create `src-api/app/schemas/profile.py`:

```python
from pydantic import BaseModel


class Basics(BaseModel):
    name: str | None = None
    title: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    linkedin: str | None = None
    website: str | None = None
    summary: str | None = None


class Skill(BaseModel):
    category: str | None = None
    items: list[str] | None = None


class Experience(BaseModel):
    company: str | None = None
    title: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    current: bool | None = None
    description: str | None = None
    highlights: list[str] | None = None


class Education(BaseModel):
    institution: str | None = None
    degree: str | None = None
    field: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    notes: str | None = None


class Certification(BaseModel):
    name: str | None = None
    issuer: str | None = None
    date_obtained: str | None = None
    expiration: str | None = None
    credential_id: str | None = None


class Project(BaseModel):
    name: str | None = None
    description: str | None = None
    role: str | None = None
    technologies: list[str] | None = None
    outcomes: list[str] | None = None


class Publication(BaseModel):
    title: str | None = None
    venue: str | None = None
    date: str | None = None
    url: str | None = None


class Award(BaseModel):
    title: str | None = None
    issuer: str | None = None
    date: str | None = None
    description: str | None = None


class Volunteer(BaseModel):
    organization: str | None = None
    role: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None


class LanguageSkill(BaseModel):
    language: str | None = None
    proficiency: str | None = None


class ProfileData(BaseModel):
    basics: Basics | None = None
    skills: list[Skill] | None = None
    experience: list[Experience] | None = None
    education: list[Education] | None = None
    certifications: list[Certification] | None = None
    projects: list[Project] | None = None
    publications: list[Publication] | None = None
    awards: list[Award] | None = None
    volunteer: list[Volunteer] | None = None
    languages: list[LanguageSkill] | None = None


class SynthesizeRequest(BaseModel):
    model: str
    guidance: str | None = None


class ProfileResponse(BaseModel):
    id: str
    data: ProfileData
    guidance: str | None
    generated_at: str | None
    created_at: str
    updated_at: str
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd src-api && uv run pytest tests/unit/test_profile_schema.py -v
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd src-api
git add app/schemas/profile.py tests/unit/test_profile_schema.py
git commit -m "Add ProfileData Pydantic schema with unit tests"
```

---

### Task 3: Profile ORM Model and Database Migrations

**Files:**
- Create: `src-api/app/models/profile.py`
- Modify: `src-api/app/models/__init__.py`
- Modify: `src-api/app/models/api_key.py`
- Create: `src-api/migrations/versions/005_profiles.py`
- Create: `src-api/migrations/versions/006_api_keys_selected_model.py`

- [ ] **Step 1: Create Profile ORM model**

Create `src-api/app/models/profile.py`:

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.user import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    guidance: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 2: Add `selected_model` to APIKey model**

In `src-api/app/models/api_key.py`, add the `selected_model` column after the `nonce` column:

```python
    nonce: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    selected_model: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 3: Update models __init__.py**

Update `src-api/app/models/__init__.py`:

```python
from app.models.user import Base, User
from app.models.document import Document
from app.models.api_key import APIKey
from app.models.profile import Profile

__all__ = ["Base", "User", "Document", "APIKey", "Profile"]
```

- [ ] **Step 4: Create profiles migration**

Create `src-api/migrations/versions/005_profiles.py`:

```python
"""Create profiles table

Revision ID: 005
Revises: 004
Create Date: 2026-03-31
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column("id", sa.UUID(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("guidance", sa.Text(), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_profiles_user_id"),
    )
    op.create_index("ix_profiles_user_id", "profiles", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_profiles_user_id")
    op.drop_table("profiles")
```

- [ ] **Step 5: Create api_keys selected_model migration**

Create `src-api/migrations/versions/006_api_keys_selected_model.py`:

```python
"""Add selected_model column to api_keys

Revision ID: 006
Revises: 005
Create Date: 2026-03-31
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("api_keys", sa.Column("selected_model", sa.String(200), nullable=True))


def downgrade() -> None:
    op.drop_column("api_keys", "selected_model")
```

- [ ] **Step 6: Verify migrations work**

Run:
```bash
cd src-api && uv run pytest tests/unit/test_profile_schema.py -v
```

Expected: All tests still pass (models don't affect unit tests but import chain should be clean).

- [ ] **Step 7: Commit**

```bash
cd src-api
git add app/models/profile.py app/models/__init__.py app/models/api_key.py migrations/versions/005_profiles.py migrations/versions/006_api_keys_selected_model.py
git commit -m "Add Profile model and migrations for profiles table and selected_model"
```

---

### Task 4: LLM Service

**Files:**
- Create: `src-api/app/services/llm_service.py`
- Create: `src-api/tests/unit/test_llm_service.py`

- [ ] **Step 1: Write the failing tests for LLM service**

Create `src-api/tests/unit/test_llm_service.py`:

```python
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.llm_service import (
    LLMError,
    complete,
    extract_provider,
    get_api_key_for_provider,
    stream,
)


class TestExtractProvider:
    def test_anthropic_model(self):
        assert extract_provider("anthropic/claude-sonnet-4-20250514") == "anthropic"

    def test_openai_model(self):
        assert extract_provider("openai/gpt-4o") == "openai"

    def test_ollama_model(self):
        assert extract_provider("ollama/llama3") == "ollama"

    def test_openrouter_model(self):
        assert extract_provider("openrouter/meta-llama/llama-3-70b") == "openrouter"

    def test_gemini_model(self):
        assert extract_provider("gemini/gemini-1.5-pro") == "gemini"

    def test_no_slash_raises(self):
        with pytest.raises(LLMError, match="Invalid model format"):
            extract_provider("gpt-4o")


class TestGetApiKey:
    @pytest.mark.asyncio
    async def test_decrypts_stored_key(self):
        mock_db = AsyncMock()
        mock_key = MagicMock()
        mock_key.encrypted_key = b"encrypted"
        mock_key.nonce = b"nonce12bytes"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_key
        mock_db.execute.return_value = mock_result

        user_id = uuid.uuid4()
        with patch("app.services.llm_service.decrypt", return_value="sk-test-key-123") as mock_decrypt:
            key = await get_api_key_for_provider(mock_db, user_id, "anthropic")

        assert key == "sk-test-key-123"
        mock_decrypt.assert_called_once_with(b"encrypted", b"nonce12bytes")

    @pytest.mark.asyncio
    async def test_ollama_returns_none(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()
        key = await get_api_key_for_provider(mock_db, user_id, "ollama")
        assert key is None

    @pytest.mark.asyncio
    async def test_missing_key_raises(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        user_id = uuid.uuid4()
        with pytest.raises(LLMError, match="No API key configured for anthropic"):
            await get_api_key_for_provider(mock_db, user_id, "anthropic")


class TestComplete:
    @pytest.mark.asyncio
    async def test_calls_litellm_with_correct_params(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()
        messages = [{"role": "user", "content": "hello"}]

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "world"

        with (
            patch("app.services.llm_service.get_api_key_for_provider", new_callable=AsyncMock, return_value="sk-key"),
            patch("app.services.llm_service.litellm") as mock_litellm,
        ):
            mock_litellm.acompletion = AsyncMock(return_value=mock_response)
            result = await complete("anthropic/claude-sonnet-4-20250514", messages, user_id, mock_db)

        assert result == "world"
        mock_litellm.acompletion.assert_called_once()
        call_kwargs = mock_litellm.acompletion.call_args.kwargs
        assert call_kwargs["model"] == "anthropic/claude-sonnet-4-20250514"
        assert call_kwargs["messages"] == messages
        assert call_kwargs["api_key"] == "sk-key"
        assert call_kwargs["timeout"] == 60

    @pytest.mark.asyncio
    async def test_ollama_passes_api_base(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()
        messages = [{"role": "user", "content": "hello"}]

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "ok"

        with (
            patch("app.services.llm_service.get_api_key_for_provider", new_callable=AsyncMock, return_value=None),
            patch("app.services.llm_service.litellm") as mock_litellm,
            patch("app.services.llm_service.settings") as mock_settings,
        ):
            mock_settings.ollama_url = "http://ollama.lan:11434"
            mock_litellm.acompletion = AsyncMock(return_value=mock_response)
            result = await complete("ollama/llama3", messages, user_id, mock_db)

        assert result == "ok"
        call_kwargs = mock_litellm.acompletion.call_args.kwargs
        assert call_kwargs["api_base"] == "http://ollama.lan:11434"

    @pytest.mark.asyncio
    async def test_litellm_error_maps_to_llm_error(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()
        messages = [{"role": "user", "content": "hello"}]

        with (
            patch("app.services.llm_service.get_api_key_for_provider", new_callable=AsyncMock, return_value="sk-key"),
            patch("app.services.llm_service.litellm") as mock_litellm,
        ):
            mock_litellm.acompletion = AsyncMock(side_effect=Exception("API rate limit exceeded"))
            with pytest.raises(LLMError, match="API rate limit exceeded"):
                await complete("anthropic/claude-sonnet-4-20250514", messages, user_id, mock_db)
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd src-api && uv run pytest tests/unit/test_llm_service.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.llm_service'`

- [ ] **Step 3: Implement the LLM service**

Create `src-api/app/services/llm_service.py`:

```python
import uuid
from collections.abc import AsyncGenerator

import litellm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.api_key import APIKey
from app.services.encryption_service import decrypt


class LLMError(Exception):
    """Raised when an LLM operation fails."""


def extract_provider(model: str) -> str:
    """Extract the provider prefix from a LiteLLM model string.

    Examples: 'anthropic/claude-sonnet-4-20250514' -> 'anthropic'
              'openrouter/meta-llama/llama-3-70b' -> 'openrouter'
    """
    if "/" not in model:
        raise LLMError(f"Invalid model format: '{model}'. Expected 'provider/model-name'.")
    return model.split("/", 1)[0]


async def get_api_key_for_provider(db: AsyncSession, user_id: uuid.UUID, provider: str) -> str | None:
    """Decrypt and return the user's API key for a provider. Returns None for Ollama."""
    if provider == "ollama":
        return None

    result = await db.execute(
        select(APIKey).where(APIKey.user_id == user_id, APIKey.provider == provider)
    )
    key_record = result.scalar_one_or_none()
    if key_record is None:
        raise LLMError(f"No API key configured for {provider}")

    return decrypt(key_record.encrypted_key, key_record.nonce)


async def complete(
    model: str,
    messages: list[dict],
    user_id: uuid.UUID,
    db: AsyncSession,
    timeout: int = 60,
) -> str:
    """Send a completion request via LiteLLM and return the response content."""
    provider = extract_provider(model)
    api_key = await get_api_key_for_provider(db, user_id, provider)

    kwargs: dict = {
        "model": model,
        "messages": messages,
        "timeout": timeout,
    }

    if api_key is not None:
        kwargs["api_key"] = api_key

    if provider == "ollama":
        kwargs["api_base"] = settings.ollama_url

    try:
        response = await litellm.acompletion(**kwargs)
        return response.choices[0].message.content
    except Exception as e:
        raise LLMError(str(e)) from e


async def stream(
    model: str,
    messages: list[dict],
    user_id: uuid.UUID,
    db: AsyncSession,
    timeout: int = 60,
) -> AsyncGenerator[str, None]:
    """Stream a completion request via LiteLLM, yielding content chunks."""
    provider = extract_provider(model)
    api_key = await get_api_key_for_provider(db, user_id, provider)

    kwargs: dict = {
        "model": model,
        "messages": messages,
        "timeout": timeout,
        "stream": True,
    }

    if api_key is not None:
        kwargs["api_key"] = api_key

    if provider == "ollama":
        kwargs["api_base"] = settings.ollama_url

    try:
        response = await litellm.acompletion(**kwargs)
        async for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
    except Exception as e:
        raise LLMError(str(e)) from e
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd src-api && uv run pytest tests/unit/test_llm_service.py -v
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd src-api
git add app/services/llm_service.py tests/unit/test_llm_service.py
git commit -m "Add LLM service as thin LiteLLM wrapper with unit tests"
```

---

### Task 5: Profile Service (CRUD)

**Files:**
- Create: `src-api/app/services/profile_service.py`
- Create: `src-api/tests/unit/test_profile_service.py`

- [ ] **Step 1: Write the failing tests**

Create `src-api/tests/unit/test_profile_service.py`:

```python
import copy
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.profile_service import get_profile, patch_profile, update_profile


class TestGetProfile:
    @pytest.mark.asyncio
    async def test_returns_profile_when_exists(self):
        mock_profile = MagicMock()
        mock_profile.data = {"basics": {"name": "Jane"}}

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_profile

        db = AsyncMock()
        db.execute.return_value = mock_result

        result = await get_profile(db, uuid.uuid4())
        assert result is mock_profile

    @pytest.mark.asyncio
    async def test_returns_none_when_no_profile(self):
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None

        db = AsyncMock()
        db.execute.return_value = mock_result

        result = await get_profile(db, uuid.uuid4())
        assert result is None


class TestUpdateProfile:
    @pytest.mark.asyncio
    async def test_replaces_existing_profile_data(self):
        mock_profile = MagicMock()
        mock_profile.data = {"basics": {"name": "Old Name"}}

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_profile

        db = AsyncMock()
        db.execute.return_value = mock_result

        new_data = {"basics": {"name": "New Name", "title": "Engineer"}}
        result = await update_profile(db, uuid.uuid4(), new_data)

        assert result.data == new_data
        db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_creates_profile_if_none_exists(self):
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None

        db = AsyncMock()
        db.execute.return_value = mock_result

        new_data = {"basics": {"name": "Jane"}}
        result = await update_profile(db, uuid.uuid4(), new_data)

        db.add.assert_called_once()
        db.commit.assert_called_once()


class TestPatchProfile:
    @pytest.mark.asyncio
    async def test_merges_basics_field(self):
        existing_data = {
            "basics": {"name": "Jane", "title": "Engineer", "email": "jane@test.com"},
            "skills": [{"category": "Languages", "items": ["Python"]}],
        }
        mock_profile = MagicMock()
        mock_profile.data = copy.deepcopy(existing_data)

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_profile

        db = AsyncMock()
        db.execute.return_value = mock_result

        patch = {"basics": {"summary": "Updated summary"}}
        result = await patch_profile(db, uuid.uuid4(), patch)

        merged = result.data
        assert merged["basics"]["name"] == "Jane"
        assert merged["basics"]["title"] == "Engineer"
        assert merged["basics"]["summary"] == "Updated summary"
        assert merged["skills"] == existing_data["skills"]

    @pytest.mark.asyncio
    async def test_replaces_list_sections(self):
        """List sections (skills, experience) are replaced entirely, not merged item-by-item."""
        existing_data = {
            "skills": [{"category": "Languages", "items": ["Python", "Go"]}],
        }
        mock_profile = MagicMock()
        mock_profile.data = copy.deepcopy(existing_data)

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_profile

        db = AsyncMock()
        db.execute.return_value = mock_result

        patch = {"skills": [{"category": "Tools", "items": ["Docker"]}]}
        result = await patch_profile(db, uuid.uuid4(), patch)

        assert result.data["skills"] == [{"category": "Tools", "items": ["Docker"]}]

    @pytest.mark.asyncio
    async def test_patch_no_existing_profile_raises(self):
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None

        db = AsyncMock()
        db.execute.return_value = mock_result

        with pytest.raises(ValueError, match="No profile exists"):
            await patch_profile(db, uuid.uuid4(), {"basics": {"name": "Jane"}})

    @pytest.mark.asyncio
    async def test_untouched_sections_preserved(self):
        existing_data = {
            "basics": {"name": "Jane"},
            "education": [{"institution": "MIT"}],
            "certifications": [{"name": "AWS"}],
        }
        mock_profile = MagicMock()
        mock_profile.data = copy.deepcopy(existing_data)

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_profile

        db = AsyncMock()
        db.execute.return_value = mock_result

        patch = {"basics": {"title": "Staff Engineer"}}
        result = await patch_profile(db, uuid.uuid4(), patch)

        assert result.data["education"] == [{"institution": "MIT"}]
        assert result.data["certifications"] == [{"name": "AWS"}]
        assert result.data["basics"]["name"] == "Jane"
        assert result.data["basics"]["title"] == "Staff Engineer"
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd src-api && uv run pytest tests/unit/test_profile_service.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.profile_service'`

- [ ] **Step 3: Implement the profile service**

Create `src-api/app/services/profile_service.py`:

```python
import copy
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profile import Profile


# Sections where the value is a dict (merged key-by-key on patch)
DICT_SECTIONS = {"basics"}


async def get_profile(db: AsyncSession, user_id: uuid.UUID) -> Profile | None:
    result = await db.execute(
        select(Profile).where(Profile.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def update_profile(db: AsyncSession, user_id: uuid.UUID, data: dict) -> Profile:
    profile = await get_profile(db, user_id)
    if profile is None:
        profile = Profile(user_id=user_id, data=data)
        db.add(profile)
    else:
        profile.data = data
    await db.commit()
    await db.refresh(profile)
    return profile


async def patch_profile(db: AsyncSession, user_id: uuid.UUID, patch: dict) -> Profile:
    profile = await get_profile(db, user_id)
    if profile is None:
        raise ValueError("No profile exists to patch")

    merged = copy.deepcopy(profile.data)

    for key, value in patch.items():
        if key in DICT_SECTIONS and key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
            merged[key] = {**merged[key], **value}
        else:
            merged[key] = value

    profile.data = merged
    await db.commit()
    await db.refresh(profile)
    return profile
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd src-api && uv run pytest tests/unit/test_profile_service.py -v
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd src-api
git add app/services/profile_service.py tests/unit/test_profile_service.py
git commit -m "Add profile service with CRUD and deep merge (TDD)"
```

---

### Task 6: Profile Synthesizer

**Files:**
- Create: `src-api/app/services/profile_synthesizer.py`
- Create: `src-api/tests/unit/test_profile_synthesizer.py`

- [ ] **Step 1: Write the failing tests**

Create `src-api/tests/unit/test_profile_synthesizer.py`:

```python
import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.profile import ProfileData
from app.services.profile_synthesizer import (
    build_prompt,
    parse_profile_response,
    synthesize_profile,
)


SAMPLE_PROFILE_JSON = json.dumps({
    "basics": {
        "name": "Jane Doe",
        "title": "Senior Software Engineer",
        "summary": "10 years experience in distributed systems.",
    },
    "skills": [
        {"category": "Languages", "items": ["Python", "Go"]},
    ],
    "experience": [
        {
            "company": "Acme Corp",
            "title": "Staff Engineer",
            "start_date": "2020-01",
            "current": True,
            "description": "Leading platform team.",
            "highlights": ["Built CI/CD pipeline"],
        },
    ],
    "education": [
        {
            "institution": "MIT",
            "degree": "BS",
            "field": "Computer Science",
        },
    ],
})

SAMPLE_PARTIAL_JSON = json.dumps({
    "basics": {"name": "John", "summary": "A developer."},
    "skills": [{"category": "Languages", "items": ["JavaScript"]}],
})


class TestBuildPrompt:
    def test_includes_all_documents(self):
        documents = [
            MagicMock(filename="resume.pdf", parsed_text="I am Jane Doe, a senior engineer."),
            MagicMock(filename="projects.md", parsed_text="Project Alpha: Built a distributed cache."),
        ]
        messages = build_prompt(documents, guidance=None)

        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert "ProfileData" in messages[0]["content"] or "JSON" in messages[0]["content"]
        assert messages[1]["role"] == "user"
        assert "resume.pdf" in messages[1]["content"]
        assert "projects.md" in messages[1]["content"]
        assert "I am Jane Doe" in messages[1]["content"]
        assert "Project Alpha" in messages[1]["content"]

    def test_includes_guidance_when_provided(self):
        documents = [MagicMock(filename="resume.pdf", parsed_text="Some text.")]
        messages = build_prompt(documents, guidance="Emphasize leadership experience")

        user_content = messages[1]["content"]
        assert "Emphasize leadership experience" in user_content

    def test_no_guidance_no_extra_instructions(self):
        documents = [MagicMock(filename="resume.pdf", parsed_text="Some text.")]
        messages = build_prompt(documents, guidance=None)

        user_content = messages[1]["content"]
        assert "Emphasize" not in user_content

    def test_empty_documents_raises(self):
        with pytest.raises(ValueError, match="No documents"):
            build_prompt([], guidance=None)


class TestParseProfileResponse:
    def test_parses_valid_json(self):
        profile = parse_profile_response(SAMPLE_PROFILE_JSON)
        assert isinstance(profile, ProfileData)
        assert profile.basics.name == "Jane Doe"
        assert len(profile.skills) == 1
        assert len(profile.experience) == 1

    def test_parses_partial_json(self):
        profile = parse_profile_response(SAMPLE_PARTIAL_JSON)
        assert profile.basics.name == "John"
        assert profile.education is None
        assert profile.certifications is None

    def test_invalid_json_raises(self):
        with pytest.raises(ValueError, match="Invalid JSON"):
            parse_profile_response("this is not json {{{")

    def test_extracts_json_from_markdown_code_block(self):
        """LLMs sometimes wrap JSON in markdown code blocks."""
        wrapped = f"```json\n{SAMPLE_PARTIAL_JSON}\n```"
        profile = parse_profile_response(wrapped)
        assert profile.basics.name == "John"


class TestSynthesizeProfile:
    @pytest.mark.asyncio
    async def test_full_synthesis_flow(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        mock_doc = MagicMock()
        mock_doc.filename = "resume.pdf"
        mock_doc.parsed_text = "Jane Doe, Senior Engineer at Acme."

        mock_doc_result = MagicMock()
        mock_doc_result.scalars.return_value.all.return_value = [mock_doc]
        mock_db.execute.return_value = mock_doc_result

        with (
            patch("app.services.profile_synthesizer.llm_service") as mock_llm,
            patch("app.services.profile_synthesizer.profile_service") as mock_ps,
        ):
            mock_llm.complete = AsyncMock(return_value=SAMPLE_PROFILE_JSON)
            mock_ps.update_profile = AsyncMock(return_value=MagicMock())

            profile_data, profile = await synthesize_profile(
                db=mock_db,
                user_id=user_id,
                model="anthropic/claude-sonnet-4-20250514",
                guidance=None,
            )

        assert profile_data.basics.name == "Jane Doe"
        mock_llm.complete.assert_called_once()
        mock_ps.update_profile.assert_called_once()

    @pytest.mark.asyncio
    async def test_retries_on_invalid_json(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        mock_doc = MagicMock()
        mock_doc.filename = "resume.pdf"
        mock_doc.parsed_text = "Some text."

        mock_doc_result = MagicMock()
        mock_doc_result.scalars.return_value.all.return_value = [mock_doc]
        mock_db.execute.return_value = mock_doc_result

        with (
            patch("app.services.profile_synthesizer.llm_service") as mock_llm,
            patch("app.services.profile_synthesizer.profile_service") as mock_ps,
        ):
            mock_llm.complete = AsyncMock(
                side_effect=["not valid json", SAMPLE_PARTIAL_JSON]
            )
            mock_ps.update_profile = AsyncMock(return_value=MagicMock())

            profile_data, profile = await synthesize_profile(
                db=mock_db,
                user_id=user_id,
                model="anthropic/claude-sonnet-4-20250514",
                guidance=None,
            )

        assert profile_data.basics.name == "John"
        assert mock_llm.complete.call_count == 2

    @pytest.mark.asyncio
    async def test_raises_after_retry_exhausted(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        mock_doc = MagicMock()
        mock_doc.filename = "resume.pdf"
        mock_doc.parsed_text = "Some text."

        mock_doc_result = MagicMock()
        mock_doc_result.scalars.return_value.all.return_value = [mock_doc]
        mock_db.execute.return_value = mock_doc_result

        with patch("app.services.profile_synthesizer.llm_service") as mock_llm:
            mock_llm.complete = AsyncMock(
                side_effect=["bad json", "still bad json"]
            )

            with pytest.raises(ValueError, match="Invalid JSON"):
                await synthesize_profile(
                    db=mock_db,
                    user_id=user_id,
                    model="anthropic/claude-sonnet-4-20250514",
                    guidance=None,
                )

    @pytest.mark.asyncio
    async def test_no_completed_documents_raises(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        mock_doc_result = MagicMock()
        mock_doc_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_doc_result

        with pytest.raises(ValueError, match="No documents"):
            await synthesize_profile(
                db=mock_db,
                user_id=user_id,
                model="anthropic/claude-sonnet-4-20250514",
                guidance=None,
            )

    @pytest.mark.asyncio
    async def test_stores_guidance(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        mock_doc = MagicMock()
        mock_doc.filename = "resume.pdf"
        mock_doc.parsed_text = "Content."

        mock_doc_result = MagicMock()
        mock_doc_result.scalars.return_value.all.return_value = [mock_doc]
        mock_db.execute.return_value = mock_doc_result

        with (
            patch("app.services.profile_synthesizer.llm_service") as mock_llm,
            patch("app.services.profile_synthesizer.profile_service") as mock_ps,
        ):
            mock_llm.complete = AsyncMock(return_value=SAMPLE_PARTIAL_JSON)
            mock_profile = MagicMock()
            mock_ps.update_profile = AsyncMock(return_value=mock_profile)

            await synthesize_profile(
                db=mock_db,
                user_id=user_id,
                model="anthropic/claude-sonnet-4-20250514",
                guidance="Focus on leadership",
            )

        update_call = mock_ps.update_profile.call_args
        assert update_call is not None
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd src-api && uv run pytest tests/unit/test_profile_synthesizer.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.profile_synthesizer'`

- [ ] **Step 3: Implement the profile synthesizer**

Create `src-api/app/services/profile_synthesizer.py`:

```python
import json
import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.schemas.profile import ProfileData
from app.services import llm_service, profile_service

SYSTEM_PROMPT = """You are a professional profile synthesizer. You will receive a collection of professional documents (resumes, project descriptions, certifications, etc.) and must synthesize them into a single unified professional profile.

Return ONLY valid JSON matching this exact structure. Every field is optional — only include sections and fields that are supported by the provided documents. Do not invent information.

{
  "basics": {
    "name": "string",
    "title": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin": "string",
    "website": "string",
    "summary": "string"
  },
  "skills": [{"category": "string", "items": ["string"]}],
  "experience": [{
    "company": "string",
    "title": "string",
    "start_date": "string",
    "end_date": "string",
    "current": true/false,
    "description": "string",
    "highlights": ["string"]
  }],
  "education": [{
    "institution": "string",
    "degree": "string",
    "field": "string",
    "start_date": "string",
    "end_date": "string",
    "notes": "string"
  }],
  "certifications": [{
    "name": "string",
    "issuer": "string",
    "date_obtained": "string",
    "expiration": "string",
    "credential_id": "string"
  }],
  "projects": [{
    "name": "string",
    "description": "string",
    "role": "string",
    "technologies": ["string"],
    "outcomes": ["string"]
  }],
  "publications": [{
    "title": "string",
    "venue": "string",
    "date": "string",
    "url": "string"
  }],
  "awards": [{
    "title": "string",
    "issuer": "string",
    "date": "string",
    "description": "string"
  }],
  "volunteer": [{
    "organization": "string",
    "role": "string",
    "start_date": "string",
    "end_date": "string",
    "description": "string"
  }],
  "languages": [{
    "language": "string",
    "proficiency": "string"
  }]
}

Omit any section entirely if the documents provide no information for it. Do not include empty arrays or objects. Return ONLY the JSON object, no markdown formatting, no explanation."""


def build_prompt(documents: list, guidance: str | None) -> list[dict]:
    """Build the LLM messages from documents and optional guidance."""
    if not documents:
        raise ValueError("No documents available for synthesis")

    doc_texts = []
    for doc in documents:
        doc_texts.append(f"--- Document: {doc.filename} ---\n{doc.parsed_text}")

    user_content = "Here are the professional documents to synthesize:\n\n" + "\n\n".join(doc_texts)

    if guidance:
        user_content += f"\n\nAdditional instructions: {guidance}"

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]


def parse_profile_response(response_text: str) -> ProfileData:
    """Parse an LLM response into a ProfileData object."""
    text = response_text.strip()

    # Strip markdown code blocks if present
    code_block_match = re.match(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if code_block_match:
        text = code_block_match.group(1).strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in LLM response: {e}") from e

    return ProfileData(**data)


async def synthesize_profile(
    db: AsyncSession,
    user_id: uuid.UUID,
    model: str,
    guidance: str | None,
) -> tuple[ProfileData, object]:
    """Synthesize a profile from the user's documents via LLM."""
    # Load completed documents
    result = await db.execute(
        select(Document).where(
            Document.user_id == user_id,
            Document.status == "completed",
        )
    )
    documents = result.scalars().all()

    if not documents:
        raise ValueError("No documents available for synthesis")

    messages = build_prompt(documents, guidance)

    # First attempt
    response_text = await llm_service.complete(model, messages, user_id, db)

    try:
        profile_data = parse_profile_response(response_text)
    except ValueError:
        # Retry once with correction instruction
        messages.append({"role": "assistant", "content": response_text})
        messages.append({
            "role": "user",
            "content": "Your response was not valid JSON. Please respond with ONLY valid JSON matching the schema. No markdown, no explanation.",
        })
        response_text = await llm_service.complete(model, messages, user_id, db)
        profile_data = parse_profile_response(response_text)

    # Save to database
    profile_dict = profile_data.model_dump(exclude_none=True)
    profile = await profile_service.update_profile(db, user_id, profile_dict)

    # Store guidance and generation timestamp
    profile.guidance = guidance
    profile.generated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(profile)

    return profile_data, profile
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd src-api && uv run pytest tests/unit/test_profile_synthesizer.py -v
```

Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd src-api
git add app/services/profile_synthesizer.py tests/unit/test_profile_synthesizer.py
git commit -m "Add profile synthesizer with prompt building and JSON parsing (TDD)"
```

---

### Task 7: Settings Endpoint Updates (Model List, Model Selection, test-connection Refactor)

**Files:**
- Modify: `src-api/app/schemas/settings.py`
- Modify: `src-api/app/routers/settings.py`

- [ ] **Step 1: Update settings schemas**

Replace the contents of `src-api/app/schemas/settings.py` with:

```python
from pydantic import BaseModel


class APIKeySaveRequest(BaseModel):
    provider: str
    api_key: str


class APIKeySaveResponse(BaseModel):
    provider: str
    saved: bool


class APIKeyStatusResponse(BaseModel):
    provider: str
    is_set: bool
    selected_model: str | None = None


class ModelInfo(BaseModel):
    id: str
    name: str | None = None


class ModelListResponse(BaseModel):
    provider: str
    models: list[ModelInfo]


class ModelSelectRequest(BaseModel):
    model: str


class TestConnectionRequest(BaseModel):
    provider: str
    model: str | None = None


class TestConnectionResponse(BaseModel):
    provider: str
    status: str
    message: str | None = None
```

- [ ] **Step 2: Update the settings router**

Replace the contents of `src-api/app/routers/settings.py` with:

```python
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.api_key import APIKey
from app.schemas.settings import (
    APIKeySaveRequest,
    APIKeySaveResponse,
    APIKeyStatusResponse,
    ModelInfo,
    ModelListResponse,
    ModelSelectRequest,
    TestConnectionRequest,
    TestConnectionResponse,
)
from app.services import llm_service
from app.services.encryption_service import decrypt, encrypt
from app.services.llm_service import LLMError

router = APIRouter(prefix="/api/settings", tags=["settings"])

VALID_PROVIDERS = {"anthropic", "openai", "gemini", "openrouter"}

MODEL_LIST_URLS = {
    "anthropic": ("https://api.anthropic.com/v1/models", lambda key: {"x-api-key": key, "anthropic-version": "2023-06-01"}),
    "openai": ("https://api.openai.com/v1/models", lambda key: {"Authorization": f"Bearer {key}"}),
    "gemini": (None, None),
    "openrouter": ("https://openrouter.ai/api/v1/models", lambda key: {"Authorization": f"Bearer {key}"}),
}


@router.post("/api-keys", response_model=APIKeySaveResponse, status_code=status.HTTP_201_CREATED)
async def save_api_key(
    request: APIKeySaveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if request.provider not in VALID_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Invalid provider: {request.provider}")

    encrypted_key, nonce = encrypt(request.api_key)
    user_uuid = uuid.UUID(current_user["id"])

    result = await db.execute(
        select(APIKey).where(APIKey.user_id == user_uuid, APIKey.provider == request.provider)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.encrypted_key = encrypted_key
        existing.nonce = nonce
    else:
        db.add(APIKey(
            user_id=user_uuid,
            provider=request.provider,
            encrypted_key=encrypted_key,
            nonce=nonce,
        ))

    await db.commit()
    return APIKeySaveResponse(provider=request.provider, saved=True)


@router.get("/api-keys/{provider}", response_model=APIKeyStatusResponse)
async def get_api_key_status(
    provider: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(APIKey).where(
            APIKey.user_id == uuid.UUID(current_user["id"]),
            APIKey.provider == provider,
        )
    )
    key = result.scalar_one_or_none()
    return APIKeyStatusResponse(
        provider=provider,
        is_set=key is not None,
        selected_model=key.selected_model if key else None,
    )


@router.delete("/api-keys/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    provider: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(APIKey).where(
            APIKey.user_id == uuid.UUID(current_user["id"]),
            APIKey.provider == provider,
        )
    )
    key = result.scalar_one_or_none()
    if key is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    await db.delete(key)
    await db.commit()
    return None


@router.put("/api-keys/{provider}/model", status_code=status.HTTP_204_NO_CONTENT)
async def set_selected_model(
    provider: str,
    request: ModelSelectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(APIKey).where(
            APIKey.user_id == uuid.UUID(current_user["id"]),
            APIKey.provider == provider,
        )
    )
    key = result.scalar_one_or_none()
    if key is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No API key set for {provider}")
    key.selected_model = request.model
    await db.commit()
    return None


@router.get("/models/{provider}", response_model=ModelListResponse)
async def list_models(
    provider: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user["id"])

    if provider == "ollama":
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{settings.ollama_url}/api/tags")
                resp.raise_for_status()
                data = resp.json()
                models = [
                    ModelInfo(id=m["name"], name=m.get("name"))
                    for m in data.get("models", [])
                ]
                return ModelListResponse(provider=provider, models=models)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to reach Ollama: {e}")

    if provider not in VALID_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

    result = await db.execute(
        select(APIKey).where(APIKey.user_id == user_uuid, APIKey.provider == provider)
    )
    key_record = result.scalar_one_or_none()
    if key_record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No API key set for {provider}")

    api_key = decrypt(key_record.encrypted_key, key_record.nonce)

    try:
        if provider == "gemini":
            url = f"https://generativelanguage.googleapis.com/v1/models?key={api_key}"
            headers = {}
        else:
            url, header_fn = MODEL_LIST_URLS[provider]
            headers = header_fn(api_key)

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        if provider == "anthropic":
            models = [ModelInfo(id=m["id"], name=m.get("display_name", m["id"])) for m in data.get("data", [])]
        elif provider == "openai":
            models = [ModelInfo(id=m["id"], name=m["id"]) for m in data.get("data", [])]
        elif provider == "gemini":
            models = [
                ModelInfo(id=m["name"].replace("models/", ""), name=m.get("displayName", m["name"]))
                for m in data.get("models", [])
            ]
        elif provider == "openrouter":
            models = [ModelInfo(id=m["id"], name=m.get("name", m["id"])) for m in data.get("data", [])]
        else:
            models = []

        return ModelListResponse(provider=provider, models=models)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Provider API error: HTTP {e.response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch models: {e}")


@router.post("/test-connection", response_model=TestConnectionResponse)
async def test_connection(
    request: TestConnectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_uuid = uuid.UUID(current_user["id"])

    # Determine the model to test with
    model_to_test = request.model

    if model_to_test is None:
        if request.provider == "ollama":
            # For Ollama, just check connectivity
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(f"{settings.ollama_url}/api/tags")
                    resp.raise_for_status()
                return TestConnectionResponse(provider="ollama", status="ok")
            except Exception as e:
                return TestConnectionResponse(provider="ollama", status="error", message=str(e))

        # Look up selected_model from api_keys
        result = await db.execute(
            select(APIKey).where(
                APIKey.user_id == user_uuid,
                APIKey.provider == request.provider,
            )
        )
        key_record = result.scalar_one_or_none()
        if key_record is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No API key set for {request.provider}")
        if key_record.selected_model is None:
            raise HTTPException(status_code=400, detail=f"No model selected for {request.provider}. Select a model first.")
        model_to_test = f"{request.provider}/{key_record.selected_model}"

    # Test via LiteLLM with a minimal prompt
    messages = [{"role": "user", "content": "Respond with the single word: ok"}]
    try:
        await llm_service.complete(model_to_test, messages, user_uuid, db, timeout=15)
        return TestConnectionResponse(provider=request.provider, status="ok")
    except LLMError as e:
        return TestConnectionResponse(provider=request.provider, status="error", message=str(e))
```

- [ ] **Step 3: Run existing settings tests to check for regressions**

Run:
```bash
cd src-api && uv run pytest tests/ -v -k "settings or api_key"
```

Expected: Existing tests pass (integration tests will need Docker for PostgreSQL).

- [ ] **Step 4: Commit**

```bash
cd src-api
git add app/routers/settings.py app/schemas/settings.py
git commit -m "Add model list endpoint, model selection, and LiteLLM-based test-connection"
```

---

### Task 8: Profile Router (CRUD + SSE Synthesis)

**Files:**
- Create: `src-api/app/routers/profile.py`
- Modify: `src-api/app/main.py`

- [ ] **Step 1: Create the profile router**

Create `src-api/app/routers/profile.py`:

```python
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.schemas.profile import ProfileData, ProfileResponse, SynthesizeRequest
from app.services import profile_service
from app.services.profile_synthesizer import synthesize_profile

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("/", response_model=ProfileResponse)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    profile = await profile_service.get_profile(db, user_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No profile exists")
    return ProfileResponse(
        id=str(profile.id),
        data=ProfileData(**profile.data),
        guidance=profile.guidance,
        generated_at=profile.generated_at.isoformat() if profile.generated_at else None,
        created_at=profile.created_at.isoformat(),
        updated_at=profile.updated_at.isoformat(),
    )


@router.put("/", response_model=ProfileResponse)
async def update_profile_endpoint(
    data: ProfileData,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    profile = await profile_service.update_profile(db, user_id, data.model_dump(exclude_none=True))
    return ProfileResponse(
        id=str(profile.id),
        data=ProfileData(**profile.data),
        guidance=profile.guidance,
        generated_at=profile.generated_at.isoformat() if profile.generated_at else None,
        created_at=profile.created_at.isoformat(),
        updated_at=profile.updated_at.isoformat(),
    )


@router.patch("/", response_model=ProfileResponse)
async def patch_profile_endpoint(
    data: ProfileData,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    try:
        profile = await profile_service.patch_profile(db, user_id, data.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return ProfileResponse(
        id=str(profile.id),
        data=ProfileData(**profile.data),
        guidance=profile.guidance,
        generated_at=profile.generated_at.isoformat() if profile.generated_at else None,
        created_at=profile.created_at.isoformat(),
        updated_at=profile.updated_at.isoformat(),
    )


@router.post("/synthesize")
async def synthesize_profile_endpoint(
    request: SynthesizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])

    async def event_stream():
        try:
            # Status: analyzing
            yield _sse_event("status", {"message": "Analyzing documents..."})

            # Status: synthesizing
            yield _sse_event("status", {"message": "Synthesizing profile..."})

            # Run synthesis
            profile_data, profile = await synthesize_profile(
                db=db,
                user_id=user_id,
                model=request.model,
                guidance=request.guidance,
            )

            # Status: processing
            yield _sse_event("status", {"message": "Processing response..."})

            # Emit non-empty sections
            profile_dict = profile_data.model_dump(exclude_none=True)
            for section_name, section_content in profile_dict.items():
                yield _sse_event("section", {"section": section_name, "content": section_content})

            # Complete
            yield _sse_event("complete", {"profile_id": str(profile.id)})

        except ValueError as e:
            yield _sse_event("error", {"message": str(e)})
        except Exception as e:
            yield _sse_event("error", {"message": f"Synthesis failed: {str(e)}"})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _sse_event(event_type: str, data: dict) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
```

- [ ] **Step 2: Register the profile router in main.py**

In `src-api/app/main.py`, add the import and router registration.

Add to imports:
```python
from app.routers import auth, documents, settings as settings_router, profile
```

Add after the last `include_router` line:
```python
app.include_router(profile.router)
```

- [ ] **Step 3: Verify the app starts and routes are registered**

Run:
```bash
cd src-api && uv run python -c "from app.main import app; print([r.path for r in app.routes])"
```

Expected: Output includes `/api/profile/`, `/api/profile/synthesize`, and other existing routes.

- [ ] **Step 4: Commit**

```bash
cd src-api
git add app/routers/profile.py app/main.py
git commit -m "Add profile router with CRUD and SSE synthesis endpoint"
```

---

### Task 9: Integration Tests — Profile Flow

**Files:**
- Create: `src-api/tests/integration/test_profile_flow.py`

- [ ] **Step 1: Write the profile flow integration tests**

Create `src-api/tests/integration/test_profile_flow.py`:

```python
import json
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from testcontainers.postgres import PostgresContainer

from app.database import get_db
from app.main import app
from app.models import Base


@pytest.fixture(scope="module")
def postgres_container():
    with PostgresContainer("postgres:16-alpine") as postgres:
        yield postgres


@pytest.fixture(scope="module")
def db_url(postgres_container):
    return postgres_container.get_connection_url().replace("psycopg2", "asyncpg")


@pytest.fixture
async def client(db_url):
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


async def _register_and_get_token(client: AsyncClient) -> str:
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    resp = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "SecurePass123!"},
    )
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


SAMPLE_PROFILE_JSON = json.dumps({
    "basics": {"name": "Jane Doe", "title": "Engineer", "summary": "10 years experience."},
    "skills": [{"category": "Languages", "items": ["Python", "Go"]}],
    "experience": [{"company": "Acme", "title": "Staff Engineer", "current": True}],
})


class TestProfileSynthesis:
    @pytest.mark.asyncio
    async def test_synthesize_returns_sse_stream(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        # Upload a document first (create directly in DB for simplicity)
        # We'll mock the LLM and document query instead
        with patch("app.services.profile_synthesizer.llm_service") as mock_llm:
            mock_llm.complete = AsyncMock(return_value=SAMPLE_PROFILE_JSON)

            # We need documents in DB — upload one
            from io import BytesIO
            file = BytesIO(b"# Jane Doe\nSenior Engineer with 10 years experience.")
            resp = await client.post(
                "/api/documents",
                headers=headers,
                files={"files": ("resume.md", file, "text/markdown")},
            )
            assert resp.status_code == 201
            doc_id = resp.json()[0]["id"]

            # Manually mark document as completed (since no worker running)
            from sqlalchemy import text as sql_text
            from app.database import get_db as real_get_db
            async for db in app.dependency_overrides[get_db]():
                await db.execute(
                    sql_text("UPDATE documents SET status = 'completed', parsed_text = 'Jane Doe, Senior Engineer' WHERE id = :id"),
                    {"id": doc_id},
                )
                await db.commit()

            # Synthesize
            resp = await client.post(
                "/api/profile/synthesize",
                headers=headers,
                json={"model": "anthropic/claude-sonnet-4-20250514"},
            )
            assert resp.status_code == 200
            assert resp.headers["content-type"].startswith("text/event-stream")

            # Parse SSE events
            events = _parse_sse(resp.text)
            event_types = [e["event"] for e in events]

            assert "status" in event_types
            assert "section" in event_types
            assert "complete" in event_types

            # Verify sections delivered
            section_events = [e for e in events if e["event"] == "section"]
            section_names = [e["data"]["section"] for e in section_events]
            assert "basics" in section_names
            assert "skills" in section_names


class TestProfileCRUD:
    @pytest.mark.asyncio
    async def test_get_profile_404_when_none(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        resp = await client.get("/api/profile/", headers=headers)
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_put_creates_and_returns_profile(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        profile_data = {
            "basics": {"name": "Jane Doe", "title": "Engineer"},
            "skills": [{"category": "Languages", "items": ["Python"]}],
        }
        resp = await client.put("/api/profile/", headers=headers, json=profile_data)
        assert resp.status_code == 200
        body = resp.json()
        assert body["data"]["basics"]["name"] == "Jane Doe"

        # GET should return same profile
        resp = await client.get("/api/profile/", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["basics"]["name"] == "Jane Doe"

    @pytest.mark.asyncio
    async def test_patch_merges_into_existing(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        # Create profile first
        await client.put(
            "/api/profile/",
            headers=headers,
            json={
                "basics": {"name": "Jane Doe", "title": "Engineer", "email": "jane@test.com"},
                "skills": [{"category": "Languages", "items": ["Python"]}],
            },
        )

        # Patch only basics.summary
        resp = await client.patch(
            "/api/profile/",
            headers=headers,
            json={"basics": {"summary": "Updated summary."}},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["basics"]["name"] == "Jane Doe"
        assert data["basics"]["summary"] == "Updated summary."
        assert data["skills"][0]["category"] == "Languages"

    @pytest.mark.asyncio
    async def test_patch_404_when_no_profile(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        resp = await client.patch(
            "/api/profile/",
            headers=headers,
            json={"basics": {"name": "Jane"}},
        )
        assert resp.status_code == 404


def _parse_sse(text: str) -> list[dict]:
    """Parse SSE text into a list of {event, data} dicts."""
    events = []
    current_event = None
    current_data = None

    for line in text.strip().split("\n"):
        line = line.strip()
        if line.startswith("event: "):
            current_event = line[7:]
        elif line.startswith("data: "):
            current_data = json.loads(line[6:])
        elif line == "" and current_event is not None:
            events.append({"event": current_event, "data": current_data})
            current_event = None
            current_data = None

    # Handle last event if no trailing newline
    if current_event is not None:
        events.append({"event": current_event, "data": current_data})

    return events
```

- [ ] **Step 2: Run the integration tests**

Run:
```bash
cd src-api && uv run pytest tests/integration/test_profile_flow.py -v
```

Expected: All tests PASS (requires Docker running for testcontainers).

- [ ] **Step 3: Commit**

```bash
cd src-api
git add tests/integration/test_profile_flow.py
git commit -m "Add integration tests for profile synthesis and CRUD"
```

---

### Task 10: Integration Tests — Model List and Settings

**Files:**
- Create: `src-api/tests/integration/test_model_list.py`

- [ ] **Step 1: Write the model list integration tests**

Create `src-api/tests/integration/test_model_list.py`:

```python
import uuid
from unittest.mock import AsyncMock, patch, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from testcontainers.postgres import PostgresContainer

from app.database import get_db
from app.main import app
from app.models import Base


@pytest.fixture(scope="module")
def postgres_container():
    with PostgresContainer("postgres:16-alpine") as postgres:
        yield postgres


@pytest.fixture(scope="module")
def db_url(postgres_container):
    return postgres_container.get_connection_url().replace("psycopg2", "asyncpg")


@pytest.fixture
async def client(db_url):
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


async def _register_and_get_token(client: AsyncClient) -> str:
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    resp = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "SecurePass123!"},
    )
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestModelSelection:
    @pytest.mark.asyncio
    async def test_set_and_get_selected_model(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        # Save an API key first
        await client.post(
            "/api/settings/api-keys",
            headers=headers,
            json={"provider": "anthropic", "api_key": "sk-test-key"},
        )

        # Set selected model
        resp = await client.put(
            "/api/settings/api-keys/anthropic/model",
            headers=headers,
            json={"model": "claude-sonnet-4-20250514"},
        )
        assert resp.status_code == 204

        # Verify selected_model is returned in status
        resp = await client.get("/api/settings/api-keys/anthropic", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["selected_model"] == "claude-sonnet-4-20250514"

    @pytest.mark.asyncio
    async def test_set_model_404_no_key(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        resp = await client.put(
            "/api/settings/api-keys/anthropic/model",
            headers=headers,
            json={"model": "claude-sonnet-4-20250514"},
        )
        assert resp.status_code == 404


class TestTestConnection:
    @pytest.mark.asyncio
    async def test_connection_via_litellm(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        # Save key and set model
        await client.post(
            "/api/settings/api-keys",
            headers=headers,
            json={"provider": "anthropic", "api_key": "sk-test-key"},
        )
        await client.put(
            "/api/settings/api-keys/anthropic/model",
            headers=headers,
            json={"model": "claude-sonnet-4-20250514"},
        )

        # Mock the LLM complete call
        with patch("app.routers.settings.llm_service") as mock_llm:
            mock_llm.complete = AsyncMock(return_value="ok")

            resp = await client.post(
                "/api/settings/test-connection",
                headers=headers,
                json={"provider": "anthropic"},
            )
            assert resp.status_code == 200
            assert resp.json()["status"] == "ok"

    @pytest.mark.asyncio
    async def test_connection_with_explicit_model(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        await client.post(
            "/api/settings/api-keys",
            headers=headers,
            json={"provider": "openai", "api_key": "sk-test-key"},
        )

        with patch("app.routers.settings.llm_service") as mock_llm:
            mock_llm.complete = AsyncMock(return_value="ok")

            resp = await client.post(
                "/api/settings/test-connection",
                headers=headers,
                json={"provider": "openai", "model": "openai/gpt-4o"},
            )
            assert resp.status_code == 200
            assert resp.json()["status"] == "ok"

    @pytest.mark.asyncio
    async def test_connection_error_reported(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        await client.post(
            "/api/settings/api-keys",
            headers=headers,
            json={"provider": "anthropic", "api_key": "sk-bad-key"},
        )
        await client.put(
            "/api/settings/api-keys/anthropic/model",
            headers=headers,
            json={"model": "claude-sonnet-4-20250514"},
        )

        with patch("app.routers.settings.llm_service") as mock_llm:
            from app.services.llm_service import LLMError
            mock_llm.complete = AsyncMock(side_effect=LLMError("Invalid API key"))

            resp = await client.post(
                "/api/settings/test-connection",
                headers=headers,
                json={"provider": "anthropic"},
            )
            assert resp.status_code == 200
            assert resp.json()["status"] == "error"
            assert "Invalid API key" in resp.json()["message"]
```

- [ ] **Step 2: Run the integration tests**

Run:
```bash
cd src-api && uv run pytest tests/integration/test_model_list.py -v
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
cd src-api
git add tests/integration/test_model_list.py
git commit -m "Add integration tests for model selection and test-connection"
```

---

### Task 11: Run All Tests and Update Documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Run the full test suite**

Run:
```bash
cd src-api && uv run pytest tests/unit/ -v
```

Expected: All unit tests PASS.

Run:
```bash
cd src-api && uv run pytest tests/integration/ -v
```

Expected: All integration tests PASS (requires Docker).

- [ ] **Step 2: Update CLAUDE.md**

In the root `CLAUDE.md`, make the following updates:

**Update "Current Phase" section:**

```markdown
## Current Phase

**Phase 2b (LLM Integration & Profile Synthesis) is complete.** Includes:
- LiteLLM integration as unified LLM gateway (Anthropic, OpenAI, Gemini, OpenRouter, Ollama)
- Dynamic model listing from provider APIs
- Model selection and LiteLLM-based connection testing
- Profile synthesis from document repository via LLM
- SSE streaming with status updates and section-by-section delivery
- Profile CRUD with field-level editing (PATCH deep merge)
- Re-synthesis with free-form user guidance

**Phase 3** is next: Next.js generator wiring, theme design and implementation, resume PDF generation.

See `docs/superpowers/specs/2026-03-31-phase2b-llm-profile-synthesis-design.md` for the full design.
```

**Update "REST API Endpoints — Currently Implemented" section** — add:

```markdown
- `GET /api/settings/models/:provider` — List available models from provider
- `PUT /api/settings/api-keys/:provider/model` — Set selected model for provider
- `POST /api/profile/synthesize` — Synthesize profile via LLM (SSE stream)
- `GET /api/profile` — Get current synthesized profile
- `PUT /api/profile` — Replace profile data
- `PATCH /api/profile` — Partial profile update (deep merge)
```

**Update "Database" section** — update current tables:

```markdown
- **Current tables**: `users`, `documents`, `api_keys`, `profiles`
```

**Update "Tech Stack" section** — add:

```markdown
- **LLM Gateway**: LiteLLM (unified interface for Anthropic, OpenAI, Gemini, OpenRouter, Ollama)
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "Update documentation for Phase 2b"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add LiteLLM dependency | pyproject.toml |
| 2 | Profile data schema (Pydantic) | schemas/profile.py, test_profile_schema.py |
| 3 | Profile ORM model + migrations | models/profile.py, migrations 005+006 |
| 4 | LLM service | services/llm_service.py, test_llm_service.py |
| 5 | Profile service (CRUD) | services/profile_service.py, test_profile_service.py |
| 6 | Profile synthesizer | services/profile_synthesizer.py, test_profile_synthesizer.py |
| 7 | Settings updates | routers/settings.py, schemas/settings.py |
| 8 | Profile router + main.py | routers/profile.py, main.py |
| 9 | Integration tests — profile flow | test_profile_flow.py |
| 10 | Integration tests — model list | test_model_list.py |
| 11 | Full test run + documentation | CLAUDE.md |
