import asyncio
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from arq.connections import RedisSettings
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings
from app.models.api_key import APIKey
from app.models.document import Document
from app.models.job_posting import JobPosting
from app.models.profile import Profile
from app.models.resume import Resume
from app.models.site import Site
from app.models.user import User
from app.services.document_parser import parse_document
from app.services.profile_tailor import tailor_profile
from app.services.site_generator import build_input_json, cleanup_generation_dir, run_generator, write_input_file
from app.services.resume_generator import (
    build_general_prompt,
    build_targeted_prompt,
    build_trim_prompt,
    parse_resume_content,
    render_resume_html,
    render_pdf,
    count_pdf_pages,
)

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
    ctx["engine"] = engine
    ctx["session_factory"] = async_sessionmaker(engine, expire_on_commit=False)
    logger.info("Worker started")


async def shutdown(ctx):
    if "engine" in ctx:
        await ctx["engine"].dispose()
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


async def generate_site_job(ctx, site_id: str):
    session_factory = ctx["session_factory"]
    async with session_factory() as session:
        result = await session.execute(
            select(Site).where(Site.id == uuid.UUID(site_id))
        )
        site = result.scalar_one_or_none()
        if site is None:
            logger.error(f"Site {site_id} not found")
            return

        site.status = "generating"
        await session.commit()

        try:
            # Load profile
            result = await session.execute(
                select(Profile).where(Profile.id == site.profile_id)
            )
            profile = result.scalar_one()
            profile_data = profile.data

            # Load user for username
            result = await session.execute(
                select(User).where(User.id == site.user_id)
            )
            user = result.scalar_one()

            job_posting_dict = None

            # For targeted sites, tailor the profile
            if site.type == "targeted" and site.job_posting_id:
                result = await session.execute(
                    select(JobPosting).where(JobPosting.id == site.job_posting_id)
                )
                job_posting = result.scalar_one()
                job_posting_dict = {
                    "title": job_posting.title,
                    "company": job_posting.company,
                    "description": job_posting.description,
                    "requirements": job_posting.requirements,
                }

                # Get user's selected model
                result = await session.execute(
                    select(APIKey).where(
                        APIKey.user_id == site.user_id,
                        APIKey.selected_model.isnot(None),
                    )
                )
                key_record = result.scalars().first()
                if key_record and key_record.selected_model:
                    profile_data = await tailor_profile(
                        profile_data=profile_data,
                        job_posting=job_posting_dict,
                        model=key_record.selected_model,
                        user_id=site.user_id,
                        db=session,
                    )

            # Build and write input
            output_dir = str(Path(settings.output_dir) / site.output_path)
            input_data = build_input_json(
                site_id=site.id,
                site_type=site.type,
                theme=site.theme,
                profile_data=profile_data,
                output_dir=output_dir,
                job_posting=job_posting_dict,
            )
            input_path = write_input_file(site.id, input_data)

            # Run generator
            await run_generator(input_path)

            # Success
            site.status = "ready"
            site.generated_at = datetime.now(timezone.utc)
            logger.info(f"Generated site {site_id} at {site.output_path}")

        except Exception as e:
            logger.error(f"Failed to generate site {site_id}: {e}")
            site.status = "failed"
            site.error_message = str(e)

        finally:
            cleanup_generation_dir(uuid.UUID(site_id))
            await session.commit()


async def generate_resume_job(ctx, resume_id: str):
    session_factory = ctx["session_factory"]
    async with session_factory() as session:
        result = await session.execute(
            select(Resume).where(Resume.id == uuid.UUID(resume_id))
        )
        resume = result.scalar_one_or_none()
        if resume is None:
            logger.error(f"Resume {resume_id} not found")
            return

        resume.status = "tailoring"
        await session.commit()

        try:
            # Load profile
            result = await session.execute(
                select(Profile).where(Profile.id == resume.profile_id)
            )
            profile = result.scalar_one()
            profile_data = profile.data

            # Determine LLM model
            result = await session.execute(
                select(APIKey).where(
                    APIKey.user_id == resume.user_id,
                    APIKey.selected_model.isnot(None),
                )
            )
            key_record = result.scalars().first()
            if not key_record or not key_record.selected_model:
                raise RuntimeError("No LLM model configured. Set one in Settings.")

            model = key_record.selected_model

            # Build prompt
            if resume.job_posting_id:
                result = await session.execute(
                    select(JobPosting).where(JobPosting.id == resume.job_posting_id)
                )
                job_posting = result.scalar_one()
                job_dict = {
                    "title": job_posting.title,
                    "company": job_posting.company,
                    "description": job_posting.description,
                    "requirements": job_posting.requirements,
                }
                messages = build_targeted_prompt(profile_data, job_dict, resume.page_target)
            else:
                messages = build_general_prompt(profile_data, resume.page_target)

            # LLM call
            from app.services import llm_service

            response_text = await llm_service.complete(
                model, messages, resume.user_id, session, timeout=120
            )
            resume_content = parse_resume_content(response_text)
            resume.tailored_content = resume_content

            # Render
            resume.status = "rendering"
            await session.commit()

            basics = profile_data.get("basics", {})
            html = render_resume_html(resume_content, basics, resume.theme)
            pdf_bytes = await asyncio.to_thread(render_pdf, html)
            actual_pages = count_pdf_pages(pdf_bytes)

            # Trim loop (max 2 attempts)
            trim_attempts = 0
            while actual_pages > resume.page_target and trim_attempts < 2:
                trim_attempts += 1
                logger.info(
                    f"Resume {resume_id}: {actual_pages} pages > target {resume.page_target}, "
                    f"trim attempt {trim_attempts}"
                )
                trim_messages = build_trim_prompt(resume_content, actual_pages, resume.page_target)
                response_text = await llm_service.complete(
                    model, trim_messages, resume.user_id, session, timeout=120
                )
                resume_content = parse_resume_content(response_text)
                resume.tailored_content = resume_content

                html = render_resume_html(resume_content, basics, resume.theme)
                pdf_bytes = await asyncio.to_thread(render_pdf, html)
                actual_pages = count_pdf_pages(pdf_bytes)

            # Save PDF to disk
            resume_dir = Path(settings.output_dir) / "resumes" / str(resume.user_id)
            resume_dir.mkdir(parents=True, exist_ok=True)
            pdf_path = resume_dir / f"{resume.id}.pdf"
            pdf_path.write_bytes(pdf_bytes)

            # If general resume, also copy to portfolio output for public download
            if resume.job_posting_id is None:
                result = await session.execute(
                    select(User).where(User.id == resume.user_id)
                )
                user = result.scalar_one()
                if user.username:
                    public_dir = Path(settings.output_dir) / user.username
                    public_dir.mkdir(parents=True, exist_ok=True)
                    public_pdf = public_dir / "resume.pdf"
                    public_pdf.write_bytes(pdf_bytes)
                    logger.info(f"Copied general resume to {public_pdf}")

            # Success
            resume.file_path = str(pdf_path)
            resume.actual_pages = actual_pages
            resume.status = "ready"
            resume.generated_at = datetime.now(timezone.utc)
            logger.info(f"Generated resume {resume_id}: {actual_pages} pages")

        except Exception as e:
            logger.error(f"Failed to generate resume {resume_id}: {e}")
            resume.status = "failed"
            resume.error_message = str(e)

        finally:
            await session.commit()


class WorkerSettings:
    functions = [parse_document_job, generate_site_job, generate_resume_job]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = get_redis_settings()
