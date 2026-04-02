"""
CDISC Config & Sync Control API Router

Provides endpoints for:
1. CDISC Library configuration management (CRUD, test connection)
2. Sync schedule management
3. Sync control (trigger, cancel, retry, progress)
4. Sync history logs
"""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_superuser
from app.core.config import settings
from app.database import get_db_session
from app.models.cdisc_sync import CdiscLibraryConfig, CdiscSyncLog
from app.schemas.cdisc_sync import (
    CdiscConfigResponse,
    CdiscConfigTestResponse,
    CdiscConfigUpdate,
    ScheduleUpdate,
    SyncLogItem,
    SyncLogListResponse,
    SyncProgressResponse,
    SyncTriggerRequest,
    SyncTriggerResponse,
)
from app.services.cdisc_scheduler import cdisc_scheduler
from app.services.cdisc_task_manager import task_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["CDISC Config"])


# ============================================================
# Helpers
# ============================================================


def _mask_api_key(key: str) -> str:
    """Mask API key, showing only last 4 characters."""
    if not key:
        return "****"
    if len(key) > 4:
        return "****" + key[-4:]
    return "****"


def _build_config_response(config: CdiscLibraryConfig) -> CdiscConfigResponse:
    """Build CdiscConfigResponse from a CdiscLibraryConfig ORM object."""
    return CdiscConfigResponse(
        id=config.id,
        api_base_url=config.api_base_url,
        api_key_masked=_mask_api_key(config.api_key),
        enabled_standard_types=config.enabled_standard_types,
        sync_schedule=config.sync_schedule,
        sync_enabled=config.sync_enabled,
        updated_at=config.updated_at,
    )


def _default_config_response() -> CdiscConfigResponse:
    """Build a default response from settings when no DB row exists."""
    from datetime import datetime, timezone

    return CdiscConfigResponse(
        id=1,
        api_base_url=settings.CDISC_API_BASE_URL,
        api_key_masked=_mask_api_key(settings.CDISC_LIBRARY_API_KEY or ""),
        enabled_standard_types=None,
        sync_schedule=None,
        sync_enabled=False,
        updated_at=datetime.now(timezone.utc),
    )


# ============================================================
# Config Endpoints
# ============================================================


@router.get(
    "/cdisc-config",
    response_model=CdiscConfigResponse,
    summary="Get CDISC Library configuration",
    description="Returns the current CDISC Library API configuration with masked API key.",
)
async def get_cdisc_config(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
) -> CdiscConfigResponse:
    """Get CDISC Library configuration. Returns defaults from settings if no row exists."""
    result = await db.execute(
        select(CdiscLibraryConfig).where(CdiscLibraryConfig.id == 1)
    )
    config = result.scalar_one_or_none()
    if config is None:
        return _default_config_response()
    return _build_config_response(config)


@router.put(
    "/cdisc-config",
    response_model=CdiscConfigResponse,
    summary="Update CDISC Library configuration",
    description="Upsert CDISC Library API configuration. Updates non-None fields.",
)
async def update_cdisc_config(
    body: CdiscConfigUpdate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
) -> CdiscConfigResponse:
    """Upsert CDISC Library configuration row (id=1)."""
    result = await db.execute(
        select(CdiscLibraryConfig).where(CdiscLibraryConfig.id == 1)
    )
    config = result.scalar_one_or_none()

    if config is None:
        # Create new row with defaults
        config = CdiscLibraryConfig(
            id=1,
            api_base_url=body.api_base_url or settings.CDISC_API_BASE_URL,
            api_key=body.api_key or "",
            enabled_standard_types=body.enabled_standard_types,
        )
        db.add(config)
    else:
        # Update only non-None fields
        update_data = body.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(config, field, value)

    config.updated_by = user.username
    await db.flush()
    await db.refresh(config)
    return _build_config_response(config)


@router.post(
    "/cdisc-config/test-connection",
    response_model=CdiscConfigTestResponse,
    summary="Test CDISC Library API connection",
    description="Tests the CDISC Library API connection using DB config (fallback to env vars).",
)
async def test_cdisc_connection(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
) -> CdiscConfigTestResponse:
    """Test connection to CDISC Library API."""
    import httpx

    # Read config from DB, fallback to env
    result = await db.execute(
        select(CdiscLibraryConfig).where(CdiscLibraryConfig.id == 1)
    )
    config = result.scalar_one_or_none()

    if config and config.api_key:
        base_url = config.api_base_url
        api_key = config.api_key
    else:
        base_url = settings.CDISC_API_BASE_URL
        api_key = settings.CDISC_LIBRARY_API_KEY

    if not api_key:
        return CdiscConfigTestResponse(
            status="error",
            message="No API key configured. Please set CDISC_LIBRARY_API_KEY or update configuration.",
        )

    try:
        async with httpx.AsyncClient(
            base_url=base_url,
            headers={
                "api-key": api_key,
                "Accept": "application/json",
            },
            timeout=10.0,
        ) as client:
            response = await client.get("/mdr/products")

            if response.status_code == 200:
                return CdiscConfigTestResponse(
                    status="success",
                    message="CDISC Library API connection successful",
                )
            elif response.status_code == 401:
                return CdiscConfigTestResponse(
                    status="error",
                    message="Invalid API key",
                )
            else:
                return CdiscConfigTestResponse(
                    status="error",
                    message=f"API returned status {response.status_code}",
                )

    except httpx.TimeoutException:
        return CdiscConfigTestResponse(
            status="error",
            message="Connection timeout",
        )
    except Exception as e:
        return CdiscConfigTestResponse(
            status="error",
            message=f"Connection failed: {str(e)}",
        )


# ============================================================
# Schedule Endpoint
# ============================================================


@router.put(
    "/cdisc-config/schedule",
    response_model=CdiscConfigResponse,
    summary="Update sync schedule",
    description="Update the CDISC sync schedule configuration and reschedule the scheduler.",
)
async def update_sync_schedule(
    body: ScheduleUpdate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
) -> CdiscConfigResponse:
    """Update sync schedule and reschedule the scheduler."""
    result = await db.execute(
        select(CdiscLibraryConfig).where(CdiscLibraryConfig.id == 1)
    )
    config = result.scalar_one_or_none()

    if config is None:
        # Create config row with schedule settings
        schedule_config = {
            "type": body.type,
            "interval_hours": body.interval_hours,
            "day_of_week": body.day_of_week,
            "day_of_month": body.day_of_month,
        }
        config = CdiscLibraryConfig(
            id=1,
            api_base_url=settings.CDISC_API_BASE_URL,
            api_key="",
            sync_schedule=schedule_config,
            sync_enabled=body.sync_enabled,
            updated_by=user.username,
        )
        db.add(config)
    else:
        config.sync_schedule = {
            "type": body.type,
            "interval_hours": body.interval_hours,
            "day_of_week": body.day_of_week,
            "day_of_month": body.day_of_month,
        }
        config.sync_enabled = body.sync_enabled
        config.updated_by = user.username

    await db.flush()
    await db.refresh(config)

    # Reschedule the scheduler
    cdisc_scheduler.reschedule(config.sync_schedule, config.sync_enabled)

    return _build_config_response(config)


# ============================================================
# Sync Control Endpoints
# ============================================================


@router.post(
    "/sync/cdisc/trigger",
    response_model=SyncTriggerResponse,
    summary="Trigger a CDISC sync task",
    description="Manually trigger a CDISC standard sync operation.",
)
async def trigger_sync(
    body: SyncTriggerRequest,
    user: CurrentUser,
    _: None = Depends(require_superuser),
) -> SyncTriggerResponse:
    """Trigger a manual CDISC sync task."""
    try:
        task_id = await task_manager.start_sync(
            standard_type=body.standard_type,
            version=body.version,
            triggered_by="manual",
            created_by=user.username,
        )
        return SyncTriggerResponse(
            task_id=task_id,
            message=f"Sync task {task_id} started for {body.standard_type} v{body.version}",
        )
    except Exception as e:
        logger.error(f"Failed to start sync: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start sync: {str(e)}",
        )


@router.post(
    "/sync/cdisc/{task_id}/cancel",
    response_model=SyncTriggerResponse,
    summary="Cancel a running sync task",
    description="Cancel a currently running CDISC sync task.",
)
async def cancel_sync(
    task_id: str,
    user: CurrentUser,
    _: None = Depends(require_superuser),
) -> SyncTriggerResponse:
    """Cancel a running sync task."""
    cancelled = await task_manager.cancel_sync(task_id)
    if not cancelled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found or already completed",
        )
    return SyncTriggerResponse(
        task_id=task_id,
        message=f"Sync task {task_id} cancelled",
    )


@router.post(
    "/sync/cdisc/{task_id}/retry",
    response_model=SyncTriggerResponse,
    summary="Retry a failed sync task",
    description="Retry a previously failed or interrupted sync task.",
)
async def retry_sync(
    task_id: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
) -> SyncTriggerResponse:
    """Retry a sync task by looking up original params from the log."""
    result = await db.execute(
        select(CdiscSyncLog).where(CdiscSyncLog.task_id == task_id)
    )
    log = result.scalar_one_or_none()
    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sync log for task {task_id} not found",
        )

    try:
        new_task_id = await task_manager.start_sync(
            standard_type=log.standard_type,
            version=log.version,
            triggered_by="manual",
            created_by=user.username,
        )
        return SyncTriggerResponse(
            task_id=new_task_id,
            message=f"Retry task {new_task_id} started for {log.standard_type} v{log.version}",
        )
    except Exception as e:
        logger.error(f"Failed to retry sync: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retry sync: {str(e)}",
        )


@router.get(
    "/sync/cdisc/tasks/{task_id}",
    response_model=SyncProgressResponse,
    summary="Get sync task progress",
    description="Get the current progress of a sync task.",
)
async def get_sync_progress(
    task_id: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
) -> SyncProgressResponse:
    """Get sync task progress from DB."""
    result = await db.execute(
        select(CdiscSyncLog).where(CdiscSyncLog.task_id == task_id)
    )
    log = result.scalar_one_or_none()
    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found",
        )
    return SyncProgressResponse(
        task_id=log.task_id,
        standard_type=log.standard_type,
        version=log.version,
        status=log.status,
        progress=log.progress,
    )


# ============================================================
# Sync History Endpoints
# ============================================================


@router.get(
    "/sync/cdisc/logs",
    response_model=SyncLogListResponse,
    summary="Get sync history logs",
    description="Paginated query of CDISC sync history with optional filters.",
)
async def get_sync_logs(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
    status_filter: str | None = Query(None, alias="status", description="Filter by status"),
    standard_type: str | None = Query(None, description="Filter by standard type"),
    offset: int = Query(0, ge=0, description="Page offset"),
    limit: int = Query(20, ge=1, le=100, description="Page size"),
) -> SyncLogListResponse:
    """Paginated query of sync log entries."""
    filters = []
    if status_filter:
        filters.append(CdiscSyncLog.status == status_filter)
    if standard_type:
        filters.append(CdiscSyncLog.standard_type == standard_type)

    # Count query
    count_q = select(func.count()).select_from(CdiscSyncLog)
    if filters:
        count_q = count_q.where(*filters)
    total_result = await db.execute(count_q)
    total = total_result.scalar_one()

    # Data query
    data_q = (
        select(CdiscSyncLog)
        .order_by(CdiscSyncLog.started_at.desc())
        .offset(offset)
        .limit(limit)
    )
    if filters:
        data_q = data_q.where(*filters)

    page_result = await db.execute(data_q)
    items = [SyncLogItem.model_validate(row) for row in page_result.scalars().all()]

    return SyncLogListResponse(
        total=total,
        items=items,
        offset=offset,
        limit=limit,
    )


@router.get(
    "/sync/cdisc/logs/{task_id}",
    response_model=SyncLogItem,
    summary="Get sync log detail",
    description="Get a single sync log entry by task_id.",
)
async def get_sync_log_detail(
    task_id: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
) -> SyncLogItem:
    """Get a single sync log entry by task_id."""
    result = await db.execute(
        select(CdiscSyncLog).where(CdiscSyncLog.task_id == task_id)
    )
    log = result.scalar_one_or_none()
    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sync log for task {task_id} not found",
        )
    return SyncLogItem.model_validate(log)
