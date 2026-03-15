"""
Programming Tracker API Router

核心功能：
1. 获取 Tracker 任务列表
2. 提交 QC Issue
3. 程序员回复 Issue
"""
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.models import ProgrammingTracker, ScopeNode, TrackerIssue
from app.models.audit_listener import set_audit_context
from app.models.mapping_enums import IssueStatus, Priority, ProdStatus, QCStatus
from app.schemas.tracker_schemas import (
    IssueListResponse,
    ProgrammingTrackerRead,
    TrackerIssueCreate,
    TrackerIssueRead,
    TrackerIssueResponse,
    TrackerListResponse,
)

router = APIRouter(prefix="/trackers", tags=["Programming Tracker"])


# ============================================================
# Response Models
# ============================================================

class MessageResponse(BaseModel):
    """通用消息响应"""

    message: str
    detail: dict[str, Any] | None = None


# ============================================================
# API 1: 获取 Tracker 任务列表
# ============================================================

@router.get(
    "",
    response_model=TrackerListResponse,
    summary="获取 Tracker 任务列表",
    description="""
获取指定 Analysis 下的所有 Tracker 任务列表。

**核心特性：**
- 按 priority 和 execution_order 排序
- 支持按状态过滤

**使用场景：**
- Tracker 看板
- 任务管理
    """,
    responses={
        200: {
            "description": "成功返回任务列表",
        },
        400: {"description": "请求参数错误"},
        404: {"description": "Analysis 节点不存在"},
    },
)
async def get_trackers(
    analysis_id: int = Query(..., description="Analysis 节点 ID（必填）"),
    prod_status: ProdStatus | None = Query(None, description="生产状态过滤"),
    qc_status: QCStatus | None = Query(None, description="QC 状态过滤"),
    priority: Priority | None = Query(None, description="优先级过滤"),
    limit: int = Query(100, ge=1, le=500, description="返回数量限制"),
    offset: int = Query(0, ge=0, description="偏移量（分页）"),
    db: AsyncSession = Depends(get_db_session),
) -> TrackerListResponse:
    """
    获取 Tracker 任务列表

    按 priority（High 优先）和 execution_order 排序
    """
    # 1. 验证 ScopeNode 存在且为 Analysis 类型
    scope_node = await db.get(ScopeNode, analysis_id)
    if not scope_node or scope_node.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis node with id {analysis_id} not found",
        )

    # 2. 构建查询
    query = (
        select(ProgrammingTracker)
        .where(
            ProgrammingTracker.analysis_id == analysis_id,
            ProgrammingTracker.is_deleted == False,
        )
    )

    # 3. 应用过滤条件
    if prod_status is not None:
        query = query.where(ProgrammingTracker.prod_status == prod_status)
    if qc_status is not None:
        query = query.where(ProgrammingTracker.qc_status == qc_status)
    if priority is not None:
        query = query.where(ProgrammingTracker.priority == priority)

    # 4. 查询总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 5. 应用排序和分页
    # 优先级排序：High=1, Medium=2, Low=3
    priority_order = {
        Priority.HIGH: 1,
        Priority.MEDIUM: 2,
        Priority.LOW: 3,
    }
    query = query.order_by(
        ProgrammingTracker.priority,  # 先按枚举值排序
        ProgrammingTracker.execution_order,
        ProgrammingTracker.id,
    ).offset(offset).limit(limit)

    # 6. 执行查询
    result = await db.execute(query)
    trackers = result.scalars().all()

    # 7. 构建响应
    items = [ProgrammingTrackerRead.model_validate(t) for t in trackers]

    return TrackerListResponse(total=total, items=items)


# ============================================================
# API 2: 提交 QC Issue
# ============================================================

@router.post(
    "/{tracker_id}/issues",
    response_model=TrackerIssueRead,
    summary="提交 QC Issue",
    description="""
为指定 Tracker 提交一条新的 QC Issue。

**核心特性：**
- 支持多轮 QC（Dry Run 1, Dry Run 2, Final）
- 自动设置 raised_at 时间戳
- 自动更新 Tracker 的 qc_status 为 Issues_Found

**使用场景：**
- QC 发现问题时提交
    """,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "Issue 创建成功"},
        400: {"description": "请求参数错误"},
        404: {"description": "Tracker 不存在"},
    },
)
async def create_tracker_issue(
    tracker_id: int,
    issue_data: TrackerIssueCreate,
    db: AsyncSession = Depends(get_db_session),
) -> TrackerIssueRead:
    """
    提交 QC Issue

    自动更新 Tracker 的 QC 状态
    """
    # 设置审计上下文
    set_audit_context(
        user_id=issue_data.raised_by,
        user_name=issue_data.raised_by_name or issue_data.raised_by,
        context={"operation": "create_issue", "source": "api"},
        reason="提交 QC Issue",
    )

    # 1. 验证 Tracker 存在
    tracker = await db.get(ProgrammingTracker, tracker_id)
    if not tracker or tracker.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tracker with id {tracker_id} not found",
        )

    # 2. 创建 Issue
    new_issue = TrackerIssue(
        tracker_id=tracker_id,
        qc_cycle=issue_data.qc_cycle,
        finding_description=issue_data.finding_description,
        finding_category=issue_data.finding_category,
        severity=issue_data.severity,
        raised_by=issue_data.raised_by,
        raised_by_name=issue_data.raised_by_name,
        raised_at=datetime.utcnow(),
        issue_status=IssueStatus.OPEN,
        created_by=issue_data.raised_by,
    )
    db.add(new_issue)

    # 3. 更新 Tracker 的 QC 状态
    if tracker.qc_status != QCStatus.ISSUES_FOUND:
        tracker.qc_status = QCStatus.ISSUES_FOUND

    await db.commit()
    await db.refresh(new_issue)

    return TrackerIssueRead.model_validate(new_issue)


# ============================================================
# API 3: 程序员回复 Issue
# ============================================================

@router.put(
    "/issues/{issue_id}/response",
    response_model=TrackerIssueRead,
    summary="程序员回复 Issue",
    description="""
程序员回复指定的 Issue。

**核心特性：**
- 更新 developer_response 和 responded_at
- 自动将 issue_status 转为 Answered

**使用场景：**
- 程序员对 QC 问题进行回复
    """,
    responses={
        200: {"description": "回复成功"},
        400: {"description": "请求参数错误"},
        404: {"description": "Issue 不存在"},
        409: {"description": "Issue 已关闭，无法回复"},
    },
)
async def respond_to_issue(
    issue_id: int,
    response_data: TrackerIssueResponse,
    db: AsyncSession = Depends(get_db_session),
) -> TrackerIssueRead:
    """
    程序员回复 Issue

    更新回复内容并将状态转为 Answered
    """
    # 设置审计上下文
    set_audit_context(
        user_id=response_data.responded_by,
        user_name=response_data.responded_by_name or response_data.responded_by,
        context={"operation": "respond_issue", "source": "api"},
        reason="程序员回复 Issue",
    )

    # 1. 验证 Issue 存在
    issue = await db.get(TrackerIssue, issue_id)
    if not issue or issue.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Issue with id {issue_id} not found",
        )

    # 2. 检查 Issue 状态
    if issue.issue_status == IssueStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Issue is already closed and cannot be responded to",
        )

    # 3. 更新 Issue
    issue.developer_response = response_data.developer_response
    issue.responded_by = response_data.responded_by
    issue.responded_by_name = response_data.responded_by_name
    issue.responded_at = datetime.utcnow()
    issue.issue_status = IssueStatus.ANSWERED
    issue.updated_by = response_data.responded_by

    await db.commit()
    await db.refresh(issue)

    return TrackerIssueRead.model_validate(issue)


# ============================================================
# API 4: 获取 Tracker 的 Issue 列表
# ============================================================

@router.get(
    "/{tracker_id}/issues",
    response_model=IssueListResponse,
    summary="获取 Tracker 的 Issue 列表",
    description="""
获取指定 Tracker 的所有 Issue 列表。

**核心特性：**
- 按创建时间倒序排列
- 支持按状态过滤

**使用场景：**
- 查看 Tracker 的所有 QC 问题
    """,
    responses={
        200: {"description": "成功返回 Issue 列表"},
        404: {"description": "Tracker 不存在"},
    },
)
async def get_tracker_issues(
    tracker_id: int,
    issue_status: IssueStatus | None = Query(None, description="Issue 状态过滤"),
    qc_cycle: str | None = Query(None, description="QC 轮次过滤"),
    limit: int = Query(100, ge=1, le=500, description="返回数量限制"),
    offset: int = Query(0, ge=0, description="偏移量（分页）"),
    db: AsyncSession = Depends(get_db_session),
) -> IssueListResponse:
    """
    获取 Tracker 的 Issue 列表
    """
    # 1. 验证 Tracker 存在
    tracker = await db.get(ProgrammingTracker, tracker_id)
    if not tracker or tracker.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tracker with id {tracker_id} not found",
        )

    # 2. 构建查询
    query = (
        select(TrackerIssue)
        .where(
            TrackerIssue.tracker_id == tracker_id,
            TrackerIssue.is_deleted == False,
        )
    )

    # 3. 应用过滤条件
    if issue_status is not None:
        query = query.where(TrackerIssue.issue_status == issue_status)
    if qc_cycle is not None:
        query = query.where(TrackerIssue.qc_cycle == qc_cycle)

    # 4. 查询总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 5. 应用排序和分页
    query = query.order_by(
        TrackerIssue.raised_at.desc(),
        TrackerIssue.id.desc(),
    ).offset(offset).limit(limit)

    # 6. 执行查询
    result = await db.execute(query)
    issues = result.scalars().all()

    # 7. 构建响应
    items = [TrackerIssueRead.model_validate(i) for i in issues]

    return IssueListResponse(total=total, items=items)