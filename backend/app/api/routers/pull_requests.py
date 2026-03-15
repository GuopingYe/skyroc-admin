"""
Pull Request API Router

核心功能：
1. 提交拉取请求
2. 合并前影响预评估
3. 审批与合并操作
"""
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, or_, select
from sqlalchemy.sql.operators import like_op
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.models import MetadataPullRequest, ScopeNode
from app.models.audit_listener import set_audit_context
from app.models.enums import LifecycleStatus, NodeType
from app.models.mapping_enums import PRItemType, PRStatus
from app.schemas.pr_schemas import (
    AffectedNodeInfo,
    ImpactPreviewResult,
    PRMergeRequest,
    PRMergeResult,
    PullRequestCreate,
    PullRequestListResponse,
    PullRequestRead,
)

router = APIRouter(prefix="/pull-requests", tags=["Pull Requests"])


# ============================================================
# Response Models
# ============================================================

class MessageResponse(BaseModel):
    """通用消息响应"""

    message: str
    detail: dict[str, Any] | None = None


# ============================================================
# Helper: 生成 PR 编号
# ============================================================

async def _generate_pr_number(db: AsyncSession) -> str:
    """
    生成 PR 编号

    格式: PR-YYYY-NNNN
    """
    year = datetime.utcnow().year
    prefix = f"PR-{year}-"

    # 查询当年最大编号
    query = select(func.max(MetadataPullRequest.pr_number)).where(
        MetadataPullRequest.pr_number.like(f"{prefix}%")
    )
    result = await db.execute(query)
    max_number = result.scalar()

    if max_number:
        # 提取序号并递增
        try:
            current_seq = int(max_number.replace(prefix, ""))
            new_seq = current_seq + 1
        except ValueError:
            new_seq = 1
    else:
        new_seq = 1

    return f"{prefix}{new_seq:04d}"


# ============================================================
# API 1: 提交拉取请求 (Create PR)
# ============================================================

@router.post(
    "",
    response_model=PullRequestRead,
    summary="提交拉取请求",
    description="""
提交一个新的 Pull Request。

**核心特性：**
- 自动生成 PR 编号（PR-YYYY-NNNN）
- 状态初始化为 Pending
- 记录变更快照（diff_snapshot）

**使用场景：**
- Study 层级的标准变更上推到 Global/TA
- 自下而上的标准治理
    """,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "PR 创建成功"},
        400: {"description": "请求参数错误"},
        404: {"description": "作用域节点不存在"},
    },
)
async def create_pull_request(
    pr_data: PullRequestCreate,
    db: AsyncSession = Depends(get_db_session),
) -> PullRequestRead:
    """
    创建 Pull Request
    """
    # 设置审计上下文
    set_audit_context(
        user_id=pr_data.requester_id,
        user_name=pr_data.requester_id,
        context={"operation": "create_pr", "source": "api"},
        reason="提交拉取请求",
    )

    # 1. 验证源作用域存在
    source_scope = await db.get(ScopeNode, pr_data.source_scope_id)
    if not source_scope or source_scope.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source ScopeNode with id {pr_data.source_scope_id} not found",
        )

    # 2. 验证目标作用域存在
    target_scope = await db.get(ScopeNode, pr_data.target_scope_id)
    if not target_scope or target_scope.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target ScopeNode with id {pr_data.target_scope_id} not found",
        )

    # 3. 验证目标作用域层级高于源（防止错误方向的 PR）
    if source_scope.depth <= target_scope.depth:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target scope must be at a higher level than source scope",
        )

    # 4. 生成 PR 编号
    pr_number = await _generate_pr_number(db)

    # 5. 创建 PR
    new_pr = MetadataPullRequest(
        pr_number=pr_number,
        title=pr_data.title,
        description=pr_data.description,
        requester_id=pr_data.requester_id,
        source_scope_id=pr_data.source_scope_id,
        target_scope_id=pr_data.target_scope_id,
        item_type=pr_data.item_type,
        item_id=pr_data.item_id,
        diff_snapshot=pr_data.diff_snapshot,
        status=PRStatus.PENDING,
        submitted_at=datetime.utcnow(),
        created_by=pr_data.requester_id,
    )
    db.add(new_pr)

    await db.commit()
    await db.refresh(new_pr)

    return PullRequestRead.model_validate(new_pr)


# ============================================================
# API 2: 合并前影响预评估 (Pre-Merge Impact Preview)
# ============================================================

@router.get(
    "/{pr_id}/impact-preview",
    response_model=ImpactPreviewResult,
    summary="合并前影响预评估",
    description="""
评估 PR 合并后会影响的下游节点数量。

**核心逻辑：**
1. 查出 PR 的 target_scope_id（如 Global 或 TA 库节点）
2. 利用 ScopeNode.path 字段进行 LIKE 查询
3. 找出所有属于该 target_scope 子孙后代且状态为 Ongoing 的节点
4. 返回受影响的 Study/Analysis 列表

**使用场景：**
- 审批者评估变更风险
- 决定是否批准 PR
    """,
    responses={
        200: {"description": "影响预评估结果"},
        404: {"description": "PR 不存在"},
    },
)
async def get_impact_preview(
    pr_id: int,
    db: AsyncSession = Depends(get_db_session),
) -> ImpactPreviewResult:
    """
    合并前影响预评估

    核心难点：利用 path 字段的 LIKE 查询找出所有子孙节点
    """
    # 1. 获取 PR
    pr = await db.get(MetadataPullRequest, pr_id)
    if not pr or pr.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PullRequest with id {pr_id} not found",
        )

    # 2. 获取目标作用域节点
    target_scope = await db.get(ScopeNode, pr.target_scope_id)
    if not target_scope:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target ScopeNode not found",
        )

    # 3. 构建路径查询
    # path 格式: /{id}/ 或 /{parent_id}/{id}/
    # 子孙节点的 path 会包含父节点的 path 前缀
    # 例如：父节点 path = "/1/"，子节点 path = "/1/2/"
    target_path = target_scope.path

    # 查询所有子孙节点，且生命周期状态为 Ongoing
    # 使用 LIKE 查询：path LIKE '/1/%' 或 path LIKE '/1/%/'
    query = (
        select(ScopeNode)
        .where(
            ScopeNode.path.like(f"{target_path}%"),
            ScopeNode.id != pr.target_scope_id,  # 排除自身
            ScopeNode.is_deleted == False,
            ScopeNode.lifecycle_status == LifecycleStatus.ONGOING,
        )
        .order_by(ScopeNode.depth, ScopeNode.code)
    )

    result = await db.execute(query)
    affected_nodes = result.scalars().all()

    # 4. 构建受影响节点列表
    affected_node_infos = [
        AffectedNodeInfo(
            id=node.id,
            code=node.code,
            name=node.name,
            node_type=node.node_type.value if node.node_type else "Unknown",
            lifecycle_status=node.lifecycle_status.value if node.lifecycle_status else "Unknown",
            path=node.path,
        )
        for node in affected_nodes
    ]

    # 5. 按节点类型分类统计
    breakdown_by_type: dict[str, int] = {}
    for node in affected_nodes:
        node_type = node.node_type.value if node.node_type else "Unknown"
        breakdown_by_type[node_type] = breakdown_by_type.get(node_type, 0) + 1

    # 6. 更新 PR 的影响分析字段
    pr.impact_analysis = {
        "affected_node_count": len(affected_nodes),
        "breakdown_by_type": breakdown_by_type,
        "preview_generated_at": datetime.utcnow().isoformat(),
    }
    await db.commit()

    return ImpactPreviewResult(
        pr_id=pr_id,
        target_scope_id=pr.target_scope_id,
        target_scope_name=target_scope.name,
        affected_node_count=len(affected_nodes),
        affected_nodes=affected_node_infos,
        breakdown_by_type=breakdown_by_type,
        preview_generated_at=datetime.utcnow(),
    )


# ============================================================
# API 3: 审批与合并 (Approve & Merge PR)
# ============================================================

@router.put(
    "/{pr_id}/merge",
    response_model=PRMergeResult,
    summary="审批与合并 PR",
    description="""
审批并合并 Pull Request。

**操作类型：**
- approve: 批准 PR（状态变为 Approved）
- reject: 拒绝 PR（状态变为 Rejected）
- merge: 合并 PR（状态变为 Merged，执行实际合并逻辑）

**合并逻辑：**
1. 解析 diff_snapshot
2. 在事务中将元数据更新到目标作用域
3. 记录审计日志

**使用场景：**
- 审批者审核并处理 PR
- 执行标准晋升操作
    """,
    responses={
        200: {"description": "操作成功"},
        400: {"description": "请求参数错误或 PR 状态不允许"},
        404: {"description": "PR 不存在"},
    },
)
async def merge_pull_request(
    pr_id: int,
    merge_data: PRMergeRequest,
    db: AsyncSession = Depends(get_db_session),
) -> PRMergeResult:
    """
    审批与合并 PR
    """
    # 设置审计上下文
    set_audit_context(
        user_id=merge_data.reviewer_id,
        user_name=merge_data.reviewer_id,
        context={"operation": "merge_pr", "action": merge_data.action},
        reason=f"PR 审批操作: {merge_data.action}",
    )

    # 1. 获取 PR
    pr = await db.get(MetadataPullRequest, pr_id)
    if not pr or pr.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PullRequest with id {pr_id} not found",
        )

    old_status = pr.status.value

    # 2. 验证操作合法性
    if merge_data.action == "approve":
        if pr.status != PRStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve PR with status {pr.status.value}",
            )
        pr.approve(merge_data.reviewer_id, merge_data.review_comment)

    elif merge_data.action == "reject":
        if pr.status != PRStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot reject PR with status {pr.status.value}",
            )
        if not merge_data.review_comment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Review comment is required for rejection",
            )
        pr.reject(merge_data.reviewer_id, merge_data.review_comment)

    elif merge_data.action == "merge":
        if pr.status not in (PRStatus.PENDING, PRStatus.APPROVED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot merge PR with status {pr.status.value}",
            )

        # 执行合并逻辑
        affected_items = await _execute_merge(db, pr)
        pr.merge()
        pr.reviewer_id = merge_data.reviewer_id
        pr.review_comment = merge_data.review_comment

        await db.commit()

        return PRMergeResult(
            pr_id=pr.id,
            pr_number=pr.pr_number,
            action="merge",
            old_status=old_status,
            new_status=pr.status.value,
            message="PR merged successfully",
            merged_at=pr.merged_at,
            affected_items=affected_items,
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown action: {merge_data.action}",
        )

    await db.commit()

    return PRMergeResult(
        pr_id=pr.id,
        pr_number=pr.pr_number,
        action=merge_data.action,
        old_status=old_status,
        new_status=pr.status.value,
        message=f"PR {merge_data.action}d successfully",
    )


async def _execute_merge(db: AsyncSession, pr: MetadataPullRequest) -> int:
    """
    执行合并逻辑

    解析 diff_snapshot，将元数据更新到目标作用域

    Returns:
        影响的项目数量
    """
    diff = pr.diff_snapshot
    affected_count = 0

    # 根据 item_type 执行不同的合并逻辑
    if pr.item_type == PRItemType.MAPPING:
        # 合并映射规则
        affected_count = await _merge_mapping_rules(db, pr, diff)
    elif pr.item_type == PRItemType.TFL:
        # 合并 TFL 模板
        affected_count = await _merge_tfl_template(db, pr, diff)
    elif pr.item_type == PRItemType.SPEC:
        # 合并规格定义
        affected_count = await _merge_spec(db, pr, diff)

    return affected_count


async def _merge_mapping_rules(db: AsyncSession, pr: MetadataPullRequest, diff: dict) -> int:
    """
    合并映射规则

    实际实现需要根据业务逻辑处理
    """
    # TODO: 实现映射规则合并逻辑
    # diff 结构示例：
    # {
    #   "before": {...},
    #   "after": {...},
    #   "changes": [...]
    # }
    return 0


async def _merge_tfl_template(db: AsyncSession, pr: MetadataPullRequest, diff: dict) -> int:
    """
    合并 TFL 模板

    实际实现需要根据业务逻辑处理
    """
    # TODO: 实现 TFL 模板合并逻辑
    return 0


async def _merge_spec(db: AsyncSession, pr: MetadataPullRequest, diff: dict) -> int:
    """
    合并规格定义

    实际实现需要根据业务逻辑处理
    """
    # TODO: 实现规格合并逻辑
    return 0


# ============================================================
# API 4: 获取 PR 列表
# ============================================================

@router.get(
    "",
    response_model=PullRequestListResponse,
    summary="获取 PR 列表",
    description="""
获取 Pull Request 列表。

**支持过滤：**
- 按 status 过滤
- 按 requester_id 过滤
- 按 reviewer_id 过滤

**使用场景：**
- PR 管理看板
- 我的 PR 列表
    """,
    responses={
        200: {"description": "成功返回 PR 列表"},
    },
)
async def get_pull_requests(
    status: PRStatus | None = Query(None, description="状态过滤"),
    requester_id: str | None = Query(None, description="请求者 ID 过滤"),
    reviewer_id: str | None = Query(None, description="审核者 ID 过滤"),
    item_type: PRItemType | None = Query(None, description="项目类型过滤"),
    limit: int = Query(50, ge=1, le=200, description="返回数量限制"),
    offset: int = Query(0, ge=0, description="偏移量（分页）"),
    db: AsyncSession = Depends(get_db_session),
) -> PullRequestListResponse:
    """
    获取 PR 列表
    """
    # 构建查询
    query = select(MetadataPullRequest).where(
        MetadataPullRequest.is_deleted == False,
    )

    # 应用过滤条件
    if status is not None:
        query = query.where(MetadataPullRequest.status == status)
    if requester_id is not None:
        query = query.where(MetadataPullRequest.requester_id == requester_id)
    if reviewer_id is not None:
        query = query.where(MetadataPullRequest.reviewer_id == reviewer_id)
    if item_type is not None:
        query = query.where(MetadataPullRequest.item_type == item_type)

    # 查询总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 应用排序和分页
    query = query.order_by(
        MetadataPullRequest.created_at.desc(),
    ).offset(offset).limit(limit)

    # 执行查询
    result = await db.execute(query)
    prs = result.scalars().all()

    # 构建响应
    items = [PullRequestRead.model_validate(pr) for pr in prs]

    return PullRequestListResponse(total=total, items=items)


# ============================================================
# API 5: 获取 PR 详情
# ============================================================

@router.get(
    "/{pr_id}",
    response_model=PullRequestRead,
    summary="获取 PR 详情",
    description="根据 ID 获取 Pull Request 的详细信息",
    responses={
        200: {"description": "成功返回 PR 详情"},
        404: {"description": "PR 不存在"},
    },
)
async def get_pull_request(
    pr_id: int,
    db: AsyncSession = Depends(get_db_session),
) -> PullRequestRead:
    """获取单个 PR 详情"""
    pr = await db.get(MetadataPullRequest, pr_id)
    if not pr or pr.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PullRequest with id {pr_id} not found",
        )

    return PullRequestRead.model_validate(pr)