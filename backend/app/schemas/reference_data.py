"""Pydantic schemas for Reference Data API."""
from datetime import datetime
from typing import Any

from pydantic import Field

from app.schemas.base import BaseSchema


# --- Request Schemas ---

class ReferenceDataCreate(BaseSchema):
    """Schema for creating a reference data item."""
    code: str = Field(..., min_length=1, max_length=64, description="Short code (e.g., ITT, DM)")
    label: str = Field(..., min_length=1, max_length=256, description="Display name")
    description: str | None = Field(None, description="Optional description")
    sort_order: int = Field(0, description="Display ordering within category")
    metadata_: dict[str, Any] | None = Field(None, description="Extensible per-category fields")


class ReferenceDataUpdate(BaseSchema):
    """Schema for updating a reference data item. All fields optional."""
    label: str | None = Field(None, min_length=1, max_length=256)
    description: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    metadata_: dict[str, Any] | None = None


# --- Response Schemas ---

class ReferenceDataResponse(BaseSchema):
    """Full reference data item response."""
    id: int
    category: str
    code: str
    label: str
    description: str | None
    sort_order: int
    metadata_: dict[str, Any] | None = None
    is_active: bool
    is_deleted: bool
    deleted_at: datetime | None
    deleted_by: str | None
    created_at: datetime
    updated_at: datetime


class CategorySummary(BaseSchema):
    """Summary of a reference data category."""
    category: str
    label: str
    count: int
    active_count: int


class PaginatedReferenceDataResponse(BaseSchema):
    """Paginated response for reference data items."""
    total: int = Field(..., description="Total number of items matching the filter")
    items: list[ReferenceDataResponse] = Field(default_factory=list, description="Page of items")
    offset: int = Field(0, description="Current page offset")
    limit: int = Field(100, description="Page size")
