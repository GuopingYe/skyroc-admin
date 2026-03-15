"""
安全工具模块

提供：
1. 密码哈希与验证
2. JWT Token 生成与解析
"""
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# 密码哈希上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Token 类型
ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"

# Refresh Token 过期时间（7天）
REFRESH_TOKEN_EXPIRE_DAYS = 7


# ============================================================
# 密码工具
# ============================================================


def hash_password(password: str) -> str:
    """
    使用 bcrypt 哈希密码

    Args:
        password: 明文密码

    Returns:
        哈希后的密码字符串
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证密码

    Args:
        plain_password: 明文密码
        hashed_password: 哈希后的密码

    Returns:
        密码是否匹配
    """
    return pwd_context.verify(plain_password, hashed_password)


# ============================================================
# JWT Token 工具
# ============================================================


def create_access_token(
    subject: str | int,
    expires_delta: timedelta | None = None,
    extra_data: dict[str, Any] | None = None,
) -> str:
    """
    创建 Access Token

    Args:
        subject: Token 主体（通常是 user_id）
        expires_delta: 过期时间增量
        extra_data: 额外的 payload 数据

    Returns:
        JWT Token 字符串
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    now = datetime.now(timezone.utc)
    expire = now + expires_delta

    to_encode: dict[str, Any] = {
        "sub": str(subject),
        "type": ACCESS_TOKEN_TYPE,
        "exp": expire,
        "iat": now,
    }

    if extra_data:
        to_encode.update(extra_data)

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt


def create_refresh_token(
    subject: str | int,
    expires_delta: timedelta | None = None,
) -> str:
    """
    创建 Refresh Token

    Args:
        subject: Token 主体（通常是 user_id）
        expires_delta: 过期时间增量

    Returns:
        JWT Token 字符串
    """
    if expires_delta is None:
        expires_delta = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    now = datetime.now(timezone.utc)
    expire = now + expires_delta

    to_encode = {
        "sub": str(subject),
        "type": REFRESH_TOKEN_TYPE,
        "exp": expire,
        "iat": now,
    }

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt


def decode_token(token: str) -> dict[str, Any] | None:
    """
    解码并验证 Token

    Args:
        token: JWT Token 字符串

    Returns:
        解码后的 payload，如果验证失败返回 None
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except JWTError:
        return None


def verify_access_token(token: str) -> dict[str, Any] | None:
    """
    验证 Access Token

    Args:
        token: JWT Token 字符串

    Returns:
        解码后的 payload，如果验证失败返回 None
    """
    payload = decode_token(token)
    if payload is None:
        return None

    if payload.get("type") != ACCESS_TOKEN_TYPE:
        return None

    return payload


def verify_refresh_token(token: str) -> dict[str, Any] | None:
    """
    验证 Refresh Token

    Args:
        token: JWT Token 字符串

    Returns:
        解码后的 payload，如果验证失败返回 None
    """
    payload = decode_token(token)
    if payload is None:
        return None

    if payload.get("type") != REFRESH_TOKEN_TYPE:
        return None

    return payload


def get_user_id_from_token(token: str) -> int | None:
    """
    从 Token 中提取用户 ID

    Args:
        token: JWT Token 字符串

    Returns:
        用户 ID，如果解析失败返回 None
    """
    payload = verify_access_token(token)
    if payload is None:
        return None

    try:
        return int(payload.get("sub"))
    except (ValueError, TypeError):
        return None