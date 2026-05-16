from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(url: str) -> str:
    """Map host-provided URLs (e.g. Render postgresql://) to the psycopg3 SQLAlchemy driver."""
    trimmed = url.strip()
    if trimmed.startswith("postgres://"):
        return "postgresql+psycopg://" + trimmed[len("postgres://") :]
    if trimmed.startswith("postgresql://"):
        return "postgresql+psycopg://" + trimmed[len("postgresql://") :]
    return trimmed


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://assistant:assistant@localhost:5433/assistant_director"
    cors_allow_origins: str = "http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006"

    @field_validator("database_url", mode="before")
    @classmethod
    def database_url_uses_psycopg_driver(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        return normalize_database_url(value)


@lru_cache
def get_settings() -> Settings:
    return Settings()
