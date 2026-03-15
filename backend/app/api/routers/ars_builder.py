"""
ARS Builder API Router

核心功能：
1. 获取 TFL 列表（导航树）
2. 获取 TFL 完整详情（嵌套结构）
3. 保存 TFL 布局（整存整取）
"""
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db_session
from app.models import (
    ARSDataBinding,
    ARSDisplay,
    ARSDisplaySection,
    ARSTemplateBlock,
    ScopeNode,
    TargetVariable,
)
from app.models.audit_listener import set_audit_context
from app.schemas.ars_schemas import (
    ARSDisplayDetailRead,
    ARSDisplayLayoutUpdate,
    ARSDisplayListResponse,
    ARSDisplayRead,
)

router = APIRouter(prefix="/ars", tags=["ARS Builder"])


# ============================================================
# Response Models
# ============================================================

class MessageResponse(BaseModel):
    """通用消息响应"""

    message: str
    detail: dict[str, Any] | None = None


# ============================================================
# API 1: 获取 TFL 列表（导航树）
# ============================================================

@router.get(
    "/displays",
    response_model=ARSDisplayListResponse,
    summary="获取 TFL 列表",
    description="""
获取指定作用域下的所有 TFL 基础列表。

**核心特性：**
- 仅返回基础信息，不含 Section 详情
- 按 sort_order 和 display_id 排序
- 用于前端左侧导航树展示

**使用场景：**
- TFL 构建器左侧导航
- TFL 索引列表
    """,
    responses={
        200: {"description": "成功返回 TFL 列表"},
        404: {"description": "作用域节点不存在"},
    },
)
async def get_displays(
    scope_node_id: int = Query(..., description="作用域节点 ID（必填）"),
    display_type: str | None = Query(None, description="显示类型过滤：Table/Figure/Listing"),
    limit: int = Query(100, ge=1, le=500, description="返回数量限制"),
    offset: int = Query(0, ge=0, description="偏移量（分页）"),
    db: AsyncSession = Depends(get_db_session),
) -> ARSDisplayListResponse:
    """
    获取 TFL 列表

    返回基础信息，用于导航树展示
    """
    # 1. 验证 ScopeNode 存在
    scope_node = await db.get(ScopeNode, scope_node_id)
    if not scope_node or scope_node.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ScopeNode with id {scope_node_id} not found",
        )

    # 2. 构建查询
    query = (
        select(ARSDisplay)
        .where(
            ARSDisplay.scope_node_id == scope_node_id,
            ARSDisplay.is_deleted == False,
        )
    )

    if display_type:
        query = query.where(ARSDisplay.display_type == display_type)

    # 3. 查询总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 4. 应用排序和分页
    query = query.order_by(
        ARSDisplay.sort_order,
        ARSDisplay.display_id,
    ).offset(offset).limit(limit)

    # 5. 执行查询
    result = await db.execute(query)
    displays = result.scalars().all()

    # 6. 构建响应
    items = [ARSDisplayRead.model_validate(d) for d in displays]

    return ARSDisplayListResponse(total=total, items=items)


# ============================================================
# API 2: 获取 TFL 完整详情（嵌套结构）
# ============================================================

@router.get(
    "/displays/{display_id}/detail",
    response_model=ARSDisplayDetailRead,
    summary="获取 TFL 完整详情",
    description="""
获取指定 TFL 的完整嵌套结构。

**核心特性：**
- 使用 selectinload 预加载关联数据
- 返回完整树状结构：Display -> Sections -> BlockTemplate & DataBindings
- 前端一次调用即可获取完整渲染所需数据

**使用场景：**
- TFL 构建器主画布渲染
- Mock Shell 预览
    """,
    responses={
        200: {"description": "成功返回 TFL 完整详情"},
        404: {"description": "Display 不存在"},
    },
)
async def get_display_detail(
    display_id: int,
    db: AsyncSession = Depends(get_db_session),
) -> ARSDisplayDetailRead:
    """
    获取 TFL 完整详情

    使用 selectinload 预加载所有嵌套关联
    """
    # 构建查询，使用 selectinload 预加载嵌套关联
    query = (
        select(ARSDisplay)
        .where(
            ARSDisplay.id == display_id,
            ARSDisplay.is_deleted == False,
        )
        .options(
            # 预加载 sections
            selectinload(ARSDisplay.sections).where(
                ARSDisplaySection.is_deleted == False
            ),
            # 预加载每个 section 的 block_template
            selectinload(ARSDisplay.sections).selectinload(
                ARSDisplaySection.block_template
            ),
            # 预加载每个 section 的 data_bindings
            selectinload(ARSDisplay.sections).selectinload(
                ARSDisplaySection.data_bindings
            ).where(
                ARSDataBinding.is_deleted == False
            ),
        )
        .order_by(ARSDisplay.sections.fields.display_order)  # 按 display_order 排序
    )

    result = await db.execute(query)
    display = result.scalar_one_or_none()

    if not display:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ARSDisplay with id {display_id} not found",
        )

    # 手动排序 sections（因为 selectinload 不保证顺序）
    sorted_sections = sorted(
        [s for s in display.sections if not s.is_deleted],
        key=lambda s: s.display_order,
    )

    # 构建嵌套响应
    return ARSDisplayDetailRead(
        id=display.id,
        scope_node_id=display.scope_node_id,
        display_id=display.display_id,
        display_type=display.display_type,
        title=display.title,
        subtitle=display.subtitle,
        footnote=display.footnote,
        sort_order=display.sort_order,
        display_config=display.display_config,
        extra_attrs=display.extra_attrs,
        created_by=display.created_by,
        updated_by=display.updated_by,
        created_at=display.created_at,
        updated_at=display.updated_at,
        is_deleted=display.is_deleted,
        sections=[
            ARSDisplaySectionRead(
                id=section.id,
                display_id=section.display_id,
                block_template_id=section.block_template_id,
                display_order=section.display_order,
                override_layout_schema=section.override_layout_schema,
                extra_attrs=section.extra_attrs,
                created_by=section.created_by,
                updated_by=section.updated_by,
                created_at=section.created_at,
                updated_at=section.updated_at,
                is_deleted=section.is_deleted,
                # 嵌套 BlockTemplate
                block_template=ARSTemplateBlockRead.model_validate(section.block_template),
                # 嵌套 DataBindings
                data_bindings=[
                    ARSDataBindingRead.model_validate(b)
                    for b in section.data_bindings
                    if not b.is_deleted
                ],
            )
            for section in sorted_sections
        ],
    )


# ============================================================
# API 3: 保存 TFL 布局（整存整取）
# ============================================================

@router.put(
    "/displays/{display_id}/layout",
    response_model=ARSDisplayDetailRead,
    summary="保存 TFL 布局",
    description="""
保存 TFL 的完整布局结构（整存整取）。

**核心特性：**
- 在一个事务中执行全量保存/覆盖
- 自动处理新增/更新/删除的 Sections 和 Bindings
- 自动触发审计日志

**Upsert 逻辑：**
- Sections: 按 display_order 匹配，存在则更新，不存在则新增
- Bindings: 按 target_variable_id 匹配，存在则更新，不存在则新增

**使用场景：**
- TFL 构建器保存操作
- 拖拽完成后的批量更新
    """,
    responses={
        200: {"description": "布局保存成功"},
        400: {"description": "请求参数错误"},
        404: {"description": "Display 或 BlockTemplate 不存在"},
    },
)
async def save_display_layout(
    display_id: int,
    layout_data: ARSDisplayLayoutUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> ARSDisplayDetailRead:
    """
    保存 TFL 布局

    整存整取，支持 Upsert
    """
    # 设置审计上下文
    set_audit_context(
        user_id=layout_data.updated_by,
        user_name=layout_data.updated_by,
        context={"operation": "save_layout", "source": "api"},
        reason="保存 TFL 布局",
    )

    # 1. 验证 Display 存在
    display = await db.get(ARSDisplay, display_id)
    if not display or display.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ARSDisplay with id {display_id} not found",
        )

    # 2. 更新 Display 基础信息
    if layout_data.display_id is not None:
        display.display_id = layout_data.display_id
    if layout_data.title is not None:
        display.title = layout_data.title
    if layout_data.subtitle is not None:
        display.subtitle = layout_data.subtitle
    if layout_data.footnote is not None:
        display.footnote = layout_data.footnote
    if layout_data.display_config is not None:
        display.display_config = layout_data.display_config
    display.updated_by = layout_data.updated_by

    # 3. 获取现有 Sections
    existing_sections_query = select(ARSDisplaySection).where(
        ARSDisplaySection.display_id == display_id,
        ARSDisplaySection.is_deleted == False,
    )
    existing_sections_result = await db.execute(existing_sections_query)
    existing_sections = {s.display_order: s for s in existing_sections_result.scalars().all()}

    # 4. 处理 Sections（Upsert）
    new_sections = []
    for section_data in layout_data.sections:
        # 验证 BlockTemplate 存在
        block_template = await db.get(ARSTemplateBlock, section_data.block_template_id)
        if not block_template or block_template.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"ARSTemplateBlock with id {section_data.block_template_id} not found",
            )

        if section_data.display_order in existing_sections:
            # 更新现有 Section
            existing_section = existing_sections[section_data.display_order]
            existing_section.block_template_id = section_data.block_template_id
            existing_section.override_layout_schema = section_data.override_layout_schema
            existing_section.extra_attrs = section_data.extra_attrs
            existing_section.updated_by = section_data.created_by

            # 处理 Bindings
            await _upsert_bindings(
                db=db,
                section=existing_section,
                bindings_data=section_data.bindings,
            )
        else:
            # 创建新 Section
            new_section = ARSDisplaySection(
                display_id=display_id,
                block_template_id=section_data.block_template_id,
                display_order=section_data.display_order,
                override_layout_schema=section_data.override_layout_schema,
                extra_attrs=section_data.extra_attrs,
                created_by=section_data.created_by,
            )
            db.add(new_section)
            await db.flush()  # 获取 ID

            # 创建 Bindings
            for binding_data in section_data.bindings:
                # 验证 TargetVariable 存在
                target_var = await db.get(TargetVariable, binding_data.target_variable_id)
                if not target_var or target_var.is_deleted:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"TargetVariable with id {binding_data.target_variable_id} not found",
                    )

                new_binding = ARSDataBinding(
                    section_id=new_section.id,
                    target_variable_id=binding_data.target_variable_id,
                    variable_role=binding_data.variable_role,
                    filter_logic=binding_data.filter_logic,
                    statistics_config=binding_data.statistics_config,
                    extra_attrs=binding_data.extra_attrs,
                    created_by=binding_data.created_by,
                )
                db.add(new_binding)

    # 5. 标记不在新列表中的 Sections 为删除
    new_display_orders = {s.display_order for s in layout_data.sections}
    for display_order, section in existing_sections.items():
        if display_order not in new_display_orders:
            section.is_deleted = True

    # 6. 提交事务
    await db.commit()

    # 7. 返回更新后的完整详情
    return await get_display_detail(display_id, db)


async def _upsert_bindings(
    db: AsyncSession,
    section: ARSDisplaySection,
    bindings_data: list,
) -> None:
    """
    Upsert 数据绑定

    按 target_variable_id 匹配，存在则更新，不存在则新增
    """
    # 获取现有 Bindings
    existing_bindings_query = select(ARSDataBinding).where(
        ARSDataBinding.section_id == section.id,
        ARSDataBinding.is_deleted == False,
    )
    existing_bindings_result = await db.execute(existing_bindings_query)
    existing_bindings = {b.target_variable_id: b for b in existing_bindings_result.scalars().all()}

    new_target_vars = set()

    for binding_data in bindings_data:
        # 验证 TargetVariable 存在
        target_var = await db.get(TargetVariable, binding_data.target_variable_id)
        if not target_var or target_var.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"TargetVariable with id {binding_data.target_variable_id} not found",
            )

        new_target_vars.add(binding_data.target_variable_id)

        if binding_data.target_variable_id in existing_bindings:
            # 更新现有 Binding
            existing_binding = existing_bindings[binding_data.target_variable_id]
            existing_binding.variable_role = binding_data.variable_role
            existing_binding.filter_logic = binding_data.filter_logic
            existing_binding.statistics_config = binding_data.statistics_config
            existing_binding.extra_attrs = binding_data.extra_attrs
            existing_binding.updated_by = binding_data.created_by
        else:
            # 创建新 Binding
            new_binding = ARSDataBinding(
                section_id=section.id,
                target_variable_id=binding_data.target_variable_id,
                variable_role=binding_data.variable_role,
                filter_logic=binding_data.filter_logic,
                statistics_config=binding_data.statistics_config,
                extra_attrs=binding_data.extra_attrs,
                created_by=binding_data.created_by,
            )
            db.add(new_binding)

    # 标记不在新列表中的 Bindings 为删除
    for target_var_id, binding in existing_bindings.items():
        if target_var_id not in new_target_vars:
            binding.is_deleted = True


# ============================================================
# 导入延迟引用
# ============================================================
from app.schemas.ars_schemas import (
    ARSDataBindingRead,
    ARSDisplaySectionRead,
    ARSTemplateBlockRead,
)