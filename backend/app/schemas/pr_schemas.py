"""
Pull Request Pydantic Schemas

用于标准治理 PR 审批流的 API 请求和响应验证

核心功能：
1. 自下而上的标准晋升
2. 合并前影响预评估
3. 审批与合并操作
"""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.mapping_enums import PRItemType, PRStatus


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
# Pull Request Schemas
# ============================================================

class PullRequestBase(BaseSchema):
    """PullRequest 基础字段"""

    title: str = Field(..., min_length=1, max_length=200, description="PR 标题")
    description: str | None = Field(None, description="PR 描述")


class PullRequestCreate(PullRequestBase):
    """创建 PullRequest 请求"""

    source_scope_id: int = Field(..., description="源作用域 ID（如 Study）")
    target_scope_id: int = Field(..., description="目标作用域 ID（如 Global/TA）")
    item_type: PRItemType = Field(..., description="变更项目类型：TFL/Mapping/Spec")
    item_id: int = Field(..., description="变更项目 ID")
    diff_snapshot: dict[str, Any] = Field(
        ...,
        description="变更快照，包含 before/after 的完整数据",
    )
    requester_id: str = Field(..., max_length=100, description="请求者用户 ID")


class PullRequestUpdate(BaseSchema):
    """更新 PullRequest 请求"""

    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    updated_by: str = Field(..., max_length=100, description="更新者用户 ID")


class PullRequestRead(PullRequestBase):
    """PullRequest 响应"""

    id: int
    pr_number: str = Field(description="PR 编号，如 'PR-2024-0001'")
    requester_id: str
    reviewer_id: str | None
    source_scope_id: int
    target_scope_id: int
    item_type: PRItemType
    item_id: int
    diff_snapshot: dict[str, Any]
    status: PRStatus
    impact_analysis: dict[str, Any] | None
    submitted_at: datetime | None
    reviewed_at: datetime | None
    merged_at: datetime | None
    review_comment: str | None
    created_by: str
    updated_by: str | None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


# ============================================================
# Impact Preview Schemas
# ============================================================

class AffectedNodeInfo(BaseSchema):
    """受影响节点信息"""

    id: int = Field(..., description="节点 ID")
    code: str = Field(..., description="节点代码")
    name: str = Field(..., description="节点名称")
    node_type: str = Field(..., description="节点类型")
    lifecycle_status: str = Field(..., description="生命周期状态")
    path: str | None = Field(None, description="节点路径")


class ImpactPreviewResult(BaseSchema):
    """
    影响预评估结果

    核心模型：让审批者明确知道变更会波及多少个进行中的 Study
    """

    pr_id: int = Field(..., description="PR ID")
    target_scope_id: int = Field(..., description="目标作用域 ID")
    target_scope_name: str = Field(..., description="目标作用域名称")
    affected_node_count: int = Field(
        ...,
        ge=0,
        description="受影响的节点总数（Ongoing 状态）",
    )
    affected_nodes: list[AffectedNodeInfo] = Field(
        default_factory=list,
        description="受影响的节点列表",
    )
    breakdown_by_type: dict[str, int] = Field(
        default_factory=dict,
        description="按节点类型分类统计，如 {'Study': 5, 'Analysis': 12}",
    )
    preview_generated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="预评估生成时间",
    )


# ============================================================
# Merge Action Schemas
# ============================================================

class PRMergeRequest(BaseSchema):
    """PR 合并请求"""

    reviewer_id: str = Field(..., max_length=100, description="审核者用户 ID")
    review_comment: str | None = Field(None, description="审核意见")
    action: str = Field(
        ...,
        description="操作类型：approve（批准）/ reject（拒绝）/ merge（合并）",
    )


class PRMergeResult(BaseSchema):
    """PR 操作结果"""

    pr_id: int
    pr_number: str
    action: str
    old_status: str
    new_status: str
    message: str
    merged_at: datetime | None = None
    affected_items: int | None = Field(
        None,
        description="合并影响的下游项目数量",
    )


# ============================================================
# List Response Models
# ============================================================

class PullRequestListResponse(BaseSchema):
    """PullRequest 列表响应"""

    total: int = Field(..., description="总数")
    items: list[PullRequestRead] = Field(..., description="PR 列表")