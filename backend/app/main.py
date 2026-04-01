"""
FastAPI 应用入口

临床数据 MDR 系统 - 后端服务
"""
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.database import async_session_factory, engine
from app.models import Base, register_audit_listeners


# 错误代码常量（与前端 .env 配置对应）
ERROR_CODE_SUCCESS = "0000"
ERROR_CODE_TOKEN_EXPIRED = "9999"
ERROR_CODE_UNAUTHORIZED = "8888"


# Pre-computed security header values (avoid string construction on every request)
_CSP_HEADER = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: https:; "
    "font-src 'self' data:; "
    "connect-src 'self'; "
    "frame-ancestors 'none';"
)

_PERMISSIONS_POLICY_HEADER = (
    "accelerometer=(), "
    "camera=(), "
    "geolocation=(), "
    "gyroscope=(), "
    "magnetometer=(), "
    "microphone=(), "
    "payment=(), "
    "usb=()"
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """添加安全响应头中间件"""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = _CSP_HEADER
        response.headers["Permissions-Policy"] = _PERMISSIONS_POLICY_HEADER

        return response


def error_response(code: str, msg: str, status_code: int = 200) -> JSONResponse:
    """统一错误响应格式"""
    return JSONResponse(
        status_code=status_code,
        content={
            "code": code,
            "msg": msg,
            "data": None,
        },
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理

    启动时：
    - 初始化数据库连接
    - 注册审计监听器

    关闭时：
    - 关闭数据库连接
    """
    # 启动
    print("🚀 Starting Clinical MDR Backend...")

    # 注册审计监听器
    register_audit_listeners(Base)
    print("✅ Audit listeners registered")

    yield

    # 关闭
    print("🛑 Shutting down Clinical MDR Backend...")
    await engine.dispose()
    print("✅ Database connections closed")


# 创建 FastAPI 应用实例
app = FastAPI(
    title="Clinical MDR Backend",
    description="""
临床数据 MDR 与应用系统后端 API

## 核心功能
- 树状作用域管理 (Scope Node)
- 盲态隔离工作区 (Blinded/Unblinded Workspace)
- 自动化审计日志 (21 CFR Part 11 Compliance)
- Mapping Studio 源数据映射
- Global Library CDISC 标准库浏览器

## 技术栈
- FastAPI (Async)
- SQLAlchemy 2.0 (Async)
- PostgreSQL + JSONB
    """,
    version="0.1.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security Headers 中间件
app.add_middleware(SecurityHeadersMiddleware)

# Rate Limiting - Initialize slowapi
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.limiter import limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


# ============================================================
# Exception Handlers
# ============================================================


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """统一处理 HTTP 异常"""
    if exc.status_code == 401:
        # 未授权 - 返回 token 过期代码让前端刷新 token
        return error_response(ERROR_CODE_TOKEN_EXPIRED, exc.detail or "Unauthorized")
    elif exc.status_code == 403:
        return error_response(ERROR_CODE_UNAUTHORIZED, exc.detail or "Forbidden")
    elif exc.status_code == 404:
        return error_response("4040", exc.detail or "Not Found")
    else:
        return error_response(str(exc.status_code), exc.detail or "Error")


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """统一处理所有异常"""
    return error_response("5000", str(exc) or "Internal Server Error")


# ============================================================
# Health Check
# ============================================================


@app.get("/health", tags=["Health"])
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": "0.1.0",
    }


@app.get("/", tags=["Root"])
async def root():
    """根路径"""
    return {
        "message": "Clinical MDR Backend API",
        "docs": "/docs" if settings.ENVIRONMENT != "production" else "disabled",
    }


# ============================================================
# Router Registration
# ============================================================
from app.api.routers import (
    admin_sync_router,
    ars_builder_router,
    ars_study_router,
    auth_router,
    global_library_router,
    mapping_studio_router,
    pipeline_router,
    pull_requests_router,
    rbac_router,
    reference_data_router,
    shell_library_router,
    study_spec_router,
    tfl_router,
    tracker_router,
)

app.include_router(
    mapping_studio_router,
    prefix="/api/v1",
)

app.include_router(
    tracker_router,
    prefix="/api/v1",
)

app.include_router(
    ars_builder_router,
    prefix="/api/v1",
)

app.include_router(
    ars_study_router,
    prefix="/api/v1",
)

app.include_router(
    pull_requests_router,
    prefix="/api/v1",
)

app.include_router(
    admin_sync_router,
    prefix="/api/v1",
)

app.include_router(
    rbac_router,
    prefix="/api/v1",
)

app.include_router(
    global_library_router,
    prefix="/api/v1",
)

app.include_router(
    auth_router,
    prefix="/api/v1",
)

app.include_router(
    pipeline_router,
    prefix="/api/v1",
)

app.include_router(
    study_spec_router,
    prefix="/api/v1",
)

app.include_router(
    tfl_router,
    prefix="/api/v1",
)

app.include_router(
    shell_library_router,
    prefix="/api/v1",
)

app.include_router(
    reference_data_router,
    prefix="/api/v1",
)