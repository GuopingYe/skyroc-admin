"""Reference Data CRUD endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_superuser
from app.database import get_db_session
from app.models import ReferenceData
from app.models.audit_listener import set_audit_context
from app.models.enums import ReferenceDataCategory
from app.schemas.reference_data import (
    CategorySummary,
    PaginatedReferenceDataResponse,
    ReferenceDataCreate,
    ReferenceDataResponse,
    ReferenceDataUpdate,
)
from app.utils.cache import TTLCache

router = APIRouter(prefix="/reference-data", tags=["Reference Data"])

_ref_cache: TTLCache = TTLCache(ttl_seconds=300, max_size=64)


def _invalidate_cache(category: str = "") -> None:
    """Invalidate reference data caches after writes."""
    _ref_cache.invalidate("categories")
    if category:
        _ref_cache.invalidate(f"items:{category}:")

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


async def _get_item_or_404(
    db: AsyncSession, category: str, code: str, *, include_deleted: bool = False
) -> ReferenceData:
    query = select(ReferenceData).where(
        ReferenceData.category == category,
        ReferenceData.code == code,
        ReferenceData.is_deleted == include_deleted,
    )
    result = await db.execute(query)
    item = result.scalar_one_or_none()
    if not item:
        state = "deleted " if include_deleted else ""
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{state}Item '{code}' not found in '{category}'",
        )
    return item


@router.get("/", response_model=list[CategorySummary])
async def list_categories(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    cache_key = "categories"
    cached = _ref_cache.get(cache_key)
    if cached is not None:
        return cached

    results = await db.execute(
        select(
            ReferenceData.category,
            func.count().label("count"),
            func.count().filter(ReferenceData.is_active == True, ReferenceData.is_deleted == False).label("active_count"),  # noqa: E712
        )
        .where(ReferenceData.is_deleted == False)
        .group_by(ReferenceData.category)
    )
    data = [
        CategorySummary(
            category=row.category,
            label=CATEGORY_LABELS.get(row.category, row.category),
            count=row.count,
            active_count=row.active_count,
        )
        for row in results.all()
    ]
    _ref_cache.set(cache_key, data)
    return data


@router.get("/{category}", response_model=PaginatedReferenceDataResponse)
async def list_items(
    category: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    is_active: bool | None = None,
    is_deleted: bool | None = None,
    offset: int = Query(0, ge=0, description="Page offset"),
    limit: int = Query(100, ge=1, le=500, description="Page size"),
):
    _validate_category(category)

    cache_key = f"items:{category}:{is_active}:{is_deleted}:{offset}:{limit}"
    cached = _ref_cache.get(cache_key)
    if cached is not None:
        return cached

    base_filter = [ReferenceData.category == category]
    if is_deleted is not None:
        base_filter.append(ReferenceData.is_deleted == is_deleted)
    else:
        base_filter.append(ReferenceData.is_deleted == False)  # noqa: E712

    if is_active is not None:
        base_filter.append(ReferenceData.is_active == is_active)

    count_q = select(func.count()).select_from(ReferenceData).where(*base_filter)
    data_q = (
        select(ReferenceData)
        .where(*base_filter)
        .order_by(ReferenceData.sort_order, ReferenceData.code)
        .offset(offset)
        .limit(limit)
    )
    total_result = await db.execute(count_q)
    page_result = await db.execute(data_q)
    total = total_result.scalar_one()
    items = [ReferenceDataResponse.model_validate(i) for i in page_result.scalars().all()]

    data = PaginatedReferenceDataResponse(total=total, items=items, offset=offset, limit=limit)
    _ref_cache.set(cache_key, data)
    return data


@router.get("/{category}/{code}", response_model=ReferenceDataResponse)
async def get_item(
    category: str,
    code: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    _validate_category(category)
    item = await _get_item_or_404(db, category, code)
    return ReferenceDataResponse.model_validate(item)


@router.post("/{category}", response_model=ReferenceDataResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    category: str,
    body: ReferenceDataCreate,
    admin: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
):
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
    _invalidate_cache(category)
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
    _validate_category(category)
    set_audit_context(str(admin.id), admin.username, context={"operation": "update_reference_data"})

    item = await _get_item_or_404(db, category, code)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    await db.flush()
    await db.refresh(item)
    _invalidate_cache(category)
    return ReferenceDataResponse.model_validate(item)


@router.post("/{category}/{code}/deactivate", response_model=ReferenceDataResponse)
async def deactivate_item(
    category: str,
    code: str,
    admin: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
):
    _validate_category(category)
    set_audit_context(str(admin.id), admin.username, context={"operation": "deactivate_reference_data"})

    item = await _get_item_or_404(db, category, code)
    item.soft_delete(deleted_by=admin.username)
    await db.flush()
    await db.refresh(item)
    _invalidate_cache(category)
    return ReferenceDataResponse.model_validate(item)


@router.post("/{category}/{code}/restore", response_model=ReferenceDataResponse)
async def restore_item(
    category: str,
    code: str,
    admin: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
):
    _validate_category(category)
    set_audit_context(str(admin.id), admin.username, context={"operation": "restore_reference_data"})

    item = await _get_item_or_404(db, category, code, include_deleted=True)
    item.soft_restore()
    await db.flush()
    await db.refresh(item)
    _invalidate_cache(category)
    return ReferenceDataResponse.model_validate(item)
