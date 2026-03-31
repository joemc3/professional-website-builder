import uuid

from pydantic import BaseModel


class PortfolioGenerateRequest(BaseModel):
    theme: str


class TargetedGenerateRequest(BaseModel):
    job_posting_id: uuid.UUID
    theme: str


class SiteResponse(BaseModel):
    id: str
    slug: str
    type: str
    theme: str
    status: str
    error_message: str | None
    output_path: str
    public_url: str
    stale: bool
    job_posting_id: str | None
    generated_at: str | None
    created_at: str
    updated_at: str
