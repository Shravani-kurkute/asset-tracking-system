"""Centralized application settings loaded from environment variables."""

from functools import lru_cache
from urllib.parse import parse_qsl, quote_plus, urlencode, urlparse, urlunparse
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Asset Tracking System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str
    DATABASE_URL_OVERRIDE: str | None = Field(default=None, alias="DATABASE_URL")
    DB_HOST: str | None = None
    DB_PORT: int = 3306
    DB_USER: str | None = None
    DB_PASSWORD: str | None = None
    DB_NAME: str | None = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: str = ""

    @property
    def DATABASE_URL(self) -> str:
        if self.DATABASE_URL_OVERRIDE:
            return self._normalize_database_url(self.DATABASE_URL_OVERRIDE)

        if not all([self.DB_HOST, self.DB_USER, self.DB_PASSWORD, self.DB_NAME]):
            raise ValueError(
                "Database configuration is incomplete. Set DATABASE_URL or DB_HOST, "
                "DB_USER, DB_PASSWORD, and DB_NAME."
            )
        password = quote_plus(self.DB_PASSWORD)
        return f"mysql+pymysql://{self.DB_USER}:{password}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    def _normalize_database_url(self, raw_url: str) -> str:
        parsed = urlparse(raw_url)

        if parsed.scheme in {"postgres", "postgresql"}:
            scheme = "postgresql+psycopg"
            query = dict(parse_qsl(parsed.query, keep_blank_values=True))
            query.setdefault("sslmode", "require")
            return urlunparse(parsed._replace(scheme=scheme, query=urlencode(query)))

        return raw_url

    @property
    def allowed_origins(self) -> list[str]:
        configured = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        defaults = [
            self.FRONTEND_URL,
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
        ]
        return list(dict.fromkeys([*configured, *defaults]))

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
