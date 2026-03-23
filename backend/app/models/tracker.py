"""
Programming Tracker - 任务执行看板模型

核心架构设计：
1. 双轨状态机（生产状态 + QC 状态独立流转）
2. 多轮 QC Issue 沟通系统
3. 优先级和执行顺序控制
4. TFL 专属元数据支持
"""
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text
from app.models.base import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.mapping_enums import (
    DeliverableType,
    Priority,
    ProdStatus,
    QCMethod,
    QCStatus,
    TrackerStatus,
)


class ProgrammingTracker(Base, TimestampMixin, SoftDeleteMixin):
    """
    编程任务追踪表（深度重构版）

    核心特性：
    - 双轨状态机：prod_status 和 qc_status 独立流转
    - 精细化人员分配：prod_programmer_id, qc_programmer_id
    - 优先级和执行顺序控制
    - TFL 专属元数据存储
    """

    __tablename__ = "programming_trackers"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 所属 Analysis（关联 ScopeNode）
    analysis_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="所属 Analysis 节点 ID",
    )

    # ============================================================
    # 交付物信息（核心字段）
    # ============================================================

    # 交付物类型
    deliverable_type: Mapped[DeliverableType] = mapped_column(
        Enum(DeliverableType, name="deliverable_type_enum"),
        nullable=False,
        index=True,
        comment="交付物类型：SDTM / ADaM / TFL / Other_Lookup",
    )

    # 交付物名称（快速查询）
    deliverable_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="交付物名称，如 'AE', 'Table 14.1.1'，方便快速查询",
    )

    # 任务标识（保留兼容）
    task_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="任务名称，如 'AE Dataset', 'Table 14.1.1'",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="任务描述",
    )

    # 关联的目标对象（可空，根据 deliverable_type 选择）
    target_dataset_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("target_datasets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="关联的目标数据集 ID（SDTM/ADaM 任务）",
    )
    tfl_output_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("ars_displays.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="关联的 TFL 输出 ID（TFL 任务）",
    )

    # ============================================================
    # 人员分配
    # ============================================================

    prod_programmer_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="生产程序员用户 ID",
    )
    qc_programmer_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="QC 程序员用户 ID",
    )

    # ============================================================
    # 双轨状态机（核心）
    # ============================================================

    # 生产状态
    prod_status: Mapped[ProdStatus] = mapped_column(
        Enum(ProdStatus, name="prod_status_enum"),
        nullable=False,
        default=ProdStatus.NOT_STARTED,
        index=True,
        comment="生产状态：Not_Started/Programming/Ready_for_QC/Completed",
    )

    # QC 状态
    qc_status: Mapped[QCStatus] = mapped_column(
        Enum(QCStatus, name="qc_status_enum"),
        nullable=False,
        default=QCStatus.NOT_STARTED,
        index=True,
        comment="QC 状态：Not_Started/In_Progress/Issues_Found/Passed",
    )

    # 旧版状态（保留兼容）
    status: Mapped[TrackerStatus] = mapped_column(
        Enum(TrackerStatus, name="tracker_status_enum"),
        nullable=False,
        default=TrackerStatus.NOT_STARTED,
        index=True,
        comment="任务状态（旧版，保留兼容）",
    )

    # ============================================================
    # 优先级和执行顺序
    # ============================================================

    priority: Mapped[Priority] = mapped_column(
        Enum(Priority, name="priority_enum"),
        nullable=False,
        default=Priority.MEDIUM,
        index=True,
        comment="优先级：High / Medium / Low",
    )

    execution_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="执行顺序（Derived order），决定执行先后",
    )

    # ============================================================
    # QC 方法
    # ============================================================

    qc_method: Mapped[QCMethod] = mapped_column(
        Enum(QCMethod, name="qc_method_enum"),
        nullable=False,
        default=QCMethod.DOUBLE_PROGRAMMING,
        comment="QC 方法：Double_Programming/Spot_Check/Review",
    )

    # ============================================================
    # 时间追踪
    # ============================================================

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="开始时间",
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="完成时间",
    )
    qc_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="QC 开始时间",
    )
    qc_completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="QC 完成时间",
    )

    # 截止日期
    due_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
        comment="截止日期",
    )

    # ============================================================
    # 文件路径
    # ============================================================

    prod_file_path: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="生产程序文件路径",
    )
    qc_file_path: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="QC 程序文件路径",
    )

    # ============================================================
    # 物理脚本绑定（执行层面）
    # ============================================================

    prod_program_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Prod 程序文件名，如 'adsl.sas', 't_14_1_1.sas'",
    )
    qc_program_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="QC 程序文件名，如 'v_adsl.sas', 'qc_t_14_1_1.sas'",
    )

    # ============================================================
    # 物理输出物
    # ============================================================

    output_file_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="最终生成的物理文件名，如 'adsl.sas7bdat', 't_14_1_1.rtf'",
    )

    # ============================================================
    # 项目管理
    # ============================================================

    delivery_batch: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="交付批次标记，如 'Batch 1', 'Interim', 'Final'",
    )

    # ============================================================
    # TFL 专属元数据（JSONB 核心）
    # ============================================================

    tfl_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="TFL 专属元数据，如 output_number, title, footnote, population_source 等",
    )

    # 扩展属性
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

    analysis: Mapped["ScopeNode"] = relationship(
        "ScopeNode",
        foreign_keys=[analysis_id],
    )
    target_dataset: Mapped["TargetDataset | None"] = relationship(
        "TargetDataset",
        foreign_keys=[target_dataset_id],
    )
    tfl_output: Mapped["ARSDisplay | None"] = relationship(
        "ARSDisplay",
        back_populates="tracker_tasks",
    )
    issues: Mapped[list["TrackerIssue"]] = relationship(
        "TrackerIssue",
        back_populates="tracker",
        cascade="all, delete-orphan",
    )

    # ============================================================
    # 表级约束与索引
    # ============================================================
    __table_args__ = (
        # 复合索引：优化按分析+状态查询
        Index(
            "ix_trackers_analysis_status",
            "analysis_id",
            "status",
        ),
        # 复合索引：优化按分析+双轨状态查询
        Index(
            "ix_trackers_analysis_prod_qc_status",
            "analysis_id",
            "prod_status",
            "qc_status",
        ),
        # 复合索引：优化按程序员+状态查询
        Index(
            "ix_trackers_programmer_status",
            "prod_programmer_id",
            "status",
        ),
        # 复合索引：优化按优先级+执行顺序查询
        Index(
            "ix_trackers_priority_order",
            "analysis_id",
            "priority",
            "execution_order",
        ),
        {"comment": "编程任务追踪表 - 双轨状态机任务看板"},
    )

    def __repr__(self) -> str:
        return f"<ProgrammingTracker(id={self.id}, task={self.deliverable_name}, prod={self.prod_status.value}, qc={self.qc_status.value})>"

    # ============================================================
    # 业务方法
    # ============================================================

    def start_programming(self) -> None:
        """开始编程"""
        self.prod_status = ProdStatus.PROGRAMMING
        self.status = TrackerStatus.PROGRAMMING
        self.started_at = datetime.utcnow()

    def submit_for_qc(self) -> None:
        """提交 QC"""
        self.prod_status = ProdStatus.READY_FOR_QC
        self.status = TrackerStatus.READY_FOR_QC
        self.completed_at = datetime.utcnow()

    def start_qc(self) -> None:
        """开始 QC"""
        self.qc_status = QCStatus.IN_PROGRESS
        self.status = TrackerStatus.QC_IN_PROGRESS
        self.qc_started_at = datetime.utcnow()

    def report_issues(self) -> None:
        """发现问题"""
        self.qc_status = QCStatus.ISSUES_FOUND
        self.status = TrackerStatus.FAILED

    def pass_qc(self) -> None:
        """通过 QC"""
        self.qc_status = QCStatus.PASSED
        self.prod_status = ProdStatus.COMPLETED
        self.status = TrackerStatus.PASSED
        self.qc_completed_at = datetime.utcnow()

    def fail_qc(self) -> None:
        """未通过 QC"""
        self.qc_status = QCStatus.ISSUES_FOUND
        self.status = TrackerStatus.FAILED
        self.qc_completed_at = datetime.utcnow()

    def sign_off(self) -> None:
        """
        签收任务（21 CFR Part 11 合规要求）

        只有 QC 通过后才能签收
        """
        if self.qc_status != QCStatus.PASSED:
            raise ValueError("Cannot sign off: QC has not passed")
        self.status = TrackerStatus.SIGNED_OFF

    def is_complete(self) -> bool:
        """判断任务是否完成"""
        return self.prod_status == ProdStatus.COMPLETED and self.qc_status == QCStatus.PASSED

    def has_open_issues(self) -> bool:
        """判断是否有未解决的 Issue"""
        return self.qc_status == QCStatus.ISSUES_FOUND


# 延迟导入避免循环引用
from app.models.ars import ARSDisplay
from app.models.scope_node import ScopeNode
from app.models.target_dataset import TargetDataset
from app.models.tracker_issue import TrackerIssue