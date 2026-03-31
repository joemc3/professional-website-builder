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

    @pytest.mark.asyncio
    async def test_none_content_raises_llm_error(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()
        messages = [{"role": "user", "content": "hello"}]

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = None

        with (
            patch("app.services.llm_service.get_api_key_for_provider", new_callable=AsyncMock, return_value="sk-key"),
            patch("app.services.llm_service.litellm") as mock_litellm,
        ):
            mock_litellm.acompletion = AsyncMock(return_value=mock_response)
            with pytest.raises(LLMError, match="Model returned empty content"):
                await complete("anthropic/claude-sonnet-4-20250514", messages, user_id, mock_db)


class TestStream:
    @pytest.mark.asyncio
    async def test_yields_chunks(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()
        messages = [{"role": "user", "content": "hello"}]

        chunk1 = MagicMock()
        chunk1.choices = [MagicMock()]
        chunk1.choices[0].delta.content = "hel"

        chunk2 = MagicMock()
        chunk2.choices = [MagicMock()]
        chunk2.choices[0].delta.content = "lo"

        chunk3 = MagicMock()
        chunk3.choices = [MagicMock()]
        chunk3.choices[0].delta.content = None

        async def mock_stream():
            for chunk in [chunk1, chunk2, chunk3]:
                yield chunk

        with (
            patch("app.services.llm_service.get_api_key_for_provider", new_callable=AsyncMock, return_value="sk-key"),
            patch("app.services.llm_service.litellm") as mock_litellm,
        ):
            mock_litellm.acompletion = AsyncMock(return_value=mock_stream())
            chunks = []
            async for chunk in stream("anthropic/claude-sonnet-4-20250514", messages, user_id, mock_db):
                chunks.append(chunk)

        assert chunks == ["hel", "lo"]

    @pytest.mark.asyncio
    async def test_ollama_passes_api_base(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()
        messages = [{"role": "user", "content": "hello"}]

        async def mock_stream():
            chunk = MagicMock()
            chunk.choices = [MagicMock()]
            chunk.choices[0].delta.content = "ok"
            yield chunk

        with (
            patch("app.services.llm_service.get_api_key_for_provider", new_callable=AsyncMock, return_value=None),
            patch("app.services.llm_service.litellm") as mock_litellm,
            patch("app.services.llm_service.settings") as mock_settings,
        ):
            mock_settings.ollama_url = "http://ollama.lan:11434"
            mock_litellm.acompletion = AsyncMock(return_value=mock_stream())
            chunks = []
            async for chunk in stream("ollama/llama3", messages, user_id, mock_db):
                chunks.append(chunk)

        assert chunks == ["ok"]
        call_kwargs = mock_litellm.acompletion.call_args.kwargs
        assert call_kwargs["api_base"] == "http://ollama.lan:11434"

    @pytest.mark.asyncio
    async def test_error_maps_to_llm_error(self):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()
        messages = [{"role": "user", "content": "hello"}]

        with (
            patch("app.services.llm_service.get_api_key_for_provider", new_callable=AsyncMock, return_value="sk-key"),
            patch("app.services.llm_service.litellm") as mock_litellm,
        ):
            mock_litellm.acompletion = AsyncMock(side_effect=Exception("Connection failed"))
            with pytest.raises(LLMError, match="Connection failed"):
                async for _ in stream("anthropic/claude-sonnet-4-20250514", messages, user_id, mock_db):
                    pass
