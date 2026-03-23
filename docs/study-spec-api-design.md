# Study Specification API 架构设计

> **版本**: v1.0
> **日期**: 2026-03-21
> **作者**: 架构团队
> **状态**: 设计阶段

---

## 1. 概述

### 1.1 设计背景

Study Specification API 是临床数据平台的核心业务 API，用于管理试验级别的 SDTM/ADaM 规范定义。与 Global Library API（只读浏览 CDISC 标准）不同，Study Spec API 需要：

1. **完整的 CRUD 操作** - 支持创建、读取、更新、删除试验规范
2. **继承机制支持** - 从 Global/TA 标准继承并支持覆盖修改
3. **临床上下文关联** - 与 ScopeNode（Study/Analysis 层级）强绑定
4. **合规审计追踪** - 满足 21 CFR Part 11 要求

### 1.2 与 Global Library API 的区别

| 特性 | Global Library API | Study Spec API |
|------|-------------------|----------------|
| **用途** | 浏览 CDISC 官方标准 | 管理试验级别规范 |
| **操作类型** | 只读 (GET) | 完整 CRUD |
| **数据来源** | CDISC 官方同步 | 用户创建/继承 |
| **继承关系** | 无（顶层定义） | 继承自 Global/TA |
| **ScopeNode 类型** | CDISC 节点 | Global/TA/Study/Analysis |
| **状态管理** | 无 | Draft/Active/Archived |
| **权限要求** | 普通用户可读 | 需要项目管理权限 |

---

## 2. 数据模型回顾

### 2.1 核心实体关系

```
ScopeNode (Study/Analysis)
    │
    └── Specification (SDTM Spec / ADaM Spec)
            │
            ├── base_specification_id ──→ Specification (继承来源)
            │
            └── TargetDataset[]
                    │
                    ├── base_id ──→ TargetDataset (继承来源)
                    │
                    └── TargetVariable[]
                            │
                            └── base_id ──→ TargetVariable (继承来源)
```

### 2.2 继承机制

继承通过 `base_id` + `override_type` 组合实现：

```python
class OverrideType(str, enum.Enum):
    NONE = "None"        # 完全继承，无修改
    MODIFIED = "Modified"  # 已修改父级定义
    ADDED = "Added"      # 新增（非继承）
    DELETED = "Deleted"  # 软删除标记（逻辑删除继承项）
```

**继承链示例**:
```
Global SDTM IG 3.4 (AE Dataset)
    └── base_id: None, override_type: NONE
        │
        └── Study-001 SDTM Spec (AE Dataset)
                └── base_id: 1, override_type: MODIFIED
                    │
                    └── Analysis-A DM Spec (AE Dataset)
                            └── base_id: 2, override_type: MODIFIED
```

---

## 3. API 端点设计

### 3.1 端点总览

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/study-specs` | 获取 Study Spec 列表 |
| POST | `/api/v1/study-specs` | 创建新 Study Spec |
| GET | `/api/v1/study-specs/{spec_id}` | 获取单个 Study Spec 详情 |
| PUT | `/api/v1/study-specs/{spec_id}` | 更新 Study Spec 元信息 |
| DELETE | `/api/v1/study-specs/{spec_id}` | 软删除 Study Spec |
| POST | `/api/v1/study-specs/{spec_id}/activate` | 激活 Study Spec |
| POST | `/api/v1/study-specs/{spec_id}/archive` | 归档 Study Spec |
| POST | `/api/v1/study-specs/{spec_id}/clone` | 克隆 Study Spec |
| GET | `/api/v1/study-specs/{spec_id}/datasets` | 获取数据集列表 |
| POST | `/api/v1/study-specs/{spec_id}/datasets` | 添加数据集 |
| GET | `/api/v1/study-specs/{spec_id}/datasets/{dataset_id}` | 获取数据集详情 |
| PUT | `/api/v1/study-specs/{spec_id}/datasets/{dataset_id}` | 更新数据集 |
| DELETE | `/api/v1/study-specs/{spec_id}/datasets/{dataset_id}` | 软删除数据集 |
| GET | `/api/v1/study-specs/datasets/{dataset_id}/variables` | 获取变量列表 |
| POST | `/api/v1/study-specs/datasets/{dataset_id}/variables` | 添加变量 |
| GET | `/api/v1/study-specs/variables/{variable_id}` | 获取变量详情 |
| PUT | `/api/v1/study-specs/variables/{variable_id}` | 更新变量 |
| DELETE | `/api/v1/study-specs/variables/{variable_id}` | 软删除变量 |
| GET | `/api/v1/study-specs/{spec_id}/inheritance` | 获取继承关系树 |
| GET | `/api/v1/study-specs/{spec_id}/schemas/{schema_type}` | 获取动态 Schema |

---

### 3.2 Specification 级别 API

#### 3.2.1 GET /api/v1/study-specs - 获取 Study Spec 列表

**查询参数**:
```typescript
interface StudySpecListQuery {
  scope_node_id?: number;      // 按 ScopeNode 过滤
  scope_node_code?: string;    // 按 ScopeNode code 过滤（如 "STUDY-001"）
  spec_type?: 'SDTM' | 'ADaM' | 'QRS';  // 按规范类型过滤
  status?: 'Draft' | 'Active' | 'Archived';  // 按状态过滤
  search?: string;             // 搜索名称/描述
  include_inherited?: boolean; // 是否包含继承的数据统计
  limit?: number;              // 分页大小，默认 20
  offset?: number;             // 偏移量
}
```

**响应模型**:
```python
class StudySpecListItem(BaseModel):
    """Study Spec 列表项"""
    id: int
    scope_node_id: int
    scope_node_code: str
    scope_node_name: str
    name: str
    spec_type: str  # SDTM / ADaM / QRS
    version: str
    status: str  # Draft / Active / Archived
    description: str | None
    # 继承信息
    base_specification_id: int | None
    base_specification_name: str | None
    # 统计信息
    dataset_count: int
    inherited_dataset_count: int  # 继承的数据集数
    custom_dataset_count: int     # 自定义新增的数据集数
    # 审计信息
    created_by: str
    created_at: datetime
    updated_by: str | None
    updated_at: datetime | None
    activated_at: datetime | None
    archived_at: datetime | None


class StudySpecListResponse(BaseModel):
    """Study Spec 列表响应"""
    total: int
    items: list[StudySpecListItem]
```

#### 3.2.2 POST /api/v1/study-specs - 创建 Study Spec

**请求体**:
```python
class CreateStudySpecRequest(BaseModel):
    """创建 Study Spec 请求"""
    scope_node_id: int = Field(..., description="所属 ScopeNode ID (Study/Analysis)")
    name: str = Field(..., min_length=1, max_length=200, description="规范名称")
    spec_type: SpecType = Field(..., description="规范类型：SDTM/ADaM/QRS")
    version: str = Field("1.0", max_length=50, description="版本号")
    description: str | None = Field(None, description="规范描述")
    # 继承配置
    base_specification_id: int | None = Field(
        None,
        description="基线 Spec ID（继承来源），为空则创建全新规范"
    )
    inherit_mode: Literal["full", "selective"] = Field(
        "full",
        description="继承模式：full=全部继承，selective=选择性继承"
    )
    selected_datasets: list[str] | None = Field(
        None,
        description="选择性继承时指定的数据集名称列表"
    )
    # 标准信息
    standard_name: str | None = Field(None, description="标准名称，如 'SDTM-IG 3.4'")
    standard_version: str | None = Field(None, description="标准版本")
    # 扩展属性
    metadata_config: dict[str, Any] | None = Field(None, description="元数据配置")
```

**响应**: 返回创建的完整 `StudySpecDetail`

**业务逻辑**:
1. 验证 `scope_node_id` 存在且类型为 Study 或 Analysis
2. 验证同一 ScopeNode 下同类型 Spec 名称唯一
3. 如果指定 `base_specification_id`:
   - 验证基线 Spec 存在且状态为 Active
   - 根据 `inherit_mode` 创建继承的 Dataset/Variable 记录
   - 设置 `base_id` 和 `override_type=NONE`

#### 3.2.3 GET /api/v1/study-specs/{spec_id} - 获取详情

**响应模型**:
```python
class StudySpecDetail(BaseModel):
    """Study Spec 详情"""
    id: int
    scope_node_id: int
    scope_node_code: str
    scope_node_name: str
    scope_node_path: str  # 层级路径，如 "/Global/TA-Oncology/Study-001"
    name: str
    spec_type: str
    version: str
    status: str
    description: str | None
    # 继承信息
    base_specification_id: int | None
    base_specification: "StudySpecSummary | None"
    # 标准信息
    standard_name: str | None
    standard_version: str | None
    # 统计信息
    dataset_count: int
    variable_count: int
    # 扩展属性
    metadata_config: dict[str, Any] | None
    # 审计信息
    created_by: str
    created_at: datetime
    updated_by: str | None
    updated_at: datetime | None
    activated_at: datetime | None
    archived_at: datetime | None
    # Schema
    schema: TableSchema | None = Field(None, description="动态表格 Schema")


class StudySpecSummary(BaseModel):
    """Study Spec 摘要（用于嵌套显示）"""
    id: int
    name: str
    spec_type: str
    version: str
    status: str
```

#### 3.2.4 PUT /api/v1/study-specs/{spec_id} - 更新元信息

**请求体**:
```python
class UpdateStudySpecRequest(BaseModel):
    """更新 Study Spec 请求"""
    name: str | None = Field(None, min_length=1, max_length=200)
    version: str | None = Field(None, max_length=50)
    description: str | None = None
    standard_name: str | None = None
    standard_version: str | None = None
    metadata_config: dict[str, Any] | None = None
```

**约束**:
- 只有 Draft 状态可以修改 `name` 和 `version`
- Active/Archived 状态只能修改 `description`

#### 3.2.5 DELETE /api/v1/study-specs/{spec_id} - 软删除

**行为**:
- 设置 `is_deleted = True`
- 同时软删除所有关联的 Dataset 和 Variable
- 记录删除操作到审计日志

**约束**:
- Active 状态的 Spec 不能删除，需先 Archive

#### 3.2.6 POST /api/v1/study-specs/{spec_id}/activate - 激活

**行为**:
- 状态从 Draft -> Active
- 设置 `activated_at` 时间戳
- 记录激活操作到审计日志

**约束**:
- 只有 Draft 状态可以激活
- 验证至少有一个 Dataset

#### 3.2.7 POST /api/v1/study-specs/{spec_id}/archive - 归档

**行为**:
- 状态从 Active -> Archived
- 设置 `archived_at` 时间戳

**约束**:
- 只有 Active 状态可以归档

#### 3.2.8 POST /api/v1/study-specs/{spec_id}/clone - 克隆

**请求体**:
```python
class CloneStudySpecRequest(BaseModel):
    """克隆 Study Spec 请求"""
    target_scope_node_id: int = Field(..., description="目标 ScopeNode ID")
    new_name: str = Field(..., min_length=1, max_length=200)
    new_version: str = Field("1.0", max_length=50)
```

**行为**:
- 深拷贝整个 Spec 及其 Dataset/Variable
- 新记录的 `base_id` 指向原记录
- 新记录的 `override_type` 保持与原记录相同

---

### 3.3 Dataset 级别 API

#### 3.3.1 GET /api/v1/study-specs/{spec_id}/datasets

**查询参数**:
```typescript
interface DatasetListQuery {
  search?: string;
  class_type?: string;  // Interventions/Events/Findings/Special Purpose...
  override_type?: 'None' | 'Modified' | 'Added' | 'Deleted';
  include_deleted?: boolean;  // 是否包含已软删除的继承项
  limit?: number;
  offset?: number;
}
```

**响应模型**:
```python
class StudyDatasetListItem(BaseModel):
    """Study Dataset 列表项"""
    id: int
    specification_id: int
    dataset_name: str
    description: str | None
    class_type: str
    sort_order: int
    # 继承信息
    base_id: int | None
    base_dataset_name: str | None
    override_type: str  # None/Modified/Added/Deleted
    origin_type: str  # CDISC/Sponsor_Standard/TA_Standard/Study_Custom
    # 统计
    variable_count: int
    inherited_variable_count: int
    custom_variable_count: int
    # 审计
    created_by: str
    created_at: datetime
    updated_by: str | None
    updated_at: datetime | None
    # 标记
    is_inherited: bool
    has_modifications: bool


class StudyDatasetListResponse(BaseModel):
    """Study Dataset 列表响应"""
    total: int
    items: list[StudyDatasetListItem]
    # 汇总统计
    summary: DatasetSummary


class DatasetSummary(BaseModel):
    """数据集汇总"""
    total_datasets: int
    inherited_datasets: int
    modified_datasets: int
    added_datasets: int
    deleted_datasets: int
```

#### 3.3.2 POST /api/v1/study-specs/{spec_id}/datasets

**请求体**:
```python
class CreateStudyDatasetRequest(BaseModel):
    """创建 Study Dataset 请求"""
    dataset_name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    class_type: DatasetClass = Field(..., description="SDTM 数据集分类")
    # 继承选项
    base_dataset_id: int | None = Field(
        None,
        description="基线 Dataset ID（继承来源）"
    )
    # 扩展属性
    standard_metadata: dict[str, Any] | None = None
    extra_attrs: dict[str, Any] | None = None
```

**业务逻辑**:
1. 验证 Spec 存在且状态为 Draft
2. 验证同一 Spec 下 dataset_name 唯一
3. 如果指定 `base_dataset_id`:
   - 验证基线 Dataset 存在
   - 复制所有 Variable，设置 `base_id` 和 `override_type=NONE`
4. 如果不指定 `base_dataset_id`:
   - 设置 `override_type=ADDED`, `origin_type=STUDY_CUSTOM`

#### 3.3.3 GET /api/v1/study-specs/{spec_id}/datasets/{dataset_id}

**响应模型**:
```python
class StudyDatasetDetail(BaseModel):
    """Study Dataset 详情"""
    id: int
    specification_id: int
    specification_name: str
    dataset_name: str
    description: str | None
    class_type: str
    sort_order: int
    # 继承信息
    base_id: int | None
    base_dataset: "StudyDatasetSummary | None"
    override_type: str
    origin_type: str
    # 统计
    variable_count: int
    # 扩展属性
    standard_metadata: dict[str, Any] | None
    extra_attrs: dict[str, Any] | None
    # 审计
    created_by: str
    created_at: datetime
    updated_by: str | None
    updated_at: datetime | None
    # Schema
    schema: TableSchema | None = None


class StudyDatasetSummary(BaseModel):
    """Dataset 摘要"""
    id: int
    dataset_name: str
    specification_id: int
    specification_name: str
```

#### 3.3.4 PUT /api/v1/study-specs/{spec_id}/datasets/{dataset_id}

**请求体**:
```python
class UpdateStudyDatasetRequest(BaseModel):
    """更新 Study Dataset 请求"""
    description: str | None = None
    sort_order: int | None = None
    standard_metadata: dict[str, Any] | None = None
    extra_attrs: dict[str, Any] | None = None
```

**行为**:
- 如果是继承的 Dataset（`base_id` 不为空）:
  - 设置 `override_type = MODIFIED`
- 记录修改到审计日志

#### 3.3.5 DELETE /api/v1/study-specs/{spec_id}/datasets/{dataset_id}

**行为**:
- 如果是继承的 Dataset:
  - 设置 `override_type = DELETED`（逻辑删除）
  - 同时标记所有关联 Variable 为 DELETED
- 如果是新增的 Dataset（`override_type=ADDED`）:
  - 设置 `is_deleted = True`（物理软删除）
  - 同时软删除所有关联 Variable

---

### 3.4 Variable 级别 API

#### 3.4.1 GET /api/v1/study-specs/datasets/{dataset_id}/variables

**查询参数**:
```typescript
interface VariableListQuery {
  search?: string;
  core?: 'Req' | 'Perm' | 'Exp';
  override_type?: 'None' | 'Modified' | 'Added' | 'Deleted';
  origin_type?: 'CDISC' | 'Sponsor_Standard' | 'TA_Standard' | 'Study_Custom';
  include_deleted?: boolean;
  limit?: number;
  offset?: number;
}
```

**响应模型**:
```python
class StudyVariableListItem(BaseModel):
    """Study Variable 列表项"""
    id: int
    dataset_id: int
    dataset_name: str
    variable_name: str
    variable_label: str | None
    description: str | None
    data_type: str
    length: int | None
    core: str
    sort_order: int
    # 继承信息
    base_id: int | None
    base_variable_name: str | None
    override_type: str
    origin_type: str
    # 扩展字段（与 Global Library API 一致）
    role: str | None
    codelist_name: str | None
    codelist_ref: str | None
    # 标记
    is_inherited: bool
    has_modifications: bool
    # 审计
    created_by: str
    created_at: datetime
    updated_by: str | None
    updated_at: datetime | None


class StudyVariableListResponse(BaseModel):
    """Study Variable 列表响应"""
    total: int
    items: list[StudyVariableListItem]
    summary: VariableSummary


class VariableSummary(BaseModel):
    """变量汇总"""
    total_variables: int
    req_count: int
    perm_count: int
    exp_count: int
    inherited_variables: int
    modified_variables: int
    added_variables: int
    deleted_variables: int
```

#### 3.4.2 POST /api/v1/study-specs/datasets/{dataset_id}/variables

**请求体**:
```python
class CreateStudyVariableRequest(BaseModel):
    """创建 Study Variable 请求"""
    variable_name: str = Field(..., min_length=1, max_length=255)
    variable_label: str | None = None
    description: str | None = None
    data_type: DataType = Field(..., description="数据类型")
    length: int | None = None
    core: VariableCore = Field(..., description="核心性")
    # 继承选项
    base_variable_id: int | None = Field(None, description="基线 Variable ID")
    # 扩展属性
    standard_metadata: dict[str, Any] | None = None
    extra_attrs: dict[str, Any] | None = None
```

#### 3.4.3 GET /api/v1/study-specs/variables/{variable_id}

**响应模型**:
```python
class StudyVariableDetail(BaseModel):
    """Study Variable 详情"""
    id: int
    dataset_id: int
    dataset_name: str
    specification_id: int
    specification_name: str
    variable_name: str
    variable_label: str | None
    description: str | None
    data_type: str
    length: int | None
    core: str
    sort_order: int
    # 继承信息
    base_id: int | None
    base_variable: "StudyVariableSummary | None"
    override_type: str
    origin_type: str
    # 扩展属性
    standard_metadata: dict[str, Any] | None
    extra_attrs: dict[str, Any] | None
    # 审计
    created_by: str
    created_at: datetime
    updated_by: str | None
    updated_at: datetime | None
    # 差异对比（如果已修改）
    diff: VariableDiff | None = None


class VariableDiff(BaseModel):
    """变量差异"""
    field_name: str
    old_value: Any
    new_value: Any


class StudyVariableSummary(BaseModel):
    """Variable 摘要"""
    id: int
    variable_name: str
    dataset_id: int
    dataset_name: str
```

#### 3.4.4 PUT /api/v1/study-specs/variables/{variable_id}

**请求体**:
```python
class UpdateStudyVariableRequest(BaseModel):
    """更新 Study Variable 请求"""
    variable_label: str | None = None
    description: str | None = None
    data_type: DataType | None = None
    length: int | None = None
    core: VariableCore | None = None
    sort_order: int | None = None
    standard_metadata: dict[str, Any] | None = None
    extra_attrs: dict[str, Any] | None = None
```

**行为**:
- 如果是继承的 Variable:
  - 设置 `override_type = MODIFIED`
  - 记录修改前的值用于差异对比

#### 3.4.5 DELETE /api/v1/study-specs/variables/{variable_id}

**行为**:
- 如果是继承的 Variable:
  - 设置 `override_type = DELETED`
- 如果是新增的 Variable:
  - 设置 `is_deleted = True`

---

### 3.5 继承关系 API

#### 3.5.1 GET /api/v1/study-specs/{spec_id}/inheritance

**响应模型**:
```python
class InheritanceTree(BaseModel):
    """继承关系树"""
    spec_id: int
    spec_name: str
    spec_type: str
    base_spec: "InheritanceTree | None"
    datasets: list[DatasetInheritanceNode]


class DatasetInheritanceNode(BaseModel):
    """数据集继承节点"""
    dataset_id: int
    dataset_name: str
    override_type: str
    base_dataset: "DatasetInheritanceNode | None"
    variables: list[VariableInheritanceNode]


class VariableInheritanceNode(BaseModel):
    """变量继承节点"""
    variable_id: int
    variable_name: str
    override_type: str
    base_variable: "VariableInheritanceNode | None"
```

---

### 3.6 Schema API

#### 3.6.1 GET /api/v1/study-specs/{spec_id}/schemas/{schema_type}

**schema_type 可选值**:
- `spec` - Specification 级别 Schema
- `dataset` - Dataset 级别 Schema
- `variable` - Variable 级别 Schema

**响应**: 与 Global Library API 的 `TableSchema` 一致

---

## 4. ScopeNode 关联设计

### 4.1 ScopeNode 类型约束

只有以下类型的 ScopeNode 可以关联 Specification：

| 节点类型 | 说明 | 典型场景 |
|---------|------|---------|
| Global | 企业级标准库 | 企业 SDTM/ADaM 标准 |
| TA | 治疗领域标准 | 肿瘤学/心血管领域标准 |
| Compound | 化合物级别标准 | 特定化合物的数据标准 |
| Indication | 适应症级别标准 | 特定适应症的数据标准 |
| Study | 试验级别标准 | 具体试验的 SDTM/ADaM Spec |
| Analysis | 分析级别标准 | 特定分析的定制化 Spec |

### 4.2 层级继承规则

```
CDISC (官方标准)
    │
    └── Global (企业标准)
            │
            └── TA (治疗领域)
                    │
                    └── Study (试验)
                            │
                            └── Analysis (分析)
```

**继承约束**:
1. 子节点只能继承父节点或祖先节点的 Spec
2. 继承时必须锁定版本 (`pinned_version`)
3. 父节点升级时，子节点可选择：
   - 跟随升级
   - 保持当前版本
   - 延迟升级

### 4.3 ScopeNode API 集成

```python
# 在 ScopeNode API 中添加 Spec 关联查询
class ScopeNodeDetail(BaseModel):
    # ... 现有字段
    specifications: list[StudySpecSummary] | None = None
```

---

## 5. 盲态数据隔离设计

### 5.1 数据隔离原则

1. **元数据本身不涉及盲态** - Spec/Dataset/Variable 定义不包含受试者数据
2. **权限控制** - 通过 RBAC 控制 Spec 的读写权限
3. **操作审计** - 所有变更记录审计日志

### 5.2 权限模型

```python
# 权限定义
class SpecPermission(str, enum.Enum):
    VIEW = "spec:view"         # 查看规范
    CREATE = "spec:create"     # 创建规范
    EDIT = "spec:edit"         # 编辑规范
    DELETE = "spec:delete"     # 删除规范
    ACTIVATE = "spec:activate" # 激活规范
    ARCHIVE = "spec:archive"   # 归档规范

# 权限检查中间件
async def check_spec_permission(
    scope_node_id: int,
    permission: SpecPermission,
    user: CurrentUser,
) -> bool:
    # 1. 检查用户在 ScopeNode 上的角色
    # 2. 检查角色是否拥有该权限
    # 3. 返回授权结果
```

---

## 6. 审计追踪设计

### 6.1 审计日志表

```python
class SpecAuditLog(Base):
    """Spec 审计日志表"""
    __tablename__ = "spec_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # 操作对象
    entity_type: Mapped[str] = mapped_column(String(50))  # Specification/Dataset/Variable
    entity_id: Mapped[int] = mapped_column(Integer)
    # 操作信息
    action: Mapped[str] = mapped_column(String(50))  # CREATE/UPDATE/DELETE/ACTIVATE/ARCHIVE
    old_values: Mapped[dict | None] = mapped_column(JSONB)
    new_values: Mapped[dict | None] = mapped_column(JSONB)
    # 上下文
    scope_node_id: Mapped[int] = mapped_column(Integer)
    specification_id: Mapped[int | None] = mapped_column(Integer)
    # 操作者
    user_id: Mapped[str] = mapped_column(String(100))
    user_name: Mapped[str] = mapped_column(String(200))
    # 时间
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # IP 和设备信息
    ip_address: Mapped[str | None] = mapped_column(String(50))
    user_agent: Mapped[str | None] = mapped_column(String(500))
```

### 6.2 审计事件触发器

使用 SQLAlchemy Event Listeners 自动记录：

```python
from sqlalchemy import event

@event.listens_for(Specification, 'after_update')
def log_spec_update(mapper, connection, target):
    # 记录更新操作
    pass

@event.listens_for(TargetDataset, 'after_update')
def log_dataset_update(mapper, connection, target):
    # 记录更新操作
    pass

@event.listens_for(TargetVariable, 'after_update')
def log_variable_update(mapper, connection, target):
    # 记录更新操作
    pass
```

---

## 7. 前端集成设计

### 7.1 Schema-Driven UI

后端返回 Schema，前端动态渲染：

```typescript
// API 响应示例
{
  "data": {
    "id": 1,
    "dataset_name": "AE",
    "variable_count": 35,
    // ...
  },
  "schema": {
    "standardType": "SDTM",
    "columns": [
      {
        "dataIndex": "dataset_name",
        "title": { "en": "Dataset Name", "zh": "数据集名称" },
        "renderType": "text",
        "width": 150,
        "fixed": "left"
      },
      {
        "dataIndex": "variable_count",
        "title": { "en": "Variables", "zh": "变量数" },
        "renderType": "number",
        "width": 100,
        "align": "center"
      },
      {
        "dataIndex": "override_type",
        "title": { "en": "Status", "zh": "继承状态" },
        "renderType": "tag",
        "width": 120,
        "tagConfig": {
          "None": { "color": "default", "text": "Inherited" },
          "Modified": { "color": "blue", "text": "Modified" },
          "Added": { "color": "green", "text": "Added" },
          "Deleted": { "color": "red", "text": "Removed" }
        }
      }
    ]
  }
}
```

### 7.2 状态机 UI

```
┌─────────┐   activate   ┌─────────┐   archive   ┌──────────┐
│  Draft  │ ───────────> │  Active │ ─────────> │ Archived │
└─────────┘              └─────────┘            └──────────┘
     │                        │
     │ delete                 │
     ▼                        ▼
  (软删除)                (不可删除)
```

---

## 8. 错误处理设计

### 8.1 错误码定义

| 错误码 | HTTP 状态 | 描述 |
|--------|----------|------|
| SPEC_001 | 404 | Specification 不存在 |
| SPEC_002 | 400 | Specification 状态不允许此操作 |
| SPEC_003 | 409 | Specification 名称已存在 |
| SPEC_004 | 403 | 无权限操作此 Specification |
| DATASET_001 | 404 | Dataset 不存在 |
| DATASET_002 | 400 | Dataset 名称已存在 |
| DATASET_003 | 400 | 不能删除 Active 状态的 Dataset |
| VARIABLE_001 | 404 | Variable 不存在 |
| VARIABLE_002 | 400 | Variable 名称已存在 |
| INHERIT_001 | 400 | 无效的继承源 |
| INHERIT_002 | 400 | 循环继承检测 |

### 8.2 错误响应格式

```python
class ErrorResponse(BaseModel):
    code: str
    message: str
    detail: dict[str, Any] | None = None
```

---

## 9. 性能优化建议

### 9.1 数据库索引

```sql
-- Specification 索引
CREATE INDEX ix_specifications_scope_status ON specifications(scope_node_id, status);
CREATE INDEX ix_specifications_base ON specifications(base_specification_id);

-- TargetDataset 索引
CREATE INDEX ix_datasets_spec_override ON target_datasets(specification_id, override_type);
CREATE INDEX ix_datasets_base ON target_datasets(base_id);

-- TargetVariable 索引
CREATE INDEX ix_variables_dataset_override ON target_variables(dataset_id, override_type);
CREATE INDEX ix_variables_base ON target_variables(base_id);
```

### 9.2 查询优化

1. 使用 `selectinload` 预加载关联数据
2. 使用 `count` 子查询优化统计
3. 使用 CTE 优化继承链查询

---

## 10. 实现优先级

### Phase 1 - 核心读取 (Week 1)
- [ ] GET /study-specs (列表)
- [ ] GET /study-specs/{spec_id} (详情)
- [ ] GET /study-specs/{spec_id}/datasets (数据集列表)
- [ ] GET /study-specs/datasets/{dataset_id}/variables (变量列表)
- [ ] Schema API

### Phase 2 - 创建与继承 (Week 2)
- [ ] POST /study-specs (创建 + 继承)
- [ ] POST /study-specs/{spec_id}/datasets (添加数据集)
- [ ] POST /study-specs/datasets/{dataset_id}/variables (添加变量)
- [ ] 继承关系 API

### Phase 3 - 更新与删除 (Week 3)
- [ ] PUT /study-specs/{spec_id}
- [ ] PUT /study-specs/{spec_id}/datasets/{dataset_id}
- [ ] PUT /study-specs/variables/{variable_id}
- [ ] DELETE API (软删除)
- [ ] 状态流转 API (activate/archive)

### Phase 4 - 高级功能 (Week 4)
- [ ] Clone API
- [ ] 审计日志
- [ ] 权限集成
- [ ] 性能优化

---

## 附录 A: OpenAPI 规范示例

```yaml
openapi: 3.0.3
info:
  title: Study Specification API
  version: 1.0.0
paths:
  /api/v1/study-specs:
    get:
      summary: Get Study Specification List
      parameters:
        - name: scope_node_id
          in: query
          schema:
            type: integer
        - name: spec_type
          in: query
          schema:
            type: string
            enum: [SDTM, ADaM, QRS]
        - name: status
          in: query
          schema:
            type: string
            enum: [Draft, Active, Archived]
        - name: search
          in: query
          schema:
            type: string
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StudySpecListResponse'
    post:
      summary: Create Study Specification
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateStudySpecRequest'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StudySpecDetail'
```

---

## 附录 B: 术语表

| 术语 | 英文 | 说明 |
|-----|------|------|
| 规范 | Specification | SDTM/ADaM 规范文档 |
| 数据集 | Dataset | SDTM/ADaM 数据域定义 |
| 变量 | Variable | 数据集中的字段定义 |
| 作用域节点 | ScopeNode | 树状层级结构节点 |
| 继承 | Inheritance | 从父级 Spec 继承定义 |
| 覆盖 | Override | 修改继承的定义 |
| 软删除 | Soft Delete | 逻辑删除，保留数据 |
| 审计追踪 | Audit Trail | 操作历史记录 |

---

**文档结束**