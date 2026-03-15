"""
Mapping Studio API Router

核心功能：
1. 获取左侧源数据列表（含映射状态）
2. 批量保存映射规则（Upsert）
3. 获取右侧目标数据集列表
4. 获取右侧目标变量列表（含映射状态）
"""
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.models import MappingRule, ScopeNode, SourceCollection, SourceItem, TargetDataset, TargetVariable
from app.models.audit_listener import set_audit_context
from app.models.enums import VisibilityContext
from app.models.mapping_enums import MappingStatus
from app.schemas.mapping_schemas import (
    MappingRuleBatchCreate,
    MappingRuleBatchResult,
    MappingRuleCreate,
    MappingRuleRead,
    SourceItemWithMappingRead,
)
from app.schemas.spec_schemas import (
    TargetDatasetListResponse,
    TargetDatasetRead,
    TargetVariableListResponse,
    TargetVariableWithMappingRead,
)

router = APIRouter(prefix="/mapping-studio", tags=["Mapping Studio"])


# ============================================================
# Response Models
# ============================================================

class SourceItemListResponse(BaseModel):
    """源数据列表响应"""

    total: int = Field(..., description="总数")
    items: list[SourceItemWithMappingRead] = Field(..., description="源数据列表")


class MessageResponse(BaseModel):
    """通用消息响应"""

    message: str
    detail: dict[str, Any] | None = None


# ============================================================
# API 1: 获取左侧源数据列表（含映射状态）
# ============================================================

@router.get(
    "/source-items",
    response_model=SourceItemListResponse,
    summary="获取源数据列表（含映射状态）",
    description="""
获取指定作用域下的源数据字段列表，包含映射状态信息。

**核心特性：**
- 通过 LEFT JOIN MappingRule 动态计算 `is_mapped` 字段
- 支持按 EDC 表单（collection_id）过滤
- 返回映射规则数量统计

**使用场景：**
- Mapping Studio 左侧源数据列表
- 支持"未映射/已映射"组合过滤
    """,
    responses={
        200: {
            "description": "成功返回源数据列表",
            "content": {
                "application/json": {
                    "example": {
                        "total": 150,
                        "items": [
                            {
                                "id": 1,
                                "collection_id": 10,
                                "item_name": "AETERM",
                                "item_label": "Adverse Event Term",
                                "field_text": "Verbatim Term",
                                "is_mapped": True,
                                "mapping_count": 2,
                            }
                        ],
                    }
                }
            },
        },
        400: {"description": "请求参数错误"},
        404: {"description": "作用域节点不存在"},
    },
)
async def get_source_items_with_mapping_status(
    scope_node_id: int = Query(..., description="作用域节点 ID（必填）", examples=[1, 2, 3]),
    collection_id: int | None = Query(None, description="源数据集合 ID（可选，用于按 EDC 表单过滤）"),
    is_mapped: bool | None = Query(None, description="映射状态过滤（可选）：true=已映射，false=未映射"),
    limit: int = Query(100, ge=1, le=500, description="返回数量限制"),
    offset: int = Query(0, ge=0, description="偏移量（分页）"),
    db: AsyncSession = Depends(get_db_session),
) -> SourceItemListResponse:
    """
    获取源数据列表（含映射状态）

    通过 LEFT JOIN MappingRule 计算每个源字段的映射状态
    """
    # 1. 验证 ScopeNode 存在
    scope_node = await db.get(ScopeNode, scope_node_id)
    if not scope_node or scope_node.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ScopeNode with id {scope_node_id} not found",
        )

    # 2. 构建基础查询
    # 子查询：计算每个 source_item 的映射规则数量
    mapping_count_subquery = (
        select(
            MappingRule.source_item_id,
            func.count(MappingRule.id).label("mapping_count"),
        )
        .where(
            MappingRule.is_deleted == False,
        )
        .group_by(MappingRule.source_item_id)
        .subquery()
    )

    # 主查询：LEFT JOIN SourceCollection -> SourceItem -> mapping_count
    query = (
        select(
            SourceItem,
            func.coalesce(mapping_count_subquery.c.mapping_count, 0).label("mapping_count"),
        )
        .join(SourceCollection, SourceItem.collection_id == SourceCollection.id)
        .outerjoin(
            mapping_count_subquery,
            SourceItem.id == mapping_count_subquery.c.source_item_id,
        )
        .where(
            SourceCollection.scope_node_id == scope_node_id,
            SourceCollection.is_deleted == False,
            SourceItem.is_deleted == False,
        )
    )

    # 3. 应用过滤条件
    if collection_id is not None:
        query = query.where(SourceItem.collection_id == collection_id)

    # 4. 应用映射状态过滤（使用 WHERE 而非 HAVING）
    if is_mapped is True:
        # 已映射：mapping_count > 0（即存在映射规则）
        query = query.where(mapping_count_subquery.c.mapping_count > 0)
    elif is_mapped is False:
        # 未映射：mapping_count IS NULL（即不存在映射规则）
        query = query.where(mapping_count_subquery.c.mapping_count.is_(None))

    # 5. 查询总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 6. 应用分页和排序
    query = query.order_by(SourceItem.sort_order, SourceItem.id).offset(offset).limit(limit)

    # 7. 执行查询
    result = await db.execute(query)
    rows = result.all()

    # 8. 构建响应
    items = []
    for row in rows:
        source_item: SourceItem = row[0]
        mapping_count: int = row[1]

        items.append(
            SourceItemWithMappingRead(
                id=source_item.id,
                collection_id=source_item.collection_id,
                item_name=source_item.item_name,
                item_oid=source_item.item_oid,
                item_label=source_item.item_label,
                description=source_item.description,
                data_type=source_item.data_type,
                field_text=source_item.field_text,
                pdf_coordinates=source_item.pdf_coordinates,
                sort_order=source_item.sort_order,
                raw_attributes=source_item.raw_attributes,
                created_by=source_item.created_by,
                updated_by=source_item.updated_by,
                created_at=source_item.created_at,
                updated_at=source_item.updated_at,
                is_deleted=source_item.is_deleted,
                is_mapped=mapping_count > 0,
                mapping_count=mapping_count,
            )
        )

    return SourceItemListResponse(total=total, items=items)


# ============================================================
# API 2: 批量保存映射规则（Upsert）
# ============================================================

@router.post(
    "/rules/batch",
    response_model=MappingRuleBatchResult,
    summary="批量保存映射规则",
    description="""
批量创建或更新映射规则（Upsert）。

**核心特性：**
- 在同一事务中执行 Upsert（存在则更新，不存在则新增）
- 自动触发审计日志（Audit Trail）
- 支持多模态推导逻辑（SAS/R/NL）

**Upsert 逻辑：**
- 如果存在相同 `source_item_id` + `target_variable_id` 的规则，则更新
- 否则创建新规则

**审计支持：**
- 自动注入操作人信息
- 通过 SQLAlchemy Event Listener 触发审计日志
    """,
    status_code=status.HTTP_200_OK,
    responses={
        200: {
            "description": "批量操作结果",
            "content": {
                "application/json": {
                    "example": {
                        "success_count": 5,
                        "failed_count": 0,
                        "created_ids": [1, 2, 3],
                        "updated_ids": [4, 5],
                        "errors": [],
                    }
                }
            },
        },
        400: {"description": "请求参数错误"},
    },
)
async def batch_save_mapping_rules(
    batch_data: MappingRuleBatchCreate,
    db: AsyncSession = Depends(get_db_session),
) -> MappingRuleBatchResult:
    """
    批量保存映射规则（Upsert）

    在同一个事务中执行，支持自动审计
    """
    # 设置审计上下文（Mock 数据，实际应从 JWT 获取）
    set_audit_context(
        user_id="sysadmin",
        user_name="System Administrator",
        context={"operation": "batch_upsert", "source": "api"},
        reason="批量保存映射规则",
    )

    result = MappingRuleBatchResult()
    created_ids: list[int] = []
    updated_ids: list[int] = []
    errors: list[dict[str, Any]] = []

    for idx, rule_create in enumerate(batch_data.rules):
        try:
            # 1. 验证目标变量存在
            target_variable = await db.get(TargetVariable, rule_create.target_variable_id)
            if not target_variable or target_variable.is_deleted:
                errors.append(
                    {
                        "index": idx,
                        "error": f"TargetVariable with id {rule_create.target_variable_id} not found",
                    }
                )
                continue

            # 2. 验证源字段存在（如果提供）
            if rule_create.source_item_id:
                source_item = await db.get(SourceItem, rule_create.source_item_id)
                if not source_item or source_item.is_deleted:
                    errors.append(
                        {
                            "index": idx,
                            "error": f"SourceItem with id {rule_create.source_item_id} not found",
                        }
                    )
                    continue

            # 3. 查找是否已存在相同映射（Upsert 判断）
            existing_rule = None
            if rule_create.source_item_id:
                # 有源字段的映射
                query = select(MappingRule).where(
                    MappingRule.source_item_id == rule_create.source_item_id,
                    MappingRule.target_variable_id == rule_create.target_variable_id,
                    MappingRule.is_deleted == False,
                )
            else:
                # 纯派生变量（无源字段）- 按目标变量判断
                query = select(MappingRule).where(
                    MappingRule.source_item_id.is_(None),
                    MappingRule.target_variable_id == rule_create.target_variable_id,
                    MappingRule.is_deleted == False,
                )

            existing_result = await db.execute(query)
            existing_rule = existing_result.scalar_one_or_none()

            if existing_rule:
                # 更新现有规则
                existing_rule.mapping_type = rule_create.mapping_type
                existing_rule.derivation_logic = (
                    rule_create.derivation_logic.model_dump()
                    if rule_create.derivation_logic
                    else None
                )
                existing_rule.direct_value = rule_create.direct_value
                existing_rule.mapping_comment = rule_create.mapping_comment
                # 将字符串值转换为枚举对象
                existing_rule.visibility_context = VisibilityContext(rule_create.visibility_context)
                existing_rule.status = MappingStatus(rule_create.status)
                existing_rule.programmer_id = rule_create.programmer_id
                existing_rule.qcer_id = rule_create.qcer_id
                existing_rule.crf_page_numbers = rule_create.crf_page_numbers
                existing_rule.updated_by = rule_create.created_by  # 使用 created_by 作为更新者

                updated_ids.append(existing_rule.id)
            else:
                # 创建新规则
                new_rule = MappingRule(
                    source_item_id=rule_create.source_item_id,
                    target_variable_id=rule_create.target_variable_id,
                    mapping_type=rule_create.mapping_type,
                    derivation_logic=(
                        rule_create.derivation_logic.model_dump()
                        if rule_create.derivation_logic
                        else None
                    ),
                    direct_value=rule_create.direct_value,
                    mapping_comment=rule_create.mapping_comment,
                    visibility_context=VisibilityContext(rule_create.visibility_context),
                    status=MappingStatus(rule_create.status),
                    programmer_id=rule_create.programmer_id,
                    qcer_id=rule_create.qcer_id,
                    crf_page_numbers=rule_create.crf_page_numbers,
                    created_by=rule_create.created_by,
                )
                db.add(new_rule)
                await db.flush()  # 获取 ID
                created_ids.append(new_rule.id)

        except Exception as e:
            errors.append(
                {
                    "index": idx,
                    "error": str(e),
                }
            )

    # 提交事务
    await db.commit()

    # 构建结果
    result.success_count = len(created_ids) + len(updated_ids)
    result.failed_count = len(errors)
    result.created_ids = created_ids
    result.updated_ids = updated_ids
    result.errors = errors

    return result


# ============================================================
# API 3: 获取单个映射规则详情
# ============================================================

@router.get(
    "/rules/{rule_id}",
    response_model=MappingRuleRead,
    summary="获取映射规则详情",
    description="根据 ID 获取映射规则的详细信息",
)
async def get_mapping_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db_session),
) -> MappingRuleRead:
    """获取单个映射规则"""
    rule = await db.get(MappingRule, rule_id)
    if not rule or rule.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"MappingRule with id {rule_id} not found",
        )

    return MappingRuleRead.model_validate(rule)


# ============================================================
# API 4: 获取目标数据集列表
# ============================================================

@router.get(
    "/target-datasets",
    response_model=TargetDatasetListResponse,
    summary="获取目标数据集列表",
    description="""
获取指定规范文档下的目标数据集列表。

**核心特性：**
- 按 dataset_name 字母顺序排序
- 支持分页查询

**使用场景：**
- Mapping Studio 右侧目标数据集选择器
- SDTM/ADaM 标准浏览器
    """,
    responses={
        200: {
            "description": "成功返回数据集列表",
            "content": {
                "application/json": {
                    "example": {
                        "total": 2,
                        "items": [
                            {
                                "id": 1,
                                "specification_id": 1,
                                "dataset_name": "DM",
                                "class_type": "Special Purpose",
                                "description": "Demographics - 人口学数据集",
                            },
                            {
                                "id": 2,
                                "specification_id": 1,
                                "dataset_name": "VS",
                                "class_type": "Findings",
                                "description": "Vital Signs - 生命体征数据集",
                            }
                        ],
                    }
                }
            },
        },
        400: {"description": "请求参数错误"},
        404: {"description": "规范文档不存在"},
    },
)
async def get_target_datasets(
    specification_id: int = Query(..., description="规范文档 ID（必填）"),
    limit: int = Query(100, ge=1, le=500, description="返回数量限制"),
    offset: int = Query(0, ge=0, description="偏移量（分页）"),
    db: AsyncSession = Depends(get_db_session),
) -> TargetDatasetListResponse:
    """
    获取目标数据集列表

    返回指定规范文档下的所有数据集，按名称排序
    """
    # 1. 验证 Specification 存在
    from app.models import Specification
    spec = await db.get(Specification, specification_id)
    if not spec or spec.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Specification with id {specification_id} not found",
        )

    # 2. 查询总数
    count_query = (
        select(func.count())
        .select_from(TargetDataset)
        .where(
            TargetDataset.specification_id == specification_id,
            TargetDataset.is_deleted == False,
        )
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 3. 查询数据集列表（按名称排序）
    query = (
        select(TargetDataset)
        .where(
            TargetDataset.specification_id == specification_id,
            TargetDataset.is_deleted == False,
        )
        .order_by(TargetDataset.dataset_name)
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)
    datasets = result.scalars().all()

    # 4. 构建响应
    items = [TargetDatasetRead.model_validate(ds) for ds in datasets]

    return TargetDatasetListResponse(total=total, items=items)


# ============================================================
# API 5: 获取目标变量列表（含映射状态）
# ============================================================

# CDISC 标准变量排序优先级（标识符优先）
CDISC_VARIABLE_PRIORITY = {
    "STUDYID": 1,
    "DOMAIN": 2,
    "USUBJID": 3,
    "SUBJID": 4,
    "SITEID": 5,
    "VISITNUM": 10,
    "VISIT": 11,
    "VISITDY": 12,
}


@router.get(
    "/target-variables",
    response_model=TargetVariableListResponse,
    summary="获取目标变量列表",
    description="""
获取指定数据集下的目标变量列表，包含映射状态信息。

**核心特性：**
- 通过 LEFT JOIN MappingRule 动态计算 `is_mapped` 字段
- 按 CDISC 标准习惯排序：标识符（STUDYID, DOMAIN, USUBJID）优先
- 返回映射规则数量统计

**使用场景：**
- Mapping Studio 右侧目标变量列表
- 支持映射状态可视化
    """,
    responses={
        200: {
            "description": "成功返回变量列表",
            "content": {
                "application/json": {
                    "example": {
                        "total": 5,
                        "items": [
                            {
                                "id": 1,
                                "dataset_id": 1,
                                "variable_name": "STUDYID",
                                "data_type": "Char",
                                "length": 12,
                                "core": "Req",
                                "origin_type": "CDISC",
                                "is_mapped": True,
                                "mapping_count": 1,
                            }
                        ],
                    }
                }
            },
        },
        400: {"description": "请求参数错误"},
        404: {"description": "数据集不存在"},
    },
)
async def get_target_variables(
    dataset_id: int = Query(..., description="目标数据集 ID（必填）"),
    limit: int = Query(200, ge=1, le=500, description="返回数量限制"),
    offset: int = Query(0, ge=0, description="偏移量（分页）"),
    db: AsyncSession = Depends(get_db_session),
) -> TargetVariableListResponse:
    """
    获取目标变量列表（含映射状态）

    按 CDISC 标准习惯排序：标识符优先
    """
    # 1. 验证 TargetDataset 存在
    dataset = await db.get(TargetDataset, dataset_id)
    if not dataset or dataset.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"TargetDataset with id {dataset_id} not found",
        )

    # 2. 子查询：计算每个 target_variable 的映射规则数量
    mapping_count_subquery = (
        select(
            MappingRule.target_variable_id,
            func.count(MappingRule.id).label("mapping_count"),
        )
        .where(
            MappingRule.is_deleted == False,
        )
        .group_by(MappingRule.target_variable_id)
        .subquery()
    )

    # 3. 主查询：LEFT JOIN TargetVariable -> mapping_count
    query = (
        select(
            TargetVariable,
            func.coalesce(mapping_count_subquery.c.mapping_count, 0).label("mapping_count"),
        )
        .outerjoin(
            mapping_count_subquery,
            TargetVariable.id == mapping_count_subquery.c.target_variable_id,
        )
        .where(
            TargetVariable.dataset_id == dataset_id,
            TargetVariable.is_deleted == False,
        )
    )

    # 4. 查询总数（先执行不分页的查询获取所有数据）
    all_query = query.order_by(TargetVariable.sort_order, TargetVariable.id)
    all_result = await db.execute(all_query)
    all_rows = all_result.all()
    total = len(all_rows)

    # 5. 应用排序（CDISC 标识符优先，然后按 sort_order 和 id）
    def get_sort_key(row) -> tuple:
        var: TargetVariable = row[0]
        # CDISC 优先级变量排在前面
        priority = CDISC_VARIABLE_PRIORITY.get(var.variable_name, 100)
        return (priority, var.sort_order, var.id)

    sorted_rows = sorted(all_rows, key=get_sort_key)

    # 6. 应用分页
    paginated_rows = sorted_rows[offset:offset + limit]

    # 7. 构建响应
    items = []
    for row in paginated_rows:
        var: TargetVariable = row[0]
        mapping_count: int = row[1]

        items.append(
            TargetVariableWithMappingRead(
                id=var.id,
                dataset_id=var.dataset_id,
                variable_name=var.variable_name,
                variable_label=var.variable_label,
                description=var.description,
                data_type=var.data_type,
                length=var.length,
                core=var.core,
                base_id=var.base_id,
                override_type=var.override_type,
                origin_type=var.origin_type,
                sort_order=var.sort_order,
                standard_metadata=var.standard_metadata,
                created_by=var.created_by,
                updated_by=var.updated_by,
                created_at=var.created_at,
                updated_at=var.updated_at,
                is_deleted=var.is_deleted,
                is_mapped=mapping_count > 0,
                mapping_count=mapping_count,
            )
        )

    return TargetVariableListResponse(total=total, items=items)