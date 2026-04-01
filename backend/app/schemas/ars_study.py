"""
ARS Study-Level Pydantic Schemas

Study Defaults, Statistics Sets, Study Templates, Clone, PR propagation.
"""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# Base
# ============================================================

class BaseSchema(BaseModel):
    """Pydantic v2 base config"""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        use_enum_values=True,
    )


# ============================================================
# Statistics Item
# ============================================================

class StatisticsItemCreate(BaseSchema):
    """Create a statistics item within a set"""

    stat_type: str = Field(..., max_length=30, description="n / mean / sd / median / min / max / range / n_percent / header")
    label: str = Field(..., max_length=100, description="Display label")
    format: str | None = Field(None, max_length=50, description="Format template e.g. XX.X (X.XX)")
    sort_order: int = Field(default=0, ge=0, description="Sort order")


class StatisticsItemRead(StatisticsItemCreate):
    """Statistics item response"""

    id: int
    statistics_set_id: int
    created_at: datetime
    updated_at: datetime


# ============================================================
# Statistics Set
# ============================================================

class StatisticsSetCreate(BaseSchema):
    """Create a statistics set"""

    name: str = Field(..., min_length=1, max_length=200, description="Set name")
    stats: list[StatisticsItemCreate] = Field(default_factory=list, description="Statistics items")
    created_by: str = Field(..., max_length=100, description="Creator user ID")


class StatisticsSetRead(BaseSchema):
    """Statistics set response"""

    id: int
    scope_node_id: int
    name: str
    stats: list[StatisticsItemRead] = Field(default_factory=list)
    created_by: str
    updated_by: str | None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


class StatisticsSetUpdate(BaseSchema):
    """Partial update for statistics set"""

    name: str | None = Field(None, max_length=200, description="Set name")
    stats: list[StatisticsItemCreate] | None = Field(None, description="Replace all statistics items")
    updated_by: str = Field(..., max_length=100, description="Updater user ID")


# ============================================================
# Study Defaults
# ============================================================

class StudyDefaultsUpdate(BaseSchema):
    """Upsert study defaults"""

    decimal_rules: dict[str, Any] | None = Field(
        None,
        description='{"n":0, "mean":2, "sd":3, "percent":2}',
    )
    default_statistics_set_id: int | None = Field(None, description="Default statistics set ID")
    header_style: dict[str, Any] | None = Field(None, description="Default header style")
    updated_by: str = Field(..., max_length=100, description="Updater user ID")


class StudyDefaultsRead(BaseSchema):
    """Study defaults response"""

    id: int
    scope_node_id: int
    decimal_rules: dict[str, Any]
    default_statistics_set_id: int | None
    header_style: dict[str, Any] | None
    created_by: str
    updated_by: str | None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


# ============================================================
# Study Template
# ============================================================

class StudyTemplateCreate(BaseSchema):
    """Create a study-level shell template"""

    category: str = Field(..., max_length=50, description="Demographics / Adverse_Events / ...")
    template_name: str = Field(..., min_length=1, max_length=200, description="Template name")
    display_type: str = Field(default="Table", max_length=20, description="Table / Figure / Listing")
    shell_schema: dict[str, Any] = Field(..., description="Full shell definition (TableShell/FigureShell/ListingShell)")
    statistics_set_id: int | None = Field(None, description="Associated statistics set")
    decimal_override: dict[str, Any] | None = Field(None, description="Template-level decimal override")
    created_by: str = Field(..., max_length=100, description="Creator user ID")


class StudyTemplateRead(BaseSchema):
    """Study template response with version"""

    id: int
    scope_node_id: int
    category: str
    template_name: str
    display_type: str
    shell_schema: dict[str, Any]
    statistics_set_id: int | None
    decimal_override: dict[str, Any] | None
    version: int
    created_by: str
    updated_by: str | None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


class StudyTemplateUpdate(BaseSchema):
    """Partial update for study template (increments version)"""

    category: str | None = Field(None, max_length=50)
    template_name: str | None = Field(None, max_length=200)
    display_type: str | None = Field(None, max_length=20)
    shell_schema: dict[str, Any] | None = None
    statistics_set_id: int | None = None
    decimal_override: dict[str, Any] | None = None
    updated_by: str = Field(..., max_length=100, description="Updater user ID")


# ============================================================
# Clone from Template
# ============================================================

class CloneFromTemplateRequest(BaseSchema):
    """Clone a study template into a new ARSDisplay"""

    template_id: int = Field(..., description="Source template ID")
    display_id: str = Field(..., min_length=1, max_length=50, description="New display ID e.g. 'Table 14.1.1'")
    title: str | None = Field(None, max_length=500, description="Override title (defaults to template_name)")
    created_by: str = Field(..., max_length=100, description="Creator user ID")


class CloneFromTemplateResponse(BaseSchema):
    """Response after cloning a template"""

    display_id_int: int = Field(..., description="New ARSDisplay.id (PK)")
    display_id: str = Field(..., description="New display_id string")
    source_template_id: int
    source_template_version: int


# ============================================================
# Propose to Study (PR)
# ============================================================

class ProposeToStudyRequest(BaseSchema):
    """Create a PR to push display changes back to parent scope"""

    title: str = Field(..., min_length=1, max_length=200, description="PR title")
    description: str | None = Field(None, description="PR description")
    target_scope_id: int = Field(..., description="Target scope node ID (e.g. Global/TA)")
    reviewers: list[str] = Field(default_factory=list, description="Reviewer user IDs")
    requester_id: str = Field(..., max_length=100, description="Requester user ID")


class ProposeToStudyResponse(BaseSchema):
    """Response after creating a PR"""

    pr_id: int
    pr_number: str
    status: str
    created_at: datetime


# ============================================================
# Diff Response
# ============================================================

class DiffResponse(BaseSchema):
    """Diff between a display and its source template"""

    added_rows: list[dict[str, Any]] = Field(default_factory=list, description="Rows added in display")
    removed_rows: list[dict[str, Any]] = Field(default_factory=list, description="Rows removed from template")
    modified_rows: list[dict[str, Any]] = Field(default_factory=list, description="Rows modified")
    stats_changed: bool = Field(False, description="Whether statistics set differs")
    decimal_changed: bool = Field(False, description="Whether decimal config differs")
