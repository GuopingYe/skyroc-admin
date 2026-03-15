"""
Specification Pydantic Schemas

用于 SDTM/ADaM 规范文档、目标数据集和目标变量的 API 请求和响应验证
"""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.mapping_enums import (
    DatasetClass,
    DataType,
    OriginType,
    OverrideType,
    SpecStatus,
    SpecType,
    VariableCore,
)


# ============================================================
# Base Models
# ============================================================

class BaseSchema(BaseModel):
    """Pydantic v2 基础配置"""

    model_config = ConfigDict(
        from_attributes=True,  # 替代 v1 的 orm_mode
        populate_by_name=True,
        use_enum_values=True,
    )


# ============================================================
# Specification Schemas
# ============================================================

class SpecificationBase(BaseSchema):
    """Specification 基础字段"""

    name: str = Field(..., min_length=1, max_length=200, description="规范名称")
    spec_type: SpecType = Field(..., description="规范类型：SDTM / ADaM")
    version: str = Field(default="1.0", max_length=50, description="版本号")
    status: SpecStatus = Field(default=SpecStatus.DRAFT, description="状态")
    description: str | None = Field(None, description="规范描述")
    standard_name: str | None = Field(None, max_length=100, description="标准名称")
    standard_version: str | None = Field(None, max_length=50, description="标准版本")
    base_specification_id: int | None = Field(None, description="基线 Spec ID（继承来源）")
    metadata_config: dict[str, Any] | None = Field(None, description="元数据配置")


class SpecificationCreate(SpecificationBase):
    """创建 Specification 请求"""

    scope_node_id: int = Field(..., description="所属作用域节点 ID")
    created_by: str = Field(..., max_length=100, description="创建者用户 ID")


class SpecificationUpdate(BaseSchema):
    """更新 Specification 请求（部分更新）"""

    name: str | None = Field(None, min_length=1, max_length=200)
    version: str | None = Field(None, max_length=50)
    status: SpecStatus | None = None
    description: str | None = None
    standard_name: str | None = Field(None, max_length=100)
    standard_version: str | None = Field(None, max_length=50)
    metadata_config: dict[str, Any] | None = None
    updated_by: str = Field(..., max_length=100, description="更新者用户 ID")


class SpecificationRead(SpecificationBase):
    """Specification 响应"""

    id: int
    scope_node_id: int
    created_by: str
    updated_by: str | None
    created_at: datetime
    updated_at: datetime
    activated_at: datetime | None
    archived_at: datetime | None
    is_deleted: bool


# ============================================================
# TargetDataset Schemas
# ============================================================

class TargetDatasetBase(BaseSchema):
    """TargetDataset 基础字段"""

    dataset_name: str = Field(..., min_length=1, max_length=8, description="数据集名称")
    description: str | None = Field(None, description="数据集描述")
    class_type: DatasetClass = Field(..., description="SDTM 数据集分类")
    base_id: int | None = Field(None, description="父级 Dataset ID")
    override_type: OverrideType = Field(
        default=OverrideType.NONE, description="继承覆盖类型"
    )
    sort_order: int = Field(default=0, description="排序序号")
    standard_metadata: dict[str, Any] | None = Field(None, description="标准元数据")


class TargetDatasetCreate(TargetDatasetBase):
    """创建 TargetDataset 请求"""

    specification_id: int = Field(..., description="所属规范文档 ID")
    created_by: str = Field(..., max_length=100, description="创建者用户 ID")


class TargetDatasetUpdate(BaseSchema):
    """更新 TargetDataset 请求（部分更新）"""

    dataset_name: str | None = Field(None, min_length=1, max_length=8)
    description: str | None = None
    class_type: DatasetClass | None = None
    base_id: int | None = None
    override_type: OverrideType | None = None
    sort_order: int | None = None
    standard_metadata: dict[str, Any] | None = None
    updated_by: str = Field(..., max_length=100, description="更新者用户 ID")


class TargetDatasetRead(TargetDatasetBase):
    """TargetDataset 响应"""

    id: int
    specification_id: int
    created_by: str
    updated_by: str | None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


class TargetDatasetWithVariablesRead(TargetDatasetRead):
    """TargetDataset 响应（含变量列表）"""

    variables: list["TargetVariableRead"] = Field(default_factory=list)


# ============================================================
# TargetVariable Schemas
# ============================================================

class TargetVariableBase(BaseSchema):
    """TargetVariable 基础字段"""

    variable_name: str = Field(..., min_length=1, max_length=8, description="变量名称")
    variable_label: str | None = Field(None, max_length=200, description="变量标签")
    description: str | None = Field(None, description="变量详细描述")
    data_type: DataType = Field(default=DataType.CHAR, description="数据类型")
    length: int | None = Field(None, ge=1, description="变量长度")
    core: VariableCore = Field(default=VariableCore.PERM, description="核心性")
    base_id: int | None = Field(None, description="父级 Variable ID")
    override_type: OverrideType = Field(
        default=OverrideType.NONE, description="继承覆盖类型"
    )
    origin_type: OriginType = Field(
        default=OriginType.CDISC, description="变量来源类型"
    )
    sort_order: int = Field(default=0, description="排序序号")
    standard_metadata: dict[str, Any] | None = Field(None, description="标准元数据")


class TargetVariableCreate(TargetVariableBase):
    """创建 TargetVariable 请求"""

    dataset_id: int = Field(..., description="所属目标数据集 ID")
    created_by: str = Field(..., max_length=100, description="创建者用户 ID")


class TargetVariableUpdate(BaseSchema):
    """更新 TargetVariable 请求（部分更新）"""

    variable_name: str | None = Field(None, min_length=1, max_length=8)
    variable_label: str | None = Field(None, max_length=200)
    description: str | None = None
    data_type: DataType | None = None
    length: int | None = Field(None, ge=1)
    core: VariableCore | None = None
    base_id: int | None = None
    override_type: OverrideType | None = None
    origin_type: OriginType | None = None
    sort_order: int | None = None
    standard_metadata: dict[str, Any] | None = None
    updated_by: str = Field(..., max_length=100, description="更新者用户 ID")


class TargetVariableRead(TargetVariableBase):
    """TargetVariable 响应"""

    id: int
    dataset_id: int
    created_by: str
    updated_by: str | None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


class TargetVariableWithMappingRead(TargetVariableRead):
    """
    TargetVariable 响应（含映射状态）

    用于 Mapping Studio 右侧目标变量列表
    """

    is_mapped: bool = Field(
        default=False,
        description="是否已被映射（通过 LEFT JOIN MappingRule 计算）",
    )
    mapping_count: int = Field(
        default=0,
        ge=0,
        description="映射规则数量",
    )


# ============================================================
# List Response Models
# ============================================================

class TargetDatasetListResponse(BaseSchema):
    """目标数据集列表响应"""

    total: int = Field(..., description="总数")
    items: list[TargetDatasetRead] = Field(..., description="数据集列表")


class TargetVariableListResponse(BaseSchema):
    """目标变量列表响应"""

    total: int = Field(..., description="总数")
    items: list[TargetVariableWithMappingRead] = Field(..., description="变量列表")


# 解决前向引用问题
TargetDatasetWithVariablesRead.model_rebuild()