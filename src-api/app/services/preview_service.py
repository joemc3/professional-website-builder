"""Preview service — manages preview data and generator process for live theme preview."""

import asyncio
import json
import logging
import shutil
import time
import uuid
from pathlib import Path

from app.config import settings
from app.services.profile_transform import transform_profile_for_generator

logger = logging.getLogger(__name__)

# Module-level state for the generator process
_generator_process: asyncio.subprocess.Process | None = None
_generator_last_used: float = 0.0
_generator_lock = asyncio.Lock()


def prepare_preview_data(
    preview_id: uuid.UUID,
    theme: str,
    site_type: str,
    profile_data: dict,
    job_posting: dict | None = None,
    has_resume: bool = False,
    photo_url: str | None = None,
) -> Path:
    """Write transformed portfolio data for preview. Returns the data directory."""
    portfolio_data = transform_profile_for_generator(
        profile_data=profile_data,
        theme=theme,
        site_type=site_type,
        job_posting=job_posting,
        has_resume=has_resume,
    )

    if photo_url:
        portfolio_data["profile"]["photo"] = photo_url

    preview_dir = Path(settings.generation_dir) / "preview" / str(preview_id)
    preview_dir.mkdir(parents=True, exist_ok=True)

    data_file = preview_dir / "portfolio-data.json"
    data_file.write_text(json.dumps(portfolio_data, indent=2))

    return preview_dir


def cleanup_preview(preview_id: uuid.UUID) -> None:
    """Remove preview data directory."""
    preview_dir = Path(settings.generation_dir) / "preview" / str(preview_id)
    if preview_dir.exists():
        shutil.rmtree(preview_dir)


async def ensure_generator_running() -> int:
    """Start the generator dev server if not running. Returns the port."""
    global _generator_process, _generator_last_used

    async with _generator_lock:
        _generator_last_used = time.time()

        if _generator_process is not None and _generator_process.returncode is None:
            return settings.preview_port

        logger.info("Starting generator dev server for preview...")
        _generator_process = await asyncio.create_subprocess_exec(
            "npx", "next", "dev", "--port", str(settings.preview_port),
            cwd=settings.generator_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        # Wait briefly for the server to start
        await asyncio.sleep(3)

        if _generator_process.returncode is not None:
            stderr = await _generator_process.stderr.read() if _generator_process.stderr else b""
            raise RuntimeError(f"Generator failed to start: {stderr.decode()}")

        logger.info(f"Generator dev server running on port {settings.preview_port}")
        return settings.preview_port


async def stop_generator() -> None:
    """Stop the generator dev server."""
    global _generator_process

    async with _generator_lock:
        if _generator_process is not None and _generator_process.returncode is None:
            _generator_process.terminate()
            try:
                await asyncio.wait_for(_generator_process.wait(), timeout=5)
            except asyncio.TimeoutError:
                _generator_process.kill()
            logger.info("Generator dev server stopped")
        _generator_process = None


async def check_idle_timeout() -> None:
    """Stop the generator if it's been idle too long."""
    global _generator_last_used
    if _generator_process is not None and _generator_process.returncode is None:
        if time.time() - _generator_last_used > settings.preview_timeout_seconds:
            await stop_generator()
