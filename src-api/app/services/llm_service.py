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
        content = response.choices[0].message.content
        if content is None:
            raise LLMError("Model returned empty content")
        return content
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
