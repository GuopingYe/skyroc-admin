# CDISC Sync UX Improvements

**Date:** 2026-04-15  
**Status:** Ready for implementation

---

## Overview

Three targeted improvements to the CDISC reference data sync experience:

1. **Bug fix** — CT version names stored with wrong format (`v2026.03.27` instead of `2026-03-27`)
2. **Version dropdown** — replace manual text input with a dropdown auto-populated from the CDISC Library API
3. **Sync All** — one-click button to sync all 10 standard types at once
4. **Enabled Standard Types tooltip** — explain what this field controls, with a `?` icon

---

## Part 1: CT Naming Format Bug Fix

### Problem

In `backend/app/services/cdisc_sync_service.py`, `_upsert_cdisc_scope_node` (line 641) formats version display as:

```python
name = f"CDISC {standard_type.upper()} v{version.replace('-', '.')}"
```

For CT version `2026-03-27` this produces `CDISC CT v2026.03.27` — dashes replaced by dots, "v" prefix added. Expected: `CDISC CT 2026-03-27`.

The same `replace('-', '.')` pattern appears in descriptions and `standard_version` fields at lines 665, 714, 716, 718.

### Fix

Add a helper `_format_version_display(version: str) -> str` that detects date-based versions:

```python
import re

def _format_version_display(self, version: str) -> str:
    """Date-based versions (YYYY-MM-DD) are displayed as-is.
    Numeric versions (e.g. 3-4) are displayed as v3.4."""
    if re.match(r'^\d{4}-\d{2}-\d{2}$', version):
        return version          # CT: "2026-03-27"
    return f"v{version.replace('-', '.')}"  # SDTMIG: "v3.4"
```

Apply to:
- `_upsert_cdisc_scope_node`: `name` (line 641) and `description` (line 665)
- `_upsert_specification`: `description` (line 716) and `standard_version` (line 718)

The `Specification.version` field (line 714) stores the canonical version string used for lookups — keep it as-is (`version.replace("-", ".")`) for non-date versions to preserve backward compat, but use the raw date string for date-based versions.

---

## Part 2: Version Auto-Discovery Dropdown

### New Backend Endpoint

Add to `backend/app/api/routers/cdisc_config.py`:

```
GET /api/v1/admin/sync/cdisc/versions?standard_type={type}
```

Response:
```json
{
  "standard_type": "ct",
  "versions": ["2026-03-27", "2025-12-27", "2025-09-26", "..."],
  "count": N
}
```

Implementation:
- Calls `CDISCSyncService.get_available_versions(standard_type)`
- For CT: `_get_ct_versions()` returns package names like `sdtmct-2026-03-27`; the endpoint extracts unique dates by stripping the prefix and deduplicating (multiple CT packages share the same release date)
- For TIG: returns hrefs as-is; the frontend displays just the product name portion (`iss-ise-1-0`)
- For QRS/BC: returns `[]` with a `note` field explaining enumeration is not supported — frontend shows only the fixed "latest" option
- Always prepend `"latest"` to the returned list; prepend `"all"` for all types except `bc` and `qrs` (which have no enumerable version list, so `all` would silently do nothing)

### Frontend Changes

**`frontend/src/service/urls/cdisc-sync.ts`** — add:
```ts
AVAILABLE_VERSIONS: (standardType: string) =>
  `/api/v1/admin/sync/cdisc/versions?standard_type=${standardType}`
```

**`frontend/src/service/types/cdisc-sync.d.ts`** — add:
```ts
interface AvailableVersionsResponse {
  standard_type: string;
  versions: string[];
  count: number;
  note?: string;
}
```

**`frontend/src/service/api/cdisc-sync.ts`** — add:
```ts
export function fetchAvailableVersions(standardType: string) {
  return rbacRequest<Api.CdiscSync.AvailableVersionsResponse>({
    method: 'get',
    url: CDISC_SYNC_URLS.AVAILABLE_VERSIONS(standardType)
  });
}
```

**`frontend/src/service/hooks/useCdiscSync.ts`** — add:
```ts
export function useAvailableVersions(standardType: string) {
  return useQuery({
    enabled: Boolean(standardType),
    queryFn: () => fetchAvailableVersions(standardType),
    queryKey: QUERY_KEYS.CDISC_SYNC.AVAILABLE_VERSIONS(standardType),
    staleTime: 5 * 60 * 1000  // versions don't change often
  });
}
```

**`frontend/src/service/keys.ts`** — add `AVAILABLE_VERSIONS: (type: string) => [...]` under `CDISC_SYNC`.

**`SyncControlSection.tsx`** — replace the text `<Input>` for version with a `<Select>`:
- On standard type change, fetch versions via `useAvailableVersions(standardType)`
- Show a loading spinner on the Select while fetching
- Display versions as options; format date versions as-is, TIG hrefs as the product name portion only
- Default selected value: `"latest"` (always first in the list)
- Keep `"latest"` and `"all"` as fixed top options regardless of fetch result

---

## Part 3: Sync All

### Backend: `version=latest` Support

Add handling in `CDISCSyncService.sync()` before routing to specific methods:

```python
if version.lower() == "latest":
    version = await self._resolve_latest_version(standard_type)
```

`_resolve_latest_version(standard_type)` logic:
- For `ct`: call `_get_ct_versions()`, extract dates from package names (strip prefix, e.g. `sdtmct-2026-03-27` → `2026-03-27`), sort descending, return the newest date
- For `sdtm`, `sdtmig`, `adam`, `adamig`, `cdashig`, `sendig`: call `get_available_versions(type)`, return `versions[0]` (CDISC API returns newest first)
- For `bc`, `qrs`: return `"latest"` unchanged (these types handle it internally or have no enumeration)
- For `tig`: return `"all"` (TIG products are not sequentially versioned; returning `"all"` triggers the existing `_sync_all_versions` path which iterates all TIG products)

### Frontend: "Sync All Latest" Button

Add a second button to `SyncControlSection.tsx` alongside "Sync Now":

**Behavior:**
- Uses `Promise.allSettled` to fire all 10 trigger calls in parallel (each is a lightweight backend enqueue, not the actual sync work):
  `sdtm/latest`, `sdtmig/latest`, `adam/latest`, `adamig/latest`, `cdashig/latest`, `sendig/latest`, `ct/latest`, `bc/latest`, `qrs/latest`, `tig/all`
- On completion of all triggers, shows a success/partial-failure message: e.g. "10 sync tasks started" or "8 started, 2 failed"
- Disabled while the trigger calls are in flight (the ~1–2 seconds of 10 parallel API calls)
- Progress of the started tasks is visible in the existing sync history table — no additional progress UI needed

**Loading state:** the button shows a spinner during the trigger phase only; it re-enables once all trigger calls complete.

**No new backend endpoint needed** — this is N calls to the existing `POST /admin/sync/cdisc/trigger`.

---

## Part 4: "Enabled Standard Types" Tooltip

**Location:** `ConfigSection.tsx`, the `Form.Item` with `name="enabled_standard_types"` (line 96–102).

**Change:** Add a `?` icon next to the label using Ant Design's `<Tooltip>` + `<QuestionCircleOutlined>`:

```tsx
label={
  <Space size={4}>
    Enabled Standard Types
    <Tooltip title="...">
      <QuestionCircleOutlined style={{ color: '#8c8c8c', cursor: 'help' }} />
    </Tooltip>
  </Space>
}
```

**Tooltip text:**
> Controls which standard types appear in the Sync Control section and are included when "Sync All Latest" is triggered. Select only the types your team actively uses. Note: this does not delete already-synced data — it only filters what the UI surfaces and what automatic scheduled syncs will target.

---

## Files Changed

### Backend
| File | Change |
|------|--------|
| `backend/app/services/cdisc_sync_service.py` | Add `_format_version_display()`, add `_resolve_latest_version()`, fix name/description formatting in `_upsert_cdisc_scope_node` and `_upsert_specification`, add `version=latest` branch in `sync()` |
| `backend/app/api/routers/cdisc_config.py` | Add `GET /admin/sync/cdisc/versions` endpoint |

### Frontend
| File | Change |
|------|--------|
| `frontend/src/service/urls/cdisc-sync.ts` | Add `AVAILABLE_VERSIONS` URL |
| `frontend/src/service/types/cdisc-sync.d.ts` | Add `AvailableVersionsResponse` type |
| `frontend/src/service/api/cdisc-sync.ts` | Add `fetchAvailableVersions()` |
| `frontend/src/service/hooks/useCdiscSync.ts` | Add `useAvailableVersions()` hook |
| `frontend/src/service/keys.ts` | Add `AVAILABLE_VERSIONS` query key |
| `frontend/src/pages/(base)/system/reference-data/modules/SyncControlSection.tsx` | Replace Input→Select for version, add "Sync All Latest" button |
| `frontend/src/pages/(base)/system/reference-data/modules/ConfigSection.tsx` | Add tooltip to Enabled Standard Types label |

---

## Out of Scope

- Renaming or migrating already-synced nodes with the old `v2026.03.27` format — the fix only affects future syncs. Existing records can be corrected manually or by re-syncing.
- Per-type progress UI for Sync All — tasks are visible in the existing sync history table.
- Rate limiting / queuing of Sync All tasks — handled gracefully by individual task failures and the existing retry mechanism.
