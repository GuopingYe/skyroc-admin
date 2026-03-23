"""
Source Collection - 源数据集合模型

用于存储源数据表单/集合定义（EDC 表单、eDT 数据集等）
"""
from typing import Any

from sqlalchemy import Enum, ForeignKey, Index, Integer, String, Text
from app.models.base import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.mapping_enums import SourceType


class SourceCollection(Base, TimestampMixin, SoftDeleteMixin):
    """
    源数据集合表

    存储源数据表单/集合定义，如 EDC 表单、eDT 数据集
    """

    __tablename__ = "source_collections"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 所属作用域
    scope_node_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="所属作用域节点 ID",
    )

    # 源数据标识
    collection_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="集合名称，如 'Vital Signs', 'Adverse Events'",
    )
    collection_oid: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="集合 OID（来自 EDC 系统的唯一标识）",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="集合描述",
    )

    # 源数据类型
    source_type: Mapped[SourceType] = mapped_column(
        Enum(SourceType, name="source_type_enum"),
        nullable=False,
        default=SourceType.EDC,
        comment="源数据类型：EDC/eDT/SaaS/Manual",
    )

    # 源系统信息
    source_system: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="源系统名称，如 'Medidata Rave', 'Oracle InForm'",
    )
    source_version: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="源系统版本",
    )

    # 排序与元数据
    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="排序序号",
    )

    # 扩展属性
    raw_attributes: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="原始属性，存储从源系统导入的杂项属性",
    )
    extra_attrs: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="扩展属性",
    )

    # 审计字段
    created_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="创建者用户 ID",
    )
    updated_by: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="最后更新者用户 ID",
    )

    # ============================================================
    # Relationships
    # ============================================================
    items: Mapped[list["SourceItem"]] = relationship(
        "SourceItem",
        back_populates="collection",
        cascade="all, delete-orphan",
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================
    __table_args__ = (
        # 唯一约束：同一作用域下集合名称唯一
        Index(
            "uix_source_collections_scope_name",
            "scope_node_id",
            "collection_name",
            unique=True,
        ),
        # OID 索引（如果有）
        Index(
            "ix_source_collections_oid",
            "collection_oid",
        ),
        {"comment": "源数据集合表 - EDC 表单/eDT 数据集定义"},
    )

    def __repr__(self) -> str:
        return f"<SourceCollection(id={self.id}, name={self.collection_name}, type={self.source_type.value})>"


# 延迟导入避免循环引用
from app.models.source_item import SourceItem