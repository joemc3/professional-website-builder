import logging
import subprocess
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import async_session_factory
from app.routers import auth

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run Alembic migrations on startup
    result = subprocess.run(
        ["uv", "run", "alembic", "upgrade", "head"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        logger.error(f"Migration failed: {result.stderr}")
    else:
        logger.info("Database migrations applied successfully")

    # Create ARQ Redis pool
    app.state.arq_pool = None
    try:
        from arq import create_pool

        from app.worker import get_redis_settings

        app.state.arq_pool = await create_pool(get_redis_settings())
        logger.info("ARQ pool connected to Redis")
    except Exception as e:
        logger.warning(f"Redis not available — background jobs disabled: {e}")

    yield

    # Cleanup
    if app.state.arq_pool is not None:
        await app.state.arq_pool.close()


app = FastAPI(
    title="Professional Website Builder API",
    version="0.2.0",
    lifespan=lifespan,
)

allowed_origins = [settings.admin_url]
if settings.cors_origins:
    allowed_origins.extend(settings.cors_origins.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)


@app.get("/health")
async def health_check():
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception:
        return {"status": "degraded", "database": "disconnected"}
