# Portfolio Admin: Lead Programmer Role Assignment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add RBAC role assignment UI to the Portfolio Admin tab, allowing users to assign lead programmers at TA, Compound, and Study levels with batch save.

**Architecture:** Backend extends the existing pipeline router with two new endpoints and enriches the tree response with role data. Frontend adds a `useRoleAssignments` hook with its own undo/redo stack and a `RoleAssignmentSection` component rendered inline in the detail card.

**Tech Stack:** FastAPI/SQLAlchemy (backend), React/TypeScript/Ant Design/Zustand (frontend)

---

## File Structure

### Backend (create/modify)
- `backend/app/schemas/pipeline_schemas.py` — add `RoleAssignmentAction`, `RoleAssignmentBatch` schemas
- `backend/app/api/routers/pipeline.py` — extend `_format_node()`, add `POST /nodes/{id}/roles`, add `GET /users/search`
- `backend/tests/test_pipeline_roles.py` — **NEW** test file for role assignment endpoints

### Frontend (create/modify)
- `frontend/src/pages/(base)/mdr/pipeline-management/types.ts` — add `AssignedRoleUser`, `AssignedRoles`, `RoleChangeAction`
- `frontend/src/service/urls/mdr.ts` — add `PIPELINE_NODE_ROLES`, `PIPELINE_USERS_SEARCH`
- `frontend/src/service/api/mdr.ts` — add `saveNodeRoles()`, `searchPipelineUsers()`
- `frontend/src/pages/(base)/mdr/pipeline-management/hooks/useRoleAssignments.ts` — **NEW**
- `frontend/src/pages/(base)/mdr/pipeline-management/components/RoleAssignmentSection.tsx` — **NEW**
- `frontend/src/pages/(base)/mdr/pipeline-management/index.tsx` — integrate role sections + toolbar

---

## Task 1: Backend — Pydantic Schemas

**Files:**
- Modify: `backend/app/schemas/pipeline_schemas.py`

- [ ] **Step 1: Add role assignment schemas**

Append to the end of `backend/app/schemas/pipeline_schemas.py`:

```python
class RoleAssignmentAction(BaseModel):
    role_code: str
    user_id: int
    action: Literal["assign", "revoke"]

class RoleAssignmentBatch(BaseModel):
    assignments: list[RoleAssignmentAction]
```

- [ ] **Step 2: Add the `Literal` import**

At the top of the file, `Literal` is already imported on line 3 (`from typing import Any, Literal`). If not present, add it.

- [ ] **Step 3: Verify no syntax errors**

Run: `cd D:\github\clinical-mdr\backend && python -c "from app.schemas.pipeline_schemas import RoleAssignmentBatch, RoleAssignmentAction; print('OK')"`

- [ ] **Step 4: Commit**

```bash
git add backend/app/schemas/pipeline_schemas.py
git commit -m "feat(backend): add RoleAssignmentAction and RoleAssignmentBatch schemas"
```

---

## Task 2: Backend — User Search Endpoint

**Files:**
- Modify: `backend/app/api/routers/pipeline.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_pipeline_roles.py`:

```python
"""Tests for Pipeline Role Assignment endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import TestDataFactory


# ============================================================
# User Search
# ============================================================

@pytest.mark.asyncio
async def test_search_users_empty(authenticated_client: AsyncClient):
    """GET /pipeline/users/search returns empty when no users match."""
    resp = await authenticated_client.get(
        "/api/v1/pipeline/users/search",
        params={"q": "nonexistent"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert data["data"] == []


@pytest.mark.asyncio
async def test_search_users_by_username(
    authenticated_client: AsyncClient,
    db_session: AsyncSession,
    test_user,
):
    """GET /pipeline/users/search finds user by username."""
    resp = await authenticated_client.get(
        "/api/v1/pipeline/users/search",
        params={"q": "testuser"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert len(data["data"]) >= 1
    assert data["data"][0]["username"] == "testuser"


@pytest.mark.asyncio
async def test_search_users_min_length(authenticated_client: AsyncClient):
    """GET /pipeline/users/search returns 400 when q is too short."""
    resp = await authenticated_client.get(
        "/api/v1/pipeline/users/search",
        params={"q": "a"},
    )
    assert resp.status_code == 400


# ============================================================
# Batch Role Assignment
# ============================================================

@pytest.mark.asyncio
async def test_assign_role_to_node(
    authenticated_client: AsyncClient,
    db_session: AsyncSession,
    test_user,
):
    """POST /pipeline/nodes/{id}/roles assigns a role."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    role = await TestDataFactory.create_role(db_session, "TA_HEAD", "TA Head")
    await db_session.commit()

    resp = await authenticated_client.post(
        f"/api/v1/pipeline/nodes/{ta.id}/roles",
        json={"assignments": [
            {"role_code": "TA_HEAD", "user_id": test_user.id, "action": "assign"},
        ]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert data["data"]["applied"] == 1


@pytest.mark.asyncio
async def test_assign_role_tree_includes_roles(
    authenticated_client: AsyncClient,
    db_session: AsyncSession,
    test_user,
):
    """GET /pipeline/tree includes assigned_roles in node data."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    role = await TestDataFactory.create_role(db_session, "TA_HEAD", "TA Head")
    await db_session.commit()

    # Assign role
    await authenticated_client.post(
        f"/api/v1/pipeline/nodes/{ta.id}/roles",
        json={"assignments": [
            {"role_code": "TA_HEAD", "user_id": test_user.id, "action": "assign"},
        ]},
    )

    # Check tree
    resp = await authenticated_client.get("/api/v1/pipeline/tree")
    data = resp.json()
    assert data["code"] == "0000"
    ta_node = next(n for n in data["data"] if n["id"] == str(ta.id))
    assert "assigned_roles" in ta_node
    assert "TA_HEAD" in ta_node["assigned_roles"]
    assert ta_node["assigned_roles"]["TA_HEAD"][0]["user_id"] == test_user.id


@pytest.mark.asyncio
async def test_revoke_role_from_node(
    authenticated_client: AsyncClient,
    db_session: AsyncSession,
    test_user,
):
    """POST /pipeline/nodes/{id}/roles revokes a role (soft delete)."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    role = await TestDataFactory.create_role(db_session, "TA_HEAD", "TA Head")
    await db_session.commit()

    # Assign first
    await authenticated_client.post(
        f"/api/v1/pipeline/nodes/{ta.id}/roles",
        json={"assignments": [
            {"role_code": "TA_HEAD", "user_id": test_user.id, "action": "assign"},
        ]},
    )

    # Revoke
    resp = await authenticated_client.post(
        f"/api/v1/pipeline/nodes/{ta.id}/roles",
        json={"assignments": [
            {"role_code": "TA_HEAD", "user_id": test_user.id, "action": "revoke"},
        ]},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["applied"] == 1

    # Verify tree no longer shows the role
    tree_resp = await authenticated_client.get("/api/v1/pipeline/tree")
    ta_node = next(n for n in tree_resp.json()["data"] if n["id"] == str(ta.id))
    assert "TA_HEAD" not in ta_node["assigned_roles"] or len(ta_node["assigned_roles"]["TA_HEAD"]) == 0


@pytest.mark.asyncio
async def test_assign_invalid_role_code(
    authenticated_client: AsyncClient,
    db_session: AsyncSession,
    test_user,
):
    """POST /pipeline/nodes/{id}/roles returns 400 for invalid role code."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    await db_session.commit()

    resp = await authenticated_client.post(
        f"/api/v1/pipeline/nodes/{ta.id}/roles",
        json={"assignments": [
            {"role_code": "NONEXISTENT_ROLE", "user_id": test_user.id, "action": "assign"},
        ]},
    )
    assert resp.status_code == 400
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd D:\github\clinical-mdr\backend && python -m pytest tests/test_pipeline_roles.py -v --timeout=30 2>&1 | head -40`
Expected: FAIL — endpoints not found

- [ ] **Step 3: Implement `GET /pipeline/users/search`**

In `backend/app/api/routers/pipeline.py`, add this import near the top (after existing imports):

```python
from app.models.rbac import User
```

Add the endpoint after the existing `list_execution_jobs` endpoint (at the end of the file):

```python
# ============================================================
# User Search (for Role Assignment)
# ============================================================

@router.get("/users/search", summary="Search users for role assignment")
async def search_users(
    q: str = Query(..., min_length=2, description="Search string (min 2 chars)"),
    limit: int = Query(20, ge=1, le=100),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Search active users by username, display_name, or email."""
    pattern = f"%{q}%"
    result = await db.execute(
        select(User).where(
            User.is_active == True,  # noqa: E712
            User.is_deleted == False,  # noqa: E712
            (User.username.ilike(pattern))
            | (User.display_name.ilike(pattern))
            | (User.email.ilike(pattern)),
        ).limit(limit)
    )
    users = result.scalars().all()
    return _ok([
        {
            "user_id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "email": u.email,
            "department": u.department,
        }
        for u in users
    ])
```

- [ ] **Step 4: Implement `POST /pipeline/nodes/{id}/roles`**

Add these imports near the top of `pipeline.py`:

```python
from app.models.rbac import Role, User, UserScopeRole
from app.schemas.pipeline_schemas import RoleAssignmentBatch
```

Add the endpoint after `search_users`:

```python
@router.post("/nodes/{node_id}/roles", summary="Batch assign/revoke roles on a node")
async def batch_assign_roles(
    node_id: str,
    data: RoleAssignmentBatch,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Batch assign or revoke role assignments on a scope node."""
    node_id_int = _parse_id(node_id)
    if not node_id_int:
        raise HTTPException(status_code=400, detail="Invalid node_id format")

    # Verify node exists
    node_res = await db.execute(select(ScopeNode).where(ScopeNode.id == node_id_int))
    node = node_res.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    applied = 0
    for action in data.assignments:
        # Look up role by code
        role_res = await db.execute(select(Role).where(Role.code == action.role_code))
        role = role_res.scalar_one_or_none()
        if not role:
            raise HTTPException(
                status_code=400,
                detail=f"Role '{action.role_code}' not found",
            )

        if action.action == "assign":
            # Check if an active assignment already exists
            existing = await db.execute(
                select(UserScopeRole).where(
                    UserScopeRole.user_id == action.user_id,
                    UserScopeRole.scope_node_id == node_id_int,
                    UserScopeRole.role_id == role.id,
                    UserScopeRole.is_deleted == False,  # noqa: E712
                )
            )
            existing_usr = existing.scalar_one_or_none()
            if existing_usr:
                continue  # Already assigned, skip

            # Check for soft-deleted assignment to un-delete
            deleted = await db.execute(
                select(UserScopeRole).where(
                    UserScopeRole.user_id == action.user_id,
                    UserScopeRole.scope_node_id == node_id_int,
                    UserScopeRole.role_id == role.id,
                    UserScopeRole.is_deleted == True,  # noqa: E712
                )
            )
            deleted_usr = deleted.scalar_one_or_none()
            if deleted_usr:
                deleted_usr.is_deleted = False
                deleted_usr.deleted_at = None
                deleted_usr.granted_by = user.username
            else:
                # Create new assignment
                usr = UserScopeRole(
                    user_id=action.user_id,
                    scope_node_id=node_id_int,
                    role_id=role.id,
                    granted_by=user.username,
                )
                db.add(usr)
            applied += 1

        elif action.action == "revoke":
            # Soft delete active assignment
            existing = await db.execute(
                select(UserScopeRole).where(
                    UserScopeRole.user_id == action.user_id,
                    UserScopeRole.scope_node_id == node_id_int,
                    UserScopeRole.role_id == role.id,
                    UserScopeRole.is_deleted == False,  # noqa: E712
                )
            )
            existing_usr = existing.scalar_one_or_none()
            if existing_usr:
                existing_usr.soft_delete(deleted_by=user.username)
                applied += 1

    await db.commit()
    return _ok({"applied": applied})
```

- [ ] **Step 5: Extend `_format_node()` to include `assigned_roles`**

In `_format_node()`, after the `if node.node_type == NodeType.ANALYSIS:` block and before `return base_dict`, we need to add `assigned_roles`. However, querying per-node in `_format_node` is inefficient. Instead, modify `_build_tree()` to batch-load all role assignments.

Add a helper function before `_build_tree`:

```python
async def _load_assigned_roles(db: AsyncSession, node_ids: list[int]) -> dict[int, dict[str, list[dict]]]:
    """Batch load assigned roles for a list of node IDs."""
    if not node_ids:
        return {}

    result = await db.execute(
        select(UserScopeRole)
        .where(
            UserScopeRole.scope_node_id.in_(node_ids),
            UserScopeRole.is_deleted == False,  # noqa: E712
        )
        .options(
            selectinload(UserScopeRole.user),
            selectinload(UserScopeRole.role),
        )
    )
    rows = result.scalars().all()

    roles_map: dict[int, dict[str, list[dict]]] = {}
    for usr in rows:
        nid = usr.scope_node_id
        if nid not in roles_map:
            roles_map[nid] = {}
        role_code = usr.role.code
        if role_code not in roles_map[nid]:
            roles_map[nid][role_code] = []
        roles_map[nid][role_code].append({
            "user_id": usr.user.id,
            "username": usr.user.username,
            "display_name": usr.user.display_name,
            "email": usr.user.email,
        })
    return roles_map
```

Modify `_build_tree` to use it:

```python
async def _build_tree(db: AsyncSession) -> list[dict]:
    """Retrieve full active TA->Compound->Study->Analysis tree."""
    result = await db.execute(
        select(ScopeNode).where(ScopeNode.is_deleted == False)
    )
    all_nodes = result.scalars().all()

    # Batch load assigned roles
    node_ids = [n.id for n in all_nodes]
    roles_map = await _load_assigned_roles(db, node_ids)

    # Organize by parent ID
    children_map = {}
    for n in all_nodes:
        if n.parent_id not in children_map:
            children_map[n.parent_id] = []
        children_map[n.parent_id].append(n)

    def build_branch(node: ScopeNode):
        f = _format_node(node)
        f["assigned_roles"] = roles_map.get(node.id, {})
        kids = children_map.get(node.id, [])
        if kids:
            f["children"] = [build_branch(k) for k in kids]
        return f

    tas = [n for n in all_nodes if n.node_type == NodeType.TA]
    return [build_branch(ta) for ta in tas]
```

Note: The old `_build_tree` should be replaced entirely. The `_format_node` function stays the same — it does NOT need `assigned_roles` since `_build_tree` injects it.

- [ ] **Step 6: Run tests**

Run: `cd D:\github\clinical-mdr\backend && python -m pytest tests/test_pipeline_roles.py -v --timeout=30`
Expected: All 7 tests PASS

- [ ] **Step 7: Run existing pipeline tests to verify no regressions**

Run: `cd D:\github\clinical-mdr\backend && python -m pytest tests/test_pipeline.py -v --timeout=30`
Expected: All existing tests still PASS

- [ ] **Step 8: Commit**

```bash
git add backend/app/api/routers/pipeline.py backend/tests/test_pipeline_roles.py
git commit -m "feat(backend): add role assignment endpoints and user search for pipeline

- GET /pipeline/users/search: search active users by username/display_name/email
- POST /pipeline/nodes/{id}/roles: batch assign/revoke RBAC roles with soft delete
- GET /pipeline/tree now includes assigned_roles per node
- 7 new tests covering assign, revoke, tree enrichment, error cases"
```

---

## Task 3: Frontend — Types, URLs, and API Functions

**Files:**
- Modify: `frontend/src/pages/(base)/mdr/pipeline-management/types.ts`
- Modify: `frontend/src/service/urls/mdr.ts`
- Modify: `frontend/src/service/api/mdr.ts`

- [ ] **Step 1: Add types to `types.ts`**

Append to end of `frontend/src/pages/(base)/mdr/pipeline-management/types.ts`:

```typescript
// ==================== Role Assignment Types ====================

/** User info returned from role assignment APIs */
export interface AssignedRoleUser {
  userId: number;
  username: string;
  displayName: string;
  email: string;
}

/** Roles grouped by role code, keyed by role code */
export type AssignedRoles = Record<string, AssignedRoleUser[]>;

/** A single pending role change action */
export interface RoleChangeAction {
  roleCode: string;
  userId: number;
  action: 'assign' | 'revoke';
  userDetails?: AssignedRoleUser;
}
```

- [ ] **Step 2: Add URL constants to `mdr.ts`**

In `frontend/src/service/urls/mdr.ts`, add two new entries inside the `MDR_URLS` object, in the Pipeline Management section:

```typescript
  PIPELINE_NODE_ROLES: '/api/v1/pipeline/nodes/:id/roles',
  PIPELINE_USERS_SEARCH: '/api/v1/pipeline/users/search',
```

- [ ] **Step 3: Add API functions to `mdr.ts`**

In `frontend/src/service/api/mdr.ts`, add these two functions after the `getPipelineTree` function (around line 31):

```typescript
/** Save role assignments for a pipeline node (batch) */
export function saveNodeRoles(nodeId: string, assignments: Array<{ action: 'assign' | 'revoke'; role_code: string; user_id: number }>) {
  return request<{ applied: number }>({
    data: { assignments },
    method: 'post',
    url: MDR_URLS.PIPELINE_NODE_ROLES.replace(':id', nodeId),
  });
}

/** Search users for role assignment dropdown */
export function searchPipelineUsers(q: string, limit = 20) {
  return request<Array<{ department: string | null; display_name: string | null; email: string; user_id: number; username: string }>>({
    params: { limit, q },
    url: MDR_URLS.PIPELINE_USERS_SEARCH,
  });
}
```

- [ ] **Step 4: Run TypeScript type check**

Run: `cd D:\github\clinical-mdr\frontend && npx tsc --noEmit --skipLibCheck 2>&1 | head -30`
Expected: No errors related to the new code

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/\(base\)/mdr/pipeline-management/types.ts frontend/src/service/urls/mdr.ts frontend/src/service/api/mdr.ts
git commit -m "feat(frontend): add types, URLs, and API functions for role assignment"
```

---

## Task 4: Frontend — `useRoleAssignments` Hook

**Files:**
- Create: `frontend/src/pages/(base)/mdr/pipeline-management/hooks/useRoleAssignments.ts`

- [ ] **Step 1: Create the hook**

Create `frontend/src/pages/(base)/mdr/pipeline-management/hooks/useRoleAssignments.ts`:

```typescript
import { useCallback, useMemo, useRef, useState } from 'react';

import { saveNodeRoles } from '@/service/api/mdr';

import type { AssignedRoleUser, AssignedRoles, RoleChangeAction } from '../types';

const MAX_HISTORY = 30;

function cloneRoles(roles: AssignedRoles): AssignedRoles {
  return JSON.parse(JSON.stringify(roles));
}

function diffRoles(committed: AssignedRoles, working: AssignedRoles): RoleChangeAction[] {
  const allCodes = new Set([...Object.keys(committed), ...Object.keys(working)]);
  const actions: RoleChangeAction[] = [];

  for (const code of allCodes) {
    const cIds = new Set((committed[code] || []).map(u => u.userId));
    const wIds = new Set((working[code] || []).map(u => u.userId));
    const wUsers = new Map((working[code] || []).map(u => [u.userId, u]));

    for (const id of wIds) {
      if (!cIds.has(id)) {
        actions.push({ action: 'assign', roleCode: code, userId: id, userDetails: wUsers.get(id) });
      }
    }
    for (const id of cIds) {
      if (!wIds.has(id)) {
        actions.push({ action: 'revoke', roleCode: code, userId: id });
      }
    }
  }
  return actions;
}

export interface UseRoleAssignmentsReturn {
  assignUser: (roleCode: string, user: AssignedRoleUser) => void;
  assignedRoles: AssignedRoles;
  canRedo: boolean;
  canUndo: boolean;
  discardAll: () => void;
  isDirty: boolean;
  pendingChanges: RoleChangeAction[];
  pendingCount: number;
  redo: () => void;
  removeUser: (roleCode: string, userId: number) => void;
  resetRoles: (roles: AssignedRoles) => void;
  saveAll: () => Promise<void>;
  saving: boolean;
  undo: () => void;
}

export function useRoleAssignments(nodeId: string | null): UseRoleAssignmentsReturn {
  const [committed, setCommitted] = useState<AssignedRoles>({});
  const [working, setWorking] = useState<AssignedRoles>({});
  const [saving, setSaving] = useState(false);
  const pastRef = useRef<AssignedRoles[]>([]);
  const futureRef = useRef<AssignedRoles[]>([]);

  const isDirty = useMemo(() => JSON.stringify(committed) !== JSON.stringify(working), [committed, working]);
  const pendingChanges = useMemo(() => diffRoles(committed, working), [committed, working]);
  const pendingCount = pendingChanges.length;
  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  const resetRoles = useCallback((roles: AssignedRoles) => {
    const cloned = cloneRoles(roles);
    setCommitted(cloned);
    setWorking(cloned);
    pastRef.current = [];
    futureRef.current = [];
  }, []);

  const assignUser = useCallback((roleCode: string, user: AssignedRoleUser) => {
    setWorking(prev => {
      pastRef.current.push(cloneRoles(prev));
      if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
      futureRef.current = [];

      const current = prev[roleCode] || [];
      if (current.some(u => u.userId === user.userId)) return prev;
      return { ...prev, [roleCode]: [...current, user] };
    });
  }, []);

  const removeUser = useCallback((roleCode: string, userId: number) => {
    setWorking(prev => {
      pastRef.current.push(cloneRoles(prev));
      if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
      futureRef.current = [];

      const current = prev[roleCode] || [];
      if (!current.some(u => u.userId === userId)) return prev;
      return { ...prev, [roleCode]: current.filter(u => u.userId !== userId) };
    });
  }, []);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    setWorking(prev => {
      futureRef.current.push(cloneRoles(prev));
      const previous = pastRef.current.pop()!;
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    setWorking(prev => {
      pastRef.current.push(cloneRoles(prev));
      const next = futureRef.current.pop()!;
      return next;
    });
  }, []);

  const discardAll = useCallback(() => {
    setWorking(cloneRoles(committed));
    pastRef.current = [];
    futureRef.current = [];
  }, [committed]);

  const saveAll = useCallback(async () => {
    if (!nodeId || pendingCount === 0) return;
    setSaving(true);
    try {
      const assignments = pendingChanges.map(c => ({
        action: c.action,
        role_code: c.roleCode,
        user_id: c.userId,
      }));
      await saveNodeRoles(nodeId, assignments);
      setCommitted(cloneRoles(working));
      pastRef.current = [];
      futureRef.current = [];
    } finally {
      setSaving(false);
    }
  }, [nodeId, pendingCount, pendingChanges, working]);

  return {
    assignUser,
    assignedRoles: working,
    canRedo,
    canUndo,
    discardAll,
    isDirty,
    pendingChanges,
    pendingCount,
    redo,
    removeUser,
    resetRoles,
    saveAll,
    saving,
    undo,
  };
}
```

- [ ] **Step 2: Run TypeScript type check**

Run: `cd D:\github\clinical-mdr\frontend && npx tsc --noEmit --skipLibCheck 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/\(base\)/mdr/pipeline-management/hooks/useRoleAssignments.ts
git commit -m "feat(frontend): add useRoleAssignments hook with batch save and undo/redo"
```

---

## Task 5: Frontend — `RoleAssignmentSection` Component

**Files:**
- Create: `frontend/src/pages/(base)/mdr/pipeline-management/components/RoleAssignmentSection.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/pages/(base)/mdr/pipeline-management/components/RoleAssignmentSection.tsx`:

```typescript
import { CloseCircleOutlined, PlusOutlined, SwapOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Select, Space, Spin, Tag, Tooltip } from 'antd';
import React, { useCallback, useMemo, useState } from 'react';

import { searchPipelineUsers } from '@/service/api/mdr';

import type { AssignedRoleUser } from '../types';

/** Maps role code to user-facing label */
const ROLE_LABELS: Record<string, string> = {
  TA_HEAD: 'TA Lead Programmer',
  COMPOUND_LEAD: 'Product Lead Programmer',
  STUDY_LEAD_PROG: 'Study Lead Programmer',
  STUDY_PROG: 'Study Programmers',
};

interface RoleAssignmentSectionProps {
  assignedUsers: AssignedRoleUser[];
  editable: boolean;
  label?: string;
  maxCount?: number;
  onAssign: (user: AssignedRoleUser) => void;
  onRemove: (userId: number) => void;
  pendingChange?: 'added' | 'changed' | 'removed';
  roleCode: string;
}

const RoleAssignmentSection: React.FC<RoleAssignmentSectionProps> = ({
  assignedUsers,
  editable,
  label,
  maxCount,
  onAssign,
  onRemove,
  pendingChange,
  roleCode,
}) => {
  const [searchLoading, setSearchLoading] = useState(false);
  const [userOptions, setUserOptions] = useState<AssignedRoleUser[]>([]);
  const isSingle = maxCount === 1;
  const displayLabel = label || ROLE_LABELS[roleCode] || roleCode;
  const isBlue = !isSingle; // Multi-user = blue theme, single = green theme

  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) return;
    setSearchLoading(true);
    try {
      const results = await searchPipelineUsers(query);
      if (results) {
        setUserOptions(
          results.map(u => ({
            displayName: u.display_name,
            email: u.email,
            userId: u.user_id,
            username: u.username,
          }))
        );
      }
    } catch {
      // Ignore search errors
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const assignedIds = useMemo(() => new Set(assignedUsers.map(u => u.userId)), [assignedUsers]);

  const filteredOptions = useMemo(
    () => userOptions.filter(u => !assignedIds.has(u.userId)),
    [userOptions, assignedIds]
  );

  const borderColor = isBlue ? '#91d5ff' : '#b7eb8f';
  const bgColor = isBlue ? '#e6f7ff' : '#f6ffed';
  const titleColor = isBlue ? '#096dd9' : '#389e0d';

  return (
    <div
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        marginBottom: 10,
        padding: 12,
        position: 'relative',
      }}
    >
      {pendingChange && (
        <Tag
          color={pendingChange === 'added' ? 'success' : pendingChange === 'removed' ? 'error' : 'warning'}
          style={{ position: 'absolute', right: -4, top: -6, fontSize: 10 }}
        >
          {pendingChange === 'added' ? '+ADDED' : pendingChange === 'removed' ? 'REMOVED' : 'CHANGED'}
        </Tag>
      )}

      <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <Space size={4}>
          <span style={{ color: titleColor, fontSize: 14, fontWeight: 600 }}>{displayLabel}</span>
          <span style={{ color: '#999', fontSize: 11 }}>({roleCode})</span>
          {!isSingle && assignedUsers.length > 0 && (
            <Tag color="blue" style={{ fontSize: 11, marginLeft: 4 }}>
              {assignedUsers.length}
            </Tag>
          )}
        </Space>

        {editable && (
          <Space size={4}>
            {isSingle ? (
              <Button icon={<SwapOutlined />} size="small" style={{ fontSize: 11 }}>
                Change
              </Button>
            ) : (
              <Button icon={<PlusOutlined />} size="small" style={{ color: '#1677ff', fontSize: 11 }}>
                Add
              </Button>
            )}
          </Space>
        )}
      </div>

      {/* Assigned users list */}
      {assignedUsers.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {assignedUsers.map(user => (
            <div key={user.userId} style={{ alignItems: 'center', display: 'flex', gap: 8, padding: isSingle ? 0 : '4px 0' }}>
              <Avatar size={isSingle ? 28 : 24} style={{ backgroundColor: '#1677ff', fontSize: isSingle ? 12 : 10 }}>
                {(user.displayName || user.username).slice(0, 2).toUpperCase()}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{user.displayName || user.username}</div>
                <div style={{ color: '#999', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
              </div>
              {editable && (
                <Tooltip title="Remove">
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    size="small"
                    type="text"
                    onClick={() => onRemove(user.userId)}
                  />
                </Tooltip>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: '#d48806', fontSize: 12 }}>Not assigned</div>
      )}

      {/* Search dropdown for assigning new users (shown in edit mode when user interacts) */}
      {editable && (
        <div style={{ marginTop: 8 }}>
          <Select
            allowClear
            filterOption={false}
            notFoundContent={searchLoading ? <Spin size="small" /> : 'Type to search users...'}
            placeholder="Search users..."
            showSearch
            size="small"
            style={{ width: '100%' }}
            onSearch={handleSearch}
            onSelect={(_value: unknown, option: unknown) => {
              const opt = option as { user: AssignedRoleUser };
              if (opt?.user) onAssign(opt.user);
            }}
          >
            {filteredOptions.map(u => (
              <Select.Option key={u.userId} value={u.userId} user={u}>
                <Space>
                  <Avatar size={18} style={{ backgroundColor: '#722ed1', fontSize: 9 }}>
                    {(u.displayName || u.username).slice(0, 2).toUpperCase()}
                  </Avatar>
                  <span>{u.displayName || u.username}</span>
                  <span style={{ color: '#999', fontSize: 11 }}>({u.username})</span>
                </Space>
              </Select.Option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
};

export default RoleAssignmentSection;
```

- [ ] **Step 2: Export from components index**

In `frontend/src/pages/(base)/mdr/pipeline-management/components/index.ts`, add the export:

```typescript
export { default as RoleAssignmentSection } from './RoleAssignmentSection';
```

- [ ] **Step 3: Run TypeScript type check**

Run: `cd D:\github\clinical-mdr\frontend && npx tsc --noEmit --skipLibCheck 2>&1 | head -30`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/\(base\)/mdr/pipeline-management/components/RoleAssignmentSection.tsx frontend/src/pages/\(base\)/mdr/pipeline-management/components/index.ts
git commit -m "feat(frontend): add RoleAssignmentSection component with user search"
```

---

## Task 6: Frontend — Integrate into PortfolioAdminTab

**Files:**
- Modify: `frontend/src/pages/(base)/mdr/pipeline-management/index.tsx`

This is the largest task. The `PortfolioAdminTab` component needs:
1. `useRoleAssignments` hook
2. Role sections in the detail card
3. Save/Discard/Undo/Redo toolbar
4. "Lead" column in children table
5. Dirty-switch guard

- [ ] **Step 1: Add imports**

At the top of `index.tsx`, add to the existing imports:

```typescript
import { ExclamationCircleOutlined, RedoOutlined, UndoOutlined } from '@ant-design/icons';
```

Add the new component/hook imports after the existing component imports:

```typescript
import { RoleAssignmentSection } from './components';
import { useRoleAssignments } from './hooks/useRoleAssignments';
```

Add the `AssignedRoleUser` and `AssignedRoles` types to the imports from `./mockData`:

```typescript
import {
  type AnalysisNode,
  type AssignedRoleUser,
  type AssignedRoles,
  type NodeLifecycleStatus,
  type NodeType,
  type PipelineNode,
  type StudyNode,
  findNodeById,
  getAllowedChildType,
  getChildNodes,
  lifecycleConfig,
  nodeTypeConfig,
  statusConfig,
  studyPhases
} from './mockData';
```

Wait — the types `AssignedRoleUser` and `AssignedRoles` are in `./types.ts`, not `./mockData.ts`. Fix the import path. Add a separate import:

```typescript
import type { AssignedRoleUser, AssignedRoles } from './types';
```

- [ ] **Step 2: Add `useRoleAssignments` hook to `PortfolioAdminTab`**

Inside the `PortfolioAdminTab` component function body, after the existing `const { t } = useTranslation();` line and before the tree expansion logic, add:

```typescript
  // Role assignment state
  const nodeId = selectedNode?.dbId ? String(selectedNode.dbId) : null;
  const {
    assignUser,
    assignedRoles,
    canRedo,
    canUndo,
    discardAll,
    isDirty: isRoleDirty,
    pendingCount,
    redo: redoRoles,
    removeUser,
    resetRoles,
    saveAll: saveRoles,
    saving: savingRoles,
    undo: undoRoles,
  } = useRoleAssignments(nodeId);
```

- [ ] **Step 3: Reset roles when selected node changes**

Add an effect to sync roles when `selectedNode` changes. After the `useEffect` that populates the form (`if (isEditing && selectedNode)` block):

```typescript
  // Sync role assignments when selected node changes
  useEffect(() => {
    if (selectedNode) {
      const roles = (selectedNode as any).assigned_roles || {};
      resetRoles(roles);
    } else {
      resetRoles({});
    }
  }, [selectedNode?.id]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 4: Add dirty-switch guard to `handleSelect`**

In the parent `PipelineManagement` component, the `handleSelect` callback needs to check for dirty role state. However, `isRoleDirty` is inside `PortfolioAdminTab`, not `PipelineManagement`. Instead, handle this inside `PortfolioAdminTab`'s tree selection: wrap the `onSelect` call with a dirty check.

Find where `PortfolioAdminTab` renders the `<Tree>` component's `onSelect={onSelect}`. Replace with:

```typescript
onSelect={(keys) => {
  if (isRoleDirty) {
    Modal.confirm({
      cancelText: 'Discard & Switch',
      content: 'You have unsaved role changes. Save or discard before switching.',
      okText: 'Stay',
      onCancel: () => {
        discardAll();
        onSelect(keys);
      },
      title: 'Unsaved Changes',
    });
    return;
  }
  onSelect(keys);
}}
```

Apply this to both `<Tree>` instances (the one in the "no node selected" view and the one in the "node selected" view).

- [ ] **Step 5: Add Save/Discard/Undo/Redo toolbar to detail card header**

In the detail card's `extra` prop (around line 1065 in the original), the existing code has Edit/Archive buttons. Modify to add role save controls when dirty:

Find:
```typescript
extra={
  <Space>
    {canManage && (
      <Button ... >{isEditing ? ... : ...}</Button>
    )}
    {canArchiveNode && (...)}
  </Space>
}
```

Replace with:
```typescript
extra={
  <Space>
    {isRoleDirty && (
      <>
        <Tooltip title="Undo"><Button disabled={!canUndo} icon={<UndoOutlined />} size="small" type="text" onClick={undoRoles} /></Tooltip>
        <Tooltip title="Redo"><Button disabled={!canRedo} icon={<RedoOutlined />} size="small" type="text" onClick={redoRoles} /></Tooltip>
        <Tag color="warning" style={{ fontSize: 11 }}>{pendingCount} pending</Tag>
        <Button loading={savingRoles} size="small" type="primary" onClick={saveRoles}>Save Roles</Button>
        <Button size="small" onClick={discardAll}>Discard</Button>
      </>
    )}
    {canManage && (
      <Button
        disabled={isLocked}
        icon={<EditOutlined />}
        size="small"
        type="text"
        onClick={() => setIsEditing(!isEditing)}
      >
        {isEditing ? t('page.mdr.pipelineManagement.cancelEdit') : t('page.mdr.pipelineManagement.edit')}
      </Button>
    )}
    {canArchiveNode && (
      <Popconfirm
        disabled={isLocked}
        title={t('page.mdr.pipelineManagement.archiveConfirm')}
        onConfirm={() => onArchive(selectedNode.id)}
      >
        <Button danger disabled={isLocked} icon={<DeleteOutlined />} size="small" type="text">
          {t('page.mdr.pipelineManagement.archive')}
        </Button>
      </Popconfirm>
    )}
  </Space>
}
```

- [ ] **Step 6: Add role sections to detail card body**

After the locked warning `<div>` and before the existing edit form `<Form>` or `<Descriptions>` block, add role sections:

```typescript
      {/* Role Assignment Sections */}
      {nodeType === 'TA' && (
        <RoleAssignmentSection
          assignedUsers={assignedRoles['TA_HEAD'] || []}
          editable={isEditing}
          maxCount={1}
          onAssign={(user) => assignUser('TA_HEAD', user)}
          onRemove={(userId) => removeUser('TA_HEAD', userId)}
          roleCode="TA_HEAD"
        />
      )}
      {nodeType === 'COMPOUND' && (
        <RoleAssignmentSection
          assignedUsers={assignedRoles['COMPOUND_LEAD'] || []}
          editable={isEditing}
          maxCount={1}
          onAssign={(user) => assignUser('COMPOUND_LEAD', user)}
          onRemove={(userId) => removeUser('COMPOUND_LEAD', userId)}
          roleCode="COMPOUND_LEAD"
        />
      )}
      {nodeType === 'STUDY' && (
        <>
          <RoleAssignmentSection
            assignedUsers={assignedRoles['STUDY_LEAD_PROG'] || []}
            editable={isEditing}
            maxCount={1}
            onAssign={(user) => assignUser('STUDY_LEAD_PROG', user)}
            onRemove={(userId) => removeUser('STUDY_LEAD_PROG', userId)}
            roleCode="STUDY_LEAD_PROG"
          />
          <RoleAssignmentSection
            assignedUsers={assignedRoles['STUDY_PROG'] || []}
            editable={isEditing}
            onAssign={(user) => assignUser('STUDY_PROG', user)}
            onRemove={(userId) => removeUser('STUDY_PROG', userId)}
            roleCode="STUDY_PROG"
          />
        </>
      )}
      {nodeType === 'ANALYSIS' && (
        <div style={{ background: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 6, marginBottom: 16, padding: '8px 12px' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Inherits team from parent Study
          </Text>
        </div>
      )}
```

- [ ] **Step 7: Add "Lead" column to children table**

In the `childColumns` definition (around line 396 in the parent component), add a column after the `title` column and before the `nodeType` column:

```typescript
{
  dataIndex: 'lead',
  key: 'lead',
  render: (_: unknown, record: PipelineNode) => {
    const roles = (record as any).assigned_roles;
    if (!roles) return '-';
    const leadRole = roles['COMPOUND_LEAD'] || roles['STUDY_LEAD_PROG'] || roles['TA_HEAD'] || [];
    const lead = leadRole[0];
    if (!lead) return <span style={{ color: '#d48806', fontSize: 12 }}>Unassigned</span>;
    return (
      <Space size={4}>
        <Avatar size={18} style={{ backgroundColor: '#1677ff', fontSize: 9 }}>
          {(lead.displayName || lead.username).slice(0, 2).toUpperCase()}
        </Avatar>
        <span style={{ fontSize: 12 }}>{lead.displayName || lead.username}</span>
      </Space>
    );
  },
  title: 'Lead',
  width: 140,
},
```

- [ ] **Step 8: Run TypeScript type check**

Run: `cd D:\github\clinical-mdr\frontend && npx tsc --noEmit --skipLibCheck 2>&1 | head -40`
Expected: No errors. Fix any type issues found.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/\(base\)/mdr/pipeline-management/index.tsx
git commit -m "feat(frontend): integrate role assignment sections into PortfolioAdminTab

- Role sections for TA (TA_HEAD), Compound (COMPOUND_LEAD), Study (STUDY_LEAD_PROG + STUDY_PROG)
- Save All / Discard / Undo / Redo toolbar when pending changes
- Lead column in children table
- Dirty-switch guard when navigating away with unsaved changes"
```

---

## Task 7: Frontend — Verification & Polish

**Files:**
- Verify all files compile and the page renders

- [ ] **Step 1: Run full TypeScript type check**

Run: `cd D:\github\clinical-mdr\frontend && npx tsc --noEmit --skipLibCheck`
Expected: Clean pass

- [ ] **Step 2: Run frontend tests**

Run: `cd D:\github\clinical-mdr\frontend && npx vitest run 2>&1 | tail -20`
Expected: All existing tests pass (new feature, no test regressions)

- [ ] **Step 3: Run backend tests**

Run: `cd D:\github\clinical-mdr\backend && python -m pytest tests/test_pipeline_roles.py tests/test_pipeline.py -v --timeout=30`
Expected: All tests pass

- [ ] **Step 4: Start dev server and visually verify**

Run: `cd D:\github\clinical-mdr\frontend && pnpm dev`

Open browser to the pipeline management page. Verify:
1. Tree loads with existing nodes
2. Selecting a TA shows "TA Lead Programmer" section
3. Selecting a Compound shows "Product Lead Programmer" section
4. Selecting a Study shows both "Study Lead Programmer" and "Study Programmers" sections
5. Selecting an Analysis shows "Inherits team" banner
6. Click Edit → user search dropdown works
7. Assign/remove triggers pending changes badge
8. Save All → confirmation → API call

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -u && git commit -m "fix(frontend): polish role assignment integration"
```
