"""
Source Item - 源数据字段模型

用于存储源数据字段定义，支持 aCRF PDF 文本锚点匹配
"""
from typing import Any

from sqlalchemy import ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class SourceItem(Base, TimestampMixin, SoftDeleteMixin):
    """
    源数据字段表

    存储源数据字段定义，如 EDC 表单中的各个字段
    支持 aCRF PDF 文本锚点匹配（用于 PyMuPDF 自动批注）
    """

    __tablename__ = "source_items"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 所属集合
    collection_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("source_collections.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="所属源数据集合 ID",
    )

    # 字段标识
    item_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="字段名称（技术名称）",
    )
    item_oid: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="字段 OID（来自 EDC 系统的唯一标识）",
    )
    item_label: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
        comment="字段标签（显示名称）",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="字段详细描述",
    )

    # 数据类型（字符串存储，不同 EDC 系统类型定义差异大）
    data_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="数据类型（来自源系统）",
    )

    # ============================================================
    # aCRF 文本锚点字段（PyMuPDF OCR 匹配核心）
    # ============================================================
    field_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="字段在 CRF 上的显示文本，用于 PDF 文本匹配锚点",
    )
    pdf_coordinates: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="PDF 坐标信息，格式: {'page': 1, 'x0': 100, 'y0': 200, 'x1': 300, 'y1': 220}",
    )

    # 排序与元数据
    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="集合内字段排序序号",
    )

    # 原始属性（存储从源系统导入的杂项属性）
    raw_attributes: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="原始属性，如 CodeList、验证规则、计算逻辑等",
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
    collection: Mapped["SourceCollection"] = relationship(
        "SourceCollection",
        back_populates="items",
    )

    # 映射规则关系（作为源）
    source_mappings: Mapped[list["MappingRule"]] = relationship(
        "MappingRule",
        back_populates="source_item",
        foreign_keys="MappingRule.source_item_id",
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================
    __table_args__ = (
        # 唯一约束：同一集合下字段名唯一
        Index(
            "uix_source_items_collection_name",
            "collection_id",
            "item_name",
            unique=True,
        ),
        {"comment": "源数据字段表 - EDC 字段定义（含 aCRF 锚点）"},
    )

    def __repr__(self) -> str:
        return f"<SourceItem(id={self.id}, name={self.item_name})>"


# 延迟导入避免循环引用
from app.models.mapping_rule import MappingRule
from app.models.source_collection import SourceCollection