"""
Codelist & CodelistTerm - 受控术语模型

CDISC Controlled Terminology (CT) 同步存储

核心字段：
- Codelist: 编码列表定义
- CodelistTerm: 编码列表中的具体术语值
"""
from typing import Any

from sqlalchemy import ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class Codelist(Base, TimestampMixin, SoftDeleteMixin):
    """
    编码列表表

    CDISC Controlled Terminology 的编码列表
    如：SEX, RACE, COUNTRY, VISIT 等

    示例：
    - SEX: 性别编码列表
    - RACE: 种族编码列表
    - COUNTRY: 国家编码列表
    """

    __tablename__ = "codelists"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 所属作用域
    scope_node_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="所属 CDISC 标准节点 ID",
    )

    # 编码列表标识
    codelist_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="CDISC Codelist ID",
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        comment="编码列表名称",
    )

    # NCI 编码
    ncit_code: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True,
        comment="NCI Thesaurus 编码",
    )

    # 描述
    definition: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="编码列表定义",
    )

    # 同义词
    synonyms: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="同义词列表",
    )

    # 扩展属性
    preferred_term: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="首选术语",
    )
    submission_value: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="提交值",
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
        back_populates="codelists",
    )

    terms: Mapped[list["CodelistTerm"]] = relationship(
        "CodelistTerm",
        back_populates="codelist",
        cascade="all, delete-orphan",
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================
    __table_args__ = (
        # 唯一约束：同一作用域下 Codelist ID 唯一
        Index(
            "uix_codelists_scope_id",
            "scope_node_id",
            "codelist_id",
            unique=True,
        ),
        {"comment": "编码列表表 - CDISC CT 编码列表"},
    )

    def __repr__(self) -> str:
        return f"<Codelist(id={self.id}, name={self.name}, ncit={self.ncit_code})>"


class CodelistTerm(Base, TimestampMixin, SoftDeleteMixin):
    """
    编码列表术语表

    编码列表中的具体术语值
    如：SEX 编码列表中的 M, F, U, UN
    """

    __tablename__ = "codelist_terms"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 所属编码列表
    codelist_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("codelists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="所属编码列表 ID",
    )

    # 术语标识
    term_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="术语 ID",
    )
    term_value: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        index=True,
        comment="术语值，如 M, F, U",
    )

    # NCI 编码
    ncit_code: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True,
        comment="NCI Thesaurus 编码",
    )

    # 术语信息
    name: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="术语名称",
    )
    definition: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="术语定义",
    )

    # 同义词
    synonyms: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="同义词列表",
    )

    # 提交值
    submission_value: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="提交值",
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
    codelist: Mapped["Codelist"] = relationship(
        "Codelist",
        back_populates="terms",
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================
    __table_args__ = (
        # 唯一约束：同一编码列表下术语值唯一
        Index(
            "uix_codelist_terms_value",
            "codelist_id",
            "term_value",
            unique=True,
        ),
        {"comment": "编码列表术语表 - CDISC CT 术语"},
    )

    def __repr__(self) -> str:
        return f"<CodelistTerm(id={self.id}, value={self.term_value}, ncit={self.ncit_code})>"


# 延迟导入避免循环引用
from app.models.scope_node import ScopeNode