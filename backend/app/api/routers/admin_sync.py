"""
Admin Sync API Router

管理员同步操作 API

核心功能：
1. 触发 CDISC 标准同步
2. 查看同步状态
3. 获取可用标准列表

支持的标准类型 (11种)：

| 类型 | 名称 | 分类 | 说明 |
|------|------|------|------|
| sdtm | SDTM Foundational Model | Model | SDTM 基础模型 |
| sdtmig | SDTM Implementation Guide | IG | SDTM 实施指南 |
| adam | ADaM Foundational Model | Model | ADaM 基础模型 |
| adamig | ADaM Implementation Guide | IG | ADaM 实施指南 |
| cdashig | CDASH Implementation Guide | IG | CDASH 实施指南 |
| sendig | SEND Implementation Guide | IG | SEND 实施指南 |
| tig | Targeted Implementation Guide | TIG | 面向特定领域的复合标准 |
| qrs | Questionnaires, Ratings, and Scales | QRS | 量表库 (ePRO/eCOA) |
| ct | Controlled Terminology | CT | 受控术语 |
| bc | Biomedical Concepts | BC | 生物医学概念 |
| integrated | Integrated Standards | TIG | TIG 的别名 |

版本参数支持：
- 具体版本号：如 "3-4" (sdtmig)、"2024-12-27" (ct)
- "all"：触发该标准类型的全量历史版本同步
- "latest"：获取最新版本（适用于 CT、BC、QRS、TIG）
"""
from enum import Enum
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.services.cdisc_sync_service import CDISCSyncError, CDISCSyncService

router = APIRouter(prefix="/admin", tags=["Admin Sync"])


# ============================================================
# Enums
# ============================================================

class StandardType(str, Enum):
    """
    CDISC 标准类型枚举

    支持的所有标准类型，用于 Swagger 下拉选择
    """

    # Model 类型
    SDTM = "sdtm"
    ADAM = "adam"

    # IG 类型
    SDTMIG = "sdtmig"
    ADAMIG = "adamig"
    CDASHIG = "cdashig"
    SENDIG = "sendig"

    # TIG (Targeted Implementation Guide / Integrated Standards)
    TIG = "tig"
    INTEGRATED = "integrated"

    # QRS 量表库
    QRS = "qrs"

    # CT 和 BC
    CT = "ct"
    BC = "bc"


# ============================================================
# Response Models
# ============================================================

class SyncResultResponse(BaseModel):
    """同步结果响应"""

    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="消息")
    result: dict[str, Any] | None = Field(None, description="详细结果")


class SyncStatusResponse(BaseModel):
    """同步状态响应"""

    status: str
    message: str


class AvailableStandard(BaseModel):
    """可用标准"""

    type: str = Field(..., description="标准类型")
    name: str = Field(..., description="标准名称")
    category: str = Field(..., description="分类: Model/IG/TIG/QRS/CT/BC")
    versions: list[dict[str, str]] = Field(..., description="可用版本")


# ============================================================
# API 1: 触发 CDISC 标准同步
# ============================================================

@router.post(
    "/sync/cdisc",
    response_model=SyncResultResponse,
    summary="触发 CDISC 标准同步",
    description="""
触发 CDISC Library 标准同步任务。

## 支持的标准类型 (11种)

| 类型 | 名称 | 分类 | 说明 |
|------|------|------|------|
| **sdtm** | SDTM Foundational Model | Model | SDTM 基础模型 |
| **sdtmig** | SDTM Implementation Guide | IG | SDTM 实施指南 |
| **adam** | ADaM Foundational Model | Model | ADaM 基础模型 |
| **adamig** | ADaM Implementation Guide | IG | ADaM 实施指南 |
| **cdashig** | CDASH Implementation Guide | IG | CDASH 实施指南 |
| **sendig** | SEND Implementation Guide | IG | SEND 实施指南 |
| **tig** | Targeted Implementation Guide | TIG | 面向特定领域的复合标准 (如 ISS-ISE) |
| **integrated** | Integrated Standards | TIG | TIG 的别名 |
| **qrs** | Questionnaires, Ratings, and Scales | QRS | 量表库 (ePRO/eCOA) |
| **ct** | Controlled Terminology | CT | 受控术语 |
| **bc** | Biomedical Concepts | BC | 生物医学概念 |

## 版本参数说明

- **具体版本号**: 如 `"3-4"` (sdtmig)、`"2024-12-27"` (ct)
- **`"all"`**: 触发该标准类型的**全量历史版本**同步
- **`"latest"`**: 获取最新版本（适用于 CT、BC、QRS、TIG）

## 核心特性

- ✅ **幂等性**: 重复执行不会产生重复数据
- ✅ **自动创建**: ScopeNode 和 Specification 自动创建
- ✅ **Upsert 机制**: Dataset/Variable/Codelist/BC 等自动更新或创建
- ✅ **容错设计**: 单个模块失败不影响整体同步

## 使用场景

- 初始化 CDISC 标准库
- 更新到最新版本
- 全量历史版本同步
    """,
    responses={
        200: {"description": "同步成功"},
        400: {"description": "请求参数错误"},
        500: {"description": "同步失败"},
    },
)
async def sync_cdisc_standards(
    standard_type: StandardType = Query(
        ...,
        description="标准类型 (支持11种CDISC标准)",
        examples=["sdtmig"],
    ),
    version: str = Query(
        ...,
        description="标准版本号。支持: 具体版本(如'3-4')、'all'(全量历史版本)、'latest'(最新版本)",
        examples=["3-4", "all", "latest", "2024-12-27"],
    ),
    db: AsyncSession = Depends(get_db_session),
) -> SyncResultResponse:
    """
    触发 CDISC 标准同步

    根据标准类型执行不同的同步策略
    """
    try:
        # 执行同步
        service = CDISCSyncService()
        result = await service.sync(db, standard_type.value, version)

        return SyncResultResponse(
            success=True,
            message=f"CDISC {standard_type.value.upper()} v{version} sync completed",
            result=result,
        )

    except CDISCSyncError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync failed: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


# ============================================================
# API 2: 获取支持的 CDISC 标准列表
# ============================================================

@router.get(
    "/sync/cdisc/available",
    response_model=dict,
    summary="获取可同步的 CDISC 标准",
    description="列出当前支持的 CDISC 标准类型和版本 (11种标准)",
)
async def get_available_cdisc_standards() -> dict:
    """
    获取可同步的 CDISC 标准列表
    """
    return {
        "standards": [
            # Model 类型
            {
                "type": "sdtm",
                "name": "SDTM Foundational Model",
                "category": "Model",
                "versions": [
                    {"version": "all", "display": "全量版本", "status": "supported"},
                    {"version": "2-1", "display": "v2.1", "status": "supported"},
                    {"version": "2-0", "display": "v2.0", "status": "supported"},
                    {"version": "1-13", "display": "v1.13", "status": "supported"},
                ],
            },
            {
                "type": "adam",
                "name": "ADaM Foundational Model",
                "category": "Model",
                "versions": [
                    {"version": "all", "display": "全量版本", "status": "supported"},
                    {"version": "1-3", "display": "v1.3", "status": "supported"},
                    {"version": "1-2", "display": "v1.2", "status": "supported"},
                ],
            },
            # IG 类型
            {
                "type": "sdtmig",
                "name": "SDTM Implementation Guide",
                "category": "IG",
                "versions": [
                    {"version": "all", "display": "全量版本", "status": "supported"},
                    {"version": "3-4", "display": "v3.4", "status": "supported"},
                    {"version": "3-3", "display": "v3.3", "status": "supported"},
                    {"version": "3-2", "display": "v3.2", "status": "supported"},
                ],
            },
            {
                "type": "adamig",
                "name": "ADaM Implementation Guide",
                "category": "IG",
                "versions": [
                    {"version": "all", "display": "全量版本", "status": "supported"},
                    {"version": "1-4", "display": "v1.4", "status": "supported"},
                    {"version": "1-3", "display": "v1.3", "status": "supported"},
                    {"version": "1-2", "display": "v1.2", "status": "supported"},
                ],
            },
            {
                "type": "cdashig",
                "name": "CDASH Implementation Guide",
                "category": "IG",
                "versions": [
                    {"version": "all", "display": "全量版本", "status": "supported"},
                    {"version": "2-3", "display": "v2.3", "status": "supported"},
                    {"version": "2-2", "display": "v2.2", "status": "supported"},
                    {"version": "2-1", "display": "v2.1", "status": "supported"},
                ],
            },
            {
                "type": "sendig",
                "name": "SEND Implementation Guide",
                "category": "IG",
                "versions": [
                    {"version": "all", "display": "全量版本", "status": "supported"},
                    {"version": "3-2", "display": "v3.2", "status": "supported"},
                    {"version": "3-1", "display": "v3.1", "status": "supported"},
                ],
            },
            # TIG 类型
            {
                "type": "tig",
                "name": "Targeted Implementation Guide",
                "category": "TIG",
                "versions": [
                    {"version": "all", "display": "全量 TIG 产品", "status": "supported"},
                    {"version": "latest", "display": "Latest", "status": "supported"},
                ],
                "description": "面向特定领域的复合标准容器，内部包含 SDTM、ADaM、CDASH 等模块",
                "examples": ["ISS-ISE (Integrated Summary of Safety/Efficacy)", "RS (Rare Disease)"],
            },
            {
                "type": "integrated",
                "name": "Integrated Standards",
                "category": "TIG",
                "versions": [
                    {"version": "all", "display": "全量 Integrated 产品", "status": "supported"},
                ],
                "description": "TIG 的别名，用于向后兼容",
            },
            # QRS 量表库
            {
                "type": "qrs",
                "name": "Questionnaires, Ratings, and Scales",
                "category": "QRS",
                "versions": [
                    {
                        "version": "latest",
                        "display": "Latest",
                        "status": "supported",
                        "note": "QRS 版本通常使用日期或 'latest'",
                    },
                ],
                "description": "ePRO/eCOA 量表标准化库，包含 PHQ-9、HADS 等常用量表",
            },
            # CT 受控术语
            {
                "type": "ct",
                "name": "Controlled Terminology",
                "category": "CT",
                "versions": [
                    {"version": "latest", "display": "最新版本", "status": "supported"},
                    {
                        "version": "2024-12-27",
                        "display": "2024-12",
                        "status": "supported",
                    },
                    {
                        "version": "2024-09-27",
                        "display": "2024-09",
                        "status": "supported",
                    },
                ],
                "note": "CT 版本使用发布日期格式，支持 'latest' 自动获取最新版本",
            },
            # BC 生物医学概念
            {
                "type": "bc",
                "name": "Biomedical Concepts",
                "category": "BC",
                "versions": [
                    {
                        "version": "latest",
                        "display": "Latest",
                        "status": "supported",
                        "note": "BC 版本通常使用 'latest' 或日期",
                    },
                ],
                "description": "最前沿的语义概念库，包含 NCIt 编码和跨标准映射 (COSMoS v2)",
            },
        ],
        "version_parameter_help": {
            "all": "触发该标准类型的全量历史版本同步",
            "latest": "自动获取最新版本（适用于 CT、BC、QRS、TIG）",
            "specific": "指定具体版本号，如 '3-4' (sdtmig) 或 '2024-12-27' (ct)",
        },
        "api_base_url": "https://library.cdisc.org/api",
        "total_standards": 11,
        "note": "实际可用版本取决于 CDISC Library API",
    }


# ============================================================
# API 3: 验证 CDISC API 连接
# ============================================================

@router.get(
    "/sync/cdisc/verify",
    response_model=SyncStatusResponse,
    summary="验证 CDISC API 连接",
    description="验证 CDISC Library API Key 和连接状态",
)
async def verify_cdisc_api_connection() -> SyncStatusResponse:
    """
    验证 CDISC API 连接
    """
    import httpx

    from app.core.config import settings

    if not settings.CDISC_LIBRARY_API_KEY:
        return SyncStatusResponse(
            status="error",
            message="CDISC_LIBRARY_API_KEY is not configured in environment",
        )

    try:
        async with httpx.AsyncClient(
            base_url=settings.CDISC_API_BASE_URL,
            headers={
                "api-key": settings.CDISC_LIBRARY_API_KEY,
                "Accept": "application/json",
            },
            timeout=10.0,
        ) as client:
            # 尝试访问一个简单的端点
            response = await client.get("/mdr/products")

            if response.status_code == 200:
                return SyncStatusResponse(
                    status="success",
                    message="CDISC Library API connection successful",
                )
            elif response.status_code == 401:
                return SyncStatusResponse(
                    status="error",
                    message="Invalid API key",
                )
            else:
                return SyncStatusResponse(
                    status="error",
                    message=f"API returned status {response.status_code}",
                )

    except httpx.TimeoutException:
        return SyncStatusResponse(
            status="error",
            message="Connection timeout",
        )
    except Exception as e:
        return SyncStatusResponse(
            status="error",
            message=f"Connection failed: {str(e)}",
        )


# ============================================================
# API 4: 获取同步历史/状态
# ============================================================

@router.get(
    "/sync/cdisc/status",
    response_model=dict,
    summary="获取已同步标准状态",
    description="查看已同步的 CDISC 标准及其数据统计",
)
async def get_sync_status(
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """
    获取已同步标准的状态
    """
    from sqlalchemy import func, select

    from app.models import (
        BiomedicalConcept,
        Codelist,
        CodelistTerm,
        ScopeNode,
        Specification,
        TargetDataset,
        TargetVariable,
    )

    # 统计 CDISC 节点
    cdisc_nodes = await db.execute(
        select(func.count(ScopeNode.id)).where(
            ScopeNode.node_type == "CDISC",
            ScopeNode.is_deleted == False,
        )
    )
    nodes_count = cdisc_nodes.scalar() or 0

    # 统计 Specifications
    specs = await db.execute(
        select(func.count(Specification.id)).where(
            Specification.is_deleted == False,
        )
    )
    specs_count = specs.scalar() or 0

    # 统计 TargetDatasets
    datasets = await db.execute(
        select(func.count(TargetDataset.id)).where(
            TargetDataset.is_deleted == False,
        )
    )
    datasets_count = datasets.scalar() or 0

    # 统计 TargetVariables
    variables = await db.execute(
        select(func.count(TargetVariable.id)).where(
            TargetVariable.is_deleted == False,
        )
    )
    variables_count = variables.scalar() or 0

    # 统计 Codelists
    codelists = await db.execute(
        select(func.count(Codelist.id)).where(
            Codelist.is_deleted == False,
        )
    )
    codelists_count = codelists.scalar() or 0

    # 统计 CodelistTerms
    terms = await db.execute(
        select(func.count(CodelistTerm.id)).where(
            CodelistTerm.is_deleted == False,
        )
    )
    terms_count = terms.scalar() or 0

    # 统计 BiomedicalConcepts
    bcs = await db.execute(
        select(func.count(BiomedicalConcept.id)).where(
            BiomedicalConcept.is_deleted == False,
        )
    )
    bcs_count = bcs.scalar() or 0

    return {
        "synced_standards": {
            "cdisc_nodes": nodes_count,
            "specifications": specs_count,
            "target_datasets": datasets_count,
            "target_variables": variables_count,
            "codelists": codelists_count,
            "codelist_terms": terms_count,
            "biomedical_concepts": bcs_count,
        },
        "last_sync": None,  # TODO: 从 AuditLog 获取最后同步时间
    }