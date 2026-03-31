# backend/app/api/routers/shell_library.py

"""
Shell Library API Router

REST API for Global/TA level shell template management.
"""
import copy
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.database import get_db_session
from app.models.audit_listener import set_audit_context
from app.models.shell_library import ShellLibraryTemplate
from app.schemas.shell_library import (
    ShellLibraryTemplateCreate,
    ShellLibraryTemplateUpdate,
    ShellLibraryTemplateResponse,
    ShellLibraryTemplateList,
)

router = APIRouter(prefix="/shell-library", tags=["Shell Library"])


@router.get("/templates", response_model=ShellLibraryTemplateList)
async def list_templates(
    scope_level: Optional[str] = Query(None, pattern="^(global|ta|product)$"),
    scope_node_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    display_type: Optional[str] = Query(None, pattern="^(Table|Figure|Listing)$"),
    is_deleted: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db_session),
):
    """List shell library templates with filters"""
    conditions = [ShellLibraryTemplate.is_deleted == is_deleted]

    if scope_level:
        conditions.append(ShellLibraryTemplate.scope_level == scope_level)
    if scope_node_id:
        conditions.append(ShellLibraryTemplate.scope_node_id == scope_node_id)
    if category:
        conditions.append(ShellLibraryTemplate.category == category)
    if display_type:
        conditions.append(ShellLibraryTemplate.display_type == display_type)

    stmt = (
        select(ShellLibraryTemplate)
        .where(and_(*conditions))
        .order_by(ShellLibraryTemplate.category, ShellLibraryTemplate.template_name)
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    templates = result.scalars().all()

    # Get total count using SQL COUNT for efficiency
    count_stmt = select(func.count()).select_from(ShellLibraryTemplate).where(and_(*conditions))
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0

    return ShellLibraryTemplateList(items=templates, total=total)


@router.get("/templates/{template_id}", response_model=ShellLibraryTemplateResponse)
async def get_template(
    template_id: int,
    db: AsyncSession = Depends(get_db_session),
) -> ShellLibraryTemplateResponse:
    """Get a single shell library template"""
    stmt = select(ShellLibraryTemplate).where(
        ShellLibraryTemplate.id == template_id,
        ShellLibraryTemplate.is_deleted == False,
    )
    result = await db.execute(stmt)
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    return template


@router.post("/templates", response_model=ShellLibraryTemplateResponse, status_code=201)
async def create_template(
    data: ShellLibraryTemplateCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new shell library template"""
    # TODO: Add permission check (R_ADMIN for global, R_TA_ADMIN for ta)

    set_audit_context(
        user_id=current_user.username,
        user_name=current_user.username,
        context={"operation": "create_template", "source": "api"},
    )

    template = ShellLibraryTemplate(
        scope_level=data.scope_level,
        scope_node_id=data.scope_node_id,
        category=data.category,
        template_name=data.template_name,
        display_type=data.display_type,
        shell_schema=data.shell_schema,
        statistics_set_id=data.statistics_set_id,
        description=data.description,
        version=1,
        created_by=current_user.username,
    )

    db.add(template)
    await db.commit()
    await db.refresh(template)

    return template


@router.put("/templates/{template_id}", response_model=ShellLibraryTemplateResponse)
async def update_template(
    template_id: int,
    data: ShellLibraryTemplateUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
):
    """Update a shell library template (increments version)"""
    set_audit_context(
        user_id=current_user.username,
        user_name=current_user.username,
        context={"operation": "update_template", "source": "api"},
    )

    stmt = select(ShellLibraryTemplate).where(
        ShellLibraryTemplate.id == template_id,
        ShellLibraryTemplate.is_deleted == False,
    )
    result = await db.execute(stmt)
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)

    # Increment version
    template.version += 1
    template.updated_by = current_user.username

    # TODO: Add version history entry

    await db.commit()
    await db.refresh(template)

    return template


@router.post("/templates/{template_id}/soft-delete", response_model=ShellLibraryTemplateResponse)
async def soft_delete_template(
    template_id: int,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
):
    """Soft delete a shell library template"""
    set_audit_context(
        user_id=current_user.username,
        user_name=current_user.username,
        context={"operation": "soft_delete_template", "source": "api"},
    )

    stmt = select(ShellLibraryTemplate).where(
        ShellLibraryTemplate.id == template_id,
        ShellLibraryTemplate.is_deleted == False,
    )
    result = await db.execute(stmt)
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    template.soft_delete(current_user.username)
    await db.commit()
    await db.refresh(template)

    return template


@router.post("/templates/{template_id}/duplicate", response_model=ShellLibraryTemplateResponse, status_code=201)
async def duplicate_template(
    template_id: int,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
):
    """Duplicate a shell library template"""
    set_audit_context(
        user_id=current_user.username,
        user_name=current_user.username,
        context={"operation": "duplicate_template", "source": "api"},
    )

    stmt = select(ShellLibraryTemplate).where(
        ShellLibraryTemplate.id == template_id,
        ShellLibraryTemplate.is_deleted == False,
    )
    result = await db.execute(stmt)
    source = result.scalar_one_or_none()

    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    new_template = ShellLibraryTemplate(
        scope_level=source.scope_level,
        scope_node_id=source.scope_node_id,
        category=source.category,
        template_name=f"{source.template_name} (Copy)",
        display_type=source.display_type,
        shell_schema=copy.deepcopy(source.shell_schema),
        statistics_set_id=source.statistics_set_id,
        description=source.description,
        version=1,
        created_by=current_user.username,
    )

    db.add(new_template)
    await db.commit()
    await db.refresh(new_template)

    return new_template