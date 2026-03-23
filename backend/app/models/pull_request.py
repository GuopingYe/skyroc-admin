"""
Pull Request Engine - 审批流模型

核心架构设计：
1. 自下而上治理引擎
2. 变更快照存储
3. 影响预评估
"""
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text
from app.models.base import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.mapping_enums import PRItemType, PRStatus


class MetadataPullRequest(Base, TimestampMixin, SoftDeleteMixin):
    """
    元数据拉取请求表

    存储从 Study 上推到 Global/TA 的变更请求
    支持合并前影响预评估
    """

    __tablename__ = "metadata_pull_requests"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # PR 标识
    pr_number: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        unique=True,
        index=True,
        comment="PR 编号，如 'PR-2024-0001'",
    )
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="PR 标题",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="PR 描述",
    )

    # 请求者与审核者
    requester_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="请求者用户 ID",
    )
    reviewer_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="审核者用户 ID",
    )

    # 源与目标作用域
    source_scope_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="源作用域 ID（如 Study）",
    )
    target_scope_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="目标作用域 ID（如 Global/TA）",
    )

    # 变更项目类型
    item_type: Mapped[PRItemType] = mapped_column(
        Enum(PRItemType, name="pr_item_type_enum"),
        nullable=False,
        index=True,
        comment="变更项目类型：TFL/Mapping/Spec",
    )
    item_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
        comment="变更项目 ID",
    )

    # 变更快照（JSONB 核心）
    diff_snapshot: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        comment="变更快照，包含 before/after 的完整数据",
    )

    # 状态
    status: Mapped[PRStatus] = mapped_column(
        Enum(PRStatus, name="pr_status_enum"),
        nullable=False,
        default=PRStatus.PENDING,
        index=True,
        comment="PR 状态：Pending/Approved/Rejected/Merged",
    )

    # 影响分析结果（合并前预评估）
    impact_analysis: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="影响分析结果，包含受影响的下游 Study/Analysis 数量",
    )

    # 时间追踪
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="提交时间",
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="审核时间",
    )
    merged_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="合并时间",
    )

    # 审核意见
    review_comment: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="审核意见",
    )

    # 扩展属性
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
    source_scope: Mapped["ScopeNode"] = relationship(
        "ScopeNode",
        foreign_keys=[source_scope_id],
    )
    target_scope: Mapped["ScopeNode"] = relationship(
        "ScopeNode",
        foreign_keys=[target_scope_id],
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================
    __table_args__ = (
        # 复合索引：优化按请求者查询
        Index(
            "ix_prs_requester_status",
            "requester_id",
            "status",
        ),
        # 复合索引：优化按审核者查询
        Index(
            "ix_prs_reviewer_status",
            "reviewer_id",
            "status",
        ),
        # 复合索引：优化按源作用域查询
        Index(
            "ix_prs_source_type_status",
            "source_scope_id",
            "item_type",
            "status",
        ),
        {"comment": "元数据拉取请求表 - PR 审批流核心表"},
    )

    def __repr__(self) -> str:
        return f"<MetadataPullRequest(id={self.id}, pr_number={self.pr_number}, status={self.status.value})>"

    def submit(self) -> None:
        """提交 PR"""
        self.status = PRStatus.PENDING
        self.submitted_at = datetime.utcnow()

    def approve(self, reviewer_id: str, comment: str | None = None) -> None:
        """批准 PR"""
        self.status = PRStatus.APPROVED
        self.reviewer_id = reviewer_id
        self.reviewed_at = datetime.utcnow()
        self.review_comment = comment

    def reject(self, reviewer_id: str, comment: str) -> None:
        """拒绝 PR"""
        self.status = PRStatus.REJECTED
        self.reviewer_id = reviewer_id
        self.reviewed_at = datetime.utcnow()
        self.review_comment = comment

    def merge(self) -> None:
        """合并 PR"""
        self.status = PRStatus.MERGED
        self.merged_at = datetime.utcnow()

    def is_pending(self) -> bool:
        """判断是否待审核"""
        return self.status == PRStatus.PENDING


# 延迟导入避免循环引用
from app.models.scope_node import ScopeNode