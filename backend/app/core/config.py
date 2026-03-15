"""
核心配置模块
"""
from functools import lru_cache
from typing import Literal

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

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/clinical_mdr"

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Environment
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    # CDISC Library API
    CDISC_LIBRARY_API_KEY: str = ""
    CDISC_API_BASE_URL: str = "https://library.cdisc.org/api"

    # Default Admin Credentials (for seed data)
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"
    DEFAULT_ADMIN_EMAIL: str = "admin@pharma.com"

    # Default Admin Credentials (for seed data)
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"
    DEFAULT_ADMIN_EMAIL: str = "admin@pharma.com"


@lru_cache
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


settings = get_settings()