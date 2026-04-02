"""
ARS (Analysis Results Standard) Pydantic Schemas

用于 TFL 构建器的嵌套树状结构 API 请求和响应验证

核心嵌套结构：
ARSDisplayRead
└── sections: list[ARSDisplaySectionRead]
    ├── block_template: ARSTemplateBlockRead
    └── bindings: list[ARSDataBindingRead]
"""
from datetime import datetime
from typing import Any

from pydantic import Field

from app.schemas.base import BaseSchema


# ============================================================
# DataBinding Schemas (最内层)
# ============================================================

class ARSDataBindingBase(BaseSchema):
    """ARSDataBinding 基础字段"""

    target_variable_id: int = Field(..., description="关联的目标变量 ID（ADaM）")
    variable_role: str = Field(
        default="analysis",
        max_length=50,
        description="变量角色：analysis / treatment / stratification / by",
    )
    filter_logic: dict[str, Any] | None = Field(
        None,
        description="过滤逻辑，如 {'where': 'SAFFL = \"Y\"'}",
    )
    statistics_config: dict[str, Any] | None = Field(
        None,
        description="统计量配置，如 {'n': true, 'mean': true, 'sd': true}",
    )
    extra_attrs: dict[str, Any] | None = Field(None, description="扩展属性")


class ARSDataBindingCreate(ARSDataBindingBase):
    """创建 ARSDataBinding 请求"""

    created_by: str = Field(..., max_length=100, description="创建者用户 ID")


class ARSDataBindingRead(ARSDataBindingBase):
    """ARSDataBinding 响应"""

    id: int
    section_id: int
    created_by: str
    updated_by: str | None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


# ============================================================
# TemplateBlock Schemas
# ============================================================

class ARSTemplateBlockBase(BaseSchema):
    """ARSTemplateBlock 基础字段"""

    block_name: str = Field(..., min_length=1, max_length=100, description="模块名称")
    block_type: str = Field(
        default="Row",
        max_length=20,
        description="模块类型：Header / Row / Cell / Section",
    )
    description: str | None = Field(None, description="模块描述")
    layout_schema: dict[str, Any] = Field(
        ...,
        description="布局 Schema，包含缩进、统计量配置、样式等",
    )
    sort_order: int = Field(default=0, ge=0, description="排序序号")
    extra_attrs: dict[str, Any] | None = Field(None, description="扩展属性")


class ARSTemplateBlockCreate(ARSTemplateBlockBase):
    """创建 ARSTemplateBlock 请求"""

    scope_node_id: int = Field(..., description="所属作用域节点 ID")
    created_by: str = Field(..., max_length=100, description="创建者用户 ID")


class ARSTemplateBlockRead(ARSTemplateBlockBase):
    """ARSTemplateBlock 响应"""

    id: int
    scope_node_id: int
    created_by: str
    updated_by: str | None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


# ============================================================
# DisplaySection Schemas (中层，嵌套 Block 和 Bindings)
# ============================================================

class ARSDisplaySectionBase(BaseSchema):
    """ARSDisplaySection 基础字段"""

    display_order: int = Field(default=0, ge=0, description="显示顺序")
    override_layout_schema: dict[str, Any] | None = Field(
        None,
        description="覆盖布局 Schema，用于局部修改模板",
    )
    extra_attrs: dict[str, Any] | None = Field(None, description="扩展属性")


class ARSDisplaySectionCreate(ARSDisplaySectionBase):
    """创建 ARSDisplaySection 请求"""

    block_template_id: int = Field(..., description="关联的模板块 ID")
    bindings: list[ARSDataBindingCreate] = Field(
        default_factory=list,
        description="数据绑定列表",
    )
    created_by: str = Field(..., max_length=100, description="创建者用户 ID")


class ARSDisplaySectionRead(ARSDisplaySectionBase):
    """ARSDisplaySection 响应（嵌套 Block 和 Bindings）"""

    id: int
    display_id: int
    block_template_id: int

    # 嵌套关联对象
    block_template: ARSTemplateBlockRead = Field(
        ...,
        description="关联的模板块",
    )
    data_bindings: list[ARSDataBindingRead] = Field(
        default_factory=list,
        description="数据绑定列表",
    )

    created_by: str
    updated_by: str | None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


# ============================================================
# Display Schemas (最外层，嵌套 Sections)
# ============================================================

class ARSDisplayBase(BaseSchema):
    """ARSDisplay 基础字段"""

    display_id: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="显示 ID，如 'Table 14.1.1', 'Figure 1.1'",
    )
    display_type: str = Field(
        default="Table",
        max_length=20,
        description="显示类型：Table / Figure / Listing",
    )
    title: str = Field(..., min_length=1, max_length=500, description="标题")
    subtitle: str | None = Field(None, max_length=500, description="副标题")
    footnote: str | None = Field(None, description="脚注")
    sort_order: int = Field(default=0, ge=0, description="排序序号")
    display_config: dict[str, Any] | None = Field(
        None,
        description="显示配置，如页面大小、边距等",
    )
    extra_attrs: dict[str, Any] | None = Field(None, description="扩展属性")


class ARSDisplayCreate(ARSDisplayBase):
    """创建 ARSDisplay 请求"""

    scope_node_id: int = Field(..., description="所属作用域节点 ID")
    sections: list[ARSDisplaySectionCreate] = Field(
        default_factory=list,
        description="区块列表",
    )
    source_template_id: int | None = Field(None, description="来源 Shell 模板 ID")
    source_template_version: int | None = Field(None, description="来源模板版本快照")
    decimal_override: dict[str, Any] | None = Field(None, description="Shell 级小数位覆盖")
    statistics_set_id: int | None = Field(None, description="关联的统计量集合 ID")
    created_by: str = Field(..., max_length=100, description="创建者用户 ID")


class ARSDisplayRead(ARSDisplayBase):
    """ARSDisplay 响应（基础，不含 Section 详情）"""

    id: int
    scope_node_id: int
    source_template_id: int | None = None
    source_template_version: int | None = None
    decimal_override: dict[str, Any] | None = None
    statistics_set_id: int | None = None
    created_by: str
    updated_by: str | None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


class ARSDisplayDetailRead(ARSDisplayRead):
    """
    ARSDisplay 完整响应（含嵌套 Sections）

    用于前端一次性获取整个 TFL 的完整结构树
    """

    sections: list[ARSDisplaySectionRead] = Field(
        default_factory=list,
        description="区块列表（含嵌套 Block 和 Bindings）",
    )


# ============================================================
# List Response Models
# ============================================================

class ARSDisplayListResponse(BaseSchema):
    """Display 列表响应"""

    total: int = Field(..., description="总数")
    items: list[ARSDisplayRead] = Field(..., description="Display 列表")


# ============================================================
# Layout Update Schema (用于 PUT /displays/{id}/layout)
# ============================================================

class ARSDisplayLayoutUpdate(BaseSchema):
    """
    Display 布局更新请求

    接收完整的树状 JSON，支持整存整取
    """

    display_id: str | None = Field(None, max_length=50, description="显示 ID")
    title: str | None = Field(None, max_length=500, description="标题")
    subtitle: str | None = Field(None, max_length=500, description="副标题")
    footnote: str | None = Field(None, description="脚注")
    display_config: dict[str, Any] | None = Field(None, description="显示配置")
    source_template_id: int | None = Field(None, description="来源 Shell 模板 ID")
    source_template_version: int | None = Field(None, description="来源模板版本快照")
    decimal_override: dict[str, Any] | None = Field(None, description="Shell 级小数位覆盖")
    statistics_set_id: int | None = Field(None, description="关联的统计量集合 ID")

    sections: list[ARSDisplaySectionCreate] = Field(
        default_factory=list,
        description="完整的区块列表",
    )

    updated_by: str = Field(..., max_length=100, description="更新者用户 ID")