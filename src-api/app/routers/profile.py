import json
import uuid

from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.schemas.profile import ProfileData, ProfileResponse, SynthesizeRequest
from app.services import profile_service
from app.services.photo_service import delete_photo, resize_photo, save_photo, validate_photo
from app.services.profile_synthesizer import synthesize_profile
from app.services.resume_service import mark_resumes_stale

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
        photo_path=profile.photo_path,
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
    await mark_resumes_stale(db, user_id)
    return ProfileResponse(
        id=str(profile.id),
        data=ProfileData(**profile.data),
        guidance=profile.guidance,
        photo_path=profile.photo_path,
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
    await mark_resumes_stale(db, user_id)
    return ProfileResponse(
        id=str(profile.id),
        data=ProfileData(**profile.data),
        guidance=profile.guidance,
        photo_path=profile.photo_path,
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

            # Mark resumes stale after re-synthesis
            await mark_resumes_stale(db, user_id)

        except ValueError as e:
            yield _sse_event("error", {"message": str(e)})
        except Exception as e:
            yield _sse_event("error", {"message": f"Synthesis failed: {str(e)}"})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _sse_event(event_type: str, data: dict) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


@router.post("/photo", response_model=ProfileResponse)
async def upload_photo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    profile = await profile_service.get_profile(db, user_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No profile exists")

    try:
        validate_photo(file.content_type or "", file.size or 0)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    data = await file.read()
    resized = resize_photo(data, file.content_type or "image/jpeg")
    rel_path = save_photo(user_id, resized, file.content_type or "image/jpeg")

    profile.photo_path = rel_path
    await db.commit()
    await db.refresh(profile)

    return ProfileResponse(
        id=str(profile.id),
        data=ProfileData(**profile.data),
        guidance=profile.guidance,
        photo_path=profile.photo_path,
        generated_at=profile.generated_at.isoformat() if profile.generated_at else None,
        created_at=profile.created_at.isoformat(),
        updated_at=profile.updated_at.isoformat(),
    )


@router.delete("/photo", response_model=ProfileResponse)
async def remove_photo(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    profile = await profile_service.get_profile(db, user_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No profile exists")

    if profile.photo_path:
        delete_photo(profile.photo_path)
        profile.photo_path = None
        await db.commit()
        await db.refresh(profile)

    return ProfileResponse(
        id=str(profile.id),
        data=ProfileData(**profile.data),
        guidance=profile.guidance,
        photo_path=profile.photo_path,
        generated_at=profile.generated_at.isoformat() if profile.generated_at else None,
        created_at=profile.created_at.isoformat(),
        updated_at=profile.updated_at.isoformat(),
    )


@router.get("/photo/file")
async def get_photo_file(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = uuid.UUID(current_user["id"])
    profile = await profile_service.get_profile(db, user_id)
    if profile is None or not profile.photo_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No photo")

    full_path = Path(settings.upload_dir) / profile.photo_path
    if not full_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo file missing")

    return FileResponse(str(full_path))
