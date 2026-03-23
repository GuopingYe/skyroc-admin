# Study Spec 上下文联动与 Global Library 继承问题分析

> **日期**: 2026-03-21
> **状态**: 问题分析完成

---

## 1. 问题 1: Clinical Context 与 Study Spec 不联动

### 1.1 根本原因

**Clinical Context 数据结构：**
```typescript
// frontend/src/features/clinical-context/types.ts
interface IClinicalContext {
  productId: string | null;    // 字符串类型
  studyId: string | null;      // 字符串类型
  analysisId: string | null;   // 字符串类型
}
```

**ScopeNode 数据结构：**
```python
# backend/app/models/scope_node.py
class ScopeNode:
    id: int           # 整数自增 ID
    code: str         # 唯一编码，如 "STUDY-001"
    node_type: NodeType
```

**Study Spec API 参数：**
```python
# backend/app/api/routers/study_spec.py
async def get_study_specs(
    scope_node_id: int | None = Query(None),  # 需要整数 ID
    ...
)
```

**问题：**
- Clinical Context 存储 `studyId` 可能是 ScopeNode 的 `code` 或其他字符串
- Study Spec API 需要 `scope_node_id`（整数）
- 两者没有正确的映射关系！

### 1.2 当前数据流分析

```
Pipeline Management                    Clinical Context
─────────────────────                  ─────────────────
ScopeNode.id (int) ──────────────────> studyId (string) ???
        │                                      │
        └── 格式不一致！                         │
                                               ▼
                                        Study Spec 页面
                                        无法正确过滤数据
```

### 1.3 解决方案

#### 方案 A: 扩展 Clinical Context 存储 ScopeNode ID（推荐）

```typescript
// 修改 types.ts
interface IClinicalContext {
  productId: string | null;
  studyId: string | null;
  analysisId: string | null;

  // 新增：ScopeNode ID（用于 API 查询）
  scopeNodeId: number | null;  // Study 级别的 ScopeNode.id
  analysisNodeId: number | null; // Analysis 级别的 ScopeNode.id
}
```

#### 方案 B: 在 Pipeline 选择时同步更新

在 Pipeline Management 选择节点时，同时存储 `code` 和 `id`：

```typescript
// 选择 Study 时
selectStudy(studyId: string, study?: IClinicalStudy) {
  dispatch(setStudy({
    study,
    studyId,  // 保持原有的 code
    scopeNodeId: study?.id  // 新增 ScopeNode.id
  }));
}
```

---

## 2. 问题 2: Study Spec 与 Global Library 无继承关联

### 2.1 当前实现分析

**Study Configuration 中选择的标准版本：**
```
Pipeline Management → Tab 2: Study Configuration
├── SDTM Model Version
├── SDTM IG Version
├── ADaM Model Version
├── ADaM IG Version
├── MedDRA Version
└── WHODrug Version
```

**版本保存位置：**
```python
# ScopeNode.extra_attrs
{
    "protocol_title": "Protocol-001",
    "phase": "Phase III",
    "study_config": {
        "sdtmModelVersion": "2.0",
        "sdtmIgVersion": "3.4",
        "adamModelVersion": "1.5",
        "adamIgVersion": "1.5",
        "meddraVersion": "26.1",
        "whodrugVersion": "2024Q1"
    }
}
```

**问题：**
1. Study Spec 页面没有读取这些版本配置
2. TargetVariable 没有关联到 Global Library 的标准变量
3. 变量属性（Core, Role, CodeList）没有从 Global Library 继承

### 2.2 数据流对比

**期望的数据流：**
```
Global Library (CDISC 标准)
    │
    ├── SDTM IG 3.4 (ScopeNode: node_type=CDISC)
    │   ├── AE Dataset
    │   │   └── AEDECOD Variable
    │   │       ├── core: Req
    │   │       ├── role: Synonym Qualifier
    │   │       └── codelist: MedDRA PT
    │   └── ...
    │
    └── 继承
        │
        ▼
Study Spec (试验级别)
    │
    ├── 从 Study 配置读取 sdtmIgVersion = "3.4"
    │
    └── TargetVariable
        ├── base_variable_id → Global Library Variable
        ├── 继承 core, role, codelist
        └── 可覆盖 origin, sourceDerivation 等
```

**当前实现：**
```
Study Spec (Mock 数据)
    │
    └── 无关联 Global Library
        └── 属性完全手动定义
```

### 2.3 解决方案

#### 2.3.1 后端修改

**1. TargetVariable 增加关联字段：**
```python
# backend/app/models/target_variable.py
class TargetVariable:
    # ... 现有字段 ...

    # 新增：Global Library 关联
    global_library_variable_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("target_variables.id", ondelete="SET NULL"),
        nullable=True,
        comment="Global Library 标准变量 ID（用于属性继承）",
    )
```

**2. 新增 API：根据标准版本获取变量模板：**
```python
# GET /api/v1/global-library/standards/{spec_type}/versions/{version}/datasets/{dataset_name}/variables
async def get_standard_variables_for_inheritance(
    spec_type: str,  # SDTM / ADaM
    version: str,    # 3.4
    dataset_name: str  # AE
):
    """获取指定标准版本的变量定义，用于 Study Spec 创建时继承"""
    pass
```

**3. Study Spec API 修改：**
```python
# POST /api/v1/study-specs/{spec_id}/datasets/{dataset_id}/variables
async def create_variable(
    data: CreateVariableRequest,
    inherit_from_global_library: bool = Query(True)  # 是否从 GL 继承
):
    if inherit_from_global_library and data.global_library_variable_id:
        # 从 Global Library 继承属性
        gl_variable = await db.get(TargetVariable, data.global_library_variable_id)
        # 复制 core, role, codelist 等属性
    pass
```

#### 2.3.2 前端修改

**1. Study Spec 页面读取 Study 配置：**
```typescript
// 获取 Study 的标准版本配置
const { data: studyConfig } = usePipelineStudyConfig(studyId);

// 根据版本获取 Global Library 数据集
const { data: glDatasets } = useGlobalLibraryDatasets(
    studyConfig?.config?.sdtmIgVersion
);
```

**2. 变量创建时显示继承来源：**
```typescript
// VariableFormDrawer 增加 Global Library 选择
<Select
    label="从 Global Library 继承"
    options={glVariables.map(v => ({
        label: `${v.variable_name} - ${v.variable_label}`,
        value: v.id
    }))}
    onChange={(id) => {
        // 自动填充继承的属性
        const glVar = glVariables.find(v => v.id === id);
        form.setFieldsValue({
            core: glVar.core,
            role: glVar.role,
            codelist: glVar.codelist_name
        });
    }}
/>
```

---

## 3. 问题 3: Global Library Seeding

### 3.1 当前状态检查

需要检查数据库中是否有：
- CDISC SDTM/ADaM 标准版本节点 (ScopeNode.node_type = 'CDISC')
- 标准数据集定义 (TargetDataset)
- 标准变量定义 (TargetVariable)

### 3.2 Seeding 方案

创建 seeding 脚本初始化 CDISC 标准数据：

```python
# backend/scripts/seed_cdisc_standards.py

async def seed_sdtm_ig_34():
    """Seed SDTM IG 3.4 标准数据"""

    # 1. 创建 ScopeNode (CDISC 类型)
    sdtm_node = ScopeNode(
        code="CDISC-SDTM-IG-3.4",
        name="SDTM Implementation Guide v3.4",
        node_type=NodeType.CDISC,
        lifecycle_status=LifecycleStatus.ONGOING
    )

    # 2. 创建 Specification
    spec = Specification(
        scope_node_id=sdtm_node.id,
        name="SDTM IG 3.4",
        spec_type=SpecType.SDTM,
        status=SpecStatus.ACTIVE
    )

    # 3. 创建标准数据集和变量
    # AE Dataset
    ae_dataset = TargetDataset(
        specification_id=spec.id,
        dataset_name="AE",
        class_type=DatasetClass.EVENTS
    )

    # AEDECOD Variable
    aedecod = TargetVariable(
        dataset_id=ae_dataset.id,
        variable_name="AEDECOD",
        variable_label="Dictionary-Derived Term",
        data_type=DataType.CHAR,
        core=VariableCore.REQ,
        origin_type=OriginType.CDISC,
        standard_metadata={
            "role": "Synonym Qualifier",
            "codelist_name": "MedDRA PT",
            "codelist_ref": "NCI C123456"
        }
    )
```

---

## 4. 修复优先级

| 优先级 | 任务 | 影响 |
|--------|------|------|
| P0 | 修复 Clinical Context 与 ScopeNode ID 映射 | Study Spec 页面无法正常工作 |
| P1 | Study Spec 读取 Study 配置的标准版本 | 无法关联 Global Library |
| P1 | Global Library 继承 API | 无法继承标准变量属性 |
| P2 | Seeding CDISC 标准数据 | 初始数据缺失 |

---

## 5. 下一步行动

1. **立即修复**：Clinical Context 存储 ScopeNode ID
2. **前端修改**：Study Spec 页面集成标准版本选择
3. **后端 API**：增加 Global Library 继承接口
4. **数据初始化**：创建 CDISC 标准 seeding 脚本