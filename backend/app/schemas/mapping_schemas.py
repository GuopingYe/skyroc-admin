"""
Mapping Studio Pydantic Schemas

用于源数据字段和映射规则的 API 请求和响应验证
"""
from datetime import datetime
from typing import Any

from pydantic import Field, model_validator

from app.models.enums import VisibilityContext
from app.models.mapping_enums import MappingStatus, SourceType
from app.schemas.base import BaseSchema


# ============================================================
# DerivationLogic Schemas (多模态推导逻辑)
# ============================================================

class DerivationLogicBase(BaseSchema):
    """多模态推导逻辑基础字段"""

    sas: str | None = Field(None, description="SAS 代码")
    r: str | None = Field(None, description="R 代码")
    nl: str | None = Field(None, description="自然语言描述")


class DerivationLogicCreate(DerivationLogicBase):
    """创建推导逻辑请求"""

    pass


class DerivationLogic(DerivationLogicBase):
    """推导逻辑响应"""

    pass


# ============================================================
# SourceItem Schemas
# ============================================================

class SourceItemBase(BaseSchema):
    """SourceItem 基础字段"""

    item_name: str = Field(..., min_length=1, max_length=100, description="字段名称")
    item_oid: str | None = Field(None, max_length=100, description="字段 OID")
    item_label: str | None = Field(None, max_length=200, description="字段标签")
    description: str | None = Field(None, description="字段详细描述")
    data_type: str | None = Field(None, max_length=50, description="数据类型")
    field_text: str | None = Field(None, description="CRF 显示文本（aCRF 锚点）")
    pdf_coordinates: dict[str, Any] | None = Field(
        None,
        description="PDF 坐标信息，格式: {'page': 1, 'x0': 100, 'y0': 200, 'x1': 300, 'y1': 220}",
    )
    sort_order: int = Field(default=0, description="排序序号")
    raw_attributes: dict[str, Any] | None = Field(None, description="原始属性")


class SourceItemRead(SourceItemBase):
    """SourceItem 响应"""

    id: int
    collection_id: int
    created_by: str
    updated_by: str | None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


class SourceItemWithMappingRead(SourceItemRead):
    """
    SourceItem 响应（含映射状态）

    用于 Mapping Studio 左侧源数据列表
    """

    is_mapped: bool = Field(
        default=False,
        description="是否已映射（通过 LEFT JOIN MappingRule 计算）",
    )
    mapping_count: int = Field(
        default=0,
        ge=0,
        description="映射规则数量",
    )


# ============================================================
# SourceCollection Schemas (用于 API 响应)
# ============================================================

class SourceCollectionRead(BaseSchema):
    """SourceCollection 响应"""

    id: int
    scope_node_id: int
    collection_name: str
    collection_oid: str | None
    description: str | None
    source_type: SourceType
    source_system: str | None
    source_version: str | None
    created_at: datetime
    updated_at: datetime


class SourceCollectionWithItemsRead(SourceCollectionRead):
    """SourceCollection 响应（含字段列表）"""

    items: list[SourceItemRead] = Field(default_factory=list)


# ============================================================
# MappingRule Schemas
# ============================================================

class MappingRuleBase(BaseSchema):
    """MappingRule 基础字段"""

    source_item_id: int | None = Field(
        None,
        description="源数据字段 ID（纯派生变量可为 NULL）",
    )
    target_variable_id: int = Field(..., description="目标变量 ID")
    mapping_type: str = Field(
        default="direct",
        min_length=1,
        max_length=20,
        description="映射类型：direct / derived / compound",
    )
    derivation_logic: DerivationLogic | None = Field(
        None,
        description="多模态推导逻辑",
    )
    direct_value: str | None = Field(None, description="直接映射值")
    mapping_comment: str | None = Field(None, description="映射说明注释")
    visibility_context: VisibilityContext = Field(
        default=VisibilityContext.ALL,
        description="可见性上下文（盲态隔离）",
    )
    status: MappingStatus = Field(
        default=MappingStatus.DRAFT,
        description="映射状态",
    )
    programmer_id: str | None = Field(None, max_length=100, description="程序员用户 ID")
    qcer_id: str | None = Field(None, max_length=100, description="QC 审核员用户 ID")
    crf_page_numbers: list[int] | None = Field(None, description="CRF 页码列表")

    @model_validator(mode="after")
    def validate_derivation_logic(self) -> "MappingRuleBase":
        """验证：派生映射必须有推导逻辑"""
        if self.mapping_type in ("derived", "compound") and not self.derivation_logic:
            raise ValueError(
                f"派生映射类型 '{self.mapping_type}' 必须提供 derivation_logic"
            )
        return self


class MappingRuleCreate(MappingRuleBase):
    """创建 MappingRule 请求"""

    created_by: str = Field(..., max_length=100, description="创建者用户 ID")

    @model_validator(mode="after")
    def validate_mapping(self) -> "MappingRuleCreate":
        """验证映射规则"""
        # 派生映射必须有推导逻辑
        if self.mapping_type in ("derived", "compound"):
            if not self.derivation_logic:
                raise ValueError(
                    f"派生映射类型 '{self.mapping_type}' 必须提供 derivation_logic"
                )
            if not any(
                [self.derivation_logic.sas, self.derivation_logic.r, self.derivation_logic.nl]
            ):
                raise ValueError("推导逻辑必须至少包含 sas、r 或 nl 其中之一")
        return self


class MappingRuleUpdate(BaseSchema):
    """更新 MappingRule 请求（部分更新）"""

    source_item_id: int | None = None
    target_variable_id: int | None = None
    mapping_type: str | None = Field(None, min_length=1, max_length=20)
    derivation_logic: DerivationLogic | None = None
    direct_value: str | None = None
    mapping_comment: str | None = None
    visibility_context: VisibilityContext | None = None
    status: MappingStatus | None = None
    programmer_id: str | None = Field(None, max_length=100)
    qcer_id: str | None = Field(None, max_length=100)
    crf_page_numbers: list[int] | None = None
    updated_by: str = Field(..., max_length=100, description="更新者用户 ID")


class MappingRuleRead(MappingRuleBase):
    """MappingRule 响应"""

    id: int
    version: int
    validated_at: datetime | None
    validated_by: str | None
    created_by: str
    updated_by: str | None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


class MappingRuleWithDetailsRead(MappingRuleRead):
    """MappingRule 响应（含关联详情）"""

    source_item: SourceItemRead | None = None
    target_variable_name: str | None = Field(None, description="目标变量名称")
    target_dataset_name: str | None = Field(None, description="目标数据集名称")


# ============================================================
# Batch Operations Schemas
# ============================================================

class MappingRuleBatchCreate(BaseSchema):
    """批量创建 MappingRule 请求"""

    rules: list[MappingRuleCreate] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="映射规则列表（最多 100 条）",
    )


class MappingRuleBatchResult(BaseSchema):
    """批量操作结果"""

    success_count: int = Field(default=0, ge=0, description="成功数量")
    failed_count: int = Field(default=0, ge=0, description="失败数量")
    created_ids: list[int] = Field(default_factory=list, description="创建的规则 ID 列表")
    updated_ids: list[int] = Field(default_factory=list, description="更新的规则 ID 列表")
    errors: list[dict[str, Any]] = Field(
        default_factory=list,
        description="错误信息列表",
    )