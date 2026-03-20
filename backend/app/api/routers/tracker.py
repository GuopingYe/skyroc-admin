"""
Programming Tracker API Router

核心功能：
1. 获取 Tracker 任务列表
2. 创建/更新/删除 Tracker 任务
3. 提交 QC Issue
4. 程序员回复 Issue
5. 状态转换操作
"""
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_db_session
from app.database import get_db_session
from app.models import ProgrammingTracker, ScopeNode, TrackerIssue
from app.models.audit_listener import set_audit_context
from app.models.mapping_enums import (
    DeliverableType,
    IssueStatus,
    Priority,
    ProdStatus,
    QCMethod,
    QCStatus,
    TrackerStatus,
)
from app.schemas.tracker_schemas import (
    IssueListResponse,
    ProgrammingTrackerCreate,
    ProgrammingTrackerRead,
    ProgrammingTrackerUpdate,
    TrackerIssueCreate,
    TrackerIssueRead,
    TrackerIssueResponse,
    TrackerListResponse,
)

# 主路由 - 使用 /mdr/tracker 前缀以匹配前端
router = APIRouter(prefix="/mdr/tracker", tags=["Programming Tracker"])


# ============================================================
# Response Models
# ============================================================

class MessageResponse(BaseModel):
    """通用消息响应"""

    message: str
    detail: dict[str, Any] | None = None


class TaskCreateResponse(BaseModel):
    """任务创建响应"""

    id: int
    message: str = "Task created successfully"


class TaskUpdateResponse(BaseModel):
    """任务更新响应"""

    success: bool = True
    message: str = "Task updated successfully"


class TaskDeleteResponse(BaseModel):
    """任务删除响应"""

    success: bool = True
    message: str = "Task deleted successfully"


class TaskQueryParams(BaseModel):
    """任务查询参数"""

    analysis_id: int
    category: str | None = None  # SDTM, ADaM, TFL, ALL


# ============================================================
# Helper Functions
# ============================================================

def _ok(data: Any = None, msg: str = "success") -> dict:
    """统一成功响应格式"""
    return {"code": "0000", "msg": msg, "data": data}


def _filter_by_category(query, category: str | None):
    """按类别过滤任务"""
    if not category or category.upper() == "ALL":
        return query

    category_map = {
        "SDTM": DeliverableType.SDTM,
        "ADAM": DeliverableType.ADAM,
        "TFL": DeliverableType.TFL,
        "OTHER": DeliverableType.OTHER_LOOKUP,
    }

    deliverable_type = category_map.get(category.upper())
    if deliverable_type:
        query = query.where(ProgrammingTracker.deliverable_type == deliverable_type)

    return query


# ============================================================
# API 1: 获取 Tracker 任务列表
# ============================================================

@router.get(
    "/tasks",
    response_model=TrackerListResponse,
    summary="获取 Tracker 任务列表",
    description="""
获取指定 Analysis 下的所有 Tracker 任务列表。

**核心特性：**
- 按 priority 和 execution_order 排序
- 支持按类别过滤 (SDTM, ADaM, TFL)

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
async def get_tracker_tasks(
    analysisId: int = Query(..., alias="analysisId", description="Analysis 节点 ID（必填）"),
    category: str | None = Query(None, alias="category", description="任务类别过滤：SDTM/ADaM/TFL/ALL"),
    limit: int = Query(100, ge=1, le=500, description="返回数量限制"),
    offset: int = Query(0, ge=0, description="偏移量（分页）"),
    db: AsyncSession = Depends(get_db_session),
) -> TrackerListResponse:
    """
    获取 Tracker 任务列表

    按 priority（High 优先）和 execution_order 排序
    """
    # 1. 验证 ScopeNode 存在且为 Analysis 类型
    scope_node = await db.get(ScopeNode, analysisId)
    if not scope_node or scope_node.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis node with id {analysisId} not found",
        )

    # 2. 构建查询
    query = (
        select(ProgrammingTracker)
        .where(
            ProgrammingTracker.analysis_id == analysisId,
            ProgrammingTracker.is_deleted == False,
        )
    )

    # 3. 应用类别过滤
    query = _filter_by_category(query, category)

    # 4. 查询总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 5. 应用排序和分页
    query = query.order_by(
        ProgrammingTracker.priority,
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
# API 2: 创建 Tracker 任务
# ============================================================

@router.post(
    "/task",
    response_model=TaskCreateResponse,
    summary="创建 Tracker 任务",
    description="""
创建一个新的编程任务。

**核心特性：**
- 支持创建 SDTM/ADaM/TFL 类型任务
- 自动设置初始状态
- 支持人员分配

**使用场景：**
- 任务分配
- 项目规划
    """,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "任务创建成功"},
        400: {"description": "请求参数错误"},
        404: {"description": "Analysis 节点不存在"},
    },
)
async def create_tracker_task(
    task_data: ProgrammingTrackerCreate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
) -> TaskCreateResponse:
    """
    创建 Tracker 任务
    """
    # 设置审计上下文
    set_audit_context(
        user_id=user.username,
        user_name=user.username,
        context={"operation": "create_task", "source": "api"},
        reason="创建编程任务",
    )

    # 1. 验证 Analysis 存在
    scope_node = await db.get(ScopeNode, task_data.analysis_id)
    if not scope_node or scope_node.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis node with id {task_data.analysis_id} not found",
        )

    # 2. 创建任务
    new_task = ProgrammingTracker(
        analysis_id=task_data.analysis_id,
        deliverable_type=task_data.deliverable_type,
        deliverable_name=task_data.deliverable_name,
        task_name=task_data.task_name,
        description=task_data.description,
        target_dataset_id=task_data.target_dataset_id,
        tfl_output_id=task_data.tfl_output_id,
        prod_programmer_id=task_data.prod_programmer_id,
        qc_programmer_id=task_data.qc_programmer_id,
        prod_status=ProdStatus.NOT_STARTED,
        qc_status=QCStatus.NOT_STARTED,
        status=TrackerStatus.NOT_STARTED,
        priority=task_data.priority,
        execution_order=task_data.execution_order,
        qc_method=task_data.qc_method,
        due_date=task_data.due_date,
        prod_file_path=task_data.prod_file_path,
        qc_file_path=task_data.qc_file_path,
        prod_program_name=task_data.prod_program_name,
        qc_program_name=task_data.qc_program_name,
        output_file_name=task_data.output_file_name,
        delivery_batch=task_data.delivery_batch,
        tfl_metadata=task_data.tfl_metadata,
        created_by=task_data.created_by,
    )
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)

    return TaskCreateResponse(id=new_task.id, message="Task created successfully")


# ============================================================
# API 3: 更新 Tracker 任务
# ============================================================

@router.put(
    "/task/{task_id}",
    response_model=TaskUpdateResponse,
    summary="更新 Tracker 任务",
    description="""
更新指定的编程任务。

**核心特性：**
- 支持部分更新
- 自动更新 updated_at 时间戳
- 状态转换验证

**使用场景：**
- 任务编辑
- 状态更新
    """,
    responses={
        200: {"description": "任务更新成功"},
        400: {"description": "请求参数错误"},
        404: {"description": "任务不存在"},
    },
)
async def update_tracker_task(
    task_id: int,
    task_data: ProgrammingTrackerUpdate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
) -> TaskUpdateResponse:
    """
    更新 Tracker 任务
    """
    # 设置审计上下文
    set_audit_context(
        user_id=task_data.updated_by,
        user_name=task_data.updated_by,
        context={"operation": "update_task", "source": "api"},
        reason="更新编程任务",
    )

    # 1. 验证任务存在
    task = await db.get(ProgrammingTracker, task_id)
    if not task or task.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with id {task_id} not found",
        )

    # 2. 更新字段
    update_fields = [
        "deliverable_name", "task_name", "description",
        "prod_programmer_id", "qc_programmer_id",
        "prod_status", "qc_status", "status",
        "priority", "execution_order", "qc_method",
        "due_date", "prod_file_path", "qc_file_path",
        "prod_program_name", "qc_program_name", "output_file_name",
        "delivery_batch", "tfl_metadata",
    ]

    for field in update_fields:
        value = getattr(task_data, field, None)
        if value is not None:
            setattr(task, field, value)

    task.updated_by = task_data.updated_by

    await db.commit()

    return TaskUpdateResponse(success=True, message="Task updated successfully")


# ============================================================
# API 4: 删除 Tracker 任务 (软删除)
# ============================================================

@router.delete(
    "/task/{task_id}",
    response_model=TaskDeleteResponse,
    summary="删除 Tracker 任务",
    description="""
软删除指定的编程任务。

**核心特性：**
- 软删除，满足 21 CFR Part 11 合规
- 保留审计追踪

**使用场景：**
- 任务删除
    """,
    responses={
        200: {"description": "任务删除成功"},
        404: {"description": "任务不存在"},
    },
)
async def delete_tracker_task(
    task_id: int,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
) -> TaskDeleteResponse:
    """
    删除 Tracker 任务 (软删除)
    """
    # 设置审计上下文
    set_audit_context(
        user_id=user.username,
        user_name=user.username,
        context={"operation": "delete_task", "source": "api"},
        reason="删除编程任务",
    )

    # 1. 验证任务存在
    task = await db.get(ProgrammingTracker, task_id)
    if not task or task.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with id {task_id} not found",
        )

    # 2. 软删除
    task.is_deleted = True
    task.deleted_at = datetime.utcnow()
    task.updated_by = user.username

    await db.commit()

    return TaskDeleteResponse(success=True, message="Task deleted successfully")


# ============================================================
# API 5: 任务状态转换
# ============================================================

class StatusTransitionRequest(BaseModel):
    """状态转换请求"""

    action: str = Field(..., description="操作类型: start_programming, submit_for_qc, start_qc, pass_qc, fail_qc, sign_off")
    user_id: str = Field(..., description="操作用户 ID")


@router.post(
    "/task/{task_id}/transition",
    summary="任务状态转换",
    description="""
执行任务状态转换。

**支持的操作：**
- start_programming: 开始编程
- submit_for_qc: 提交 QC
- start_qc: 开始 QC
- pass_qc: 通过 QC
- fail_qc: 未通过 QC
- sign_off: 签收（21 CFR Part 11 合规）

**使用场景：**
- 任务状态流转
    """,
    responses={
        200: {"description": "状态转换成功"},
        400: {"description": "无效的操作"},
        404: {"description": "任务不存在"},
    },
)
async def transition_task_status(
    task_id: int,
    data: StatusTransitionRequest,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """
    任务状态转换
    """
    # 设置审计上下文
    set_audit_context(
        user_id=data.user_id,
        user_name=data.user_id,
        context={"operation": "status_transition", "action": data.action},
        reason=f"任务状态转换: {data.action}",
    )

    # 1. 验证任务存在
    task = await db.get(ProgrammingTracker, task_id)
    if not task or task.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with id {task_id} not found",
        )

    # 2. 执行状态转换
    action_map = {
        "start_programming": task.start_programming,
        "submit_for_qc": task.submit_for_qc,
        "start_qc": task.start_qc,
        "pass_qc": task.pass_qc,
        "fail_qc": task.fail_qc,
        "sign_off": task.sign_off,
    }

    action_func = action_map.get(data.action)
    if not action_func:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action: {data.action}. Valid actions are: {list(action_map.keys())}",
        )

    action_func()
    task.updated_by = data.user_id

    await db.commit()

    return _ok({
        "task_id": task_id,
        "action": data.action,
        "prod_status": task.prod_status.value,
        "qc_status": task.qc_status.value,
        "status": task.status.value,
    })


# ============================================================
# API 6: 获取单个任务详情
# ============================================================

@router.get(
    "/task/{task_id}",
    response_model=ProgrammingTrackerRead,
    summary="获取任务详情",
    description="""
获取指定任务的详细信息。
    """,
    responses={
        200: {"description": "成功返回任务详情"},
        404: {"description": "任务不存在"},
    },
)
async def get_tracker_task(
    task_id: int,
    db: AsyncSession = Depends(get_db_session),
) -> ProgrammingTrackerRead:
    """
    获取单个任务详情
    """
    task = await db.get(ProgrammingTracker, task_id)
    if not task or task.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with id {task_id} not found",
        )

    return ProgrammingTrackerRead.model_validate(task)


# ============================================================
# API 7: 提交 QC Issue
# ============================================================

@router.post(
    "/task/{tracker_id}/issues",
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
# API 10: 程序员回复 Issue
# ============================================================

@router.put(
    "/issue/{issue_id}/response",
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
# API 8: 获取 Tracker 的 Issue 列表
# ============================================================

@router.get(
    "/task/{tracker_id}/issues",
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