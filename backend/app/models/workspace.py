"""
Analysis Workspace - 分析工作区模型

核心架构设计：
1. 盲态与非盲态物理隔离
2. 映射到实际的 Linux 服务器路径
3. 支持 visibility_context 权限控制
"""
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.enums import VisibilityContext, WorkspaceType


class AnalysisWorkspace(Base, TimestampMixin, SoftDeleteMixin):
    """
    分析工作区表

    核心特性：
    - 支持同一 Analysis 节点下的盲态/非盲态隔离
    - 映射到实际 Linux 服务器路径
    - 预留 visibility_context 字段用于权限控制
    """

    __tablename__ = "analysis_workspaces"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 所属节点（Analysis 层级）
    scope_node_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="所属作用域节点 ID（通常为 Analysis 层级）",
    )

    # 工作区标识
    code: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="工作区编码，如 WS-BLIND-001",
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="工作区显示名称",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="工作区详细描述",
    )

    # 盲态隔离核心字段
    workspace_type: Mapped[WorkspaceType] = mapped_column(
        Enum(WorkspaceType, name="workspace_type_enum"),
        nullable=False,
        index=True,
        comment="工作区类型：Blinded（盲态）/ Unblinded（非盲态）",
    )

    # 可见性上下文（预留，用于细粒度权限控制）
    visibility_context: Mapped[VisibilityContext] = mapped_column(
        Enum(VisibilityContext, name="visibility_context_enum"),
        nullable=False,
        default=VisibilityContext.ALL,
        comment="可见性上下文，用于权限过滤",
    )

    # 物理路径映射
    server_host: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="localhost",
        comment="服务器主机名或 IP",
    )
    server_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="服务器上的物理路径，如 /data/studies/STUDY001/blinded/",
    )

    # 状态
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="工作区是否激活",
    )

    # 扩展属性（存储连接信息、认证配置等）
    connection_config: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="连接配置，如 SSH 密钥、SAS 路径等",
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
    scope_node: Mapped["ScopeNode"] = relationship(
        "ScopeNode",
        back_populates="workspaces",
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================
    __table_args__ = (
        # 唯一约束：同一节点下的工作区编码唯一
        Index(
            "uix_workspaces_node_code",
            "scope_node_id",
            "code",
            unique=True,
        ),
        # 复合索引：优化按类型和可见性查询
        Index(
            "ix_workspaces_type_visibility",
            "workspace_type",
            "visibility_context",
        ),
        # 软删除 + 活跃状态索引
        Index(
            "ix_workspaces_active",
            "is_deleted",
            "is_active",
        ),
        {"comment": "分析工作区表 - 盲态隔离核心表"},
    )

    def __repr__(self) -> str:
        return f"<AnalysisWorkspace(id={self.id}, code={self.code}, type={self.workspace_type.value})>"

    @property
    def full_path(self) -> str:
        """获取完整路径（服务器 + 路径）"""
        return f"{self.server_host}:{self.server_path}"

    def is_blinded(self) -> bool:
        """判断是否为盲态工作区"""
        return self.workspace_type == WorkspaceType.BLINDED

    def is_accessible_by(self, user_blind_status: VisibilityContext) -> bool:
        """
        判断用户是否可以访问此工作区

        Args:
            user_blind_status: 用户的盲态状态

        Returns:
            是否可访问
        """
        # All 可见性：所有人可见
        if self.visibility_context == VisibilityContext.ALL:
            return True

        # 非盲用户可以访问所有内容
        if user_blind_status == VisibilityContext.UNBLINDED_ONLY:
            return True

        # 盲态用户只能访问 All 和 Blinded_Only
        if user_blind_status == VisibilityContext.BLINDED_ONLY:
            return self.visibility_context in [
                VisibilityContext.ALL,
                VisibilityContext.BLINDED_ONLY,
            ]

        return False


# 延迟导入避免循环引用
from app.models.scope_node import ScopeNode