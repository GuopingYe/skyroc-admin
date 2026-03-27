"""
FastAPI 依赖注入模块

提供：
1. 数据库会话依赖
2. 当前用户依赖
3. 权限校验依赖（Scope-Based RBAC）
"""
from datetime import datetime
from functools import wraps
from typing import Annotated, Any, Callable

from fastapi import Depends, HTTPException, Path, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import and_, or_, select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import verify_access_token
from app.database import async_session_factory, get_db_session
from app.models import Permission, Role, ScopeNode, User, UserScopeRole


# ============================================================
# 安全认证
# ============================================================

# Bearer Token 认证方案
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    """
    获取当前登录用户

    验证 JWT Token 并返回对应用户
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 验证 JWT Token
    token = credentials.credentials
    payload = verify_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 从 payload 获取用户 ID
    try:
        user_id = int(payload.get("sub"))
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 查询用户
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return user


# 类型别名
CurrentUser = Annotated[User, Depends(get_current_user)]


# ============================================================
# 权限校验核心逻辑
# ============================================================

async def get_user_permissions_for_scope(
    db: AsyncSession,
    user: User,
    target_scope_id: int,
) -> set[str]:
    """
    获取用户对目标作用域的所有有效权限

    核心逻辑：
    1. 查询用户的所有授权记录 (user_scope_roles)
    2. 通过 ScopeNode.path 判断继承关系
    3. 权限继承规则：如果用户在节点 A 上有权限，则自动拥有 A 的所有后代节点的权限

    Args:
        db: 数据库会话
        user: 当前用户
        target_scope_id: 目标作用域节点 ID

    Returns:
        用户对该作用域拥有的权限代码集合
    """
    # 超级用户拥有所有权限
    if user.is_superuser:
        result = await db.execute(select(Permission.code))
        return {row[0] for row in result.fetchall()}

    # 获取目标节点的 path
    target_result = await db.execute(
        select(ScopeNode.path).where(ScopeNode.id == target_scope_id)
    )
    target_path = target_result.scalar_one_or_none()

    if not target_path:
        return set()

    # 查询用户的所有有效授权
    # 条件：
    # 1. user_id 匹配
    # 2. valid_from 为空或已过期（已生效）
    # 3. valid_until 为空或未过期
    # 4. 授权节点的 path 是目标节点 path 的前缀（继承关系）
    now = datetime.utcnow()

    query = (
        select(UserScopeRole)
        .options(
            selectinload(UserScopeRole.role).selectinload(Role.permissions),
            selectinload(UserScopeRole.scope_node),
        )
        .where(
            UserScopeRole.user_id == user.id,
            UserScopeRole.is_deleted == False,
            or_(
                UserScopeRole.valid_from.is_(None),
                UserScopeRole.valid_from <= now,
            ),
            or_(
                UserScopeRole.valid_until.is_(None),
                UserScopeRole.valid_until >= now,
            ),
        )
    )

    result = await db.execute(query)
    user_scope_roles = result.scalars().all()

    # 收集权限
    permissions: set[str] = set()

    for usr in user_scope_roles:
        # 检查继承关系
        # 目标节点的 path 必须以授权节点的 path 开头
        # 例如：授权节点 path = "/1/5/"，目标节点 path = "/1/5/12/"
        # 则权限继承生效
        granted_path = usr.scope_node.path
        if granted_path and target_path.startswith(granted_path):
            # 继承有效，添加该角色的所有权限
            for perm in usr.role.permissions:
                permissions.add(perm.code)

    return permissions


async def check_permission(
    db: AsyncSession,
    user: User,
    required_permission: str,
    target_scope_id: int,
) -> bool:
    """
    检查用户是否对目标作用域拥有指定权限

    Args:
        db: 数据库会话
        user: 当前用户
        required_permission: 所需权限代码
        target_scope_id: 目标作用域节点 ID

    Returns:
        是否有权限
    """
    permissions = await get_user_permissions_for_scope(db, user, target_scope_id)
    return required_permission in permissions


def extract_scope_id_from_request(
    request: Request,
    scope_id_path_param: str = "scope_id",
    scope_id_query_param: str = "scope_node_id",
) -> int | None:
    """
    从请求中提取目标作用域 ID

    提取优先级：
    1. Path 参数（如 /studies/{scope_id}）
    2. Query 参数（如 ?scope_node_id=123）
    3. Request Body 中的 scope_node_id（需要手动处理）

    Args:
        request: FastAPI 请求对象
        scope_id_path_param: Path 参数名
        scope_id_query_param: Query 参数名

    Returns:
        作用域 ID 或 None
    """
    # 1. 尝试从 Path 参数获取
    path_params = request.path_params
    if scope_id_path_param in path_params:
        try:
            return int(path_params[scope_id_path_param])
        except (ValueError, TypeError):
            pass

    # 2. 尝试从 Query 参数获取
    query_params = request.query_params
    if scope_id_query_param in query_params:
        try:
            return int(query_params[scope_id_query_param])
        except (ValueError, TypeError):
            pass

    return None


def require_permission(
    required_permission: str,
    scope_id_param: str = "scope_node_id",
):
    """
    权限校验装饰器/依赖工厂

    用法示例：
        @app.get("/studies/{scope_node_id}/specs")
        async def get_specs(
            scope_node_id: int,
            user: CurrentUser,
            db: AsyncSession = Depends(get_db_session),
            _: None = Depends(require_permission("spec:view")),
        ):
            ...

    或者显式指定 scope_id 来源：
        @app.delete("/studies/{study_id}")
        async def delete_study(
            study_id: int,
            user: CurrentUser,
            db: AsyncSession = Depends(get_db_session),
            _: None = Depends(require_permission("study:delete", scope_id_param="study_id")),
        ):
            ...

    Args:
        required_permission: 所需权限代码（如 "mapping:edit", "pr:approve"）
        scope_id_param: 用于提取 scope_id 的参数名（path 或 query）

    Returns:
        FastAPI 依赖函数
    """

    async def permission_checker(
        request: Request,
        user: CurrentUser,
        db: AsyncSession = Depends(get_db_session),
    ) -> None:
        # 超级用户跳过权限检查
        if user.is_superuser:
            return

        # 提取目标作用域 ID
        target_scope_id = extract_scope_id_from_request(
            request,
            scope_id_path_param=scope_id_param,
            scope_id_query_param=scope_id_param,
        )

        if target_scope_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot determine target scope for permission check. Please provide '{scope_id_param}'.",
            )

        # 检查权限
        has_permission = await check_permission(
            db, user, required_permission, target_scope_id
        )

        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required: {required_permission}",
            )

    return Depends(permission_checker)


# ============================================================
# 辅助依赖
# ============================================================

async def require_superuser(user: CurrentUser) -> None:
    """要求超级用户权限"""
    if not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required",
        )


def get_scope_node_id(
    scope_node_id: Annotated[int | None, Path(alias="scope_node_id")] = None,
) -> int:
    """从 Path 参数获取作用域节点 ID"""
    if scope_node_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="scope_node_id is required",
        )
    return scope_node_id


# 类型别名
RequirePermission = Annotated[None, "Permission checked"]
