"""Pydantic schemas for CDISC Library Config and Sync."""
from datetime import datetime
from typing import Any

from pydantic import Field

from app.schemas.base import BaseSchema


# --- Config ---


class CdiscConfigResponse(BaseSchema):
    """CDISC Library configuration response with masked API key."""

    id: int = 1
    api_base_url: str
    api_key_masked: str = Field(
        ..., description="API key with only last 4 chars visible"
    )
    enabled_standard_types: list[str] | None = None
    sync_schedule: dict[str, Any] | None = None
    sync_enabled: bool = False
    updated_at: datetime


class CdiscConfigUpdate(BaseSchema):
    """Update CDISC Library configuration."""

    api_base_url: str | None = Field(None, max_length=512)
    api_key: str | None = Field(None, max_length=256)
    enabled_standard_types: list[str] | None = None


class CdiscConfigTestResponse(BaseSchema):
    """Test connection result."""

    status: str
    message: str


# --- Schedule ---


class ScheduleUpdate(BaseSchema):
    """Update sync schedule configuration."""

    type: str = Field(..., pattern=r"^(daily|weekly|monthly|custom)$")
    interval_hours: int | None = Field(
        None, ge=1, le=720, description="Only for custom type"
    )
    day_of_week: str | None = Field(
        None, description="Only for weekly, e.g. monday"
    )
    day_of_month: int | None = Field(
        None, ge=1, le=31, description="Only for monthly"
    )
    sync_enabled: bool = False


# --- Sync ---


class SyncTriggerRequest(BaseSchema):
    """Request to trigger a sync operation."""

    standard_type: str = Field(..., min_length=1, max_length=32)
    version: str = Field("latest", max_length=64)


class SyncTriggerResponse(BaseSchema):
    """Response after triggering a sync operation."""

    task_id: str
    message: str


class SyncProgressResponse(BaseSchema):
    """Current progress of a sync task."""

    task_id: str
    standard_type: str
    version: str
    status: str
    progress: dict[str, Any] | None = None


# --- Sync Log ---


class SyncLogItem(BaseSchema):
    """Single sync log entry."""

    id: int
    task_id: str
    standard_type: str
    version: str
    status: str
    progress: dict[str, Any] | None = None
    result_summary: dict[str, Any] | None = None
    started_at: datetime | None
    completed_at: datetime | None
    triggered_by: str
    created_by: str | None
    error_message: str | None


class SyncLogListResponse(BaseSchema):
    """Paginated list of sync log entries."""

    total: int
    items: list[SyncLogItem]
    offset: int
    limit: int
