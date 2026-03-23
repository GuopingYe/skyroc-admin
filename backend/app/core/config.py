"""
核心配置模块
"""
from functools import lru_cache
from typing import Literal
import secrets
import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # 忽略 .env 中的额外字段
    )

    # API Server
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8080

    # Database (defaults match docker-compose.yml)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres123@localhost:15432/clinical_mdr"

    # Security - SECRET_KEY must be set via environment variable in production
    # Generate a secure key: python -c "import secrets; print(secrets.token_urlsafe(32))"
    SECRET_KEY: str = ""  # No default - must be explicitly set
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Environment
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    # CDISC Library API
    CDISC_LIBRARY_API_KEY: str = ""
    CDISC_API_BASE_URL: str = "https://library.cdisc.org/api"

    # Default Admin Credentials (for seed data only - should be changed after initial setup)
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_PASSWORD: str = ""  # No default - must be explicitly set
    DEFAULT_ADMIN_EMAIL: str = "admin@pharma.com"

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100  # Max requests per window
    RATE_LIMIT_WINDOW_SECONDS: int = 60  # Window in seconds

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Validate critical security settings
        if not self.SECRET_KEY:
            if self.ENVIRONMENT == "production":
                raise ValueError(
                    "SECRET_KEY environment variable must be set in production! "
                    "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
                )
            else:
                # Generate a temporary key for development only
                self.SECRET_KEY = secrets.token_urlsafe(32)
                print("⚠️  WARNING: Using auto-generated SECRET_KEY for development. "
                      "Set SECRET_KEY environment variable for production.")


@lru_cache
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


settings = get_settings()