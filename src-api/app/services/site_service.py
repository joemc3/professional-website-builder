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
