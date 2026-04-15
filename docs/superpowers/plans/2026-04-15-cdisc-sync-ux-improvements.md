# CDISC Sync UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix CT version naming, add version auto-discovery dropdown, add one-click Sync All button, and add tooltip on Enabled Standard Types field.

**Architecture:** Backend gains a `_format_version_display()` helper and `_resolve_latest_version()` method in `CDISCSyncService`, plus a new `GET /admin/sync/cdisc/versions` endpoint. Frontend replaces the version text input with a live Select and adds a "Sync All Latest" button that fires 10 parallel trigger calls.

**Tech Stack:** FastAPI, SQLAlchemy async, pytest; React 18, TypeScript, Ant Design, React Query (`@tanstack/react-query`), pnpm.

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `backend/app/services/cdisc_sync_service.py` | Modify | Add `_format_version_display()`, `_resolve_latest_version()`, `version=latest` branch in `sync()`, fix name/description in `_upsert_cdisc_scope_node` and `_upsert_specification` |
| `backend/app/api/routers/cdisc_config.py` | Modify | Add `AvailableVersionsResponse` Pydantic model + `GET /sync/cdisc/versions` endpoint |
| `backend/tests/test_cdisc_sync.py` | Modify | Add tests for `_format_version_display` and `_resolve_latest_version` |
| `frontend/src/service/urls/cdisc-sync.ts` | Modify | Add `AVAILABLE_VERSIONS` URL factory |
| `frontend/src/service/types/cdisc-sync.d.ts` | Modify | Add `AvailableVersionsResponse` interface |
| `frontend/src/service/api/cdisc-sync.ts` | Modify | Add `fetchAvailableVersions()` |
| `frontend/src/service/hooks/useCdiscSync.ts` | Modify | Add `useAvailableVersions()` hook |
| `frontend/src/service/keys/index.ts` | Modify | Add `AVAILABLE_VERSIONS` query key under `CDISC_SYNC` |
| `frontend/src/pages/(base)/system/reference-data/modules/SyncControlSection.tsx` | Modify | Replace version `<Input>` → `<Select>`, add "Sync All Latest" button |
| `frontend/src/pages/(base)/system/reference-data/modules/ConfigSection.tsx` | Modify | Add `?` tooltip icon to Enabled Standard Types label |

---

## Task 1: Backend — `_format_version_display` helper + naming fix

**Files:**
- Modify: `backend/app/services/cdisc_sync_service.py`
- Modify: `backend/tests/test_cdisc_sync.py`

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_cdisc_sync.py`:

```python
# ============================================================
# _format_version_display tests
# ============================================================

def test_format_version_display_date_versions():
    """Date-based versions (YYYY-MM-DD) are returned as-is, no 'v' prefix."""
    from app.services.cdisc_sync_service import CDISCSyncService
    svc = CDISCSyncService.__new__(CDISCSyncService)
    assert svc._format_version_display("2026-03-27") == "2026-03-27"
    assert svc._format_version_display("2025-09-26") == "2025-09-26"
    assert svc._format_version_display("2024-12-27") == "2024-12-27"


def test_format_version_display_numeric_versions():
    """Numeric versions get 'v' prefix and dashes become dots."""
    from app.services.cdisc_sync_service import CDISCSyncService
    svc = CDISCSyncService.__new__(CDISCSyncService)
    assert svc._format_version_display("3-4") == "v3.4"
    assert svc._format_version_display("1-3") == "v1.3"
    assert svc._format_version_display("2-1") == "v2.1"
    assert svc._format_version_display("2-0") == "v2.0"
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend
python -m pytest tests/test_cdisc_sync.py::test_format_version_display_date_versions tests/test_cdisc_sync.py::test_format_version_display_numeric_versions -v --no-cov
```

Expected: `AttributeError: 'CDISCSyncService' object has no attribute '_format_version_display'`

- [ ] **Step 3: Add `_format_version_display` to `CDISCSyncService` and fix the two call-sites**

In `backend/app/services/cdisc_sync_service.py`, add the method inside `CDISCSyncService` just before `_upsert_cdisc_scope_node` (around line 619). Also add `import re` at the top of the file if not already present.

```python
# Add near other imports at the top of the file (if not already there):
import re
```

Add this method to `CDISCSyncService` (place it just before `_upsert_cdisc_scope_node`):

```python
def _format_version_display(self, version: str) -> str:
    """Format a version string for human display.

    Date-based versions (YYYY-MM-DD, used by CT) are returned as-is.
    Numeric versions (e.g. '3-4') become 'v3.4'.
    """
    if re.match(r'^\d{4}-\d{2}-\d{2}$', version):
        return version
    return f"v{version.replace('-', '.')}"
```

In `_upsert_cdisc_scope_node`, replace these two lines:

```python
# BEFORE:
name = f"CDISC {standard_type.upper()} v{version.replace('-', '.')}"
# ...
description=f"CDISC 官方 {standard_type.upper()} 标准，版本 {version.replace('-', '.')}",

# AFTER:
name = f"CDISC {standard_type.upper()} {self._format_version_display(version)}"
# ...
description=f"CDISC 官方 {standard_type.upper()} 标准，版本 {self._format_version_display(version)}",
```

In `_upsert_specification`, replace these three lines:

```python
# BEFORE:
version=version.replace("-", "."),
# ...
description=f"CDISC {spec_type.value} v{version.replace('-', '.')} 标准规范",
standard_name=scope_node.name,
standard_version=version.replace("-", "."),

# AFTER:
version=self._format_version_display(version).lstrip("v"),
# ...
description=f"CDISC {spec_type.value} {self._format_version_display(version)} 标准规范",
standard_name=scope_node.name,
standard_version=self._format_version_display(version).lstrip("v"),
```

Note: `.lstrip("v")` converts `"v3.4"` → `"3.4"` and leaves `"2026-03-27"` unchanged.

- [ ] **Step 4: Run the tests — expect PASS**

```bash
cd backend
python -m pytest tests/test_cdisc_sync.py::test_format_version_display_date_versions tests/test_cdisc_sync.py::test_format_version_display_numeric_versions -v --no-cov
```

Expected: both PASS.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
cd backend
python -m pytest tests/ --no-cov -q
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
cd D:/github/clinical-mdr
git add backend/app/services/cdisc_sync_service.py backend/tests/test_cdisc_sync.py
git commit -m "fix(backend): normalize CT version display format in scope node names

Date-based versions (YYYY-MM-DD) are now stored as '2026-03-27' instead
of 'v2026.03.27'. Numeric versions (3-4) remain 'v3.4'.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Backend — `_resolve_latest_version` + `version=latest` in `sync()`

**Files:**
- Modify: `backend/app/services/cdisc_sync_service.py`
- Modify: `backend/tests/test_cdisc_sync.py`

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/test_cdisc_sync.py`:

```python
import pytest
from unittest.mock import AsyncMock


# ============================================================
# _resolve_latest_version tests
# ============================================================

@pytest.mark.asyncio
async def test_resolve_latest_version_tig_returns_all():
    """TIG has multiple independent products — 'all' syncs everything."""
    from app.services.cdisc_sync_service import CDISCSyncService
    svc = CDISCSyncService.__new__(CDISCSyncService)
    result = await svc._resolve_latest_version("tig")
    assert result == "all"


@pytest.mark.asyncio
async def test_resolve_latest_version_bc_returns_latest():
    """BC has no version enumeration — pass 'latest' through unchanged."""
    from app.services.cdisc_sync_service import CDISCSyncService
    svc = CDISCSyncService.__new__(CDISCSyncService)
    result = await svc._resolve_latest_version("bc")
    assert result == "latest"


@pytest.mark.asyncio
async def test_resolve_latest_version_qrs_returns_latest():
    """QRS has no version enumeration — pass 'latest' through unchanged."""
    from app.services.cdisc_sync_service import CDISCSyncService
    svc = CDISCSyncService.__new__(CDISCSyncService)
    result = await svc._resolve_latest_version("qrs")
    assert result == "latest"


@pytest.mark.asyncio
async def test_resolve_latest_version_ct_picks_newest_date():
    """CT: deduplicate dates from package names, return most recent."""
    from app.services.cdisc_sync_service import CDISCSyncService
    svc = CDISCSyncService.__new__(CDISCSyncService)
    svc._get_ct_versions = AsyncMock(return_value=[
        "sdtmct-2026-03-27", "adamct-2026-03-27", "sendct-2026-03-27",
        "sdtmct-2025-12-27", "adamct-2025-12-27",
        "sdtmct-2025-09-26",
    ])
    result = await svc._resolve_latest_version("ct")
    assert result == "2026-03-27"


@pytest.mark.asyncio
async def test_resolve_latest_version_sdtmig_picks_first():
    """Model/IG: CDISC API returns newest first, so take versions[0]."""
    from app.services.cdisc_sync_service import CDISCSyncService
    svc = CDISCSyncService.__new__(CDISCSyncService)
    svc.get_available_versions = AsyncMock(return_value=["3-4", "3-3", "3-2"])
    result = await svc._resolve_latest_version("sdtmig")
    assert result == "3-4"


@pytest.mark.asyncio
async def test_resolve_latest_version_empty_falls_back():
    """If CDISC API returns nothing, fall back to 'latest' string."""
    from app.services.cdisc_sync_service import CDISCSyncService
    svc = CDISCSyncService.__new__(CDISCSyncService)
    svc.get_available_versions = AsyncMock(return_value=[])
    result = await svc._resolve_latest_version("sdtm")
    assert result == "latest"
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend
python -m pytest tests/test_cdisc_sync.py -k "resolve_latest" -v --no-cov
```

Expected: `AttributeError: 'CDISCSyncService' object has no attribute '_resolve_latest_version'`

- [ ] **Step 3: Add `_resolve_latest_version` to `CDISCSyncService`**

Add this method to `CDISCSyncService` just before `_upsert_cdisc_scope_node`:

```python
async def _resolve_latest_version(self, standard_type: str) -> str:
    """Resolve the 'latest' sentinel to the actual newest version.

    Called from sync() when version='latest' is requested.
    Each standard type has different versioning semantics:
    - tig:  multiple independent products, use 'all' to sync everything
    - bc/qrs: no enumerable version list, pass 'latest' through as-is
    - ct:  date-stamped packages; extract dates, pick newest
    - others: CDISC API lists versions newest-first, take index 0
    """
    if standard_type == "tig":
        return "all"

    if standard_type in ("bc", "qrs"):
        return "latest"

    if standard_type == "ct":
        packages = await self._get_ct_versions()
        dates: set[str] = set()
        for pkg in packages:
            match = re.search(r"(\d{4}-\d{2}-\d{2})$", pkg)
            if match:
                dates.add(match.group(1))
        if not dates:
            logger.warning("CT: no dates found in package list, falling back to 'latest'")
            return "latest"
        return sorted(dates, reverse=True)[0]

    # sdtm, sdtmig, adam, adamig, cdashig, sendig, integrated
    versions = await self.get_available_versions(standard_type)
    if not versions:
        logger.warning(
            f"{standard_type.upper()}: no versions from CDISC API, falling back to 'latest'"
        )
        return "latest"
    return versions[0]
```

- [ ] **Step 4: Add the `version=latest` branch inside `sync()`**

In `CDISCSyncService.sync()`, find the line that reads:

```python
        if version.lower() == "all":
            return await self._sync_all_versions(session, standard_type)
```

Add the `latest` branch immediately **before** it:

```python
        # Resolve 'latest' to the actual newest version from CDISC API
        if version.lower() == "latest":
            version = await self._resolve_latest_version(standard_type)
            logger.info(
                f"Resolved 'latest' for {standard_type.upper()} → {version}"
            )

        if version.lower() == "all":
            return await self._sync_all_versions(session, standard_type)
```

- [ ] **Step 5: Install pytest-asyncio if not present, then run the new tests**

```bash
cd backend
pip show pytest-asyncio > /dev/null 2>&1 || pip install pytest-asyncio
python -m pytest tests/test_cdisc_sync.py -k "resolve_latest" -v --no-cov
```

Expected: all 6 tests PASS.

- [ ] **Step 6: Run full test suite**

```bash
cd backend
python -m pytest tests/ --no-cov -q
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
cd D:/github/clinical-mdr
git add backend/app/services/cdisc_sync_service.py backend/tests/test_cdisc_sync.py
git commit -m "feat(backend): add version=latest auto-resolution in CDISCSyncService

_resolve_latest_version() queries the CDISC Library API at sync time
to find the current newest version per standard type.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Backend — `GET /admin/sync/cdisc/versions` endpoint

**Files:**
- Modify: `backend/app/api/routers/cdisc_config.py`

- [ ] **Step 1: Add the Pydantic response model**

In `backend/app/api/routers/cdisc_config.py`, find the imports block and add:

```python
from app.services.cdisc_sync_service import CDISCSyncService
```

Then add the response model near the top of the file (after the existing imports):

```python
class AvailableVersionsResponse(BaseModel):
    """Available versions for a CDISC standard type."""

    standard_type: str = Field(..., description="Standard type queried")
    versions: list[str] = Field(
        ...,
        description="Version options — always starts with 'latest'; most types also include 'all'"
    )
    count: int = Field(..., description="Total number of options")
    note: str | None = Field(None, description="Informational note (e.g. for BC/QRS)")
```

Also add the `BaseModel` and `Field` imports if not already present — check the existing imports first. `BaseModel` and `Field` are from `pydantic` which is already used in the file via the existing schemas import. Add at the top:

```python
from pydantic import BaseModel, Field
```

- [ ] **Step 2: Add the endpoint**

Append to `backend/app/api/routers/cdisc_config.py` (after the last existing endpoint):

```python
# ============================================================
# Available Versions Endpoint
# ============================================================


@router.get(
    "/sync/cdisc/versions",
    response_model=AvailableVersionsResponse,
    summary="Fetch available versions for a CDISC standard type",
    description=(
        "Queries the CDISC Library API for available versions of the given standard. "
        "For CT, returns deduplicated release dates. "
        "For TIG, returns product name slugs. "
        "BC and QRS return only 'latest' (no enumerable list). "
        "All results are prepended with 'latest'; all except BC/QRS also include 'all'."
    ),
)
async def get_available_versions(
    user: CurrentUser,
    standard_type: str = Query(..., description="Standard type (sdtm, sdtmig, ct, tig, etc.)"),
    _: None = Depends(require_superuser),
) -> AvailableVersionsResponse:
    """Return available versions for a standard type from the live CDISC API."""
    import re

    service = CDISCSyncService()
    try:
        raw = await service.get_available_versions(standard_type)
    finally:
        await service.close()

    # BC and QRS have no enumerable version list
    if standard_type in ("bc", "qrs"):
        return AvailableVersionsResponse(
            standard_type=standard_type,
            versions=["latest"],
            count=1,
            note=(
                f"{standard_type.upper()} does not support version enumeration. "
                "Use 'latest' to sync the current release."
            ),
        )

    # CT: deduplicate release dates from package names (sdtmct-2026-03-27 → 2026-03-27)
    if standard_type == "ct":
        dates: set[str] = set()
        for pkg in raw:
            match = re.search(r"(\d{4}-\d{2}-\d{2})$", pkg)
            if match:
                dates.add(match.group(1))
        sorted_dates = sorted(dates, reverse=True)
        versions = ["latest", "all"] + sorted_dates
        return AvailableVersionsResponse(
            standard_type=standard_type,
            versions=versions,
            count=len(versions),
        )

    # TIG: return product name slug (last path segment of href)
    if standard_type in ("tig", "integrated"):
        products: list[str] = []
        for href in raw:
            slug = href.rstrip("/").split("/")[-1]
            if slug and slug not in products:
                products.append(slug)
        versions = ["latest", "all"] + products
        return AvailableVersionsResponse(
            standard_type=standard_type,
            versions=versions,
            count=len(versions),
        )

    # Model / IG types (sdtm, sdtmig, adam, adamig, cdashig, sendig)
    # CDISC API returns newest first
    versions = ["latest", "all"] + raw
    return AvailableVersionsResponse(
        standard_type=standard_type,
        versions=versions,
        count=len(versions),
    )
```

- [ ] **Step 3: Start the backend and manually verify the endpoint**

```bash
cd backend
uvicorn app.main:app --reload --port 8080
```

In a second terminal:
```bash
curl -s "http://localhost:8080/api/v1/admin/sync/cdisc/versions?standard_type=ct" \
  -H "Authorization: Bearer <your-token>" | python -m json.tool
```

Expected response shape:
```json
{
  "standard_type": "ct",
  "versions": ["latest", "all", "2026-03-27", "2025-12-27", ...],
  "count": N,
  "note": null
}
```

Also verify BC:
```bash
curl -s "http://localhost:8080/api/v1/admin/sync/cdisc/versions?standard_type=bc" \
  -H "Authorization: Bearer <your-token>" | python -m json.tool
```

Expected:
```json
{
  "standard_type": "bc",
  "versions": ["latest"],
  "count": 1,
  "note": "BC does not support version enumeration..."
}
```

- [ ] **Step 4: Run full backend test suite**

```bash
cd backend
python -m pytest tests/ --no-cov -q
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
cd D:/github/clinical-mdr
git add backend/app/api/routers/cdisc_config.py
git commit -m "feat(backend): add GET /admin/sync/cdisc/versions endpoint

Returns available versions per standard type from the live CDISC
Library API, with CT date deduplication and TIG slug extraction.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Frontend — service layer additions

**Files:**
- Modify: `frontend/src/service/urls/cdisc-sync.ts`
- Modify: `frontend/src/service/types/cdisc-sync.d.ts`
- Modify: `frontend/src/service/api/cdisc-sync.ts`
- Modify: `frontend/src/service/hooks/useCdiscSync.ts`
- Modify: `frontend/src/service/keys/index.ts`

- [ ] **Step 1: Add the URL**

In `frontend/src/service/urls/cdisc-sync.ts`, add one entry to `CDISC_SYNC_URLS`:

```ts
export const CDISC_SYNC_URLS = {
  CONFIG: '/api/v1/admin/cdisc-config',
  TEST_CONNECTION: '/api/v1/admin/cdisc-config/test-connection',
  SCHEDULE: '/api/v1/admin/cdisc-config/schedule',
  TRIGGER_SYNC: '/api/v1/admin/sync/cdisc/trigger',
  CANCEL_SYNC: (taskId: string) => `/api/v1/admin/sync/cdisc/${taskId}/cancel`,
  RETRY_SYNC: (taskId: string) => `/api/v1/admin/sync/cdisc/${taskId}/retry`,
  TASK_STATUS: (taskId: string) => `/api/v1/admin/sync/cdisc/tasks/${taskId}`,
  SYNC_LOGS: '/api/v1/admin/sync/cdisc/logs',
  SYNC_LOG_DETAIL: (taskId: string) => `/api/v1/admin/sync/cdisc/logs/${taskId}`,
  AVAILABLE_VERSIONS: (standardType: string) =>
    `/api/v1/admin/sync/cdisc/versions?standard_type=${standardType}`
} as const;
```

- [ ] **Step 2: Add the TypeScript type**

In `frontend/src/service/types/cdisc-sync.d.ts`, add inside `namespace CdiscSync` (after the existing `SyncLogListResponse` interface):

```ts
    /** Available versions for a standard type */
    interface AvailableVersionsResponse {
      standard_type: string;
      versions: string[];
      count: number;
      note?: string | null;
    }
```

- [ ] **Step 3: Add the API function**

In `frontend/src/service/api/cdisc-sync.ts`, add after `fetchSyncLogs`:

```ts
export function fetchAvailableVersions(standardType: string) {
  return rbacRequest<Api.CdiscSync.AvailableVersionsResponse>({
    method: 'get',
    url: CDISC_SYNC_URLS.AVAILABLE_VERSIONS(standardType)
  });
}
```

- [ ] **Step 4: Add the query key**

In `frontend/src/service/keys/index.ts`, extend `CDISC_SYNC`:

```ts
  CDISC_SYNC: {
    CONFIG: ['cdiscSync', 'config'] as const,
    SYNC_LOGS: (params?: { status?: string; standard_type?: string; offset?: number; limit?: number }) =>
      ['cdiscSync', 'logs', params] as const,
    TASK_STATUS: (taskId: string) => ['cdiscSync', 'taskStatus', taskId] as const,
    AVAILABLE_VERSIONS: (standardType: string) =>
      ['cdiscSync', 'availableVersions', standardType] as const
  },
```

- [ ] **Step 5: Add the React Query hook**

In `frontend/src/service/hooks/useCdiscSync.ts`, add the import and the hook:

First, add `fetchAvailableVersions` to the imports at the top:

```ts
import {
  cancelSync,
  fetchAvailableVersions,
  fetchCdiscConfig,
  fetchSyncLogs,
  fetchTaskStatus,
  retrySync,
  testCdiscConnection,
  triggerSync,
  updateCdiscConfig,
  updateSchedule
} from '../api/cdisc-sync';
```

Then add the hook after `useSyncLogs`:

```ts
export function useAvailableVersions(standardType: string) {
  return useQuery({
    enabled: Boolean(standardType),
    queryFn: () => fetchAvailableVersions(standardType),
    queryKey: QUERY_KEYS.CDISC_SYNC.AVAILABLE_VERSIONS(standardType),
    staleTime: 5 * 60 * 1000 // versions don't change often
  });
}
```

- [ ] **Step 6: TypeScript check**

```bash
cd D:/github/clinical-mdr/frontend
npx tsc --noEmit --skipLibCheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd D:/github/clinical-mdr
git add frontend/src/service/urls/cdisc-sync.ts \
        frontend/src/service/types/cdisc-sync.d.ts \
        frontend/src/service/api/cdisc-sync.ts \
        frontend/src/service/hooks/useCdiscSync.ts \
        frontend/src/service/keys/index.ts
git commit -m "feat(frontend): add CDISC available versions service layer

URL, type, API function, query key, and React Query hook for
the new GET /admin/sync/cdisc/versions endpoint.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Frontend — SyncControlSection version dropdown + Sync All button

**Files:**
- Modify: `frontend/src/pages/(base)/system/reference-data/modules/SyncControlSection.tsx`

- [ ] **Step 1: Replace the file contents**

Write the complete new `SyncControlSection.tsx`:

```tsx
import { useCallback, useState } from 'react';

import { Button, Card, Progress, Select, Space, Typography, message } from 'antd';

import { useAvailableVersions, useCancelSync, useTaskPolling, useTriggerSync } from '@/service/hooks/useCdiscSync';

import { CDISC_STANDARD_TYPES } from './standard-types';

interface SyncControlSectionProps {
  activeTaskId: string | null;
  onSyncStart: (taskId: string) => void;
}

/** All 10 types triggered by Sync All Latest. TIG uses 'all' because it has
 *  multiple independent products rather than sequential versions. */
const SYNC_ALL_TARGETS: Array<{ standard_type: string; version: string }> = [
  { standard_type: 'sdtm', version: 'latest' },
  { standard_type: 'sdtmig', version: 'latest' },
  { standard_type: 'adam', version: 'latest' },
  { standard_type: 'adamig', version: 'latest' },
  { standard_type: 'cdashig', version: 'latest' },
  { standard_type: 'sendig', version: 'latest' },
  { standard_type: 'ct', version: 'latest' },
  { standard_type: 'bc', version: 'latest' },
  { standard_type: 'qrs', version: 'latest' },
  { standard_type: 'tig', version: 'all' }
];

const SyncControlSection: React.FC<SyncControlSectionProps> = ({ activeTaskId, onSyncStart }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [standardType, setStandardType] = useState('sdtm');
  const [version, setVersion] = useState('latest');
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const triggerMutation = useTriggerSync();
  const cancelMutation = useCancelSync();
  const { data: taskProgress, isLoading: isTaskLoading } = useTaskPolling(activeTaskId);
  const { data: versionsData, isLoading: isVersionsLoading } = useAvailableVersions(standardType);

  const handleTypeChange = useCallback((type: string) => {
    setStandardType(type);
    setVersion('latest'); // reset to safe default on type change
  }, []);

  const handleSync = useCallback(() => {
    triggerMutation.mutate(
      { standard_type: standardType, version },
      {
        onSuccess: data => {
          messageApi.success(data.message);
          onSyncStart(data.task_id);
        },
        onError: () => messageApi.error('Failed to trigger sync')
      }
    );
  }, [standardType, version, triggerMutation, onSyncStart, messageApi]);

  const handleSyncAll = useCallback(async () => {
    setIsSyncingAll(true);
    try {
      const results = await Promise.allSettled(
        SYNC_ALL_TARGETS.map(({ standard_type, version: ver }) =>
          triggerMutation.mutateAsync({ standard_type, version: ver })
        )
      );
      const started = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed === 0) {
        messageApi.success(`${started} sync tasks started — check history for progress`);
      } else {
        messageApi.warning(`${started} started, ${failed} failed to trigger`);
      }
    } finally {
      setIsSyncingAll(false);
    }
  }, [triggerMutation, messageApi]);

  const handleCancel = useCallback(() => {
    if (!activeTaskId) return;
    cancelMutation.mutate(activeTaskId, {
      onSuccess: data => {
        if (data.success) messageApi.success(data.message);
        else messageApi.error(data.message);
      },
      onError: () => messageApi.error('Failed to cancel sync')
    });
  }, [activeTaskId, cancelMutation, messageApi]);

  const isTaskActive =
    taskProgress?.status === 'running' || taskProgress?.status === 'pending';

  const versionOptions = (versionsData?.versions ?? ['latest']).map(v => ({
    label: v,
    value: v
  }));

  return (
    <Card title="Sync Control">
      {contextHolder}
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap>
          <Select
            value={standardType}
            onChange={handleTypeChange}
            options={CDISC_STANDARD_TYPES.map(o => ({ label: o.label, value: o.value }))}
            style={{ width: 200 }}
            disabled={isTaskActive}
          />
          <Select
            value={version}
            onChange={setVersion}
            options={versionOptions}
            loading={isVersionsLoading}
            style={{ width: 180 }}
            disabled={isTaskActive || isVersionsLoading}
            placeholder="Select version"
          />
          <Button
            type="primary"
            loading={triggerMutation.isPending}
            onClick={handleSync}
            disabled={isTaskActive}
          >
            Sync Now
          </Button>
          <Button
            loading={isSyncingAll}
            onClick={handleSyncAll}
            disabled={isTaskActive || isSyncingAll}
          >
            Sync All Latest
          </Button>
        </Space>

        {isTaskActive && (
          <Card
            type="inner"
            title="Active Task"
            size="small"
            loading={isTaskLoading}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Typography.Text strong>Standard: </Typography.Text>
                <Typography.Text>{taskProgress?.standard_type}</Typography.Text>
                <Typography.Text strong style={{ marginLeft: 16 }}>Version: </Typography.Text>
                <Typography.Text>{taskProgress?.version}</Typography.Text>
              </div>
              <Progress
                percent={taskProgress?.progress?.percentage ?? 0}
                status={taskProgress?.status === 'pending' ? 'active' : undefined}
              />
              <div>
                <Typography.Text type="secondary">
                  Status: {taskProgress?.status ?? 'unknown'}
                </Typography.Text>
              </div>
              <Button
                danger
                loading={cancelMutation.isPending}
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </Space>
          </Card>
        )}
      </Space>
    </Card>
  );
};

export default SyncControlSection;
```

- [ ] **Step 2: TypeScript check**

```bash
cd D:/github/clinical-mdr/frontend
npx tsc --noEmit --skipLibCheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd D:/github/clinical-mdr
git add frontend/src/pages/\(base\)/system/reference-data/modules/SyncControlSection.tsx
git commit -m "feat(frontend): version dropdown and Sync All Latest button in SyncControlSection

Replaces text input with a Select populated from CDISC Library API.
Adds Sync All Latest button that triggers all 10 standard types in parallel.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Frontend — Enabled Standard Types tooltip

**Files:**
- Modify: `frontend/src/pages/(base)/system/reference-data/modules/ConfigSection.tsx`

- [ ] **Step 1: Add the tooltip to the label**

In `frontend/src/pages/(base)/system/reference-data/modules/ConfigSection.tsx`:

Update the imports — add `QuestionCircleOutlined` from `@ant-design/icons` and add `Space`, `Tooltip` from `antd`:

```tsx
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Form, Input, Space, Tag, Tooltip, message } from 'antd';
```

Replace the `Form.Item` for `enabled_standard_types` (the one with `label="Enabled Standard Types"`):

```tsx
        <Form.Item
          name="enabled_standard_types"
          label={
            <Space size={4}>
              Enabled Standard Types
              <Tooltip
                title="Controls which standard types appear in the Sync Control section and are included when 'Sync All Latest' is triggered. Select only the types your team actively uses. Note: this does not delete already-synced data — it only filters what the UI surfaces and what automatic scheduled syncs will target."
              >
                <QuestionCircleOutlined style={{ color: '#8c8c8c', cursor: 'help' }} />
              </Tooltip>
            </Space>
          }
          rules={[{ required: true, message: 'Select at least one standard type' }]}
        >
          <Checkbox.Group options={CDISC_STANDARD_TYPES.map(t => ({ label: t.label, value: t.value }))} />
        </Form.Item>
```

- [ ] **Step 2: TypeScript check**

```bash
cd D:/github/clinical-mdr/frontend
npx tsc --noEmit --skipLibCheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd D:/github/clinical-mdr
git add frontend/src/pages/\(base\)/system/reference-data/modules/ConfigSection.tsx
git commit -m "feat(frontend): add tooltip to Enabled Standard Types field

Explains that this controls Sync All Latest targets and scheduled
sync scope, and that it does not delete already-synced data.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Part 1 (naming) → Task 1. Part 2 (version dropdown) → Tasks 3–5. Part 3 (Sync All) → Tasks 2, 5. Part 4 (tooltip) → Task 6. All 4 spec parts covered.
- [x] **No placeholders:** All steps contain actual code.
- [x] **Type consistency:** `AvailableVersionsResponse` defined in Task 3 (backend Pydantic) and Task 4 (TS type). `fetchAvailableVersions` introduced in Task 4 Step 3, consumed in Task 4 Step 5. `useAvailableVersions` introduced in Task 4 Step 5, consumed in Task 5 Step 1. All consistent.
- [x] **`SYNC_ALL_TARGETS` constant** is defined in Task 5 Step 1 only — not referenced elsewhere.
- [x] **`_format_version_display` and `_resolve_latest_version`** both import `re` at module level — Task 1 Step 3 adds the `import re` guard.
- [x] **pytest-asyncio** installed in Task 2 Step 5.
- [x] **TIG in Sync All** correctly uses `version: 'all'` in `SYNC_ALL_TARGETS`.
