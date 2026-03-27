"""
RBAC API endpoints.

Provides:
1. Current-user permission inspection
2. Admin grant/revoke and role-permission management
3. User CRUD for local auth users
4. Delegated scoped team assignment
"""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, get_user_permissions_for_scope, require_superuser
from app.core.config import settings
from app.core.security import hash_password
from app.database import get_db_session
from app.models import Permission, Role, RolePermission, ScopeNode, User, UserScopeRole
from app.models.audit_listener import set_audit_context
from app.models.enums import NodeType
from app.services.ldap_sync_service import sync_users

rbac_router = APIRouter(prefix="/rbac", tags=["RBAC"])


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _active_assignment_filters(now: datetime | None = None) -> list:
    current_time = now or _now_utc()
    return [
        UserScopeRole.is_deleted == False,  # noqa: E712
        or_(UserScopeRole.valid_from.is_(None), UserScopeRole.valid_from <= current_time),
        or_(UserScopeRole.valid_until.is_(None), UserScopeRole.valid_until >= current_time),
    ]


async def _get_user_or_404(db: AsyncSession, user_id: int) -> User:
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))  # noqa: E712
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with id {user_id} not found")
    return user


async def _get_scope_or_404(db: AsyncSession, scope_node_id: int) -> ScopeNode:
    result = await db.execute(
        select(ScopeNode).where(ScopeNode.id == scope_node_id, ScopeNode.is_deleted == False)  # noqa: E712
    )
    scope_node = result.scalar_one_or_none()
    if scope_node is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scope node with id {scope_node_id} not found",
        )
    return scope_node


async def _get_role_or_404(db: AsyncSession, role_id: int, *, include_permissions: bool = False) -> Role:
    query = select(Role).where(Role.id == role_id, Role.is_deleted == False)  # noqa: E712
    if include_permissions:
        query = query.options(selectinload(Role.permissions))
    result = await db.execute(query)
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role with id {role_id} not found")
    return role


async def _create_assignment(
    db: AsyncSession,
    acting_user: User,
    *,
    user_id: int,
    scope_node_id: int,
    role_id: int,
    valid_from: datetime | None = None,
    valid_until: datetime | None = None,
) -> "GrantPermissionResponse":
    target_user = await _get_user_or_404(db, user_id)
    scope_node = await _get_scope_or_404(db, scope_node_id)
    role = await _get_role_or_404(db, role_id)

    existing_result = await db.execute(
        select(UserScopeRole).where(
            UserScopeRole.user_id == user_id,
            UserScopeRole.scope_node_id == scope_node_id,
            UserScopeRole.role_id == role_id,
            UserScopeRole.is_deleted == False,  # noqa: E712
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already has this role on this scope node",
        )

    new_assignment = UserScopeRole(
        user_id=user_id,
        scope_node_id=scope_node_id,
        role_id=role_id,
        granted_by=acting_user.username,
        valid_from=valid_from,
        valid_until=valid_until,
    )
    db.add(new_assignment)
    await db.flush()
    assignment_result = await db.execute(
        select(UserScopeRole)
        .options(
            selectinload(UserScopeRole.role).selectinload(Role.permissions),
            selectinload(UserScopeRole.scope_node),
        )
        .where(UserScopeRole.id == new_assignment.id)
    )
    hydrated_assignment = assignment_result.scalar_one()

    return GrantPermissionResponse(
        success=True,
        message=(
            f"Successfully granted role '{role.name}' to user '{target_user.username}' "
            f"on scope '{scope_node.name}'"
        ),
        assignment=UserScopeRoleSchema.model_validate(hydrated_assignment),
    )


async def _get_active_user_assignments(db: AsyncSession, user_id: int) -> list[UserScopeRole]:
    result = await db.execute(
        select(UserScopeRole)
        .options(
            selectinload(UserScopeRole.role).selectinload(Role.permissions),
            selectinload(UserScopeRole.scope_node),
        )
        .where(UserScopeRole.user_id == user_id, *_active_assignment_filters())
    )
    return list(result.scalars().all())


class PermissionSchema(BaseModel):
    id: int
    code: str
    name: str
    description: str | None
    category: str

    class Config:
        from_attributes = True


class RoleSchema(BaseModel):
    id: int
    code: str
    name: str
    description: str | None
    is_system: bool
    color: str | None
    permissions: list[PermissionSchema] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ScopeNodeSchema(BaseModel):
    id: int
    code: str
    name: str
    node_type: NodeType
    path: str | None

    class Config:
        from_attributes = True


class UserScopeRoleSchema(BaseModel):
    id: int
    scope_node: ScopeNodeSchema
    role: RoleSchema
    granted_by: str
    granted_at: datetime
    valid_from: datetime | None
    valid_until: datetime | None

    class Config:
        from_attributes = True


class UserPermissionsResponse(BaseModel):
    user_id: int
    username: str
    is_superuser: bool
    scope_permissions: dict[str, list[str]] = Field(default_factory=dict)
    assigned_roles: list[UserScopeRoleSchema] = Field(default_factory=list)


class GrantPermissionRequest(BaseModel):
    user_id: int = Field(..., description="Target user ID")
    scope_node_id: int = Field(..., description="Scope node ID")
    role_id: int = Field(..., description="Role ID")
    valid_from: datetime | None = Field(None, description="Effective from")
    valid_until: datetime | None = Field(None, description="Effective until")


class GrantPermissionResponse(BaseModel):
    success: bool
    message: str
    assignment: UserScopeRoleSchema | None = None


class RevokePermissionRequest(BaseModel):
    user_id: int
    scope_node_id: int
    role_id: int


class UpdateRolePermissionsRequest(BaseModel):
    permission_ids: list[int] = Field(..., description="New complete list of permission IDs")


class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: str = Field(..., max_length=255)
    display_name: str | None = Field(None, max_length=255)
    department: str | None = Field(None, max_length=255)
    password: str = Field(..., min_length=8)


class UpdateUserRequest(BaseModel):
    display_name: str | None = Field(None, max_length=255)
    email: str | None = Field(None, max_length=255)
    department: str | None = Field(None, max_length=255)


class UpdateUserStatusRequest(BaseModel):
    is_active: bool


class AssignTeamRequest(BaseModel):
    user_id: int = Field(..., description="Target user ID")
    scope_node_id: int = Field(..., description="Target scope node ID")
    role_id: int = Field(..., description="Role to assign")


class UserDetailSchema(BaseModel):
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


class UserListSchema(BaseModel):
    id: int
    username: str
    email: str
    display_name: str | None
    is_active: bool
    is_superuser: bool
    department: str | None
    auth_provider: str
    last_login_at: datetime | None
    created_at: datetime
    assignments: list[UserScopeRoleSchema] = Field(default_factory=list)

    class Config:
        from_attributes = True


@rbac_router.get("/users/me/permissions", response_model=UserPermissionsResponse)
async def get_my_permissions(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    include_tree: bool = Query(False, description="Whether to include permissions for every scope node"),
):
    assigned_roles = await _get_active_user_assignments(db, user.id)
    scope_permissions: dict[str, list[str]] = {}

    if include_tree:
        scopes_result = await db.execute(select(ScopeNode).where(ScopeNode.is_deleted == False))  # noqa: E712
        all_scopes = scopes_result.scalars().all()

        for scope in all_scopes:
            perms = await get_user_permissions_for_scope(db, user, scope.id)
            if perms:
                scope_permissions[str(scope.id)] = sorted(perms)
    else:
        for assignment in assigned_roles:
            granted_path = assignment.scope_node.path
            if not granted_path:
                continue

            descendants_result = await db.execute(
                select(ScopeNode.id).where(
                    ScopeNode.path.startswith(granted_path),
                    ScopeNode.is_deleted == False,  # noqa: E712
                )
            )
            descendant_ids = [row[0] for row in descendants_result.fetchall()]

            for scope_id in descendant_ids:
                permission_bucket = scope_permissions.setdefault(str(scope_id), [])
                for permission in assignment.role.permissions:
                    if permission.code not in permission_bucket:
                        permission_bucket.append(permission.code)

    return UserPermissionsResponse(
        user_id=user.id,
        username=user.username,
        is_superuser=user.is_superuser,
        scope_permissions=scope_permissions,
        assigned_roles=[UserScopeRoleSchema.model_validate(assignment) for assignment in assigned_roles],
    )


@rbac_router.post(
    "/admin/grant",
    response_model=GrantPermissionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def grant_permission(
    request: GrantPermissionRequest,
    admin: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
):
    set_audit_context(
        user_id=admin.username,
        user_name=admin.username,
        context={"operation": "grant_permission"},
        reason="Grant scoped role assignment",
    )
    return await _create_assignment(
        db,
        admin,
        user_id=request.user_id,
        scope_node_id=request.scope_node_id,
        role_id=request.role_id,
        valid_from=request.valid_from,
        valid_until=request.valid_until,
    )


@rbac_router.delete("/admin/revoke", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_permission(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    admin: CurrentUser,
    user_id: int = Query(..., description="User ID"),
    scope_node_id: int = Query(..., description="Scope node ID"),
    role_id: int = Query(..., description="Role ID"),
    _: None = Depends(require_superuser),
):
    set_audit_context(
        user_id=admin.username,
        user_name=admin.username,
        context={"operation": "revoke_permission"},
        reason="Revoke scoped role assignment",
    )

    result = await db.execute(
        select(UserScopeRole).where(
            UserScopeRole.user_id == user_id,
            UserScopeRole.scope_node_id == scope_node_id,
            UserScopeRole.role_id == role_id,
            UserScopeRole.is_deleted == False,  # noqa: E712
        )
    )
    assignment = result.scalar_one_or_none()
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    assignment.soft_delete(deleted_by=admin.username)


@rbac_router.get("/roles", response_model=list[RoleSchema])
async def list_roles(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    include_permissions: bool = Query(True, description="Whether to include permissions"),
):
    query = select(Role).where(Role.is_deleted == False).order_by(Role.sort_order)  # noqa: E712
    if include_permissions:
        query = query.options(selectinload(Role.permissions))

    result = await db.execute(query)
    roles = result.scalars().all()
    return [RoleSchema.model_validate(role) for role in roles]


@rbac_router.put("/roles/{role_id}/permissions", response_model=RoleSchema)
async def update_role_permissions(
    role_id: int,
    request: UpdateRolePermissionsRequest,
    admin: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
):
    set_audit_context(
        user_id=admin.username,
        user_name=admin.username,
        context={"operation": "update_role_permissions", "role_id": role_id},
        reason="Update role permission matrix",
    )

    role = await _get_role_or_404(db, role_id, include_permissions=True)
    if role.code == "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SUPER_ADMIN permissions are immutable",
        )

    permission_ids = list(dict.fromkeys(request.permission_ids))
    permissions_result = await db.execute(
        select(Permission).where(Permission.id.in_(permission_ids)) if permission_ids else select(Permission).where(False)
    )
    permissions = permissions_result.scalars().all()
    if len(permissions) != len(permission_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more permission IDs are invalid")

    association_result = await db.execute(select(RolePermission).where(RolePermission.role_id == role_id))
    existing_associations = association_result.scalars().all()
    existing_permission_ids = {association.permission_id for association in existing_associations}
    desired_permission_ids = set(permission_ids)

    for association in existing_associations:
        if association.permission_id not in desired_permission_ids:
            await db.delete(association)

    for permission_id in desired_permission_ids - existing_permission_ids:
        db.add(RolePermission(role_id=role_id, permission_id=permission_id))

    await db.flush()

    updated_role = await _get_role_or_404(db, role_id, include_permissions=True)
    return RoleSchema.model_validate(updated_role)


@rbac_router.get("/permissions", response_model=list[PermissionSchema])
async def list_permissions(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    category: str | None = Query(None, description="Filter by category"),
):
    query = select(Permission).order_by(Permission.category, Permission.sort_order)
    if category:
        query = query.where(Permission.category == category)

    result = await db.execute(query)
    permissions = result.scalars().all()
    return [PermissionSchema.model_validate(permission) for permission in permissions]


@rbac_router.get("/scope-nodes/tree")
async def get_scope_tree(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    node_type: NodeType | None = Query(None, description="Filter by node type"),
):
    query = (
        select(ScopeNode)
        .where(ScopeNode.is_deleted == False)  # noqa: E712
        .order_by(ScopeNode.depth, ScopeNode.sort_order)
    )
    if node_type:
        query = query.where(ScopeNode.node_type == node_type)

    result = await db.execute(query)
    nodes = result.scalars().all()

    node_map = {node.id: {"node": node, "children": []} for node in nodes}
    root_nodes = []
    for node in nodes:
        if node.parent_id and node.parent_id in node_map:
            node_map[node.parent_id]["children"].append(node_map[node.id])
        else:
            root_nodes.append(node_map[node.id])

    def build_tree(node_data: dict) -> dict:
        node = node_data["node"]
        return {
            "id": node.id,
            "code": node.code,
            "name": node.name,
            "node_type": node.node_type.value,
            "path": node.path,
            "depth": node.depth,
            "children": [build_tree(child) for child in node_data["children"]],
        }

    return [build_tree(root) for root in root_nodes]


@rbac_router.get("/users/{user_id}/roles", response_model=list[UserScopeRoleSchema])
async def get_user_roles(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    admin: CurrentUser,
    _: None = Depends(require_superuser),
):
    query = (
        select(UserScopeRole)
        .options(
            selectinload(UserScopeRole.role).selectinload(Role.permissions),
            selectinload(UserScopeRole.scope_node),
        )
        .where(UserScopeRole.user_id == user_id, *_active_assignment_filters())
    )
    result = await db.execute(query)
    assignments = result.scalars().all()
    return [UserScopeRoleSchema.model_validate(assignment) for assignment in assignments]


@rbac_router.get("/users", response_model=list[UserListSchema])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    admin: CurrentUser,
    _: None = Depends(require_superuser),
    is_active: bool | None = Query(None, description="Filter by active status"),
    search: str | None = Query(None, description="Search username, email, display name, or department"),
):
    query = select(User).where(User.is_deleted == False)  # noqa: E712
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                User.username.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.display_name.ilike(search_pattern),
                User.department.ilike(search_pattern),
            )
        )
    query = query.order_by(User.created_at.desc())

    result = await db.execute(query)
    users = result.scalars().all()

    user_ids = [user.id for user in users]
    assignments_by_user: dict[int, list[UserScopeRole]] = {}
    if user_ids:
        assignments_result = await db.execute(
            select(UserScopeRole)
            .options(
                selectinload(UserScopeRole.role).selectinload(Role.permissions),
                selectinload(UserScopeRole.scope_node),
            )
            .where(UserScopeRole.user_id.in_(user_ids), *_active_assignment_filters())
        )
        for assignment in assignments_result.scalars().all():
            assignments_by_user.setdefault(assignment.user_id, []).append(assignment)

    response: list[UserListSchema] = []
    for user in users:
        response.append(
            UserListSchema(
                id=user.id,
                username=user.username,
                email=user.email,
                display_name=user.display_name,
                is_active=user.is_active,
                is_superuser=user.is_superuser,
                department=user.department,
                auth_provider=user.auth_provider,
                last_login_at=user.last_login_at,
                created_at=user.created_at,
                assignments=[
                    UserScopeRoleSchema.model_validate(assignment)
                    for assignment in assignments_by_user.get(user.id, [])
                ],
            )
        )

    return response


@rbac_router.post("/users", response_model=UserDetailSchema, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: CreateUserRequest,
    admin: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
):
    set_audit_context(
        user_id=admin.username,
        user_name=admin.username,
        context={"operation": "create_user", "username": request.username},
        reason="Create local user account",
    )

    duplicate_result = await db.execute(
        select(User).where(or_(User.username == request.username, User.email == request.email))
    )
    if duplicate_result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username or email already exists")

    user = User(
        username=request.username,
        email=request.email,
        display_name=request.display_name,
        department=request.department,
        password_hash=hash_password(request.password),
        auth_provider="LOCAL",
        created_by=admin.username,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    return UserDetailSchema.model_validate(user)


@rbac_router.put("/users/{user_id}", response_model=UserDetailSchema)
async def update_user(
    user_id: int,
    request: UpdateUserRequest,
    admin: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
):
    set_audit_context(
        user_id=admin.username,
        user_name=admin.username,
        context={"operation": "update_user", "user_id": user_id},
        reason="Update user profile",
    )

    user = await _get_user_or_404(db, user_id)
    if request.email and request.email != user.email:
        duplicate_email = await db.execute(select(User).where(User.email == request.email, User.id != user_id))
        if duplicate_email.scalar_one_or_none() is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    user.display_name = request.display_name
    user.email = request.email or user.email
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
    set_audit_context(
        user_id=admin.username,
        user_name=admin.username,
        context={"operation": "update_user_status", "user_id": user_id},
        reason="Activate or deactivate user",
    )

    user = await _get_user_or_404(db, user_id)
    user.is_active = request.is_active

    await db.flush()
    await db.refresh(user)
    return UserDetailSchema.model_validate(user)


@rbac_router.post("/assign-team", response_model=GrantPermissionResponse, status_code=status.HTTP_201_CREATED)
async def assign_team(
    request: AssignTeamRequest,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    set_audit_context(
        user_id=user.username,
        user_name=user.username,
        context={"operation": "assign_team", "scope_node_id": request.scope_node_id},
        reason="Delegated team assignment",
    )

    if user.is_superuser:
        return await _create_assignment(
            db,
            user,
            user_id=request.user_id,
            scope_node_id=request.scope_node_id,
            role_id=request.role_id,
        )

    target_scope = await _get_scope_or_404(db, request.scope_node_id)
    target_role = await _get_role_or_404(db, request.role_id)
    active_assignments = await _get_active_user_assignments(db, user.id)

    assignable_scope_found = False
    max_sort_order = -1
    for assignment in active_assignments:
        granted_path = assignment.scope_node.path
        if not granted_path or not target_scope.path or not target_scope.path.startswith(granted_path):
            continue

        max_sort_order = max(max_sort_order, assignment.role.sort_order)
        if any(permission.code == "pipeline:assign-team" for permission in assignment.role.permissions):
            assignable_scope_found = True

    if not assignable_scope_found:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied. Required: pipeline:assign-team",
        )

    if target_role.sort_order > max_sort_order:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot assign a role with higher privilege than your own at the target scope",
        )

    return await _create_assignment(
        db,
        user,
        user_id=request.user_id,
        scope_node_id=request.scope_node_id,
        role_id=request.role_id,
    )


@rbac_router.post("/admin/sync-ldap")
async def sync_ldap_users(
    admin: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    _: None = Depends(require_superuser),
):
    set_audit_context(
        user_id=admin.username,
        user_name=admin.username,
        context={"operation": "sync_ldap"},
        reason="Sync users from LDAP",
    )

    if not settings.LDAP_URL:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="LDAP sync not yet configured")

    try:
        return await sync_users(db)
    except NotImplementedError as exc:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(exc)) from exc
