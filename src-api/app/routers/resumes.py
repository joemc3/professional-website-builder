import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.job_posting import JobPosting
from app.models.profile import Profile
from app.models.user import User
from app.schemas.resume import GeneralResumeRequest, ResumeResponse, TargetedResumeRequest
from app.services import resume_service

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


def _to_response(resume, job_posting_title: str | None = None) -> ResumeResponse:
    resume_type = "general" if resume.job_posting_id is None else "targeted"
    return ResumeResponse(
        id=str(resume.id),
        type=resume_type,
        theme=resume.theme,
        page_target=resume.page_target,
        actual_pages=resume.actual_pages,
        status=resume.status,
        error_message=resume.error_message,
        stale=resume.stale,
        job_posting_id=str(resume.job_posting_id) if resume.job_posting_id else None,
        job_posting_title=job_posting_title,
        generated_at=resume.generated_at.isoformat() if resume.generated_at else None,
        created_at=resume.created_at.isoformat(),
    )


async def _get_user_and_profile(db: AsyncSession, user_id: uuid.UUID):
    """Load user and profile, raising if not set."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one()

    result = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Synthesize a profile before generating resumes.",
        )

    return user, profile


@router.post("/general", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def generate_general(
    request: GeneralResumeRequest,
    req: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    user, profile = await _get_user_and_profile(db, user_id)

    resume = await resume_service.create_general_resume(
        db=db,
        user_id=user_id,
        profile_id=profile.id,
        theme=request.theme,
        page_target=request.page_target,
    )

    pool = req.app.state.arq_pool
    await pool.enqueue_job("generate_resume_job", str(resume.id))

    return _to_response(resume)


@router.post("/targeted", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def generate_targeted(
    request: TargetedResumeRequest,
    req: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    user, profile = await _get_user_and_profile(db, user_id)

    # Verify job posting exists and belongs to user
    result = await db.execute(
        select(JobPosting).where(
            JobPosting.id == request.job_posting_id, JobPosting.user_id == user_id
        )
    )
    job_posting = result.scalar_one_or_none()
    if job_posting is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found"
        )

    resume = await resume_service.create_targeted_resume(
        db=db,
        user_id=user_id,
        profile_id=profile.id,
        job_posting_id=request.job_posting_id,
        theme=request.theme,
        page_target=request.page_target,
    )

    pool = req.app.state.arq_pool
    await pool.enqueue_job("generate_resume_job", str(resume.id))

    return _to_response(resume, job_posting_title=job_posting.title)


@router.get("/", response_model=list[ResumeResponse])
async def list_resumes(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    resumes = await resume_service.list_resumes(db, user_id)

    # Batch-load job posting titles
    job_ids = {r.job_posting_id for r in resumes if r.job_posting_id}
    job_titles: dict[uuid.UUID, str] = {}
    if job_ids:
        result = await db.execute(
            select(JobPosting.id, JobPosting.title).where(JobPosting.id.in_(job_ids))
        )
        job_titles = {row.id: row.title for row in result.all()}

    return [
        _to_response(r, job_posting_title=job_titles.get(r.job_posting_id))
        for r in resumes
    ]


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    resume = await resume_service.get_resume(db, resume_id, user_id)
    if resume is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    job_title = None
    if resume.job_posting_id:
        result = await db.execute(
            select(JobPosting.title).where(JobPosting.id == resume.job_posting_id)
        )
        row = result.first()
        job_title = row.title if row else None

    return _to_response(resume, job_posting_title=job_title)


@router.get("/{resume_id}/download")
async def download_resume(
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    resume = await resume_service.get_resume(db, resume_id, user_id)
    if resume is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    if resume.status != "ready" or not resume.file_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume is not ready for download",
        )

    file_path = Path(resume.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Resume file not found on disk"
        )

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=f"resume-{resume.theme}.pdf",
    )


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    try:
        file_path = await resume_service.delete_resume(db, resume_id, user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        )

    # Clean up PDF file
    if file_path:
        path = Path(file_path)
        if path.exists():
            path.unlink()

    return None
