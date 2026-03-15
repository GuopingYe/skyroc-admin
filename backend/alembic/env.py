"""Alembic 环境配置"""
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool, engine_from_config
from sqlalchemy.engine import Connection

from app.core.config import settings
from app.models import Base

# Alembic Config 对象
config = context.config

# 转换异步 URL 为同步 URL（alembic 使用同步连接）
db_url = settings.DATABASE_URL.replace("+asyncpg", "")
# 如果 URL 没有密码，添加密码
if "postgres@" in db_url and ":postgres123" not in db_url:
    db_url = db_url.replace("postgres@", "postgres:postgres123@")
config.set_main_option("sqlalchemy.url", db_url)

# 日志配置
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# MetaData 对象，用于 autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    离线模式运行迁移
    只生成 SQL 脚本，不实际执行
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    在线模式运行迁移
    使用同步连接
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()