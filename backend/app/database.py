"""
数据库连接与会话管理
支持 SQLAlchemy 2.0 异步模式
"""
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# 连接池配置
# - pool_size: 常驻连接数，适合中等并发
# - max_overflow: 允许超出 pool_size 的临时连接数
# - pool_pre_ping: 每次使用前检查连接是否有效，防止连接断开
# - pool_recycle: 连接回收时间（秒），防止 PostgreSQL 连接超时
POOL_CONFIG = {
    "pool_size": 5,
    "max_overflow": 10,
    "pool_pre_ping": True,
    "pool_recycle": 1800,  # 30 minutes
} if settings.ENVIRONMENT != "test" else {}

# 异步引擎
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    **POOL_CONFIG,
)

# 异步会话工厂
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI 依赖注入使用的会话生成器

    用法:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db_session)):
            ...
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()