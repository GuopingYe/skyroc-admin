# Programming Tracker 模块技术方案

## 1. 数据模型分析

### 1.1 核心模型：ProgrammingTracker

**文件位置**: `backend/app/models/tracker.py`

| 字段名 | 类型 | 说明 | 索引 |
|--------|------|------|------|
| `id` | Integer | 主键，自增 | PK |
| `analysis_id` | Integer | 所属 Analysis 节点 ID (FK -> scope_nodes.id) | Yes |
| `deliverable_type` | Enum | 交付物类型: SDTM/ADaM/TFL/Other_Lookup | Yes |
| `deliverable_name` | String(100) | 交付物名称，如 'AE', 'Table 14.1.1' | Yes |
| `task_name` | String(200) | 任务名称 | No |
| `description` | Text | 任务描述 | No |
| `target_dataset_id` | Integer | 关联的目标数据集 ID (SDTM/ADaM) | Yes |
| `tfl_output_id` | Integer | 关联的 TFL 输出 ID | Yes |
| `prod_programmer_id` | String(100) | 生产程序员用户 ID | Yes |
| `qc_programmer_id` | String(100) | QC 程序员用户 ID | Yes |
| `prod_status` | Enum | 生产状态 (双轨状态机) | Yes |
| `qc_status` | Enum | QC 状态 (双轨状态机) | Yes |
| `status` | Enum | 任务状态 (旧版，保留兼容) | Yes |
| `priority` | Enum | 优先级: High/Medium/Low | Yes |
| `execution_order` | Integer | 执行顺序 | No |
| `qc_method` | Enum | QC 方法: Double_Programming/Spot_Check/Review | No |
| `started_at` | DateTime | 开始时间 | No |
| `completed_at` | DateTime | 完成时间 | No |
| `qc_started_at` | DateTime | QC 开始时间 | No |
| `qc_completed_at` | DateTime | QC 完成时间 | No |
| `due_date` | DateTime | 截止日期 | Yes |
| `prod_file_path` | String(500) | 生产程序文件路径 | No |
| `qc_file_path` | String(500) | QC 程序文件路径 | No |
| `prod_program_name` | String(255) | Prod 程序文件名 | No |
| `qc_program_name` | String(255) | QC 程序文件名 | No |
| `output_file_name` | String(255) | 最终生成的物理文件名 | No |
| `delivery_batch` | String(100) | 交付批次标记 | Yes |
| `tfl_metadata` | JSONB | TFL 专属元数据 | No |
| `extra_attrs` | JSONB | 扩展属性 | No |

**双轨状态机设计**:
```
生产状态 (prod_status):
  Not_Started -> Programming -> Ready_for_QC -> Completed

QC 状态 (qc_status):
  Not_Started -> In_Progress -> Issues_Found/Passed
```

### 1.2 关联模型：TrackerIssue

**文件位置**: `backend/app/models/tracker_issue.py`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | Integer | 主键 |
| `tracker_id` | Integer | 关联的 Tracker ID (FK) |
| `qc_cycle` | String(50) | QC 轮次，如 'Dry Run 1', 'Final' |
| `finding_description` | Text | 发现的问题描述 |
| `finding_category` | String(100) | 问题分类 |
| `severity` | String(20) | 严重程度: Critical/Major/Minor |
| `raised_by` | String(100) | 提出人用户 ID |
| `raised_at` | DateTime | 发现日期 |
| `developer_response` | Text | 程序员回复内容 |
| `responded_by` | String(100) | 回复人用户 ID |
| `responded_at` | DateTime | 回复时间 |
| `resolution_notes` | Text | 解决说明 |
| `resolved_by` | String(100) | 解决确认人 ID |
| `resolved_at` | DateTime | 解决确认时间 |
| `issue_status` | Enum | Issue 状态: Open/Answered/Resolved/Closed |

### 1.3 作用域模型：ScopeNode

**文件位置**: `backend/app/models/scope_node.py`

层级结构: `CDISC -> Global -> TA -> Compound -> Indication -> Study -> Analysis`

关键属性:
- `node_type`: 节点类型 (Analysis 是 Tracker 的直接父级)
- `lifecycle_status`: 生命周期状态
- `parent_id`: 父节点 ID (自引用)
- `path`: 物化路径 (快速查询祖先/后代)

---

## 2. API 接口设计

### 2.1 基础路径

```
/api/v1/trackers
```

### 2.2 现有接口 (已实现)

| Method | Path | 说明 | 状态 |
|--------|------|------|------|
| GET | `/trackers` | 获取 Tracker 任务列表 | 已实现 |
| GET | `/trackers/{tracker_id}/issues` | 获取 Issue 列表 | 已实现 |
| POST | `/trackers/{tracker_id}/issues` | 创建 QC Issue | 已实现 |
| PUT | `/issues/{issue_id}/response` | 程序员回复 Issue | 已实现 |

### 2.3 待实现接口

#### 2.3.1 创建 Tracker 任务

```http
POST /api/v1/trackers
Content-Type: application/json

Request Body:
{
  "analysis_id": 123,
  "deliverable_type": "SDTM",
  "deliverable_name": "AE",
  "task_name": "AE Dataset",
  "description": "Adverse Events dataset programming",
  "prod_programmer_id": "user-001",
  "qc_programmer_id": "user-002",
  "priority": "High",
  "qc_method": "Double_Programming",
  "due_date": "2024-12-31T00:00:00Z",
  "target_dataset_id": 456,
  "created_by": "user-admin"
}

Response: 201 Created
{
  "id": 789,
  "analysis_id": 123,
  "deliverable_type": "SDTM",
  "deliverable_name": "AE",
  ...
}
```

#### 2.3.2 获取单个 Tracker 详情

```http
GET /api/v1/trackers/{tracker_id}

Response: 200 OK
{
  "id": 789,
  "analysis_id": 123,
  "deliverable_type": "SDTM",
  "deliverable_name": "AE",
  "task_name": "AE Dataset",
  "prod_status": "Programming",
  "qc_status": "Not_Started",
  "priority": "High",
  "started_at": "2024-06-01T10:00:00Z",
  ...
}
```

#### 2.3.3 更新 Tracker 任务

```http
PUT /api/v1/trackers/{tracker_id}
Content-Type: application/json

Request Body:
{
  "prod_programmer_id": "user-003",
  "priority": "Medium",
  "updated_by": "user-admin"
}

Response: 200 OK
{
  "id": 789,
  ...
}
```

#### 2.3.4 删除 Tracker 任务 (软删除)

```http
DELETE /api/v1/trackers/{tracker_id}

Response: 204 No Content
```

#### 2.3.5 状态流转接口

```http
# 开始编程
POST /api/v1/trackers/{tracker_id}/start-programming
Request Body: { "user_id": "user-001" }

# 提交 QC
POST /api/v1/trackers/{tracker_id}/submit-for-qc
Request Body: { "user_id": "user-001" }

# 开始 QC
POST /api/v1/trackers/{tracker_id}/start-qc
Request Body: { "user_id": "user-002" }

# 通过 QC
POST /api/v1/trackers/{tracker_id}/pass-qc
Request Body: { "user_id": "user-002" }

# QC 发现问题
POST /api/v1/trackers/{tracker_id}/fail-qc
Request Body: { "user_id": "user-002", "issue_summary": "..." }
```

#### 2.3.6 按交付物类型过滤

```http
GET /api/v1/trackers?analysis_id=123&deliverable_type=SDTM&prod_status=Programming

Response: 200 OK
{
  "total": 5,
  "items": [...]
}
```

#### 2.3.7 批量操作

```http
# 批量创建 (从模板导入)
POST /api/v1/trackers/batch
Content-Type: application/json

Request Body:
{
  "analysis_id": 123,
  "tasks": [
    { "deliverable_type": "SDTM", "deliverable_name": "DM", ... },
    { "deliverable_type": "SDTM", "deliverable_name": "AE", ... }
  ],
  "created_by": "user-admin"
}

# 批量更新状态
PUT /api/v1/trackers/batch/status
Content-Type: application/json

Request Body:
{
  "tracker_ids": [1, 2, 3],
  "prod_status": "Ready_for_QC",
  "updated_by": "user-001"
}
```

### 2.4 Issue 管理接口 (补充)

#### 2.4.1 解决 Issue

```http
PUT /api/v1/issues/{issue_id}/resolve
Content-Type: application/json

Request Body:
{
  "resolution_notes": "Fixed in commit abc123",
  "resolved_by": "user-001"
}
```

#### 2.4.2 关闭 Issue

```http
PUT /api/v1/issues/{issue_id}/close
Content-Type: application/json

Request Body:
{
  "closed_by": "user-002"
}
```

---

## 3. 前后端数据契约

### 3.1 数据类型映射

| 前端类型 (Api.MDR) | 后端类型 (Python) | 说明 |
|-------------------|-------------------|------|
| `TaskCategory` | `DeliverableType` | SDTM/ADaM/TFL/Other |
| `TaskStatus` | `ProdStatus` + `QCStatus` | 需要转换逻辑 |
| `Person.id` | `String(100)` | 用户 ID |
| `string` (日期) | `DateTime` | ISO 8601 格式 |

### 3.2 响应格式标准化

```typescript
// 列表响应
interface TrackerListResponse {
  total: number;
  items: ProgrammingTrackerRead[];
}

// 单个对象响应
interface ProgrammingTrackerRead {
  id: number;  // 注意：后端使用 Integer，前端需要转换为 string
  analysis_id: number;
  deliverable_type: DeliverableType;
  deliverable_name: string;
  task_name: string;
  description: string | null;
  prod_programmer_id: string | null;
  qc_programmer_id: string | null;
  prod_status: ProdStatus;
  qc_status: QCStatus;
  status: TrackerStatus;  // 兼容字段
  priority: Priority;
  execution_order: number;
  qc_method: QCMethod;
  started_at: string | null;
  completed_at: string | null;
  qc_started_at: string | null;
  qc_completed_at: string | null;
  due_date: string | null;
  prod_file_path: string | null;
  qc_file_path: string | null;
  prod_program_name: string | null;
  qc_program_name: string | null;
  output_file_name: string | null;
  delivery_batch: string | null;
  tfl_metadata: Record<string, unknown> | null;
  target_dataset_id: number | null;
  tfl_output_id: number | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}
```

### 3.3 状态映射逻辑

前端 `TaskStatus` 与后端双轨状态的映射:

```typescript
function mapToFrontendStatus(prodStatus: ProdStatus, qcStatus: QCStatus): TaskStatus {
  if (prodStatus === 'Completed' && qcStatus === 'Passed') return 'Signed Off';
  if (qcStatus === 'Passed') return 'QC Pass';
  if (qcStatus === 'In_Progress' || qcStatus === 'Issues_Found') return 'Ready for QC';
  if (prodStatus === 'Programming') return 'In Progress';
  return 'Not Started';
}
```

---

## 4. 实现步骤建议

### Phase 1: 后端 API 完善 (优先级: High)

1. **补充 CRUD 接口**
   - [ ] `POST /trackers` - 创建任务
   - [ ] `GET /trackers/{id}` - 获取单个任务
   - [ ] `PUT /trackers/{id}` - 更新任务
   - [ ] `DELETE /trackers/{id}` - 软删除任务

2. **状态流转接口**
   - [ ] `POST /trackers/{id}/start-programming`
   - [ ] `POST /trackers/{id}/submit-for-qc`
   - [ ] `POST /trackers/{id}/start-qc`
   - [ ] `POST /trackers/{id}/pass-qc`
   - [ ] `POST /trackers/{id}/fail-qc`

3. **批量操作接口**
   - [ ] `POST /trackers/batch` - 批量创建
   - [ ] `PUT /trackers/batch/status` - 批量更新状态

### Phase 2: 前端类型对齐 (优先级: High)

1. **更新 TypeScript 类型定义**
   - 文件: `frontend/src/service/types/mdr.d.ts`
   - 添加: `ProdStatus`, `QCStatus`, `DeliverableType` 枚举
   - 更新: `TrackerTask` 接口与后端 Schema 对齐

2. **创建数据转换层**
   - 文件: `frontend/src/service/transforms/tracker.ts`
   - 实现 ID 格式转换 (number -> string)
   - 实现状态映射函数

### Phase 3: 前端 API 集成 (优先级: Medium)

1. **完善 API 服务**
   - 文件: `frontend/src/service/api/mdr.ts`
   - 添加所有新接口的调用函数

2. **替换 Mock 数据**
   - 文件: `frontend/src/pages/(base)/mdr/programming-tracker/`
   - 使用 React Query 替换 mock 数据
   - 添加加载状态和错误处理

### Phase 4: 测试与文档 (优先级: Low)

1. **后端单元测试**
   - 测试所有 API 端点
   - 测试状态流转逻辑

2. **前端集成测试**
   - 测试 API 调用
   - 测试状态管理

3. **API 文档**
   - 更新 OpenAPI Schema
   - 添加使用示例

---

## 5. 关键设计决策

### 5.1 双轨状态机 vs 单一状态

**决策**: 保持后端双轨状态机，前端展示时转换为单一状态。

**理由**:
- 双轨状态机更符合实际工作流 (生产和 QC 独立进行)
- 单一状态便于前端展示和理解
- 通过映射函数实现平滑转换

### 5.2 ID 类型选择

**决策**: 后端使用 Integer，前端使用 String。

**理由**:
- 后端: Integer 自增主键性能更好
- 前端: String 类型更灵活，支持未来可能的 UUID 迁移
- 在数据转换层进行转换

### 5.3 软删除实现

**决策**: 使用 `is_deleted` 字段实现软删除。

**理由**:
- 符合 21 CFR Part 11 合规要求
- 保留审计追踪
- 可恢复误删数据

---

## 6. 风险与缓解措施

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 状态机流转复杂 | 用户理解困难 | 提供清晰的状态转换图和 UI 提示 |
| 前后端类型不一致 | 数据错误 | 自动化类型生成和校验 |
| 批量操作性能 | 系统响应慢 | 添加事务处理和分批执行 |

---

## 7. 附录

### 7.1 枚举值定义

**DeliverableType**:
- `SDTM` - SDTM 数据集
- `ADaM` - ADaM 数据集
- `TFL` - 表格/图表/列表
- `Other_Lookup` - 其他/查询表

**ProdStatus**:
- `Not_Started` - 未开始
- `Programming` - 编程中
- `Ready_for_QC` - 待 QC
- `Completed` - 已完成

**QCStatus**:
- `Not_Started` - 未开始
- `In_Progress` - 进行中
- `Issues_Found` - 发现问题
- `Passed` - 已通过

**Priority**:
- `High` - 高
- `Medium` - 中
- `Low` - 低

**QCMethod**:
- `Double_Programming` - 双重编程
- `Spot_Check` - 抽查
- `Review` - 审阅

**IssueStatus**:
- `Open` - 待处理
- `Answered` - 已回复
- `Resolved` - 已解决
- `Closed` - 已关闭