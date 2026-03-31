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
    TestConnectionRequest,
    TestConnectionResponse,
)
from app.services.encryption_service import decrypt, encrypt

router = APIRouter(prefix="/api/settings", tags=["settings"])

VALID_PROVIDERS = {"anthropic", "openai", "gemini", "openrouter"}
TEST_URLS = {
    "anthropic": ("https://api.anthropic.com/v1/models", lambda key: {"x-api-key": key, "anthropic-version": "2023-06-01"}),
    "openai": ("https://api.openai.com/v1/models", lambda key: {"Authorization": f"Bearer {key}"}),
    "gemini": (None, None),  # Uses query param
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
    return APIKeyStatusResponse(provider=provider, is_set=key is not None)


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


@router.post("/test-connection", response_model=TestConnectionResponse)
async def test_connection(
    request: TestConnectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if request.provider == "ollama":
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{settings.ollama_url}/api/tags")
                resp.raise_for_status()
            return TestConnectionResponse(provider="ollama", status="ok")
        except Exception as e:
            return TestConnectionResponse(provider="ollama", status="error", message=str(e))

    if request.provider not in VALID_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {request.provider}")

    result = await db.execute(
        select(APIKey).where(
            APIKey.user_id == uuid.UUID(current_user["id"]),
            APIKey.provider == request.provider,
        )
    )
    key_record = result.scalar_one_or_none()
    if key_record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No API key set for {request.provider}")

    api_key = decrypt(key_record.encrypted_key, key_record.nonce)

    if request.provider == "gemini":
        url = f"https://generativelanguage.googleapis.com/v1/models?key={api_key}"
        headers = {}
    else:
        url, header_fn = TEST_URLS[request.provider]
        headers = header_fn(api_key)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
        return TestConnectionResponse(provider=request.provider, status="ok")
    except httpx.HTTPStatusError as e:
        return TestConnectionResponse(
            provider=request.provider, status="error", message=f"HTTP {e.response.status_code}"
        )
    except Exception as e:
        return TestConnectionResponse(provider=request.provider, status="error", message=str(e))
