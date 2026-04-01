"""Reference Data CRUD endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_superuser
from app.database import get_db_session
from app.models import ReferenceData
from app.models.audit_listener import set_audit_context
from app.models.enums import ReferenceDataCategory
from app.schemas.reference_data import (
    CategorySummary,
    ReferenceDataCreate,
    ReferenceDataResponse,
    ReferenceDataUpdate,
)

router = APIRouter(prefix="/reference-data", tags=["Reference Data"])

CATEGORY_LABELS: dict[str, str] = {
    "POPULATION": "Population",
    "SDTM_DOMAIN": "SDTM Domain",
    "ADAM_DATASET": "ADaM Dataset",
    "STUDY_PHASE": "Study Phase",
    "STAT_TYPE": "Statistic Type",
    "DISPLAY_TYPE": "Display Type",
    "ANALYSIS_CATEGORY": "Analysis Category",
    "THERAPEUTIC_AREA": "Therapeutic Area",
    "REGULATORY_AGENCY": "Regulatory Agency",
    "CONTROL_TYPE": "Control Type",
    "BLINDING_STATUS": "Blinding Status",
    "STUDY_DESIGN": "Study Design",
}

VALID_CATEGORIES = {c.value for c in ReferenceDataCategory}


def _validate_category(category: str) -> None:
    if category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category '{category}'. Valid: {sorted(VALID_CATEGORIES)}",
        )


@router.get("/", response_model=list[CategorySummary])
async def list_categories(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """List all reference data categories with item counts."""
    results = await db.execute(
        select(
            ReferenceData.category,
            func.count().label("count"),
            func.count().filter(ReferenceData.is_active == True, ReferenceData.is_deleted == False).label("active_count"),  # noqa: E712
        )
        .where(ReferenceData.is_deleted == False)  # noqa: E712
        .group_by(ReferenceData.category)
    )
    rows = results.all()
    return [
        CategorySummary(
            category=row.category,
            label=CATEGORY_LABELS.get(row.category, row.category),
            count=row.count,
            active_count=row.active_count,
        )
        for row in rows
    ]


@router.get("/{category}", response_model=list[ReferenceDataResponse])
async def list_items(
    category: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    is_active: bool | None = None,
    is_deleted: bool | None = None,
):
    """List items in a category."""
    _validate_category(category)
    query = select(ReferenceData).where(ReferenceData.category == category)

    if is_deleted is not None:
        query = query.where(ReferenceData.is_deleted == is_deleted)
    else:
        query = query.where(ReferenceData.is_deleted == False)  # noqa: E712

    if is_active is not None:
        query = query.where(ReferenceData.is_active == is_active)

    query = query.order_by(ReferenceData.sort_order, ReferenceData.code)
    result = await db.execute(query)
    items = result.scalars().all()
    return [ReferenceDataResponse.model_validate(item) for item in items]


@router.get("/{category}/{code}", response_model=ReferenceDataResponse)
async def get_item(
    category: str,
    code: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """Get a single reference data item by category and code."""
    _validate_category(category)
    result = await db.execute(
        select(ReferenceData).where(
            ReferenceData.category == category,
            ReferenceData.code == code,
            ReferenceData.is_deleted == False,  # noqa: E712
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item '{code}' not found in '{category}'")
    return ReferenceDataResponse.model_validate(item)


@router.post("/{category}", response_model=ReferenceDataResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    category: str,
    body: ReferenceDataCreate,
    admin: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
):
    """Create a new reference data item (superuser only)."""
    _validate_category(category)
    set_audit_context(str(admin.id), admin.username, context={"operation": "create_reference_data"})

    existing = await db.execute(
        select(ReferenceData).where(
            ReferenceData.category == category,
            ReferenceData.code == body.code,
            ReferenceData.is_deleted == False,  # noqa: E712
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Item '{body.code}' already exists in '{category}'",
        )

    item = ReferenceData(category=category, **body.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return ReferenceDataResponse.model_validate(item)


@router.put("/{category}/{code}", response_model=ReferenceDataResponse)
async def update_item(
    category: str,
    code: str,
    body: ReferenceDataUpdate,
    admin: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
):
    """Update a reference data item (superuser only)."""
    _validate_category(category)
    set_audit_context(str(admin.id), admin.username, context={"operation": "update_reference_data"})

    result = await db.execute(
        select(ReferenceData).where(
            ReferenceData.category == category,
            ReferenceData.code == code,
            ReferenceData.is_deleted == False,  # noqa: E712
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item '{code}' not found in '{category}'")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.flush()
    await db.refresh(item)
    return ReferenceDataResponse.model_validate(item)


@router.post("/{category}/{code}/deactivate", response_model=ReferenceDataResponse)
async def deactivate_item(
    category: str,
    code: str,
    admin: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
):
    """Soft delete a reference data item (superuser only)."""
    _validate_category(category)
    set_audit_context(str(admin.id), admin.username, context={"operation": "deactivate_reference_data"})

    result = await db.execute(
        select(ReferenceData).where(
            ReferenceData.category == category,
            ReferenceData.code == code,
            ReferenceData.is_deleted == False,  # noqa: E712
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Item '{code}' not found in '{category}'")

    item.soft_delete(deleted_by=admin.username)
    await db.flush()
    await db.refresh(item)
    return ReferenceDataResponse.model_validate(item)


@router.post("/{category}/{code}/restore", response_model=ReferenceDataResponse)
async def restore_item(
    category: str,
    code: str,
    admin: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
):
    """Restore a soft-deleted reference data item (superuser only)."""
    _validate_category(category)
    set_audit_context(str(admin.id), admin.username, context={"operation": "restore_reference_data"})

    result = await db.execute(
        select(ReferenceData).where(
            ReferenceData.category == category,
            ReferenceData.code == code,
            ReferenceData.is_deleted == True,  # noqa: E712
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Deleted item '{code}' not found in '{category}'",
        )

    item.is_deleted = False
    item.deleted_at = None
    item.deleted_by = None
    await db.flush()
    await db.refresh(item)
    return ReferenceDataResponse.model_validate(item)
