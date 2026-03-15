"""
Programming Tracker Pydantic Schemas

用于任务追踪和 QC Issue 管理的 API 请求和响应验证
"""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.mapping_enums import (
    DeliverableType,
    IssueStatus,
    Priority,
    ProdStatus,
    QCMethod,
    QCStatus,
    TrackerStatus,
)


# ============================================================
# Base Models
# ============================================================

class BaseSchema(BaseModel):
    """Pydantic v2 基础配置"""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        use_enum_values=True,
    )


# ============================================================
# Tracker Schemas
# ============================================================

class ProgrammingTrackerBase(BaseSchema):
    """ProgrammingTracker 基础字段"""

    deliverable_type: DeliverableType = Field(..., description="交付物类型：SDTM/ADaM/TFL/Other_Lookup")
    deliverable_name: str = Field(..., min_length=1, max_length=100, description="交付物名称，如 'AE', 'Table 14.1.1'")
    task_name: str = Field(..., min_length=1, max_length=200, description="任务名称")
    description: str | None = Field(None, description="任务描述")

    # 人员分配
    prod_programmer_id: str | None = Field(None, max_length=100, description="生产程序员用户 ID")
    qc_programmer_id: str | None = Field(None, max_length=100, description="QC 程序员用户 ID")

    # 双轨状态机
    prod_status: ProdStatus = Field(default=ProdStatus.NOT_STARTED, description="生产状态")
    qc_status: QCStatus = Field(default=QCStatus.NOT_STARTED, description="QC 状态")

    # 优先级和执行顺序
    priority: Priority = Field(default=Priority.MEDIUM, description="优先级")
    execution_order: int = Field(default=0, ge=0, description="执行顺序")

    # QC 方法
    qc_method: QCMethod = Field(default=QCMethod.DOUBLE_PROGRAMMING, description="QC 方法")

    # 截止日期
    due_date: datetime | None = Field(None, description="截止日期")

    # 文件路径
    prod_file_path: str | None = Field(None, max_length=500, description="生产程序文件路径")
    qc_file_path: str | None = Field(None, max_length=500, description="QC 程序文件路径")

    # 物理脚本绑定
    prod_program_name: str | None = Field(None, max_length=255, description="Prod 程序文件名，如 'adsl.sas'")
    qc_program_name: str | None = Field(None, max_length=255, description="QC 程序文件名，如 'v_adsl.sas'")

    # 物理输出物
    output_file_name: str | None = Field(None, max_length=255, description="最终生成的物理文件名，如 'adsl.sas7bdat'")

    # 项目管理
    delivery_batch: str | None = Field(None, max_length=100, description="交付批次标记，如 'Batch 1', 'Final'")

    # TFL 元数据
    tfl_metadata: dict[str, Any] | None = Field(None, description="TFL 专属元数据")


class ProgrammingTrackerCreate(ProgrammingTrackerBase):
    """创建 ProgrammingTracker 请求"""

    analysis_id: int = Field(..., description="所属 Analysis 节点 ID")
    target_dataset_id: int | None = Field(None, description="关联的目标数据集 ID")
    tfl_output_id: int | None = Field(None, description="关联的 TFL 输出 ID")
    created_by: str = Field(..., max_length=100, description="创建者用户 ID")


class ProgrammingTrackerUpdate(BaseSchema):
    """更新 ProgrammingTracker 请求（部分更新）"""

    deliverable_name: str | None = Field(None, min_length=1, max_length=100)
    task_name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    prod_programmer_id: str | None = Field(None, max_length=100)
    qc_programmer_id: str | None = Field(None, max_length=100)
    prod_status: ProdStatus | None = None
    qc_status: QCStatus | None = None
    priority: Priority | None = None
    execution_order: int | None = Field(None, ge=0)
    qc_method: QCMethod | None = None
    due_date: datetime | None = None
    prod_file_path: str | None = Field(None, max_length=500)
    qc_file_path: str | None = Field(None, max_length=500)
    prod_program_name: str | None = Field(None, max_length=255)
    qc_program_name: str | None = Field(None, max_length=255)
    output_file_name: str | None = Field(None, max_length=255)
    delivery_batch: str | None = Field(None, max_length=100)
    tfl_metadata: dict[str, Any] | None = None
    updated_by: str = Field(..., max_length=100, description="更新者用户 ID")


class ProgrammingTrackerRead(ProgrammingTrackerBase):
    """ProgrammingTracker 响应"""

    id: int
    analysis_id: int
    target_dataset_id: int | None
    tfl_output_id: int | None
    status: TrackerStatus = Field(description="任务状态（旧版，保留兼容）")
    started_at: datetime | None
    completed_at: datetime | None
    qc_started_at: datetime | None
    qc_completed_at: datetime | None
    created_by: str
    updated_by: str | None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


class TrackerListResponse(BaseSchema):
    """Tracker 列表响应"""

    total: int = Field(..., description="总数")
    items: list[ProgrammingTrackerRead] = Field(..., description="Tracker 列表")


# ============================================================
# Issue Schemas
# ============================================================

class TrackerIssueBase(BaseSchema):
    """TrackerIssue 基础字段"""

    qc_cycle: str = Field(..., min_length=1, max_length=50, description="QC 轮次，如 'Dry Run 1', 'Final'")
    finding_description: str = Field(..., min_length=1, description="发现的问题描述")
    finding_category: str | None = Field(None, max_length=100, description="问题分类")
    severity: str | None = Field(None, max_length=20, description="严重程度：Critical/Major/Minor")


class TrackerIssueCreate(TrackerIssueBase):
    """创建 TrackerIssue 请求"""

    raised_by: str = Field(..., max_length=100, description="提出人用户 ID")
    raised_by_name: str | None = Field(None, max_length=200, description="提出人姓名")


class TrackerIssueResponse(BaseSchema):
    """程序员回复 Issue 请求"""

    developer_response: str = Field(..., min_length=1, description="程序员回复内容")
    responded_by: str = Field(..., max_length=100, description="回复人用户 ID")
    responded_by_name: str | None = Field(None, max_length=200, description="回复人姓名")


class TrackerIssueRead(TrackerIssueBase):
    """TrackerIssue 响应"""

    id: int
    tracker_id: int
    raised_by: str
    raised_by_name: str | None
    raised_at: datetime
    developer_response: str | None
    responded_by: str | None
    responded_by_name: str | None
    responded_at: datetime | None
    resolution_notes: str | None
    resolved_by: str | None
    resolved_at: datetime | None
    issue_status: IssueStatus = Field(description="Issue 状态")
    created_by: str
    updated_by: str | None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


class IssueListResponse(BaseSchema):
    """Issue 列表响应"""

    total: int = Field(..., description="总数")
    items: list[TrackerIssueRead] = Field(..., description="Issue 列表")