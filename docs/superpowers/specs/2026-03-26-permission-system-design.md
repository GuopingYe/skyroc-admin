# Permission System Design
**Date:** 2026-03-26
**Status:** Approved
**Author:** Brainstorming session

---

## 1. Overview

This document specifies the complete Role-Based Access Control (RBAC) permission system for the Clinical MDR platform. The system must satisfy 21 CFR Part 11 compliance (full audit trail, soft deletes, no physical deletion of access records).

### Goals
- Every page in the application is gated by a `page:xxx:view` permission — no hardcoded role checks in route code
- Users can hold multiple roles simultaneously, each scoped to a different level of the clinical hierarchy (TA, Compound, Study)
- Super Admin can reconfigure the role→permission matrix at runtime via the admin UI — no code deploy required
- Local username/password authentication works today; LDAP sync slots in later with zero architecture changes

### Non-goals
- LDAP authentication implementation (stubbed only)
- SSO/SAML integration
- Fine-grained row-level security within pages (out of scope for this phase)

---

## 2. Role Definitions

Nine roles cover all clinical platform personas. Roles are stored in the `roles` table and seeded via Alembic migration. The `level` integer is used by the `POST /rbac/assign-team` endpoint to prevent privilege escalation (a caller may only assign roles with a level ≤ their own highest level at the target scope).

| Role | Code | Scope Level | Level | Color |
|------|------|-------------|-------|-------|
| Super Admin | `SUPER_ADMIN` | GLOBAL | 100 | purple |
| TA Head | `TA_HEAD` | TA | 80 | blue |
| Compound Lead | `COMPOUND_LEAD` | COMPOUND | 70 | cyan |
| Line Manager | `LINE_MANAGER` | TA **or** COMPOUND (flexible) | 65 | orange |
| Study Lead Programmer | `STUDY_LEAD_PROG` | STUDY | 60 | green |
| Study Programmer | `STUDY_PROG` | STUDY | 40 | lime |
| QC Reviewer | `QC_REVIEWER` | STUDY | 35 | gold |
| Statistician | `STATISTICIAN` | STUDY | 30 | volcano |
| Viewer | `VIEWER` | STUDY | 10 | default |

The `level` value is stored as `sort_order` on the `roles` table (already exists). No schema change required.

**Scope inheritance:** A user assigned a role at a higher scope node automatically inherits that role's permissions for all descendant nodes. Implemented via `ScopeNode.path.startswith(granted_path)` in `get_user_permissions_for_scope()`.

**Line Manager** is the only role with a flexible scope level — it may be assigned at either TA or Compound level depending on org structure.

---

## 3. Permission Codes

**Twenty-nine permissions** across five categories. All stored in the `permissions` table.

### 3.1 Page Visibility (`page` category) — 11 permissions

These permissions control whether a menu item appears and whether a route is accessible. A missing `page:xxx:view` permission hides the menu item and returns 403 on direct URL navigation.

**Note on "Tracker" vs "Programming Tracker":** These are two distinct pages (`/mdr/tracker` and `/mdr/programming-tracker`) with separate page permissions. The Tracker page also hosts the Issues sub-section — there is no separate `/mdr/issues` route.

| Code | Description |
|------|-------------|
| `page:global-library:view` | CDISC Global Library page |
| `page:study-spec:view` | Study Specification page |
| `page:mapping-studio:view` | Mapping Studio page |
| `page:tfl-designer:view` | TFL Designer page |
| `page:tfl-template-library:view` | TFL Template Library page |
| `page:pipeline-management:view` | Pipeline Management page |
| `page:pr-approval:view` | PR Approval page |
| `page:programming-tracker:view` | Programming Tracker page (`/mdr/programming-tracker`) |
| `page:tracker:view` | Tracker & Issues page (`/mdr/tracker`) |
| `page:user-management:view` | User Management admin page |
| `page:role-permission:view` | Role & Permission Config admin page |

### 3.2 Metadata Actions (`metadata` category) — 4 permissions

> **21 CFR Part 11 note:** `mapping:delete` triggers a **soft delete** (sets `is_deleted=True` + writes an `AuditLog` entry). It never issues a SQL `DELETE` statement. This applies to all core metadata tables platform-wide.

| Code | Description |
|------|-------------|
| `global-library:edit` | Edit CDISC standard library entries |
| `study-spec:edit` | Edit study specification config |
| `mapping:edit` | Create/edit SDTM/ADaM mapping rules |
| `mapping:delete` | Soft-delete mapping rules (audit-logged) |

### 3.3 TFL Actions (`tfl` category) — 2 permissions

| Code | Description |
|------|-------------|
| `tfl:edit` | Create/edit TFL outputs in designer |
| `tfl-template:edit` | Create/edit TFL shell templates |

### 3.4 Project Actions (`project` category) — 5 permissions

| Code | Description |
|------|-------------|
| `pipeline:edit` | Edit pipeline milestones and timelines |
| `pipeline:assign-team` | Assign users to study roles (delegated admin) |
| `tracker:edit` | Edit/close tracker items |
| `tracker:assign` | Assign tracker tasks to users |
| `issues:edit` | Create/edit issues (within `/mdr/tracker`) |

### 3.5 QC Actions (`qc` category) — 3 permissions

| Code | Description |
|------|-------------|
| `pr:submit` | Submit a pull request for review |
| `pr:approve` | Approve a pull request |
| `pr:reject` | Reject a pull request |

### 3.6 Admin Actions (`admin` category) — 4 permissions

| Code | Description |
|------|-------------|
| `user:create` | Create a new local user account |
| `user:edit` | Edit user profile (name, email, department) |
| `user:deactivate` | Activate / deactivate a user account |
| `role:edit-permissions` | Update which permissions a role has |

---

## 4. Default Role → Permission Matrix

Default assignments seeded by migration. Super Admin can change any cell via the Role Permission Config page, **except** `SUPER_ADMIN` permissions are immutable (see Section 9).

| Permission | `SUPER_ADMIN` | `TA_HEAD` | `COMPOUND_LEAD` | `LINE_MANAGER` | `STUDY_LEAD_PROG` | `STUDY_PROG` | `QC_REVIEWER` | `STATISTICIAN` | `VIEWER` |
|-----------|:-----------:|:-------:|:-------------:|:--------:|:----------:|:----------:|:------:|:----:|:------:|
| page:global-library:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| page:study-spec:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| page:mapping-studio:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| page:tfl-designer:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| page:tfl-template-library:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| page:pipeline-management:view | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| page:pr-approval:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| page:programming-tracker:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| page:tracker:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| page:user-management:view | ✓ | — | — | — | — | — | — | — | — |
| page:role-permission:view | ✓ | — | — | — | — | — | — | — | — |
| global-library:edit | ✓ | — | — | — | — | — | — | — | — |
| study-spec:edit | ✓ | — | — | — | ✓ | ✓ | — | — | — |
| mapping:edit | ✓ | — | — | — | ✓ | ✓ | — | — | — |
| mapping:delete | ✓ | — | — | — | ✓ | — | — | — | — |
| tfl:edit | ✓ | — | — | — | ✓ | ✓ | — | ✓ | — |
| tfl-template:edit | ✓ | — | — | — | ✓ | ✓ | — | ✓ | — |
| pipeline:edit | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| pipeline:assign-team | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — |
| tracker:edit | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — |
| tracker:assign | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| issues:edit | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| pr:submit | ✓ | ✓ | ✓ | — | ✓ | ✓ | — | — | — |
| pr:approve | ✓ | ✓ | ✓ | — | ✓ | — | ✓ | — | — |
| pr:reject | ✓ | ✓ | ✓ | — | ✓ | — | ✓ | — | — |
| user:create | ✓ | — | — | — | — | — | — | — | — |
| user:edit | ✓ | — | — | — | — | — | — | — | — |
| user:deactivate | ✓ | — | — | — | — | — | — | — | — |
| role:edit-permissions | ✓ | — | — | — | — | — | — | — | — |

---

## 5. Architecture

### 5.1 Runtime Permission Flow

```
User login → JWT issued (sub = user_id)
    ↓
App boot: GET /api/v1/rbac/users/me/permissions?include_tree=true
    ↓ returns: { scope_permissions: { "<scopeId>": ["page:pipeline-management:view", "mapping:edit", ...] } }
    ↓
routeGuard.ts determines active scope (see §8.2 for fallback strategy)
    ↓
Menu items filtered: show only routes where user has page:xxx:view in active scope
    ↓
Within page: <PermissionGuard permission="mapping:edit" scopeId={currentScopeId}>
    → shows/hides buttons, edit forms, delete actions
    ↓
Backend endpoints independently enforce same permissions (double enforcement)
```

### 5.2 Scope Inheritance

Permissions propagate down the hierarchy:
```
CDISC → GLOBAL → TA → COMPOUND → INDICATION → STUDY → ANALYSIS
```

If user is assigned `TA_HEAD` at scope node path `/1/5/`, they inherit all `TA_HEAD` permissions for every descendant node. Implemented via `ScopeNode.path.startswith(granted_path)` in `get_user_permissions_for_scope()`.

### 5.3 Delegated Team Assignment

`pipeline:assign-team` enables non-superuser role assignment. The new `POST /rbac/assign-team` endpoint:
1. Verifies caller has `pipeline:assign-team` in **at least one** scope that is an ancestor-or-equal of the target scope (supports callers with multiple granted scopes)
2. Validates the target scope is a descendant of **any** of the caller's `pipeline:assign-team`-bearing scopes
3. Only allows assigning roles where `role.sort_order` ≤ the caller's **maximum** `sort_order` across all their active roles at the target scope (prevents privilege escalation)
4. Calls the same grant logic as the superuser endpoint

---

## 6. Database Changes

### 6.1 New Migration: `2026-03-26_001_rbac_seed.py`

One new migration file that:
1. Adds `auth_provider` column to `users` table (`VARCHAR(20)`, default `'LOCAL'`, not null)
2. Inserts all 9 roles (with `sort_order` = role `level` from Section 2)
3. Inserts all **29 permissions** across 5 categories
4. Inserts all role_permission rows per Section 4 matrix

No other table structure changes.

### 6.2 Updated User Model

```python
auth_provider: Mapped[str] = mapped_column(
    String(20), nullable=False, default="LOCAL",
    comment="Auth provider: LOCAL | LDAP"
)
```

---

## 7. Backend Changes

All changes in `backend/app/api/routers/rbac.py` unless noted.

### 7.1 New Endpoints

| Method | Path | Permission Required | Description |
|--------|------|---------------------|-------------|
| `PUT` | `/rbac/roles/{role_id}/permissions` | `role:edit-permissions` | Replace full permission set for a role. **Raises 403 if `role_id` resolves to `SUPER_ADMIN`** — that role's permissions are immutable. |
| `POST` | `/rbac/users` | `user:create` | Create local user account |
| `PUT` | `/rbac/users/{user_id}` | `user:edit` | Update display_name, email, department |
| `PATCH` | `/rbac/users/{user_id}/status` | `user:deactivate` | Activate / deactivate user |
| `POST` | `/rbac/assign-team` | `pipeline:assign-team` (scoped) | Delegated role assignment from Pipeline Management |
| `POST` | `/rbac/admin/sync-ldap` | `is_superuser` | **Stub** — returns 501 until LDAP service is implemented |

### 7.2 LDAP Configuration Stub

`app/core/config.py` — add optional LDAP settings (all `None` by default; app starts normally when unset):
```python
LDAP_URL: str | None = None
LDAP_BASE_DN: str | None = None
LDAP_BIND_DN: str | None = None
LDAP_BIND_PASSWORD: str | None = None
LDAP_USER_FILTER: str = "(objectClass=person)"
LDAP_ATTR_MAP: dict = {"uid": "username", "mail": "email", "cn": "display_name", "department": "department"}
```

`app/services/ldap_sync_service.py` — stub service:
```python
async def sync_users(db: AsyncSession) -> dict:
    """Sync users from LDAP. Raises NotImplementedError until configured."""
    raise NotImplementedError("LDAP sync not yet configured")
```

---

## 8. Frontend Changes

### 8.1 Fix `useUserPermissions` Hook

**File:** `frontend/src/hooks/business/useUserPermissions.ts`

Remove imports from `mockData.ts`. Re-implement using `useMyPermissions(true)` and `usePermissionCheck` from `@/service/hooks`.

### 8.2 Route Guard

**File:** `frontend/src/features/router/routeGuard.ts` (new)

**Scope fallback strategy:** When no study/analysis is selected in `clinicalContextSlice`, the guard computes the **union of all scopes the user holds any role in** — but **only for route/menu visibility**. This ensures TA Head and Compound Lead users see their permitted pages on first login before selecting a context. Once a scope is selected, the guard re-evaluates using that specific `scopeNodeId`.

**Important:** The union fallback applies exclusively to the `PAGE_PERMISSION_MAP` route check. Intra-page `<PermissionGuard>` components always receive the `scopeId` prop from `clinicalContextSlice` directly (or `null` when no scope is selected). When `scopeId` is `null`, `PermissionGuard` renders the `fallback` (hides action controls) — it never uses the union set. This prevents action-level over-exposure before a context is selected.

Logic:
1. Read `currentScopeNodeId` from `clinicalContextSlice`; if null, derive the union permission set from all the user's granted scopes for menu filtering only
2. For each route in the menu config, check whether the resolved permission set contains the corresponding `page:xxx:view` permission
3. Filter menu items accordingly
4. On direct URL navigation to a hidden route → redirect to `/403`

Page permission mapping (route path → permission code):
```ts
const PAGE_PERMISSION_MAP: Record<string, string> = {
  '/mdr/global-library':        'page:global-library:view',
  '/mdr/study-spec':            'page:study-spec:view',
  '/mdr/mapping-studio':        'page:mapping-studio:view',
  '/mdr/tfl-designer':          'page:tfl-designer:view',
  '/mdr/tfl-template-library':  'page:tfl-template-library:view',
  '/mdr/pipeline-management':   'page:pipeline-management:view',
  '/mdr/pr-approval':           'page:pr-approval:view',
  '/mdr/programming-tracker':   'page:programming-tracker:view',
  '/mdr/tracker':               'page:tracker:view',
  '/system/user-management':    'page:user-management:view',
  '/system/role-permission':    'page:role-permission:view',
}
```

### 8.3 Role Permission Config — Wire Save Button

**File:** `frontend/src/pages/(base)/system/role-permission/index.tsx`

Replace the `// TODO` save handler with a call to `useUpdateRolePermissions` mutation (new hook). On success: invalidate roles cache, show success toast, log audit event. The UI must disable save and show a lock icon when `SUPER_ADMIN` is selected (immutable).

### 8.4 User Management — Complete CRUD

**File:** `frontend/src/pages/(base)/system/user-management/index.tsx`

- **Create User** form (modal): username, email, display_name, department, initial password → `POST /rbac/users`
- **Edit User** (existing modal): wire to `PUT /rbac/users/{id}`
- **Deactivate** (existing delete button): wire to `PATCH /rbac/users/{id}/status`
- **Sync from LDAP** button (Super Admin only): calls `POST /rbac/admin/sync-ldap`, shows "Coming soon" toast until 501 is resolved

### 8.5 Pipeline Management — Assign Team Panel

**File:** `frontend/src/pages/(base)/mdr/pipeline-management/components/AssignTeamPanel.tsx` (new)

A slide-out drawer triggered by an "Assign Team" button on each study node row. Only rendered when user has `pipeline:assign-team` in the current scope.

Contents:
1. Current team list: user avatar, name, role tag, revoke button
2. Add member form: user search dropdown + role selector → `POST /rbac/assign-team`
3. Scope label: "Assigning to: Study XYZ-001"

### 8.6 New RBAC Service Layer

**Files:** `frontend/src/service/api/rbac.ts` + `frontend/src/service/hooks/useRBAC.ts`

New functions to add:
- `fetchUpdateRolePermissions(roleId, permissionIds[])` → `PUT /rbac/roles/{id}/permissions`
- `fetchCreateUser(data)` → `POST /rbac/users`
- `fetchUpdateUser(id, data)` → `PUT /rbac/users/{id}`
- `fetchUpdateUserStatus(id, isActive)` → `PATCH /rbac/users/{id}/status`
- `fetchAssignTeam(data)` → `POST /rbac/assign-team`

---

## 9. Security Considerations

- **Double enforcement:** Every permission is checked both in the frontend (UI gating) and the backend (API guard). Frontend checks are UX-only — the backend is authoritative.
- **`SUPER_ADMIN` permissions are immutable:** `PUT /rbac/roles/{role_id}/permissions` raises 403 when `role_id` resolves to `SUPER_ADMIN`. The Role Permission Config page disables saving when `SUPER_ADMIN` is selected.
- **Scope boundary on delegated assignment:** `POST /rbac/assign-team` validates the target scope is a descendant of at least one of the caller's `pipeline:assign-team`-bearing scopes. A Line Manager at Compound A cannot assign roles within Compound B.
- **No privilege escalation:** `assign-team` compares `role.sort_order` values. Caller may only assign roles with `sort_order ≤` their own maximum at the target scope.
- **Audit trail — explicitly covered operations:**
  - `user_scope_roles` INSERT / soft-DELETE (grant / revoke)
  - `role_permissions` INSERT / DELETE — the join table uses physical DELETE for operational query performance, but the `AuditListener` captures every DELETE event and writes a record to `audit_logs` **before** the row is removed. The `audit_logs` table is the 21 CFR Part 11-compliant history; the join table itself does not need to retain deleted rows.
  - `users.is_active` UPDATE (deactivation)
  - `users` INSERT (user creation)
  - All covered by `AuditListener` SQLAlchemy event in `app/models/audit_listener.py`
- **Soft deletes only:** `UserScopeRole` records are never physically deleted — revocation uses the existing soft-delete pattern (`is_deleted=True`, `deleted_at`, `deleted_by`).
- **LDAP passwords never stored:** When `auth_provider=LDAP`, `password_hash` is NULL. The backend rejects password-change requests for LDAP users.

---

## 10. Implementation Order

Recommended sequence for a single developer:

1. **DB migration** — seed 9 roles (with `sort_order`), 29 permissions, role_permission rows, `auth_provider` column
2. **Backend endpoints** — `PUT /roles/{id}/permissions` (with SUPER_ADMIN guard), user CRUD, `POST /assign-team`, LDAP stub
3. **Fix `useUserPermissions`** — unblock all frontend permission checks
4. **Route guard** — `routeGuard.ts` with union-scope fallback + integrate with router
5. **Wire Role Permission save** — completes admin matrix editing (with SUPER_ADMIN lock)
6. **Wire User Management CRUD** — completes user admin
7. **AssignTeamPanel** — team assignment from Pipeline Management

Each step is independently deployable and testable.
