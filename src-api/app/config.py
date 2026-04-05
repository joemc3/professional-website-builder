from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://pwbuser:pwbpass@localhost:5432/professional_website_builder"

    # Auth
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    # URLs (for generating shareable links)
    site_url: str = "http://localhost:8080"
    admin_url: str = "http://localhost:5173"

    # CORS
    cors_origins: str = ""

    # Logging
    log_level: str = "info"

    # Encryption
    secret_key: str = "change-me-in-production"

    # Redis (ARQ job queue)
    redis_url: str = "redis://redis:6379"

    # File uploads
    upload_dir: str = "uploads"
    max_upload_size_mb: int = 10

    # Ollama
    ollama_url: str = "http://localhost:11434"

    # Site generation
    generation_dir: str = "/data/generation"
    output_dir: str = "/data/output"
    generator_script: str = "/app/generator/generate.js"
    generator_dir: str = "/app/generator"
    preview_port: int = 3002
    preview_timeout_seconds: int = 300  # 5 minutes of inactivity

    model_config = {"env_prefix": "", "case_sensitive": False}


settings = Settings()
