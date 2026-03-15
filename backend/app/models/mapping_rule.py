"""
Mapping Rule - 映射规则模型（核心表）

核心架构设计：
1. 支持源字段到目标变量的 1:1 和 1:N 映射
2. 多模态推导逻辑（SAS/R/NL）
3. 盲态隔离（visibility_context）
4. 完整的生命周期状态管理
"""
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import VisibilityContext
from app.models.mapping_enums import MappingStatus


class MappingRule(Base, TimestampMixin, SoftDeleteMixin):
    """
    映射规则表（核心业务表）

    核心特性：
    - 支持源字段到目标变量的映射
    - 多模态推导逻辑（SAS/R/NL）
    - 盲态隔离
    - 生命周期状态管理
    """

    __tablename__ = "mapping_rules"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # ============================================================
    # 关联字段
    # ============================================================

    # 源字段（允许为空，支持纯派生变量）
    source_item_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("source_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="源数据字段 ID（纯派生变量可为 NULL）",
    )

    # 目标变量
    target_variable_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("target_variables.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="目标变量 ID",
    )

    # ============================================================
    # 映射逻辑（核心）
    # ============================================================

    # 映射类型
    mapping_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="direct",
        comment="映射类型：direct（直接映射）/ derived（派生）/ compound（复合）",
    )

    # 多模态推导逻辑（JSONB 核心字段）
    derivation_logic: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="多模态推导逻辑，如 {'sas': '...', 'r': '...', 'nl': '...'}",
    )

    # 简单映射值（用于直接映射场景）
    direct_value: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="直接映射值（当 mapping_type='direct' 时使用）",
    )

    # 映射说明
    mapping_comment: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="映射说明注释",
    )

    # ============================================================
    # 盲态隔离（核心合规字段）
    # ============================================================

    visibility_context: Mapped[VisibilityContext] = mapped_column(
        Enum(VisibilityContext, name="visibility_context_enum"),
        nullable=False,
        default=VisibilityContext.ALL,
        index=True,
        comment="可见性上下文：All/Blinded_Only/Unblinded_Only",
    )

    # ============================================================
    # 生命周期状态
    # ============================================================

    status: Mapped[MappingStatus] = mapped_column(
        Enum(MappingStatus, name="mapping_status_enum"),
        nullable=False,
        default=MappingStatus.DRAFT,
        index=True,
        comment="映射状态：Draft/In_Production/QCing/Validated",
    )

    # 版本号
    version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
        comment="版本号，每次验证通过后递增",
    )

    # ============================================================
    # 人员分配
    # ============================================================

    programmer_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="程序员用户 ID",
    )
    qcer_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="QC 审核员用户 ID",
    )

    # ============================================================
    # 验证信息
    # ============================================================

    validated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="验证通过时间",
    )
    validated_by: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="验证通过者用户 ID",
    )

    # ============================================================
    # CRF 页码（aCRF 引擎生成）
    # ============================================================

    crf_page_numbers: Mapped[list[int] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="CRF 页码列表（由 aCRF 引擎解析生成）",
    )

    # ============================================================
    # 扩展属性
    # ============================================================

    extra_attrs: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="扩展属性",
    )

    # ============================================================
    # 审计字段
    # ============================================================

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

    source_item: Mapped["SourceItem | None"] = relationship(
        "SourceItem",
        back_populates="source_mappings",
        foreign_keys=[source_item_id],
    )

    target_variable: Mapped["TargetVariable"] = relationship(
        "TargetVariable",
        back_populates="mapping_rules",
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================

    __table_args__ = (
        # 复合索引：优化按状态 + 可见性查询
        Index(
            "ix_mapping_rules_status_visibility",
            "status",
            "visibility_context",
        ),
        # 复合索引：优化按程序员查询
        Index(
            "ix_mapping_rules_programmer_status",
            "programmer_id",
            "status",
        ),
        # 复合索引：优化 QC 查询
        Index(
            "ix_mapping_rules_qcer_status",
            "qcer_id",
            "status",
        ),
        {"comment": "映射规则表 - Mapping Studio 核心表"},
    )

    def __repr__(self) -> str:
        return f"<MappingRule(id={self.id}, type={self.mapping_type}, status={self.status.value})>"

    def set_derivation(self, sas_code: str | None = None, r_code: str | None = None, nl_code: str | None = None) -> None:
        """
        设置多模态推导逻辑

        Args:
            sas_code: SAS 代码
            r_code: R 代码
            nl_code: 自然语言描述
        """
        self.derivation_logic = {}
        if sas_code:
            self.derivation_logic["sas"] = sas_code
        if r_code:
            self.derivation_logic["r"] = r_code
        if nl_code:
            self.derivation_logic["nl"] = nl_code

    def is_derived(self) -> bool:
        """判断是否为派生映射"""
        return self.mapping_type == "derived" or self.mapping_type == "compound"

    def is_validated(self) -> bool:
        """判断是否已验证通过"""
        return self.status == MappingStatus.VALIDATED


# 延迟导入避免循环引用
from app.models.source_item import SourceItem
from app.models.target_variable import TargetVariable