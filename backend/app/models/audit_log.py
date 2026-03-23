"""
Audit Log - 审计日志模型

核心架构设计：
1. 满足 21 CFR Part 11 合规要求
2. 基于 SQLAlchemy Event Listener 自动触发
3. 记录 Who, When, What, Why
4. 支持状态回滚
"""
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text, func
from app.models.base import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.enums import AuditAction


class AuditLog(Base):
    """
    审计日志表

    核心特性：
    - 自动记录所有核心元数据的变更
    - 存储 old_values 和 new_values (JSONB)
    - 支持基于此表的"状态回滚"功能
    - 绝不允许物理删除审计日志
    """

    __tablename__ = "audit_logs"

    # 主键
    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    # 操作信息
    action: Mapped[AuditAction] = mapped_column(
        Enum(AuditAction, name="audit_action_enum"),
        nullable=False,
        index=True,
        comment="操作类型：CREATE/UPDATE/DELETE/RESTORE",
    )

    # 目标表与记录
    table_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="目标表名",
    )
    record_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
        comment="目标记录 ID",
    )

    # 变更数据（JSONB 存储）
    old_values: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="变更前的值（CREATE 操作为 NULL）",
    )
    new_values: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="变更后的值（DELETE 操作为 NULL）",
    )

    # 差异快照（仅存储变更字段）
    diff_snapshot: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="差异快照，仅包含变更的字段",
    )

    # 操作上下文
    operation_context: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="操作上下文，如请求 ID、客户端 IP 等",
    )

    # Who - 操作者
    user_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="操作者用户 ID",
    )
    user_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="操作者用户名（冗余，方便查询）",
    )

    # When - 操作时间
    action_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        comment="操作时间戳",
    )

    # Why - 操作原因
    reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="操作原因（必填项，由业务层强制校验）",
    )

    # 关联的 Scope Node（用于按作用域查询审计日志）
    scope_node_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="关联的作用域节点 ID",
    )

    # PR 审批流关联（如果变更是由 PR 合并产生）
    pull_request_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        index=True,
        comment="关联的 Pull Request ID",
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================
    __table_args__ = (
        # 复合索引：优化按表名 + 记录 ID 查询
        Index(
            "ix_audit_logs_table_record",
            "table_name",
            "record_id",
        ),
        # 复合索引：优化按用户 + 时间查询
        Index(
            "ix_audit_logs_user_time",
            "user_id",
            "action_timestamp",
        ),
        # 复合索引：优化按操作 + 时间查询
        Index(
            "ix_audit_logs_action_time",
            "action",
            "action_timestamp",
        ),
        {"comment": "审计日志表 - 21 CFR Part 11 合规核心表"},
    )

    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, action={self.action.value}, table={self.table_name}, record_id={self.record_id})>"

    def to_rollback_dict(self) -> dict[str, Any]:
        """
        生成回滚数据

        Returns:
            用于回滚的数据字典
        """
        if self.action == AuditAction.CREATE:
            # 创建操作 -> 回滚即删除
            return {"_action": "delete", "id": self.record_id}
        elif self.action == AuditAction.DELETE:
            # 删除操作 -> 回滚即恢复
            return {"_action": "restore", **self.old_values}
        elif self.action == AuditAction.UPDATE:
            # 更新操作 -> 回滚到旧值
            return {"_action": "update", **self.old_values}
        else:
            return {"_action": "unknown"}