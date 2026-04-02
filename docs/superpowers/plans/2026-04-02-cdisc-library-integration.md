# CDISC Library Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CDISC Library configuration, async sync with DB checkpoints, scheduling, and history to the Reference Data page as a top-level tab.

**Architecture:** In-memory async background tasks with DB progress checkpointing. APScheduler for cron-like scheduling. Database-first config with env-var fallback. Frontend adds a top-level "CDISC Library" tab alongside existing "Reference Data" tab.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, APScheduler, httpx, React 18, Ant Design, React Query, Zustand

**Spec:** `docs/superpowers/specs/2026-04-02-cdisc-library-integration-design.md`

---

## File Structure

### Backend — New Files
| File | Responsibility |
|------|---------------|
| `backend/app/models/cdisc_sync.py` | CdiscLibraryConfig + CdiscSyncLog SQLAlchemy models |
| `backend/app/schemas/cdisc_sync.py` | Pydantic schemas for config, sync, log, schedule |
| `backend/app/services/cdisc_task_manager.py` | Background task manager with checkpointing |
| `backend/app/services/cdisc_scheduler.py` | APScheduler integration (start/stop/reschedule) |
| `backend/app/api/routers/cdisc_config.py` | Config + schedule + sync trigger endpoints |
| `backend/alembic/versions/2026-04-02_0001_cdisc_sync_config.py` | Migration for both new tables |

### Backend — Modified Files
| File | Change |
|------|--------|
| `backend/app/models/__init__.py` | Import + re-export new models |
| `backend/app/api/routers/__init__.py` | Import new router |
| `backend/app/main.py` | Register new router, start/stop scheduler in lifespan |
| `backend/app/services/cdisc_sync_service.py` | Accept dynamic config + progress callback |

### Frontend — New Files
| File | Responsibility |
|------|---------------|
| `frontend/src/service/urls/cdisc-sync.ts` | URL constants |
| `frontend/src/service/types/cdisc-sync.d.ts` | TypeScript types |
| `frontend/src/service/api/cdisc-sync.ts` | API service functions |
| `frontend/src/service/hooks/useCdiscSync.ts` | React Query hooks |
| `frontend/src/pages/(base)/system/reference-data/modules/CdiscLibraryTab.tsx` | Main tab container |
| `frontend/src/pages/(base)/system/reference-data/modules/ConfigSection.tsx` | Config panel |
| `frontend/src/pages/(base)/system/reference-data/modules/SyncControlSection.tsx` | Sync control panel |
| `frontend/src/pages/(base)/system/reference-data/modules/ScheduleSection.tsx` | Schedule panel |
| `frontend/src/pages/(base)/system/reference-data/modules/SyncHistorySection.tsx` | History table |

### Frontend — Modified Files
| File | Change |
|------|--------|
| `frontend/src/pages/(base)/system/reference-data/index.tsx` | Wrap in top-level Tabs (Reference Data | CDISC Library) |
| `frontend/src/service/keys/index.ts` | Add CDISC_SYNC query keys |

---

## Task 1: Backend Models + Migration

**Files:**
- Create: `backend/app/models/cdisc_sync.py`
- Create: `backend/alembic/versions/2026-04-02_0001_cdisc_sync_config.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create `backend/app/models/cdisc_sync.py`**

Follow the pattern from `backend/app/models/reference_data.py`. Use `Base`, `TimestampMixin` from `app.models.base`. Use `JSONB` from `app.models.base`.

```python
"""CDISC Library Sync models — config, scheduling, and sync logs."""
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, JSONB as JSONBType


class CdiscLibraryConfig(Base):
    """Single-row CDISC Library configuration (id is always 1)."""

    __tablename__ = "cdisc_library_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    api_base_url: Mapped[str] = mapped_column(
        String(512), nullable=False, default="https://library.cdisc.org/api",
        comment="CDISC Library API base URL",
    )
    api_key: Mapped[str] = mapped_column(
        String(256), nullable=False, default="",
        comment="CDISC Library API key (masked in API responses)",
    )
    enabled_standard_types: Mapped[dict[str, Any] | None] = mapped_column(
        JSONBType, nullable=True, default=None,
        comment='Array of enabled standard types, e.g. ["sdtmig", "adamig", "ct"]',
    )
    sync_schedule: Mapped[dict[str, Any] | None] = mapped_column(
        JSONBType, nullable=True, default=None,
        comment='Schedule config: {"type": "daily", "interval_hours": null, ...}',
    )
    sync_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False,
        comment="Master switch for scheduled sync",
    )
    updated_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False,
    )

    __table_args__ = (
        {"comment": "CDISC Library runtime configuration (single row, id=1)"},
    )


class CdiscSyncLog(Base):
    """Sync history and checkpoint log."""

    __tablename__ = "cdisc_sync_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True,
        comment="UUID identifying the background task",
    )
    standard_type: Mapped[str] = mapped_column(
        String(32), nullable=False, index=True,
        comment="Standard type: sdtmig, ct, etc.",
    )
    version: Mapped[str] = mapped_column(
        String(64), nullable=False,
        comment="Version: 3-4, all, latest, etc.",
    )
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="pending", index=True,
        comment="pending, running, completed, failed, interrupted",
    )
    progress: Mapped[dict[str, Any] | None] = mapped_column(
        JSONBType, nullable=True, default=None,
        comment='Checkpoint: {"current_step": "...", "completed": 5, "total": 20}',
    )
    result_summary: Mapped[dict[str, Any] | None] = mapped_column(
        JSONBType, nullable=True, default=None,
        comment="Final counts after sync completes",
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
    triggered_by: Mapped[str] = mapped_column(
        String(16), nullable=False, default="manual",
        comment="manual or scheduled",
    )
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_cdisc_sync_log_status_started", "status", "started_at"),
        {"comment": "CDISC sync history with progress checkpoints"},
    )
```

- [ ] **Step 2: Register models in `backend/app/models/__init__.py`**

Add imports for `CdiscLibraryConfig` and `CdiscSyncLog` and add them to `__all__`.

- [ ] **Step 3: Generate migration**

Run: `cd backend && alembic revision --autogenerate -m "cdisc_sync_config"`

Verify the generated migration creates both `cdisc_library_config` and `cdisc_sync_log` tables.

- [ ] **Step 4: Apply migration**

Run: `cd backend && alembic upgrade head`

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/cdisc_sync.py backend/app/models/__init__.py backend/alembic/versions/
git commit -m "feat: add CdiscLibraryConfig and CdiscSyncLog models + migration"
```

---

## Task 2: Pydantic Schemas

**Files:**
- Create: `backend/app/schemas/cdisc_sync.py`

- [ ] **Step 1: Create schemas**

Follow the pattern from `backend/app/schemas/reference_data.py`. Use `BaseSchema` from `app.schemas.base`.

```python
"""Pydantic schemas for CDISC Library Config and Sync."""
from datetime import datetime
from typing import Any

from pydantic import Field

from app.schemas.base import BaseSchema


# --- Config ---

class CdiscConfigResponse(BaseSchema):
    id: int = 1
    api_base_url: str
    api_key_masked: str = Field(..., description="API key with only last 4 chars visible")
    enabled_standard_types: list[str] | None = None
    sync_schedule: dict[str, Any] | None = None
    sync_enabled: bool = False
    updated_at: datetime


class CdiscConfigUpdate(BaseSchema):
    api_base_url: str | None = Field(None, max_length=512)
    api_key: str | None = Field(None, max_length=256)
    enabled_standard_types: list[str] | None = None


class CdiscConfigTestResponse(BaseSchema):
    status: str
    message: str


# --- Schedule ---

class ScheduleUpdate(BaseSchema):
    type: str = Field(..., pattern="^(daily|weekly|monthly|custom)$")
    interval_hours: int | None = Field(None, ge=1, le=720, description="Only for custom type")
    day_of_week: str | None = Field(None, description="Only for weekly, e.g. monday")
    day_of_month: int | None = Field(None, ge=1, le=31, description="Only for monthly")
    sync_enabled: bool = False


# --- Sync ---

class SyncTriggerRequest(BaseSchema):
    standard_type: str = Field(..., min_length=1, max_length=32)
    version: str = Field("latest", max_length=64)


class SyncTriggerResponse(BaseSchema):
    task_id: str
    message: str


class SyncProgressResponse(BaseSchema):
    task_id: str
    standard_type: str
    version: str
    status: str
    progress: dict[str, Any] | None = None


# --- Sync Log ---

class SyncLogItem(BaseSchema):
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
    total: int
    items: list[SyncLogItem]
    offset: int
    limit: int
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/cdisc_sync.py
git commit -m "feat: add Pydantic schemas for CDISC sync config and logs"
```

---

## Task 3: Background Task Manager + Scheduler

**Files:**
- Create: `backend/app/services/cdisc_task_manager.py`
- Create: `backend/app/services/cdisc_scheduler.py`

- [ ] **Step 1: Create `cdisc_task_manager.py`**

This is the core component. It manages in-memory task state and writes checkpoints to `cdisc_sync_log`.

```python
"""CDISC Background Task Manager — async tasks with DB checkpointing."""
import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Coroutine

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.cdisc_sync import CdiscSyncLog
from app.schemas.cdisc_sync import SyncProgressResponse

logger = logging.getLogger(__name__)


class CDISCBackgroundTaskManager:
    """Manages in-memory background CDISC sync tasks with DB checkpoints."""

    def __init__(self) -> None:
        self._tasks: dict[str, asyncio.Task] = {}
        self._cancel_flags: dict[str, bool] = {}

    async def start_sync(
        self,
        standard_type: str,
        version: str,
        triggered_by: str,
        created_by: str,
    ) -> str:
        """Create a sync log row, spawn background task, return task_id."""
        task_id = str(uuid.uuid4())[:8]

        async with async_session_factory() as session:
            log = CdiscSyncLog(
                task_id=task_id,
                standard_type=standard_type,
                version=version,
                status="running",
                started_at=datetime.now(timezone.utc),
                triggered_by=triggered_by,
                created_by=created_by,
                progress={"current_step": "Initializing", "completed": 0, "total": 0, "percentage": 0},
            )
            session.add(log)
            await session.commit()

        self._cancel_flags[task_id] = False
        task = asyncio.create_task(
            self._run_sync(task_id, standard_type, version)
        )
        self._tasks[task_id] = task
        task.add_done_callback(lambda _: self._cleanup(task_id))

        return task_id

    async def _run_sync(self, task_id: str, standard_type: str, version: str) -> None:
        """Execute the sync service with checkpointing."""
        try:
            from app.services.cdisc_sync_service import CDISCSyncService

            async with async_session_factory() as session:
                # Get dynamic config
                config = await self._get_config(session)

            service = CDISCSyncService(
                base_url=config["api_base_url"],
                api_key=config["api_key"],
                progress_callback=lambda p: asyncio.ensure_future(
                    self._update_checkpoint(task_id, p)
                ),
                cancel_check=lambda: self._cancel_flags.get(task_id, False),
            )

            async with async_session_factory() as session:
                result = await service.sync(session, standard_type, version)

            await self._mark_completed(task_id, result)

        except asyncio.CancelledError:
            await self._update_status(task_id, "interrupted")
            logger.info(f"Sync task {task_id} was cancelled")
        except Exception as e:
            logger.error(f"Sync task {task_id} failed: {e}")
            await self._mark_failed(task_id, str(e))

    async def _get_config(self, session: AsyncSession) -> dict[str, str]:
        """Read config from DB, fall back to env vars."""
        from app.models.cdisc_sync import CdiscLibraryConfig
        from app.core.config import settings

        result = await session.execute(
            select(CdiscLibraryConfig).where(CdiscLibraryConfig.id == 1)
        )
        row = result.scalar_one_or_none()
        if row and row.api_key:
            return {"api_base_url": row.api_base_url, "api_key": row.api_key}
        return {
            "api_base_url": settings.CDISC_API_BASE_URL,
            "api_key": settings.CDISC_LIBRARY_API_KEY,
        }

    async def _update_checkpoint(self, task_id: str, progress: dict[str, Any]) -> None:
        """Write progress checkpoint to DB."""
        try:
            async with async_session_factory() as session:
                await session.execute(
                    update(CdiscSyncLog)
                    .where(CdiscSyncLog.task_id == task_id)
                    .values(progress=progress)
                )
                await session.commit()
        except Exception as e:
            logger.warning(f"Failed to update checkpoint for {task_id}: {e}")

    async def _update_status(self, task_id: str, status: str) -> None:
        try:
            async with async_session_factory() as session:
                values: dict[str, Any] = {"status": status}
                if status in ("completed", "failed", "interrupted"):
                    values["completed_at"] = datetime.now(timezone.utc)
                await session.execute(
                    update(CdiscSyncLog)
                    .where(CdiscSyncLog.task_id == task_id)
                    .values(**values)
                )
                await session.commit()
        except Exception as e:
            logger.warning(f"Failed to update status for {task_id}: {e}")

    async def _mark_completed(self, task_id: str, result: dict[str, Any]) -> None:
        try:
            async with async_session_factory() as session:
                await session.execute(
                    update(CdiscSyncLog)
                    .where(CdiscSyncLog.task_id == task_id)
                    .values(
                        status="completed",
                        completed_at=datetime.now(timezone.utc),
                        result_summary=result,
                        progress={"current_step": "Completed", "percentage": 100},
                    )
                )
                await session.commit()
        except Exception as e:
            logger.warning(f"Failed to mark {task_id} completed: {e}")

    async def _mark_failed(self, task_id: str, error: str) -> None:
        try:
            async with async_session_factory() as session:
                await session.execute(
                    update(CdiscSyncLog)
                    .where(CdiscSyncLog.task_id == task_id)
                    .values(
                        status="failed",
                        completed_at=datetime.now(timezone.utc),
                        error_message=error[:2000],
                    )
                )
                await session.commit()
        except Exception as e:
            logger.warning(f"Failed to mark {task_id} failed: {e}")

    def _cleanup(self, task_id: str) -> None:
        self._tasks.pop(task_id, None)
        self._cancel_flags.pop(task_id, None)

    async def cancel_sync(self, task_id: str) -> bool:
        if task_id not in self._tasks:
            return False
        self._cancel_flags[task_id] = True
        self._tasks[task_id].cancel()
        return True

    def get_progress(self, task_id: str) -> SyncProgressResponse | None:
        """Get in-memory progress. Falls back to DB for non-running tasks."""
        if task_id in self._tasks and not self._tasks[task_id].done():
            return None  # Caller should query DB for latest checkpoint
        return None

    def is_running(self, task_id: str) -> bool:
        return task_id in self._tasks and not self._tasks[task_id].done()

    def get_active_tasks(self) -> list[str]:
        return [tid for tid, t in self._tasks.items() if not t.done()]


# Singleton instance
task_manager = CDISCBackgroundTaskManager()
```

- [ ] **Step 2: Create `cdisc_scheduler.py`**

```python
"""CDISC Sync Scheduler — APScheduler integration."""
import logging
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.database import async_session_factory
from app.models.cdisc_sync import CdiscLibraryConfig
from app.services.cdisc_task_manager import task_manager

logger = logging.getLogger(__name__)


class CDISCScheduler:
    """Manages scheduled CDISC sync using APScheduler."""

    def __init__(self) -> None:
        self._scheduler = AsyncIOScheduler()
        self._job_id = "cdisc_scheduled_sync"

    def start(self) -> None:
        """Start scheduler and register initial job from DB config."""
        self._scheduler.start()
        logger.info("CDISC scheduler started")
        self._schedule_from_config()

    def stop(self) -> None:
        self._scheduler.shutdown(wait=False)
        logger.info("CDISC scheduler stopped")

    def reschedule(self, schedule_config: dict[str, Any] | None, enabled: bool) -> None:
        """Reschedule based on new config."""
        self._scheduler.remove_all_jobs()
        if not enabled or not schedule_config:
            logger.info("Scheduled sync disabled")
            return
        self._add_job(schedule_config)

    def _schedule_from_config(self) -> None:
        """Read DB config and register job on startup."""
        import asyncio

        async def _load() -> None:
            async with async_session_factory() as session:
                from sqlalchemy import select
                result = await session.execute(
                    select(CdiscLibraryConfig).where(CdiscLibraryConfig.id == 1)
                )
                config = result.scalar_one_or_none()
            if config and config.sync_enabled and config.sync_schedule:
                self._add_job(config.sync_schedule)
                logger.info(f"Scheduled sync loaded: {config.sync_schedule}")

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(_load())
            else:
                loop.run_until_complete(_load())
        except Exception as e:
            logger.warning(f"Failed to load schedule config: {e}")

    def _add_job(self, schedule_config: dict[str, Any]) -> None:
        sched_type = schedule_config.get("type", "daily")
        trigger = self._build_trigger(sched_type, schedule_config)
        self._scheduler.add_job(
            self._run_scheduled_sync,
            trigger=trigger,
            id=self._job_id,
            replace_existing=True,
        )
        logger.info(f"Sync job scheduled: {sched_type}")

    def _build_trigger(self, sched_type: str, config: dict[str, Any]):
        if sched_type == "daily":
            return CronTrigger(hour=2, minute=0)  # 2 AM daily
        elif sched_type == "weekly":
            day = config.get("day_of_week", "monday")
            return CronTrigger(day_of_week=day, hour=2, minute=0)
        elif sched_type == "monthly":
            day = config.get("day_of_month", 1)
            return CronTrigger(day=day, hour=2, minute=0)
        elif sched_type == "custom":
            hours = config.get("interval_hours", 6)
            return IntervalTrigger(hours=hours)
        return CronTrigger(hour=2, minute=0)

    async def _run_scheduled_sync(self) -> None:
        """Execute scheduled sync for all enabled standard types."""
        async with async_session_factory() as session:
            from sqlalchemy import select
            result = await session.execute(
                select(CdiscLibraryConfig).where(CdiscLibraryConfig.id == 1)
            )
            config = result.scalar_one_or_none()

        if not config or not config.sync_enabled:
            return

        types = config.enabled_standard_types or []
        for std_type in types:
            try:
                task_id = await task_manager.start_sync(
                    standard_type=std_type,
                    version="latest",
                    triggered_by="scheduled",
                    created_by="scheduler",
                )
                logger.info(f"Scheduled sync started: {std_type} (task {task_id})")
            except Exception as e:
                logger.error(f"Scheduled sync failed for {std_type}: {e}")


# Singleton instance
cdisc_scheduler = CDISCScheduler()
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/cdisc_task_manager.py backend/app/services/cdisc_scheduler.py
git commit -m "feat: add CDISC background task manager and APScheduler integration"
```

---

## Task 4: Modify CDISCSyncService for Dynamic Config + Progress Callback

**Files:**
- Modify: `backend/app/services/cdisc_sync_service.py`

- [ ] **Step 1: Update `CDISCSyncService.__init__` to accept dynamic config and callbacks**

In `cdisc_sync_service.py`, modify the `__init__` method and add cancel check support:

```python
def __init__(
    self,
    base_url: str | None = None,
    api_key: str | None = None,
    progress_callback: Any = None,
    cancel_check: Any = None,
):
    from app.core.config import settings
    self.base_url = base_url or settings.CDISC_API_BASE_URL
    self.api_key = api_key or settings.CDISC_LIBRARY_API_KEY
    self.headers = {
        "api-key": self.api_key,
        "Accept": "application/json",
    }
    self._client: httpx.AsyncClient | None = None
    self._progress_callback = progress_callback
    self._cancel_check = cancel_check
```

- [ ] **Step 2: Add `_report_progress` and `_check_cancelled` helper methods**

```python
async def _report_progress(self, current_step: str, completed: int, total: int) -> None:
    """Report progress via callback."""
    if self._progress_callback:
        pct = int((completed / total) * 100) if total > 0 else 0
        await self._progress_callback({
            "current_step": current_step,
            "completed": completed,
            "total": total,
            "percentage": pct,
        })

def _check_cancelled(self) -> bool:
    """Check if the task has been cancelled."""
    if self._cancel_check and self._cancel_check():
        raise asyncio.CancelledError("Sync cancelled by user")
    return False
```

- [ ] **Step 3: Add `_report_progress` calls to key sync methods**

In `_sync_sdtmig`, `_sync_ct`, `_sync_adamig`, etc., add progress reporting at the dataset level. For example in `_sync_sdtmig` after upserting each domain:

```python
# After each domain is processed:
await self._report_progress(
    f"Processing domain {domain_name}",
    domain_idx + 1,
    len(datasets),
)
self._check_cancelled()
```

Do this for: `_sync_sdtm_model`, `_sync_sdtmig`, `_sync_adam_model`, `_sync_adamig`, `_sync_cdashig`, `_sync_sendig`, `_sync_qrs`, `_sync_ct`, `_sync_bc`, `_sync_tig`.

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/cdisc_sync_service.py
git commit -m "feat: add dynamic config, progress callback, and cancel check to CDISCSyncService"
```

---

## Task 5: Backend API Router

**Files:**
- Create: `backend/app/api/routers/cdisc_config.py`
- Modify: `backend/app/api/routers/__init__.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create `cdisc_config.py` router**

All endpoints require superuser. Follow the pattern from `backend/app/api/routers/admin_sync.py` and `backend/app/api/routers/reference_data.py`.

Key endpoints:
1. `GET /cdisc-config` — returns config with masked API key
2. `PUT /cdisc-config` — upserts config row (id=1)
3. `POST /cdisc-config/test-connection` — uses current config to hit `/mdr/products`
4. `PUT /cdisc-config/schedule` — updates schedule + reschedules APScheduler
5. `POST /sync/cdisc/trigger` — starts async sync via task_manager
6. `POST /sync/cdisc/{task_id}/cancel` — cancels running task
7. `POST /sync/cdisc/{task_id}/retry` — reads last checkpoint, starts new sync
8. `GET /sync/cdisc/tasks/{task_id}` — reads from cdisc_sync_log for progress
9. `GET /sync/cdisc/logs` — paginated history list
10. `GET /sync/cdisc/logs/{task_id}` — single log detail

Use `require_superuser` from `app.api.deps` for all endpoints. Use `CurrentUser` for audit `created_by`.

For the retry endpoint, query the `cdisc_sync_log` row by `task_id`, extract `standard_type` and `version`, then call `task_manager.start_sync()`.

For the test-connection endpoint, read config from DB (fallback to env), use `httpx.AsyncClient` to GET `/mdr/products`, return success/failure.

- [ ] **Step 2: Register router in `__init__.py`**

Add to `backend/app/api/routers/__init__.py`:
```python
from app.api.routers.cdisc_config import router as cdisc_config_router
```
Add `"cdisc_config_router"` to `__all__`.

- [ ] **Step 3: Register router + scheduler in `main.py`**

Add import and `app.include_router(cdisc_config_router, prefix="/api/v1")`.

In the `lifespan` function, start the scheduler on startup and stop on shutdown:
```python
# In lifespan, after audit listener registration:
from app.services.cdisc_scheduler import cdisc_scheduler
cdisc_scheduler.start()
print("CDISC scheduler started")

# In shutdown section:
cdisc_scheduler.stop()
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/routers/cdisc_config.py backend/app/api/routers/__init__.py backend/app/main.py
git commit -m "feat: add CDISC config/sync API router and scheduler lifecycle"
```

---

## Task 6: Frontend Types, URLs, and API Service

**Files:**
- Create: `frontend/src/service/urls/cdisc-sync.ts`
- Create: `frontend/src/service/types/cdisc-sync.d.ts`
- Create: `frontend/src/service/api/cdisc-sync.ts`
- Modify: `frontend/src/service/keys/index.ts`

- [ ] **Step 1: Create URL constants**

`frontend/src/service/urls/cdisc-sync.ts`:
```typescript
export const CDISC_SYNC_URLS = {
  CONFIG: '/api/v1/admin/cdisc-config',
  TEST_CONNECTION: '/api/v1/admin/cdisc-config/test-connection',
  SCHEDULE: '/api/v1/admin/cdisc-config/schedule',
  TRIGGER: '/api/v1/admin/sync/cdisc/trigger',
  CANCEL: (taskId: string) => `/api/v1/admin/sync/cdisc/${taskId}/cancel`,
  RETRY: (taskId: string) => `/api/v1/admin/sync/cdisc/${taskId}/retry`,
  TASK_STATUS: (taskId: string) => `/api/v1/admin/sync/cdisc/tasks/${taskId}`,
  LOGS: '/api/v1/admin/sync/cdisc/logs',
  LOG_DETAIL: (taskId: string) => `/api/v1/admin/sync/cdisc/logs/${taskId}`,
} as const;
```

- [ ] **Step 2: Create TypeScript types**

`frontend/src/service/types/cdisc-sync.d.ts` — declare types for config, sync trigger, progress, log items, schedule, matching the Pydantic schemas exactly.

- [ ] **Step 3: Create API service functions**

`frontend/src/service/api/cdisc-sync.ts` — use `rbacRequest` (same as reference-data). Functions for each endpoint: `fetchCdiscConfig`, `updateCdiscConfig`, `testCdiscConnection`, `updateSchedule`, `triggerSync`, `cancelSync`, `retrySync`, `fetchTaskStatus`, `fetchSyncLogs`, `fetchSyncLogDetail`.

- [ ] **Step 4: Add query keys**

In `frontend/src/service/keys/index.ts`, add:
```typescript
CDISC_SYNC: {
  CONFIG: ['cdiscSync', 'config'] as const,
  SYNC_LOGS: (params?: { status?: string; standard_type?: string }) =>
    ['cdiscSync', 'logs', params] as const,
  TASK_STATUS: (taskId: string) => ['cdiscSync', 'taskStatus', taskId] as const,
},
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/service/urls/cdisc-sync.ts frontend/src/service/types/cdisc-sync.d.ts frontend/src/service/api/cdisc-sync.ts frontend/src/service/keys/index.ts
git commit -m "feat: add CDISC sync frontend types, URLs, API service, and query keys"
```

---

## Task 7: Frontend React Query Hooks

**Files:**
- Create: `frontend/src/service/hooks/useCdiscSync.ts`

- [ ] **Step 1: Create hooks**

Follow the pattern from `useReferenceData.ts`. Key hooks:

- `useCdiscConfig()` — query for config
- `useUpdateCdiscConfig()` — mutation for config update
- `useTestCdiscConnection()` — mutation for test
- `useUpdateSchedule()` — mutation for schedule
- `useTriggerSync()` — mutation to trigger async sync
- `useCancelSync()` — mutation to cancel
- `useRetrySync()` — mutation to retry
- `useSyncLogs(params)` — paginated query for history
- `useSyncLogDetail(taskId)` — single log detail
- `useTaskPolling(taskId, enabled)` — polling hook that queries task status every 3 seconds while running

The polling hook should use `refetchInterval` from React Query:
```typescript
export function useTaskPolling(taskId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.CDISC_SYNC.TASK_STATUS(taskId!),
    queryFn: () => fetchTaskStatus(taskId!),
    enabled: !!taskId,
    refetchInterval: query => {
      const status = query.state.data?.status;
      return status === 'running' || status === 'pending' ? 3000 : false;
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/service/hooks/useCdiscSync.ts
git commit -m "feat: add CDISC sync React Query hooks with task polling"
```

---

## Task 8: Frontend CDISC Library Tab UI

**Files:**
- Create: `frontend/src/pages/(base)/system/reference-data/modules/ConfigSection.tsx`
- Create: `frontend/src/pages/(base)/system/reference-data/modules/SyncControlSection.tsx`
- Create: `frontend/src/pages/(base)/system/reference-data/modules/ScheduleSection.tsx`
- Create: `frontend/src/pages/(base)/system/reference-data/modules/SyncHistorySection.tsx`
- Create: `frontend/src/pages/(base)/system/reference-data/modules/CdiscLibraryTab.tsx`

- [ ] **Step 1: Create `ConfigSection.tsx`**

Ant Design Card with:
- `Input` for API Base URL (prefilled from config)
- `Input.Password` for API Key (shows masked value from `api_key_masked`)
- Checkbox group for enabled standard types (all 11 types)
- "Test Connection" button with loading state, shows success badge or error message
- "Save Configuration" button using `useUpdateCdiscConfig` mutation
- Superuser guard — only render if `isSuperuser` is true, otherwise show read-only view

- [ ] **Step 2: Create `SyncControlSection.tsx`**

Ant Design Card with:
- Select dropdown for standard type (11 options)
- Input for version (default "latest", placeholder like "3-4, all, latest")
- "Sync Now" button — triggers `useTriggerSync`, gets back `task_id`
- Active sync panel: only visible when a task is running
  - Uses `useTaskPolling(taskId)` to poll progress
  - Ant Design `Progress` bar with percentage from checkpoint
  - Text showing `current_step`
  - "Cancel" button
- "Retry Last Failed" button — queries logs for last failed/interrupted and offers retry

- [ ] **Step 3: Create `ScheduleSection.tsx`**

Ant Design Card with:
- Radio group: Daily / Weekly / Monthly / Custom
- Conditional inputs:
  - Weekly: Select for day of week
  - Monthly: InputNumber for day of month
  - Custom: InputNumber for interval hours
- Switch for "Enable Scheduled Sync"
- "Save Schedule" button using `useUpdateSchedule` mutation
- Superuser guard

- [ ] **Step 4: Create `SyncHistorySection.tsx`**

Ant Design `Table` with:
- Columns: Standard Type, Version, Status (color-coded Tag), Progress (Progress bar if running), Triggered By, Started At, Completed At, Duration (computed)
- Expandable row showing `result_summary` JSON and `error_message`
- Toolbar filters: status dropdown, standard type dropdown, date range picker
- Pagination
- "Retry" button on rows with status `failed` or `interrupted`
- Uses `useSyncLogs` hook with filter params

- [ ] **Step 5: Create `CdiscLibraryTab.tsx`**

Container component that composes the 4 sections:
```tsx
const CdiscLibraryTab: React.FC = () => {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <ConfigSection />
      <SyncControlSection activeTaskId={activeTaskId} onSyncStart={setActiveTaskId} />
      <ScheduleSection />
      <SyncHistorySection onRetry={(taskId) => setActiveTaskId(taskId)} />
    </Space>
  );
};
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/\(base\)/system/reference-data/modules/
git commit -m "feat: add CDISC Library tab UI components (config, sync, schedule, history)"
```

---

## Task 9: Integrate CDISC Library Tab into Reference Data Page

**Files:**
- Modify: `frontend/src/pages/(base)/system/reference-data/index.tsx`

- [ ] **Step 1: Add top-level Tabs**

Wrap the existing content in a top-level Ant Design `Tabs` with two items:

```tsx
import CdiscLibraryTab from './modules/CdiscLibraryTab';

// Inside the component:
const [mainTab, setMainTab] = useState<string>('reference-data');

return (
  <Card>
    {contextHolder}
    <Tabs
      activeKey={mainTab}
      onChange={setMainTab}
      items={[
        {
          key: 'reference-data',
          label: 'Reference Data',
          children: (
            <>
              {/* existing Tabs for categories */}
              {/* existing toolbar */}
              {/* existing Table */}
              {/* existing Modal */}
            </>
          ),
        },
        {
          key: 'cdisc-library',
          label: 'CDISC Library',
          children: isSuperuser ? <CdiscLibraryTab /> : <Result status="403" title="Super Admin only" />,
        },
      ]}
    />
  </Card>
);
```

The existing category Tabs, Table, Modal all move inside the first tab's `children`.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/\(base\)/system/reference-data/index.tsx
git commit -m "feat: add CDISC Library top-level tab to reference data page"
```

---

## Task 10: Integration Testing + Polish

**Files:**
- All files from Tasks 1-9

- [ ] **Step 1: Run TypeScript check**

Run: `cd frontend && pnpm tsc --noEmit --skipLibCheck`

Fix any type errors.

- [ ] **Step 2: Run backend startup check**

Run: `cd backend && python -c "from app.main import app; print('OK')"`

Verify no import errors.

- [ ] **Step 3: Manual integration test**

1. Start backend: `cd backend && uvicorn app.main:app --reload --port 8080`
2. Start frontend: `cd frontend && pnpm dev`
3. Navigate to Reference Data page
4. Verify two top-level tabs appear
5. On CDISC Library tab:
   - Save config with URL + API key
   - Test connection (should succeed if key is valid)
   - Trigger a small sync (e.g., CT latest)
   - Verify progress updates in UI
   - Cancel the sync mid-way
   - Check sync history table shows the interrupted entry
   - Retry the sync
6. Configure a schedule and verify it's saved

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: polish CDISC Library integration after integration testing"
```
