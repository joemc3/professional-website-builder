from pydantic import BaseModel


class APIKeySaveRequest(BaseModel):
    provider: str
    api_key: str


class APIKeySaveResponse(BaseModel):
    provider: str
    saved: bool


class APIKeyStatusResponse(BaseModel):
    provider: str
    is_set: bool


class TestConnectionRequest(BaseModel):
    provider: str


class TestConnectionResponse(BaseModel):
    provider: str
    status: str
    message: str | None = None
