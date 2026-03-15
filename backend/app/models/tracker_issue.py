"""
Tracker Issue - QC Issue 记录模型

核心架构设计：
1. 多轮 QC 沟通系统（支持 Dry Run 1, Dry Run 2, Final 等多轮）
2. Issue 状态流转（Open -> Answered -> Resolved -> Closed）
3. 开发者回复机制
"""
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.mapping_enums import IssueStatus


class TrackerIssue(Base, TimestampMixin, SoftDeleteMixin):
    """
    QC Issue 记录表

    存储多轮 QC 过程中发现的问题和沟通记录
    支持完整的 Issue 生命周期管理
    """

    __tablename__ = "tracker_issues"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 关联的 Tracker
    tracker_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("programming_trackers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="关联的 Tracker ID",
    )

    # ============================================================
    # QC 轮次信息
    # ============================================================

    qc_cycle: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="QC 轮次，如 'Dry Run 1', 'Dry Run 2', 'Final'",
    )

    # ============================================================
    # 问题发现信息
    # ============================================================

    finding_description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="发现的问题描述",
    )

    finding_category: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="问题分类，如 'Logic Error', 'Data Issue', 'Formatting'",
    )

    severity: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="严重程度：Critical / Major / Minor",
    )

    raised_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="提出人用户 ID",
    )

    raised_by_name: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
        comment="提出人姓名",
    )

    raised_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        comment="发现日期",
    )

    # ============================================================
    # 开发者回复信息
    # ============================================================

    developer_response: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="程序员回复内容",
    )

    responded_by: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="回复人用户 ID",
    )

    responded_by_name: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
        comment="回复人姓名",
    )

    responded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="回复时间",
    )

    # ============================================================
    # 解决确认信息
    # ============================================================

    resolution_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="解决说明",
    )

    resolved_by: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="解决确认人用户 ID",
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="解决确认时间",
    )

    # ============================================================
    # Issue 状态
    # ============================================================

    issue_status: Mapped[IssueStatus] = mapped_column(
        Enum(IssueStatus, name="issue_status_enum"),
        nullable=False,
        default=IssueStatus.OPEN,
        index=True,
        comment="Issue 状态：Open/Answered/Resolved/Closed",
    )

    # ============================================================
    # 扩展字段
    # ============================================================

    attachment_paths: Mapped[list[str] | None] = mapped_column(
        Text,
        nullable=True,
        comment="附件路径列表（JSON 数组字符串）",
    )

    extra_attrs: Mapped[dict | None] = mapped_column(
        Text,
        nullable=True,
        comment="扩展属性（JSON 字符串）",
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

    tracker: Mapped["ProgrammingTracker"] = relationship(
        "ProgrammingTracker",
        back_populates="issues",
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================
    __table_args__ = (
        # 复合索引：优化按 Tracker + 状态查询
        Index(
            "ix_issues_tracker_status",
            "tracker_id",
            "issue_status",
        ),
        # 复合索引：优化按 QC 轮次查询
        Index(
            "ix_issues_tracker_cycle",
            "tracker_id",
            "qc_cycle",
        ),
        # 索引：优化按提出人查询
        Index(
            "ix_issues_raised_by",
            "raised_by",
            "raised_at",
        ),
        {"comment": "QC Issue 记录表 - 多轮 QC 沟通系统"},
    )

    def __repr__(self) -> str:
        return f"<TrackerIssue(id={self.id}, tracker_id={self.tracker_id}, cycle={self.qc_cycle}, status={self.issue_status.value})>"

    # ============================================================
    # 业务方法
    # ============================================================

    def answer(self, response: str, responded_by: str, responded_by_name: str | None = None) -> None:
        """
        程序员回复 Issue

        Args:
            response: 回复内容
            responded_by: 回复人用户 ID
            responded_by_name: 回复人姓名
        """
        self.developer_response = response
        self.responded_by = responded_by
        self.responded_by_name = responded_by_name
        self.responded_at = datetime.utcnow()
        self.issue_status = IssueStatus.ANSWERED

    def resolve(self, resolution_notes: str | None = None, resolved_by: str | None = None) -> None:
        """
        标记 Issue 为已解决

        Args:
            resolution_notes: 解决说明
            resolved_by: 解决确认人
        """
        self.resolution_notes = resolution_notes
        self.resolved_by = resolved_by
        self.resolved_at = datetime.utcnow()
        self.issue_status = IssueStatus.RESOLVED

    def close(self) -> None:
        """关闭 Issue"""
        self.issue_status = IssueStatus.CLOSED

    def is_open(self) -> bool:
        """判断 Issue 是否待处理"""
        return self.issue_status in (IssueStatus.OPEN, IssueStatus.ANSWERED)


# 延迟导入避免循环引用
from app.models.tracker import ProgrammingTracker