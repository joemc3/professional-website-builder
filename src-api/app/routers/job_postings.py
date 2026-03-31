import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.api_key import APIKey
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


async def _get_selected_model(db: AsyncSession, user_id: uuid.UUID) -> str:
    """Get the user's selected LLM model. Raises 400 if none configured."""
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
    return key_record.selected_model


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
    model = await _get_selected_model(db, user_id)

    try:
        draft = await extract_from_url(
            url=request.url,
            model=model,
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
    model = await _get_selected_model(db, user_id)

    try:
        draft = await extract_from_text(
            raw_text=request.raw_text,
            model=model,
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
