# SDTM/ADaM Spec 与 Global Library 版本关联设计方案

## 背景

当前问题：
1. Study Configuration 中选择的标准版本（如 SDTMIG v3.4）是静态列表，未与 Global Library 关联
2. Study Spec 创建时，无法自动关联到 Global Library 对应版本的标准
3. 变量无法从 Global Library 版本继承属性（如 AE.DECODE 的定义）

## 设计方案

### 1. 数据模型增强

#### 1.1 Study Configuration 扩展

在 `ScopeNode` (Study 节点) 的 `extra_attrs` 中添加标准版本引用：

```json
{
  "standard_refs": {
    "sdtm_ig": {
      "version": "SDTMIG v3.4",
      "specification_id": 123  // Global Library 中对应版本的 Specification ID
    },
    "adam_ig": {
      "version": "ADaMIG v1.3",
      "specification_id": 456
    }
  }
}
```

#### 1.2 Study Spec 继承机制

Specification 模型已有 `base_specification_id` 字段：
- Study Spec 创建时，`base_specification_id` 指向 Global Library 中对应版本的 Specification
- 变量通过 `TargetVariable.base_id` 关联到父级变量

### 2. API 改造

#### 2.1 改造 `/available-versions` API

**文件**: `backend/app/api/routers/pipeline.py`

从 Global Library 中动态获取可用版本列表，并返回对应的 Specification ID：

```python
@router.get("/available-versions")
async def get_available_versions(db: AsyncSession = Depends(get_db_session)):
    """从 Global Library 获取可用标准版本"""
    # 查询 SDTMIG 版本
    sdtmig_query = select(Specification).where(
        Specification.spec_type == SpecType.SDTM,
        Specification.standard_name.ilike("SDTMIG%"),
        Specification.is_deleted == False
    ).order_by(Specification.version.desc())

    # 返回格式
    return {
        "sdtmIgVersions": [
            {
                "label": spec.standard_name,
                "value": spec.standard_name,
                "specification_id": spec.id
            }
            for spec in sdtmig_specs
        ],
        ...
    }
```

#### 2.2 新增 API: 从 Global Library 初始化 Study Spec

**文件**: `backend/app/api/routers/study_spec.py`

```python
@router.post("/from-global-library")
async def create_study_spec_from_global_library(
    scope_node_id: int,
    spec_type: SpecType,
    base_specification_id: int,
    db: AsyncSession = Depends(get_db_session)
):
    """
    从 Global Library 初始化 Study Spec

    1. 创建 Specification 记录，设置 base_specification_id
    2. 复制 Global Library 的 Dataset 和 Variable 定义
    3. 设置变量的 base_id 指向 Global Library 的变量
    """
    pass
```

### 3. 前端改造

#### 3.1 Study Configuration Tab

**文件**: `frontend/src/pages/(base)/mdr/pipeline-management/index.tsx`

- 标准版本下拉框的选项需要包含 `specification_id`
- 保存时，将 `specification_id` 一起保存到 Study 的配置中

#### 3.2 Study Spec 页面

**文件**: `frontend/src/pages/(base)/mdr/study-spec/index.tsx`

- 创建 Spec 时，自动关联到 Study 配置的标准版本
- 变量显示时，标识从 Global Library 继承的属性

### 4. 变量继承机制

#### 4.1 继承流程

```
1. Study 选择 SDTMIG v3.4 (specification_id=123)
2. 创建 Study Spec 时，自动继承 Global Library SDTMIG v3.4 的变量定义
3. AE.DECOD 变量：
   - Global Library: id=1001, variable_name="DECOD", origin_type=CDISC
   - Study Spec: id=2001, base_id=1001, origin_type=CDISC
4. 用户可以在 Study Spec 中修改 AE.DECOD 的属性（如长度）
   - override_type 变为 "Modified"
```

#### 4.2 属性继承规则

| 属性 | 继承规则 |
|------|----------|
| variable_name | 必须继承，不可修改 |
| variable_label | 继承，可修改 |
| data_type | 继承，不可修改 |
| length | 继承，可修改 |
| core | 继承，不可修改 |
| role | 继承，可修改 |
| codelist | 继承，可修改 |

### 5. 实施步骤

#### Phase 1: 后端 API 改造
1. 改造 `getAvailableVersions` API，从 Global Library 动态获取版本
2. 新增 `create_study_spec_from_global_library` API
3. 新增变量继承的 helper 函数

#### Phase 2: 前端改造
1. 修改 Study Configuration Tab，支持版本关联
2. 修改 Study Spec 页面，支持从 Global Library 初始化

#### Phase 3: 数据初始化
1. 运行 CDISC 同步脚本，确保 Global Library 有标准版本数据
2. 验证关联和继承功能

## 相关文件

| 文件 | 说明 |
|------|------|
| `backend/app/api/routers/pipeline.py` | 管线 API |
| `backend/app/api/routers/global_library.py` | Global Library API |
| `backend/app/api/routers/study_spec.py` | Study Spec API |
| `backend/app/models/specification.py` | Specification 模型 |
| `backend/app/models/target_variable.py` | TargetVariable 模型 |
| `frontend/src/pages/(base)/mdr/pipeline-management/index.tsx` | 管线管理页面 |
| `frontend/src/pages/(base)/mdr/study-spec/index.tsx` | Study Spec 页面 |