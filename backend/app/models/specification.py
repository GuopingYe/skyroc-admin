"""
Specification - 规范文档模型

核心架构设计：
1. 独立的 Spec 文档表，归属于 ScopeNode
2. TargetDataset 外键指向 Specification，形成 Spec -> Dataset -> Variable 的层级
3. 支持版本管理和状态流转
"""
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.mapping_enums import SpecStatus, SpecType


class Specification(Base, TimestampMixin, SoftDeleteMixin):
    """
    规范文档表

    存储完整的 SDTM/ADaM 规范文档定义
    一个 ScopeNode 可以有多份 Specification（如 SDTM Spec + ADaM Spec）
    """

    __tablename__ = "specifications"

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

    # Spec 标识
    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="规范名称，如 'Study-001 SDTM Specification v1.0'",
    )
    spec_type: Mapped[SpecType] = mapped_column(
        Enum(SpecType, name="spec_type_enum"),
        nullable=False,
        index=True,
        comment="规范类型：SDTM / ADaM",
    )
    version: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="1.0",
        comment="版本号",
    )

    # 状态
    status: Mapped[SpecStatus] = mapped_column(
        Enum(SpecStatus, name="spec_status_enum"),
        nullable=False,
        default=SpecStatus.DRAFT,
        index=True,
        comment="状态：Draft / Active / Archived",
    )

    # 描述
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="规范描述",
    )

    # 标准来源信息
    standard_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="标准名称，如 'SDTM-IG 3.4'",
    )
    standard_version: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="标准版本",
    )

    # 继承信息（从哪份 Spec 继承）
    base_specification_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("specifications.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="基线 Spec ID（继承来源）",
    )

    # 扩展属性
    metadata_config: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="元数据配置，如默认排序规则、命名约定等",
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
    activated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="激活时间",
    )
    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="归档时间",
    )

    # ============================================================
    # Relationships
    # ============================================================
    # 继承关系
    base_spec: Mapped["Specification | None"] = relationship(
        "Specification",
        remote_side=[id],
        back_populates="derived_specs",
        foreign_keys=[base_specification_id],
    )
    derived_specs: Mapped[list["Specification"]] = relationship(
        "Specification",
        back_populates="base_spec",
        foreign_keys=[base_specification_id],
    )

    # 数据集关系
    datasets: Mapped[list["TargetDataset"]] = relationship(
        "TargetDataset",
        back_populates="specification",
        cascade="all, delete-orphan",
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================
    __table_args__ = (
        # 唯一约束：同一作用域下同类型 Spec 名称唯一
        Index(
            "uix_specifications_scope_type_name",
            "scope_node_id",
            "spec_type",
            "name",
            unique=True,
        ),
        # 索引：优化状态查询
        Index(
            "ix_specifications_type_status",
            "spec_type",
            "status",
        ),
        {"comment": "规范文档表 - SDTM/ADaM 完整规格定义"},
    )

    def __repr__(self) -> str:
        return f"<Specification(id={self.id}, name={self.name}, type={self.spec_type.value})>"

    def is_active(self) -> bool:
        """判断是否激活"""
        return self.status == SpecStatus.ACTIVE

    def activate(self) -> None:
        """激活规范"""
        self.status = SpecStatus.ACTIVE
        self.activated_at = datetime.utcnow()

    def archive(self) -> None:
        """归档规范"""
        self.status = SpecStatus.ARCHIVED
        self.archived_at = datetime.utcnow()


# 延迟导入避免循环引用
from app.models.target_dataset import TargetDataset