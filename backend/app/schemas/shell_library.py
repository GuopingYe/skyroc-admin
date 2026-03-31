"""
Pydantic schemas for Shell Library API

用于 Shell 模板库的 API 请求和响应验证

核心功能：
- 模板的 CRUD 操作
- 版本历史追踪
- 推送请求与克隆操作
"""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# Base Model
# ============================================================


class BaseSchema(BaseModel):
    """Pydantic v2 基础配置"""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        use_enum_values=True,
    )


# ============================================================
# Version History Entry
# ============================================================


class VersionHistoryEntry(BaseModel):
    """版本历史条目"""

    version: int = Field(..., description="版本号")
    changed_at: str = Field(..., description="变更时间")
    changed_by: str = Field(..., description="变更人")
    change_description: str | None = Field(None, description="变更描述")
    snapshot: dict[str, Any] | None = Field(None, description="版本快照数据")


# ============================================================
# ShellLibraryTemplate Schemas
# ============================================================


class ShellLibraryTemplateBase(BaseSchema):
    """ShellLibraryTemplate 基础字段"""

    scope_level: str = Field(
        ...,
        pattern="^(global|ta|product)$",
        description="作用域级别：global / ta / product",
    )
    scope_node_id: int = Field(..., description="作用域节点 ID")
    category: str = Field(..., min_length=1, max_length=100, description="模板分类")
    template_name: str = Field(..., min_length=1, max_length=200, description="模板名称")
    display_type: str = Field(
        default="Table",
        pattern="^(Table|Figure|Listing)$",
        description="显示类型：Table / Figure / Listing",
    )
    shell_schema: dict[str, Any] = Field(..., description="Shell 布局 Schema")
    statistics_set_id: int | None = Field(None, description="关联的统计量集合 ID")
    description: str | None = Field(None, description="模板描述")


class ShellLibraryTemplateCreate(ShellLibraryTemplateBase):
    """创建 ShellLibraryTemplate 请求"""

    pass


class ShellLibraryTemplateUpdate(BaseSchema):
    """更新 ShellLibraryTemplate 请求"""

    template_name: str | None = Field(None, min_length=1, max_length=200, description="模板名称")
    shell_schema: dict[str, Any] | None = Field(None, description="Shell 布局 Schema")
    description: str | None = Field(None, description="模板描述")


class ShellLibraryTemplateResponse(ShellLibraryTemplateBase):
    """ShellLibraryTemplate 响应"""

    id: int
    version: int = Field(..., description="当前版本号")
    version_history: list[VersionHistoryEntry] | None = Field(
        None, description="版本历史记录"
    )
    created_by: str
    created_at: datetime
    updated_by: str | None
    updated_at: datetime
    is_deleted: bool
    deleted_at: datetime | None
    deleted_by: str | None


class ShellLibraryTemplateList(BaseSchema):
    """模板列表响应"""

    total: int = Field(..., description="总数")
    items: list[ShellLibraryTemplateResponse] = Field(..., description="模板列表")


# ============================================================
# Push Request Schemas
# ============================================================


class PushRequestCreate(BaseSchema):
    """推送请求（向上级推送模板）"""

    source_type: str = Field(
        ...,
        pattern="^(analysis|study|ta)$",
        description="来源类型：analysis / study / ta",
    )
    source_id: int = Field(..., description="来源对象 ID")
    target_level: str = Field(
        ...,
        pattern="^(global|ta)$",
        description="目标级别：global / ta",
    )
    target_scope_node_id: int = Field(..., description="目标作用域节点 ID")
    pr_title: str = Field(..., min_length=1, max_length=200, description="PR 标题")
    pr_description: str | None = Field(None, description="PR 描述")
    update_existing_template_id: int | None = Field(
        None, description="要更新的现有模板 ID（可选）"
    )


# ============================================================
# Clone Request Schema
# ============================================================


class CloneToStudyRequest(BaseSchema):
    """克隆到 Study 请求"""

    study_id: int = Field(..., description="目标 Study ID")