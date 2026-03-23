# Study Spec 业务需求分析文档

## 概述

本文档从临床 SAS Programmer Manager 视角，分析 Study Spec 页面的业务需求，确保设计符合 CDISC SDTM/ADaM 标准和临床试验数据管理最佳实践。

---

## 1. SDTM vs ADaM 变量定义的业务差异

### 1.1 标准定位差异

| 维度 | SDTM | ADaM |
|------|------|------|
| **目的** | 数据提交标准，用于原始数据收集和整理 | 分析数据标准，用于统计分析和生成 TFL |
| **数据流向** | 临床试验数据的"终点" | 统计分析的"起点" |
| **监管要求** | FDA/PMDA 强制要求提交 | 支持审评的分析数据集 |
| **粒度** | 保持原始数据粒度 | 可聚合、可衍生分析变量 |

### 1.2 变量类型差异

#### SDTM 变量特点

1. **标准化命名规范**
   - 两字母域名前缀（如 AE、DM、VS）
   - 标准变量后缀（如 TESTCD、ORRES、STRESC）
   - 示例：`AETERM`, `AESTDTC`, `LBORRES`

2. **固定的变量角色**
   - Identifier: STUDYID, USUBJID, DOMAIN, xxSEQ
   - Topic: xxTESTCD, xxTRT, AETERM
   - Qualifiers: 结果限定符、同义词限定符、分组限定符
   - Timing: xxDTC, xxSTDY, xxENDY

3. **数据收集导向**
   - Origin=CRF 的变量占主导
   - 保留原始收集值（ORRES）和标准化值（STRESC）
   - 不做复杂计算逻辑

#### ADaM 变量特点

1. **分析导向设计**
   - PARAM/PARAMCD: 参数化设计，一行一个测量
   - AVAL/AVALC: 分析值（数值/字符）
   - CHG/PCHG: 相对基线变化
   - BASE: 基线值

2. **增加分析标记变量**
   ```
   ADSL 示例:
   - SAFFL: 安全集标记
   - ITTFL: ITT 人群标记
   - PPROTFL: 符合方案集标记

   ADLB/ADVS 示例:
   - ABLFL: 基线记录标记
   - ANL01FL: 分析记录标记
   ```

3. **从 SDTM 溯源**
   - `sourceDerivation` 字段记录来源
   - 示例：`AVAL = LBSTRESN` (从 SDTM 标准化结果推导)

### 1.3 业务建议

| 场景 | 建议 |
|------|------|
| 新建 Study Spec | 先定义 SDTM 变量，再基于 SDTM 定义 ADaM |
| 变量继承 | ADaM 变量应能追溯到对应的 SDTM 来源 |
| 差异管理 | 系统应支持 SDTM→ADaM 的变量映射关系可视化 |

---

## 2. Origin 类型的业务含义和使用场景

### 2.1 CRF (Case Report Form)

**定义**: 数据直接来源于病例报告表或源数据存储库(SDR)

**使用场景**:
- 受试者人口学信息：SUBJID, SITEID, AGE, SEX, RACE
- 不良事件术语：AETERM, AESEV, AESER
- 实验室检查结果：LBORRES, LBORRESU
- 生命体征测量：VSORRES, VSORRESU

**业务要求**:
- 必须配置 `mappedSourceField` 字段
- 需在 Mapping Studio 中完成源数据到目标变量的映射
- 映射状态需跟踪：未映射/已映射/映射冲突

**Mock 数据示例**:
```typescript
{
  name: 'AETERM',
  origin: 'CRF',
  mappedSourceField: 'AETERM',  // SDR 字段名
  core: 'Req',
  role: 'Topic'
}
```

### 2.2 Assigned (系统分配/协议规定)

**定义**: 由系统自动分配或根据试验方案固定的值

**使用场景**:

| 变量 | 赋值来源 | 示例值 |
|------|----------|--------|
| STUDYID | 协议规定 | "PROTOCOL-001" |
| DOMAIN | 域名固定 | "AE", "DM", "LB" |
| AGEU | 单位固定 | "YEARS" |
| AEDECOD | MedDRA 编码 | 词典编码结果 |
| AEBODSYS | MedDRA 编码 | 词典编码结果 |

**业务要求**:
- 应记录 `sourceDerivation` 说明赋值逻辑
- 固定值变更需走变更控制流程
- 编码类变量需关联 CodeList

**Mock 数据示例**:
```typescript
{
  name: 'DOMAIN',
  origin: 'Assigned',
  sourceDerivation: 'Hardcoded as "AE"',
  core: 'Req'
}
```

### 2.3 Derived (推导计算)

**定义**: 通过编程逻辑从其他变量计算得出

**使用场景**:

| 变量 | 推导逻辑 | 依赖变量 |
|------|----------|----------|
| USUBJID | STUDYID-SITEID-SUBJID 拼接 | STUDYID, SITEID, SUBJID |
| xxSEQ | 受试者内序号 | 按时间排序 |
| xxSTDY | 相对参考日期的天数 | xxSTDTC, RFSTDTC |
| AVAL | 标准化分析值 | LBSTRESN/VSSTRESN |
| CHG | 相对基线变化 | AVAL, BASE |
| SAFFL | 安全集标记 | EXDOSE > 0 |

**业务要求**:
- 必须填写 `sourceDerivation` 字段记录推导逻辑
- 可填写 `implementationNotes` 作为 AI Prompt 或编程说明
- 系统应支持推导逻辑的版本管理

**Mock 数据示例**:
```typescript
{
  name: 'AESTDY',
  origin: 'Derived',
  sourceDerivation: 'Derived from AESTDTC and RFSTDTC',
  implementationNotes: 'Calculate study day using RFSTDTC as reference',
  core: 'Exp'
}
```

### 2.4 Protocol (试验方案)

**定义**: 从试验方案文档中提取的元数据

**使用场景**:
- 访视窗口定义
- 入排标准相关变量
- 试验设计参数

**业务特点**:
- 在当前 mock 数据中较少使用
- 通常用于 Trial Design domains (TA, TE, TV, TI)
- 需与 Protocol Management 模块集成

### 2.5 Origin 分布统计建议

系统应提供 Origin 分布统计视图：

```
AE Domain 变量分布：
├── Assigned: 4 (STUDYID, DOMAIN, AEDECOD, AEBODSYS)
├── CRF: 5 (AETERM, AESTDTC, AEENDTC, AESEV, AESER)
├── Derived: 5 (USUBJID, AESEQ, AESTDY, AEENDY)
└── Protocol: 0
```

---

## 3. 变量属性的业务要求

### 3.1 Core 属性的临床意义

Core 属性定义变量的强制性要求，直接影响数据完整性验证。

#### Req (Required) - 必需变量

**定义**: 必须存在且必须有值的变量

**业务规则**:
- 提交数据时不可为空
- 缺失会导致 FDA 拒收或收到 Refuse to File (RTF)
- 数据验证的硬性检查项

**典型示例**:
```typescript
// SDTM Required Variables
STUDYID  // 研究标识
USUBJID  // 受试者唯一标识
DOMAIN   // 域名
xxSEQ    // 序列号

// AE Domain Specific
AETERM   // AE 术语
AEDECOD  // 词典编码术语
AEBODSYS // 系统器官分类
```

#### Exp (Expected) - 期望变量

**定义**: 应该存在，但特定情况下可以为空

**业务规则**:
- 如果数据存在，则必须有值
- 允许逻辑缺失（如无结束日期的持续 AE）
- 数据验证的软性检查项（需说明缺失原因）

**典型示例**:
```typescript
AEENDTC  // AE 结束日期 - 持续中的 AE 可为空
AEENDY   // AE 结束研究日
EXDOSE   // 给药剂量 - 未给药受试者为空
CHG      // 相对基线变化 - 无基线时为空
```

#### Perm (Permissible) - 许可变量

**定义**: 可选变量，根据试验需要决定是否收集

**业务规则**:
- 完全可选
- 缺失不影响数据提交
- 需评估收集成本与价值

**典型示例**:
```typescript
AELLT    // MedDRA 低位语 - 通常只编到 PT
BRTHDTC  // 出生日期 - 涉及隐私，可能不收集
LBORRESU // 原始单位 - 如果与标准单位一致可能不需要
```

#### Core 属性变更管理

| 变更类型 | 影响 | 审批要求 |
|----------|------|----------|
| Perm → Exp | 增加数据收集要求 | 需评估 CRF 修改 |
| Exp → Req | 强制化数据收集 | 需评估数据完整性风险 |
| Req → Exp | 放宽强制要求 | 需评估监管影响 |

### 3.2 Role 属性的分类

Role 定义变量在观察记录中的功能角色。

#### Identifier (标识符)

**功能**: 唯一标识一条记录

**关键特征**:
- 构成记录主键
- 必须唯一且非空
- 用于记录关联

**标准组合**:
```typescript
// AE Domain Keys
keys: ['STUDYID', 'USUBJID', 'AESEQ']

// LB Domain Keys
keys: ['STUDYID', 'USUBJID', 'LBTESTCD', 'VISITNUM']

// ADaM BDS Keys
keys: ['STUDYID', 'USUBJID', 'PARAMCD', 'AVISITN']
```

#### Topic (主题)

**功能**: 描述观察的内容/对象

**示例**:
- AETERM: AE 术语（事件主题）
- LBTESTCD: 实验室检查项目
- VSTESTCD: 生命体征检查项目
- EXTRT: 治疗药物

#### Timing (时间)

**功能**: 描述观察的时间维度

**分类**:
- 日期时间变量：xxDTC, xxSTDTC, xxENDTC
- 研究日变量：xxSTDY, xxENDY
- 访视变量：VISIT, VISITNUM

#### Qualifiers (限定符)

**分类及用途**:

| 限定符类型 | 功能 | 示例 |
|------------|------|------|
| Result Qualifier | 结果值描述 | LBORRES, VSORRES, AVAL |
| Record Qualifier | 记录级别属性 | AESEV, AESER, SAFFL |
| Synonym Qualifier | 术语同义词 | AEDECOD, AELLT |
| Grouping Qualifier | 分组归类 | AEBODSYS, AEBODSYS |
| Variable Qualifier | 变量补充说明 | LBORRESU, VSORRESU |

### 3.3 CodeList 关联的业务规则

#### CodeList 类型

1. **外部标准词典**
   - MedDRA: AE/DS 编码（PT, LLT, SOC）
   - WHO Drug: 合并用药编码
   - CDISC CT: CDISC 标准术语

2. **研究自定义术语**
   - 研究特定检查项目 (LBTESTCD, VSTESTCD)
   - 访视名称 (VISIT)
   - 分析参数 (PARAMCD)

3. **通用枚举值**
   - YESNO: 是/否
   - SEX: 性别 (M/F/U/O)
   - RACE: 种族
   - SEV: 严重程度 (MILD/MODERATE/SEVERE)

#### CodeList 关联规则

```typescript
// 规则 1: 编码变量必须关联 CodeList
{
  name: 'AEDECOD',
  codelist: 'MedDRA PT',
  origin: 'Assigned',  // 编码通常是 Assigned
  role: 'Synonym Qualifier'
}

// 规则 2: 分析标记变量使用通用枚举
{
  name: 'SAFFL',
  codelist: 'YESNO',
  origin: 'Derived',
  role: 'Record Qualifier'
}

// 规则 3: 结果变量不关联 CodeList（值来自 CRF）
{
  name: 'LBORRES',
  // 无 codelist - 自由文本结果
  origin: 'CRF',
  role: 'Result Qualifier'
}
```

#### CodeList 版本管理要求

| 词典类型 | 版本更新频率 | 变更影响 |
|----------|--------------|----------|
| MedDRA | 每年 2 次 | 可能影响已有编码 |
| WHO Drug | 每季度 | 新药添加 |
| CDISC CT | 每季度 | 新术语添加 |
| 自定义 | 按需 | 需走变更流程 |

---

## 4. 与 Global Library 的溯源关系设计

### 4.1 溯源架构

```
Global Library (全球标准库)
    │
    ├── SDTM Standards
    │   ├── Domain Definitions (DM, AE, LB, VS...)
    │   ├── Variable Templates
    │   └── CodeLists
    │
    ├── ADaM Standards
    │   ├── Dataset Templates (ADSL, ADAE, ADLB...)
    │   ├── Variable Definitions
    │   └── Analysis Patterns
    │
    └── Company Standards
        ├── Internal CodeLists
        ├── Naming Conventions
        └── Validation Rules

            ↓ 继承/引用

Study Spec (项目规范)
    │
    ├── SDTM Variables (带 globalLibraryRef)
    └── ADaM Variables (带 sourceDerivation)
```

### 4.2 globalLibraryRef 字段设计

**用途**: 记录变量来自全球标准库的引用 ID

**Mock 数据示例**:
```typescript
// 完全引用 Global Library
{
  name: 'STUDYID',
  globalLibraryRef: 'STUDYID',
  origin: 'Assigned',
  // 继承标准属性
}

// 自定义扩展（无 globalLibraryRef）
{
  name: 'COMPANYVAR',
  // 无 globalLibraryRef - 研究特定变量
  origin: 'Derived'
}
```

### 4.3 溯源关系场景

| 场景 | 描述 | 处理建议 |
|------|------|----------|
| 完全引用 | 变量属性完全继承标准 | 自动同步标准更新 |
| 扩展属性 | 基于标准扩展自定义属性 | 保留自定义，同步标准部分 |
| 研究特定 | 项目自定义变量 | 无标准引用，独立管理 |
| 标准废弃 | 引用的标准变量已废弃 | 警告提示，建议迁移 |

### 4.4 版本同步机制

```
1. Global Library 发布新版本
   ↓
2. 系统检测 Study Spec 中的引用变量
   ↓
3. 比对属性差异，生成变更报告
   ↓
4. 用户决定是否同步更新
   ↓
5. 记录变更历史（Audit Trail）
```

---

## 5. 常见的临床数据映射场景

### 5.1 直接映射 (1:1)

**场景**: CRF 字段直接对应 SDTM 变量

```
CRF Field          →    SDTM Variable
────────────────────────────────────
AETERM             →    AETERM
AE_START_DATE      →    AESTDTC
LB_RESULT_VALUE    →    LBORRES
```

**业务要求**:
- 字段名称可能不一致
- 需处理数据类型转换
- 需处理缺失值

### 5.2 字段拼接 (n:1)

**场景**: 多个 CRF 字段拼成一个 SDTM 变量

```
CRF Fields         →    SDTM Variable
────────────────────────────────────
STUDYID            ↘
SITEID             →    USUBJID = CATX("-", STUDYID, SITEID, SUBJID)
SUBJID             ↗
```

**业务规则**:
- 使用 `sourceDerivation` 记录拼接逻辑
- 需处理各组成部分的缺失情况

### 5.3 值域转换

**场景**: CRF 值需要转换为标准术语

```
CRF Value          →    SDTM Value
────────────────────────────────────
"Mild"             →    "MILD"
"Moderate"         →    "MODERATE"
"Severe"           →    "SEVERE"

"Male"             →    "M"
"Female"           →    "F"
```

**业务要求**:
- 需维护值映射表
- 关联 CodeList 进行验证
- 处理无法映射的值

### 5.4 日期标准化

**场景**: CRF 日期格式转换为 ISO 8601

```
CRF Date           →    SDTM Date (ISO 8601)
────────────────────────────────────
"15Mar2024"        →    "2024-03-15"
"Mar 2024"         →    "2024-03"  (部分日期)
"2024"             →    "2024"     (仅年份)
```

**业务规则**:
- 保留未知日期部分
- 处理日期范围 (UN/UK)
- 需记录原始日期值

### 5.5 单位标准化

**场景**: 原始单位转换为标准单位

```
LB Test           Original          Standard
────────────────────────────────────────────
Glucose           mg/dL             mg/dL (same)
Temperature       °F                °C (conversion)
Weight            lbs               kg (conversion)
```

**业务要求**:
- 维护单位转换表
- 记录原始值和标准化值
- 计算 LBSTRESN/VSSTRESN

### 5.6 编码映射

**场景**: 自述术语编码为标准词典术语

```
Reported Term     →    MedDRA Coding
────────────────────────────────────
"Headache"        →    AEDECOD = "Headache" (PT)
                  →    AEBODSYS = "Nervous system disorders" (SOC)
```

**业务要求**:
- 集成 MedDRA 编码工具
- 支持编码审评流程
- 记录编码版本

### 5.7 逻辑推导

**场景**: 基于业务规则推导变量值

```
Source Variables              →    Derived Variable
────────────────────────────────────────────────────
EXDOSE > 0 for any record     →    SAFFL = "Y"
First EXSTDTC                 →    RFSTDTC
AESTDTC - RFSTDTC + 1         →    AESTDY
```

**业务要求**:
- 详细的推导逻辑文档
- 可编程规范 (Programming Specifications)
- 验证测试用例

### 5.8 ADaM 特有映射场景

#### 基线定义

```typescript
// 基线记录标记
ABLFL = "Y"  where  VISITNUM = min(VISITNUM where VISITNUM > 0)

// 基线值
BASE = AVAL where ABLFL = "Y"
```

#### 变化计算

```typescript
// 绝对变化
CHG = AVAL - BASE

// 相对变化百分比
PCHG = (CHG / BASE) * 100
```

#### 参数化

```typescript
// 将 SDTM 的垂直结构转换为分析参数
PARAMCD = VSTESTCD
PARAM   = VSTEST
AVAL    = VSSTRESN
AVALC   = VSSTRESC
```

---

## 6. 总结与建议

### 6.1 系统设计关键点

1. **变量定义完整性**
   - 支持 SDTM/ADaM 双标准
   - 完整的 Origin/Core/Role/CodeList 属性
   - 可追溯的 Global Library 引用

2. **映射配置灵活性**
   - 支持多种映射场景（直接、拼接、转换、推导）
   - 可视化映射配置界面
   - 映射状态跟踪

3. **数据质量保障**
   - 基于 Core 属性的验证规则
   - CodeList 值域验证
   - 交叉引用完整性检查

### 6.2 后续扩展建议

| 模块 | 扩展建议 |
|------|----------|
| Mapping Studio | 集成源数据预览，可视化映射配置 |
| 编码管理 | 集成 MedDRA/WHO Drug 编码工具 |
| 验证引擎 | 基于 Study Spec 自动生成验证规则 |
| 文档生成 | 自动生成 Define.xml 和编程规范 |

---

*文档版本: 1.0*
*创建日期: 2026-03-21*
*作者: Clinical SAS Programmer Manager (AI Agent)*