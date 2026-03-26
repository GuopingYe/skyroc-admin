# RBAC Permission System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete scope-based RBAC permission system with seed data, 5 new API endpoints, a frontend route guard, wired admin UIs, and an LDAP stub.

**Architecture:** Scope-based RBAC using `UserScopeRole` (user + scope_node + role) with materialized path inheritance (`ScopeNode.path.startswith`). Frontend enforces permissions via a route guard (menu visibility) and `<PermissionGuard>` (action visibility). Backend independently enforces the same permissions (double enforcement).

**Tech Stack:** Python 3.11 / FastAPI / SQLAlchemy 2.0 async / Alembic (backend); React 18 / TypeScript / @tanstack/react-query / Ant Design / Zustand (frontend)

**Spec:** `docs/superpowers/specs/2026-03-26-permission-system-design.md`

---

## File Map

| File | Status | Task |
|------|--------|------|
| `backend/alembic/versions/2026-03-26_001_rbac_seed.py` | CREATE | 1 |
| `backend/app/models/rbac.py` | MODIFY (User + UserScopeRole) | 1 |
| `backend/app/core/config.py` | MODIFY (LDAP fields) | 2 |
| `backend/app/services/ldap_sync_service.py` | CREATE | 2 |
| `backend/app/api/routers/rbac.py` | MODIFY (5 new endpoints + revoke fix) | 2 |
| `frontend/src/service/types/rbac.d.ts` | MODIFY (new types) | 2 |
| `frontend/src/service/urls/rbac.ts` | MODIFY (new URLs) | 3, 5, 6, 7 |
| `frontend/src/service/api/rbac.ts` | MODIFY (new fetch functions) | 3, 5, 6, 7 |
| `frontend/src/service/hooks/useRBAC.ts` | MODIFY (new hooks) | 3, 5, 6, 7 |
| `frontend/src/hooks/business/useUserPermissions.ts` | MODIFY (remove mock) | 3 |
| `frontend/src/features/router/routeGuard.ts` | CREATE | 4 |
| `frontend/src/pages/(base)/system/role-permission/index.tsx` | MODIFY (wire save) | 5 |
| `frontend/src/pages/(base)/system/user-management/index.tsx` | MODIFY (wire CRUD) | 6 |
| `frontend/src/pages/(base)/mdr/pipeline-management/components/AssignTeamPanel.tsx` | CREATE | 7 |
| `frontend/src/pages/(base)/mdr/pipeline-management/index.tsx` | MODIFY (add Assign Team button) | 7 |

---

## Task 1: DB Migration — Seed Data + Schema Fixes

**Files:**
- Create: `backend/alembic/versions/2026-03-26_001_rbac_seed.py`
- Modify: `backend/app/models/rbac.py`

**Context:** The `rbac_init` migration created all tables but without seed data. `UserScopeRole` is missing `SoftDeleteMixin` (no `is_deleted`/`deleted_at`/`deleted_by`), which violates 21 CFR Part 11. This migration fixes both gaps.

- [ ] **Step 1: Add `auth_provider` and `SoftDeleteMixin` to models**

  First, confirm `SoftDeleteMixin` in `backend/app/models/base.py` has a `soft_delete(deleted_by: str)` method (it does — see line 88). The plan uses `assignment.soft_delete(...)` in Task 2; no code change needed here.

  In `backend/app/models/rbac.py`:

  1. Add `auth_provider` field to `User` class (after `external_id`):
  ```python
  auth_provider: Mapped[str] = mapped_column(
      String(20),
      nullable=False,
      default="LOCAL",
      server_default="LOCAL",
      comment="Auth provider: LOCAL | LDAP",
  )
  ```

  2. Change `UserScopeRole` class signature from:
  ```python
  class UserScopeRole(Base, TimestampMixin):
  ```
  to:
  ```python
  class UserScopeRole(Base, TimestampMixin, SoftDeleteMixin):
  ```

  3. In `UserScopeRole.__table_args__`, replace the `UniqueConstraint` with a comment noting it becomes a partial index in the migration:
  ```python
  __table_args__ = (
      # Uniqueness enforced via partial index uq_user_scope_role_active (WHERE is_deleted=FALSE)
      # See migration 2026-03-26_001_rbac_seed
      Index("ix_user_scope_roles_user_scope", "user_id", "scope_node_id"),
      {"comment": "用户-作用域-角色关联表"},
  )
  ```

- [ ] **Step 2: Create the migration file**

  Create `backend/alembic/versions/2026-03-26_001_rbac_seed.py`:

  ```python
  """rbac seed data + schema fixes

  Revision ID: rbac_seed_001
  Revises: rbac_init
  Create Date: 2026-03-26 00:00:00.000000+00:00

  Changes:
  - Adds auth_provider column to users table
  - Adds is_deleted/deleted_at/deleted_by to user_scope_roles (21 CFR Part 11)
  - Drops old unique constraint, adds partial unique index (WHERE is_deleted=FALSE)
  - Seeds 9 roles (with sort_order=level), 29 permissions, and all role_permission rows
  """
  from typing import Sequence, Union

  import sqlalchemy as sa
  from alembic import op

  revision: str = "rbac_seed_001"
  down_revision: Union[str, None] = "rbac_init"
  branch_labels: Union[str, Sequence[str], None] = None
  depends_on: Union[str, Sequence[str], None] = None


  # ---------------------------------------------------------------------------
  # Seed data
  # ---------------------------------------------------------------------------

  ROLES = [
      # (code, name, description, sort_order, color)
      ("SUPER_ADMIN",      "Super Admin",             "Full platform access",                      100, "purple"),
      ("TA_HEAD",          "TA Head",                 "Therapeutic Area oversight",                 80, "blue"),
      ("COMPOUND_LEAD",    "Compound Lead",           "Compound-level management",                  70, "cyan"),
      ("LINE_MANAGER",     "Line Manager",            "Resource assignment manager",                65, "orange"),
      ("STUDY_LEAD_PROG",  "Study Lead Programmer",   "Lead programmer for a study",                60, "green"),
      ("STUDY_PROG",       "Study Programmer",        "Programmer on a study",                      40, "lime"),
      ("QC_REVIEWER",      "QC Reviewer",             "Quality control reviewer",                   35, "gold"),
      ("STATISTICIAN",     "Statistician",            "Statistical analysis and TFL shells",        30, "volcano"),
      ("VIEWER",           "Viewer",                  "Read-only access",                           10, "default"),
  ]

  PERMISSIONS = [
      # (code, name, description, category, sort_order)
      # --- page ---
      ("page:global-library:view",       "View Global Library",       "CDISC Global Library page",           "page", 10),
      ("page:study-spec:view",           "View Study Spec",           "Study Specification page",            "page", 20),
      ("page:mapping-studio:view",       "View Mapping Studio",       "Mapping Studio page",                 "page", 30),
      ("page:tfl-designer:view",         "View TFL Designer",         "TFL Designer page",                   "page", 40),
      ("page:tfl-template-library:view", "View TFL Template Library", "TFL Template Library page",           "page", 50),
      ("page:pipeline-management:view",  "View Pipeline Management",  "Pipeline Management page",            "page", 60),
      ("page:pr-approval:view",          "View PR Approval",          "PR Approval page",                    "page", 70),
      ("page:programming-tracker:view",  "View Programming Tracker",  "Programming Tracker page",            "page", 80),
      ("page:tracker:view",              "View Tracker",              "Tracker & Issues page",               "page", 90),
      ("page:user-management:view",      "View User Management",      "User Management admin page",          "page", 100),
      ("page:role-permission:view",      "View Role Permission Config","Role & Permission Config admin page", "page", 110),
      # --- metadata ---
      ("global-library:edit",  "Edit Global Library", "Edit CDISC standard library entries",              "metadata", 10),
      ("study-spec:edit",      "Edit Study Spec",     "Edit study specification config",                  "metadata", 20),
      ("mapping:edit",         "Edit Mapping",        "Create/edit SDTM/ADaM mapping rules",              "metadata", 30),
      ("mapping:delete",       "Delete Mapping",      "Soft-delete mapping rules (audit-logged)",         "metadata", 40),
      # --- tfl ---
      ("tfl:edit",          "Edit TFL",          "Create/edit TFL outputs in designer", "tfl", 10),
      ("tfl-template:edit", "Edit TFL Template", "Create/edit TFL shell templates",     "tfl", 20),
      # --- project ---
      ("pipeline:edit",        "Edit Pipeline",        "Edit pipeline milestones and timelines",       "project", 10),
      ("pipeline:assign-team", "Assign Pipeline Team", "Assign users to study roles (delegated admin)","project", 20),
      ("tracker:edit",         "Edit Tracker",         "Edit/close tracker items",                     "project", 30),
      ("tracker:assign",       "Assign Tracker",       "Assign tracker tasks to users",                "project", 40),
      ("issues:edit",          "Edit Issues",          "Create/edit issues within /mdr/tracker",       "project", 50),
      # --- qc ---
      ("pr:submit",  "Submit PR",  "Submit a pull request for review", "qc", 10),
      ("pr:approve", "Approve PR", "Approve a pull request",           "qc", 20),
      ("pr:reject",  "Reject PR",  "Reject a pull request",            "qc", 30),
      # --- admin ---
      ("user:create",          "Create User",          "Create a new local user account",              "admin", 10),
      ("user:edit",            "Edit User",            "Edit user profile",                            "admin", 20),
      ("user:deactivate",      "Deactivate User",      "Activate / deactivate a user account",         "admin", 30),
      ("role:edit-permissions","Edit Role Permissions","Update which permissions a role has",           "admin", 40),
  ]

  # Role -> list of permission codes it receives by default
  ROLE_PERMISSIONS: dict[str, list[str]] = {
      "SUPER_ADMIN": [p[0] for p in PERMISSIONS],  # all 29 permissions
      "TA_HEAD": [
          "page:global-library:view", "page:study-spec:view", "page:mapping-studio:view",
          "page:tfl-designer:view", "page:tfl-template-library:view", "page:pipeline-management:view",
          "page:pr-approval:view", "page:programming-tracker:view", "page:tracker:view",
          "pipeline:edit", "pipeline:assign-team", "tracker:edit", "tracker:assign",
          "issues:edit", "pr:submit", "pr:approve", "pr:reject",
      ],
      "COMPOUND_LEAD": [
          "page:global-library:view", "page:study-spec:view", "page:mapping-studio:view",
          "page:tfl-designer:view", "page:tfl-template-library:view", "page:pipeline-management:view",
          "page:pr-approval:view", "page:programming-tracker:view", "page:tracker:view",
          "pipeline:edit", "pipeline:assign-team", "tracker:edit", "tracker:assign",
          "issues:edit", "pr:submit", "pr:approve", "pr:reject",
      ],
      "LINE_MANAGER": [
          "page:global-library:view", "page:study-spec:view", "page:mapping-studio:view",
          "page:tfl-designer:view", "page:tfl-template-library:view", "page:pipeline-management:view",
          "page:pr-approval:view", "page:programming-tracker:view", "page:tracker:view",
          "pipeline:edit", "pipeline:assign-team", "tracker:edit", "tracker:assign",
          "issues:edit",
      ],
      "STUDY_LEAD_PROG": [
          "page:global-library:view", "page:study-spec:view", "page:mapping-studio:view",
          "page:tfl-designer:view", "page:tfl-template-library:view", "page:pipeline-management:view",
          "page:pr-approval:view", "page:programming-tracker:view", "page:tracker:view",
          "study-spec:edit", "mapping:edit", "mapping:delete",
          "tfl:edit", "tfl-template:edit",
          "pipeline:edit", "tracker:edit", "tracker:assign",
          "issues:edit", "pr:submit", "pr:approve", "pr:reject",
      ],
      "STUDY_PROG": [
          "page:global-library:view", "page:study-spec:view", "page:mapping-studio:view",
          "page:tfl-designer:view", "page:tfl-template-library:view",
          "page:pr-approval:view", "page:programming-tracker:view", "page:tracker:view",
          "study-spec:edit", "mapping:edit",
          "tfl:edit", "tfl-template:edit",
          "tracker:edit", "issues:edit", "pr:submit",
      ],
      "QC_REVIEWER": [
          "page:global-library:view", "page:study-spec:view", "page:mapping-studio:view",
          "page:tfl-designer:view", "page:tfl-template-library:view",
          "page:pr-approval:view", "page:programming-tracker:view", "page:tracker:view",
          "issues:edit", "pr:approve", "pr:reject",
      ],
      "STATISTICIAN": [
          "page:global-library:view", "page:study-spec:view",
          "page:tfl-designer:view", "page:tfl-template-library:view",
          "page:pr-approval:view", "page:programming-tracker:view", "page:tracker:view",
          "tfl:edit", "tfl-template:edit",
      ],
      "VIEWER": [
          "page:global-library:view", "page:study-spec:view", "page:mapping-studio:view",
          "page:tfl-designer:view", "page:tfl-template-library:view",
          "page:pr-approval:view", "page:programming-tracker:view", "page:tracker:view",
      ],
  }


  def upgrade() -> None:
      # ----------------------------------------------------------------
      # 1. Add auth_provider to users
      # ----------------------------------------------------------------
      op.add_column(
          "users",
          sa.Column(
              "auth_provider",
              sa.String(20),
              nullable=False,
              server_default="LOCAL",
              comment="Auth provider: LOCAL | LDAP",
          ),
      )

      # ----------------------------------------------------------------
      # 2. Add soft-delete columns to user_scope_roles (21 CFR Part 11)
      # ----------------------------------------------------------------
      op.add_column("user_scope_roles", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"))
      op.add_column("user_scope_roles", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
      op.add_column("user_scope_roles", sa.Column("deleted_by", sa.String(), nullable=True))

      # Drop the old unique constraint (was on all rows including deleted)
      op.drop_constraint("uq_user_scope_role", "user_scope_roles", type_="unique")

      # Add partial unique index (only enforces uniqueness for non-deleted rows)
      op.create_index(
          "uq_user_scope_role_active",
          "user_scope_roles",
          ["user_id", "scope_node_id", "role_id"],
          unique=True,
          postgresql_where=sa.text("is_deleted = FALSE"),
      )
      op.create_index("ix_user_scope_roles_is_deleted", "user_scope_roles", ["is_deleted"])

      # ----------------------------------------------------------------
      # 3. Seed roles, permissions, role_permissions
      # ----------------------------------------------------------------
      conn = op.get_bind()

      # Insert roles
      for code, name, description, sort_order, color in ROLES:
          conn.execute(
              sa.text(
                  "INSERT INTO roles (code, name, description, sort_order, color, is_system, created_by) "
                  "VALUES (:code, :name, :description, :sort_order, :color, TRUE, 'system') "
                  "ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, sort_order=EXCLUDED.sort_order"
              ),
              {"code": code, "name": name, "description": description, "sort_order": sort_order, "color": color},
          )

      # Insert permissions
      for i, (code, name, description, category, sort_order) in enumerate(PERMISSIONS):
          conn.execute(
              sa.text(
                  "INSERT INTO permissions (code, name, description, category, sort_order) "
                  "VALUES (:code, :name, :description, :category, :sort_order) "
                  "ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, category=EXCLUDED.category"
              ),
              {"code": code, "name": name, "description": description, "category": category, "sort_order": sort_order},
          )

      # Build role_permission rows
      for role_code, perm_codes in ROLE_PERMISSIONS.items():
          for perm_code in perm_codes:
              conn.execute(
                  sa.text(
                      "INSERT INTO role_permissions (role_id, permission_id) "
                      "SELECT r.id, p.id FROM roles r, permissions p "
                      "WHERE r.code = :role_code AND p.code = :perm_code "
                      "ON CONFLICT DO NOTHING"
                  ),
                  {"role_code": role_code, "perm_code": perm_code},
              )


  def downgrade() -> None:
      # WARNING: This downgrade uses raw SQL DELETE which bypasses the ORM AuditListener.
      # It must ONLY be run in development/test environments, never in production.
      # In production, seed data removal requires a supervised DBA operation with audit records.
      conn = op.get_bind()

      # Remove seed data
      conn.execute(sa.text("DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE is_system=TRUE)"))
      conn.execute(sa.text("DELETE FROM permissions WHERE code IN :codes"), {"codes": tuple(p[0] for p in PERMISSIONS)})
      conn.execute(sa.text("DELETE FROM roles WHERE code IN :codes"), {"codes": tuple(r[0] for r in ROLES)})

      # Restore old unique constraint
      op.drop_index("uq_user_scope_role_active", table_name="user_scope_roles")
      op.drop_index("ix_user_scope_roles_is_deleted", table_name="user_scope_roles")
      op.create_unique_constraint("uq_user_scope_role", "user_scope_roles", ["user_id", "scope_node_id", "role_id"])

      # Remove soft-delete columns
      op.drop_column("user_scope_roles", "deleted_by")
      op.drop_column("user_scope_roles", "deleted_at")
      op.drop_column("user_scope_roles", "is_deleted")

      # Remove auth_provider
      op.drop_column("users", "auth_provider")
  ```

- [ ] **Step 3: Run migration**

  ```bash
  cd backend
  alembic upgrade head
  ```

  Expected: `Running upgrade rbac_init -> rbac_seed_001, rbac seed data + schema fixes`

  Verify:
  ```bash
  python -c "
  import asyncio
  from app.database import async_session_factory
  from sqlalchemy import text
  async def check():
      async with async_session_factory() as db:
          result = await db.execute(text('SELECT COUNT(*) FROM roles'))
          print('Roles:', result.scalar())
          result = await db.execute(text('SELECT COUNT(*) FROM permissions'))
          print('Permissions:', result.scalar())
          result = await db.execute(text('SELECT COUNT(*) FROM role_permissions'))
          print('Role-Permissions:', result.scalar())
  asyncio.run(check())
  "
  ```

  Expected output: `Roles: 9`, `Permissions: 29`, `Role-Permissions: 85`

- [ ] **Step 4: Commit**

  ```bash
  cd ..
  git add backend/alembic/versions/2026-03-26_001_rbac_seed.py backend/app/models/rbac.py
  git commit -m "feat(db): seed 9 roles, 29 permissions; add auth_provider + soft-delete to user_scope_roles"
  ```

---

## Task 2: Backend — New Endpoints + LDAP Stub

**Files:**
- Modify: `backend/app/core/config.py`
- Create: `backend/app/services/ldap_sync_service.py`
- Modify: `backend/app/api/routers/rbac.py`

**Context:** Add 5 new API endpoints. Fix the existing `DELETE /admin/revoke` to use soft delete now that `UserScopeRole` has `SoftDeleteMixin`. Add LDAP config stub.

- [ ] **Step 1: Add LDAP settings to `backend/app/core/config.py`**

  In the `Settings` class, add these optional fields after `RATE_LIMIT_WINDOW_SECONDS`:

  ```python
  # LDAP (optional — all None by default; app starts normally when unset)
  LDAP_URL: str | None = None
  LDAP_BASE_DN: str | None = None
  LDAP_BIND_DN: str | None = None
  LDAP_BIND_PASSWORD: str | None = None
  LDAP_USER_FILTER: str = "(objectClass=person)"
  LDAP_ATTR_MAP: dict = {"uid": "username", "mail": "email", "cn": "display_name", "department": "department"}
  ```

- [ ] **Step 2: Create `backend/app/services/ldap_sync_service.py`**

  ```python
  """
  LDAP Sync Service stub.

  Interface is defined now. Implementation fills in later when LDAP_URL is configured.
  All callers check settings.LDAP_URL first.
  """
  from sqlalchemy.ext.asyncio import AsyncSession


  async def sync_users(db: AsyncSession) -> dict:
      """
      Sync users from LDAP directory.

      Sets auth_provider='LDAP' on imported users.
      Roles are NOT assigned automatically — Super Admin assigns them in User Management.

      Raises:
          NotImplementedError: Until LDAP_URL is configured and this service is implemented.
      """
      raise NotImplementedError("LDAP sync not yet implemented. Set LDAP_URL env var and implement this service.")
  ```

- [ ] **Step 3: Add new Pydantic schemas to `backend/app/api/routers/rbac.py`**

  Add these schemas below the existing `RevokePermissionRequest` class:

  ```python
  class UpdateRolePermissionsRequest(BaseModel):
      """Replace the full permission set for a role."""
      permission_ids: list[int] = Field(..., description="New complete list of permission IDs")


  class CreateUserRequest(BaseModel):
      """Create a local user account."""
      username: str = Field(..., min_length=3, max_length=100)
      email: str = Field(..., max_length=255)
      display_name: str | None = Field(None, max_length=255)
      department: str | None = Field(None, max_length=255)
      password: str = Field(..., min_length=8, description="Initial password (will be hashed)")


  class UpdateUserRequest(BaseModel):
      """Update user profile fields."""
      display_name: str | None = Field(None, max_length=255)
      email: str | None = Field(None, max_length=255)
      department: str | None = Field(None, max_length=255)


  class UpdateUserStatusRequest(BaseModel):
      """Activate or deactivate a user."""
      is_active: bool


  class AssignTeamRequest(BaseModel):
      """Delegated role assignment from Pipeline Management."""
      user_id: int = Field(..., description="Target user ID")
      scope_node_id: int = Field(..., description="Target scope node ID (must be descendant of caller's scope)")
      role_id: int = Field(..., description="Role to assign")


  class UserDetailSchema(BaseModel):
      """User detail response."""
      id: int
      username: str
      email: str
      display_name: str | None
      department: str | None
      is_active: bool
      is_superuser: bool
      auth_provider: str
      created_at: datetime

      class Config:
          from_attributes = True
  ```

- [ ] **Step 4: Fix `DELETE /admin/revoke` to use soft delete**

  In `backend/app/api/routers/rbac.py`, replace the existing `revoke_permission` endpoint body:

  ```python
  @rbac_router.delete("/admin/revoke", status_code=status.HTTP_204_NO_CONTENT)
  async def revoke_permission(
      db: Annotated[AsyncSession, Depends(get_db_session)],
      admin: CurrentUser,
      user_id: int = Query(...),
      scope_node_id: int = Query(...),
      role_id: int = Query(...),
      _: None = Depends(require_superuser),
  ):
      """Revoke a role assignment (soft delete for 21 CFR Part 11 compliance)."""
      result = await db.execute(
          select(UserScopeRole).where(
              UserScopeRole.user_id == user_id,
              UserScopeRole.scope_node_id == scope_node_id,
              UserScopeRole.role_id == role_id,
              UserScopeRole.is_deleted == False,
          )
      )
      assignment = result.scalar_one_or_none()

      if not assignment:
          raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

      assignment.soft_delete(deleted_by=admin.username)
  ```

- [ ] **Step 5: Add `PUT /rbac/roles/{role_id}/permissions`**

  Add this endpoint to `rbac.py`:

  ```python
  @rbac_router.put("/roles/{role_id}/permissions", status_code=status.HTTP_200_OK)
  async def update_role_permissions(
      role_id: int,
      request: UpdateRolePermissionsRequest,
      admin: CurrentUser,
      db: Annotated[AsyncSession, Depends(get_db_session)],
      _: None = Depends(require_superuser),
  ):
      """
      Replace the full permission set for a role.

      SUPER_ADMIN role permissions are immutable — raises 403 if attempted.
      Requires superuser (only SUPER_ADMIN has role:edit-permissions in seed data).
      """
      from sqlalchemy import delete as sql_delete

      role_result = await db.execute(
          select(Role).where(Role.id == role_id, Role.is_deleted == False)
      )
      role = role_result.scalar_one_or_none()
      if not role:
          raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

      if role.code == "SUPER_ADMIN":
          raise HTTPException(
              status_code=status.HTTP_403_FORBIDDEN,
              detail="SUPER_ADMIN permissions are immutable",
          )

      # Validate all permission IDs exist
      from app.models import RolePermission
      if request.permission_ids:
          perms_result = await db.execute(
              select(Permission).where(Permission.id.in_(request.permission_ids))
          )
          found_perms = perms_result.scalars().all()
          if len(found_perms) != len(request.permission_ids):
              raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more permission IDs not found")
      else:
          found_perms = []

      # Replace: delete existing, insert new
      await db.execute(sql_delete(RolePermission).where(RolePermission.role_id == role_id))
      for perm in found_perms:
          db.add(RolePermission(role_id=role_id, permission_id=perm.id))

      return {"role_id": role_id, "permission_count": len(found_perms)}
  ```

  In `rbac.py` top-level imports, add `RolePermission` to the existing `from app.models import ...` line. Do NOT add a duplicate inline import inside the function body.

- [ ] **Step 6: Add `POST /rbac/users`**

  ```python
  @rbac_router.post("/users", response_model=UserDetailSchema, status_code=status.HTTP_201_CREATED)
  async def create_user(
      request: CreateUserRequest,
      admin: CurrentUser,
      db: Annotated[AsyncSession, Depends(get_db_session)],
      _: None = Depends(require_superuser),
  ):
      """Create a new local user account. Requires superuser."""
      from app.core.security import get_password_hash

      # Check uniqueness
      existing = await db.execute(
          select(User).where(
              (User.username == request.username) | (User.email == request.email),
              User.is_deleted == False,
          )
      )
      if existing.scalar_one_or_none():
          raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username or email already exists")

      new_user = User(
          username=request.username,
          email=request.email,
          display_name=request.display_name,
          department=request.department,
          password_hash=get_password_hash(request.password),
          auth_provider="LOCAL",
          created_by=admin.username,
      )
      db.add(new_user)
      await db.flush()
      await db.refresh(new_user)
      return UserDetailSchema.model_validate(new_user)
  ```

- [ ] **Step 7: Add `PUT /rbac/users/{user_id}` and `PATCH /rbac/users/{user_id}/status`**

  ```python
  @rbac_router.put("/users/{user_id}", response_model=UserDetailSchema)
  async def update_user(
      user_id: int,
      request: UpdateUserRequest,
      admin: CurrentUser,
      db: Annotated[AsyncSession, Depends(get_db_session)],
      _: None = Depends(require_superuser),
  ):
      """Update user profile. Requires superuser."""
      result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
      user = result.scalar_one_or_none()
      if not user:
          raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

      if request.display_name is not None:
          user.display_name = request.display_name
      if request.email is not None:
          user.email = request.email
      if request.department is not None:
          user.department = request.department

      await db.flush()
      await db.refresh(user)
      return UserDetailSchema.model_validate(user)


  @rbac_router.patch("/users/{user_id}/status", response_model=UserDetailSchema)
  async def update_user_status(
      user_id: int,
      request: UpdateUserStatusRequest,
      admin: CurrentUser,
      db: Annotated[AsyncSession, Depends(get_db_session)],
      _: None = Depends(require_superuser),
  ):
      """Activate or deactivate a user. Requires superuser."""
      result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
      user = result.scalar_one_or_none()
      if not user:
          raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

      if user.is_superuser and not request.is_active:
          raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot deactivate a superuser account")

      user.is_active = request.is_active
      await db.flush()
      await db.refresh(user)
      return UserDetailSchema.model_validate(user)
  ```

- [ ] **Step 8: Add `POST /rbac/assign-team`**

  ```python
  @rbac_router.post("/assign-team", response_model=GrantPermissionResponse, status_code=status.HTTP_201_CREATED)
  async def assign_team(
      request: AssignTeamRequest,
      caller: CurrentUser,
      db: Annotated[AsyncSession, Depends(get_db_session)],
  ):
      """
      Delegated role assignment for Pipeline Management.

      Requires pipeline:assign-team in a scope that is an ancestor-or-equal of the target scope.
      Prevents privilege escalation: caller may only assign roles with sort_order <= their own max.
      """
      # 1. Load target scope
      scope_result = await db.execute(
          select(ScopeNode).where(ScopeNode.id == request.scope_node_id, ScopeNode.is_deleted == False)
      )
      target_scope = scope_result.scalar_one_or_none()
      if not target_scope:
          raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scope node not found")

      # 2. Superuser bypasses all scope checks
      if not caller.is_superuser:
          # Load all caller's active scope roles
          caller_roles_result = await db.execute(
              select(UserScopeRole)
              .options(selectinload(UserScopeRole.scope_node), selectinload(UserScopeRole.role))
              .where(
                  UserScopeRole.user_id == caller.id,
                  UserScopeRole.is_deleted == False,
                  or_(UserScopeRole.valid_from.is_(None), UserScopeRole.valid_from <= datetime.utcnow()),
                  or_(UserScopeRole.valid_until.is_(None), UserScopeRole.valid_until >= datetime.utcnow()),
              )
          )
          caller_scope_roles = caller_roles_result.scalars().all()

          # Find scopes where caller has pipeline:assign-team
          eligible_scope_paths = []
          caller_max_sort_order = 0
          for usr in caller_scope_roles:
              perm_codes = {p.code for p in usr.role.permissions}
              if "pipeline:assign-team" in perm_codes:
                  if usr.scope_node.path:
                      eligible_scope_paths.append(usr.scope_node.path)
              caller_max_sort_order = max(caller_max_sort_order, usr.role.sort_order)

          if not eligible_scope_paths:
              raise HTTPException(
                  status_code=status.HTTP_403_FORBIDDEN,
                  detail="Permission denied. Required: pipeline:assign-team",
              )

          # Verify target scope is a descendant of one of the caller's eligible scopes
          target_path = target_scope.path or ""
          if not any(target_path.startswith(ep) for ep in eligible_scope_paths):
              raise HTTPException(
                  status_code=status.HTTP_403_FORBIDDEN,
                  detail="Cannot assign roles outside your authorized scope",
              )

          # 3. Privilege escalation check
          role_result = await db.execute(select(Role).where(Role.id == request.role_id, Role.is_deleted == False))
          role_to_assign = role_result.scalar_one_or_none()
          if not role_to_assign:
              raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

          if role_to_assign.sort_order > caller_max_sort_order:
              raise HTTPException(
                  status_code=status.HTTP_403_FORBIDDEN,
                  detail="Cannot assign a role with higher privilege than your own",
              )

      # 4. Validate target user
      user_result = await db.execute(select(User).where(User.id == request.user_id, User.is_deleted == False))
      target_user = user_result.scalar_one_or_none()
      if not target_user:
          raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

      # 5. Check for existing active assignment
      existing = await db.execute(
          select(UserScopeRole).where(
              UserScopeRole.user_id == request.user_id,
              UserScopeRole.scope_node_id == request.scope_node_id,
              UserScopeRole.role_id == request.role_id,
              UserScopeRole.is_deleted == False,
          )
      )
      if existing.scalar_one_or_none():
          raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already has this role on this scope")

      # 6. Grant
      assignment = UserScopeRole(
          user_id=request.user_id,
          scope_node_id=request.scope_node_id,
          role_id=request.role_id,
          granted_by=caller.username,
      )
      db.add(assignment)
      await db.flush()
      await db.refresh(assignment, ["scope_node", "role"])

      return GrantPermissionResponse(
          success=True,
          message=f"Role assigned successfully",
          assignment=UserScopeRoleSchema.model_validate(assignment),
      )
  ```

- [ ] **Step 9: Add `POST /rbac/admin/sync-ldap` stub**

  ```python
  @rbac_router.post("/admin/sync-ldap", status_code=status.HTTP_501_NOT_IMPLEMENTED)
  async def sync_ldap(
      admin: CurrentUser,
      db: Annotated[AsyncSession, Depends(get_db_session)],
      _: None = Depends(require_superuser),
  ):
      """STUB: Sync users from LDAP. Returns 501 until LDAP_URL is configured."""
      raise HTTPException(
          status_code=status.HTTP_501_NOT_IMPLEMENTED,
          detail="LDAP sync not yet implemented. Configure LDAP_URL environment variable.",
      )
  ```

- [ ] **Step 10: Verify the backend starts and endpoints are reachable**

  ```bash
  cd backend
  python -m uvicorn app.main:app --reload --port 8080 &
  sleep 3
  curl -s http://localhost:8080/api/v1/rbac/roles | python -m json.tool | head -20
  ```

  Expected: JSON array of 9 role objects (after migration runs).

- [ ] **Step 11: Commit**

  ```bash
  git add backend/app/core/config.py backend/app/services/ldap_sync_service.py backend/app/api/routers/rbac.py
  git commit -m "feat(api): add role permissions PUT, user CRUD, assign-team, LDAP stub; fix revoke soft-delete"
  ```

---

## Task 3: Frontend Service Layer + Fix `useUserPermissions`

**Files:**
- Modify: `frontend/src/service/types/rbac.d.ts`
- Modify: `frontend/src/service/urls/rbac.ts`
- Modify: `frontend/src/service/api/rbac.ts`
- Modify: `frontend/src/service/hooks/useRBAC.ts`
- Modify: `frontend/src/hooks/business/useUserPermissions.ts`

**Context:** `useUserPermissions` currently imports from `mockData.ts`. This blocks all real permission checks. Fix it to use the real RBAC API.

- [ ] **Step 1: Add new types to `frontend/src/service/types/rbac.d.ts`**

  Note: `GrantPermissionResponse` is already defined in the file — do NOT re-add it.
  Note: `UserListItem.assignments: UserScopeRole[]` already exists in the file — confirmed at line 180.

  Add these interfaces inside `namespace RBAC`:

  ```typescript
  /** Update role permissions request */
  interface UpdateRolePermissionsRequest {
    permission_ids: number[];
  }

  /** Create user request */
  interface CreateUserRequest {
    username: string;
    email: string;
    display_name?: string | null;
    department?: string | null;
    password: string;
  }

  /** Update user request */
  interface UpdateUserRequest {
    display_name?: string | null;
    email?: string | null;
    department?: string | null;
  }

  /** Update user status request */
  interface UpdateUserStatusRequest {
    is_active: boolean;
  }

  /** Assign team request */
  interface AssignTeamRequest {
    user_id: number;
    scope_node_id: number;
    role_id: number;
  }

  /** User detail (returned by create/update) */
  interface UserDetail {
    id: number;
    username: string;
    email: string;
    display_name: string | null;
    department: string | null;
    is_active: boolean;
    is_superuser: boolean;
    auth_provider: string;
    created_at: string;
  }
  ```

- [ ] **Step 2: Add new URLs to `frontend/src/service/urls/rbac.ts`**

  ```typescript
  export const RBAC_URLS = {
    // existing...
    GET_MY_PERMISSIONS: '/api/v1/rbac/users/me/permissions',
    GET_PERMISSIONS: '/api/v1/rbac/permissions',
    GET_ROLES: '/api/v1/rbac/roles',
    GET_SCOPE_TREE: '/api/v1/rbac/scope-nodes/tree',
    GET_USER_ROLES: (userId: number) => `/api/v1/rbac/users/${userId}/roles`,
    GET_USERS: '/api/v1/rbac/users',
    GRANT_PERMISSION: '/api/v1/rbac/admin/grant',
    REVOKE_PERMISSION: '/api/v1/rbac/admin/revoke',
    // new
    UPDATE_ROLE_PERMISSIONS: (roleId: number) => `/api/v1/rbac/roles/${roleId}/permissions`,
    CREATE_USER: '/api/v1/rbac/users',
    UPDATE_USER: (userId: number) => `/api/v1/rbac/users/${userId}`,
    UPDATE_USER_STATUS: (userId: number) => `/api/v1/rbac/users/${userId}/status`,
    ASSIGN_TEAM: '/api/v1/rbac/assign-team',
    SYNC_LDAP: '/api/v1/rbac/admin/sync-ldap',
  } as const;
  ```

- [ ] **Step 3: Add new fetch functions to `frontend/src/service/api/rbac.ts`**

  Append to the existing file:

  ```typescript
  /** Update role permissions (replace full set) */
  export function fetchUpdateRolePermissions(roleId: number, data: Api.RBAC.UpdateRolePermissionsRequest) {
    return request<{ role_id: number; permission_count: number }>({
      data,
      method: 'put',
      url: RBAC_URLS.UPDATE_ROLE_PERMISSIONS(roleId)
    });
  }

  /** Create a new local user */
  export function fetchCreateUser(data: Api.RBAC.CreateUserRequest) {
    return request<Api.RBAC.UserDetail>({
      data,
      method: 'post',
      url: RBAC_URLS.CREATE_USER
    });
  }

  /** Update user profile */
  export function fetchUpdateUser(userId: number, data: Api.RBAC.UpdateUserRequest) {
    return request<Api.RBAC.UserDetail>({
      data,
      method: 'put',
      url: RBAC_URLS.UPDATE_USER(userId)
    });
  }

  /** Activate or deactivate a user */
  export function fetchUpdateUserStatus(userId: number, data: Api.RBAC.UpdateUserStatusRequest) {
    return request<Api.RBAC.UserDetail>({
      data,
      method: 'patch',
      url: RBAC_URLS.UPDATE_USER_STATUS(userId)
    });
  }

  /** Assign team member (delegated, requires pipeline:assign-team) */
  export function fetchAssignTeam(data: Api.RBAC.AssignTeamRequest) {
    return request<Api.RBAC.GrantPermissionResponse>({
      data,
      method: 'post',
      url: RBAC_URLS.ASSIGN_TEAM
    });
  }

  /** Sync users from LDAP (stub — returns 501 until configured) */
  export function fetchSyncLdap() {
    return request<void>({
      method: 'post',
      url: RBAC_URLS.SYNC_LDAP
    });
  }
  ```

- [ ] **Step 4: Add new hooks to `frontend/src/service/hooks/useRBAC.ts`**

  Append to the existing file:

  ```typescript
  /** Update role permissions mutation */
  export function useUpdateRolePermissions() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ roleId, permissionIds }: { roleId: number; permissionIds: number[] }) =>
        fetchUpdateRolePermissions(roleId, { permission_ids: permissionIds }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['rbac'] });
      }
    });
  }

  /** Create user mutation */
  export function useCreateUser() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: fetchCreateUser,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['rbac', 'users'] });
      }
    });
  }

  /** Update user mutation */
  export function useUpdateUser() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ userId, data }: { userId: number; data: Api.RBAC.UpdateUserRequest }) =>
        fetchUpdateUser(userId, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['rbac', 'users'] });
      }
    });
  }

  /** Update user status mutation */
  export function useUpdateUserStatus() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
        fetchUpdateUserStatus(userId, { is_active: isActive }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['rbac', 'users'] });
      }
    });
  }

  /** Assign team mutation */
  export function useAssignTeam() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: fetchAssignTeam,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['rbac'] });
      }
    });
  }

  /** Sync LDAP mutation */
  export function useSyncLdap() {
    return useMutation({ mutationFn: fetchSyncLdap });
  }
  ```

  **Replace ONLY the existing `from '../api'` import line** in `useRBAC.ts` (line 3–12). Preserve the `from '@tanstack/react-query'` and `from '../keys'` import lines unchanged:
  ```typescript
  import {
    fetchGetMyPermissions, fetchGetPermissions, fetchGetRoles, fetchGetScopeTree,
    fetchGetUserRoles, fetchGetUsers, fetchGrantPermission, fetchRevokePermission,
    fetchUpdateRolePermissions, fetchCreateUser, fetchUpdateUser,
    fetchUpdateUserStatus, fetchAssignTeam, fetchSyncLdap
  } from '../api';
  ```

- [ ] **Step 5: Fix `frontend/src/hooks/business/useUserPermissions.ts`**

  Replace the entire file:

  ```typescript
  /** User Permissions Hook — checks real API permissions via RBAC service */
  import { usePermissionCheck } from '@/service/hooks';
  import { useUserInfo } from '@/service/hooks/useAuth';

  /**
   * Business-level permission hook.
   *
   * Uses real permissions fetched from GET /api/v1/rbac/users/me/permissions.
   * All checks are scoped: pass the current scopeId from clinicalContextSlice.
   *
   * @example
   *   const { hasPermission, isSuperAdmin } = useUserPermissions();
   *   if (hasPermission('mapping:edit', currentScopeId)) { ... }
   */
  export function useUserPermissions() {
    const { data: userInfo } = useUserInfo();
    const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperuser } = usePermissionCheck();

    return {
      /** Check a single permission in the given scope */
      hasPermission,
      /** Check if user has any of the given permissions in the given scope */
      hasAnyPermission,
      /** Check if user has all of the given permissions in the given scope */
      hasAllPermissions,
      /** True when user is superuser (all permissions everywhere) */
      isSuperAdmin: isSuperuser,
      /** Raw user info from auth endpoint */
      userInfo
    };
  }

  export default useUserPermissions;
  ```

- [ ] **Step 6: Run TypeScript type check**

  ```bash
  cd frontend
  npx tsc --noEmit 2>&1 | head -50
  ```

  Expected: No errors related to the changed files. Fix any type errors before continuing.

- [ ] **Step 7: Commit**

  ```bash
  git add frontend/src/service/types/rbac.d.ts \
          frontend/src/service/urls/rbac.ts \
          frontend/src/service/api/rbac.ts \
          frontend/src/service/hooks/useRBAC.ts \
          frontend/src/hooks/business/useUserPermissions.ts
  git commit -m "feat(frontend): add RBAC service layer + fix useUserPermissions to use real API"
  ```

---

## Task 4: Route Guard

**Files:**
- Create: `frontend/src/features/router/routeGuard.ts`

**Context:** The route guard filters menu items by checking `page:xxx:view` permissions. When no scope is selected, it uses the union of all the user's granted scopes (menu-only). Once a scope is selected, it uses that specific scope. Direct navigation to a hidden route redirects to `/403`.

- [ ] **Step 1: Create `frontend/src/features/router/routeGuard.ts`**

  ```typescript
  /**
   * Route Guard — permission-based menu filtering and route protection.
   *
   * Union-scope fallback (menu only):
   *   When no scopeNodeId is selected, computes the union of all permissions
   *   across all scopes the user holds any role in. Used ONLY for menu visibility.
   *   Once a scope is selected, that scope's permissions are used exclusively.
   *
   * PermissionGuard components always receive scopeId directly (never union).
   */
  import type { NavigateFunction } from 'react-router-dom';

  import type { Api } from '@/service/types';

  /** Maps route path prefixes to the page permission code required to view them */
  export const PAGE_PERMISSION_MAP: Record<string, string> = {
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
  };

  /**
   * Compute the effective permission set for menu filtering.
   *
   * - If scopeNodeId is provided: use that scope's permissions only.
   * - If scopeNodeId is null/undefined: compute union of all scopes (menu-only fallback).
   * - If user is superuser: all permissions are available.
   */
  export function getEffectiveMenuPermissions(
    myPermissions: Api.RBAC.UserPermissionsResponse | undefined,
    scopeNodeId: number | null | undefined
  ): Set<string> {
    if (!myPermissions) return new Set();
    if (myPermissions.is_superuser) return new Set(Object.values(PAGE_PERMISSION_MAP));

    if (scopeNodeId != null) {
      const scopePerms = myPermissions.scope_permissions[String(scopeNodeId)] ?? [];
      return new Set(scopePerms);
    }

    // Union fallback: collect page:xxx:view from ALL scopes
    const union = new Set<string>();
    for (const perms of Object.values(myPermissions.scope_permissions)) {
      for (const perm of perms) {
        if (perm.startsWith('page:')) {
          union.add(perm);
        }
      }
    }
    return union;
  }

  /**
   * Check whether the user can access a given route path.
   *
   * Returns true if:
   *  - The route has no entry in PAGE_PERMISSION_MAP (not permission-gated)
   *  - The user has the required page permission in the effective set
   */
  export function canAccessRoute(
    routePath: string,
    effectivePermissions: Set<string>
  ): boolean {
    // Find the matching permission for this route
    const requiredPermission = Object.entries(PAGE_PERMISSION_MAP).find(([path]) =>
      routePath.startsWith(path)
    )?.[1];

    if (!requiredPermission) return true; // not gated
    return effectivePermissions.has(requiredPermission);
  }

  /**
   * Guard a route navigation: redirects to /403 if user lacks access.
   *
   * Call this in your router's loader or beforeEach equivalent.
   */
  export function guardRoute(
    routePath: string,
    myPermissions: Api.RBAC.UserPermissionsResponse | undefined,
    scopeNodeId: number | null | undefined,
    navigate: NavigateFunction
  ): boolean {
    if (!myPermissions) return false; // still loading

    const effectivePerms = getEffectiveMenuPermissions(myPermissions, scopeNodeId);
    const allowed = canAccessRoute(routePath, effectivePerms);

    if (!allowed) {
      navigate('/403', { replace: true });
      return false;
    }
    return true;
  }

  /**
   * Filter a list of menu items to only those the user can access.
   *
   * Menu items use `key` (not `path`) — matches App.Global.Menu from types/app.d.ts.
   * The key equals the route path (e.g. "/mdr/global-library").
   */
  export function filterMenuItems<T extends { key?: string }>(
    menuItems: T[],
    myPermissions: Api.RBAC.UserPermissionsResponse | undefined,
    scopeNodeId: number | null | undefined
  ): T[] {
    const effectivePerms = getEffectiveMenuPermissions(myPermissions, scopeNodeId);
    return menuItems.filter(item => {
      if (!item.key) return true; // no key = always visible (e.g., group headers)
      return canAccessRoute(item.key, effectivePerms);
    });
  }
  ```

- [ ] **Step 2: Wire route guard into `MenuProvider.tsx`**

  The menu system builds `menus` from routes in `frontend/src/features/menu/MenuProvider.tsx`. Wire `filterMenuItems` there.

  Add imports at the top of `MenuProvider.tsx`:
  ```typescript
  import { filterMenuItems } from '@/features/router/routeGuard';
  import { useMyPermissions } from '@/service/hooks';
  import { useAppSelector } from '@/hooks/redux'; // already present
  ```

  Add a selector for the clinical context's current scope (most specific available: analysis > study > product):
  ```typescript
  // In clinicalContextSlice, export: export const selectCurrentScopeNodeId = ...
  // For now read from state directly:
  const clinicalContext = useAppSelector(state => (state as any).clinicalContext?.context);
  const currentScopeNodeId: number | null =
    clinicalContext?.analysis?.scopeNodeId ??
    clinicalContext?.study?.scopeNodeId ??
    clinicalContext?.product?.scopeNodeId ??
    null;
  ```

  Fetch permissions (already available in React Query cache from app boot):
  ```typescript
  const { data: myPermissions } = useMyPermissions(true);
  ```

  Filter the computed menus before passing to context (replace the `const menus = ...` block):
  ```typescript
  const rawMenus = useMemo(
    () => filterRoutesToMenus(getBaseChildrenRoutes(router.reactRouter.routes)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router.reactRouter.routes, locale]
  );

  const menus = useMemo(
    () => filterMenuItems(rawMenus, myPermissions, currentScopeNodeId),
    [rawMenus, myPermissions, currentScopeNodeId]
  );
  ```

  **Note on direct URL navigation (403 redirect):** Add a `useEffect` in `MenuProvider` or a route loader to call `guardRoute` when the current route path changes. If the current route is not in `canAccessRoute`, navigate to `/403`:
  ```typescript
  useEffect(() => {
    if (!myPermissions) return;
    const path = route.path ?? '';
    if (!canAccessRoute(path, getEffectiveMenuPermissions(myPermissions, currentScopeNodeId))) {
      navigate('/403', { replace: true });
    }
  }, [route.path, myPermissions, currentScopeNodeId]);
  ```

  Also import `canAccessRoute` and `getEffectiveMenuPermissions` from `@/features/router/routeGuard`.

- [ ] **Step 3: Run TypeScript type check**

  ```bash
  cd frontend
  npx tsc --noEmit 2>&1 | grep -E "routeGuard|MenuProvider"
  ```

  Expected: No errors.

- [ ] **Step 4: Commit**

  ```bash
  git add frontend/src/features/router/routeGuard.ts \
          frontend/src/features/menu/MenuProvider.tsx
  git commit -m "feat(frontend): add route guard with union-scope fallback, wire into MenuProvider"
  ```

---

## Task 5: Wire Role Permission Save Button

**Files:**
- Modify: `frontend/src/pages/(base)/system/role-permission/index.tsx`

**Context:** The existing `handleSave` has a `// TODO` comment and only writes an audit log locally. Wire it to `PUT /rbac/roles/{role_id}/permissions`. Add a SUPER_ADMIN lock (disabled save, lock icon).

- [ ] **Step 1: Update imports and add mutation in `role-permission/index.tsx`**

  Add `useUpdateRolePermissions` to the hook imports:

  ```typescript
  import { usePermissions, useRoles, useUpdateRolePermissions } from '@/service/hooks';
  ```

  Add `LockOutlined` to the antd icons import.

  Inside the component, add the mutation hook after the existing hooks:

  ```typescript
  const { mutate: updateRolePermissions, isPending: isSaving } = useUpdateRolePermissions();

  const isSuperAdminSelected = useMemo(() => {
    return selectedRole?.code === 'SUPER_ADMIN';
  }, [selectedRole]);
  ```

- [ ] **Step 2: Replace `handleSave` with the real implementation**

  Replace the existing `handleSave` callback:

  ```typescript
  const handleSave = useCallback(() => {
    if (!selectedRole || !selectedRoleId) return;
    if (isSuperAdminSelected) return; // UI guard (backend also enforces)

    const permissionIds = (permissionsData || [])
      .filter(p => currentPermissions.includes(p.code))
      .map(p => p.id);

    updateRolePermissions(
      { roleId: selectedRoleId, permissionIds },
      {
        onSuccess: () => {
          messageApi.success(t('system.userManagement.rolePermission.saveSuccess'));
          // Clear local modifications for this role after successful save
          setModifiedPermissions(prev => {
            const next = { ...prev };
            delete next[selectedRoleId];
            return next;
          });
          auditLog(
            AuditActions.UPDATE,
            EntityTypes.ROLE,
            String(selectedRoleId),
            selectedRole.name,
            undefined,
            JSON.stringify(permissionIds),
            'Role permissions updated via API'
          );
        },
        onError: (error: any) => {
          const detail = error?.response?.data?.detail ?? 'Save failed';
          messageApi.error(detail);
        }
      }
    );
  }, [selectedRole, selectedRoleId, isSuperAdminSelected, currentPermissions, permissionsData,
      updateRolePermissions, messageApi, t]);
  ```

- [ ] **Step 3: Update the Save button to show lock for SUPER_ADMIN**

  Replace the existing Save button in the JSX:

  ```tsx
  extra={
    selectedRoleId && (
      <Tooltip title={isSuperAdminSelected ? 'SUPER_ADMIN permissions are immutable' : undefined}>
        <Button
          disabled={isSuperAdminSelected || isSaving}
          icon={isSuperAdminSelected ? <LockOutlined /> : undefined}
          loading={isSaving}
          size="small"
          type="primary"
          onClick={handleSave}
        >
          {t('system.userManagement.rolePermission.save')}
        </Button>
      </Tooltip>
    )
  }
  ```

- [ ] **Step 4: Run TypeScript check and verify**

  ```bash
  cd frontend
  npx tsc --noEmit 2>&1 | grep role-permission
  ```

  Expected: No errors.

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/pages/'(base)'/system/role-permission/index.tsx
  git commit -m "feat(frontend): wire role permission save button to PUT /rbac/roles/{id}/permissions"
  ```

---

## Task 6: Wire User Management CRUD

**Files:**
- Modify: `frontend/src/pages/(base)/system/user-management/index.tsx`

**Context:** The page already has Grant/Revoke wired. Wire the missing Create User, Edit User, and Deactivate User operations to the new API endpoints. Add "Sync from LDAP" button with "Coming soon" toast.

- [ ] **Step 1: Add mutation hooks to user-management**

  In `index.tsx`, update the hook imports:

  ```typescript
  import {
    useCreateUser, useGrantPermission, useRevokePermission,
    useRoles, useScopeTree, useUpdateUser, useUpdateUserStatus,
    useSyncLdap, useUsers
  } from '@/service/hooks';
  ```

  Inside the component, add:

  ```typescript
  const { mutate: createUser, isPending: isCreating } = useCreateUser();
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();
  const { mutate: updateUserStatus, isPending: isUpdatingStatus } = useUpdateUserStatus();
  const { mutate: syncLdap, isPending: isSyncing } = useSyncLdap();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Api.RBAC.UserListItem | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  ```

- [ ] **Step 2: Add Create User handler**

  ```typescript
  const handleCreateUser = useCallback((values: any) => {
    createUser(
      {
        username: values.username,
        email: values.email,
        display_name: values.display_name || null,
        department: values.department || null,
        password: values.password,
      },
      {
        onSuccess: () => {
          messageApi.success('User created successfully');
          setCreateModalOpen(false);
          createForm.resetFields();
        },
        onError: (error: any) => {
          messageApi.error(error?.response?.data?.detail ?? 'Failed to create user');
        }
      }
    );
  }, [createUser, messageApi, createForm]);
  ```

- [ ] **Step 3: Add Edit User handler**

  ```typescript
  const handleEditUser = useCallback((values: any) => {
    if (!editingUser) return;
    updateUser(
      {
        userId: editingUser.id,
        data: {
          display_name: values.display_name || null,
          email: values.email || null,
          department: values.department || null,
        }
      },
      {
        onSuccess: () => {
          messageApi.success('User updated successfully');
          setEditingUser(null);
          editForm.resetFields();
        },
        onError: (error: any) => {
          messageApi.error(error?.response?.data?.detail ?? 'Failed to update user');
        }
      }
    );
  }, [editingUser, updateUser, messageApi, editForm]);
  ```

- [ ] **Step 4: Add Deactivate handler**

  ```typescript
  const handleToggleUserStatus = useCallback((user: Api.RBAC.UserListItem) => {
    updateUserStatus(
      { userId: user.id, isActive: !user.is_active },
      {
        onSuccess: () => {
          messageApi.success(user.is_active ? 'User deactivated' : 'User activated');
        },
        onError: (error: any) => {
          messageApi.error(error?.response?.data?.detail ?? 'Failed to update status');
        }
      }
    );
  }, [updateUserStatus, messageApi]);
  ```

- [ ] **Step 5: Add Sync LDAP handler**

  ```typescript
  const handleSyncLdap = useCallback(() => {
    // Backend returns 501 until LDAP is configured — show "coming soon"
    syncLdap(undefined, {
      onError: () => {
        messageApi.info('LDAP sync is not yet configured. Coming soon.');
      }
    });
  }, [syncLdap, messageApi]);
  ```

- [ ] **Step 6: Add Create User modal JSX and Sync LDAP button**

  In the page toolbar area (near existing buttons), add:

  ```tsx
  <Button icon={<PlusOutlined />} type="primary" onClick={() => setCreateModalOpen(true)}>
    Create User
  </Button>
  <Button loading={isSyncing} onClick={handleSyncLdap}>
    Sync from LDAP
  </Button>

  {/* Create User Modal */}
  <Modal
    confirmLoading={isCreating}
    open={createModalOpen}
    title="Create User"
    onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
    onOk={() => createForm.submit()}
  >
    <Form form={createForm} layout="vertical" onFinish={handleCreateUser}>
      <Form.Item label="Username" name="username" rules={[{ required: true, min: 3 }]}>
        <Input />
      </Form.Item>
      <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
        <Input />
      </Form.Item>
      <Form.Item label="Display Name" name="display_name">
        <Input />
      </Form.Item>
      <Form.Item label="Department" name="department">
        <Input />
      </Form.Item>
      <Form.Item label="Password" name="password" rules={[{ required: true, min: 8 }]}>
        <Input.Password />
      </Form.Item>
    </Form>
  </Modal>

  {/* Edit User Modal */}
  <Modal
    confirmLoading={isUpdating}
    open={editingUser !== null}
    title="Edit User"
    onCancel={() => { setEditingUser(null); editForm.resetFields(); }}
    onOk={() => editForm.submit()}
  >
    <Form form={editForm} layout="vertical" onFinish={handleEditUser}>
      <Form.Item label="Display Name" name="display_name">
        <Input />
      </Form.Item>
      <Form.Item label="Email" name="email" rules={[{ type: 'email' }]}>
        <Input />
      </Form.Item>
      <Form.Item label="Department" name="department">
        <Input />
      </Form.Item>
    </Form>
  </Modal>
  ```

- [ ] **Step 7: Wire existing Edit and Deactivate buttons to new handlers**

  Find the existing Edit button (likely using `EditOutlined`) and update its `onClick`:
  ```tsx
  onClick={() => {
    setEditingUser(record);
    editForm.setFieldsValue({
      display_name: record.display_name,
      email: record.email,
      department: record.department,
    });
  }}
  ```

  Find the existing Delete/Deactivate button (`DeleteOutlined`) and update it:
  ```tsx
  <Popconfirm
    title={record.is_active ? 'Deactivate this user?' : 'Activate this user?'}
    onConfirm={() => handleToggleUserStatus(record)}
  >
    <Button
      danger={record.is_active}
      icon={<DeleteOutlined />}
      loading={isUpdatingStatus}
      size="small"
    />
  </Popconfirm>
  ```

- [ ] **Step 8: TypeScript check**

  ```bash
  cd frontend
  npx tsc --noEmit 2>&1 | grep user-management
  ```

  Expected: No errors.

- [ ] **Step 9: Commit**

  ```bash
  git add frontend/src/pages/'(base)'/system/user-management/index.tsx
  git commit -m "feat(frontend): wire user management CRUD to real API endpoints"
  ```

---

## Task 7: AssignTeamPanel in Pipeline Management

**Files:**
- Create: `frontend/src/pages/(base)/mdr/pipeline-management/components/AssignTeamPanel.tsx`
- Modify: `frontend/src/pages/(base)/mdr/pipeline-management/index.tsx`

**Context:** A slide-out Drawer component. Only visible to users with `pipeline:assign-team` in the current scope. Shows current team members with revoke option and an Add Member form.

- [ ] **Step 1: Create `AssignTeamPanel.tsx`**

  ```tsx
  /**
   * AssignTeamPanel — slide-out drawer for assigning users to study roles.
   *
   * Visible only when the current user has pipeline:assign-team in the selected scope.
   * Calls POST /rbac/assign-team for additions, DELETE /rbac/admin/revoke for removals.
   */
  import { DeleteOutlined, TeamOutlined } from '@ant-design/icons';
  import {
    Avatar,
    Button,
    Divider,
    Drawer,
    Form,
    List,
    Select,
    Space,
    Spin,
    Tag,
    Typography,
    message
  } from 'antd';
  import React, { useState } from 'react';

  import { useAssignTeam, useRevokePermission, useRoles, useUsers } from '@/service/hooks';

  const { Text, Title } = Typography;

  interface AssignTeamPanelProps {
    /** The scope node ID to assign team members to */
    scopeNodeId: number;
    /** Display name of the scope (e.g., "Study XYZ-001") */
    scopeLabel: string;
    open: boolean;
    onClose: () => void;
  }

  const AssignTeamPanel: React.FC<AssignTeamPanelProps> = ({
    scopeNodeId,
    scopeLabel,
    open,
    onClose
  }) => {
    const [messageApi, contextHolder] = message.useMessage();
    const [form] = Form.useForm();
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    const { data: allUsers, isLoading: usersLoading } = useUsers({ is_active: true });
    const { data: allRoles, isLoading: rolesLoading } = useRoles(false);
    const { mutate: assignTeam, isPending: isAssigning } = useAssignTeam();
    const { mutate: revokePermission, isPending: isRevoking } = useRevokePermission();

    const handleAssign = (values: { user_id: number; role_id: number }) => {
      assignTeam(
        { user_id: values.user_id, scope_node_id: scopeNodeId, role_id: values.role_id },
        {
          onSuccess: () => {
            messageApi.success('Team member assigned successfully');
            form.resetFields();
          },
          onError: (error: any) => {
            messageApi.error(error?.response?.data?.detail ?? 'Assignment failed');
          }
        }
      );
    };

    const handleRevoke = (userId: number, roleId: number) => {
      revokePermission(
        { user_id: userId, scope_node_id: scopeNodeId, role_id: roleId },
        {
          onSuccess: () => messageApi.success('Team member removed'),
          onError: (error: any) => {
            messageApi.error(error?.response?.data?.detail ?? 'Revoke failed');
          }
        }
      );
    };

    // Get current team (users with any role on this scope)
    const currentTeam = (allUsers ?? []).flatMap(user =>
      (user.assignments ?? [])
        .filter(a => a.scope_node.id === scopeNodeId)
        .map(a => ({ user, assignment: a }))
    );

    return (
      <Drawer
        open={open}
        title={
          <Space>
            <TeamOutlined />
            <span>Assign Team</span>
          </Space>
        }
        width={480}
        onClose={onClose}
      >
        {contextHolder}

        <Text type="secondary">Assigning to: <strong>{scopeLabel}</strong></Text>

        <Divider>Current Team</Divider>

        <Spin spinning={usersLoading || rolesLoading}>
          {currentTeam.length === 0 ? (
            <Text type="secondary">No team members assigned yet.</Text>
          ) : (
            <List
              dataSource={currentTeam}
              renderItem={({ user, assignment }) => (
                <List.Item
                  actions={[
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      key="revoke"
                      loading={isRevoking}
                      size="small"
                      onClick={() => handleRevoke(user.id, assignment.role.id)}
                    />
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar>{user.display_name?.[0] ?? user.username[0]}</Avatar>}
                    description={<Tag color={assignment.role.color ?? 'default'}>{assignment.role.name}</Tag>}
                    title={user.display_name ?? user.username}
                  />
                </List.Item>
              )}
            />
          )}
        </Spin>

        <Divider>Add Member</Divider>

        <Form form={form} layout="vertical" onFinish={handleAssign}>
          <Form.Item label="User" name="user_id" rules={[{ required: true }]}>
            <Select
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              loading={usersLoading}
              options={(allUsers ?? []).map(u => ({
                label: u.display_name ?? u.username,
                value: u.id
              }))}
              placeholder="Select user"
              showSearch
            />
          </Form.Item>

          <Form.Item label="Role" name="role_id" rules={[{ required: true }]}>
            <Select
              loading={rolesLoading}
              options={(allRoles ?? []).map(r => ({
                label: r.name,
                value: r.id
              }))}
              placeholder="Select role"
            />
          </Form.Item>

          <Button block htmlType="submit" loading={isAssigning} type="primary">
            Assign
          </Button>
        </Form>
      </Drawer>
    );
  };

  export default AssignTeamPanel;
  ```

- [ ] **Step 2: Add `AssignTeamPanel` to pipeline management index**

  In `frontend/src/pages/(base)/mdr/pipeline-management/index.tsx`, add imports:

  ```typescript
  import AssignTeamPanel from './components/AssignTeamPanel';
  import { usePermissionCheck } from '@/service/hooks';
  // Also need access to clinicalContext for current scopeNodeId
  ```

  Inside the component, add state and permission check:

  ```typescript
  const [assignPanelOpen, setAssignPanelOpen] = useState(false);
  const [assignTargetScope, setAssignTargetScope] = useState<{ id: number; label: string } | null>(null);
  const { hasPermission } = usePermissionCheck();

  // currentScopeNodeId comes from clinicalContextSlice or the selected study node
  // Use the existing context mechanism in the page
  ```

  Add the "Assign Team" button next to each study row (adapt to the existing table structure — look for the row action area in `MilestoneTrackerTable` or the page's main table):

  ```tsx
  {hasPermission('pipeline:assign-team', scopeNodeId) && (
    <Button
      icon={<TeamOutlined />}
      size="small"
      onClick={() => {
        setAssignTargetScope({ id: scopeNodeId, label: scopeLabel });
        setAssignPanelOpen(true);
      }}
    >
      Assign Team
    </Button>
  )}

  {assignTargetScope && (
    <AssignTeamPanel
      open={assignPanelOpen}
      scopeLabel={assignTargetScope.label}
      scopeNodeId={assignTargetScope.id}
      onClose={() => setAssignPanelOpen(false)}
    />
  )}
  ```

- [ ] **Step 3: Export from components index**

  In `frontend/src/pages/(base)/mdr/pipeline-management/components/index.ts`, add:

  ```typescript
  export { default as AssignTeamPanel } from './AssignTeamPanel';
  ```

- [ ] **Step 4: TypeScript check**

  ```bash
  cd frontend
  npx tsc --noEmit 2>&1 | grep -E "pipeline|AssignTeam"
  ```

  Expected: No errors.

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/pages/'(base)'/mdr/pipeline-management/components/AssignTeamPanel.tsx \
          frontend/src/pages/'(base)'/mdr/pipeline-management/components/index.ts \
          frontend/src/pages/'(base)'/mdr/pipeline-management/index.tsx
  git commit -m "feat(frontend): add AssignTeamPanel with delegated team assignment"
  ```

---

## Final Verification

- [ ] **Run backend and verify all new endpoints appear in Swagger:**

  ```bash
  cd backend
  python -m uvicorn app.main:app --reload --port 8080
  # Visit http://localhost:8080/docs
  ```

  Verify these endpoints exist: `PUT /rbac/roles/{role_id}/permissions`, `POST /rbac/users`,
  `PUT /rbac/users/{user_id}`, `PATCH /rbac/users/{user_id}/status`, `POST /rbac/assign-team`,
  `POST /rbac/admin/sync-ldap`

- [ ] **Run frontend and verify:**

  ```bash
  cd frontend
  pnpm dev
  # Visit http://localhost:5173
  ```

  1. Log in as admin — Role Permission page Save button works and is locked for SUPER_ADMIN
  2. User Management — Create User modal opens, edit/deactivate buttons call API
  3. Pipeline Management — "Assign Team" button visible for users with `pipeline:assign-team`
  4. No console errors about `mockData` imports

- [ ] **Final commit tag**

  ```bash
  git tag rbac-permission-system-v1
  git push origin main --tags
  ```
