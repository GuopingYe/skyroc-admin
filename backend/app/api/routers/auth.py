"""
认证路由模块

提供：
1. POST /auth/login - 用户登录
2. GET /auth/getUserInfo - 获取当前用户信息
3. POST /auth/refreshToken - 刷新 Token
"""
from datetime import datetime, timezone
from typing import Annotated, Any, Generic, TypeVar

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, get_current_user
from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_user_id_from_token,
    hash_password,
    verify_password,
    verify_refresh_token,
)
from app.database import get_db_session
from app.models import Permission, Role, User, UserScopeRole

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============================================================
# Response Wrapper
# ============================================================

SUCCESS_CODE = "0000"
T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """标准 API 响应格式"""

    code: str = Field(default=SUCCESS_CODE, description="响应状态码")
    data: T = Field(..., description="响应数据")


# ============================================================
# Request/Response Models
# ============================================================


class LoginRequest(BaseModel):
    """登录请求"""

    userName: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")


class TokenData(BaseModel):
    """Token 数据"""

    token: str = Field(..., description="Access Token")
    refreshToken: str = Field(..., description="Refresh Token")


class UserInfoData(BaseModel):
    """用户信息数据"""

    userId: int = Field(..., description="用户 ID")
    userName: str = Field(..., description="用户名")
    displayName: str | None = Field(None, description="显示名称")
    email: str = Field(..., description="邮箱")
    roles: list[str] = Field(default_factory=list, description="角色代码列表")
    buttons: list[str] = Field(default_factory=list, description="权限代码列表")
    isSuperuser: bool = Field(False, description="是否超级管理员")


class RefreshTokenRequest(BaseModel):
    """刷新 Token 请求"""

    refreshToken: str = Field(..., description="Refresh Token")


# ============================================================
# Routes
# ============================================================


def success_response(data: Any) -> dict:
    """包装成功响应"""
    return {
        "code": SUCCESS_CODE,
        "data": data,
    }


@router.post("/login")
@limiter.limit(f"{settings.RATE_LIMIT_REQUESTS}/{settings.RATE_LIMIT_WINDOW_SECONDS}seconds")
async def login(
    request: Request,  # Required by slowapi for rate limiting
    login_request: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    用户登录

    验证用户名密码，返回 Access Token 和 Refresh Token

    Rate limited to prevent brute force attacks.
    """
    # 查询用户
    result = await db.execute(
        select(User).where(
            User.username == login_request.userName,
            User.is_deleted == False,
        )
    )
    user = result.scalar_one_or_none()

    # 验证用户存在
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 验证密码
    if user.password_hash is None or not verify_password(
        login_request.password, user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 验证账户状态
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    # 更新最后登录时间
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    # 生成 Token
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    return success_response({
        "token": access_token,
        "refreshToken": refresh_token,
    })


@router.get("/getUserInfo")
async def get_user_info(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    获取当前用户信息

    返回用户基本信息、角色和权限列表
    """
    # 获取用户的角色和权限
    roles: list[str] = []
    buttons: list[str] = []

    if current_user.is_superuser:
        # 超级用户拥有所有权限
        result = await db.execute(select(Role.code))
        roles = [row[0] for row in result.fetchall()]

        result = await db.execute(select(Permission.code))
        buttons = [row[0] for row in result.fetchall()]
    else:
        # 查询用户的所有角色（通过 user_scope_roles）
        now = datetime.now(timezone.utc)
        result = await db.execute(
            select(Role.code)
            .select_from(UserScopeRole)
            .join(Role, UserScopeRole.role_id == Role.id)
            .where(
                UserScopeRole.user_id == current_user.id,
                Role.is_deleted == False,
            )
            .distinct()
        )
        roles = [row[0] for row in result.fetchall()]

        # 查询用户的所有权限
        result = await db.execute(
            select(Permission.code)
            .select_from(UserScopeRole)
            .join(Role, UserScopeRole.role_id == Role.id)
            .join(Role.permissions)
            .where(
                UserScopeRole.user_id == current_user.id,
                Role.is_deleted == False,
            )
            .distinct()
        )
        buttons = [row[0] for row in result.fetchall()]

    return success_response({
        "userId": str(current_user.id),
        "userName": current_user.username,
        "displayName": current_user.display_name,
        "email": current_user.email,
        "roles": roles,
        "buttons": buttons,
        "isSuperuser": current_user.is_superuser,
    })


@router.post("/refreshToken")
@limiter.limit(f"{settings.RATE_LIMIT_REQUESTS}/{settings.RATE_LIMIT_WINDOW_SECONDS}seconds")
async def refresh_token(
    request: Request,  # Required by slowapi for rate limiting
    token_request: RefreshTokenRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    刷新 Token

    使用 Refresh Token 获取新的 Access Token

    Rate limited to prevent abuse.
    """
    # 登出错误响应（不触发前端刷新，直接跳转登录页）
    def logout_response(msg: str):
        return JSONResponse(
            status_code=200,
            content={
                "code": "8888",  # 登出代码
                "msg": msg,
                "data": None,
            },
        )

    # 验证 Refresh Token
    payload = verify_refresh_token(token_request.refreshToken)
    if payload is None:
        return logout_response("Invalid refresh token")

    # 获取用户 ID
    try:
        user_id = int(payload.get("sub"))
    except (ValueError, TypeError):
        return logout_response("Invalid refresh token")

    # 验证用户存在且有效
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.is_deleted == False,
            User.is_active == True,
        )
    )
    user = result.scalar_one_or_none()

    if user is None:
        return logout_response("User not found or inactive")

    # 生成新的 Token
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    return success_response({
        "token": access_token,
        "refreshToken": refresh_token,
    })