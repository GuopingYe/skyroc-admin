# TFL Designer 产品需求文档

**版本**: 1.0  
**最后更新**: 2026-03-14  
**作者**: Product Manager Agent

---

## 目录

1. [SOC/PT 嵌套行](#功能-1-socpt-嵌套行)
2. [模板系统](#功能-2-模板系统)
3. [Figure 编辑器](#功能-3-figure-编辑器)
4. [Listing 编辑器](#功能-4-listing-编辑器)
5. [导出功能](#功能-5-导出功能)

---

## 功能 1: SOC/PT 嵌套行

### 背景

在临床试验不良事件 (AE) 表格中，数据通常按 System Organ Class (SOC) 和 Preferred Term (PT) 层级组织。例如：

```
Cardiac disorders (SOC)
  Atrial fibrillation (PT)
  Palpitations (PT)
Gastrointestinal disorders (SOC)
  Nausea (PT)
  Vomiting (PT)
```

当前实现支持基础的 `level` 字段，但缺乏对 SOC/PT 这类特定嵌套模式的语义支持和便捷操作。

### 用户故事

**US-1.1**: 作为统计程序员，我希望能快速创建 SOC/PT 嵌套结构的表格，以便高效编辑 AE 汇总表。

**US-1.2**: 作为统计程序员，我希望系统能自动识别 SOC 和 PT 层级并正确缩进，以便生成符合监管要求的表格格式。

**US-1.3**: 作为统计程序员，我希望能批量导入 SOC/PT 数据（如从 MedDRA 字典），以便快速填充行结构。

**US-1.4**: 作为统计程序员，我希望 SOC 行和 PT 行有不同的统计配置选项，以便灵活定制显示格式。

### 功能需求

#### FR-1.1 行类型定义

| 字段 | 类型 | 说明 |
|------|------|------|
| `rowType` | enum | 行类型: `header` \| `soc` \| `pt` \| `data` |
| `socCode` | string | SOC 编码 (如 MedDRA code) |
| `ptCode` | string | PT 编码 |
| `hierarchyLevel` | number | 层级深度 (0=顶层) |

#### FR-1.2 SOC/PT 特殊操作

1. **添加 SOC 行**: 点击按钮自动创建 level=0 的 SOC 行，自动设置 `rowType='soc'`
2. **在 SOC 下添加 PT**: 选中 SOC 行后点击 "Add PT"，自动创建 level=1 的子行
3. **批量导入**: 从 CSV 或 MedDRA 字典导入 SOC/PT 列表
4. **自动排序**: 按 SOC code → PT code 自动排序

#### FR-1.3 显示格式

- SOC 行: 加粗、背景色高亮、level=0
- PT 行: 正常字体、缩进显示、level=1
- 支持最多 3 级嵌套 (SOC → PT → 子分类)

#### FR-1.4 统计量继承

- SOC 行可设置默认统计量
- 子 PT 行默认继承父 SOC 的统计配置
- 支持单独覆盖子行配置

### 验收标准

**AC-1.1 SOC/PT 行创建**
- [ ] Given 用户在 Row Structure 标签页，When 点击 "Add SOC Row"，Then 创建一行 `rowType='soc'`、`level=0` 的行
- [ ] Given 选中一个 SOC 行，When 点击 "Add PT under SOC"，Then 在该 SOC 下创建 `rowType='pt'`、`level=1` 的子行
- [ ] Given 一个 SOC 有多个 PT，When 显示时，Then 所有 PT 行正确缩进在 SOC 下

**AC-1.2 批量导入**
- [ ] Given 用户点击 "Import SOC/PT"，When 上传包含 SOC 和 PT 列的 CSV 文件，Then 自动生成嵌套结构
- [ ] Given CSV 中有重复的 SOC，When 导入时，Then PT 正确归类到唯一 SOC 下

**AC-1.3 显示效果**
- [ ] Given SOC 行，When 渲染预览，Then 行标签加粗显示
- [ ] Given PT 行，When 渲染预览，Then 行标签前有 2 个空格缩进
- [ ] Given 3 级嵌套行，When 渲染预览，Then 根据层级正确缩进 (每级 2 空格)

**AC-1.4 数据验证**
- [ ] Given PT 行没有父 SOC，When 保存时，Then 显示警告 "PT 行应归属于 SOC"
- [ ] Given 超过 3 级嵌套，When 保存时，Then 显示错误 "不支持超过 3 级嵌套"

**AC-1.5 删除行为**
- [ ] Given 删除 SOC 行，When 确认删除，Then 其下所有 PT 行一并删除
- [ ] Given 删除 PT 行，When 确认删除，Then 仅删除该行，不影响其他行

---

## 功能 2: 模板系统

### 背景

临床试验中许多表格结构是标准化的，如 Demographics、Adverse Events、Laboratory 等。模板系统允许用户：
- 从预定义模板快速创建新表格
- 保存自定义表格为模板供复用
- 管理模板库

### 用户故事

**US-2.1**: 作为统计程序员，我希望能从标准模板库选择模板创建表格，以便快速开始工作。

**US-2.2**: 作为统计程序员，我希望能将自定义表格保存为模板，以便在后续项目中复用。

**US-2.3**: 作为团队负责人，我希望能管理团队共享的模板库，以便标准化团队的表格输出。

**US-2.4**: 作为统计程序员，我希望能预览模板内容后再决定是否使用，以便选择最合适的模板。

### 功能需求

#### FR-2.1 模板数据结构

```typescript
interface Template {
  id: string
  type: 'table' | 'figure' | 'listing'
  name: string
  category: AnalysisCategory
  description?: string
  tags?: string[]
  shell: TableShell | FigureShell | ListingShell
  isDefault?: boolean      // 是否为系统默认模板
  createdBy?: string       // 创建者
  createdAt: string
}
```

#### FR-2.2 模板库管理

1. **内置模板**: 系统预置 20+ 常用表格模板
   - Demographics (ADSL)
   - Disposition (ADSL)
   - Adverse Events Summary (ADAE)
   - AE by SOC/PT (ADAE)
   - Laboratory Results (ADLB)
   - Vital Signs (ADVS)
   - Concomitant Medications (ADCM)

2. **自定义模板**: 用户保存的模板
   - 保存在 localStorage 或后端
   - 支持编辑、删除、分享

3. **模板分类**: 按以下维度分类
   - 类型 (Table/Figure/Listing)
   - 分析类别 (Demographics, AE, Lab, etc.)
   - 数据集 (ADSL, ADAE, ADLB, etc.)

#### FR-2.3 模板操作流程

**创建表格 → 选择模板**:
```
Study Detail 页面
  → 点击 "Add Table"
  → 选择 "From Template"
  → 浏览/搜索模板
  → 预览模板
  → 确认使用
  → 创建新表格 (复制模板结构)
```

**保存为模板**:
```
Table Editor 页面
  → 点击 "Save as Template"
  → 输入模板名称、描述、标签
  → 确认保存
```

#### FR-2.4 模板预览

- 显示模板元信息 (名称、类别、描述)
- 显示行结构预览
- 显示列结构预览 (Treatment Arms)
- 显示页脚模板

### 验收标准

**AC-2.1 模板浏览**
- [ ] Given 用户在 Study Detail 页面，When 点击 "Add Table" → "From Template"，Then 显示模板库列表
- [ ] Given 模板库列表，When 用户选择 "Adverse Events" 分类，Then 只显示 AE 相关模板
- [ ] Given 模板列表，When 用户输入搜索关键词，Then 实时过滤匹配的模板

**AC-2.2 从模板创建**
- [ ] Given 用户选择 "Demographics" 模板，When 点击 "Use Template"，Then 创建新表格并跳转到编辑器
- [ ] Given 从模板创建的表格，When 查看行结构，Then 与模板完全一致
- [ ] Given 从模板创建的表格，When 查看元数据，Then shellNumber 为空等待用户填写

**AC-2.3 保存为模板**
- [ ] Given 用户在 Table Editor，When 点击 "Save as Template"，Then 弹出模板信息表单
- [ ] Given 填写完模板信息，When 点击保存，Then 模板出现在自定义模板列表
- [ ] Given 已存在的同名模板，When 保存时，Then 提示是否覆盖

**AC-2.4 模板预览**
- [ ] Given 用户点击模板卡片，When 展开，Then 显示模板详细信息
- [ ] Given 模板预览，When 查看 Row Structure，Then 以树形结构展示行层级
- [ ] Given 模板预览，When 查看 Column Structure，Then 显示治疗组嵌套结构

**AC-2.5 模板管理**
- [ ] Given 用户在模板管理页面，When 选择自定义模板，Then 可编辑或删除
- [ ] Given 用户尝试删除内置模板，When 点击删除，Then 提示 "内置模板不可删除"

---

## 功能 3: Figure 编辑器

### 背景

Figure 编辑器用于设计临床试验图表，支持多种图表类型，包括 Kaplan-Meier 曲线、森林图、瀑布图等。当前 Figure Editor 仅有基础框架，需要完整实现。

### 用户故事

**US-3.1**: 作为统计程序员，我希望能选择不同的图表类型（KM曲线、森林图、瀑布图等），以便创建各类临床图表。

**US-3.2**: 作为统计程序员，我希望能配置 X/Y 轴的标签、范围、刻度格式，以便精确控制图表外观。

**US-3.3**: 作为统计程序员，我希望能添加、删除、配置数据系列（如不同治疗组），以便展示多组数据。

**US-3.4**: 作为统计程序员，我希望能实时预览图表效果，以便即时调整配置。

**US-3.5**: 作为统计程序员，我希望能保存图表样式模板，以便在不同图表间复用样式。

### 功能需求

#### FR-3.1 支持的图表类型

| 图表类型 | 用途 | 数据要求 |
|---------|------|---------|
| `line` | 趋势线图 | X/Y 连续变量 |
| `scatter` | 散点图 | X/Y 连续变量 |
| `bar` | 柱状图 | 分类 X，连续 Y |
| `box` | 箱线图 | 分类 X，连续 Y |
| `violin` | 小提琴图 | 分类 X，连续 Y |
| `km_curve` | Kaplan-Meier 曲线 | 时间 + 事件 |
| `forest` | 森林图 | 多个 HR + CI |
| `waterfall` | 瀑布图 | 单个连续变量 |
| `spider` | 蜘蛛图 | 时间 + 变化率 |

#### FR-3.2 图表配置界面

**Metadata 标签页**:
- Figure Number
- Title
- Population
- Chart Type (下拉选择)
- Dataset

**Axes 标签页**:
- X-Axis: 标签、类型(连续/分类/日期)、范围、对数刻度、刻度格式
- Y-Axis: 标签、类型、范围、对数刻度、刻度格式
- Secondary Y-Axis (可选)

**Series 标签页**:
- 系列列表 (名称、类型、颜色)
- 添加/删除/排序
- 颜色选择器
- 标记样式 (点、线样式)

**Style 标签页**:
- 图表尺寸 (宽度、高度)
- 字体 (字体族、大小)
- 图例 (位置、方向)
- 网格线
- 背景/边框

**Preview 标签页**:
- 实时图表渲染 (Plotly.js)
- 导出按钮

#### FR-3.3 KM 曲线特殊功能

- 自动添加删失标记 (censoring marks)
- Risk table 显示
- Log-rank p-value 注释
- Median survival time 标注
- 自定义颜色和线型

#### FR-3.4 森林图特殊功能

- 效果值和置信区间输入
- 参考线 (如 HR=1)
- 分组标签
- 点大小映射 (可选)

### 验收标准

**AC-3.1 图表类型切换**
- [ ] Given 用户在 Metadata 标签页，When 选择不同图表类型，Then 配置界面根据类型动态调整
- [ ] Given 切换到 KM_curve，When 查看 Axes 配置，Then 显示 KM 特有的 Risk Table 选项

**AC-3.2 坐标轴配置**
- [ ] Given 用户配置 X-Axis 范围为 [0, 100]，When 预览图表，Then X 轴范围正确
- [ ] Given 用户设置 Y-Axis 为对数刻度，When 预览图表，Then Y 轴刻度对数显示
- [ ] Given 用户设置 X-Axis 类型为日期，When 输入刻度格式 "%Y-%m"，Then 日期正确格式化

**AC-3.3 数据系列管理**
- [ ] Given 用户点击 "Add Series"，When 填写系列名称和颜色，Then 新系列出现在列表
- [ ] Given 有 3 个数据系列，When 用户拖拽排序，Then 图例顺序随之改变
- [ ] Given 用户删除一个系列，When 预览图表，Then 该系列不再显示

**AC-3.4 实时预览**
- [ ] Given 用户修改任何配置，When 修改完成，Then 预览区域在 1 秒内更新
- [ ] Given 预览区域，When 用户悬停数据点，Then 显示 tooltip 信息

**AC-3.5 KM 曲线**
- [ ] Given KM 曲线类型，When 配置删失标记，Then 预览显示删失符号
- [ ] Given KM 曲线类型，When 启用 Risk Table，Then 图表下方显示人数表

**AC-3.6 样式模板**
- [ ] Given 用户配置好样式，When 点击 "Save Style Template"，Then 样式保存为模板
- [ ] Given 有保存的样式模板，When 应用于新图表，Then 样式完全复用

---

## 功能 4: Listing 编辑器

### 背景

Listing 是原始数据列表，用于数据核查和监管审查。与汇总表不同，Listing 展示每条原始记录，需要支持列配置、排序、筛选等功能。

### 用户故事

**US-4.1**: 作为统计程序员，我希望能配置 Listing 的列（变量、标签、宽度、对齐），以便生成符合格式要求的 Listing。

**US-4.2**: 作为统计程序员，我希望能设置排序规则（多字段、升降序），以便按指定顺序展示数据。

**US-4.3**: 作为统计程序员，我希望能设置筛选条件，以便只显示符合条件的记录。

**US-4.4**: 作为统计程序员，我希望能分页预览 Listing，以便查看大数据量输出效果。

**US-4.5**: 作为统计程序员，我希望能从 ADaM 数据集自动推断列信息，以便快速初始化 Listing。

### 功能需求

#### FR-4.1 列配置

| 配置项 | 说明 |
|--------|------|
| 变量名 | 数据集变量名 (如 SUBJID, AETERM) |
| 显示标签 | 列头显示文本 |
| 宽度 | 列宽 (像素或字符数) |
| 对齐方式 | Left / Center / Right |
| 格式 | 显示格式 (如日期格式) |
| 显示/隐藏 | 是否在输出中显示 |
| 分组 | 分组标签 (跨列合并) |

#### FR-4.2 排序配置

```typescript
interface SortConfig {
  columnId: string      // 列 ID
  order: 'asc' | 'desc' // 升序/降序
  priority: number      // 排序优先级 (1=最高)
  nullsLast?: boolean   // 空值放最后
}
```

支持多字段排序，按 priority 顺序执行。

#### FR-4.3 筛选配置

```typescript
interface FilterConfig {
  columnId: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'ge' | 'le' | 'contains' | 'starts_with' | 'in' | 'not_null' | 'is_null'
  value: string | number | string[]
  logic?: 'and' | 'or'  // 与下一条件的逻辑关系
}
```

支持多条件组合筛选。

#### FR-4.4 元数据

- Listing Number
- Title
- Population
- Dataset
- Page Size (每页行数)
- Repeat Header (每页是否重复表头)

#### FR-4.5 预览功能

- 模拟数据预览 (显示前 N 行)
- 分页浏览
- 实际数据连接 (可选，需要后端支持)

### 验收标准

**AC-4.1 列配置**
- [ ] Given 用户添加新列，When 输入变量名和标签，Then 列出现在列列表中
- [ ] Given 多个列，When 用户拖拽调整顺序，Then 列顺序更新
- [ ] Given 用户设置列宽为 150px，When 预览时，Then 列宽正确
- [ ] Given 用户隐藏某列，When 预览时，Then 该列不显示

**AC-4.2 排序配置**
- [ ] Given 用户添加排序条件 (SUBJID, asc, priority=1)，When 预览时，Then 数据按 SUBJID 升序
- [ ] Given 多个排序条件，When 预览时，Then 按 priority 顺序多字段排序
- [ ] Given 用户设置降序排序，When 预览时，Then 数据从大到小显示

**AC-4.3 筛选配置**
- [ ] Given 用户添加筛选条件 (AESEV = 'Severe')，When 预览时，Then 只显示严重不良事件
- [ ] Given 多个筛选条件用 AND 连接，When 预览时，Then 只显示满足所有条件的记录
- [ ] Given 用户使用 IN 操作符，When 输入多个值，Then 显示任一匹配的记录

**AC-4.4 分页预览**
- [ ] Given Listing 设置 pageSize=20，When 预览时，Then 每页显示 20 行
- [ ] Given 有 50 行数据，When 用户点击下一页，Then 显示第 21-40 行
- [ ] Given 每页重复表头设置，When 翻页时，Then 表头在每页顶部显示

**AC-4.5 数据推断**
- [ ] Given 用户选择数据集 ADAE，When 点击 "Auto-fill Columns"，Then 自动填充常用列 (SUBJID, AETERM, AEDECOD 等)
- [ ] Given 数据集元数据可用，When 自动填充，Then 列宽和类型根据变量属性推断

**AC-4.6 导出准备**
- [ ] Given Listing 配置完成，When 保存，Then 所有配置持久化
- [ ] Given Listing 导出时，When 生成输出文件，Then 列头、排序、筛选正确应用

---

## 功能 5: 导出功能

### 背景

导出功能是将编辑好的 Table/Figure/Listing 输出为监管递交格式的关键功能。需要支持 Word (.docx)、RTF (.rtf)、PDF (.pdf) 三种格式。

### 用户故事

**US-5.1**: 作为统计程序员，我希望能将表格导出为 Word 格式，以便在文档中进一步编辑。

**US-5.2**: 作为统计程序员，我希望能将表格导出为 RTF 格式，以便符合传统递交要求。

**US-5.3**: 作为统计程序员，我希望能将图表导出为 PDF 格式，以便嵌入最终报告。

**US-5.4**: 作为统计程序员，我希望能自定义页面设置（纸张大小、页边距、页眉页脚），以便符合公司 SOP。

**US-5.5**: 作为统计程序员，我希望能批量导出多个表格/图表，以便提高工作效率。

### 功能需求

#### FR-5.1 支持的导出格式

| 格式 | 用途 | 技术方案 |
|------|------|---------|
| Word (.docx) | 可编辑文档 | docx.js |
| RTF (.rtf) | 传统递交 | rtf-generator |
| PDF (.pdf) | 最终报告 | pdfmake / jsPDF |
| PNG (.png) | 图表图片 | Plotly 内置 |

#### FR-5.2 页面设置

```typescript
interface ExportConfig {
  format: 'word' | 'rtf' | 'pdf'
  pageSize: 'A4' | 'Letter'
  orientation: 'portrait' | 'landscape'
  margins: {
    top: number    // mm
    bottom: number
    left: number
    right: number
  }
  header?: {
    left?: string
    center?: string
    right?: string
  }
  footer?: {
    left?: string
    center?: string  // 如: "Page {page} of {total}"
    right?: string
  }
  includePageNumbers: boolean
  fontSize?: number
  fontFamily?: string
}
```

#### FR-5.3 Table 导出细节

**Word/RTF 表格格式**:
- 嵌套表头 (Treatment Arm 分组)
- 行缩进 (通过空格或单元格边距)
- 单元格对齐
- 边框样式
- 表格标题 (上方居中)
- 表格脚注 (下方)

**示例输出**:
```
Table 14.1.1
Demographics

                                    Placebo    Active (N=147)    Total
                                    (N=50)     10mg   20mg  40mg  (N=197)
────────────────────────────────────────────────────────────────────
Age (years)
  n                                   50        48    52    47     197
  Mean (SD)                      45.2 (12.3) ...   ...   ...   ...
  Median                              46        ...   ...   ...   ...
  Range                           22-68         ...   ...   ...   ...
...
────────────────────────────────────────────────────────────────────
Source: ADSL
Note: N = Number of subjects; SD = Standard Deviation
```

#### FR-5.4 Figure 导出细节

- 高分辨率图片 (300 DPI)
- 支持矢量格式 (PDF/SVG)
- 图表标题和脚注
- 图例位置

#### FR-5.5 Listing 导出细节

- 分页控制
- 每页重复表头
- 页眉页脚
- 列宽自适应或固定

#### FR-5.6 批量导出

- 选择多个 TFL 项
- 合并为单个文档或分开导出
- 进度显示
- 错误处理和日志

### 验收标准

**AC-5.1 Word 导出**
- [ ] Given 完成的表格，When 导出为 Word，Then 文件可正常打开
- [ ] Given 导出的 Word 文件，When 在 Word 中编辑，Then 表格结构保持完整
- [ ] Given 多级嵌套表头，When 导出为 Word，Then 列头合并正确
- [ ] Given 行缩进，When 导出为 Word，Then 缩进通过空格或边距正确显示

**AC-5.2 RTF 导出**
- [ ] Given 完成的表格，When 导出为 RTF，Then 文件可被 Word 和其他编辑器打开
- [ ] Given RTF 文件，When 检查格式，Then 表格边框、对齐正确

**AC-5.3 PDF 导出**
- [ ] Given 完成的图表，When 导出为 PDF，Then 图表清晰无锯齿
- [ ] Given 表格导出为 PDF，When 查看时，Then 分页正确
- [ ] Given 页眉页脚设置，When 导出时，Then 正确显示在每页

**AC-5.4 页面设置**
- [ ] Given 用户设置 A4 纵向，When 导出时，Then 页面尺寸正确
- [ ] Given 用户设置自定义页边距，When 导出时，Then 内容区域正确
- [ ] Given 用户设置页脚 "Page X of Y"，When 导出时，Then 每页显示正确页码

**AC-5.5 批量导出**
- [ ] Given 用户选择 5 个表格，When 批量导出为单个 Word，Then 所有表格按顺序在一个文档中
- [ ] Given 批量导出，When 某个表格失败，Then 显示错误但继续导出其他表格
- [ ] Given 批量导出，When 完成，Then 显示成功数量和失败列表

**AC-5.6 下载体验**
- [ ] Given 用户点击导出，When 生成完成，Then 自动触发浏览器下载
- [ ] Given 导出耗时较长，When 生成中，Then 显示进度指示器
- [ ] Given 导出失败，When 出错时，Then 显示明确错误信息

---

## 附录 A: 优先级排序

| 功能 | 优先级 | 预计工期 | 依赖 |
|------|--------|---------|------|
| SOC/PT 嵌套行 | P0 | 3 天 | 无 |
| 模板系统 | P0 | 3 天 | 无 |
| Figure 编辑器 - 基础图表 | P1 | 5 天 | 无 |
| Figure 编辑器 - KM 曲线 | P1 | 2 天 | 基础图表 |
| Figure 编辑器 - 森林图 | P2 | 2 天 | 基础图表 |
| Listing 编辑器 | P1 | 3 天 | 无 |
| 导出 - Word | P0 | 3 天 | 无 |
| 导出 - RTF | P1 | 2 天 | Word 导出 |
| 导出 - PDF | P1 | 2 天 | 无 |
| 批量导出 | P2 | 2 天 | 单项导出 |

---

## 附录 B: 技术依赖

### 已安装
- React 18
- TypeScript
- Ant Design 5
- Zustand
- Vite

### 待安装
- `docx` - Word 文档生成
- `rtf-wrapper` 或自定义 RTF 生成器
- `pdfmake` - PDF 生成
- `plotly.js` + `react-plotly.js` - 图表渲染
- `file-saver` - 文件下载

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-03-14 | 1.0 | 初始版本 | PM Agent |