"""
Study Specification API Router

项目级 SDTM/ADaM 规范管理 API

与 Global Library API 的区别：
- Global Library: 只读浏览 CDISC 官方标准
- Study Spec: 完整 CRUD，管理试验级别规范，支持继承机制

核心功能：
1. 获取 Study Spec 列表（支持 ScopeNode 过滤）
2. 获取 Spec 详情
3. 获取数据集列表
4. 获取变量列表
"""
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db_session
from app.models import ScopeNode, Specification, TargetDataset, TargetVariable
from app.models.mapping_enums import DatasetClass, DataType, OriginType, OverrideType, SpecStatus, SpecType, VariableCore

router = APIRouter(prefix="/study-specs", tags=["Study Specification"])


# ============================================================
# Helper Functions
# ============================================================

def _ok(data: Any = None, msg: str = "success") -> dict:
    """统一成功响应格式"""
    return {"code": "0000", "msg": msg, "data": data}


# ============================================================
# Response Models
# ============================================================

class StudySpecListItem(BaseModel):
    """Study Spec 列表项"""

    id: int
    scope_node_id: int
    scope_node_code: str
    scope_node_name: str
    name: str
    spec_type: str
    version: str
    status: str
    description: str | None = None
    # 继承信息
    base_specification_id: int | None = None
    base_specification_name: str | None = None
    # 统计信息
    dataset_count: int = 0
    # 审计信息
    created_by: str
    created_at: str
    updated_by: str | None = None
    updated_at: str | None = None


class StudySpecListResponse(BaseModel):
    """Study Spec 列表响应"""

    total: int
    items: list[StudySpecListItem]


class StudyDatasetListItem(BaseModel):
    """Study Dataset 列表项"""

    id: int
    specification_id: int
    dataset_name: str
    description: str | None = None
    class_type: str
    sort_order: int = 0
    # 继承信息
    base_id: int | None = None
    override_type: str
    origin_type: str
    # 统计
    variable_count: int = 0
    # 审计
    created_by: str
    created_at: str


class StudyDatasetListResponse(BaseModel):
    """Study Dataset 列表响应"""

    total: int
    items: list[StudyDatasetListItem]


class StudyVariableListItem(BaseModel):
    """Study Variable 列表项"""

    id: int
    dataset_id: int
    variable_name: str
    variable_label: str | None = None
    description: str | None = None
    data_type: str
    length: int | None = None
    core: str
    sort_order: int = 0
    # 继承信息
    base_id: int | None = None
    override_type: str
    origin_type: str
    # 扩展字段
    role: str | None = None
    codelist_name: str | None = None
    codelist_ref: str | None = None
    # 审计
    created_by: str
    created_at: str


class StudyVariableListResponse(BaseModel):
    """Study Variable 列表响应"""

    total: int
    items: list[StudyVariableListItem]
    summary: dict[str, Any]


class StudySpecDetail(BaseModel):
    """Study Spec 详情"""

    id: int
    scope_node_id: int
    scope_node_code: str
    scope_node_name: str
    name: str
    spec_type: str
    version: str
    status: str
    description: str | None = None
    # 继承信息
    base_specification_id: int | None = None
    base_specification: dict[str, Any] | None = None
    # 标准信息
    standard_name: str | None = None
    standard_version: str | None = None
    # 统计信息
    dataset_count: int = 0
    variable_count: int = 0
    # 审计
    created_by: str
    created_at: str
    updated_by: str | None = None
    updated_at: str | None = None


# ============================================================
# API 1: GET /api/v1/study-specs - 获取 Study Spec 列表
# ============================================================


class StudySpecListParams(BaseModel):
    """查询参数"""

    scope_node_id: int | None = None
    scope_node_code: str | None = None
    spec_type: str | None = None
    status: str | None = None
    search: str | None = None
    limit: int = 20
    offset: int = 0


@router.get(
    "",
    summary="获取 Study Spec 列表",
    description="""
获取项目级别的 SDTM/ADaM 规范列表。

**查询参数：**
- `scope_node_id`: 按 ScopeNode ID 过滤
- `scope_node_code`: 按 ScopeNode code 过滤
- `spec_type`: 按规范类型过滤 (SDTM/ADaM/QRS)
- `status`: 按状态过滤 (Draft/Active/Archived)
- `search`: 搜索名称/描述
- `limit`: 分页大小，默认 20
- `offset`: 偏移量
""",
)
async def get_study_specs(
    scope_node_id: int | None = Query(None, description="ScopeNode ID"),
    scope_node_code: str | None = Query(None, description="ScopeNode code"),
    spec_type: str | None = Query(None, description="规范类型：SDTM/ADaM/QRS"),
    status: str | None = Query(None, description="状态：Draft/Active/Archived"),
    search: str | None = Query(None, description="搜索关键词"),
    limit: int = Query(20, ge=1, le=100, description="分页大小"),
    offset: int = Query(0, ge=0, description="偏移量"),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """获取 Study Spec 列表"""
    # 构建基础查询
    query = (
        select(Specification)
        .options(selectinload(Specification.datasets))
        .where(Specification.is_deleted == False)  # noqa: E712
    )

    # 按 ScopeNode 过滤
    if scope_node_id:
        query = query.where(Specification.scope_node_id == scope_node_id)

    if scope_node_code:
        # 通过 join ScopeNode 过滤
        scope_subquery = select(ScopeNode.id).where(ScopeNode.code == scope_node_code).scalar_subquery()
        query = query.where(Specification.scope_node_id == scope_subquery)

    # 按规范类型过滤
    if spec_type:
        try:
            spec_type_enum = SpecType(spec_type.upper())
            query = query.where(Specification.spec_type == spec_type_enum)
        except ValueError:
            pass

    # 按状态过滤
    if status:
        try:
            status_enum = SpecStatus(status.capitalize())
            query = query.where(Specification.status == status_enum)
        except ValueError:
            pass

    # 搜索
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                Specification.name.ilike(search_pattern),
                Specification.description.ilike(search_pattern),
            )
        )

    # 统计总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 分页
    query = query.order_by(Specification.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    specs = result.scalars().all()

    # 获取 ScopeNode 信息
    scope_node_ids = [spec.scope_node_id for spec in specs]
    scope_query = select(ScopeNode).where(ScopeNode.id.in_(scope_node_ids))
    scope_result = await db.execute(scope_query)
    scope_nodes = {sn.id: sn for sn in scope_result.scalars().all()}

    # 构建响应
    items = []
    for spec in specs:
        scope_node = scope_nodes.get(spec.scope_node_id)
        # 统计数据集数量（排除软删除的）
        dataset_count = len([d for d in spec.datasets if not d.is_deleted])

        # 获取基线 Spec 名称
        base_spec_name = None
        if spec.base_specification_id:
            base_query = select(Specification.name).where(Specification.id == spec.base_specification_id)
            base_result = await db.execute(base_query)
            base_spec_name = base_result.scalar()

        items.append(
            StudySpecListItem(
                id=spec.id,
                scope_node_id=spec.scope_node_id,
                scope_node_code=scope_node.code if scope_node else "",
                scope_node_name=scope_node.name if scope_node else "",
                name=spec.name,
                spec_type=spec.spec_type.value,
                version=spec.version,
                status=spec.status.value,
                description=spec.description,
                base_specification_id=spec.base_specification_id,
                base_specification_name=base_spec_name,
                dataset_count=dataset_count,
                created_by=spec.created_by,
                created_at=spec.created_at.isoformat() if spec.created_at else "",
                updated_by=spec.updated_by,
                updated_at=spec.updated_at.isoformat() if spec.updated_at else None,
            ).model_dump()
        )

    return _ok(StudySpecListResponse(total=total, items=items).model_dump())


# ============================================================
# API 2: GET /api/v1/study-specs/{spec_id} - 获取详情
# ============================================================


@router.get(
    "/{spec_id}",
    summary="获取 Study Spec 详情",
)
async def get_study_spec_detail(
    spec_id: int,
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """获取 Study Spec 详情"""
    # 查询 Spec
    query = (
        select(Specification)
        .options(selectinload(Specification.datasets))
        .where(Specification.id == spec_id, Specification.is_deleted == False)  # noqa: E712
    )

    result = await db.execute(query)
    spec = result.scalar_one_or_none()

    if not spec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study Specification with id {spec_id} not found",
        )

    # 获取 ScopeNode 信息
    scope_query = select(ScopeNode).where(ScopeNode.id == spec.scope_node_id)
    scope_result = await db.execute(scope_query)
    scope_node = scope_result.scalar_one_or_none()

    # 统计数据集和变量数量
    dataset_count = 0
    variable_count = 0
    for dataset in spec.datasets:
        if not dataset.is_deleted:
            dataset_count += 1
            # 统计变量
            var_query = select(func.count()).where(
                TargetVariable.dataset_id == dataset.id, TargetVariable.is_deleted == False  # noqa: E712
            )
            var_result = await db.execute(var_query)
            variable_count += var_result.scalar() or 0

    # 获取基线 Spec 信息
    base_specification = None
    if spec.base_specification_id:
        base_query = select(Specification).where(Specification.id == spec.base_specification_id)
        base_result = await db.execute(base_query)
        base_spec = base_result.scalar_one_or_none()
        if base_spec:
            base_specification = {
                "id": base_spec.id,
                "name": base_spec.name,
                "spec_type": base_spec.spec_type.value,
                "version": base_spec.version,
            }

    return _ok(StudySpecDetail(
        id=spec.id,
        scope_node_id=spec.scope_node_id,
        scope_node_code=scope_node.code if scope_node else "",
        scope_node_name=scope_node.name if scope_node else "",
        name=spec.name,
        spec_type=spec.spec_type.value,
        version=spec.version,
        status=spec.status.value,
        description=spec.description,
        base_specification_id=spec.base_specification_id,
        base_specification=base_specification,
        standard_name=spec.standard_name,
        standard_version=spec.standard_version,
        dataset_count=dataset_count,
        variable_count=variable_count,
        created_by=spec.created_by,
        created_at=spec.created_at.isoformat() if spec.created_at else "",
        updated_by=spec.updated_by,
        updated_at=spec.updated_at.isoformat() if spec.updated_at else None,
    ).model_dump())


# ============================================================
# API 3: GET /api/v1/study-specs/{spec_id}/datasets - 获取数据集列表
# ============================================================


@router.get(
    "/{spec_id}/datasets",
    summary="获取数据集列表",
)
async def get_study_datasets(
    spec_id: int,
    search: str | None = Query(None, description="搜索关键词"),
    class_type: str | None = Query(None, description="数据集分类"),
    limit: int = Query(50, ge=1, le=200, description="分页大小"),
    offset: int = Query(0, ge=0, description="偏移量"),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """获取 Study Spec 下的数据集列表"""
    # 验证 Spec 存在
    spec_query = select(Specification.id).where(
        Specification.id == spec_id, Specification.is_deleted == False  # noqa: E712
    )
    spec_result = await db.execute(spec_query)
    if not spec_result.scalar():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study Specification with id {spec_id} not found",
        )

    # 构建查询
    query = select(TargetDataset).where(
        TargetDataset.specification_id == spec_id, TargetDataset.is_deleted == False  # noqa: E712
    )

    # 按分类过滤
    if class_type:
        try:
            class_enum = DatasetClass(class_type.upper())
            query = query.where(TargetDataset.class_type == class_enum)
        except ValueError:
            pass

    # 搜索
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                TargetDataset.dataset_name.ilike(search_pattern),
                TargetDataset.description.ilike(search_pattern),
            )
        )

    # 统计总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 分页查询
    query = query.order_by(TargetDataset.sort_order, TargetDataset.dataset_name).offset(offset).limit(limit)

    result = await db.execute(query)
    datasets = result.scalars().all()

    # 统计每个数据集的变量数量
    dataset_ids = [d.id for d in datasets]
    var_count_query = (
        select(TargetDataset.id, func.count(TargetVariable.id).label("count"))
        .outerjoin(TargetVariable, TargetVariable.dataset_id == TargetDataset.id)
        .where(
            TargetDataset.id.in_(dataset_ids),
            TargetVariable.is_deleted == False,  # noqa: E712
        )
        .group_by(TargetDataset.id)
    )
    var_count_result = await db.execute(var_count_query)
    var_counts = {row.id: row.count for row in var_count_result.all()}

    # 构建响应
    items = []
    for dataset in datasets:
        items.append(
            StudyDatasetListItem(
                id=dataset.id,
                specification_id=dataset.specification_id,
                dataset_name=dataset.dataset_name,
                description=dataset.description,
                class_type=dataset.class_type.value,
                sort_order=dataset.sort_order,
                base_id=dataset.base_id,
                override_type=dataset.override_type.value,
                origin_type=dataset.origin_type.value,
                variable_count=var_counts.get(dataset.id, 0),
                created_by=dataset.created_by,
                created_at=dataset.created_at.isoformat() if dataset.created_at else "",
            ).model_dump()
        )

    return _ok(StudyDatasetListResponse(total=total, items=items).model_dump())


# ============================================================
# API 4: GET /api/v1/study-specs/datasets/{dataset_id}/variables - 获取变量列表
# ============================================================


@router.get(
    "/datasets/{dataset_id}/variables",
    summary="获取变量列表",
)
async def get_dataset_variables(
    dataset_id: int,
    search: str | None = Query(None, description="搜索关键词"),
    core: str | None = Query(None, description="核心性：Req/Exp/Perm"),
    origin_type: str | None = Query(None, description="来源类型"),
    limit: int = Query(100, ge=1, le=500, description="分页大小"),
    offset: int = Query(0, ge=0, description="偏移量"),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """获取数据集下的变量列表"""
    # 验证 Dataset 存在
    dataset_query = select(TargetDataset).where(
        TargetDataset.id == dataset_id, TargetDataset.is_deleted == False  # noqa: E712
    )
    dataset_result = await db.execute(dataset_query)
    dataset = dataset_result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset with id {dataset_id} not found",
        )

    # 构建查询
    query = select(TargetVariable).where(
        TargetVariable.dataset_id == dataset_id, TargetVariable.is_deleted == False  # noqa: E712
    )

    # 按核心性过滤
    if core:
        try:
            core_enum = VariableCore(core.capitalize())
            query = query.where(TargetVariable.core == core_enum)
        except ValueError:
            pass

    # 按来源类型过滤
    if origin_type:
        try:
            origin_enum = OriginType(origin_type)
            query = query.where(TargetVariable.origin_type == origin_enum)
        except ValueError:
            pass

    # 搜索
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                TargetVariable.variable_name.ilike(search_pattern),
                TargetVariable.variable_label.ilike(search_pattern),
            )
        )

    # 统计总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 分页查询
    query = query.order_by(TargetVariable.sort_order, TargetVariable.variable_name).offset(offset).limit(limit)

    result = await db.execute(query)
    variables = result.scalars().all()

    # 构建响应
    items = []
    req_count = 0
    exp_count = 0
    perm_count = 0

    for var in variables:
        # 统计核心性
        if var.core == VariableCore.REQ:
            req_count += 1
        elif var.core == VariableCore.EXP:
            exp_count += 1
        else:
            perm_count += 1

        # 从 standard_metadata 获取扩展字段
        metadata = var.standard_metadata or {}
        role = metadata.get("role")
        codelist_name = metadata.get("codelist_name")
        codelist_ref = metadata.get("codelist_ref")

        items.append(
            StudyVariableListItem(
                id=var.id,
                dataset_id=var.dataset_id,
                variable_name=var.variable_name,
                variable_label=var.variable_label,
                description=var.description,
                data_type=var.data_type.value,
                length=var.length,
                core=var.core.value,
                sort_order=var.sort_order,
                base_id=var.base_id,
                override_type=var.override_type.value,
                origin_type=var.origin_type.value,
                role=role,
                codelist_name=codelist_name,
                codelist_ref=codelist_ref,
                created_by=var.created_by,
                created_at=var.created_at.isoformat() if var.created_at else "",
            ).model_dump()
        )

    return _ok(StudyVariableListResponse(
        total=total,
        items=items,
        summary={
            "total_variables": total,
            "req_count": req_count,
            "exp_count": exp_count,
            "perm_count": perm_count,
        },
    ).model_dump())


# ============================================================
# API 5: POST /api/v1/study-specs/from-global-library - 从 Global Library 初始化
# ============================================================


class CreateFromGlobalLibraryRequest(BaseModel):
    """从 Global Library 创建 Study Spec 请求"""

    scope_node_id: int = Field(..., description="Study 的 ScopeNode ID")
    spec_type: str = Field(..., description="规范类型：SDTM/ADaM")
    base_specification_id: int = Field(..., description="Global Library 中的 Specification ID")
    name: str | None = Field(None, description="Spec 名称，默认使用基线名称")


class CreateFromGlobalLibraryResponse(BaseModel):
    """从 Global Library 创建 Study Spec 响应"""

    id: int
    name: str
    spec_type: str
    base_specification_id: int
    dataset_count: int
    variable_count: int
    message: str


@router.post(
    "/from-global-library",
    summary="从 Global Library 初始化 Study Spec",
    description="""
从 Global Library 创建 Study Spec，自动继承对应版本的 Dataset 和 Variable 定义。

**继承机制：**
1. 创建新的 Specification，设置 base_specification_id
2. 复制 Global Library 的 Dataset 定义，设置 base_id
3. 复制 Global Library 的 Variable 定义，设置 base_id 和 origin_type=CDISC

**适用场景：**
- Study 配置了标准版本后，初始化 SDTM/ADaM Spec
- 需要基于 CDISC 标准版本创建 Study Spec
""",
)
async def create_study_spec_from_global_library(
    request: CreateFromGlobalLibraryRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(lambda: {"id": "system"}),
) -> dict:
    """从 Global Library 初始化 Study Spec"""
    # 1. 验证基线 Specification 存在
    base_query = (
        select(Specification)
        .options(selectinload(Specification.datasets))
        .where(
            Specification.id == request.base_specification_id,
            Specification.is_deleted == False,  # noqa: E712
        )
    )
    base_result = await db.execute(base_query)
    base_spec = base_result.scalar_one_or_none()

    if not base_spec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Global Library Specification with id {request.base_specification_id} not found",
        )

    # 2. 验证 ScopeNode 存在
    scope_query = select(ScopeNode).where(ScopeNode.id == request.scope_node_id)
    scope_result = await db.execute(scope_query)
    scope_node = scope_result.scalar_one_or_none()

    if not scope_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ScopeNode with id {request.scope_node_id} not found",
        )

    # 3. 检查是否已存在同类型的 Spec
    existing_query = select(Specification).where(
        Specification.scope_node_id == request.scope_node_id,
        Specification.spec_type == SpecType(request.spec_type.upper()),
        Specification.is_deleted == False,  # noqa: E712
    )
    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{request.spec_type} Spec already exists for this Study",
        )

    # 4. 创建新的 Specification
    spec_name = request.name or f"{scope_node.name} {request.spec_type} Specification"
    new_spec = Specification(
        scope_node_id=request.scope_node_id,
        name=spec_name,
        spec_type=SpecType(request.spec_type.upper()),
        version="1.0",
        status=SpecStatus.DRAFT,
        base_specification_id=request.base_specification_id,
        standard_name=base_spec.standard_name,
        standard_version=base_spec.standard_version,
        created_by=current_user.get("id", "system"),
    )
    db.add(new_spec)
    await db.flush()  # 获取 new_spec.id

    # 5. 复制 Dataset 和 Variable
    dataset_count = 0
    variable_count = 0

    for base_dataset in base_spec.datasets:
        if base_dataset.is_deleted:
            continue

        # 创建新的 Dataset
        new_dataset = TargetDataset(
            specification_id=new_spec.id,
            dataset_name=base_dataset.dataset_name,
            description=base_dataset.description,
            class_type=base_dataset.class_type,
            sort_order=base_dataset.sort_order,
            base_id=base_dataset.id,
            override_type=OverrideType.NONE,
            origin_type=base_dataset.origin_type,
            created_by=current_user.get("id", "system"),
        )
        db.add(new_dataset)
        await db.flush()

        dataset_count += 1

        # 复制 Variables
        var_query = select(TargetVariable).where(
            TargetVariable.dataset_id == base_dataset.id,
            TargetVariable.is_deleted == False,  # noqa: E712
        ).order_by(TargetVariable.sort_order)

        var_result = await db.execute(var_query)
        base_variables = var_result.scalars().all()

        for base_var in base_variables:
            new_var = TargetVariable(
                dataset_id=new_dataset.id,
                variable_name=base_var.variable_name,
                variable_label=base_var.variable_label,
                description=base_var.description,
                data_type=base_var.data_type,
                length=base_var.length,
                core=base_var.core,
                sort_order=base_var.sort_order,
                base_id=base_var.id,
                override_type=OverrideType.NONE,
                origin_type=base_var.origin_type,
                standard_metadata=base_var.standard_metadata,
                created_by=current_user.get("id", "system"),
            )
            db.add(new_var)
            variable_count += 1

    # 6. 提交事务
    await db.commit()

    return _ok(CreateFromGlobalLibraryResponse(
        id=new_spec.id,
        name=new_spec.name,
        spec_type=new_spec.spec_type.value,
        base_specification_id=new_spec.base_specification_id,
        dataset_count=dataset_count,
        variable_count=variable_count,
        message=f"Successfully created {request.spec_type} Spec with {dataset_count} datasets and {variable_count} variables",
    ).model_dump())


# ============================================================
# API 6: POST /api/v1/study-specs/{spec_id}/datasets/from-global-library
# ============================================================


class AddDatasetFromGlobalLibraryRequest(BaseModel):
    """从 Global Library 添加 Dataset 请求"""

    base_dataset_id: int = Field(..., description="Global Library 中的 Dataset ID")


class AddDatasetFromGlobalLibraryResponse(BaseModel):
    """从 Global Library 添加 Dataset 响应"""

    id: int
    dataset_name: str
    description: str | None
    class_type: str
    variable_count: int
    base_id: int
    message: str


@router.post(
    "/{spec_id}/datasets/from-global-library",
    summary="从 Global Library 添加 Dataset",
    description="""
从 Global Library 添加数据集到 Study Spec，自动继承变量定义。

**继承机制：**
1. 创建新的 TargetDataset，设置 base_id 指向 Global Library 数据集
2. 复制所有变量定义，设置 base_id 和 origin_type

**适用场景：**
- 从 SDTM IG 选择标准数据集（如 DM, AE, VS）
- 从 SDTM Model 选择分类模板（用于自定义域）
""",
)
async def add_dataset_from_global_library(
    spec_id: int,
    request: AddDatasetFromGlobalLibraryRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(lambda: {"id": "system"}),
) -> dict:
    """从 Global Library 添加 Dataset"""
    # 1. 验证 Study Spec 存在
    spec_query = select(Specification).where(
        Specification.id == spec_id,
        Specification.is_deleted == False,  # noqa: E712
    )
    spec_result = await db.execute(spec_query)
    spec = spec_result.scalar_one_or_none()

    if not spec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study Specification with id {spec_id} not found",
        )

    # 2. 获取 Global Library 数据集及其变量
    base_dataset_query = (
        select(TargetDataset)
        .options(selectinload(TargetDataset.variables))
        .where(
            TargetDataset.id == request.base_dataset_id,
            TargetDataset.is_deleted == False,  # noqa: E712
        )
    )
    base_dataset_result = await db.execute(base_dataset_query)
    base_dataset = base_dataset_result.scalar_one_or_none()

    if not base_dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Global Library Dataset with id {request.base_dataset_id} not found",
        )

    # 3. 检查数据集是否已存在
    existing_query = select(TargetDataset).where(
        TargetDataset.specification_id == spec_id,
        TargetDataset.dataset_name == base_dataset.dataset_name,
        TargetDataset.is_deleted == False,  # noqa: E712
    )
    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Dataset {base_dataset.dataset_name} already exists in this specification",
        )

    # 4. 创建新数据集
    new_dataset = TargetDataset(
        specification_id=spec_id,
        dataset_name=base_dataset.dataset_name,
        description=base_dataset.description,
        class_type=base_dataset.class_type,
        sort_order=999,  # 放到最后
        base_id=base_dataset.id,
        origin_type=base_dataset.origin_type,
        override_type=OverrideType.NONE,
        created_by=current_user.get("id", "system"),
    )
    db.add(new_dataset)
    await db.flush()

    # 5. 复制变量
    variable_count = 0
    for base_var in base_dataset.variables:
        if base_var.is_deleted:
            continue

        new_var = TargetVariable(
            dataset_id=new_dataset.id,
            variable_name=base_var.variable_name,
            variable_label=base_var.variable_label,
            description=base_var.description,
            data_type=base_var.data_type,
            length=base_var.length,
            core=base_var.core,
            sort_order=base_var.sort_order,
            base_id=base_var.id,
            origin_type=base_var.origin_type,
            override_type=OverrideType.NONE,
            standard_metadata=base_var.standard_metadata,
            created_by=current_user.get("id", "system"),
        )
        db.add(new_var)
        variable_count += 1

    await db.commit()

    return _ok(AddDatasetFromGlobalLibraryResponse(
        id=new_dataset.id,
        dataset_name=new_dataset.dataset_name,
        description=new_dataset.description,
        class_type=new_dataset.class_type.value,
        variable_count=variable_count,
        base_id=new_dataset.base_id,
        message=f"Successfully added {base_dataset.dataset_name} with {variable_count} variables",
    ).model_dump())


# ============================================================
# API 7: POST /api/v1/study-specs/{spec_id}/datasets/custom
# ============================================================


class CreateCustomDatasetRequest(BaseModel):
    """创建自定义 Dataset 请求"""

    model_config = {"protected_namespaces": ()}  # Allow fields starting with "model_"

    domain_name: str = Field(..., description="域名，如 CE, FA, SV")
    domain_label: str = Field(..., description="域标签/描述")
    class_type: str = Field(..., description="数据集分类：Events, Findings, Interventions 等")
    inherit_from_model: bool = Field(
        True,
        description="是否从 SDTM Model 继承通用变量（--STDTC, --ENSTDTC 等）"
    )
    model_version_id: int | None = Field(
        None,
        description="SDTM Model 版本 ID（用于继承通用变量）"
    )


class CreateCustomDatasetResponse(BaseModel):
    """创建自定义 Dataset 响应"""

    id: int
    dataset_name: str
    description: str
    class_type: str
    variable_count: int
    message: str


# SDTM Model 通用变量模板（带 -- 前缀）
# 根据 class_type 不同，有不同的通用变量集
SDTM_MODEL_GENERAL_VARIABLES = {
    "Events": [
        {"name": "--SEQ", "label": "Sequence Number", "type": DataType.NUM, "length": 8, "core": VariableCore.REQ, "role": "Identifier"},
        {"name": "--GRPID", "label": "Group ID", "type": DataType.CHAR, "length": 200, "core": VariableCore.EXP, "role": "Identifier"},
        {"name": "--REFID", "label": "Reference ID", "type": DataType.CHAR, "length": 200, "core": VariableCore.EXP, "role": "Identifier"},
        {"name": "--SPID", "label": "Sponsor-Defined ID", "type": DataType.CHAR, "length": 200, "core": VariableCore.EXP, "role": "Identifier"},
        {"name": "--STDTC", "label": "Start Date/Time", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Timing"},
        {"name": "--ENDTC", "label": "End Date/Time", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Timing"},
        {"name": "--STDY", "label": "Study Day of Start", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "Timing"},
        {"name": "--ENDY", "label": "Study Day of End", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "Timing"},
        {"name": "--STRDY", "label": "Study Reference Period Start Day", "type": DataType.NUM, "length": 8, "core": VariableCore.PERM, "role": "Timing"},
        {"name": "--ENRDY", "label": "Study Reference Period End Day", "type": DataType.NUM, "length": 8, "core": VariableCore.PERM, "role": "Timing"},
        {"name": "--STAT", "label": "Completion Status", "type": DataType.CHAR, "length": 8, "core": VariableCore.EXP, "role": "Record Qualifier"},
        {"name": "--REASND", "label": "Reason Not Collected", "type": DataType.CHAR, "length": 200, "core": VariableCore.EXP, "role": "Record Qualifier"},
    ],
    "Findings": [
        {"name": "--SEQ", "label": "Sequence Number", "type": DataType.NUM, "length": 8, "core": VariableCore.REQ, "role": "Identifier"},
        {"name": "--GRPID", "label": "Group ID", "type": DataType.CHAR, "length": 200, "core": VariableCore.EXP, "role": "Identifier"},
        {"name": "--REFID", "label": "Reference ID", "type": DataType.CHAR, "length": 200, "core": VariableCore.EXP, "role": "Identifier"},
        {"name": "--SPID", "label": "Sponsor-Defined ID", "type": DataType.CHAR, "length": 200, "core": VariableCore.EXP, "role": "Identifier"},
        {"name": "--STDTC", "label": "Start Date/Time", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Timing"},
        {"name": "--ENDTC", "label": "End Date/Time", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Timing"},
        {"name": "--STDY", "label": "Study Day of Start", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "Timing"},
        {"name": "--ENDY", "label": "Study Day of End", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "Timing"},
        {"name": "--STAT", "label": "Completion Status", "type": DataType.CHAR, "length": 8, "core": VariableCore.EXP, "role": "Record Qualifier"},
        {"name": "--REASND", "label": "Reason Not Collected", "type": DataType.CHAR, "length": 200, "core": VariableCore.EXP, "role": "Record Qualifier"},
        {"name": "--ORRES", "label": "Result in Original Units", "type": DataType.CHAR, "length": 200, "core": VariableCore.EXP, "role": "Result"},
        {"name": "--ORRESU", "label": "Original Units", "type": DataType.CHAR, "length": 8, "core": VariableCore.EXP, "role": "Result Qualifier"},
        {"name": "--STRESC", "label": "Character Result in Standard Format", "type": DataType.CHAR, "length": 200, "core": VariableCore.EXP, "role": "Result"},
        {"name": "--STRESN", "label": "Numeric Result in Standard Units", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "Result"},
        {"name": "--STRESU", "label": "Standard Units", "type": DataType.CHAR, "length": 8, "core": VariableCore.EXP, "role": "Result Qualifier"},
        {"name": "--RESCAT", "label": "Result Category", "type": DataType.CHAR, "length": 200, "core": VariableCore.PERM, "role": "Variable Qualifier"},
    ],
    "Interventions": [
        {"name": "--SEQ", "label": "Sequence Number", "type": DataType.NUM, "length": 8, "core": VariableCore.REQ, "role": "Identifier"},
        {"name": "--GRPID", "label": "Group ID", "type": DataType.CHAR, "length": 200, "core": VariableCore.EXP, "role": "Identifier"},
        {"name": "--REFID", "label": "Reference ID", "type": DataType.CHAR, "length": 200, "core": VariableCore.EXP, "role": "Identifier"},
        {"name": "--SPID", "label": "Sponsor-Defined ID", "type": DataType.CHAR, "length": 200, "core": VariableCore.EXP, "role": "Identifier"},
        {"name": "--STDTC", "label": "Start Date/Time", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Timing"},
        {"name": "--ENDTC", "label": "End Date/Time", "type": DataType.CHAR, "length": 20, "core": VariableCore.EXP, "role": "Timing"},
        {"name": "--STDY", "label": "Study Day of Start", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "Timing"},
        {"name": "--ENDY", "label": "Study Day of End", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "Timing"},
        {"name": "--STRDY", "label": "Study Reference Period Start Day", "type": DataType.NUM, "length": 8, "core": VariableCore.PERM, "role": "Timing"},
        {"name": "--ENRDY", "label": "Study Reference Period End Day", "type": DataType.NUM, "length": 8, "core": VariableCore.PERM, "role": "Timing"},
        {"name": "--STAT", "label": "Completion Status", "type": DataType.CHAR, "length": 8, "core": VariableCore.EXP, "role": "Record Qualifier"},
        {"name": "--REASND", "label": "Reason Not Collected", "type": DataType.CHAR, "length": 200, "core": VariableCore.EXP, "role": "Record Qualifier"},
        {"name": "--DOSE", "label": "Dose per Administration", "type": DataType.NUM, "length": 8, "core": VariableCore.EXP, "role": "Topic"},
        {"name": "--DOSU", "label": "Dose Units", "type": DataType.CHAR, "length": 8, "core": VariableCore.EXP, "role": "Topic Qualifier"},
        {"name": "--DOSFRM", "label": "Dose Form", "type": DataType.CHAR, "length": 40, "core": VariableCore.EXP, "role": "Topic Qualifier"},
        {"name": "--ROUTE", "label": "Route of Administration", "type": DataType.CHAR, "length": 40, "core": VariableCore.EXP, "role": "Topic Qualifier"},
    ],
    "Special Purpose": [],  # Special purpose domains like DM, SE, SV have unique structures
}

# 标准变量（所有域都有）
STANDARD_VARIABLES = [
    {"name": "STUDYID", "label": "Study Identifier", "type": DataType.CHAR, "length": 12, "core": VariableCore.REQ, "role": "Identifier"},
    {"name": "DOMAIN", "label": "Domain Abbreviation", "type": DataType.CHAR, "length": 2, "core": VariableCore.REQ, "role": "Identifier"},
    {"name": "USUBJID", "label": "Unique Subject Identifier", "type": DataType.CHAR, "length": 40, "core": VariableCore.REQ, "role": "Identifier"},
]


@router.post(
    "/{spec_id}/datasets/custom",
    summary="创建自定义 Domain 数据集",
    description="""
创建自定义 Domain 数据集，可选择从 SDTM Model 继承通用变量。

**功能说明：**
1. 创建自定义域名（如 CE, FA, SV）
2. 根据 class_type 自动添加 SDTM Model 通用变量
3. 通用变量中的 -- 前缀会自动替换为域名前缀
   - 例如：CE 域，--STDTC 会变成 CESTDTC

**适用场景：**
- 创建标准中不存在的自定义域
- 基于 SDTM Model 分类的域模板创建
""",
)
async def create_custom_dataset(
    spec_id: int,
    request: CreateCustomDatasetRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: dict = Depends(lambda: {"id": "system"}),
) -> dict:
    """创建自定义 Domain 数据集"""
    # 1. 验证 Study Spec 存在
    spec_query = select(Specification).where(
        Specification.id == spec_id,
        Specification.is_deleted == False,  # noqa: E712
    )
    spec_result = await db.execute(spec_query)
    spec = spec_result.scalar_one_or_none()

    if not spec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study Specification with id {spec_id} not found",
        )

    # 2. 验证 class_type
    try:
        class_type = DatasetClass(request.class_type.upper())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid class_type: {request.class_type}",
        )

    # 3. 检查数据集是否已存在
    existing_query = select(TargetDataset).where(
        TargetDataset.specification_id == spec_id,
        TargetDataset.dataset_name == request.domain_name.upper(),
        TargetDataset.is_deleted == False,  # noqa: E712
    )
    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Dataset {request.domain_name} already exists in this specification",
        )

    # 4. 创建新数据集
    domain = request.domain_name.upper()
    new_dataset = TargetDataset(
        specification_id=spec_id,
        dataset_name=domain,
        description=request.domain_label,
        class_type=class_type,
        sort_order=999,
        base_id=None,
        origin_type=OriginType.STUDY_CUSTOM,
        override_type=OverrideType.NONE,
        created_by=current_user.get("id", "system"),
    )
    db.add(new_dataset)
    await db.flush()

    # 5. 添加标准变量
    variable_count = 0
    for i, var_def in enumerate(STANDARD_VARIABLES):
        var = TargetVariable(
            dataset_id=new_dataset.id,
            variable_name=var_def["name"],
            variable_label=var_def["label"],
            data_type=var_def["type"],
            length=var_def["length"],
            core=var_def["core"],
            sort_order=i,
            origin_type=OriginType.CDISC,
            override_type=OverrideType.NONE,
            standard_metadata={"role": var_def["role"]},
            created_by=current_user.get("id", "system"),
        )
        db.add(var)
        variable_count += 1

    # 6. 添加通用变量（如果需要继承）
    if request.inherit_from_model:
        class_key = class_type.value.replace("_", " ").title()
        # Map class type to template key
        class_mapping = {
            "Special Purpose": "Special Purpose",
            "Events": "Events",
            "Findings": "Findings",
            "Interventions": "Interventions",
            "Trial Design": "Special Purpose",
            "Relationship": "Special Purpose",
            "ADaM Subject Level": "Special Purpose",
            "ADaM Occurrence": "Events",
            "ADaM Findings": "Findings",
            "ADaM Data Set": "Findings",
        }
        template_key = class_mapping.get(class_key, "Special Purpose")
        general_vars = SDTM_MODEL_GENERAL_VARIABLES.get(template_key, [])

        for i, var_def in enumerate(general_vars):
            # 替换 -- 为域名前缀
            var_name = var_def["name"].replace("--", domain)
            var_label = var_def["label"]

            var = TargetVariable(
                dataset_id=new_dataset.id,
                variable_name=var_name,
                variable_label=var_label,
                data_type=var_def["type"],
                length=var_def["length"],
                core=var_def["core"],
                sort_order=100 + i,  # 放在标准变量之后
                origin_type=OriginType.CDISC,
                override_type=OverrideType.NONE,
                standard_metadata={
                    "role": var_def["role"],
                    "template_variable": var_def["name"],  # 记录模板变量名
                },
                created_by=current_user.get("id", "system"),
            )
            db.add(var)
            variable_count += 1

    await db.commit()

    return _ok(CreateCustomDatasetResponse(
        id=new_dataset.id,
        dataset_name=new_dataset.dataset_name,
        description=new_dataset.description or "",
        class_type=new_dataset.class_type.value,
        variable_count=variable_count,
        message=f"Successfully created custom domain {domain} with {variable_count} variables",
    ).model_dump())