"""
Biomedical Concept - 生物医学概念模型

CDISC 最前沿的语义概念库，用于标准化临床数据语义

核心字段：
- concept_id: CDISC 概念唯一标识
- ncit_code: NCI Thesaurus 编码（跨标准映射的关键）
- short_name: 概念短名称
- synonyms: 同义词列表 (JSONB)
- definition: 概念定义
"""
from typing import Any

from sqlalchemy import ForeignKey, Index, Integer, String, Text
from app.models.base import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class BiomedicalConcept(Base, TimestampMixin, SoftDeleteMixin):
    """
    生物医学概念表

    CDISC Biomedical Concepts (BC) 是最前沿的语义层标准
    用于定义临床数据的语义含义，支持跨标准映射

    示例：
    - Diastolic Blood Pressure
    - Systolic Blood Pressure
    - Body Temperature
    """

    __tablename__ = "biomedical_concepts"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 所属作用域（CDISC 标准节点）
    scope_node_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="所属 CDISC 标准节点 ID",
    )

    # 概念标识
    concept_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="CDISC 概念 ID",
    )
    ncit_code: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True,
        comment="NCI Thesaurus 编码，用于跨标准映射",
    )
    short_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        comment="概念短名称",
    )

    # 概念定义
    definition: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="概念定义",
    )

    # 同义词 (JSONB)
    synonyms: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="同义词列表，支持多语言",
    )

    # 数据元素概念 (JSONB)
    data_element_concepts: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="数据元素概念，定义数据类型、格式等",
    )

    # CDISC 原始元数据
    standard_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="CDISC 原始元数据",
    )

    # 扩展属性
    extra_attrs: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="扩展属性",
    )

    # 排序
    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="排序序号",
    )

    # 审计字段
    created_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="创建者",
    )
    updated_by: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="最后更新者",
    )

    # ============================================================
    # Relationships
    # ============================================================
    scope_node: Mapped["ScopeNode"] = relationship(
        "ScopeNode",
        back_populates="biomedical_concepts",
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================
    __table_args__ = (
        # 唯一约束：同一作用域下概念 ID 唯一
        Index(
            "uix_biomedical_concepts_scope_concept",
            "scope_node_id",
            "concept_id",
            unique=True,
        ),
        # 索引：优化 NCIt 编码查询
        Index(
            "ix_biomedical_concepts_ncit",
            "ncit_code",
        ),
        {"comment": "生物医学概念表 - CDISC BC 语义概念"},
    )

    def __repr__(self) -> str:
        return f"<BiomedicalConcept(id={self.id}, concept_id={self.concept_id}, ncit={self.ncit_code})>"


# 延迟导入避免循环引用
from app.models.scope_node import ScopeNode