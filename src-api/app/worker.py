import asyncio
import logging
import uuid
from urllib.parse import urlparse

from arq.connections import RedisSettings
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings
from app.models.document import Document
from app.services.document_parser import parse_document

logger = logging.getLogger(__name__)


def get_redis_settings() -> RedisSettings:
    parsed = urlparse(settings.redis_url)
    return RedisSettings(
        host=parsed.hostname or "localhost",
        port=parsed.port or 6379,
        password=parsed.password,
    )


async def startup(ctx):
    engine = create_async_engine(settings.database_url)
    ctx["session_factory"] = async_sessionmaker(engine, expire_on_commit=False)
    logger.info("Worker started")


async def shutdown(ctx):
    if "session_factory" in ctx:
        engine = ctx["session_factory"].kw.get("bind")
        if engine:
            await engine.dispose()
    logger.info("Worker shut down")


async def parse_document_job(ctx, doc_id: str):
    session_factory = ctx["session_factory"]
    async with session_factory() as session:
        result = await session.execute(
            select(Document).where(Document.id == uuid.UUID(doc_id))
        )
        document = result.scalar_one_or_none()
        if document is None:
            logger.error(f"Document {doc_id} not found")
            return

        try:
            from pathlib import Path

            full_path = str(Path(settings.upload_dir) / document.file_path)
            parsed_text = await asyncio.to_thread(parse_document, full_path, document.content_type)
            document.parsed_text = parsed_text
            document.status = "completed"
            logger.info(f"Parsed document {doc_id}: {len(parsed_text)} chars")
        except Exception as e:
            logger.error(f"Failed to parse document {doc_id}: {e}")
            document.status = "failed"
            document.error_message = str(e)

        await session.commit()


class WorkerSettings:
    functions = [parse_document_job]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = get_redis_settings()
