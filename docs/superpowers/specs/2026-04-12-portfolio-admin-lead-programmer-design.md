# Portfolio Admin: Lead Programmer Role Assignment — Design Spec

**Date:** 2026-04-12
**Author:** Claude + GuopingYe
**Status:** Approved
**Scope:** Pipeline Management > Portfolio Admin Tab

---

## 1. Overview

Redesign the Portfolio Admin tab to support RBAC role assignment at each pipeline node level. Users can assign lead programmers to TA, Compound, and Study nodes, plus multiple study programmers at Study level. All changes follow a batch save pattern with undo/redo support.

## 2. Role Mapping per Node Level

| Node Level | Role Code | Cardinality | Label |
|---|---|---|---|
| TA | `TA_HEAD` | 1 person | TA Lead Programmer |
| Compound | `COMPOUND_LEAD` | 1 person | Product Lead Programmer |
| Study | `STUDY_LEAD_PROG` | 1 person | Study Lead Programmer |
| Study | `STUDY_PROG` | N persons | Study Programmers |
| Analysis | None | — | Inherits from parent Study |

Roles are backed by the existing `UserScopeRole` table. No new database tables needed.

## 3. Backend Changes

### 3.1 Extend `GET /pipeline/tree`

Include `assigned_roles` in `_format_node()` by querying `UserScopeRole` for each node, grouped by role code:

```python
"assigned_roles": {
  "TA_HEAD": [{"user_id": 5, "username": "jane", "display_name": "Jane Zhang", "email": "jane@pharma.com"}],
  "COMPOUND_LEAD": [...],
  "STUDY_LEAD_PROG": [...],
  "STUDY_PROG": [{"user_id": 12, ...}, {"user_id": 8, ...}]
}
```

Joined with `User` table to include `display_name` and `email`. Only includes active (non-soft-deleted) `UserScopeRole` rows (`is_deleted=False`).

### 3.2 New Endpoint: `POST /pipeline/nodes/{id}/roles`

Batch save role assignments. Request body:

```json
{
  "assignments": [
    {"role_code": "STUDY_LEAD_PROG", "user_id": 5, "action": "assign"},
    {"role_code": "STUDY_PROG", "user_id": 12, "action": "assign"},
    {"role_code": "STUDY_PROG", "user_id": 8, "action": "revoke"}
  ]
}
```

- **assign**: Create or un-delete `UserScopeRole` row for `(user_id, scope_node_id, role_id)`.
- **revoke**: Soft delete via `SoftDeleteMixin` (audit trail preserved).
- Returns `{"code": "0000", "data": {"applied": 3}}` on success.
- Permission: requires `pipeline:assign-team` on the scope node, or `is_superuser`.

### 3.3 New Endpoint: `GET /pipeline/users/search`

User search for assignment dropdowns.

- Query params: `q` (search string, min 2 chars), `limit` (default 20)
- Searches `User` table by `username`, `display_name`, `email` (case-insensitive ILIKE)
- Returns: `[{"user_id": 5, "username": "jane", "display_name": "Jane Zhang", "email": "...", "department": "Biometrics"}]`
- Only returns active users (`is_active=True`)

## 4. Frontend Architecture

### 4.1 New Files

**`pipeline-management/components/RoleAssignmentSection.tsx`**

Reusable component rendering a single role block inside the detail card.

Props:
- `roleCode: string` — e.g. `"TA_HEAD"`, `"STUDY_PROG"`
- `label: string` — display label, e.g. "TA Lead Programmer"
- `roleLabel: string` — role code hint, e.g. "(TA_HEAD)"
- `assignedUsers: AssignedRoleUser[]` — currently assigned users
- `maxCount: number | undefined` — `1` for single-assign roles, undefined for multi
- `editable: boolean` — whether edit controls are shown
- `onAssign: (userId: number) => void`
- `onRemove: (userId: number) => void`
- `pendingChange?: "changed" | "added" | "removed"` — visual indicator

Behavior:
- **Single-user mode** (`maxCount=1`): Shows avatar + name + "Change" button. If unassigned, shows "Not assigned" + "Assign" button.
- **Multi-user mode** (no maxCount): Shows list of assigned users with "Remove" per row, "+ Add Programmer" button.
- Uses Ant Design `Select` with `showSearch` for user picker, debounced search via `GET /pipeline/users/search`.
- Green border (`#f6ffed` / `#b7eb8f`) for single-role, blue border (`#e6f7ff` / `#91d5ff`) for multi-role.

**`pipeline-management/hooks/useRoleAssignments.ts`**

Hook managing role assignment state with batch save.

```typescript
interface RoleAssignmentState {
  committed: AssignedRoles;       // snapshot from server
  working: AssignedRoles;         // local edits
  history: {
    past: AssignedRoles[];
    future: AssignedRoles[];
  };
}
```

Exposes:
- `assignedRoles: AssignedRoles` — current working state
- `pendingCount: number` — number of unsaved changes
- `pendingChanges: RoleChangeAction[]` — diff between committed and working
- `assignUser(roleCode, user): void` — add user to working state, push to undo stack
- `removeUser(roleCode, userId): void` — remove from working state, push to undo stack
- `undo(): void` / `redo(): void` — roles-only undo/redo
- `saveAll(): Promise<void>` — POST pending changes, update committed, clear history
- `discardAll(): void` — reset working = committed, clear history
- `isDirty: boolean`

### 4.2 Modified Files

**`pipeline-management/types.ts`** — add types:

```typescript
export interface AssignedRoleUser {
  userId: number;
  username: string;
  displayName: string;
  email: string;
}

export type AssignedRoles = Record<string, AssignedRoleUser[]>;

export interface RoleChangeAction {
  roleCode: string;
  userId: number;
  action: "assign" | "revoke";
  userDetails?: AssignedRoleUser;
}
```

**`pipeline-management/index.tsx`** — changes to `PortfolioAdminTab`:
- Import and use `useRoleAssignments` hook
- Conditionally render `<RoleAssignmentSection>` based on `selectedNode.nodeType`
- Add "Save All" / "Discard" / Undo/Redo buttons to toolbar when `pendingCount > 0`
- Add "Lead" column to children table showing lead programmer for each child
- Block node switching when dirty (show warning modal)
- For Analysis nodes, show info banner: "Inherits team from parent Study: {name}"

### 4.3 Component Tree

```
PortfolioAdminTab
├── Left: Tree (unchanged)
└── Right: Card (Node Detail)
    ├── Toolbar: Edit / Archive + Save All / Discard / Undo / Redo (when dirty)
    ├── Title + Tags
    ├── <RoleAssignmentSection role="TA_HEAD" maxCount={1} />         ← TA only
    ├── <RoleAssignmentSection role="COMPOUND_LEAD" maxCount={1} />   ← Compound only
    ├── <RoleAssignmentSection role="STUDY_LEAD_PROG" maxCount={1} /> ← Study only
    ├── <RoleAssignmentSection role="STUDY_PROG" />                   ← Study only (multi)
    ├── <Descriptions> ... basic info ... </Descriptions>
    ├── <Card> child nodes table with "Lead" column </Card>
    └── <SaveConfirmationModal> ... diff summary ... </SaveConfirmationModal>
```

## 5. Batch Save Flow

1. **View mode** — role sections show assigned users read-only. Avatar + name + email. No edit controls.
2. **Click "Edit"** — toggles to edit mode. Each role section shows Change/Add/Remove buttons. User search dropdown becomes active.
3. **Assign user** — `assignUser()` pushes current `working` to undo stack, adds user to `working[roleCode]`. No API call.
4. **Remove user** — same flow, removes from `working[roleCode]`.
5. **Undo/Redo** — pops from history stack, restores `working`. Roles-only, separate from pipeline store.
6. **Pending changes banner** — appears in toolbar when `pendingCount > 0`. Shows count badge + "Save All" + "Discard".
7. **Save All** — opens `SaveConfirmationModal` listing all changes. On confirm → `POST /pipeline/nodes/{id}/roles` → on success: update `committed = working`, clear history, refresh tree.
8. **Discard** — resets `working = committed`, clears history.
9. **Cancel Edit** — same as Discard, plus exits edit mode.

### 5.1 Pending Change Diff

```typescript
function diffRoles(committed: AssignedRoles, working: AssignedRoles): RoleChangeAction[] {
  const allRoleCodes = new Set([...Object.keys(committed), ...Object.keys(working)]);
  const actions: RoleChangeAction[] = [];

  for (const code of allRoleCodes) {
    const cIds = new Set((committed[code] || []).map(u => u.userId));
    const wIds = new Set((working[code] || []).map(u => u.userId));

    for (const id of wIds) {
      if (!cIds.has(id)) actions.push({ roleCode: code, userId: id, action: "assign" });
    }
    for (const id of cIds) {
      if (!wIds.has(id)) actions.push({ roleCode: code, userId: id, action: "revoke" });
    }
  }
  return actions;
}
```

## 6. Edge Cases

| Scenario | Behavior |
|---|---|
| Unassigned role | Shows "Not assigned" in amber text. In edit mode, empty section with "+ Assign" button. |
| Locked/Archived node | Role sections render read-only. Edit button disabled (same as existing locked behavior). |
| Switch nodes while dirty | Warning: "You have unsaved role changes. Save or discard before switching?" Block navigation. |
| Concurrent edits | On save conflict, refresh tree data and show: "Roles were updated by another user. Please review." |
| Analysis nodes | No role sections. Show info banner: "Inherits team from parent Study: {name}" with link. |
| User search | `Select` dropdown via `GET /pipeline/users/search?q=`, debounced 300ms, min 2 chars. Shows avatar + displayName + username. |
| Permission gate | Role assignment UI only when `hasPermission('pipeline:assign-team', node.dbId)` or `isSuperuser`. View-only otherwise. |
| Single-role reassignment | When assigning to a role with `maxCount=1` that already has someone, the new user replaces the old. Diff shows both assign + revoke. |

## 7. Files Changed Summary

### Backend
- `backend/app/api/routers/pipeline.py` — extend `_format_node()`, add `POST /nodes/{id}/roles`, add `GET /users/search`
- `backend/app/schemas/pipeline_schemas.py` — add `RoleAssignmentBatch`, `RoleAssignmentAction` schemas

### Frontend
- `frontend/src/pages/(base)/mdr/pipeline-management/components/RoleAssignmentSection.tsx` — **NEW**
- `frontend/src/pages/(base)/mdr/pipeline-management/hooks/useRoleAssignments.ts` — **NEW**
- `frontend/src/pages/(base)/mdr/pipeline-management/types.ts` — add `AssignedRoleUser`, `AssignedRoles`, `RoleChangeAction`
- `frontend/src/pages/(base)/mdr/pipeline-management/index.tsx` — integrate role sections into detail card, add toolbar controls, add "Lead" column to children table
- `frontend/src/service/api/mdr.ts` — add `saveNodeRoles()`, `searchUsers()` API calls
- `frontend/src/service/urls/mdr.ts` — add URL constants for new endpoints
