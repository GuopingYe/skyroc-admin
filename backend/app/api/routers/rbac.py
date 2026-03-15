"""
RBAC API 端点

提供：
1. 获取当前用户权限列表
2. 用户权限分配（管理员接口）
3. 角色、权限管理接口
"""
from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import (
    CurrentUser,
    RequirePermission,
    get_user_permissions_for_scope,
    require_permission,
    require_superuser,
)
from app.database import get_db_session
from app.models import Permission, Role, ScopeNode, User, UserScopeRole
from app.models.enums import NodeType


# ============================================================
# Router
# ============================================================

rbac_router = APIRouter(prefix="/rbac", tags=["RBAC"])


# ============================================================
# Pydantic Schemas
# ============================================================


class PermissionSchema(BaseModel):
    """权限响应 Schema"""

    id: int
    code: str
    name: str
    description: str | None
    category: str

    class Config:
        from_attributes = True


class RoleSchema(BaseModel):
    """角色响应 Schema"""

    id: int
    code: str
    name: str
    description: str | None
    is_system: bool
    color: str | None
    permissions: list[PermissionSchema] = []

    class Config:
        from_attributes = True


class ScopeNodeSchema(BaseModel):
    """作用域节点简要 Schema"""

    id: int
    code: str
    name: str
    node_type: NodeType
    path: str | None

    class Config:
        from_attributes = True


class UserScopeRoleSchema(BaseModel):
    """用户作用域角色响应 Schema"""

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
    """用户权限响应"""

    user_id: int
    username: str
    is_superuser: bool
    scope_permissions: dict[str, list[str]] = Field(
        default_factory=dict,
        description="作用域 ID -> 权限代码列表的映射",
    )
    assigned_roles: list[UserScopeRoleSchema] = []


class GrantPermissionRequest(BaseModel):
    """权限分配请求"""

    user_id: int = Field(..., description="目标用户 ID")
    scope_node_id: int = Field(..., description="作用域节点 ID")
    role_id: int = Field(..., description="角色 ID")
    valid_from: datetime | None = Field(None, description="生效时间")
    valid_until: datetime | None = Field(None, description="失效时间")


class GrantPermissionResponse(BaseModel):
    """权限分配响应"""

    success: bool
    message: str
    assignment: UserScopeRoleSchema | None = None


class RevokePermissionRequest(BaseModel):
    """权限撤销请求"""

    user_id: int
    scope_node_id: int
    role_id: int


# ============================================================
# API Endpoints
# ============================================================


@rbac_router.get("/users/me/permissions", response_model=UserPermissionsResponse)
async def get_my_permissions(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    include_tree: bool = Query(False, description="是否包含所有作用域的权限树"),
):
    """
    获取当前用户的权限清单

    前端据此：
    1. 隐藏/显示按钮
    2. 禁用/启用操作
    3. 渲染权限树

    Args:
        include_tree: 是否计算每个作用域的权限详情
    """
    # 获取用户的所有授权记录
    query = (
        select(UserScopeRole)
        .options(
            selectinload(UserScopeRole.role).selectinload(Role.permissions),
            selectinload(UserScopeRole.scope_node),
        )
        .where(
            UserScopeRole.user_id == user.id,
            or_(
                UserScopeRole.valid_from.is_(None),
                UserScopeRole.valid_from <= datetime.utcnow(),
            ),
            or_(
                UserScopeRole.valid_until.is_(None),
                UserScopeRole.valid_until >= datetime.utcnow(),
            ),
        )
    )

    result = await db.execute(query)
    assigned_roles = result.scalars().all()

    # 构建作用域权限映射
    scope_permissions: dict[str, list[str]] = {}

    if include_tree:
        # 获取所有作用域节点
        scopes_result = await db.execute(
            select(ScopeNode).where(ScopeNode.is_deleted == False)
        )
        all_scopes = scopes_result.scalars().all()

        for scope in all_scopes:
            perms = await get_user_permissions_for_scope(db, user, scope.id)
            if perms:
                scope_permissions[str(scope.id)] = list(perms)
    else:
        # 只计算已授权的作用域及其后代
        for usr in assigned_roles:
            if usr.scope_node.path:
                # 找到所有后代节点
                descendants_result = await db.execute(
                    select(ScopeNode.id).where(
                        ScopeNode.path.startswith(usr.scope_node.path),
                        ScopeNode.is_deleted == False,
                    )
                )
                descendant_ids = [row[0] for row in descendants_result.fetchall()]

                for scope_id in descendant_ids:
                    scope_id_str = str(scope_id)
                    if scope_id_str not in scope_permissions:
                        scope_permissions[scope_id_str] = []

                    for perm in usr.role.permissions:
                        if perm.code not in scope_permissions[scope_id_str]:
                            scope_permissions[scope_id_str].append(perm.code)

    return UserPermissionsResponse(
        user_id=user.id,
        username=user.username,
        is_superuser=user.is_superuser,
        scope_permissions=scope_permissions,
        assigned_roles=[
            UserScopeRoleSchema.model_validate(usr) for usr in assigned_roles
        ],
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
    """
    给用户分配角色（管理员接口）

    需要：
    1. 超级管理员权限
    2. 目标用户存在
    3. 作用域节点存在
    4. 角色存在
    5. 不重复分配
    """
    # 验证目标用户
    user_result = await db.execute(
        select(User).where(User.id == request.user_id, User.is_deleted == False)
    )
    target_user = user_result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {request.user_id} not found",
        )

    # 验证作用域节点
    scope_result = await db.execute(
        select(ScopeNode).where(ScopeNode.id == request.scope_node_id, ScopeNode.is_deleted == False)
    )
    scope_node = scope_result.scalar_one_or_none()
    if not scope_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scope node with id {request.scope_node_id} not found",
        )

    # 验证角色
    role_result = await db.execute(
        select(Role).where(Role.id == request.role_id, Role.is_deleted == False)
    )
    role = role_result.scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with id {request.role_id} not found",
        )

    # 检查是否已存在相同授权
    existing_result = await db.execute(
        select(UserScopeRole).where(
            UserScopeRole.user_id == request.user_id,
            UserScopeRole.scope_node_id == request.scope_node_id,
            UserScopeRole.role_id == request.role_id,
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already has this role on this scope node",
        )

    # 创建授权
    new_assignment = UserScopeRole(
        user_id=request.user_id,
        scope_node_id=request.scope_node_id,
        role_id=request.role_id,
        granted_by=admin.username,
        valid_from=request.valid_from,
        valid_until=request.valid_until,
    )

    db.add(new_assignment)
    await db.flush()
    await db.refresh(new_assignment, ["scope_node", "role"])

    return GrantPermissionResponse(
        success=True,
        message=f"Successfully granted role '{role.name}' to user '{target_user.username}' on scope '{scope_node.name}'",
        assignment=UserScopeRoleSchema.model_validate(new_assignment),
    )


@rbac_router.delete("/admin/revoke", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_permission(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    admin: CurrentUser,
    user_id: int = Query(..., description="用户 ID"),
    scope_node_id: int = Query(..., description="作用域节点 ID"),
    role_id: int = Query(..., description="角色 ID"),
    _: None = Depends(require_superuser),
):
    """
    撤销用户的角色授权（管理员接口）

    需要：超级管理员权限
    """
    # 查找授权记录
    result = await db.execute(
        select(UserScopeRole).where(
            UserScopeRole.user_id == user_id,
            UserScopeRole.scope_node_id == scope_node_id,
            UserScopeRole.role_id == role_id,
        )
    )
    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    await db.delete(assignment)


@rbac_router.get("/roles", response_model=list[RoleSchema])
async def list_roles(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    include_permissions: bool = Query(True, description="是否包含权限列表"),
):
    """
    获取所有角色列表

    用于前端权限配置页面的角色选择器
    """
    query = select(Role).where(Role.is_deleted == False).order_by(Role.sort_order)

    if include_permissions:
        query = query.options(selectinload(Role.permissions))

    result = await db.execute(query)
    roles = result.scalars().all()

    return [RoleSchema.model_validate(role) for role in roles]


@rbac_router.get("/permissions", response_model=list[PermissionSchema])
async def list_permissions(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    category: str | None = Query(None, description="按分类筛选"),
):
    """
    获取所有权限列表

    用于前端权限矩阵的渲染
    """
    query = select(Permission).order_by(Permission.category, Permission.sort_order)

    if category:
        query = query.where(Permission.category == category)

    result = await db.execute(query)
    permissions = result.scalars().all()

    return [PermissionSchema.model_validate(perm) for perm in permissions]


@rbac_router.get("/scope-nodes/tree")
async def get_scope_tree(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    node_type: NodeType | None = Query(None, description="按节点类型筛选"),
):
    """
    获取作用域节点树

    用于前端权限分配的作用域选择器
    """
    query = (
        select(ScopeNode)
        .where(ScopeNode.is_deleted == False)
        .order_by(ScopeNode.depth, ScopeNode.sort_order)
    )

    if node_type:
        query = query.where(ScopeNode.node_type == node_type)

    result = await db.execute(query)
    nodes = result.scalars().all()

    # 构建树结构
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
    """
    获取指定用户的所有角色分配

    用于管理员查看用户的权限详情
    """
    query = (
        select(UserScopeRole)
        .options(
            selectinload(UserScopeRole.role).selectinload(Role.permissions),
            selectinload(UserScopeRole.scope_node),
        )
        .where(UserScopeRole.user_id == user_id)
    )

    result = await db.execute(query)
    assignments = result.scalars().all()

    return [UserScopeRoleSchema.model_validate(assignment) for assignment in assignments]


class UserListSchema(BaseModel):
    """用户列表响应 Schema"""

    id: int
    username: str
    email: str
    display_name: str | None
    is_active: bool
    is_superuser: bool
    department: str | None
    last_login_at: datetime | None
    created_at: datetime
    assignments: list[UserScopeRoleSchema] = []

    class Config:
        from_attributes = True


@rbac_router.get("/users", response_model=list[UserListSchema])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    admin: CurrentUser,
    _: None = Depends(require_superuser),
    is_active: bool | None = Query(None, description="按激活状态筛选"),
    search: str | None = Query(None, description="搜索用户名、邮箱或部门"),
):
    """
    获取用户列表（管理员接口）

    用于用户管理页面的用户列表
    """
    # 构建查询
    query = select(User).where(User.is_deleted == False)

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

    # 获取所有用户的角色分配
    user_ids = [u.id for u in users]
    if user_ids:
        assignments_query = (
            select(UserScopeRole)
            .options(
                selectinload(UserScopeRole.role).selectinload(Role.permissions),
                selectinload(UserScopeRole.scope_node),
            )
            .where(UserScopeRole.user_id.in_(user_ids))
        )
        assignments_result = await db.execute(assignments_query)
        all_assignments = assignments_result.scalars().all()

        # 按 user_id 分组
        assignments_by_user: dict[int, list[UserScopeRole]] = {}
        for assignment in all_assignments:
            if assignment.user_id not in assignments_by_user:
                assignments_by_user[assignment.user_id] = []
            assignments_by_user[assignment.user_id].append(assignment)
    else:
        assignments_by_user = {}

    # 构建响应
    response = []
    for user in users:
        user_assignments = assignments_by_user.get(user.id, [])
        response.append(
            UserListSchema(
                id=user.id,
                username=user.username,
                email=user.email,
                display_name=user.display_name,
                is_active=user.is_active,
                is_superuser=user.is_superuser,
                department=user.department,
                last_login_at=user.last_login_at,
                created_at=user.created_at,
                assignments=[UserScopeRoleSchema.model_validate(a) for a in user_assignments],
            )
        )

    return response