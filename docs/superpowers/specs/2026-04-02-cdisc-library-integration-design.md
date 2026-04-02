# CDISC Library Integration — Design Spec

**Date:** 2026-04-02
**Status:** Approved
**Scope:** Add CDISC Library configuration, sync control, scheduling, and history to the Reference Data page

## 1. Overview

Add a "CDISC Library" top-level tab to the Reference Data page where super admins can:

- Configure CDISC Library API connection (URL + API Key)
- Choose which standard types to sync (11 types: SDTM, SDTMIG, ADaM, ADaMIG, CDASHIG, SENDIG, TIG, QRS, CT, BC)
- Trigger manual syncs or schedule automatic syncs (Daily, Weekly, Monthly, or custom interval)
- View full sync history with status, progress, and error details
- Resume interrupted syncs from the last checkpoint

## 2. Architecture Decision

**Approach 1 + DB Checkpoints:** Lightweight in-memory background tasks with progress checkpointing to the database.

- Sync runs as `asyncio.create_task` inside the FastAPI process
- Progress checkpoints written to `cdisc_sync_log.progress` JSONB after each major step
- If server crashes mid-sync, the log row stays in `running` state with last checkpoint
- Admin can "Retry" to resume from the last checkpoint
- Scheduler uses `APScheduler` (`AsyncIOScheduler`) for cron-like scheduling

### Why not Celery/Redis?

No extra infrastructure needed. The sync is idempotent (upsert pattern), so re-triggering is safe. If the platform grows to need Celery later, the frontend API contract stays the same.

### Why not pure in-memory (no checkpoints)?

Server crash would lose all progress. Checkpoints in DB enable resume without re-processing already-synced data.

## 3. Database Schema

### 3.1 `cdisc_library_config` (single-row config)

| Column | Type | Description |
|--------|------|-------------|
| `id` | int PK | always 1 |
| `api_base_url` | varchar(512) | CDISC Library API URL |
| `api_key` | varchar(256) | API key (masked in API responses) |
| `enabled_standard_types` | JSONB | Array of standard types, e.g. `["sdtmig", "adamig", "ct"]` |
| `sync_schedule` | JSONB | Schedule config (see below) |
| `sync_enabled` | boolean | Master switch for scheduled sync |
| `updated_by` | varchar(64) | Audit trail |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**`sync_schedule` JSONB structure:**

```json
{
  "type": "daily",           // "daily" | "weekly" | "monthly" | "custom"
  "interval_hours": null,    // only for "custom" type, e.g. 6
  "day_of_week": null,       // only for "weekly", e.g. "monday"
  "day_of_month": null       // only for "monthly", e.g. 1
}
```

**Config resolution order:**
1. Read DB row (`id=1`)
2. If no row exists, fall back to env vars (`CDISC_API_BASE_URL`, `CDISC_LIBRARY_API_KEY`)

### 3.2 `cdisc_sync_log` (sync history + checkpoints)

| Column | Type | Description |
|--------|------|-------------|
| `id` | serial PK | |
| `task_id` | varchar(64) | UUID, unique, background task handle |
| `standard_type` | varchar(32) | e.g. `sdtmig`, `ct` |
| `version` | varchar(64) | e.g. `3-4`, `all`, `latest` |
| `status` | varchar(16) | `pending`, `running`, `completed`, `failed`, `interrupted` |
| `progress` | JSONB | Checkpoint data (see below) |
| `result_summary` | JSONB | Final counts (same structure as `CDISCSyncService._init_result()`) |
| `started_at` | timestamp | |
| `completed_at` | timestamp | nullable |
| `triggered_by` | varchar(16) | `manual` or `scheduled` |
| `created_by` | varchar(64) | username who triggered |
| `error_message` | text | Last error if failed |

**`progress` JSONB structure:**

```json
{
  "current_step": "Processing domain DM",
  "completed": 5,
  "total": 20,
  "percentage": 25
}
```

## 4. Backend Architecture

### 4.1 Background Task Manager

A `CDISCBackgroundTaskManager` class that manages in-memory task state:

- `start_sync(standard_type, version, triggered_by, created_by)` - creates `cdisc_sync_log` row (status=running), spawns `asyncio.create_task`, returns `task_id`
- `cancel_sync(task_id)` - sets a cancellation flag; the running sync checks this between steps
- `get_task_status(task_id)` - returns current progress from in-memory dict
- Internal progress callback - the sync service calls `update_checkpoint(task_id, progress)` after each major step (domain/dataset), which writes to `cdisc_sync_log.progress` JSONB

### 4.2 Checkpointing Flow

```
sync starts -> log row: status=running, progress={total: 20}
  |-- process domain DM   -> checkpoint: {completed: 1, total: 20, current_step: "DM"}
  |-- process domain AE   -> checkpoint: {completed: 2, total: 20, current_step: "AE"}
  |-- server crashes here -> log row stays: status=running, progress={completed: 2, ...}
  |-- admin clicks "Retry" -> service reads checkpoint, skips DM & AE, resumes from VS
```

### 4.3 Scheduler

- `APScheduler` (`AsyncIOScheduler`) with a single cron-like job
- On startup: read `cdisc_library_config.sync_schedule`, register the job
- When admin updates schedule via API -> reschedule the APScheduler job
- Scheduled job calls `start_sync()` for each enabled standard type sequentially, with `triggered_by="scheduled"`

### 4.4 Config Resolution

The `CDISCSyncService` constructor changes to accept config dynamically instead of reading from `settings` directly:

```python
def get_cdisc_config(db_session) -> CDISCConfig:
    # 1. Read DB row
    row = db.execute(select(CdiscLibraryConfig).where(id == 1))
    if row:
        return CDISCConfig(base_url=row.api_base_url, api_key=row.api_key)
    # 2. Fallback to env vars
    return CDISCConfig(base_url=settings.CDISC_API_BASE_URL, api_key=settings.CDISC_LIBRARY_API_KEY)
```

## 5. API Endpoints

All under existing router, prefixed `/api/v1/admin/`.

### 5.1 Config Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cdisc-config` | Get current config (API key masked) |
| `PUT` | `/cdisc-config` | Update config (superadmin only) |
| `POST` | `/cdisc-config/test-connection` | Test CDISC API connectivity |

### 5.2 Sync Control Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sync/cdisc/trigger` | Trigger async sync. Body: `{standard_type, version}`. Returns `task_id` immediately |
| `POST` | `/sync/cdisc/{task_id}/cancel` | Cancel a running sync task |
| `POST` | `/sync/cdisc/{task_id}/retry` | Resume from last checkpoint |
| `GET` | `/sync/cdisc/tasks/{task_id}` | Get live progress for a running task |

### 5.3 Sync History Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/sync/cdisc/logs` | Paginated sync history with filters (status, date range, type) |
| `GET` | `/sync/cdisc/logs/{task_id}` | Full detail of a specific sync run |

### 5.4 Schedule Endpoint

| Method | Path | Description |
|--------|------|-------------|
| `PUT` | `/cdisc-config/schedule` | Update schedule settings. Body: `{type, interval_hours?, sync_enabled}` |

The existing `POST /sync/cdisc` endpoint stays for backward compatibility but is deprecated in favor of the new async `POST /sync/cdisc/trigger`.

## 6. Frontend UI

The reference data page gets a top-level Ant Design `Tabs` with two items:

### Tab 1: "Reference Data" (existing, unchanged)

Current category tabs + table + CRUD modal.

### Tab 2: "CDISC Library" (new)

Split into 4 sections:

**Section A: Configuration**
- API Base URL input
- API Key input (password field, shows masked value)
- "Test Connection" button with success/failure badge
- "Save Configuration" button
- "Enabled Standard Types" - checkboxes for the 11 standard types

**Section B: Sync Control**
- Dropdown to select standard type + version input
- "Sync Now" button - triggers async sync, shows progress bar
- Active sync panel: progress bar with step description, cancel button
- "Retry Last Failed" button (visible only if last run is failed/interrupted)

**Section C: Schedule**
- Schedule type radio: Daily / Weekly / Monthly / Custom
- If Custom: "Every N hours" input
- Day-of-week picker (if Weekly)
- Master toggle: "Enable Scheduled Sync"
- Save button

**Section D: Sync History**
- Ant Design Table: Task ID, Standard Type, Version, Status (tag), Progress, Triggered By, Started At, Completed At, Duration
- Row expandable to show `result_summary` and `error_message`
- Filters: status dropdown, date range picker, standard type dropdown
- "Retry" action button on failed/interrupted rows

## 7. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Task execution | In-memory asyncio tasks | No extra infrastructure, fits current stack |
| Progress tracking | DB checkpoints | Enables resume after crash |
| Scheduling | APScheduler | Lightweight, Python-native, async-compatible |
| Config storage | Database + env fallback | Runtime changes without restart, audit trail |
| Sync type | Async with coarse progress | Long-running syncs need non-blocking API |
| Schedule options | Presets + custom interval | Covers common patterns without cron complexity |

## 8. Files to Create/Modify

### Backend
- **New:** `backend/app/models/cdisc_sync.py` - CdiscLibraryConfig + CdiscSyncLog models
- **New:** `backend/app/schemas/cdisc_sync.py` - Pydantic schemas for config/sync/log
- **New:** `backend/app/services/cdisc_task_manager.py` - Background task manager with checkpointing
- **New:** `backend/app/services/cdisc_scheduler.py` - APScheduler integration
- **New:** `backend/app/api/routers/cdisc_config.py` - Config + schedule endpoints
- **Modify:** `backend/app/api/routers/admin_sync.py` - Add async trigger/cancel/retry/log endpoints
- **Modify:** `backend/app/services/cdisc_sync_service.py` - Accept dynamic config, add progress callback
- **New:** Migration for `cdisc_library_config` and `cdisc_sync_log` tables

### Frontend
- **Modify:** `frontend/src/pages/(base)/system/reference-data/index.tsx` - Add top-level tab
- **New:** `frontend/src/pages/(base)/system/reference-data/modules/CdiscLibraryTab.tsx` - Main tab component
- **New:** `frontend/src/pages/(base)/system/reference-data/modules/ConfigSection.tsx` - Config panel
- **New:** `frontend/src/pages/(base)/system/reference-data/modules/SyncControlSection.tsx` - Sync control panel
- **New:** `frontend/src/pages/(base)/system/reference-data/modules/ScheduleSection.tsx` - Schedule panel
- **New:** `frontend/src/pages/(base)/system/reference-data/modules/SyncHistorySection.tsx` - History table
- **New:** `frontend/src/service/api/cdisc-sync.ts` - API service
- **New:** `frontend/src/service/hooks/useCdiscSync.ts` - React Query hooks
- **New:** `frontend/src/service/types/cdisc-sync.d.ts` - TypeScript types
- **New:** `frontend/src/service/urls/cdisc-sync.ts` - URL constants
