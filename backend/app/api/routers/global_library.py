"""
Global Library API Router

前端读取 API - CDISC 标准库浏览器

核心功能：
1. 获取 CDISC 标准层级树（适配 Ant Design Tree 组件）
2. 获取版本下的数据集列表（支持分页和搜索）
3. 获取数据集下的变量列表（支持分页、搜索和 core 过滤）
"""
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.database import get_db_session
from app.models import Codelist, CodelistTerm, ScopeNode, Specification, TargetDataset, TargetVariable
from app.models.enums import NodeType
from app.models.mapping_enums import SpecType, VariableCore

router = APIRouter(prefix="/global-library", tags=["Global Library"])


# ============================================================
# Response Models
# ============================================================

class TreeNode(BaseModel):
    """Ant Design Tree 节点"""

    key: str = Field(..., description="节点唯一标识")
    title: str = Field(..., description="节点显示名称")
    value: str | None = Field(None, description="节点值（用于选择）")
    icon: str | None = Field(None, description="图标类型")
    isLeaf: bool | None = Field(None, description="是否为叶子节点")
    children: list["TreeNode"] | None = Field(None, description="子节点")
    # 扩展属性
    node_type: str | None = Field(None, description="节点类型")
    spec_id: int | None = Field(None, description="Specification ID（版本节点专用）")
    spec_type: str | None = Field(None, description="规范类型：SDTM/ADaM")


class DatasetListItem(BaseModel):
    """数据集列表项"""

    id: int
    specification_id: int
    dataset_name: str = Field(..., description="数据集名称，如 DM, AE, ADSL")
    description: str | None = Field(None, description="数据集描述")
    class_type: str = Field(..., description="数据集分类")
    sort_order: int = Field(0, description="排序序号")
    variable_count: int = Field(0, description="变量数量")


class DatasetListResponse(BaseModel):
    """数据集列表响应"""

    total: int = Field(..., description="总数")
    items: list[DatasetListItem] = Field(..., description="数据集列表")


class VariableListItem(BaseModel):
    """变量列表项"""

    id: int
    dataset_id: int
    variable_name: str = Field(..., description="变量名称")
    variable_label: str | None = Field(None, description="变量标签")
    description: str | None = Field(None, description="变量详细描述")
    data_type: str = Field(..., description="数据类型")
    length: int | None = Field(None, description="变量长度")
    core: str = Field(..., description="核心性：Req/Perm/Exp")
    origin_type: str = Field(..., description="来源类型")
    sort_order: int = Field(0, description="排序序号")
    # 扩展字段
    role: str | None = Field(None, description="变量角色：Identifier, Topic, Qualifier 等")
    codelist_name: str | None = Field(None, description="关联的 CodeList 名称")
    codelist_ref: str | None = Field(None, description="CodeList 引用 ID（如 NCI C12345）")
    notes: str | None = Field(None, description="实施说明")
    # Schema-Driven 新增字段
    ordinal: int | None = Field(None, description="序号（CDISC标准）")
    qualifies_variable: list[str] | None = Field(None, description="修饰的变量列表")
    described_value_domain: str | None = Field(None, description="描述的值域")
    # QRS 特有字段
    question_text: str | None = Field(None, description="问题文本（QRS专用）")
    prompt: str | None = Field(None, description="提示文本（QRS专用）")
    # SDTM Model 专用字段
    definition: str | None = Field(None, description="定义（CDISC官方定义）")
    examples: str | None = Field(None, description="示例值")
    variable_ccode: str | None = Field(None, description="Variable C-Code（NCI编码）")
    usage_restrictions: str | None = Field(None, description="使用限制")
    # SDTM IG 专用字段
    implements: dict[str, str] | None = Field(None, description="实现的 SDTM Model 变量信息 {class: 'Findings', variable: '--ORRES', title: '...'}")
    value_list: list[str] | None = Field(None, description="值列表（Value List）")
    # ADaM IG 专用字段
    var_set: str | None = Field(None, description="Variable Set 名称（ADaM IG 专用）")


class VariableListResponse(BaseModel):
    """变量列表响应"""

    total: int = Field(..., description="总数")
    items: list[VariableListItem] = Field(..., description="变量列表")


class CodelistListItem(BaseModel):
    """Codelist列表项"""

    id: int
    scope_node_id: int = Field(..., description="所属 Scope Node ID")
    codelist_id: str = Field(..., description="CDISC Codelist ID")
    name: str = Field(..., description="Codelist 名称")
    ncit_code: str | None = Field(None, description="NCI Thesaurus 编码")
    definition: str | None = Field(None, description="Codelist 定义")
    term_count: int | None = Field(None, description="术语数量")
    sort_order: int = Field(0, description="排序序号")


class CodelistListResponse(BaseModel):
    """Codelist列表响应"""

    total: int = Field(..., description="总数")
    items: list[CodelistListItem] = Field(..., description="Codelist列表")


class TermListItem(BaseModel):
    """Term列表项"""

    id: int
    codelist_id: int = Field(..., description="所属 Codelist ID")
    term_id: str | None = Field(None, description="术语 ID")
    term_value: str = Field(..., description="术语值")
    ncit_code: str | None = Field(None, description="NCI Thesaurus 编码")
    name: str | None = Field(None, description="术语名称")
    definition: str | None = Field(None, description="术语定义")
    submission_value: str | None = Field(None, description="提交值")
    sort_order: int = Field(0, description="排序序号")


class TermListResponse(BaseModel):
    """Term列表响应"""

    total: int = Field(..., description="总数")
    items: list[TermListItem] = Field(..., description="Term列表")


def format_ct_version_name(node_name: str) -> str:
    """
    将 CT 版本名称格式化为人类可读格式

    输入示例: "CDISC CT vadamct.2014.09.26" 或 "CDISC CT vsdtmct.2016.06.24"
    输出示例: "ADaM CT 2014-09-26" 或 "SDTM CT 2016-06-24"
    """
    if not node_name:
        return "CT Package"

    # 匹配格式: v{type}ct-{date} 或 v{type}ct.{date}
    # 例如: vadamct-2014-09-26, vsdtmct-2016-06-24
    import re
    match = re.search(r'v([a-z]+)ct[.\-](\d{4})[.\-](\d{2})[.\-](\d{2})', node_name, re.IGNORECASE)
    if match:
        ct_type = match.group(1).lower()
        year = match.group(2)
        month = match.group(3)
        day = match.group(4)

        # 映射 CT 类型
        ct_type_map = {
            'ada': 'ADaM CT',
            'sdt': 'SDTM CT',
            'cda': 'CDASH CT',
            'sen': 'SEND CT',
            'adam': 'ADaM CT',
            'sdtm': 'SDTM CT',
            'cdash': 'CDASH CT',
            'send': 'SEND CT',
        }
        ct_label = ct_type_map.get(ct_type, f'{ct_type.upper()} CT')
        return f"{ct_label} {year}-{month}-{day}"

    # 如果无法解析，返回原名（去除前缀）
    clean_name = node_name.replace("CDISC ", "").replace("CT ", "").strip()
    return clean_name if clean_name else "CT Package"


# ============================================================
# API 1: GET /api/v1/global-library/tree
# ============================================================

@router.get(
    "/tree",
    response_model=list[TreeNode],
    summary="获取 CDISC 标准层级树",
    description="""
获取 CDISC 标准库的层级树结构，适配 Ant Design Tree 组件。

**层级结构：**
```
CDISC (根节点)
├── SDTM Model
│   ├── SDTM v2.1
│   ├── SDTM v2.0
│   └── SDTM v1.8 ...
├── SDTMIG
│   ├── SDTMIG 3.4
│   └── SDTMIG 3.3 ...
├── ADaM Model
│   ├── ADaM v1.3
│   └── ADaM v1.2 ...
├── ADaMIG
│   ├── ADaMIG 1.4
│   └── ADaMIG 1.3 ...
├── CDASHIG
│   └── CDASHIG 2.2 ...
├── SENDIG
│   └── SENDIG 3.2 ...
├── QRS
│   └── QRS Latest ...
├── CT (Controlled Terminology)
│   ├── SDTM CT 2024-12-27
│   ├── ADaM CT 2024-12-27
│   └── CDASH CT 2024-12-27 ...
├── TIG (Targeted Implementation Guide)
│   ├── SDTM for TIG v1.0
│   ├── ADaM for TIG v1.0
│   ├── CDASH for TIG v1.0
│   └── SEND for TIG v1.0
└── BC (Biomedical Concepts)
    └── BC Latest
```

**使用场景：**
- 左侧导航树
- 标准选择器
- 版本切换下拉框
    """,
    responses={
        200: {
            "description": "成功返回层级树",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "key": "sdtm",
                            "title": "SDTM",
                            "children": [
                                {"key": "sdtmig-3-4", "title": "SDTM-IG 3.4", "isLeaf": True, "spec_id": 1}
                            ]
                        }
                    ]
                }
            },
        },
    },
)
async def get_cdisc_tree(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
) -> list[TreeNode]:
    """
    获取 CDISC 标准层级树

    从数据库提取 CDISC 标准节点及其关联的 Specification（版本）
    返回适合 Ant Design Tree 组件消费的嵌套结构
    """
    # 1. 查询所有 CDISC 节点（根节点）
    cdisc_root_query = (
        select(ScopeNode)
        .where(
            ScopeNode.node_type == NodeType.CDISC,
            ScopeNode.is_deleted == False,
        )
        .order_by(ScopeNode.sort_order, ScopeNode.name)
    )
    cdisc_root_result = await db.execute(cdisc_root_query)
    cdisc_roots = cdisc_root_result.scalars().all()

    if not cdisc_roots:
        return []

    # 2. 获取所有 CDISC 节点的 ID
    cdisc_node_ids = [node.id for node in cdisc_roots]

    # 3. 查询这些节点下的所有 Specification（版本）
    # 使用子查询统计每个 specification 的 dataset 数量
    dataset_count_subquery = (
        select(
            TargetDataset.specification_id,
            func.count(TargetDataset.id).label("dataset_count")
        )
        .where(TargetDataset.is_deleted == False)
        .group_by(TargetDataset.specification_id)
        .subquery()
    )

    specs_query = (
        select(Specification, ScopeNode, func.coalesce(dataset_count_subquery.c.dataset_count, 0).label("dataset_count"))
        .join(ScopeNode, Specification.scope_node_id == ScopeNode.id)
        .outerjoin(dataset_count_subquery, dataset_count_subquery.c.specification_id == Specification.id)
        .where(
            Specification.scope_node_id.in_(cdisc_node_ids),
            Specification.is_deleted == False,
            ScopeNode.is_deleted == False,
        )
        .order_by(
            Specification.spec_type,
            Specification.version.desc(),
        )
    )
    specs_result = await db.execute(specs_query)
    specs_with_nodes = specs_result.all()

    # 4. 从规范名称中提取真实标准类型并分组
    # 规范名称格式: "CDISC SDTMIG v3.4 Specification" -> 提取 "SDTMIG"
    from collections import defaultdict
    import re

    # 标准类型提取规则（从名称中匹配）
    # 返回的键必须与 STANDARD_TYPE_INFO 中的键一致
    # 注意：TIG 必须放在最前面，因为 TIG 规格名称中包含 SDTM/ADaM/CDASH 等关键词
    STANDARD_TYPE_PATTERNS = [
        ("TIG", r"\bTIG\b|\bISS\b|\bISE\b|\bIntegrated\b"),  # TIG/ISS/ISE/Integrated - 必须优先匹配
        ("SDTMIG", r"\bSDTMIG\b"),
        ("SENDIG", r"\bSENDIG\b"),
        ("CDASHIG", r"\bCDASHIG\b"),
        ("CDASH", r"\bCDASH\b(?!IG)"),  # CDASH 但不是 CDASHIG
        ("SDTM", r"\bSDTM\b(?!IG)"),    # SDTM 但不是 SDTMIG
        ("ADaMIG", r"\bADAMIG\b"),      # 注意: 返回 ADaMIG (字典键)
        ("ADaM", r"\bADAM\b(?!IG)"),    # 注意: 返回 ADaM (字典键)
        ("QRS", r"\bQRS\b"),
    ]

    # 标准类型显示名称和排序
    STANDARD_TYPE_INFO = {
        "SDTM": {"label": "SDTM Model", "order": 1, "color": "blue"},
        "SDTMIG": {"label": "SDTMIG", "order": 2, "color": "blue"},
        "SENDIG": {"label": "SENDIG", "order": 3, "color": "purple"},
        "CDASH": {"label": "CDASH", "order": 4, "color": "orange"},
        "CDASHIG": {"label": "CDASHIG", "order": 5, "color": "orange"},
        "ADaM": {"label": "ADaM Model", "order": 6, "color": "green"},
        "ADaMIG": {"label": "ADaMIG", "order": 7, "color": "green"},
        "QRS": {"label": "QRS", "order": 8, "color": "magenta"},
        "CT": {"label": "Controlled Terminology", "order": 9, "color": "cyan"},
        "TIG": {"label": "Targeted Implementation Guide (TIG)", "order": 10, "color": "gold"},
    }

    def extract_standard_type(spec_name: str) -> str:
        """从规范名称中提取标准类型"""
        for std_type, pattern in STANDARD_TYPE_PATTERNS:
            if re.search(pattern, spec_name, re.IGNORECASE):
                return std_type
        return "Unknown"

    # 按提取的标准类型分组
    type_tree: dict[str, list[dict]] = defaultdict(list)

    for spec, scope_node, dataset_count in specs_with_nodes:
        # 跳过没有数据集的版本（避免前端显示空数据）
        if dataset_count == 0:
            continue

        std_type = extract_standard_type(spec.name)

        type_tree[std_type].append({
            "spec_id": spec.id,
            "spec_name": spec.name,
            "spec_type": spec.spec_type.value,
            "version": spec.version,
            "scope_node_id": scope_node.id,
            "scope_node_name": scope_node.name,
            "dataset_count": dataset_count,
        })

    # ============================================================
    # 5. CT 节点扫描 - 从 Codelist 表查询
    # ============================================================
    ct_query = (
        select(ScopeNode, func.count(Codelist.id).label("codelist_count"))
        .join(Codelist, Codelist.scope_node_id == ScopeNode.id)
        .where(
            ScopeNode.node_type == NodeType.CDISC,
            ScopeNode.is_deleted == False,
            Codelist.is_deleted == False,
        )
        .group_by(ScopeNode.id)
        .order_by(ScopeNode.name)
    )
    ct_result = await db.execute(ct_query)
    ct_nodes = ct_result.all()

    if ct_nodes:
        ct_versions = []
        for scope_node, codelist_count in ct_nodes:
            # 使用格式化函数生成人类可读的版本名称
            version_label = format_ct_version_name(scope_node.name)

            ct_versions.append({
                "scope_node_id": scope_node.id,
                "version_label": version_label,
                "codelist_count": codelist_count,
            })

        type_tree["CT"] = [{
            "spec_id": -v["scope_node_id"],  # 使用负数区分 CT 节点
            "spec_name": v["version_label"],
            "spec_type": "CT",
            "version": v["version_label"],
            "scope_node_id": v["scope_node_id"],
            "scope_node_name": v["version_label"],
            "codelist_count": v["codelist_count"],
        } for v in ct_versions]

    # ============================================================
    # 6. 构建最终的树结构（按排序顺序）
    # ============================================================
    tree_nodes: list[TreeNode] = []

    # 按预定义顺序生成节点
    for std_type in sorted(STANDARD_TYPE_INFO.keys(), key=lambda x: STANDARD_TYPE_INFO[x]["order"]):
        if std_type not in type_tree:
            continue

        versions = type_tree[std_type]
        type_info = STANDARD_TYPE_INFO[std_type]

        version_nodes: list[TreeNode] = []
        for spec_info in versions:
            # CT 节点特殊处理 - 使用 scope_node_id
            if std_type == "CT":
                scope_node_id = abs(spec_info["spec_id"])  # 还原正数
                version_nodes.append(
                    TreeNode(
                        key=f"ct-{scope_node_id}",
                        title=f"{spec_info['spec_name']} ({spec_info.get('codelist_count', 0)} codelists)",
                        value=str(scope_node_id),
                        isLeaf=True,
                        node_type="ct_version",  # 特殊类型标记
                        spec_id=None,
                        spec_type="CT",
                    )
                )
            else:
                version_nodes.append(
                    TreeNode(
                        key=f"{std_type.lower()}-{spec_info['spec_id']}",
                        title=spec_info["spec_name"],
                        value=str(spec_info["spec_id"]),
                        isLeaf=True,
                        node_type="version",
                        spec_id=spec_info["spec_id"],
                        spec_type=spec_info["spec_type"],
                    )
                )

        # 创建类型节点
        type_node = TreeNode(
            key=std_type.lower(),
            title=type_info["label"],
            children=version_nodes if version_nodes else None,
            isLeaf=False if version_nodes else True,
            node_type="standard_type",
            icon="folder",
        )
        tree_nodes.append(type_node)

    return tree_nodes


# ============================================================
# API 2: GET /api/v1/global-library/versions/{version_id}/datasets
# ============================================================

@router.get(
    "/versions/{version_id}/datasets",
    response_model=DatasetListResponse,
    summary="获取版本下的数据集列表",
    description="""
获取指定版本（Specification）下的所有数据集列表。

**核心功能：**
- 支持分页查询（limit/offset）
- 支持通过 `?search=` 对 dataset_name 或 description 进行模糊匹配
- 按数据集名称排序

**参数说明：**
- `version_id`: Specification ID（从树节点获取）
- `search`: 搜索关键词（可选）
- `limit`: 每页数量，默认 50，最大 500
- `offset`: 偏移量，默认 0

**使用场景：**
- Global Library 数据集浏览器
- Mapping Studio 目标数据集选择器
    """,
    responses={
        200: {
            "description": "成功返回数据集列表",
            "content": {
                "application/json": {
                    "example": {
                        "total": 50,
                        "items": [
                            {
                                "id": 1,
                                "specification_id": 1,
                                "dataset_name": "DM",
                                "description": "Demographics",
                                "class_type": "Special Purpose",
                                "sort_order": 1,
                            }
                        ],
                    }
                }
            },
        },
        404: {"description": "版本不存在"},
    },
)
async def get_version_datasets(
    version_id: int,
    user: CurrentUser,
    search: str | None = Query(None, description="搜索关键词（匹配名称或描述）", min_length=1, max_length=100),
    limit: int = Query(50, ge=1, le=500, description="每页数量"),
    offset: int = Query(0, ge=0, description="偏移量"),
    db: AsyncSession = Depends(get_db_session),
) -> DatasetListResponse:
    """
    获取版本下的数据集列表

    支持分页和模糊搜索
    """
    # 1. 验证 Specification 存在
    spec = await db.get(Specification, version_id)
    if not spec or spec.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Specification (version) with id {version_id} not found",
        )

    # 2. 构建基础查询
    base_query = (
        select(TargetDataset)
        .where(
            TargetDataset.specification_id == version_id,
            TargetDataset.is_deleted == False,
        )
    )

    # 3. 应用搜索条件
    if search:
        search_pattern = f"%{search}%"
        base_query = base_query.where(
            or_(
                TargetDataset.dataset_name.ilike(search_pattern),
                TargetDataset.description.ilike(search_pattern),
            )
        )

    # 4. 查询总数
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 5. 应用分页和排序
    query = (
        base_query
        .order_by(TargetDataset.dataset_name)
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)
    datasets = result.scalars().all()

    # 6. 构建响应 - 包含变量数量
    items = []
    for ds in datasets:
        # 查询变量数量
        var_count_query = select(func.count()).select_from(TargetVariable).where(
            TargetVariable.dataset_id == ds.id,
            TargetVariable.is_deleted == False,
        )
        var_count_result = await db.execute(var_count_query)
        var_count = var_count_result.scalar() or 0

        items.append(
            DatasetListItem(
                id=ds.id,
                specification_id=ds.specification_id,
                dataset_name=ds.dataset_name,
                description=ds.description,
                class_type=ds.class_type.value,
                sort_order=ds.sort_order,
                variable_count=var_count,
            )
        )

    return DatasetListResponse(total=total, items=items)


# ============================================================
# API 3: GET /api/v1/global-library/datasets/{dataset_id}/variables
# ============================================================

# CDISC 标准变量排序优先级（标识符优先）
CDISC_VARIABLE_PRIORITY = {
    "STUDYID": 1,
    "DOMAIN": 2,
    "USUBJID": 3,
    "SUBJID": 4,
    "SITEID": 5,
    "VISITNUM": 10,
    "VISIT": 11,
    "VISITDY": 12,
}


@router.get(
    "/datasets/{dataset_id}/variables",
    response_model=VariableListResponse,
    summary="获取数据集下的变量列表",
    description="""
获取指定数据集下的所有变量列表。

**核心功能：**
- 支持分页查询（limit/offset）
- 支持通过 `?search=` 对 variable_name 或 variable_label 进行模糊匹配
- 支持通过 `?core=` 对核心属性进行精确过滤（Req/Perm/Exp）
- 按 CDISC 标准习惯排序：标识符变量优先

**参数说明：**
- `dataset_id`: TargetDataset ID
- `search`: 搜索关键词（可选）
- `core`: 核心属性过滤（可选）- Req/Perm/Exp
- `limit`: 每页数量，默认 100，最大 500
- `offset`: 偏移量，默认 0

**使用场景：**
- Global Library 变量浏览器
- Mapping Studio 目标变量选择器
    """,
    responses={
        200: {
            "description": "成功返回变量列表",
            "content": {
                "application/json": {
                    "example": {
                        "total": 30,
                        "items": [
                            {
                                "id": 1,
                                "dataset_id": 1,
                                "variable_name": "STUDYID",
                                "variable_label": "Study Identifier",
                                "data_type": "Char",
                                "length": 12,
                                "core": "Req",
                                "origin_type": "CDISC",
                                "sort_order": 1,
                            }
                        ],
                    }
                }
            },
        },
        404: {"description": "数据集不存在"},
        400: {"description": "无效的 core 参数"},
    },
)
async def get_dataset_variables(
    dataset_id: int,
    user: CurrentUser,
    search: str | None = Query(None, description="搜索关键词（匹配变量名或标签）", min_length=1, max_length=100),
    core: str | None = Query(None, description="核心属性过滤：Req/Perm/Exp"),
    limit: int = Query(100, ge=1, le=500, description="每页数量"),
    offset: int = Query(0, ge=0, description="偏移量"),
    db: AsyncSession = Depends(get_db_session),
) -> VariableListResponse:
    """
    获取数据集下的变量列表

    支持分页、模糊搜索和 core 过滤
    """
    # 1. 验证 TargetDataset 存在
    dataset = await db.get(TargetDataset, dataset_id)
    if not dataset or dataset.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"TargetDataset with id {dataset_id} not found",
        )

    # 2. 验证 core 参数
    core_enum: VariableCore | None = None
    if core:
        try:
            core_enum = VariableCore(core)
        except ValueError:
            valid_cores = [e.value for e in VariableCore]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid core value '{core}'. Must be one of: {valid_cores}",
            )

    # 3. 构建基础查询
    base_query = (
        select(TargetVariable)
        .where(
            TargetVariable.dataset_id == dataset_id,
            TargetVariable.is_deleted == False,
        )
    )

    # 4. 应用搜索条件
    if search:
        search_pattern = f"%{search}%"
        base_query = base_query.where(
            or_(
                TargetVariable.variable_name.ilike(search_pattern),
                TargetVariable.variable_label.ilike(search_pattern),
            )
        )

    # 5. 应用 core 过滤
    if core_enum:
        base_query = base_query.where(TargetVariable.core == core_enum)

    # 6. 查询总数
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 7. 执行查询（获取所有数据用于自定义排序）
    query = base_query.order_by(TargetVariable.sort_order, TargetVariable.id)
    result = await db.execute(query)
    variables = result.scalars().all()

    # 8. 按 ordinal 数值排序（完全按照 CDISC 标准序号）
    def get_sort_key(var: TargetVariable) -> tuple:
        # 从 standard_metadata 提取 ordinal
        metadata = var.standard_metadata or {}
        extra = var.extra_attrs or {}
        var_info = metadata.get("var_info", {})
        ordinal_raw = var_info.get("ordinal") or metadata.get("ordinal") or extra.get("ordinal")
        try:
            ordinal_int = int(ordinal_raw) if ordinal_raw else var.sort_order
        except (ValueError, TypeError):
            ordinal_int = var.sort_order
        return (ordinal_int, var.id)

    sorted_variables = sorted(variables, key=get_sort_key)

    # 9. 应用分页
    paginated_variables = sorted_variables[offset:offset + limit]

    # 10. 构建响应
    items = []
    for var in paginated_variables:
        # 从 standard_metadata 提取扩展字段
        metadata = var.standard_metadata or {}
        extra = var.extra_attrs or {}
        var_info = metadata.get("var_info", {})  # SDTM Model 数据存储在 var_info 中
        var_links = var_info.get("_links", {})  # CDISC API links

        # 提取 qualifiesVariables（在 _links.qualifiesVariables 中）
        qualifies_var_raw = var_links.get("qualifiesVariables", [])
        qualifies_var = None
        if qualifies_var_raw:
            # 从 href 中提取变量名，如 "/mdr/sdtm/2-1/classes/Interventions/variables/--TRT" -> "--TRT"
            qualifies_var = []
            for item in qualifies_var_raw:
                if isinstance(item, dict):
                    href = item.get("href", "")
                    # 提取最后一个路径段作为变量名
                    if href:
                        var_name = href.split("/")[-1]
                        qualifies_var.append(var_name)
        elif metadata.get("qualifies_variable") or extra.get("qualifies_variable"):
            qualifies_var = metadata.get("qualifies_variable") or extra.get("qualifies_variable")
            if isinstance(qualifies_var, str):
                qualifies_var = [qualifies_var]

        # 提取 describedValueDomain
        described_domain = var_info.get("describedValueDomain") or metadata.get("described_value_domain") or extra.get("described_value_domain")

        # 提取 implements（从 _links.modelClassVariable 或 _links.modelDatasetVariable 提取 SDTM Model 变量信息）
        # - Findings/Events/Interventions 类变量使用 modelClassVariable
        # - Special Purpose 类变量使用 modelDatasetVariable
        implements_info = None
        import re

        # 优先检查 modelClassVariable（Findings/Events/Interventions 类）
        model_class_var = var_links.get("modelClassVariable")
        if model_class_var and isinstance(model_class_var, dict):
            href = model_class_var.get("href", "")
            # 解析 href: /mdr/sdtm/2-0/classes/GeneralObservations/variables/--SPID
            parts = href.split("/")
            if len(parts) >= 6 and "classes" in href:
                class_idx = parts.index("classes")
                if class_idx + 1 < len(parts):
                    class_name = parts[class_idx + 1]  # e.g., "GeneralObservations"
                    class_display = re.sub(r'([A-Z])', r' \1', class_name).strip()

                    if "variables" in parts:
                        var_idx = parts.index("variables")
                        if var_idx + 1 < len(parts):
                            model_var_name = parts[var_idx + 1]
                        else:
                            model_var_name = ""
                    else:
                        model_var_name = ""

                    implements_info = {
                        "class": class_display,
                        "variable": model_var_name,
                        "title": model_class_var.get("title", "")
                    }

        # 如果没有 modelClassVariable，检查 modelDatasetVariable（Special Purpose 类）
        if not implements_info:
            model_dataset_var = var_links.get("modelDatasetVariable")
            if model_dataset_var and isinstance(model_dataset_var, dict):
                href = model_dataset_var.get("href", "")
                # 解析 href: /mdr/sdtm/2-0/datasets/DM/variables/STUDYID
                parts = href.split("/")
                if "datasets" in href:
                    ds_idx = parts.index("datasets")
                    if ds_idx + 1 < len(parts):
                        dataset_name = parts[ds_idx + 1]  # e.g., "DM"

                        if "variables" in parts:
                            var_idx = parts.index("variables")
                            if var_idx + 1 < len(parts):
                                model_var_name = parts[var_idx + 1]
                            else:
                                model_var_name = ""
                        else:
                            model_var_name = ""

                        implements_info = {
                            "class": "Special Purpose",
                            "variable": model_var_name,
                            "title": model_dataset_var.get("title", "")
                        }

        items.append(
            VariableListItem(
                id=var.id,
                dataset_id=var.dataset_id,
                variable_name=var.variable_name,
                variable_label=var.variable_label,
                description=var.description,
                data_type=var.data_type.value,
                length=var.length,
                core=var.core.value,
                origin_type=var.origin_type.value,
                sort_order=var.sort_order,
                # 扩展字段
                role=metadata.get("role") or extra.get("role") or var_info.get("role"),
                codelist_name=metadata.get("codelist_name") or extra.get("codelist_name"),
                codelist_ref=metadata.get("codelist_ref") or extra.get("codelist_ref"),
                notes=var_info.get("notes") or metadata.get("notes") or extra.get("notes") or var.description,
                # Schema-Driven 新增字段
                ordinal=int(var_info.get("ordinal", 0)) or metadata.get("ordinal") or extra.get("ordinal") or var.sort_order,
                qualifies_variable=qualifies_var,
                described_value_domain=described_domain,
                # QRS 特有字段
                question_text=metadata.get("question_text") or extra.get("question_text"),
                prompt=metadata.get("prompt") or extra.get("prompt"),
                # SDTM Model 专用字段
                definition=var_info.get("definition") or metadata.get("definition") or extra.get("definition"),
                examples=var_info.get("examples") or metadata.get("examples") or extra.get("examples"),
                variable_ccode=var_info.get("variableCcode") or metadata.get("variable_ccode") or extra.get("variable_ccode"),
                usage_restrictions=var_info.get("usageRestrictions") or metadata.get("usage_restrictions") or extra.get("usage_restrictions"),
                # SDTM IG 专用字段
                implements=implements_info,
                value_list=var_info.get("valueList") or metadata.get("value_list") or extra.get("value_list"),
                # ADaM IG 专用字段
                var_set=metadata.get("var_set") or extra.get("var_set"),
            )
        )

    return VariableListResponse(total=total, items=items)


# ============================================================
# API 4 (Bonus): GET /api/v1/global-library/specifications
# ============================================================

@router.get(
    "/specifications",
    response_model=list[dict[str, Any]],
    summary="获取所有可用规范列表",
    description="""
获取所有可用的规范版本列表（简化版，用于下拉选择器）。

**返回字段：**
- id: Specification ID
- name: 规范名称
- spec_type: 规范类型
- version: 版本号
- standard_name: 标准来源名称
- standard_version: 标准版本

**使用场景：**
- 版本选择下拉框
- 快速切换标准版本
    """,
)
async def get_specifications_list(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
    spec_type: str | None = Query(None, description="按规范类型过滤：SDTM/ADaM/QRS"),
) -> list[dict[str, Any]]:
    """
    获取所有可用规范列表

    用于下拉选择器等场景
    """
    # 验证 spec_type 参数 (case-insensitive matching)
    spec_type_enum: SpecType | None = None
    if spec_type:
        spec_type_lower = spec_type.lower()
        for st in SpecType:
            if st.value.lower() == spec_type_lower:
                spec_type_enum = st
                break
        if spec_type_enum is None:
            valid_types = [e.value for e in SpecType]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid spec_type '{spec_type}'. Must be one of: {valid_types}",
            )

    # 构建查询
    query = (
        select(Specification)
        .where(
            Specification.is_deleted == False,
            Specification.status == "Active",  # 只返回激活的规范
        )
        .order_by(Specification.spec_type, Specification.version.desc())
    )

    if spec_type_enum:
        query = query.where(Specification.spec_type == spec_type_enum)

    result = await db.execute(query)
    specs = result.scalars().all()

    return [
        {
            "id": spec.id,
            "name": spec.name,
            "spec_type": spec.spec_type.value,
            "version": spec.version,
            "standard_name": spec.standard_name,
            "standard_version": spec.standard_version,
            "description": spec.description,
        }
        for spec in specs
    ]


# ============================================================
# API 5: GET /api/v1/global-library/schemas/{standard_type}
# Schema-Driven UI 支持
# ============================================================

# Schema 列定义模型
class ColumnSchema(BaseModel):
    """动态列定义"""
    dataIndex: str = Field(..., description="数据字段名")
    title: dict[str, str] = Field(..., description="多语言标题 {en, zh}")
    renderType: str = Field("text", description="渲染类型: text, tag, array, role, ordinal")
    width: int | None = Field(None, description="列宽度")
    align: str | None = Field(None, description="对齐方式: left, center, right")
    fixed: str | None = Field(None, description="固定列: left, right")


class TableSchema(BaseModel):
    """表格 Schema 响应"""
    standardType: str = Field(..., description="标准类型")
    columns: list[ColumnSchema] = Field(..., description="列定义列表")


# SDTM/ADaM 标准列定义（默认）
SDTM_ADAM_COLUMNS: list[ColumnSchema] = [
    ColumnSchema(
        dataIndex="ordinal",
        title={"en": "Ord", "zh": "序号"},
        renderType="ordinal",
        width=60,
        align="center",
        fixed="left"
    ),
    ColumnSchema(
        dataIndex="variable_name",
        title={"en": "Name", "zh": "变量名"},
        renderType="text",
        width=120,
        fixed="left"
    ),
    ColumnSchema(
        dataIndex="variable_label",
        title={"en": "Label", "zh": "标签"},
        renderType="text",
        width=200
    ),
    ColumnSchema(
        dataIndex="data_type",
        title={"en": "Data Type", "zh": "数据类型"},
        renderType="tag",
        width=90,
        align="center"
    ),
    ColumnSchema(
        dataIndex="role",
        title={"en": "Role", "zh": "角色"},
        renderType="role",
        width=100,
        align="center"
    ),
    ColumnSchema(
        dataIndex="qualifies_variable",
        title={"en": "Qualifies Variables", "zh": "修饰变量"},
        renderType="array",
        width=150
    ),
    ColumnSchema(
        dataIndex="described_value_domain",
        title={"en": "Described Value Domain", "zh": "值域"},
        renderType="tag",
        width=150
    ),
    ColumnSchema(
        dataIndex="description",
        title={"en": "Description", "zh": "描述"},
        renderType="text",
        width=250
    ),
]

# SDTM IG 专用列定义
# 参考 CDISC Library Browser 结构
SDTM_IG_COLUMNS: list[ColumnSchema] = [
    ColumnSchema(
        dataIndex="ordinal",
        title={"en": "Ordinal", "zh": "序号"},
        renderType="ordinal",
        width=70,
        align="center",
        fixed="left"
    ),
    ColumnSchema(
        dataIndex="variable_name",
        title={"en": "Name", "zh": "变量名"},
        renderType="text",
        width=120,
        fixed="left"
    ),
    ColumnSchema(
        dataIndex="variable_label",
        title={"en": "Label", "zh": "标签"},
        renderType="text",
        width=220
    ),
    ColumnSchema(
        dataIndex="description",
        title={"en": "Description", "zh": "描述"},
        renderType="longtext",
        width=250
    ),
    ColumnSchema(
        dataIndex="data_type",
        title={"en": "Data Type", "zh": "数据类型"},
        renderType="tag",
        width=90,
        align="center"
    ),
    ColumnSchema(
        dataIndex="role",
        title={"en": "Role", "zh": "角色"},
        renderType="role",
        width=100,
        align="center"
    ),
    ColumnSchema(
        dataIndex="core",
        title={"en": "Core", "zh": "核心性"},
        renderType="tag",
        width=70,
        align="center"
    ),
    ColumnSchema(
        dataIndex="codelist_name",
        title={"en": "Code List", "zh": "代码表"},
        renderType="text",
        width=150
    ),
    ColumnSchema(
        dataIndex="described_value_domain",
        title={"en": "Described Value Domain", "zh": "描述值域"},
        renderType="longtext",
        width=180
    ),
    ColumnSchema(
        dataIndex="implements",
        title={"en": "Implements", "zh": "实现"},
        renderType="implements",
        width=180
    ),
    ColumnSchema(
        dataIndex="value_list",
        title={"en": "Value List", "zh": "值列表"},
        renderType="array",
        width=150
    ),
]

# QRS 标准列定义
# 注意: QRS 数据中 question_text 为空，variable_label 包含问卷问题文本
QRS_COLUMNS: list[ColumnSchema] = [
    ColumnSchema(
        dataIndex="ordinal",
        title={"en": "Ord", "zh": "序号"},
        renderType="ordinal",
        width=60,
        align="center",
        fixed="left"
    ),
    ColumnSchema(
        dataIndex="variable_name",
        title={"en": "Item Code", "zh": "项目编码"},
        renderType="text",
        width=100,
        fixed="left"
    ),
    ColumnSchema(
        dataIndex="variable_label",
        title={"en": "Question Text", "zh": "问题文本"},
        renderType="longtext",
        width=400
    ),
    ColumnSchema(
        dataIndex="data_type",
        title={"en": "Response Type", "zh": "响应类型"},
        renderType="tag",
        width=100,
        align="center"
    ),
    ColumnSchema(
        dataIndex="described_value_domain",
        title={"en": "Codelist/Responses", "zh": "代码表"},
        renderType="tag",
        width=150
    ),
]

# CT (Controlled Terminology) 标准列定义
CT_COLUMNS: list[ColumnSchema] = [
    ColumnSchema(
        dataIndex="ordinal",
        title={"en": "Ord", "zh": "序号"},
        renderType="ordinal",
        width=60,
        align="center",
        fixed="left"
    ),
    ColumnSchema(
        dataIndex="codelist_name",
        title={"en": "Codelist Name", "zh": "代码表名称"},
        renderType="text",
        width=200,
        fixed="left"
    ),
    ColumnSchema(
        dataIndex="codelist_ref",
        title={"en": "NCI Code", "zh": "NCI编码"},
        renderType="tag",
        width=120
    ),
    ColumnSchema(
        dataIndex="description",
        title={"en": "Description", "zh": "描述"},
        renderType="text",
        width=300
    ),
]

# SDTM Model 专用列定义 (Class Variables)
# 参考 CDISC Library Browser 结构
SDTM_MODEL_COLUMNS: list[ColumnSchema] = [
    ColumnSchema(
        dataIndex="ordinal",
        title={"en": "Ord", "zh": "序号"},
        renderType="ordinal",
        width=50,
        align="center",
        fixed="left"
    ),
    ColumnSchema(
        dataIndex="variable_name",
        title={"en": "Variable Name", "zh": "变量名"},
        renderType="text",
        width=100,
        fixed="left"
    ),
    ColumnSchema(
        dataIndex="variable_label",
        title={"en": "Label", "zh": "标签"},
        renderType="text",
        width=200
    ),
    ColumnSchema(
        dataIndex="data_type",
        title={"en": "Data Type", "zh": "数据类型"},
        renderType="tag",
        width=80,
        align="center"
    ),
    ColumnSchema(
        dataIndex="role",
        title={"en": "Role", "zh": "角色"},
        renderType="role",
        width=100,
        align="center"
    ),
    ColumnSchema(
        dataIndex="core",
        title={"en": "Core", "zh": "核心性"},
        renderType="tag",
        width=70,
        align="center"
    ),
    ColumnSchema(
        dataIndex="qualifies_variable",
        title={"en": "Qualifies Variables", "zh": "修饰变量"},
        renderType="array",
        width=150
    ),
    ColumnSchema(
        dataIndex="described_value_domain",
        title={"en": "Described Value Domain", "zh": "值域"},
        renderType="longtext",
        width=220
    ),
    ColumnSchema(
        dataIndex="definition",
        title={"en": "Definition", "zh": "定义"},
        renderType="longtext",
        width=300
    ),
    ColumnSchema(
        dataIndex="notes",
        title={"en": "Notes", "zh": "说明"},
        renderType="longtext",
        width=250
    ),
    ColumnSchema(
        dataIndex="usage_restrictions",
        title={"en": "Usage Restrictions", "zh": "使用限制"},
        renderType="text",
        width=150
    ),
    ColumnSchema(
        dataIndex="variable_ccode",
        title={"en": "Variable C-Code", "zh": "C-Code"},
        renderType="tag",
        width=100
    ),
    ColumnSchema(
        dataIndex="examples",
        title={"en": "Examples", "zh": "示例"},
        renderType="longtext",
        width=200
    ),
]


@router.get(
    "/schemas/{standard_type}",
    response_model=TableSchema,
    summary="获取标准类型的表格 Schema",
    description="""
获取指定标准类型的动态表格列定义。

**支持的标准类型：**
- `sdtm`, `sdtmig`, `adam`, `adamig`, `cdash`, `send`: 返回 SDTM/ADaM 标准列
- `qrs`: 返回问卷标准列
- `ct`: 返回受控术语标准列

**Schema 结构：**
- `dataIndex`: 数据字段名
- `title`: 多语言标题 `{en, zh}`
- `renderType`: 渲染类型 (text, tag, array, role, ordinal)
- `width`: 列宽度
- `align`: 对齐方式
- `fixed`: 固定列位置
    """,
)
async def get_table_schema(
    standard_type: str,
    user: CurrentUser,
) -> TableSchema:
    """
    获取表格 Schema

    根据标准类型返回不同的列定义
    """
    std_type_lower = standard_type.lower()

    # 根据标准类型选择 Schema
    if std_type_lower == "qrs":
        columns = QRS_COLUMNS
    elif std_type_lower == "ct":
        columns = CT_COLUMNS
    elif std_type_lower == "sdtm":
        # SDTM Model (Foundational Model) 使用专用 Schema
        columns = SDTM_MODEL_COLUMNS
    elif std_type_lower == "sdtmig":
        # SDTM IG 使用专用 Schema
        columns = SDTM_IG_COLUMNS
    else:
        # ADaM, ADaMIG, CDASH, SEND 等使用默认 Schema
        columns = SDTM_ADAM_COLUMNS

    return TableSchema(
        standardType=standard_type.upper(),
        columns=columns
    )


# ============================================================
# API 6: GET /api/v1/global-library/ct/{scope_node_id}/codelists
# CT专属: 获取 CT 版本下的 Codelist 列表
# ============================================================

@router.get(
    "/ct/{scope_node_id}/codelists",
    response_model=CodelistListResponse,
    summary="获取 CT 版本下的 Codelist 列表",
    description="""
获取指定 CT 版本（ScopeNode）下的所有 Codelist 列表。

**核心功能：**
- 支持分页查询（limit/offset）
- 支持通过 `?search=` 对 name 或 codelist_id 进行模糊匹配
- 按 name 排序

**参数说明：**
- `scope_node_id`: ScopeNode ID（从树节点获取，CT节点使用 scope_node_id）
- `search`: 搜索关键词（可选）
- `limit`: 每页数量，默认 50，最大 500
- `offset`: 偏移量，默认 0
    """,
)
async def get_ct_codelists(
    scope_node_id: int,
    user: CurrentUser,
    search: str | None = Query(None, description="搜索关键词（匹配名称或Codelist ID）", min_length=1, max_length=100),
    limit: int = Query(50, ge=1, le=500, description="每页数量"),
    offset: int = Query(0, ge=0, description="偏移量"),
    db: AsyncSession = Depends(get_db_session),
) -> CodelistListResponse:
    """
    获取 CT 版本下的 Codelist 列表

    支持分页和模糊搜索
    """
    # 1. 验证 ScopeNode 存在
    scope_node = await db.get(ScopeNode, scope_node_id)
    if not scope_node or scope_node.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ScopeNode with id {scope_node_id} not found",
        )

    # 2. 构建基础查询 - 包含术语计数
    base_query = (
        select(Codelist, func.count(CodelistTerm.id).label("term_count"))
        .outerjoin(CodelistTerm, CodelistTerm.codelist_id == Codelist.id)
        .where(
            Codelist.scope_node_id == scope_node_id,
            Codelist.is_deleted == False,
        )
        .group_by(Codelist.id)
    )

    # 3. 应用搜索条件
    if search:
        search_pattern = f"%{search}%"
        base_query = base_query.where(
            or_(
                Codelist.name.ilike(search_pattern),
                Codelist.codelist_id.ilike(search_pattern),
                Codelist.ncit_code.ilike(search_pattern),
            )
        )

    # 4. 查询总数
    count_query = select(func.count()).select_from(
        select(Codelist)
        .where(
            Codelist.scope_node_id == scope_node_id,
            Codelist.is_deleted == False,
        )
        .subquery()
    )
    if search:
        count_query = select(func.count()).select_from(
            select(Codelist)
            .where(
                Codelist.scope_node_id == scope_node_id,
                Codelist.is_deleted == False,
                or_(
                    Codelist.name.ilike(f"%{search}%"),
                    Codelist.codelist_id.ilike(f"%{search}%"),
                ),
            )
            .subquery()
        )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 5. 应用分页和排序
    query = (
        base_query
        .order_by(Codelist.name)
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    # 6. 构建响应
    items = [
        CodelistListItem(
            id=row[0].id,
            scope_node_id=row[0].scope_node_id,
            codelist_id=row[0].codelist_id,
            name=row[0].name,
            ncit_code=row[0].ncit_code,
            definition=row[0].definition,
            term_count=row[1] if len(row) > 1 else 0,
            sort_order=row[0].sort_order,
        )
        for row in rows
    ]

    return CodelistListResponse(total=total, items=items)


# ============================================================
# API 7: GET /api/v1/global-library/codelists/{codelist_id}/terms
# CT专属: 获取 Codelist 下的 Term 列表
# ============================================================

@router.get(
    "/codelists/{codelist_id}/terms",
    response_model=TermListResponse,
    summary="获取 Codelist 下的 Term 列表",
    description="""
获取指定 Codelist 下的所有 Term 列表。

**核心功能：**
- 支持分页查询（limit/offset）
- 支持通过 `?search=` 对 name 或 term_value 进行模糊匹配
- 按 sort_order 排序

**参数说明：**
- `codelist_id`: Codelist ID
- `search`: 搜索关键词（可选）
- `limit`: 每页数量，默认 100，最大 500
- `offset`: 偏移量，默认 0
    """,
)
async def get_codelist_terms(
    codelist_id: int,
    user: CurrentUser,
    search: str | None = Query(None, description="搜索关键词（匹配名称或术语值）", min_length=1, max_length=100),
    limit: int = Query(100, ge=1, le=500, description="每页数量"),
    offset: int = Query(0, ge=0, description="偏移量"),
    db: AsyncSession = Depends(get_db_session),
) -> TermListResponse:
    """
    获取 Codelist 下的 Term 列表

    支持分页和模糊搜索
    """
    # 1. 验证 Codelist 存在
    codelist = await db.get(Codelist, codelist_id)
    if not codelist or codelist.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Codelist with id {codelist_id} not found",
        )

    # 2. 构建基础查询
    base_query = (
        select(CodelistTerm)
        .where(
            CodelistTerm.codelist_id == codelist_id,
            CodelistTerm.is_deleted == False,
        )
    )

    # 3. 应用搜索条件
    if search:
        search_pattern = f"%{search}%"
        base_query = base_query.where(
            or_(
                CodelistTerm.name.ilike(search_pattern),
                CodelistTerm.term_value.ilike(search_pattern),
                CodelistTerm.ncit_code.ilike(search_pattern),
            )
        )

    # 4. 查询总数
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 5. 应用分页和排序
    query = (
        base_query
        .order_by(CodelistTerm.sort_order, CodelistTerm.id)
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)
    terms = result.scalars().all()

    # 6. 构建响应
    items = [
        TermListItem(
            id=term.id,
            codelist_id=term.codelist_id,
            term_id=term.term_id,
            term_value=term.term_value,
            ncit_code=term.ncit_code,
            name=term.name,
            definition=term.definition,
            submission_value=term.submission_value,
            sort_order=term.sort_order,
        )
        for term in terms
    ]

    return TermListResponse(total=total, items=items)