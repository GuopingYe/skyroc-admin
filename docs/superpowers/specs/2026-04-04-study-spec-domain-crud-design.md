# Study Spec Domain CRUD + Undo/Redo/Save Design

**Date:** 2026-04-04  
**Scope:** Study Spec page — domain list CRUD, persistent undo/redo, staged-local save with diff confirmation

---

## 1. Problem Statement

The study spec page currently allows adding domains but provides no way to delete or modify them after creation. There is also no staged-edit workflow — changes hit the backend immediately with no opportunity to review or undo. This design adds full CRUD for domains, a persistent command-based undo/redo system, and a save confirmation dialog that shows exactly what will change before committing to the backend.

---

## 2. Approach: Command Pattern with Zustand Persist

All domain edits are staged locally. Nothing hits the backend until the user explicitly clicks **Save Changes** and confirms the diff dialog.

Each user action is recorded as a typed command object with an inverse. The command log is persisted to `localStorage` keyed by `specId`, so work survives network failures and accidental page closes.

---

## 3. Data Model

### 3.1 DomainDraft

Extends the existing dataset shape with extended info fields and a draft status marker:

```typescript
interface DomainDraft {
  id: string
  domain_name: string                              // up to 8 chars (CDISC standard)
  domain_label: string
  class_type: string
  origin: 'global_library' | 'custom'             // locks name/class_type editing for global_library
  _status: 'added' | 'modified' | 'deleted' | 'unchanged'

  // Extended information (new fields)
  structure: string         // e.g. "One record per subject per visit per test code"
  key_variables: string[]   // variable IDs selected from domain's variable list
  sort_variables: string[]  // variable IDs selected from domain's variable list
  comments: string
}
```

### 3.2 Command Types

```typescript
type DomainCommand =
  | { type: 'ADD_DOMAIN';     payload: DomainDraft }
  | { type: 'DELETE_DOMAIN';  payload: { id: string; snapshot: DomainDraft } }
  | { type: 'EDIT_DOMAIN';    payload: { id: string; before: Partial<DomainDraft>; after: Partial<DomainDraft> } }
  | { type: 'RESTORE_DOMAIN'; payload: { id: string } }  // inverse of DELETE_DOMAIN
```

### 3.3 Zustand Store Shape

```typescript
interface DomainDraftStore {
  specId: string
  baseline: DomainDraft[]   // snapshot from last successful save (or initial server load)
  current: DomainDraft[]    // current working state
  past: DomainCommand[]     // undo stack (most recent last)
  future: DomainCommand[]   // redo stack

  // Actions
  dispatch: (cmd: DomainCommand) => void
  undo: () => void
  redo: () => void
  commitSave: () => void    // sets baseline = current, clears past/future
  resetDraft: () => void    // restores current to baseline
}
```

**localStorage key:** `domain-draft-${specId}` — isolated per spec, avoids cross-spec collisions.

**Undo/redo logic:**
- `undo`: pop from `past`, apply inverse to `current`, push original to `future`
- `redo`: pop from `future`, re-apply to `current`, push to `past`
- Any new `dispatch` clears `future` (standard command pattern behavior)

---

## 4. UI Layout

### 4.1 Toolbar

Placed at the top of the left dataset panel:

```
[ ↩ Undo ]  [ ↪ Redo ]  ·····  [ + Add Domain ]  [ Save Changes (3) ▲ ]
```

- Undo/Redo are icon buttons; disabled when respective stack is empty
- **Save Changes** button shows badge with pending change count; disabled when count = 0
- A yellow dot unsaved-changes indicator appears on the page when the draft is dirty

### 4.2 Domain List Item States

Each domain row in the left panel shows visual status and contextual actions:

| State | Visual | Actions |
|-------|--------|---------|
| unchanged | no border | Edit ✏, Delete 🗑 |
| added | green left border, ★ icon | Edit ✏, Delete 🗑 |
| modified | blue left border, ✏ icon | Edit ✏, Delete 🗑 |
| deleted | red bg, strikethrough text | Restore ↩ |

Edit and Delete icons appear on row hover.

### 4.3 Edit Drawer

Right-side Ant Design Drawer (width ~500px), opened by clicking Edit on any domain row.

**Fields:**

| Field | Custom domain | Global library domain |
|-------|--------------|----------------------|
| Domain Name | Editable (max 8 chars, uppercase) | Read-only |
| Domain Label | Editable | Editable |
| Class Type | Editable (select) | Read-only |
| Structure | Editable | Editable |
| Key Variables | Multi-select from variable list | Multi-select from variable list |
| Sort Variables | Multi-select from variable list | Multi-select from variable list |
| Comments | Textarea | Textarea |

**Drawer footer:** `[ Cancel ]  [ Apply ]`

- **Apply** records an `EDIT_DOMAIN` command (captures `before`/`after` diff), closes drawer. Does **not** call the backend.
- **Cancel** discards in-drawer changes, closes drawer.

Key Variables and Sort Variables use a multi-select component populated from the domain's current variable list (fetched via existing `useStudyVariables` hook).

---

## 5. Save Confirmation Dialog

Triggered by **Save Changes** button. Shows a grouped diff of all pending changes before any API call.

```
┌── Save Changes ──────────────────────────────────────────┐
│  Review the following changes before saving:              │
│                                                           │
│  ✅ Added  (2)                                            │
│    • MYDOM — My Custom Domain  [Findings]                 │
│    • RELREC — Related Records  [Special Purpose]          │
│                                                           │
│  ✏️  Modified  (1)                                         │
│    • AE — Adverse Events                                  │
│        Structure:  (empty) → "One record per subject..."  │
│        Key Vars:   (none) → STUDYID, USUBJID, AESEQ       │
│                                                           │
│  🗑️  Deleted  (1)                                          │
│    • DM — Demographics  [Special Purpose]                 │
│                                                           │
│  This action cannot be undone after confirming.           │
│                               [ Cancel ]  [ Confirm Save ]│
└───────────────────────────────────────────────────────────┘
```

**Behavior:**
- Each changed field in a modified domain is listed as `fieldLabel: old → new`
- On **Confirm Save**: commands are replayed as sequential API calls; on full success `commitSave()` is called (baseline = current, stacks cleared)
- On **partial API failure**: draft is preserved, error toast indicates which operation failed, user can retry
- On **Cancel**: dialog closes, draft unchanged

---

## 6. Backend Changes

### 6.1 DB Migration

Add extended info columns to the study dataset table:

```sql
ALTER TABLE study_dataset ADD COLUMN structure       TEXT;
ALTER TABLE study_dataset ADD COLUMN key_variables   JSONB DEFAULT '[]';
ALTER TABLE study_dataset ADD COLUMN sort_variables  JSONB DEFAULT '[]';
ALTER TABLE study_dataset ADD COLUMN comments        TEXT;
```

### 6.2 New Endpoints

**PATCH dataset** — update core fields and/or extended info:
```
PATCH /api/v1/study-specs/{spec_id}/datasets/{dataset_id}
Body: {
  domain_label?:    string,
  domain_name?:     string,        // only applied for custom domains (validated server-side)
  class_type?:      string,        // only applied for custom domains (validated server-side)
  structure?:       string,
  key_variables?:   string[],      // variable IDs
  sort_variables?:  string[],      // variable IDs
  comments?:        string
}
Response: updated DomainDraft
```

**DELETE dataset** — soft delete with audit trail (21 CFR Part 11 compliant):
```
DELETE /api/v1/study-specs/{spec_id}/datasets/{dataset_id}
→ sets is_deleted=True, records deleted_by + deleted_at
Response: 204 No Content
```

### 6.3 Save Sequence

Frontend replays pending commands in order:
1. `ADD_DOMAIN` commands → existing `addDatasetFromGlobalLibrary` / `createCustomDataset`
2. `EDIT_DOMAIN` commands → new `PATCH` endpoint
3. `DELETE_DOMAIN` commands → soft-delete endpoint

On any failure, stop sequence, preserve draft, show error toast.

---

## 7. Files Affected

### Frontend (new/modified)
- `frontend/src/pages/(base)/mdr/study-spec/store/domainDraftStore.ts` — new Zustand persist store
- `frontend/src/pages/(base)/mdr/study-spec/components/DomainEditDrawer.tsx` — new edit drawer
- `frontend/src/pages/(base)/mdr/study-spec/components/SaveChangesModal.tsx` — new diff + confirm dialog
- `frontend/src/pages/(base)/mdr/study-spec/index.tsx` — wire toolbar, list states, store
- `frontend/src/service/api/study-spec.ts` — add PATCH + DELETE calls
- `frontend/src/service/hooks/useStudySpec.ts` — add mutation hooks

### Backend (new/modified)
- `backend/app/models/study_spec.py` — add extended info columns
- `backend/app/api/routers/study_spec.py` — add PATCH + soft-delete endpoints
- `backend/alembic/versions/` — new migration for extended info columns

---

## 8. Out of Scope

- Multi-user conflict resolution (last-write-wins for now)
- Draft sharing across devices (localStorage is per-browser)
- Undo/redo for variable-level changes (domain-level only)
