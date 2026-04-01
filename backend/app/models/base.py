"""
SQLAlchemy 基类与通用 Mixin
所有模型必须继承自 Base，确保统一的表配置
"""
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, JSON, func
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator


# Monkey-patch SQLite type compiler to handle JSONB -> JSON fallback
# This is needed because TypeDecorator exposes its external type class
# to the compiler before load_dialect_impl resolves the inner type.
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler

if not hasattr(SQLiteTypeCompiler, "visit_JSONB"):
    SQLiteTypeCompiler.visit_JSONB = SQLiteTypeCompiler.visit_JSON


class JSONB(TypeDecorator):
    """
    跨数据库兼容的 JSONB 类型

    - PostgreSQL: 使用原生 JSONB
    - 其他数据库 (SQLite等): 回退到 JSON
    """

    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_JSONB())
        return dialect.type_descriptor(JSON())


class Base(DeclarativeBase):
    """
    SQLAlchemy 2.0 声明式基类

    所有业务模型必须继承此类，确保：
    1. 统一的类型注解映射
    2. 统一的 JSONB 支持
    3. 统一的表命名约定
    """

    # 启用 JSONB 类型映射
    type_annotation_map = {
        dict[str, Any]: JSONB(),
    }


class TimestampMixin:
    """
    时间戳混入类

    为模型自动添加 created_at 和 updated_at 字段
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class SoftDeleteMixin:
    """
    软删除混入类

    【核心合规要求】21 CFR Part 11 规定核心元数据绝不允许物理删除
    所有核心业务表应继承此 Mixin
    """

    is_deleted: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
        index=True,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    deleted_by: Mapped[str | None] = mapped_column(
        nullable=True,
    )

    def soft_delete(self, deleted_by: str) -> None:
        """执行软删除"""
        from datetime import datetime

        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
        self.deleted_by = deleted_by