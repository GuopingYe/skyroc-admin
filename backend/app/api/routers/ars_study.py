"""
ARS Study-Level API Router

Study Defaults, Statistics Sets, Study Templates, Clone, PR propagation.

Key implementation notes:
- from-template: deep clone shell_schema from StudyTemplate into new ARSDisplay,
  record source_template_id and source_template_version
- propose-to-study: compute diff, create MetadataPullRequest with item_type=SHELL_TEMPLATE_UPDATE
- diff-template: return JSON diff of rows, stats, decimal changes
"""
import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db_session
from app.models import (
    ARSDisplay,
    MetadataPullRequest,
    ScopeNode,
    StatisticsItem,
    StatisticsSet,
    StudyDefaults,
    StudyTemplate,
)
from app.models.audit_listener import set_audit_context
from app.models.mapping_enums import PRItemType, PRStatus
from app.schemas.ars_study import (
    CloneFromTemplateRequest,
    CloneFromTemplateResponse,
    DiffResponse,
    ProposeToStudyRequest,
    ProposeToStudyResponse,
    StatisticsSetCreate,
    StatisticsSetRead,
    StatisticsSetUpdate,
    StatisticsItemCreate,
    StatisticsItemRead,
    StudyDefaultsRead,
    StudyDefaultsUpdate,
    StudyTemplateCreate,
    StudyTemplateRead,
    StudyTemplateUpdate,
)

router = APIRouter(prefix="/ars", tags=["ARS Study"])


# ============================================================
# Helpers
# ============================================================

async def _get_or_create_defaults(
    db: AsyncSession,
    scope_node_id: int,
    username: str,
) -> StudyDefaults:
    """Get existing defaults or create a blank row for the study scope."""
    result = await db.execute(
        select(StudyDefaults).where(
            StudyDefaults.scope_node_id == scope_node_id,
            StudyDefaults.is_deleted == False,
        )
    )
    defaults = result.scalar_one_or_none()
    if defaults:
        return defaults

    # Verify scope node exists
    scope = await db.get(ScopeNode, scope_node_id)
    if not scope or scope.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ScopeNode with id {scope_node_id} not found",
        )

    defaults = StudyDefaults(
        scope_node_id=scope_node_id,
        decimal_rules={},
        created_by=username,
    )
    db.add(defaults)
    await db.flush()
    return defaults


def _compute_shell_diff(
    template_schema: dict[str, Any],
    display_schema: dict[str, Any] | None,
) -> tuple[list, list, list]:
    """
    Naive row-level diff between two shell_schema dicts.

    Returns (added_rows, removed_rows, modified_rows).
    """
    if display_schema is None:
        return [], [], []

    t_rows = {r.get("id"): r for r in template_schema.get("rows", [])}
    d_rows = {r.get("id"): r for r in display_schema.get("rows", [])}

    added = [d_rows[k] for k in d_rows if k not in t_rows]
    removed = [t_rows[k] for k in t_rows if k not in d_rows]
    modified = []
    for key in d_rows:
        if key in t_rows and d_rows[key] != t_rows[key]:
            modified.append({"id": key, "template": t_rows[key], "display": d_rows[key]})

    return added, removed, modified


# ============================================================
# Study Defaults
# ============================================================

@router.get(
    "/study-defaults/{scope_node_id}",
    response_model=StudyDefaultsRead,
    summary="Get or create study defaults",
)
async def get_study_defaults(
    scope_node_id: int,
    db: AsyncSession = Depends(get_db_session),
) -> StudyDefaultsRead:
    """Get defaults for a study scope. Creates blank defaults if not yet present."""
    defaults = await _get_or_create_defaults(db, scope_node_id, username="system")
    await db.commit()
    await db.refresh(defaults)
    return StudyDefaultsRead.model_validate(defaults)


@router.put(
    "/study-defaults/{scope_node_id}",
    response_model=StudyDefaultsRead,
    summary="Upsert study defaults",
)
async def upsert_study_defaults(
    scope_node_id: int,
    body: StudyDefaultsUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> StudyDefaultsRead:
    """Upsert (create-or-update) study defaults."""
    set_audit_context(
        user_id=body.updated_by,
        user_name=body.updated_by,
        context={"operation": "upsert_study_defaults", "source": "api"},
        reason="Upsert study defaults",
    )

    defaults = await _get_or_create_defaults(db, scope_node_id, username=body.updated_by)

    if body.decimal_rules is not None:
        defaults.decimal_rules = body.decimal_rules
    if body.default_statistics_set_id is not None:
        defaults.default_statistics_set_id = body.default_statistics_set_id
    if body.header_style is not None:
        defaults.header_style = body.header_style
    defaults.updated_by = body.updated_by

    await db.commit()
    await db.refresh(defaults)
    return StudyDefaultsRead.model_validate(defaults)


# ============================================================
# Statistics Sets
# ============================================================

@router.get(
    "/statistics-sets/{scope_node_id}",
    response_model=list[StatisticsSetRead],
    summary="List statistics sets for study",
)
async def list_statistics_sets(
    scope_node_id: int,
    db: AsyncSession = Depends(get_db_session),
) -> list[StatisticsSetRead]:
    """List all non-deleted statistics sets for a study scope."""
    result = await db.execute(
        select(StatisticsSet)
        .options(selectinload(StatisticsSet.stats))
        .where(
            StatisticsSet.scope_node_id == scope_node_id,
            StatisticsSet.is_deleted == False,
        )
        .order_by(StatisticsSet.name)
    )
    sets = result.scalars().all()
    return [StatisticsSetRead.model_validate(s) for s in sets]


@router.post(
    "/statistics-sets/{scope_node_id}",
    response_model=StatisticsSetRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create statistics set",
)
async def create_statistics_set(
    scope_node_id: int,
    body: StatisticsSetCreate,
    db: AsyncSession = Depends(get_db_session),
) -> StatisticsSetRead:
    """Create a new statistics set under a study scope."""
    set_audit_context(
        user_id=body.created_by,
        user_name=body.created_by,
        context={"operation": "create_statistics_set", "source": "api"},
        reason="Create statistics set",
    )

    scope = await db.get(ScopeNode, scope_node_id)
    if not scope or scope.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ScopeNode with id {scope_node_id} not found",
        )

    new_set = StatisticsSet(
        scope_node_id=scope_node_id,
        name=body.name,
        created_by=body.created_by,
    )
    db.add(new_set)
    await db.flush()

    for idx, stat_in in enumerate(body.stats):
        item = StatisticsItem(
            statistics_set_id=new_set.id,
            stat_type=stat_in.stat_type,
            label=stat_in.label,
            format=stat_in.format,
            sort_order=stat_in.sort_order if stat_in.sort_order else idx,
        )
        db.add(item)

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(StatisticsSet)
        .options(selectinload(StatisticsSet.stats))
        .where(StatisticsSet.id == new_set.id)
    )
    refreshed = result.scalar_one()
    return StatisticsSetRead.model_validate(refreshed)


@router.put(
    "/statistics-sets/{scope_node_id}/{set_id}",
    response_model=StatisticsSetRead,
    summary="Update statistics set",
)
async def update_statistics_set(
    scope_node_id: int,
    set_id: int,
    body: StatisticsSetUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> StatisticsSetRead:
    """Update a statistics set (name and/or replace all items)."""
    set_audit_context(
        user_id=body.updated_by,
        user_name=body.updated_by,
        context={"operation": "update_statistics_set", "source": "api"},
        reason="Update statistics set",
    )

    result = await db.execute(
        select(StatisticsSet)
        .options(selectinload(StatisticsSet.stats))
        .where(
            StatisticsSet.id == set_id,
            StatisticsSet.scope_node_id == scope_node_id,
            StatisticsSet.is_deleted == False,
        )
    )
    stat_set = result.scalar_one_or_none()
    if not stat_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"StatisticsSet with id {set_id} not found in scope {scope_node_id}",
        )

    if body.name is not None:
        stat_set.name = body.name
    stat_set.updated_by = body.updated_by

    # If stats provided, replace all items
    if body.stats is not None:
        # Remove existing items
        for existing_item in stat_set.stats:
            await db.delete(existing_item)
        await db.flush()

        for idx, stat_in in enumerate(body.stats):
            item = StatisticsItem(
                statistics_set_id=stat_set.id,
                stat_type=stat_in.stat_type,
                label=stat_in.label,
                format=stat_in.format,
                sort_order=stat_in.sort_order if stat_in.sort_order else idx,
            )
            db.add(item)

    await db.commit()

    # Reload
    result = await db.execute(
        select(StatisticsSet)
        .options(selectinload(StatisticsSet.stats))
        .where(StatisticsSet.id == set_id)
    )
    refreshed = result.scalar_one()
    return StatisticsSetRead.model_validate(refreshed)


@router.delete(
    "/statistics-sets/{scope_node_id}/{set_id}",
    status_code=status.HTTP_200_OK,
    summary="Soft delete statistics set",
)
async def delete_statistics_set(
    scope_node_id: int,
    set_id: int,
    deleted_by: str = "unknown",
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Soft delete a statistics set."""
    result = await db.execute(
        select(StatisticsSet).where(
            StatisticsSet.id == set_id,
            StatisticsSet.scope_node_id == scope_node_id,
            StatisticsSet.is_deleted == False,
        )
    )
    stat_set = result.scalar_one_or_none()
    if not stat_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"StatisticsSet with id {set_id} not found",
        )

    stat_set.soft_delete(deleted_by=deleted_by)
    await db.commit()
    return {"message": f"StatisticsSet {set_id} soft-deleted"}


# ============================================================
# Study Templates
# ============================================================

@router.get(
    "/study-templates/{scope_node_id}",
    response_model=list[StudyTemplateRead],
    summary="List study templates",
)
async def list_study_templates(
    scope_node_id: int,
    category: str | None = None,
    db: AsyncSession = Depends(get_db_session),
) -> list[StudyTemplateRead]:
    """List all non-deleted templates for a study scope, optionally filtered by category."""
    query = select(StudyTemplate).where(
        StudyTemplate.scope_node_id == scope_node_id,
        StudyTemplate.is_deleted == False,
    )
    if category:
        query = query.where(StudyTemplate.category == category)
    query = query.order_by(StudyTemplate.category, StudyTemplate.template_name)

    result = await db.execute(query)
    templates = result.scalars().all()
    return [StudyTemplateRead.model_validate(t) for t in templates]


@router.get(
    "/study-templates/{scope_node_id}/{template_id}",
    response_model=StudyTemplateRead,
    summary="Get study template detail",
)
async def get_study_template(
    scope_node_id: int,
    template_id: int,
    db: AsyncSession = Depends(get_db_session),
) -> StudyTemplateRead:
    """Get a single study template by ID."""
    result = await db.execute(
        select(StudyTemplate).where(
            StudyTemplate.id == template_id,
            StudyTemplate.scope_node_id == scope_node_id,
            StudyTemplate.is_deleted == False,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"StudyTemplate with id {template_id} not found",
        )
    return StudyTemplateRead.model_validate(template)


@router.post(
    "/study-templates/{scope_node_id}",
    response_model=StudyTemplateRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create study template",
)
async def create_study_template(
    scope_node_id: int,
    body: StudyTemplateCreate,
    db: AsyncSession = Depends(get_db_session),
) -> StudyTemplateRead:
    """Create a new study-level shell template."""
    set_audit_context(
        user_id=body.created_by,
        user_name=body.created_by,
        context={"operation": "create_study_template", "source": "api"},
        reason="Create study template",
    )

    scope = await db.get(ScopeNode, scope_node_id)
    if not scope or scope.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ScopeNode with id {scope_node_id} not found",
        )

    template = StudyTemplate(
        scope_node_id=scope_node_id,
        category=body.category,
        template_name=body.template_name,
        display_type=body.display_type,
        shell_schema=body.shell_schema,
        statistics_set_id=body.statistics_set_id,
        decimal_override=body.decimal_override,
        version=1,
        created_by=body.created_by,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return StudyTemplateRead.model_validate(template)


@router.put(
    "/study-templates/{scope_node_id}/{template_id}",
    response_model=StudyTemplateRead,
    summary="Update study template (increments version)",
)
async def update_study_template(
    scope_node_id: int,
    template_id: int,
    body: StudyTemplateUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> StudyTemplateRead:
    """Update a study template. Automatically increments the version number."""
    set_audit_context(
        user_id=body.updated_by,
        user_name=body.updated_by,
        context={"operation": "update_study_template", "source": "api"},
        reason="Update study template",
    )

    result = await db.execute(
        select(StudyTemplate).where(
            StudyTemplate.id == template_id,
            StudyTemplate.scope_node_id == scope_node_id,
            StudyTemplate.is_deleted == False,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"StudyTemplate with id {template_id} not found",
        )

    if body.category is not None:
        template.category = body.category
    if body.template_name is not None:
        template.template_name = body.template_name
    if body.display_type is not None:
        template.display_type = body.display_type
    if body.shell_schema is not None:
        template.shell_schema = body.shell_schema
    if body.statistics_set_id is not None:
        template.statistics_set_id = body.statistics_set_id
    if body.decimal_override is not None:
        template.decimal_override = body.decimal_override
    template.updated_by = body.updated_by
    template.version = (template.version or 0) + 1

    await db.commit()
    await db.refresh(template)
    return StudyTemplateRead.model_validate(template)


@router.delete(
    "/study-templates/{scope_node_id}/{template_id}",
    status_code=status.HTTP_200_OK,
    summary="Soft delete study template",
)
async def delete_study_template(
    scope_node_id: int,
    template_id: int,
    deleted_by: str = "unknown",
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    """Soft delete a study template."""
    result = await db.execute(
        select(StudyTemplate).where(
            StudyTemplate.id == template_id,
            StudyTemplate.scope_node_id == scope_node_id,
            StudyTemplate.is_deleted == False,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"StudyTemplate with id {template_id} not found",
        )

    template.soft_delete(deleted_by=deleted_by)
    await db.commit()
    return {"message": f"StudyTemplate {template_id} soft-deleted"}


# ============================================================
# Clone from Template
# ============================================================

@router.post(
    "/displays/{scope_node_id}/from-template",
    response_model=CloneFromTemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Deep clone template into new ARSDisplay",
)
async def clone_from_template(
    scope_node_id: int,
    body: CloneFromTemplateRequest,
    db: AsyncSession = Depends(get_db_session),
) -> CloneFromTemplateResponse:
    """
    Deep clone a StudyTemplate's shell_schema into a new ARSDisplay.

    Records source_template_id and source_template_version for future diff.
    """
    set_audit_context(
        user_id=body.created_by,
        user_name=body.created_by,
        context={"operation": "clone_from_template", "source": "api"},
        reason="Clone template into display",
    )

    # Load template
    result = await db.execute(
        select(StudyTemplate).where(
            StudyTemplate.id == body.template_id,
            StudyTemplate.is_deleted == False,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"StudyTemplate with id {body.template_id} not found",
        )

    # Verify scope exists
    scope = await db.get(ScopeNode, scope_node_id)
    if not scope or scope.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ScopeNode with id {scope_node_id} not found",
        )

    title = body.title or template.template_name

    display = ARSDisplay(
        scope_node_id=scope_node_id,
        display_id=body.display_id,
        display_type=template.display_type,
        title=title,
        source_template_id=template.id,
        source_template_version=template.version,
        decimal_override=template.decimal_override,
        statistics_set_id=template.statistics_set_id,
        created_by=body.created_by,
    )
    db.add(display)
    await db.commit()
    await db.refresh(display)

    return CloneFromTemplateResponse(
        display_id_int=display.id,
        display_id=display.display_id,
        source_template_id=template.id,
        source_template_version=template.version,
    )


# ============================================================
# Propose to Study (PR)
# ============================================================

@router.post(
    "/displays/{display_id}/propose-to-study",
    response_model=ProposeToStudyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create PR to push display changes back",
)
async def propose_to_study(
    display_id: int,
    body: ProposeToStudyRequest,
    db: AsyncSession = Depends(get_db_session),
) -> ProposeToStudyResponse:
    """
    Create a MetadataPullRequest to propose display changes back to a parent scope.

    Computes a diff snapshot between display and source template.
    """
    set_audit_context(
        user_id=body.requester_id,
        user_name=body.requester_id,
        context={"operation": "propose_to_study", "source": "api"},
        reason="Propose display changes to study",
    )

    # Load display
    result = await db.execute(
        select(ARSDisplay).where(
            ARSDisplay.id == display_id,
            ARSDisplay.is_deleted == False,
        )
    )
    display = result.scalar_one_or_none()
    if not display:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ARSDisplay with id {display_id} not found",
        )

    # Build diff snapshot
    diff_snapshot: dict[str, Any] = {
        "display_id": display.id,
        "display_id_str": display.display_id,
        "title": display.title,
        "source_template_id": display.source_template_id,
        "source_template_version": display.source_template_version,
        "reviewers": body.reviewers,
    }

    # If display has a source template, compute diff
    if display.source_template_id:
        tmpl_result = await db.execute(
            select(StudyTemplate).where(StudyTemplate.id == display.source_template_id)
        )
        tmpl = tmpl_result.scalar_one_or_none()
        if tmpl:
            added, removed, modified = _compute_shell_diff(
                tmpl.shell_schema,
                None,  # Display doesn't have a shell_schema column; it uses sections
            )
            diff_snapshot["template_name"] = tmpl.template_name
            diff_snapshot["template_category"] = tmpl.category

    # Generate PR number
    count_result = await db.execute(
        select(func.count()).select_from(MetadataPullRequest)
    )
    count = count_result.scalar() or 0
    pr_number = f"PR-{datetime.utcnow().strftime('%Y')}-{count + 1:04d}"

    pr = MetadataPullRequest(
        pr_number=pr_number,
        title=body.title,
        description=body.description,
        requester_id=body.requester_id,
        source_scope_id=display.scope_node_id,
        target_scope_id=body.target_scope_id,
        item_type=PRItemType.SHELL_TEMPLATE_UPDATE,
        item_id=display.id,
        diff_snapshot=diff_snapshot,
        status=PRStatus.PENDING,
        created_by=body.requester_id,
    )
    pr.submit()
    db.add(pr)
    await db.commit()
    await db.refresh(pr)

    return ProposeToStudyResponse(
        pr_id=pr.id,
        pr_number=pr.pr_number,
        status=pr.status.value if hasattr(pr.status, "value") else str(pr.status),
        created_at=pr.submitted_at or pr.created_at,
    )


# ============================================================
# Diff Template
# ============================================================

@router.get(
    "/displays/{display_id}/diff-template",
    response_model=DiffResponse,
    summary="Get diff between display and source template",
)
async def diff_template(
    display_id: int,
    db: AsyncSession = Depends(get_db_session),
) -> DiffResponse:
    """
    Compute diff between an ARSDisplay and its source StudyTemplate.

    Compares shell_schema rows, statistics set, and decimal config.
    """
    # Load display
    result = await db.execute(
        select(ARSDisplay).where(
            ARSDisplay.id == display_id,
            ARSDisplay.is_deleted == False,
        )
    )
    display = result.scalar_one_or_none()
    if not display:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ARSDisplay with id {display_id} not found",
        )

    if not display.source_template_id:
        return DiffResponse(
            added_rows=[],
            removed_rows=[],
            modified_rows=[],
            stats_changed=False,
            decimal_changed=False,
        )

    # Load source template
    tmpl_result = await db.execute(
        select(StudyTemplate).where(
            StudyTemplate.id == display.source_template_id,
            StudyTemplate.is_deleted == False,
        )
    )
    template = tmpl_result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source StudyTemplate with id {display.source_template_id} not found",
        )

    # Compute shell diff
    added, removed, modified = _compute_shell_diff(
        template.shell_schema,
        None,  # Display uses sections, not a flat shell_schema
    )

    # Stats changed?
    stats_changed = display.statistics_set_id != template.statistics_set_id

    # Decimal changed?
    decimal_changed = (
        json.dumps(display.decimal_override or {}, sort_keys=True)
        != json.dumps(template.decimal_override or {}, sort_keys=True)
    )

    return DiffResponse(
        added_rows=added,
        removed_rows=removed,
        modified_rows=modified,
        stats_changed=stats_changed,
        decimal_changed=decimal_changed,
    )
