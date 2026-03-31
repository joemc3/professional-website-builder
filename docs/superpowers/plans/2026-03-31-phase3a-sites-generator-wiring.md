# Phase 3a: Sites & Generator Wiring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend pipeline for site generation — database tables, job posting ingestion (URL scraping, paste-and-parse, manual entry), site generation via ARQ worker + Next.js subprocess, and static file serving via public Nginx.

**Architecture:** API receives generation requests, creates site/job-posting records, enqueues ARQ jobs. Worker picks up jobs, writes input JSON to a shared volume, invokes the Next.js generator as a subprocess, and updates the site record on completion. Public Nginx serves the static output.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic, ARQ, LiteLLM, httpx, BeautifulSoup4, Next.js 14, PostgreSQL 16, Redis 7, Nginx

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src-api/app/models/job_posting.py` | JobPosting ORM model |
| `src-api/app/models/site.py` | Site ORM model |
| `src-api/app/schemas/job_postings.py` | Pydantic request/response schemas for job postings |
| `src-api/app/schemas/sites.py` | Pydantic request/response schemas for sites |
| `src-api/app/services/username_validator.py` | Username validation rules |
| `src-api/app/services/job_posting_service.py` | Job posting CRUD |
| `src-api/app/services/job_posting_extractor.py` | URL scraping + LLM extraction for job postings |
| `src-api/app/services/site_service.py` | Site CRUD, status transitions, stale detection |
| `src-api/app/services/site_generator.py` | Generation orchestrator (input JSON assembly, subprocess invocation) |
| `src-api/app/services/profile_tailor.py` | LLM-based profile tailoring for targeted sites |
| `src-api/app/routers/job_postings.py` | Job posting endpoints |
| `src-api/app/routers/sites.py` | Site generation endpoints |
| `src-api/migrations/versions/007_username.py` | Add username to users |
| `src-api/migrations/versions/008_job_postings.py` | Create job_postings table |
| `src-api/migrations/versions/009_sites.py` | Create sites table |
| `src-generator/generate.js` | CLI entry point for static site generation |
| `nginx/sites.conf` | Public Nginx config for serving generated sites |
| `src-api/tests/unit/test_job_posting_service.py` | Job posting CRUD unit tests |
| `src-api/tests/unit/test_job_posting_extractor.py` | URL scraping + LLM extraction unit tests |
| `src-api/tests/unit/test_site_service.py` | Site service unit tests |
| `src-api/tests/unit/test_site_generator.py` | Generation orchestrator unit tests |
| `src-api/tests/unit/test_profile_tailor.py` | Profile tailoring unit tests |
| `src-api/tests/unit/test_username_validation.py` | Username validation unit tests |
| `src-api/tests/integration/test_job_posting_flow.py` | Job posting integration tests |
| `src-api/tests/integration/test_site_flow.py` | Site generation integration tests |

### Modified Files

| File | Changes |
|------|---------|
| `src-api/app/models/user.py` | Add `username` column |
| `src-api/app/models/__init__.py` | Export new models |
| `src-api/app/config.py` | Add `generation_dir` and `output_dir` settings |
| `src-api/app/worker.py` | Add site generation job |
| `src-api/app/main.py` | Mount new routers |
| `src-api/app/routers/auth.py` | Add username endpoint |
| `src-api/app/schemas/auth.py` | Add username schemas |
| `docker-compose.yml` | Add volumes, public Nginx service |

---

## Task 1: Add Username to User Model

**Files:**
- Modify: `src-api/app/models/user.py`
- Create: `src-api/migrations/versions/007_username.py`
- Modify: `src-api/app/routers/auth.py`
- Modify: `src-api/app/schemas/auth.py`
- Create: `src-api/tests/unit/test_username_validation.py`
- Modify: `src-api/tests/integration/test_profile_flow.py` (update helper)

- [ ] **Step 1: Write username validation unit tests**

Create `src-api/tests/unit/test_username_validation.py`:

```python
import pytest

from app.services.username_validator import validate_username


class TestUsernameValidation:
    def test_valid_usernames(self):
        for name in ["joe", "jane-doe", "a123", "my-resume"]:
            assert validate_username(name) is None, f"{name} should be valid"

    def test_too_short(self):
        assert validate_username("ab") == "Username must be 3-50 characters"

    def test_too_long(self):
        assert validate_username("a" * 51) == "Username must be 3-50 characters"

    def test_must_start_with_letter(self):
        assert validate_username("123abc") == "Username must start with a letter"
        assert validate_username("-abc") == "Username must start with a letter"

    def test_invalid_characters(self):
        assert validate_username("joe_doe") == "Username may only contain lowercase letters, numbers, and hyphens"
        assert validate_username("Joe") == "Username may only contain lowercase letters, numbers, and hyphens"
        assert validate_username("joe doe") == "Username may only contain lowercase letters, numbers, and hyphens"

    def test_reserved_words(self):
        for word in ["admin", "api", "static", "health", "login", "register", "settings"]:
            assert validate_username(word) == "Username is reserved"

    def test_no_trailing_hyphen(self):
        assert validate_username("joe-") == "Username may only contain lowercase letters, numbers, and hyphens"

    def test_no_consecutive_hyphens(self):
        assert validate_username("joe--doe") == "Username may only contain lowercase letters, numbers, and hyphens"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src-api && uv run pytest tests/unit/test_username_validation.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.username_validator'`

- [ ] **Step 3: Implement username validator**

Create `src-api/app/services/username_validator.py`:

```python
import re

RESERVED_USERNAMES = frozenset({
    "admin", "api", "static", "health", "login", "register", "settings",
})

USERNAME_PATTERN = re.compile(r"^[a-z][a-z0-9]+(?:-[a-z0-9]+)*$")


def validate_username(username: str) -> str | None:
    """Return an error message if invalid, or None if valid."""
    if len(username) < 3 or len(username) > 50:
        return "Username must be 3-50 characters"

    if not username[0].isalpha():
        return "Username must start with a letter"

    if not USERNAME_PATTERN.match(username):
        return "Username may only contain lowercase letters, numbers, and hyphens"

    if username in RESERVED_USERNAMES:
        return "Username is reserved"

    return None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src-api && uv run pytest tests/unit/test_username_validation.py -v`
Expected: All 7 tests PASS

- [ ] **Step 5: Add username column to User model**

Modify `src-api/app/models/user.py` — add after the `email` column:

```python
username: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True, index=True)
```

Add `String` import (already imported).

- [ ] **Step 6: Create migration**

Create `src-api/migrations/versions/007_username.py`:

```python
"""Add username to users

Revision ID: 007
Revises: 006
Create Date: 2026-03-31
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("username", sa.String(50), nullable=True))
    op.create_index("ix_users_username", "users", ["username"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_username")
    op.drop_column("users", "username")
```

- [ ] **Step 7: Add username schema and endpoint**

Add to `src-api/app/schemas/auth.py`:

```python
class UsernameRequest(BaseModel):
    username: str


class UsernameResponse(BaseModel):
    username: str
```

Add to `src-api/app/routers/auth.py` (new endpoint):

```python
from app.services.username_validator import validate_username

@router.put("/username", response_model=UsernameResponse)
async def set_username(
    request: UsernameRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    error = validate_username(request.username)
    if error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=error)

    # Check uniqueness
    result = await db.execute(select(User).where(User.username == request.username))
    existing = result.scalar_one_or_none()
    if existing and str(existing.id) != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")

    result = await db.execute(select(User).where(User.id == uuid.UUID(current_user["id"])))
    user = result.scalar_one()
    user.username = request.username
    await db.commit()
    return UsernameResponse(username=user.username)
```

Import `UsernameRequest, UsernameResponse` from schemas and `validate_username` from services.

- [ ] **Step 8: Commit**

```bash
git add src-api/app/models/user.py src-api/app/services/username_validator.py \
  src-api/app/schemas/auth.py src-api/app/routers/auth.py \
  src-api/migrations/versions/007_username.py \
  src-api/tests/unit/test_username_validation.py
git commit -m "feat: add username field to users with validation and endpoint"
```

---

## Task 2: Job Posting Model and Migration

**Files:**
- Create: `src-api/app/models/job_posting.py`
- Create: `src-api/migrations/versions/008_job_postings.py`
- Modify: `src-api/app/models/__init__.py`

- [ ] **Step 1: Create JobPosting model**

Create `src-api/app/models/job_posting.py`:

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.user import Base


class JobPosting(Base):
    __tablename__ = "job_postings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    source_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    requirements: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 2: Create migration**

Create `src-api/migrations/versions/008_job_postings.py`:

```python
"""Create job_postings table

Revision ID: 008
Revises: 007
Create Date: 2026-03-31
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "job_postings",
        sa.Column("id", sa.UUID(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("company", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("source_url", sa.String(2048), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("requirements", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_job_postings_user_id", "job_postings", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_job_postings_user_id")
    op.drop_table("job_postings")
```

- [ ] **Step 3: Update model exports**

Modify `src-api/app/models/__init__.py`:

```python
from app.models.user import Base, User
from app.models.document import Document
from app.models.api_key import APIKey
from app.models.profile import Profile
from app.models.job_posting import JobPosting

__all__ = ["Base", "User", "Document", "APIKey", "Profile", "JobPosting"]
```

- [ ] **Step 4: Commit**

```bash
git add src-api/app/models/job_posting.py src-api/app/models/__init__.py \
  src-api/migrations/versions/008_job_postings.py
git commit -m "feat: add JobPosting model and migration"
```

---

## Task 3: Job Posting Service (CRUD)

**Files:**
- Create: `src-api/app/services/job_posting_service.py`
- Create: `src-api/app/schemas/job_postings.py`
- Create: `src-api/tests/unit/test_job_posting_service.py`

- [ ] **Step 1: Create Pydantic schemas**

Create `src-api/app/schemas/job_postings.py`:

```python
from pydantic import BaseModel


class JobPostingCreate(BaseModel):
    title: str
    company: str
    description: str
    source_url: str | None = None
    raw_text: str | None = None
    requirements: dict | None = None


class JobPostingUpdate(BaseModel):
    title: str | None = None
    company: str | None = None
    description: str | None = None
    source_url: str | None = None
    raw_text: str | None = None
    requirements: dict | None = None


class JobPostingResponse(BaseModel):
    id: str
    title: str
    company: str
    description: str
    source_url: str | None
    raw_text: str | None
    requirements: dict | None
    created_at: str
    updated_at: str


class JobPostingDraft(BaseModel):
    """Returned by from-url and from-text endpoints. Not persisted."""
    title: str
    company: str
    description: str
    source_url: str | None = None
    raw_text: str | None = None
    requirements: dict | None = None


class ScrapeRequest(BaseModel):
    url: str


class ParseRequest(BaseModel):
    raw_text: str
```

- [ ] **Step 2: Write unit tests for job posting service**

Create `src-api/tests/unit/test_job_posting_service.py`:

```python
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.job_posting_service import (
    create_job_posting,
    get_job_posting,
    list_job_postings,
    update_job_posting,
    delete_job_posting,
)


class TestCreateJobPosting:
    @pytest.mark.asyncio
    async def test_creates_and_returns_job_posting(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        result = await create_job_posting(
            db=mock_db,
            user_id=user_id,
            title="Senior Engineer",
            company="Acme Corp",
            description="Build distributed systems.",
            source_url="https://example.com/jobs/123",
            raw_text="Original scraped text",
            requirements={"required_skills": ["Python", "Go"]},
        )

        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()
        added_obj = mock_db.add.call_args[0][0]
        assert added_obj.title == "Senior Engineer"
        assert added_obj.company == "Acme Corp"
        assert added_obj.user_id == user_id
        assert added_obj.source_url == "https://example.com/jobs/123"


class TestGetJobPosting:
    @pytest.mark.asyncio
    async def test_returns_posting_for_correct_user(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()
        posting_id = uuid.uuid4()

        mock_posting = MagicMock()
        mock_posting.user_id = user_id
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_posting
        mock_db.execute.return_value = mock_result

        result = await get_job_posting(mock_db, posting_id, user_id)
        assert result is mock_posting

    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        result = await get_job_posting(mock_db, uuid.uuid4(), uuid.uuid4())
        assert result is None


class TestListJobPostings:
    @pytest.mark.asyncio
    async def test_returns_all_for_user(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()
        mock_postings = [MagicMock(), MagicMock()]
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = mock_postings
        mock_db.execute.return_value = mock_result

        result = await list_job_postings(mock_db, user_id)
        assert len(result) == 2


class TestUpdateJobPosting:
    @pytest.mark.asyncio
    async def test_updates_fields(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()
        posting_id = uuid.uuid4()

        mock_posting = MagicMock()
        mock_posting.user_id = user_id
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_posting
        mock_db.execute.return_value = mock_result

        result = await update_job_posting(
            mock_db, posting_id, user_id, title="Updated Title"
        )
        assert mock_posting.title == "Updated Title"
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        result = await update_job_posting(
            mock_db, uuid.uuid4(), uuid.uuid4(), title="X"
        )
        assert result is None


class TestDeleteJobPosting:
    @pytest.mark.asyncio
    async def test_deletes_and_returns_true(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()
        posting_id = uuid.uuid4()

        mock_posting = MagicMock()
        mock_posting.user_id = user_id
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_posting
        mock_db.execute.return_value = mock_result

        result = await delete_job_posting(mock_db, posting_id, user_id)
        assert result is True
        mock_db.delete.assert_called_once_with(mock_posting)

    @pytest.mark.asyncio
    async def test_returns_false_when_not_found(self):
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        result = await delete_job_posting(mock_db, uuid.uuid4(), uuid.uuid4())
        assert result is False
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd src-api && uv run pytest tests/unit/test_job_posting_service.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.job_posting_service'`

- [ ] **Step 4: Implement job posting service**

Create `src-api/app/services/job_posting_service.py`:

```python
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job_posting import JobPosting


async def create_job_posting(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    company: str,
    description: str,
    source_url: str | None = None,
    raw_text: str | None = None,
    requirements: dict | None = None,
) -> JobPosting:
    posting = JobPosting(
        user_id=user_id,
        title=title,
        company=company,
        description=description,
        source_url=source_url,
        raw_text=raw_text,
        requirements=requirements,
    )
    db.add(posting)
    await db.commit()
    await db.refresh(posting)
    return posting


async def get_job_posting(
    db: AsyncSession, posting_id: uuid.UUID, user_id: uuid.UUID
) -> JobPosting | None:
    result = await db.execute(
        select(JobPosting).where(
            JobPosting.id == posting_id, JobPosting.user_id == user_id
        )
    )
    return result.scalar_one_or_none()


async def list_job_postings(
    db: AsyncSession, user_id: uuid.UUID
) -> list[JobPosting]:
    result = await db.execute(
        select(JobPosting)
        .where(JobPosting.user_id == user_id)
        .order_by(JobPosting.created_at.desc())
    )
    return result.scalars().all()


async def update_job_posting(
    db: AsyncSession,
    posting_id: uuid.UUID,
    user_id: uuid.UUID,
    **fields,
) -> JobPosting | None:
    posting = await get_job_posting(db, posting_id, user_id)
    if posting is None:
        return None

    for key, value in fields.items():
        if value is not None:
            setattr(posting, key, value)

    await db.commit()
    await db.refresh(posting)
    return posting


async def delete_job_posting(
    db: AsyncSession, posting_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    posting = await get_job_posting(db, posting_id, user_id)
    if posting is None:
        return False

    await db.delete(posting)
    await db.commit()
    return True
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd src-api && uv run pytest tests/unit/test_job_posting_service.py -v`
Expected: All 7 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src-api/app/schemas/job_postings.py src-api/app/services/job_posting_service.py \
  src-api/tests/unit/test_job_posting_service.py
git commit -m "feat: add job posting service with CRUD operations"
```

---

## Task 4: Job Posting Extractor (URL Scraping + LLM)

**Files:**
- Create: `src-api/app/services/job_posting_extractor.py`
- Create: `src-api/tests/unit/test_job_posting_extractor.py`

- [ ] **Step 1: Write unit tests for extractor**

Create `src-api/tests/unit/test_job_posting_extractor.py`:

```python
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.job_posting_extractor import (
    extract_from_html,
    build_extraction_prompt,
    parse_extraction_response,
    extract_from_url,
    extract_from_text,
)


SAMPLE_EXTRACTION_JSON = json.dumps({
    "title": "Senior Backend Engineer",
    "company": "Acme Corp",
    "description": "We are looking for a senior backend engineer to join our platform team.",
    "requirements": {
        "required_skills": ["Python", "PostgreSQL", "Docker"],
        "preferred_skills": ["Kubernetes", "Go"],
        "experience_level": "5+ years",
        "qualifications": ["BS in Computer Science or equivalent"],
    },
})


class TestExtractFromHtml:
    def test_strips_html_tags(self):
        html = "<html><body><h1>Job Title</h1><p>Description here.</p></body></html>"
        text = extract_from_html(html)
        assert "Job Title" in text
        assert "Description here" in text
        assert "<h1>" not in text

    def test_removes_script_and_style(self):
        html = "<html><body><script>var x=1;</script><style>.a{}</style><p>Content</p></body></html>"
        text = extract_from_html(html)
        assert "Content" in text
        assert "var x" not in text
        assert ".a{}" not in text


class TestBuildExtractionPrompt:
    def test_includes_raw_text(self):
        messages = build_extraction_prompt("Some job posting text about Python development")
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert "JSON" in messages[0]["content"]
        assert messages[1]["role"] == "user"
        assert "Python development" in messages[1]["content"]


class TestParseExtractionResponse:
    def test_parses_valid_json(self):
        result = parse_extraction_response(SAMPLE_EXTRACTION_JSON)
        assert result["title"] == "Senior Backend Engineer"
        assert result["company"] == "Acme Corp"
        assert "Python" in result["requirements"]["required_skills"]

    def test_handles_markdown_code_block(self):
        wrapped = f"```json\n{SAMPLE_EXTRACTION_JSON}\n```"
        result = parse_extraction_response(wrapped)
        assert result["title"] == "Senior Backend Engineer"

    def test_invalid_json_raises(self):
        with pytest.raises(ValueError, match="Invalid JSON"):
            parse_extraction_response("not json at all")


class TestExtractFromUrl:
    @pytest.mark.asyncio
    async def test_fetches_and_extracts(self):
        mock_db = AsyncMock()
        user_id = MagicMock()

        with (
            patch("app.services.job_posting_extractor.httpx.AsyncClient") as mock_client_cls,
            patch("app.services.job_posting_extractor.llm_service") as mock_llm,
        ):
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.text = "<html><body><h1>Senior Engineer</h1><p>Build things.</p></body></html>"
            mock_response.raise_for_status = MagicMock()

            mock_client = AsyncMock()
            mock_client.get = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            mock_llm.complete = AsyncMock(return_value=SAMPLE_EXTRACTION_JSON)

            result = await extract_from_url(
                url="https://example.com/jobs/123",
                model="anthropic/claude-sonnet-4-20250514",
                user_id=user_id,
                db=mock_db,
            )

            assert result["title"] == "Senior Backend Engineer"
            assert result["source_url"] == "https://example.com/jobs/123"
            assert "raw_text" in result


class TestExtractFromText:
    @pytest.mark.asyncio
    async def test_parses_text(self):
        mock_db = AsyncMock()
        user_id = MagicMock()

        with patch("app.services.job_posting_extractor.llm_service") as mock_llm:
            mock_llm.complete = AsyncMock(return_value=SAMPLE_EXTRACTION_JSON)

            result = await extract_from_text(
                raw_text="Senior Engineer at Acme. Requirements: Python.",
                model="anthropic/claude-sonnet-4-20250514",
                user_id=user_id,
                db=mock_db,
            )

            assert result["title"] == "Senior Backend Engineer"
            assert result["raw_text"] == "Senior Engineer at Acme. Requirements: Python."
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd src-api && uv run pytest tests/unit/test_job_posting_extractor.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Implement job posting extractor**

Create `src-api/app/services/job_posting_extractor.py`:

```python
import json
import re
import uuid

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession

from app.services import llm_service

EXTRACTION_SYSTEM_PROMPT = """You are a job posting parser. You will receive the text content of a job posting and must extract structured information from it.

Return ONLY valid JSON matching this exact structure:

{
  "title": "string — the job title",
  "company": "string — the company name",
  "description": "string — cleaned-up job description",
  "requirements": {
    "required_skills": ["string"],
    "preferred_skills": ["string"],
    "experience_level": "string",
    "qualifications": ["string"]
  }
}

If a field cannot be determined from the text, omit it. Return ONLY the JSON object, no markdown formatting, no explanation."""


def extract_from_html(html: str) -> str:
    """Extract clean text content from HTML."""
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    return soup.get_text(separator="\n", strip=True)


def build_extraction_prompt(raw_text: str) -> list[dict]:
    """Build LLM messages for job posting extraction."""
    return [
        {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
        {"role": "user", "content": f"Extract structured information from this job posting:\n\n{raw_text}"},
    ]


def parse_extraction_response(response_text: str) -> dict:
    """Parse an LLM response into a job posting dict."""
    text = response_text.strip()

    code_block_match = re.match(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if code_block_match:
        text = code_block_match.group(1).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in LLM response: {e}") from e


async def extract_from_url(
    url: str,
    model: str,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> dict:
    """Fetch a URL, extract text, and parse via LLM."""
    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        raw_text = extract_from_html(response.text)

    messages = build_extraction_prompt(raw_text)
    response_text = await llm_service.complete(model, messages, user_id, db)
    parsed = parse_extraction_response(response_text)

    parsed["source_url"] = url
    parsed["raw_text"] = raw_text
    return parsed


async def extract_from_text(
    raw_text: str,
    model: str,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> dict:
    """Parse raw text via LLM."""
    messages = build_extraction_prompt(raw_text)
    response_text = await llm_service.complete(model, messages, user_id, db)
    parsed = parse_extraction_response(response_text)

    parsed["raw_text"] = raw_text
    return parsed
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd src-api && uv run pytest tests/unit/test_job_posting_extractor.py -v`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src-api/app/services/job_posting_extractor.py \
  src-api/tests/unit/test_job_posting_extractor.py
git commit -m "feat: add job posting extractor with URL scraping and LLM parsing"
```

---

## Task 5: Job Posting Router

**Files:**
- Create: `src-api/app/routers/job_postings.py`
- Modify: `src-api/app/main.py`

- [ ] **Step 1: Create job postings router**

Create `src-api/app/routers/job_postings.py`:

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.schemas.job_postings import (
    JobPostingCreate,
    JobPostingDraft,
    JobPostingResponse,
    JobPostingUpdate,
    ParseRequest,
    ScrapeRequest,
)
from app.services import job_posting_service
from app.services.job_posting_extractor import extract_from_text, extract_from_url

router = APIRouter(prefix="/api/job-postings", tags=["job-postings"])


def _to_response(posting) -> JobPostingResponse:
    return JobPostingResponse(
        id=str(posting.id),
        title=posting.title,
        company=posting.company,
        description=posting.description,
        source_url=posting.source_url,
        raw_text=posting.raw_text,
        requirements=posting.requirements,
        created_at=posting.created_at.isoformat(),
        updated_at=posting.updated_at.isoformat(),
    )


@router.post("/", response_model=JobPostingResponse, status_code=status.HTTP_201_CREATED)
async def create_job_posting(
    request: JobPostingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    posting = await job_posting_service.create_job_posting(
        db=db,
        user_id=user_id,
        title=request.title,
        company=request.company,
        description=request.description,
        source_url=request.source_url,
        raw_text=request.raw_text,
        requirements=request.requirements,
    )
    return _to_response(posting)


@router.post("/from-url", response_model=JobPostingDraft)
async def scrape_job_posting(
    request: ScrapeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])

    # Need user's selected model
    from app.services.llm_service import get_api_key_for_provider
    from sqlalchemy import select
    from app.models.api_key import APIKey

    result = await db.execute(
        select(APIKey).where(
            APIKey.user_id == user_id,
            APIKey.selected_model.isnot(None),
        )
    )
    key_record = result.scalars().first()
    if key_record is None or key_record.selected_model is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No LLM model configured. Set a model in Settings first.",
        )

    try:
        draft = await extract_from_url(
            url=request.url,
            model=key_record.selected_model,
            user_id=user_id,
            db=db,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to extract job posting: {str(e)}",
        )

    return JobPostingDraft(**draft)


@router.post("/from-text", response_model=JobPostingDraft)
async def parse_job_posting(
    request: ParseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])

    from sqlalchemy import select
    from app.models.api_key import APIKey

    result = await db.execute(
        select(APIKey).where(
            APIKey.user_id == user_id,
            APIKey.selected_model.isnot(None),
        )
    )
    key_record = result.scalars().first()
    if key_record is None or key_record.selected_model is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No LLM model configured. Set a model in Settings first.",
        )

    try:
        draft = await extract_from_text(
            raw_text=request.raw_text,
            model=key_record.selected_model,
            user_id=user_id,
            db=db,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse job posting: {str(e)}",
        )

    return JobPostingDraft(**draft)


@router.get("/", response_model=list[JobPostingResponse])
async def list_job_postings(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    postings = await job_posting_service.list_job_postings(db, user_id)
    return [_to_response(p) for p in postings]


@router.get("/{posting_id}", response_model=JobPostingResponse)
async def get_job_posting(
    posting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    posting = await job_posting_service.get_job_posting(db, posting_id, user_id)
    if posting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found")
    return _to_response(posting)


@router.put("/{posting_id}", response_model=JobPostingResponse)
async def update_job_posting(
    posting_id: uuid.UUID,
    request: JobPostingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    posting = await job_posting_service.update_job_posting(
        db, posting_id, user_id, **request.model_dump(exclude_none=True)
    )
    if posting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found")
    return _to_response(posting)


@router.delete("/{posting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job_posting(
    posting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    deleted = await job_posting_service.delete_job_posting(db, posting_id, user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found")
    return None
```

- [ ] **Step 2: Mount router in main.py**

Add to `src-api/app/main.py` imports:

```python
from app.routers import job_postings
```

Add after existing `app.include_router` calls:

```python
app.include_router(job_postings.router)
```

- [ ] **Step 3: Run existing tests to verify no regressions**

Run: `cd src-api && uv run pytest tests/unit/ -v`
Expected: All existing tests PASS

- [ ] **Step 4: Commit**

```bash
git add src-api/app/routers/job_postings.py src-api/app/main.py
git commit -m "feat: add job posting router with CRUD, URL scraping, and paste-and-parse endpoints"
```

---

## Task 6: Site Model and Migration

**Files:**
- Create: `src-api/app/models/site.py`
- Create: `src-api/migrations/versions/009_sites.py`
- Modify: `src-api/app/models/__init__.py`

- [ ] **Step 1: Create Site model**

Create `src-api/app/models/site.py`:

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.user import Base


class Site(Base):
    __tablename__ = "sites"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    job_posting_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("job_postings.id", ondelete="SET NULL"), nullable=True
    )
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # "portfolio" or "targeted"
    theme: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_path: Mapped[str] = mapped_column(String(500), nullable=False)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index(
            "ix_sites_one_portfolio_per_user",
            "user_id",
            unique=True,
            postgresql_where=(type == "portfolio"),
        ),
    )
```

- [ ] **Step 2: Create migration**

Create `src-api/migrations/versions/009_sites.py`:

```python
"""Create sites table

Revision ID: 009
Revises: 008
Create Date: 2026-03-31
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sites",
        sa.Column("id", sa.UUID(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("profile_id", sa.UUID(), nullable=False),
        sa.Column("job_posting_id", sa.UUID(), nullable=True),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("theme", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="queued"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("output_path", sa.String(500), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["profile_id"], ["profiles.id"]),
        sa.ForeignKeyConstraint(["job_posting_id"], ["job_postings.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("slug", name="uq_sites_slug"),
    )
    op.create_index("ix_sites_user_id", "sites", ["user_id"])
    op.create_index(
        "ix_sites_one_portfolio_per_user",
        "sites",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("type = 'portfolio'"),
    )


def downgrade() -> None:
    op.drop_index("ix_sites_one_portfolio_per_user")
    op.drop_index("ix_sites_user_id")
    op.drop_table("sites")
```

- [ ] **Step 3: Update model exports**

Modify `src-api/app/models/__init__.py`:

```python
from app.models.user import Base, User
from app.models.document import Document
from app.models.api_key import APIKey
from app.models.profile import Profile
from app.models.job_posting import JobPosting
from app.models.site import Site

__all__ = ["Base", "User", "Document", "APIKey", "Profile", "JobPosting", "Site"]
```

- [ ] **Step 4: Commit**

```bash
git add src-api/app/models/site.py src-api/app/models/__init__.py \
  src-api/migrations/versions/009_sites.py
git commit -m "feat: add Site model and migration with partial unique index for portfolio"
```

---

## Task 7: Site Service

**Files:**
- Create: `src-api/app/services/site_service.py`
- Create: `src-api/app/schemas/sites.py`
- Create: `src-api/tests/unit/test_site_service.py`

- [ ] **Step 1: Create Pydantic schemas**

Create `src-api/app/schemas/sites.py`:

```python
import uuid

from pydantic import BaseModel


class PortfolioGenerateRequest(BaseModel):
    theme: str


class TargetedGenerateRequest(BaseModel):
    job_posting_id: uuid.UUID
    theme: str


class SiteResponse(BaseModel):
    id: str
    slug: str
    type: str
    theme: str
    status: str
    error_message: str | None
    output_path: str
    public_url: str
    stale: bool
    job_posting_id: str | None
    generated_at: str | None
    created_at: str
    updated_at: str
```

- [ ] **Step 2: Write unit tests**

Create `src-api/tests/unit/test_site_service.py`:

```python
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.site_service import (
    create_portfolio_site,
    create_targeted_site,
    get_site,
    list_sites,
    delete_site,
    is_portfolio_stale,
    generate_slug,
)


class TestGenerateSlug:
    def test_produces_url_safe_string(self):
        slug = generate_slug()
        assert slug.isalnum() or "-" in slug
        assert len(slug) >= 6

    def test_unique_each_call(self):
        slugs = {generate_slug() for _ in range(100)}
        assert len(slugs) == 100


class TestCreatePortfolioSite:
    @pytest.mark.asyncio
    async def test_creates_site_with_correct_fields(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()
        profile_id = uuid.uuid4()

        # No existing portfolio
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        site = await create_portfolio_site(
            db=mock_db,
            user_id=user_id,
            profile_id=profile_id,
            username="joe",
            theme="minimal",
        )

        mock_db.add.assert_called_once()
        added = mock_db.add.call_args[0][0]
        assert added.type == "portfolio"
        assert added.output_path == "joe"
        assert added.slug == "joe"
        assert added.theme == "minimal"
        assert added.status == "queued"


class TestCreateTargetedSite:
    @pytest.mark.asyncio
    async def test_creates_site_with_slug(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()
        profile_id = uuid.uuid4()
        job_posting_id = uuid.uuid4()

        site = await create_targeted_site(
            db=mock_db,
            user_id=user_id,
            profile_id=profile_id,
            job_posting_id=job_posting_id,
            username="joe",
            theme="minimal",
        )

        mock_db.add.assert_called_once()
        added = mock_db.add.call_args[0][0]
        assert added.type == "targeted"
        assert added.job_posting_id == job_posting_id
        assert added.output_path.startswith("joe/")
        assert added.status == "queued"


class TestIsPortfolioStale:
    def test_stale_when_profile_updated_after_generation(self):
        profile_updated = datetime(2026, 3, 31, 12, 0, tzinfo=timezone.utc)
        site_generated = datetime(2026, 3, 31, 10, 0, tzinfo=timezone.utc)
        assert is_portfolio_stale(profile_updated, site_generated) is True

    def test_not_stale_when_generated_after_profile(self):
        profile_updated = datetime(2026, 3, 31, 10, 0, tzinfo=timezone.utc)
        site_generated = datetime(2026, 3, 31, 12, 0, tzinfo=timezone.utc)
        assert is_portfolio_stale(profile_updated, site_generated) is False

    def test_stale_when_never_generated(self):
        profile_updated = datetime(2026, 3, 31, 12, 0, tzinfo=timezone.utc)
        assert is_portfolio_stale(profile_updated, None) is True


class TestDeleteSite:
    @pytest.mark.asyncio
    async def test_cannot_delete_portfolio(self):
        mock_db = AsyncMock()
        mock_site = MagicMock()
        mock_site.type = "portfolio"
        mock_site.user_id = uuid.uuid4()

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_site
        mock_db.execute.return_value = mock_result

        with pytest.raises(ValueError, match="Cannot delete portfolio"):
            await delete_site(mock_db, mock_site.id, mock_site.user_id)

    @pytest.mark.asyncio
    async def test_deletes_targeted_site(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()
        site_id = uuid.uuid4()

        mock_site = MagicMock()
        mock_site.type = "targeted"
        mock_site.user_id = user_id
        mock_site.output_path = "joe/abc123"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_site
        mock_db.execute.return_value = mock_result

        result = await delete_site(mock_db, site_id, user_id)
        assert result == "joe/abc123"
        mock_db.delete.assert_called_once_with(mock_site)
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd src-api && uv run pytest tests/unit/test_site_service.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 4: Implement site service**

Create `src-api/app/services/site_service.py`:

```python
import secrets
import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.site import Site


def generate_slug() -> str:
    """Generate a short, URL-safe random slug."""
    return secrets.token_urlsafe(8)


def is_portfolio_stale(
    profile_updated_at: datetime, site_generated_at: datetime | None
) -> bool:
    """Check if a portfolio site is out of date relative to the profile."""
    if site_generated_at is None:
        return True
    return profile_updated_at > site_generated_at


async def create_portfolio_site(
    db: AsyncSession,
    user_id: uuid.UUID,
    profile_id: uuid.UUID,
    username: str,
    theme: str,
) -> Site:
    """Create or re-queue a portfolio site for generation."""
    # Check for existing portfolio
    result = await db.execute(
        select(Site).where(Site.user_id == user_id, Site.type == "portfolio")
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.theme = theme
        existing.profile_id = profile_id
        existing.status = "queued"
        existing.error_message = None
        await db.commit()
        await db.refresh(existing)
        return existing

    site = Site(
        user_id=user_id,
        profile_id=profile_id,
        slug=username,
        type="portfolio",
        theme=theme,
        status="queued",
        output_path=username,
    )
    db.add(site)
    await db.commit()
    await db.refresh(site)
    return site


async def create_targeted_site(
    db: AsyncSession,
    user_id: uuid.UUID,
    profile_id: uuid.UUID,
    job_posting_id: uuid.UUID,
    username: str,
    theme: str,
) -> Site:
    """Create a targeted site for generation."""
    slug = generate_slug()
    site = Site(
        user_id=user_id,
        profile_id=profile_id,
        job_posting_id=job_posting_id,
        slug=slug,
        type="targeted",
        theme=theme,
        status="queued",
        output_path=f"{username}/{slug}",
    )
    db.add(site)
    await db.commit()
    await db.refresh(site)
    return site


async def get_site(
    db: AsyncSession, site_id: uuid.UUID, user_id: uuid.UUID
) -> Site | None:
    result = await db.execute(
        select(Site).where(Site.id == site_id, Site.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def list_sites(
    db: AsyncSession, user_id: uuid.UUID
) -> list[Site]:
    result = await db.execute(
        select(Site)
        .where(Site.user_id == user_id)
        .order_by(Site.created_at.desc())
    )
    return result.scalars().all()


async def delete_site(
    db: AsyncSession, site_id: uuid.UUID, user_id: uuid.UUID
) -> str:
    """Delete a targeted site. Returns the output_path for file cleanup. Raises for portfolio."""
    result = await db.execute(
        select(Site).where(Site.id == site_id, Site.user_id == user_id)
    )
    site = result.scalar_one_or_none()
    if site is None:
        raise ValueError("Site not found")

    if site.type == "portfolio":
        raise ValueError("Cannot delete portfolio site. Regenerate instead.")

    output_path = site.output_path
    await db.delete(site)
    await db.commit()
    return output_path
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd src-api && uv run pytest tests/unit/test_site_service.py -v`
Expected: All 7 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src-api/app/schemas/sites.py src-api/app/services/site_service.py \
  src-api/tests/unit/test_site_service.py
git commit -m "feat: add site service with portfolio/targeted creation and stale detection"
```

---

## Task 8: Profile Tailor (LLM-Based Targeted Profile)

**Files:**
- Create: `src-api/app/services/profile_tailor.py`
- Create: `src-api/tests/unit/test_profile_tailor.py`

- [ ] **Step 1: Write unit tests**

Create `src-api/tests/unit/test_profile_tailor.py`:

```python
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.profile_tailor import build_tailoring_prompt, tailor_profile


SAMPLE_PROFILE = {
    "basics": {"name": "Jane Doe", "title": "Senior Engineer", "summary": "10 years experience."},
    "skills": [{"category": "Languages", "items": ["Python", "Go", "Java"]}],
    "experience": [
        {"company": "Acme", "title": "Staff Engineer", "current": True, "highlights": ["Built CI/CD"]},
        {"company": "OldCo", "title": "Junior Dev", "highlights": ["Fixed bugs"]},
    ],
}

SAMPLE_JOB_POSTING = {
    "title": "Backend Lead",
    "company": "NewCo",
    "description": "Lead backend team building Python microservices.",
    "requirements": {"required_skills": ["Python", "Docker"]},
}

TAILORED_RESPONSE = json.dumps({
    "basics": {"name": "Jane Doe", "title": "Senior Engineer", "summary": "Backend specialist with 10 years building Python services."},
    "skills": [{"category": "Languages", "items": ["Python", "Go"]}],
    "experience": [
        {"company": "Acme", "title": "Staff Engineer", "current": True, "highlights": ["Built CI/CD", "Led Python migration"]},
    ],
})


class TestBuildTailoringPrompt:
    def test_includes_profile_and_job_posting(self):
        messages = build_tailoring_prompt(SAMPLE_PROFILE, SAMPLE_JOB_POSTING)
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert "tailor" in messages[0]["content"].lower()
        user_content = messages[1]["content"]
        assert "Jane Doe" in user_content
        assert "Backend Lead" in user_content
        assert "NewCo" in user_content


class TestTailorProfile:
    @pytest.mark.asyncio
    async def test_returns_tailored_profile(self):
        mock_db = AsyncMock()
        user_id = MagicMock()

        with patch("app.services.profile_tailor.llm_service") as mock_llm:
            mock_llm.complete = AsyncMock(return_value=TAILORED_RESPONSE)

            result = await tailor_profile(
                profile_data=SAMPLE_PROFILE,
                job_posting=SAMPLE_JOB_POSTING,
                model="anthropic/claude-sonnet-4-20250514",
                user_id=user_id,
                db=mock_db,
            )

        assert result["basics"]["name"] == "Jane Doe"
        assert "Python" in result["basics"]["summary"]
        mock_llm.complete.assert_called_once()

    @pytest.mark.asyncio
    async def test_retries_on_invalid_json(self):
        mock_db = AsyncMock()
        user_id = MagicMock()

        with patch("app.services.profile_tailor.llm_service") as mock_llm:
            mock_llm.complete = AsyncMock(
                side_effect=["not json", TAILORED_RESPONSE]
            )

            result = await tailor_profile(
                profile_data=SAMPLE_PROFILE,
                job_posting=SAMPLE_JOB_POSTING,
                model="anthropic/claude-sonnet-4-20250514",
                user_id=user_id,
                db=mock_db,
            )

        assert result["basics"]["name"] == "Jane Doe"
        assert mock_llm.complete.call_count == 2
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd src-api && uv run pytest tests/unit/test_profile_tailor.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Implement profile tailor**

Create `src-api/app/services/profile_tailor.py`:

```python
import json
import re
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.services import llm_service

TAILORING_SYSTEM_PROMPT = """You are a professional profile tailor. You will receive a person's professional profile and a job posting. Your task is to produce a tailored version of the profile that emphasizes the most relevant experience, skills, and accomplishments for the specific role.

Guidelines:
- Rewrite the summary to highlight relevance to the target role
- Reorder and filter experience to lead with the most relevant positions
- Emphasize relevant skills, de-emphasize irrelevant ones
- Adjust highlights to match the job requirements
- Do NOT invent information — only restructure and rewrite what exists
- Keep the same JSON structure as the input profile

Return ONLY valid JSON matching the same profile structure. No markdown, no explanation."""


def build_tailoring_prompt(profile_data: dict, job_posting: dict) -> list[dict]:
    """Build LLM messages for profile tailoring."""
    user_content = (
        f"## Professional Profile\n\n{json.dumps(profile_data, indent=2)}\n\n"
        f"## Target Job Posting\n\n"
        f"Title: {job_posting.get('title', 'Unknown')}\n"
        f"Company: {job_posting.get('company', 'Unknown')}\n"
        f"Description: {job_posting.get('description', '')}\n"
        f"Requirements: {json.dumps(job_posting.get('requirements', {}), indent=2)}"
    )

    return [
        {"role": "system", "content": TAILORING_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]


def _parse_json_response(text: str) -> dict:
    """Parse a JSON response, stripping markdown code blocks if present."""
    text = text.strip()
    code_block_match = re.match(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if code_block_match:
        text = code_block_match.group(1).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in LLM response: {e}") from e


async def tailor_profile(
    profile_data: dict,
    job_posting: dict,
    model: str,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> dict:
    """Produce a tailored profile variant for a specific job posting."""
    messages = build_tailoring_prompt(profile_data, job_posting)

    response_text = await llm_service.complete(model, messages, user_id, db)

    try:
        return _parse_json_response(response_text)
    except ValueError:
        # Retry once
        messages.append({"role": "assistant", "content": response_text})
        messages.append({
            "role": "user",
            "content": "Your response was not valid JSON. Please respond with ONLY valid JSON matching the profile schema. No markdown, no explanation.",
        })
        response_text = await llm_service.complete(model, messages, user_id, db)
        return _parse_json_response(response_text)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd src-api && uv run pytest tests/unit/test_profile_tailor.py -v`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src-api/app/services/profile_tailor.py \
  src-api/tests/unit/test_profile_tailor.py
git commit -m "feat: add profile tailor for LLM-based targeted profile generation"
```

---

## Task 9: Site Generator (Orchestration + Subprocess)

**Files:**
- Create: `src-api/app/services/site_generator.py`
- Create: `src-api/tests/unit/test_site_generator.py`
- Modify: `src-api/app/config.py`

- [ ] **Step 1: Add config settings**

Add to `src-api/app/config.py` in the `Settings` class:

```python
    # Site generation
    generation_dir: str = "/data/generation"
    output_dir: str = "/data/output"
    generator_script: str = "/app/generator/generate.js"
```

- [ ] **Step 2: Write unit tests**

Create `src-api/tests/unit/test_site_generator.py`:

```python
import json
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.site_generator import build_input_json, run_generator, cleanup_generation_dir


SAMPLE_PROFILE = {"basics": {"name": "Jane Doe"}}
SAMPLE_JOB_POSTING = {"title": "Engineer", "company": "Acme"}


class TestBuildInputJson:
    def test_portfolio_input(self):
        site_id = uuid.uuid4()
        result = build_input_json(
            site_id=site_id,
            site_type="portfolio",
            theme="minimal",
            profile_data=SAMPLE_PROFILE,
            output_dir="/data/output/joe",
            job_posting=None,
        )
        assert result["site_id"] == str(site_id)
        assert result["type"] == "portfolio"
        assert result["theme"] == "minimal"
        assert result["profile"] == SAMPLE_PROFILE
        assert result["output_dir"] == "/data/output/joe"
        assert "job_posting" not in result

    def test_targeted_input_includes_job_posting(self):
        result = build_input_json(
            site_id=uuid.uuid4(),
            site_type="targeted",
            theme="minimal",
            profile_data=SAMPLE_PROFILE,
            output_dir="/data/output/joe/abc123",
            job_posting=SAMPLE_JOB_POSTING,
        )
        assert result["type"] == "targeted"
        assert result["job_posting"] == SAMPLE_JOB_POSTING


class TestRunGenerator:
    @pytest.mark.asyncio
    async def test_success(self):
        with patch("app.services.site_generator.asyncio") as mock_asyncio:
            mock_process = MagicMock()
            mock_process.returncode = 0
            mock_asyncio.create_subprocess_exec = AsyncMock(return_value=mock_process)
            mock_process.communicate = AsyncMock(return_value=(b"Build complete", b""))

            await run_generator("/path/to/input.json")
            mock_asyncio.create_subprocess_exec.assert_called_once()

    @pytest.mark.asyncio
    async def test_failure_raises(self):
        with patch("app.services.site_generator.asyncio") as mock_asyncio:
            mock_process = MagicMock()
            mock_process.returncode = 1
            mock_asyncio.create_subprocess_exec = AsyncMock(return_value=mock_process)
            mock_process.communicate = AsyncMock(return_value=(b"", b"Error: theme not found"))

            with pytest.raises(RuntimeError, match="Generator failed.*theme not found"):
                await run_generator("/path/to/input.json")
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd src-api && uv run pytest tests/unit/test_site_generator.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 4: Implement site generator**

Create `src-api/app/services/site_generator.py`:

```python
import asyncio
import json
import shutil
import uuid
from pathlib import Path

from app.config import settings


def build_input_json(
    site_id: uuid.UUID,
    site_type: str,
    theme: str,
    profile_data: dict,
    output_dir: str,
    job_posting: dict | None = None,
) -> dict:
    """Build the input JSON for the Next.js generator."""
    data = {
        "site_id": str(site_id),
        "type": site_type,
        "theme": theme,
        "profile": profile_data,
        "output_dir": output_dir,
    }
    if job_posting is not None:
        data["job_posting"] = job_posting
    return data


async def run_generator(input_path: str) -> None:
    """Invoke the Next.js generator as a subprocess."""
    process = await asyncio.create_subprocess_exec(
        "node", settings.generator_script, "--input", input_path,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        error_msg = stderr.decode().strip() or "Unknown error"
        raise RuntimeError(f"Generator failed (exit {process.returncode}): {error_msg}")


def write_input_file(site_id: uuid.UUID, input_data: dict) -> str:
    """Write input JSON to the generation directory. Returns the file path."""
    gen_dir = Path(settings.generation_dir) / str(site_id)
    gen_dir.mkdir(parents=True, exist_ok=True)
    input_path = gen_dir / "input.json"
    input_path.write_text(json.dumps(input_data, indent=2))
    return str(input_path)


def cleanup_generation_dir(site_id: uuid.UUID) -> None:
    """Remove the generation directory for a site."""
    gen_dir = Path(settings.generation_dir) / str(site_id)
    if gen_dir.exists():
        shutil.rmtree(gen_dir)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd src-api && uv run pytest tests/unit/test_site_generator.py -v`
Expected: All 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src-api/app/config.py src-api/app/services/site_generator.py \
  src-api/tests/unit/test_site_generator.py
git commit -m "feat: add site generator orchestrator with subprocess invocation"
```

---

## Task 10: ARQ Worker Job for Site Generation

**Files:**
- Modify: `src-api/app/worker.py`

- [ ] **Step 1: Add site generation job to worker**

Add the following to `src-api/app/worker.py`:

After the existing imports, add:

```python
from app.models.site import Site
from app.models.job_posting import JobPosting
from app.models.profile import Profile
from app.models.user import User
from app.services.site_generator import build_input_json, write_input_file, run_generator, cleanup_generation_dir
from app.services.profile_tailor import tailor_profile
from app.services.llm_service import get_api_key_for_provider
from app.models.api_key import APIKey
```

Add the job function after `parse_document_job`:

```python
async def generate_site_job(ctx, site_id: str):
    session_factory = ctx["session_factory"]
    async with session_factory() as session:
        result = await session.execute(
            select(Site).where(Site.id == uuid.UUID(site_id))
        )
        site = result.scalar_one_or_none()
        if site is None:
            logger.error(f"Site {site_id} not found")
            return

        site.status = "generating"
        await session.commit()

        try:
            # Load profile
            result = await session.execute(
                select(Profile).where(Profile.id == site.profile_id)
            )
            profile = result.scalar_one()
            profile_data = profile.data

            # Load user for username
            result = await session.execute(
                select(User).where(User.id == site.user_id)
            )
            user = result.scalar_one()

            job_posting_dict = None

            # For targeted sites, tailor the profile
            if site.type == "targeted" and site.job_posting_id:
                result = await session.execute(
                    select(JobPosting).where(JobPosting.id == site.job_posting_id)
                )
                job_posting = result.scalar_one()
                job_posting_dict = {
                    "title": job_posting.title,
                    "company": job_posting.company,
                    "description": job_posting.description,
                    "requirements": job_posting.requirements,
                }

                # Get user's selected model
                result = await session.execute(
                    select(APIKey).where(
                        APIKey.user_id == site.user_id,
                        APIKey.selected_model.isnot(None),
                    )
                )
                key_record = result.scalars().first()
                if key_record and key_record.selected_model:
                    profile_data = await tailor_profile(
                        profile_data=profile_data,
                        job_posting=job_posting_dict,
                        model=key_record.selected_model,
                        user_id=site.user_id,
                        db=session,
                    )

            # Build and write input
            output_dir = str(Path(settings.output_dir) / site.output_path)
            input_data = build_input_json(
                site_id=site.id,
                site_type=site.type,
                theme=site.theme,
                profile_data=profile_data,
                output_dir=output_dir,
                job_posting=job_posting_dict,
            )
            input_path = write_input_file(site.id, input_data)

            # Run generator
            await run_generator(input_path)

            # Success
            from datetime import datetime, timezone
            site.status = "ready"
            site.generated_at = datetime.now(timezone.utc)
            logger.info(f"Generated site {site_id} at {site.output_path}")

        except Exception as e:
            logger.error(f"Failed to generate site {site_id}: {e}")
            site.status = "failed"
            site.error_message = str(e)

        finally:
            cleanup_generation_dir(uuid.UUID(site_id))
            await session.commit()
```

Add `Path` import at the top:

```python
from pathlib import Path
```

Update `WorkerSettings.functions` to include the new job:

```python
class WorkerSettings:
    functions = [parse_document_job, generate_site_job]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = get_redis_settings()
```

- [ ] **Step 2: Run existing tests to verify no regressions**

Run: `cd src-api && uv run pytest tests/unit/ -v`
Expected: All existing tests PASS

- [ ] **Step 3: Commit**

```bash
git add src-api/app/worker.py
git commit -m "feat: add site generation ARQ job with profile tailoring"
```

---

## Task 11: Sites Router

**Files:**
- Create: `src-api/app/routers/sites.py`
- Modify: `src-api/app/main.py`

- [ ] **Step 1: Create sites router**

Create `src-api/app/routers/sites.py`:

```python
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.profile import Profile
from app.models.user import User
from app.schemas.sites import PortfolioGenerateRequest, SiteResponse, TargetedGenerateRequest
from app.services import site_service

router = APIRouter(prefix="/api/sites", tags=["sites"])


def _to_response(site, stale: bool = False) -> SiteResponse:
    public_url = f"{settings.site_url}/{site.output_path}"
    return SiteResponse(
        id=str(site.id),
        slug=site.slug,
        type=site.type,
        theme=site.theme,
        status=site.status,
        error_message=site.error_message,
        output_path=site.output_path,
        public_url=public_url,
        stale=stale,
        job_posting_id=str(site.job_posting_id) if site.job_posting_id else None,
        generated_at=site.generated_at.isoformat() if site.generated_at else None,
        created_at=site.created_at.isoformat(),
        updated_at=site.updated_at.isoformat(),
    )


async def _get_user_and_profile(db: AsyncSession, user_id: uuid.UUID):
    """Load user and profile, raising if username or profile not set."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one()
    if not user.username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Set a username before generating sites.",
        )

    result = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Synthesize a profile before generating sites.",
        )

    return user, profile


@router.post("/portfolio", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
async def generate_portfolio(
    request: PortfolioGenerateRequest,
    req: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    user, profile = await _get_user_and_profile(db, user_id)

    site = await site_service.create_portfolio_site(
        db=db,
        user_id=user_id,
        profile_id=profile.id,
        username=user.username,
        theme=request.theme,
    )

    # Enqueue generation job
    pool = req.app.state.arq_pool
    await pool.enqueue_job("generate_site_job", str(site.id))

    return _to_response(site)


@router.post("/targeted", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
async def generate_targeted(
    request: TargetedGenerateRequest,
    req: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    user, profile = await _get_user_and_profile(db, user_id)

    site = await site_service.create_targeted_site(
        db=db,
        user_id=user_id,
        profile_id=profile.id,
        job_posting_id=request.job_posting_id,
        username=user.username,
        theme=request.theme,
    )

    pool = req.app.state.arq_pool
    await pool.enqueue_job("generate_site_job", str(site.id))

    return _to_response(site)


@router.get("/", response_model=list[SiteResponse])
async def list_sites(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    sites = await site_service.list_sites(db, user_id)

    # Check staleness for portfolio
    result = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = result.scalar_one_or_none()

    responses = []
    for s in sites:
        stale = False
        if s.type == "portfolio" and profile:
            stale = site_service.is_portfolio_stale(profile.updated_at, s.generated_at)
        responses.append(_to_response(s, stale=stale))
    return responses


@router.get("/{site_id}", response_model=SiteResponse)
async def get_site(
    site_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    site = await site_service.get_site(db, site_id, user_id)
    if site is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    stale = False
    if site.type == "portfolio":
        result = await db.execute(select(Profile).where(Profile.user_id == user_id))
        profile = result.scalar_one_or_none()
        if profile:
            stale = site_service.is_portfolio_stale(profile.updated_at, site.generated_at)

    return _to_response(site, stale=stale)


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_site(
    site_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    try:
        output_path = await site_service.delete_site(db, site_id, user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )

    # Clean up output files
    full_path = Path(settings.output_dir) / output_path
    if full_path.exists():
        shutil.rmtree(full_path)

    return None
```

- [ ] **Step 2: Mount router in main.py**

Add to `src-api/app/main.py` imports:

```python
from app.routers import sites
```

Add after existing `app.include_router` calls:

```python
app.include_router(sites.router)
```

- [ ] **Step 3: Run existing tests to verify no regressions**

Run: `cd src-api && uv run pytest tests/unit/ -v`
Expected: All existing tests PASS

- [ ] **Step 4: Commit**

```bash
git add src-api/app/routers/sites.py src-api/app/main.py
git commit -m "feat: add sites router with portfolio/targeted generation and deletion"
```

---

## Task 12: Next.js Generator CLI Entry Point

**Files:**
- Create: `src-generator/generate.js`

- [ ] **Step 1: Create the generator CLI**

Create `src-generator/generate.js`:

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse --input argument
const args = process.argv.slice(2);
const inputIndex = args.indexOf('--input');
if (inputIndex === -1 || !args[inputIndex + 1]) {
  console.error('Usage: node generate.js --input <path-to-input.json>');
  process.exit(1);
}

const inputPath = args[inputIndex + 1];

// Read input
let input;
try {
  input = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
} catch (e) {
  console.error(`Failed to read input: ${e.message}`);
  process.exit(1);
}

const { site_id, type, theme, profile, output_dir, job_posting } = input;

console.log(`Generating ${type} site with theme "${theme}" for site ${site_id}`);
console.log(`Output: ${output_dir}`);

// Write profile data for Next.js to consume
const dataDir = path.join(__dirname, '.data');
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(
  path.join(dataDir, 'profile.json'),
  JSON.stringify(profile, null, 2)
);

if (job_posting) {
  fs.writeFileSync(
    path.join(dataDir, 'job-posting.json'),
    JSON.stringify(job_posting, null, 2)
  );
}

// Write build config
fs.writeFileSync(
  path.join(dataDir, 'build-config.json'),
  JSON.stringify({ site_id, type, theme, output_dir }, null, 2)
);

// Run Next.js static export
try {
  // Set environment variables for the build
  const env = {
    ...process.env,
    NEXT_PUBLIC_THEME: theme,
    NEXT_PUBLIC_SITE_TYPE: type,
  };

  execSync('npx next build', {
    cwd: __dirname,
    stdio: 'inherit',
    env,
  });

  // Copy the static output to the target directory
  const nextOutputDir = path.join(__dirname, 'out');
  if (!fs.existsSync(nextOutputDir)) {
    console.error('Next.js build did not produce output directory');
    process.exit(1);
  }

  // Ensure output directory exists
  fs.mkdirSync(output_dir, { recursive: true });

  // Copy files recursively
  copyRecursive(nextOutputDir, output_dir);

  console.log(`Site generated successfully at ${output_dir}`);
} catch (e) {
  console.error(`Build failed: ${e.message}`);
  process.exit(1);
} finally {
  // Clean up .data directory
  fs.rmSync(dataDir, { recursive: true, force: true });
}

function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
```

- [ ] **Step 2: Update Next.js config for static export**

Ensure `src-generator/next.config.js` has `output: 'export'`:

Check the current file — if it doesn't have `output: 'export'`, add it:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
};

module.exports = nextConfig;
```

- [ ] **Step 3: Commit**

```bash
git add src-generator/generate.js src-generator/next.config.js
git commit -m "feat: add Next.js generator CLI entry point for static site builds"
```

---

## Task 13: Docker Compose Changes

**Files:**
- Modify: `docker-compose.yml`
- Create: `nginx/sites.conf`

- [ ] **Step 1: Create Nginx config for public sites**

Create `nginx/sites.conf`:

```nginx
server {
    listen 80;
    server_name _;

    root /data/output;
    index index.html;

    # /{username} -> /{username}/index.html
    # /{username}/{slug} -> /{username}/{slug}/index.html
    location / {
        try_files $uri $uri/ $uri/index.html =404;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # No favicon errors
    location = /favicon.ico {
        return 204;
        access_log off;
    }
}
```

- [ ] **Step 2: Update docker-compose.yml**

Add new volumes to the `volumes:` section at the bottom:

```yaml
volumes:
  postgres-data:
  uploads-data:
  generation-data:
  output-data:
```

Add `generation-data` and `output-data` mounts to the `worker` service:

```yaml
  worker:
    # ... existing config ...
    volumes:
      - uploads-data:/data/uploads
      - generation-data:/data/generation
      - output-data:/data/output
    environment:
      # ... existing env vars ...
      GENERATION_DIR: /data/generation
      OUTPUT_DIR: /data/output
```

Same volumes on `worker-dev`:

```yaml
  worker-dev:
    extends:
      service: worker
    profiles: ["dev"]
    volumes:
      - ./src-api/app:/app/app
      - uploads-data:/data/uploads
      - generation-data:/data/generation
      - output-data:/data/output
    environment:
      LOG_LEVEL: debug
```

Add `GENERATION_DIR` and `OUTPUT_DIR` to the `api` and `api-dev` services too (so config resolves correctly):

```yaml
    environment:
      # ... existing ...
      GENERATION_DIR: /data/generation
      OUTPUT_DIR: /data/output
```

Add public sites service (base + dev):

```yaml
  public-sites:
    image: nginx:alpine
    volumes:
      - output-data:/data/output:ro
      - ./nginx/sites.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - app-network

  public-sites-dev:
    extends:
      service: public-sites
    profiles: ["dev"]
    ports:
      - "8080:80"
```

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml nginx/sites.conf
git commit -m "feat: add public Nginx service and generation/output volumes to Docker Compose"
```

---

## Task 14: Integration Tests

**Files:**
- Create: `src-api/tests/integration/test_job_posting_flow.py`
- Create: `src-api/tests/integration/test_site_flow.py`

- [ ] **Step 1: Write job posting integration tests**

Create `src-api/tests/integration/test_job_posting_flow.py`:

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
    app.state.arq_pool = AsyncMock()

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


class TestJobPostingCRUD:
    @pytest.mark.asyncio
    async def test_create_and_list(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        resp = await client.post(
            "/api/job-postings/",
            headers=headers,
            json={
                "title": "Senior Engineer",
                "company": "Acme Corp",
                "description": "Build distributed systems.",
            },
        )
        assert resp.status_code == 201
        posting_id = resp.json()["id"]

        # List
        resp = await client.get("/api/job-postings/", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["id"] == posting_id

    @pytest.mark.asyncio
    async def test_update_and_get(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        resp = await client.post(
            "/api/job-postings/",
            headers=headers,
            json={
                "title": "Engineer",
                "company": "Acme",
                "description": "Description.",
            },
        )
        posting_id = resp.json()["id"]

        resp = await client.put(
            f"/api/job-postings/{posting_id}",
            headers=headers,
            json={"title": "Senior Engineer"},
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Senior Engineer"

        resp = await client.get(f"/api/job-postings/{posting_id}", headers=headers)
        assert resp.json()["title"] == "Senior Engineer"

    @pytest.mark.asyncio
    async def test_delete(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        resp = await client.post(
            "/api/job-postings/",
            headers=headers,
            json={
                "title": "Engineer",
                "company": "Acme",
                "description": "Desc.",
            },
        )
        posting_id = resp.json()["id"]

        resp = await client.delete(f"/api/job-postings/{posting_id}", headers=headers)
        assert resp.status_code == 204

        resp = await client.get(f"/api/job-postings/{posting_id}", headers=headers)
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_from_text_returns_draft(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        # Need an API key with selected model
        from sqlalchemy import text as sql_text
        async for db in app.dependency_overrides[get_db]():
            # Get user ID from token
            from app.middleware.auth import auth_service
            payload = auth_service.decode_access_token(token)
            user_id = payload["sub"]

            # Insert mock API key with selected model
            await db.execute(
                sql_text(
                    "INSERT INTO api_keys (id, user_id, provider, encrypted_key, nonce, selected_model) "
                    "VALUES (gen_random_uuid(), :uid, 'anthropic', :key, :nonce, 'anthropic/claude-sonnet-4-20250514')"
                ),
                {"uid": user_id, "key": b"fake", "nonce": b"fake12bytes!"},
            )
            await db.commit()

        extraction_json = json.dumps({
            "title": "Backend Dev",
            "company": "TestCo",
            "description": "Build APIs.",
            "requirements": {"required_skills": ["Python"]},
        })

        with patch("app.services.job_posting_extractor.llm_service") as mock_llm:
            mock_llm.complete = AsyncMock(return_value=extraction_json)

            resp = await client.post(
                "/api/job-postings/from-text",
                headers=headers,
                json={"raw_text": "Backend Dev at TestCo. Requirements: Python."},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["title"] == "Backend Dev"
            assert data["company"] == "TestCo"
```

- [ ] **Step 2: Write site flow integration tests**

Create `src-api/tests/integration/test_site_flow.py`:

```python
import uuid
from unittest.mock import AsyncMock

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
    app.state.arq_pool = AsyncMock()

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


async def _setup_user_with_profile(client, token, headers):
    """Set username and create a profile."""
    # Set username
    resp = await client.put(
        "/api/auth/username",
        headers=headers,
        json={"username": f"testuser{uuid.uuid4().hex[:6]}"},
    )
    assert resp.status_code == 200

    # Create profile
    resp = await client.put(
        "/api/profile/",
        headers=headers,
        json={
            "basics": {"name": "Jane Doe", "title": "Engineer"},
            "skills": [{"category": "Languages", "items": ["Python"]}],
        },
    )
    assert resp.status_code == 200


class TestSiteGeneration:
    @pytest.mark.asyncio
    async def test_portfolio_generation_requires_username(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        # Create profile but no username
        await client.put(
            "/api/profile/",
            headers=headers,
            json={"basics": {"name": "Jane Doe"}},
        )

        resp = await client.post(
            "/api/sites/portfolio",
            headers=headers,
            json={"theme": "minimal"},
        )
        assert resp.status_code == 400
        assert "username" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_portfolio_generation_requires_profile(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)

        # Set username but no profile
        await client.put(
            "/api/auth/username",
            headers=headers,
            json={"username": f"testuser{uuid.uuid4().hex[:6]}"},
        )

        resp = await client.post(
            "/api/sites/portfolio",
            headers=headers,
            json={"theme": "minimal"},
        )
        assert resp.status_code == 400
        assert "profile" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_portfolio_creates_site_and_enqueues_job(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)
        await _setup_user_with_profile(client, token, headers)

        resp = await client.post(
            "/api/sites/portfolio",
            headers=headers,
            json={"theme": "minimal"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["type"] == "portfolio"
        assert data["status"] == "queued"
        assert data["theme"] == "minimal"

        # Verify job was enqueued
        app.state.arq_pool.enqueue_job.assert_called_once()

    @pytest.mark.asyncio
    async def test_list_sites(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)
        await _setup_user_with_profile(client, token, headers)

        await client.post(
            "/api/sites/portfolio",
            headers=headers,
            json={"theme": "minimal"},
        )

        resp = await client.get("/api/sites/", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    @pytest.mark.asyncio
    async def test_cannot_delete_portfolio(self, client):
        token = await _register_and_get_token(client)
        headers = _auth_headers(token)
        await _setup_user_with_profile(client, token, headers)

        resp = await client.post(
            "/api/sites/portfolio",
            headers=headers,
            json={"theme": "minimal"},
        )
        site_id = resp.json()["id"]

        resp = await client.delete(f"/api/sites/{site_id}", headers=headers)
        assert resp.status_code == 400
        assert "portfolio" in resp.json()["detail"].lower()
```

- [ ] **Step 3: Run integration tests**

Run: `cd src-api && uv run pytest tests/integration/test_job_posting_flow.py tests/integration/test_site_flow.py -v`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src-api/tests/integration/test_job_posting_flow.py \
  src-api/tests/integration/test_site_flow.py
git commit -m "feat: add integration tests for job posting and site generation flows"
```

---

## Task 15: Update Documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md**

Update the "REST API Endpoints" section to include the new endpoints.

Update "Current Phase" to reflect Phase 3a completion.

Update "Database" section to list new tables: `job_postings`, `sites`.

Update "Common Commands" if needed (e.g., new public sites URL on port 8080).

Add `GENERATION_DIR` and `OUTPUT_DIR` to environment variables section.

- [ ] **Step 2: Run full test suite**

Run: `cd src-api && uv run pytest -v`
Expected: All tests PASS (unit + integration)

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update documentation for Phase 3a"
```
