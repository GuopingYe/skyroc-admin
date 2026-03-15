"""
Scope Node - 树状作用域节点模型

核心架构设计：
1. 自引用树状结构，支撑 CDISC -> Global -> TA -> Compound -> Indication -> Study -> Analysis 层级
2. 生命周期状态管理，用于影响分析
3. 版本锁定机制，实现上级升级下级按需豁免或同步
"""
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import LifecycleStatus, NodeType


class ScopeNode(Base, TimestampMixin, SoftDeleteMixin):
    """
    作用域节点表

    核心特性：
    - 自引用树状结构，支持无限层级
    - 生命周期状态追踪（影响分析只扫描 Ongoing 节点）
    - 软删除，满足 21 CFR Part 11 合规要求
    """

    __tablename__ = "scope_nodes"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 节点标识
    code: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment="节点唯一编码，如 STUDY-001, ANALYSIS-DM-001",
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="节点显示名称",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="节点详细描述",
    )

    # 节点类型与状态
    node_type: Mapped[NodeType] = mapped_column(
        Enum(NodeType, name="node_type_enum"),
        nullable=False,
        index=True,
        comment="节点类型：CDISC/Global/TA/Compound/Indication/Study/Analysis",
    )
    lifecycle_status: Mapped[LifecycleStatus] = mapped_column(
        Enum(LifecycleStatus, name="lifecycle_status_enum"),
        nullable=False,
        default=LifecycleStatus.PLANNING,
        index=True,
        comment="生命周期状态，影响分析只扫描 Ongoing 节点",
    )

    # 树状结构 - 自引用
    parent_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="父节点 ID，根节点为 NULL",
    )

    # 层级路径缓存（用于快速查询祖先/后代）
    path: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
        comment="物化路径，如 '/1/5/12/'，用于快速查询祖先和后代",
    )
    depth: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="层级深度，根节点为 0",
    )

    # 排序与元数据
    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="同级节点排序序号",
    )

    # 版本锁定信息（JSONB 存储复杂的版本关系）
    # 格式: {"pinned_from": {"parent_node_id": {"version": "1.2.3", "exempted": false}}}
    version_pinning: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="版本锁定信息，记录从上级继承的元数据版本及豁免状态",
    )

    # 扩展属性
    extra_attrs: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="扩展属性，存储节点特定的配置信息",
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
    # 自引用关系
    parent: Mapped["ScopeNode | None"] = relationship(
        "ScopeNode",
        remote_side=[id],
        back_populates="children",
        foreign_keys=[parent_id],
    )
    children: Mapped[list["ScopeNode"]] = relationship(
        "ScopeNode",
        back_populates="parent",
        foreign_keys=[parent_id],
        cascade="all, delete-orphan",  # 注意：实际业务中应使用软删除
    )

    # 工作区关系（一个 Analysis 节点可以有多个 Workspace）
    workspaces: Mapped[list["AnalysisWorkspace"]] = relationship(
        "AnalysisWorkspace",
        back_populates="scope_node",
        cascade="all, delete-orphan",
    )

    # CDISC 标准数据关系
    biomedical_concepts: Mapped[list["BiomedicalConcept"]] = relationship(
        "BiomedicalConcept",
        back_populates="scope_node",
        cascade="all, delete-orphan",
    )
    codelists: Mapped[list["Codelist"]] = relationship(
        "Codelist",
        back_populates="scope_node",
        cascade="all, delete-orphan",
    )

    # RBAC 关系
    user_scope_roles: Mapped[list["UserScopeRole"]] = relationship(
        "UserScopeRole",
        back_populates="scope_node",
        cascade="all, delete-orphan",
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================
    __table_args__ = (
        # 复合索引：优化按类型+状态查询（影响分析场景）
        Index(
            "ix_scope_nodes_type_status",
            "node_type",
            "lifecycle_status",
        ),
        # 复合索引：优化树形查询
        Index(
            "ix_scope_nodes_parent_type",
            "parent_id",
            "node_type",
        ),
        # 软删除过滤索引
        Index(
            "ix_scope_nodes_active",
            "is_deleted",
            "lifecycle_status",
        ),
        # PostgreSQL 表注释
        {"comment": "作用域节点表 - 树状层级结构核心表"},
    )

    def __repr__(self) -> str:
        return f"<ScopeNode(id={self.id}, code={self.code}, type={self.node_type.value})>"

    def build_path(self, parent_path: str | None = None) -> str:
        """
        构建物化路径

        Args:
            parent_path: 父节点的路径

        Returns:
            当前节点的路径字符串
        """
        if parent_path:
            return f"{parent_path}{self.id}/"
        return f"/{self.id}/"

    def is_ancestor_of(self, other: "ScopeNode") -> bool:
        """判断当前节点是否为另一个节点的祖先"""
        if not other.path or not self.path:
            return False
        return other.path.startswith(self.path) and other.path != self.path

    def is_descendant_of(self, other: "ScopeNode") -> bool:
        """判断当前节点是否为另一个节点的后代"""
        return other.is_ancestor_of(self)


# 延迟导入避免循环引用
from app.models.biomedical_concept import BiomedicalConcept
from app.models.codelist import Codelist
from app.models.workspace import AnalysisWorkspace