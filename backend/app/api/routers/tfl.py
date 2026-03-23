"""
TFL Designer API Router

Core functionality:
1. List TFL shells for a scope node
2. Create/Update/Delete TFL shells (Table, Figure, Listing)
3. Get single shell details
4. Soft delete with audit trail (21 CFR Part 11 compliant)
"""
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_db_session
from app.database import get_db_session
from app.models import ARSDisplay, ScopeNode
from app.models.audit_listener import set_audit_context

router = APIRouter(prefix="/mdr/tfl", tags=["TFL Designer"])


class TFLShellBase(BaseModel):
    display_id: str = Field(..., description="Display ID")
    display_type: Literal["Table", "Figure", "Listing"] = Field(...)
    title: str = Field(..., description="Title")
    subtitle: str | None = Field(None)
    footnote: str | None = Field(None)
    sort_order: int = Field(0)
    display_config: dict[str, Any] | None = Field(None)
    extra_attrs: dict[str, Any] | None = Field(None)


class TFLShellCreate(TFLShellBase):
    scope_node_id: int = Field(...)


class TFLShellUpdate(BaseModel):
    display_id: str | None = None
    display_type: Literal["Table", "Figure", "Listing"] | None = None
    title: str | None = None
    subtitle: str | None = None
    footnote: str | None = None
    sort_order: int | None = None
    display_config: dict[str, Any] | None = None
    extra_attrs: dict[str, Any] | None = None
    updated_by: str = Field(...)


class TFLShellRead(BaseModel):
    id: int
    scope_node_id: int
    display_id: str
    display_type: str
    title: str
    subtitle: str | None
    footnote: str | None
    sort_order: int
    display_config: dict[str, Any] | None
    extra_attrs: dict[str, Any] | None
    created_by: str
    updated_by: str | None
    created_at: datetime | None
    updated_at: datetime | None
    model_config = {"from_attributes": True}


def _ok(data: Any = None, msg: str = "success") -> dict:
    return {"code": "0000", "msg": msg, "data": data}


@router.get("/shells", summary="Get TFL shells list")
async def get_tfl_shells(
    user: CurrentUser,
    scope_node_id: int = Query(...),
    display_type: Literal["Table", "Figure", "Listing"] | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    scope_node = await db.get(ScopeNode, scope_node_id)
    if not scope_node or scope_node.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scope node not found")
    query = select(ARSDisplay).where(
        ARSDisplay.scope_node_id == scope_node_id,
        ARSDisplay.is_deleted == False,
    )
    if display_type:
        query = query.where(ARSDisplay.display_type == display_type)
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    query = query.order_by(ARSDisplay.sort_order, ARSDisplay.display_id, ARSDisplay.id).offset(offset).limit(limit)
    result = await db.execute(query)
    shells = result.scalars().all()
    items = [TFLShellRead.model_validate(s).model_dump() for s in shells]
    return _ok({"total": total, "items": items})


@router.post("/shell", summary="Create a TFL shell", status_code=status.HTTP_201_CREATED)
async def create_tfl_shell(
    shell_data: TFLShellCreate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    set_audit_context(user_id=user.username, user_name=user.username, context={"operation": "create_shell"}, reason="Create TFL shell")
    scope_node = await db.get(ScopeNode, shell_data.scope_node_id)
    if not scope_node or scope_node.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scope node not found")
    existing_query = select(ARSDisplay).where(
        ARSDisplay.scope_node_id == shell_data.scope_node_id,
        ARSDisplay.display_id == shell_data.display_id,
        ARSDisplay.is_deleted == False,
    )
    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Shell already exists")
    new_shell = ARSDisplay(
        scope_node_id=shell_data.scope_node_id,
        display_id=shell_data.display_id,
        display_type=shell_data.display_type,
        title=shell_data.title,
        subtitle=shell_data.subtitle,
        footnote=shell_data.footnote,
        sort_order=shell_data.sort_order,
        display_config=shell_data.display_config,
        extra_attrs=shell_data.extra_attrs,
        created_by=user.username,
    )
    db.add(new_shell)
    await db.commit()
    await db.refresh(new_shell)
    return _ok({"id": new_shell.id, "message": "Shell created successfully", "shell": TFLShellRead.model_validate(new_shell).model_dump()})


@router.get("/shell/{shell_id}", summary="Get TFL shell detail")
async def get_tfl_shell(
    shell_id: int,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    shell = await db.get(ARSDisplay, shell_id)
    if not shell or shell.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shell not found")
    return _ok(TFLShellRead.model_validate(shell).model_dump())


@router.put("/shell/{shell_id}", summary="Update a TFL shell")
async def update_tfl_shell(
    shell_id: int,
    shell_data: TFLShellUpdate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    set_audit_context(user_id=shell_data.updated_by, user_name=shell_data.updated_by, context={"operation": "update_shell"}, reason="Update TFL shell")
    shell = await db.get(ARSDisplay, shell_id)
    if not shell or shell.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shell not found")
    if shell_data.display_id and shell_data.display_id != shell.display_id:
        existing_query = select(ARSDisplay).where(
            ARSDisplay.scope_node_id == shell.scope_node_id,
            ARSDisplay.display_id == shell_data.display_id,
            ARSDisplay.is_deleted == False,
            ARSDisplay.id != shell_id,
        )
        existing_result = await db.execute(existing_query)
        if existing_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Shell already exists")
    update_fields = ["display_id", "display_type", "title", "subtitle", "footnote", "sort_order", "display_config", "extra_attrs"]
    for field in update_fields:
        value = getattr(shell_data, field, None)
        if value is not None:
            setattr(shell, field, value)
    shell.updated_by = shell_data.updated_by
    await db.commit()
    await db.refresh(shell)
    return _ok({"success": True, "message": "Shell updated successfully", "shell": TFLShellRead.model_validate(shell).model_dump()})


@router.delete("/shell/{shell_id}", summary="Delete a TFL shell (soft delete)")
async def delete_tfl_shell(
    shell_id: int,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    set_audit_context(user_id=user.username, user_name=user.username, context={"operation": "delete_shell"}, reason="Delete TFL shell")
    shell = await db.get(ARSDisplay, shell_id)
    if not shell or shell.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shell not found")
    shell.is_deleted = True
    shell.deleted_at = datetime.utcnow()
    shell.updated_by = user.username
    await db.commit()
    return _ok({"success": True, "message": "Shell deleted successfully"})


class ShellOrderUpdate(BaseModel):
    updates: list[dict[str, int]] = Field(...)
    updated_by: str = Field(...)


@router.put("/shells/order", summary="Batch update shell order")
async def update_shell_order(
    order_data: ShellOrderUpdate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    set_audit_context(user_id=order_data.updated_by, user_name=order_data.updated_by, context={"operation": "update_order"}, reason="Update shell order")
    for update in order_data.updates:
        shell_id = update.get("id")
        sort_order = update.get("sort_order")
        if shell_id is None or sort_order is None:
            continue
        shell = await db.get(ARSDisplay, shell_id)
        if shell and not shell.is_deleted:
            shell.sort_order = sort_order
            shell.updated_by = order_data.updated_by
    await db.commit()
    return _ok({"success": True, "message": "Shell order updated successfully"})
