/**
 * Mock Data for CDISC Global Library 全维度 Mock 数据：SDTM, ADaM, CDASH, QRS, CT
 *
 * 架构说明：
 *
 * - 采用 Schema + Data 分离架构，支持元数据驱动动态表格
 * - Schema 定义列结构（包含 i18n key）
 * - 数据与 Schema 解耦，便于后端 API 迁移
 */

// ============ 元数据驱动的 Schema 类型定义 ============

/**
 * 列 Schema 定义
 *
 * - titleKey: 国际化 key，用于动态翻译列标题
 * - dataIndex: 数据字段名
 * - width: 列宽
 * - fixed: 固定位置
 * - renderType: 渲染类型，用于动态选择渲染器
 */
export interface ColumnSchema {
  align?: 'center' | 'left' | 'right';
  // i18n key，如 'page.mdr.globalLibrary.cols.domain'
  dataIndex: string;
  ellipsis?: boolean;
  fixed?: 'left' | 'right';
  key: string;
  renderType?: 'biomedicalConcept' | 'code' | 'tag' | 'tagList' | 'tagListPopover' | 'tagTraceability' | 'text';
  // 渲染配置
  tagColorField?: string;
  // Tag 颜色取值字段
  tagColorMap?: Record<string, string>;
  titleKey: string;
  width?: number; // 值->颜色映射
}

/** 标准 Schema 响应结构 后端 API 应返回此结构 */
export interface StandardSchemaResponse<T> {
  data: T[];
  meta?: {
    lastSync?: string;
    total?: number;
    version?: string;
  };
  schema: ColumnSchema[];
}

// ============ 级联导航类型定义 ============

/** 第一级标准类型（主分类） */
export type PrimaryStandardType = 'ADaM' | 'CDASH' | 'CT' | 'QRS' | 'SDTM';

/** 第二级子类型（具体标准） */
export interface SubTypeOption {
  i18nKey: string;
  key: string;
  label: string;
}

/** 标准配置：第一级 -> 第二级选项 */
export const standardSubTypes: Record<PrimaryStandardType, SubTypeOption[]> = {
  ADaM: [
    { i18nKey: 'page.mdr.globalLibrary.subTypes.adamIg', key: 'ADAM_IG', label: 'ADaM IG' },
    { i18nKey: 'page.mdr.globalLibrary.subTypes.adamModel', key: 'ADAM_MODEL', label: 'ADaM Model' }
  ],
  CDASH: [{ i18nKey: 'page.mdr.globalLibrary.subTypes.cdashIg', key: 'CDASH_IG', label: 'CDASH IG' }],
  CT: [
    { i18nKey: 'page.mdr.globalLibrary.subTypes.sdtmCt', key: 'SDTM_CT', label: 'SDTM CT' },
    { i18nKey: 'page.mdr.globalLibrary.subTypes.adamCt', key: 'ADAM_CT', label: 'ADaM CT' },
    { i18nKey: 'page.mdr.globalLibrary.subTypes.cdashCt', key: 'CDASH_CT', label: 'CDASH CT' }
  ],
  QRS: [{ i18nKey: 'page.mdr.globalLibrary.subTypes.qrsIg', key: 'QRS_IG', label: 'QRS IG' }],
  SDTM: [
    { i18nKey: 'page.mdr.globalLibrary.subTypes.sdtmIg', key: 'SDTM_IG', label: 'SDTM IG' },
    { i18nKey: 'page.mdr.globalLibrary.subTypes.sdtmModel', key: 'SDTM_MODEL', label: 'SDTM Model' }
  ]
};

/** 版本配置：子类型 -> 版本列表 */
export const subTypeVersions: Record<string, string[]> = {
  ADAM_CT: ['2024-12-27', '2024-09-27', '2024-06-28', '2024-03-29'],
  // ADaM
  ADAM_IG: ['1.4', '1.3', '1.2', '1.1'],
  ADAM_MODEL: ['1.5', '1.4', '1.3'],
  CDASH_CT: ['2024-12-27', '2024-09-27', '2024-06-28', '2024-03-29'],
  // CDASH
  CDASH_IG: ['2.2', '2.1', '2.0', '1.1'],
  // QRS
  QRS_IG: ['1.1', '1.0'],
  // CT
  SDTM_CT: ['2024-12-27', '2024-09-27', '2024-06-28', '2024-03-29'],
  // SDTM
  SDTM_IG: ['3.4', '3.3', '3.2', '3.1'],
  SDTM_MODEL: ['2.0', '1.9', '1.8']
};

// 向后兼容的类型别名
export type StandardType = PrimaryStandardType;

export interface ModelBaseVariable {
  core: 'Exp' | 'Perm' | 'Req';
  description: string;
  label: string;
  name: string;
  origin: string;
  role: string;
  type: string;
}

export interface BiomedicalConcept {
  ccode?: string;
  definition: string;
  description: string;
  id: string;
  name: string;
  source: string;
  synonyms: string[];
}

// ============ SDTM IG 数据（实现指南级别） ============

/** SDTM IG 变量 Schema IG 级别有具体的 Domain 和标准变量定义 */
export const sdtmIgSchema: ColumnSchema[] = [
  {
    dataIndex: 'name',
    fixed: 'left',
    key: 'name',
    renderType: 'tagTraceability',
    titleKey: 'page.mdr.globalLibrary.cols.variableName',
    width: 120
  },
  { dataIndex: 'label', ellipsis: true, key: 'label', titleKey: 'page.mdr.globalLibrary.cols.label', width: 200 },
  {
    dataIndex: 'type',
    key: 'type',
    renderType: 'tag',
    tagColorMap: { ISO8601: 'purple', Num: 'orange' },
    titleKey: 'page.mdr.globalLibrary.cols.type',
    width: 80
  },
  { align: 'center', dataIndex: 'length', key: 'length', titleKey: 'page.mdr.globalLibrary.cols.length', width: 60 },
  {
    align: 'center',
    dataIndex: 'core',
    key: 'core',
    renderType: 'tag',
    tagColorMap: { Exp: 'orange', Perm: 'default', Req: 'red' },
    titleKey: 'page.mdr.globalLibrary.cols.core',
    width: 70
  },
  { dataIndex: 'role', ellipsis: true, key: 'role', titleKey: 'page.mdr.globalLibrary.cols.role', width: 130 },
  {
    dataIndex: 'origin',
    key: 'origin',
    renderType: 'tag',
    tagColorMap: { Assigned: 'blue', CRF: 'green', Derived: 'cyan', Protocol: 'geekblue' },
    titleKey: 'page.mdr.globalLibrary.cols.origin',
    width: 80
  },
  {
    dataIndex: 'biomedicalConcept',
    key: 'biomedicalConcept',
    renderType: 'biomedicalConcept',
    titleKey: 'page.mdr.globalLibrary.cols.biomedicalConcept',
    width: 140
  }
];

export interface SDTMDomain {
  class: string;
  key: string;
  label: string;
  name: string;
  purpose: string;
  structure: string;
}

export interface SDTMVariable {
  baseVariable?: string;
  biomedicalConceptId?: string;
  biomedicalConceptName?: string;
  core: 'Exp' | 'Perm' | 'Req';
  hasBiomedicalConcept?: boolean;
  key: string;
  label: string;
  length: number;
  name: string;
  origin: string;
  role: string;
  type: string;
}

export const sdtmDomains: SDTMDomain[] = [
  {
    class: 'Events',
    key: 'AE',
    label: 'Adverse Events',
    name: 'AE',
    purpose: 'Capture adverse events',
    structure: 'One record per adverse event'
  },
  {
    class: 'Special Purpose',
    key: 'DM',
    label: 'Demographics',
    name: 'DM',
    purpose: 'Capture subject demographics',
    structure: 'One record per subject'
  },
  {
    class: 'Interventions',
    key: 'EX',
    label: 'Exposure',
    name: 'EX',
    purpose: 'Capture study treatment exposure',
    structure: 'One record per dosing interval'
  },
  {
    class: 'Findings',
    key: 'LB',
    label: 'Laboratory Tests',
    name: 'LB',
    purpose: 'Capture lab results',
    structure: 'One record per lab test result'
  },
  {
    class: 'Findings',
    key: 'VS',
    label: 'Vital Signs',
    name: 'VS',
    purpose: 'Capture vital signs',
    structure: 'One record per vital sign measurement'
  }
];

export const sdtmVariables: Record<string, SDTMVariable[]> = {
  AE: [
    {
      core: 'Req',
      key: 'ae-studyid',
      label: 'Study Identifier',
      length: 12,
      name: 'STUDYID',
      origin: 'Protocol',
      role: 'Identifier',
      type: 'Char'
    },
    {
      core: 'Req',
      key: 'ae-domain',
      label: 'Domain Abbreviation',
      length: 2,
      name: 'DOMAIN',
      origin: 'Assigned',
      role: 'Identifier',
      type: 'Char'
    },
    {
      core: 'Req',
      key: 'ae-usubjid',
      label: 'Unique Subject Identifier',
      length: 40,
      name: 'USUBJID',
      origin: 'Derived',
      role: 'Identifier',
      type: 'Char'
    },
    {
      baseVariable: '--TERM',
      biomedicalConceptId: 'bc-ae-term',
      biomedicalConceptName: 'Adverse Event Term',
      core: 'Req',
      hasBiomedicalConcept: true,
      key: 'ae-aeterm',
      label: 'Reported Term for the Adverse Event',
      length: 200,
      name: 'AETERM',
      origin: 'CRF',
      role: 'Topic',
      type: 'Char'
    },
    {
      biomedicalConceptId: 'bc-meddra',
      biomedicalConceptName: 'MedDRA PT',
      core: 'Req',
      hasBiomedicalConcept: true,
      key: 'ae-aedecod',
      label: 'Dictionary-Derived Term',
      length: 200,
      name: 'AEDECOD',
      origin: 'Assigned',
      role: 'Synonym Qualifier',
      type: 'Char'
    },
    {
      baseVariable: '--DTC',
      core: 'Exp',
      key: 'ae-aestdtc',
      label: 'Start Date/Time of Adverse Event',
      length: 26,
      name: 'AESTDTC',
      origin: 'CRF',
      role: 'Timing',
      type: 'ISO8601'
    },
    {
      baseVariable: '--DTC',
      core: 'Perm',
      key: 'ae-aeendtc',
      label: 'End Date/Time of Adverse Event',
      length: 26,
      name: 'AEENDTC',
      origin: 'CRF',
      role: 'Timing',
      type: 'ISO8601'
    },
    {
      core: 'Req',
      key: 'ae-aesev',
      label: 'Severity/Intensity',
      length: 20,
      name: 'AESEV',
      origin: 'CRF',
      role: 'Record Qualifier',
      type: 'Char'
    },
    {
      core: 'Req',
      key: 'ae-aeser',
      label: 'Serious Event',
      length: 1,
      name: 'AESER',
      origin: 'CRF',
      role: 'Record Qualifier',
      type: 'Char'
    }
  ],
  DM: [
    {
      core: 'Req',
      key: 'dm-studyid',
      label: 'Study Identifier',
      length: 12,
      name: 'STUDYID',
      origin: 'Protocol',
      role: 'Identifier',
      type: 'Char'
    },
    {
      core: 'Req',
      key: 'dm-domain',
      label: 'Domain Abbreviation',
      length: 2,
      name: 'DOMAIN',
      origin: 'Assigned',
      role: 'Identifier',
      type: 'Char'
    },
    {
      core: 'Req',
      key: 'dm-usubjid',
      label: 'Unique Subject Identifier',
      length: 40,
      name: 'USUBJID',
      origin: 'Derived',
      role: 'Identifier',
      type: 'Char'
    },
    {
      core: 'Req',
      key: 'dm-subjid',
      label: 'Subject Identifier for the Study',
      length: 20,
      name: 'SUBJID',
      origin: 'CRF',
      role: 'Identifier',
      type: 'Char'
    },
    {
      biomedicalConceptId: 'bc-age',
      biomedicalConceptName: 'Age',
      core: 'Req',
      hasBiomedicalConcept: true,
      key: 'dm-age',
      label: 'Age',
      length: 8,
      name: 'AGE',
      origin: 'CRF',
      role: 'Topic',
      type: 'Num'
    },
    {
      biomedicalConceptId: 'bc-sex',
      biomedicalConceptName: 'Sex',
      core: 'Req',
      hasBiomedicalConcept: true,
      key: 'dm-sex',
      label: 'Sex',
      length: 1,
      name: 'SEX',
      origin: 'CRF',
      role: 'Topic',
      type: 'Char'
    },
    {
      biomedicalConceptId: 'bc-race',
      biomedicalConceptName: 'Race',
      core: 'Exp',
      hasBiomedicalConcept: true,
      key: 'dm-race',
      label: 'Race',
      length: 100,
      name: 'RACE',
      origin: 'CRF',
      role: 'Topic',
      type: 'Char'
    },
    {
      core: 'Req',
      key: 'dm-arm',
      label: 'Description of Planned Arm',
      length: 200,
      name: 'ARM',
      origin: 'Derived',
      role: 'Record Qualifier',
      type: 'Char'
    }
  ],
  EX: [
    {
      core: 'Req',
      key: 'ex-studyid',
      label: 'Study Identifier',
      length: 12,
      name: 'STUDYID',
      origin: 'Protocol',
      role: 'Identifier',
      type: 'Char'
    },
    {
      core: 'Req',
      key: 'ex-usubjid',
      label: 'Unique Subject Identifier',
      length: 40,
      name: 'USUBJID',
      origin: 'Derived',
      role: 'Identifier',
      type: 'Char'
    },
    {
      core: 'Req',
      key: 'ex-extrt',
      label: 'Name of Actual Treatment',
      length: 100,
      name: 'EXTRT',
      origin: 'CRF',
      role: 'Topic',
      type: 'Char'
    },
    {
      core: 'Exp',
      key: 'ex-exdose',
      label: 'Dose per Administration',
      length: 8,
      name: 'EXDOSE',
      origin: 'CRF',
      role: 'Record Qualifier',
      type: 'Num'
    },
    {
      baseVariable: '--DTC',
      core: 'Exp',
      key: 'ex-exstdtc',
      label: 'Start Date/Time of Treatment',
      length: 26,
      name: 'EXSTDTC',
      origin: 'CRF',
      role: 'Timing',
      type: 'ISO8601'
    }
  ]
};

// ============ SDTM Model 数据（泛化模型级别） ============

/** SDTM Model 变量 Schema Model 级别是泛化的，没有具体 Domain，使用 observationClass 和泛化变量名 */
export const sdtmModelSchema: ColumnSchema[] = [
  {
    dataIndex: 'observationClass',
    fixed: 'left',
    key: 'observationClass',
    renderType: 'tag',
    tagColorMap: { Events: 'magenta', Findings: 'cyan', Interventions: 'green', 'Special Purpose': 'purple' },
    titleKey: 'page.mdr.globalLibrary.cols.observationClass',
    width: 120
  },
  {
    dataIndex: 'variable',
    key: 'variable',
    renderType: 'code',
    titleKey: 'page.mdr.globalLibrary.cols.variable',
    width: 100
  },
  { dataIndex: 'label', ellipsis: true, key: 'label', titleKey: 'page.mdr.globalLibrary.cols.label', width: 250 },
  {
    dataIndex: 'type',
    key: 'type',
    renderType: 'tag',
    tagColorMap: { Char: 'default', ISO8601: 'purple', Num: 'orange' },
    titleKey: 'page.mdr.globalLibrary.cols.type',
    width: 80
  },
  { align: 'center', dataIndex: 'length', key: 'length', titleKey: 'page.mdr.globalLibrary.cols.length', width: 60 },
  {
    align: 'center',
    dataIndex: 'core',
    key: 'core',
    renderType: 'tag',
    tagColorMap: { Exp: 'orange', Perm: 'default', Req: 'red' },
    titleKey: 'page.mdr.globalLibrary.cols.core',
    width: 70
  },
  { dataIndex: 'role', ellipsis: true, key: 'role', titleKey: 'page.mdr.globalLibrary.cols.role', width: 130 },
  {
    dataIndex: 'origin',
    key: 'origin',
    renderType: 'tag',
    tagColorMap: { Assigned: 'blue', CRF: 'green', Derived: 'cyan', Protocol: 'geekblue' },
    titleKey: 'page.mdr.globalLibrary.cols.origin',
    width: 80
  },
  {
    dataIndex: 'description',
    ellipsis: true,
    key: 'description',
    titleKey: 'page.mdr.globalLibrary.cols.description',
    width: 200
  }
];

/** SDTM Model 泛化变量 使用 -- 前缀表示泛化变量（如 --TERM, --DTC） */
export interface SDTMModelVariable {
  core: 'Exp' | 'Perm' | 'Req';
  description: string;
  key: string; // 泛化变量名：--TERM, --DTC 等
  label: string;
  length: number;
  observationClass: string;
  origin: string;
  role: string;
  type: string;
  // 观察类：Events, Findings, Interventions, Special Purpose
  variable: string;
}

export const sdtmModelVariables: SDTMModelVariable[] = [
  // Events 类泛化变量
  {
    core: 'Req',
    description: 'Verbatim text as reported for the event.',
    key: 'evt-term',
    label: 'Reported Term',
    length: 200,
    observationClass: 'Events',
    origin: 'CRF',
    role: 'Topic',
    type: 'Char',
    variable: '--TERM'
  },
  {
    core: 'Req',
    description: 'Preferred term from dictionary coding.',
    key: 'evt-decod',
    label: 'Dictionary-Derived Term',
    length: 200,
    observationClass: 'Events',
    origin: 'Assigned',
    role: 'Synonym Qualifier',
    type: 'Char',
    variable: '--DECOD'
  },
  {
    core: 'Exp',
    description: 'Date and time when event occurred or was collected.',
    key: 'evt-dtc',
    label: 'Date/Time of Collection',
    length: 26,
    observationClass: 'Events',
    origin: 'CRF',
    role: 'Timing',
    type: 'ISO8601',
    variable: '--DTC'
  },
  {
    core: 'Perm',
    description: 'Indicates whether the event record is complete.',
    key: 'evt-stat',
    label: 'Completion Status',
    length: 8,
    observationClass: 'Events',
    origin: 'Derived',
    role: 'Record Qualifier',
    type: 'Char',
    variable: '--STAT'
  },

  // Findings 类泛化变量
  {
    core: 'Req',
    description: 'Short name of the test or examination.',
    key: 'fnd-testcd',
    label: 'Short Name of Test',
    length: 8,
    observationClass: 'Findings',
    origin: 'Assigned',
    role: 'Topic',
    type: 'Char',
    variable: '--TESTCD'
  },
  {
    core: 'Req',
    description: 'Full name of the test or examination.',
    key: 'fnd-test',
    label: 'Name of Test',
    length: 40,
    observationClass: 'Findings',
    origin: 'Assigned',
    role: 'Topic',
    type: 'Char',
    variable: '--TEST'
  },
  {
    core: 'Exp',
    description: 'Result value in the original units.',
    key: 'fnd-orres',
    label: 'Result in Original Units',
    length: 40,
    observationClass: 'Findings',
    origin: 'CRF',
    role: 'Result Qualifier',
    type: 'Char',
    variable: '--ORRES'
  },
  {
    core: 'Exp',
    description: 'Units of the original result.',
    key: 'fnd-orresu',
    label: 'Original Units',
    length: 20,
    observationClass: 'Findings',
    origin: 'CRF',
    role: 'Result Qualifier',
    type: 'Char',
    variable: '--ORRESU'
  },
  {
    core: 'Exp',
    description: 'Standardized character result.',
    key: 'fnd-stresc',
    label: 'Standardized Result',
    length: 40,
    observationClass: 'Findings',
    origin: 'Derived',
    role: 'Result Qualifier',
    type: 'Char',
    variable: '--STRESC'
  },
  {
    core: 'Exp',
    description: 'Date and time of specimen collection or observation.',
    key: 'fnd-dtc',
    label: 'Date/Time of Collection',
    length: 26,
    observationClass: 'Findings',
    origin: 'CRF',
    role: 'Timing',
    type: 'ISO8601',
    variable: '--DTC'
  },

  // Interventions 类泛化变量
  {
    core: 'Req',
    description: 'Name of the treatment or intervention.',
    key: 'int-trt',
    label: 'Reported Name of Treatment',
    length: 100,
    observationClass: 'Interventions',
    origin: 'CRF',
    role: 'Topic',
    type: 'Char',
    variable: '--TRT'
  },
  {
    core: 'Exp',
    description: 'Amount of treatment administered per dose.',
    key: 'int-dose',
    label: 'Dose per Administration',
    length: 8,
    observationClass: 'Interventions',
    origin: 'CRF',
    role: 'Record Qualifier',
    type: 'Num',
    variable: '--DOSE'
  },
  {
    core: 'Exp',
    description: 'Units of the dose amount.',
    key: 'int-dosu',
    label: 'Dose Units',
    length: 20,
    observationClass: 'Interventions',
    origin: 'CRF',
    role: 'Record Qualifier',
    type: 'Char',
    variable: '--DOSU'
  },
  {
    core: 'Exp',
    description: 'Date and time of treatment administration.',
    key: 'int-dtc',
    label: 'Date/Time of Treatment',
    length: 26,
    observationClass: 'Interventions',
    origin: 'CRF',
    role: 'Timing',
    type: 'ISO8601',
    variable: '--DTC'
  },

  // Special Purpose 类泛化变量
  {
    core: 'Req',
    description: 'Unique identifier for the study.',
    key: 'sp-studyid',
    label: 'Study Identifier',
    length: 12,
    observationClass: 'Special Purpose',
    origin: 'Protocol',
    role: 'Identifier',
    type: 'Char',
    variable: 'STUDYID'
  },
  {
    core: 'Req',
    description: 'Two-character domain code.',
    key: 'sp-domain',
    label: 'Domain Abbreviation',
    length: 2,
    observationClass: 'Special Purpose',
    origin: 'Assigned',
    role: 'Identifier',
    type: 'Char',
    variable: 'DOMAIN'
  },
  {
    core: 'Req',
    description: 'Unique identifier for subject across all studies.',
    key: 'sp-usubjid',
    label: 'Unique Subject Identifier',
    length: 40,
    observationClass: 'Special Purpose',
    origin: 'Derived',
    role: 'Identifier',
    type: 'Char',
    variable: 'USUBJID'
  }
];

// ============ ADaM IG 数据 ============

/** ADaM IG 变量 Schema */
export const adamIgSchema: ColumnSchema[] = [
  {
    dataIndex: 'name',
    fixed: 'left',
    key: 'name',
    renderType: 'code',
    titleKey: 'page.mdr.globalLibrary.cols.variableName',
    width: 100
  },
  { dataIndex: 'label', ellipsis: true, key: 'label', titleKey: 'page.mdr.globalLibrary.cols.label', width: 200 },
  {
    dataIndex: 'type',
    key: 'type',
    renderType: 'tag',
    tagColorMap: { Char: 'default', Num: 'orange' },
    titleKey: 'page.mdr.globalLibrary.cols.type',
    width: 80
  },
  { align: 'center', dataIndex: 'length', key: 'length', titleKey: 'page.mdr.globalLibrary.cols.length', width: 60 },
  {
    dataIndex: 'origin',
    key: 'origin',
    renderType: 'tag',
    tagColorMap: { ADSL: 'cyan', Derived: 'purple', 'SDTM.AE': 'blue', 'SDTM.DM': 'blue' },
    titleKey: 'page.mdr.globalLibrary.cols.origin',
    width: 100
  },
  {
    dataIndex: 'derivation',
    ellipsis: true,
    key: 'derivation',
    titleKey: 'page.mdr.globalLibrary.cols.derivation',
    width: 200
  },
  {
    dataIndex: 'biomedicalConcept',
    key: 'biomedicalConcept',
    renderType: 'biomedicalConcept',
    titleKey: 'page.mdr.globalLibrary.cols.biomedicalConcept',
    width: 120
  }
];

export interface ADaMDataset {
  class: string;
  key: string;
  label: string;
  name: string;
  purpose: string;
  structure: string;
}

export interface ADaMVariable {
  biomedicalConceptId?: string;
  biomedicalConceptName?: string;
  derivation?: string;
  hasBiomedicalConcept?: boolean;
  key: string;
  label: string;
  length: number;
  name: string;
  origin: string;
  type: string;
}

export const adamDatasets: ADaMDataset[] = [
  {
    class: 'ADaM',
    key: 'ADSL',
    label: 'Subject Level Analysis Dataset',
    name: 'ADSL',
    purpose: 'Subject-level analysis',
    structure: 'One record per subject'
  },
  {
    class: 'ADaM',
    key: 'ADAE',
    label: 'Adverse Events Analysis Dataset',
    name: 'ADAE',
    purpose: 'AE analysis',
    structure: 'One record per adverse event per subject'
  },
  {
    class: 'ADaM',
    key: 'ADLB',
    label: 'Laboratory Analysis Dataset',
    name: 'ADLB',
    purpose: 'Lab analysis',
    structure: 'One record per lab test per visit'
  }
];

export const adamVariables: Record<string, ADaMVariable[]> = {
  ADAE: [
    { key: 'adae-studyid', label: 'Study Identifier', length: 12, name: 'STUDYID', origin: 'SDTM.AE', type: 'Char' },
    {
      key: 'adae-usubjid',
      label: 'Unique Subject Identifier',
      length: 40,
      name: 'USUBJID',
      origin: 'SDTM.AE',
      type: 'Char'
    },
    { key: 'adae-aeterm', label: 'Reported Term', length: 200, name: 'AETERM', origin: 'SDTM.AE', type: 'Char' },
    {
      biomedicalConceptId: 'bc-meddra',
      biomedicalConceptName: 'MedDRA PT',
      hasBiomedicalConcept: true,
      key: 'adae-aedecod',
      label: 'Dictionary-Derived Term',
      length: 200,
      name: 'AEDECOD',
      origin: 'SDTM.AE',
      type: 'Char'
    },
    {
      derivation: 'Linked from ADSL.TRT01A',
      key: 'adae-trta',
      label: 'Actual Treatment',
      length: 40,
      name: 'TRTA',
      origin: 'ADSL',
      type: 'Char'
    },
    { key: 'adae-aesev', label: 'Severity', length: 20, name: 'AESEV', origin: 'SDTM.AE', type: 'Char' }
  ],
  ADSL: [
    { key: 'adsl-studyid', label: 'Study Identifier', length: 12, name: 'STUDYID', origin: 'SDTM.DM', type: 'Char' },
    {
      key: 'adsl-usubjid',
      label: 'Unique Subject Identifier',
      length: 40,
      name: 'USUBJID',
      origin: 'SDTM.DM',
      type: 'Char'
    },
    { key: 'adsl-subjid', label: 'Subject Identifier', length: 20, name: 'SUBJID', origin: 'SDTM.DM', type: 'Char' },
    {
      biomedicalConceptId: 'bc-age',
      biomedicalConceptName: 'Age',
      hasBiomedicalConcept: true,
      key: 'adsl-age',
      label: 'Age',
      length: 8,
      name: 'AGE',
      origin: 'SDTM.DM',
      type: 'Num'
    },
    {
      biomedicalConceptId: 'bc-sex',
      biomedicalConceptName: 'Sex',
      hasBiomedicalConcept: true,
      key: 'adsl-sex',
      label: 'Sex',
      length: 1,
      name: 'SEX',
      origin: 'SDTM.DM',
      type: 'Char'
    },
    {
      derivation: 'Mapped from DM.ARM',
      key: 'adsl-trt01p',
      label: 'Planned Treatment for Period 01',
      length: 40,
      name: 'TRT01P',
      origin: 'Derived',
      type: 'Char'
    },
    {
      derivation: 'Mapped from EX.EXTRT',
      key: 'adsl-trt01a',
      label: 'Actual Treatment for Period 01',
      length: 40,
      name: 'TRT01A',
      origin: 'Derived',
      type: 'Char'
    },
    {
      derivation: 'Y if TRT01A ne ""',
      key: 'adsl-saffl',
      label: 'Safety Population Flag',
      length: 1,
      name: 'SAFFL',
      origin: 'Derived',
      type: 'Char'
    },
    {
      derivation: 'Y if TRT01P ne ""',
      key: 'adsl-ittfl',
      label: 'Intent-to-Treat Population Flag',
      length: 1,
      name: 'ITTFL',
      origin: 'Derived',
      type: 'Char'
    }
  ]
};

// ============ CDASH IG 数据 ============

/** CDASH IG 字段 Schema */
export const cdashIgSchema: ColumnSchema[] = [
  {
    dataIndex: 'name',
    fixed: 'left',
    key: 'name',
    renderType: 'code',
    titleKey: 'page.mdr.globalLibrary.cols.fieldName',
    width: 100
  },
  { dataIndex: 'label', ellipsis: true, key: 'label', titleKey: 'page.mdr.globalLibrary.cols.label', width: 180 },
  {
    dataIndex: 'dataType',
    key: 'dataType',
    renderType: 'tag',
    tagColorMap: { Char: 'default', Date: 'purple', Num: 'orange' },
    titleKey: 'page.mdr.globalLibrary.cols.dataType',
    width: 80
  },
  { dataIndex: 'prompt', ellipsis: true, key: 'prompt', titleKey: 'page.mdr.globalLibrary.cols.crfPrompt', width: 150 },
  {
    align: 'center',
    dataIndex: 'required',
    key: 'required',
    renderType: 'tag',
    tagColorMap: { Conditional: 'orange', No: 'default', Yes: 'red' },
    titleKey: 'page.mdr.globalLibrary.cols.required',
    width: 70
  },
  {
    dataIndex: 'sdtmDomain',
    key: 'sdtmDomain',
    renderType: 'tag',
    tagColorMap: {},
    titleKey: 'page.mdr.globalLibrary.cols.sdtmDomain',
    width: 80
  },
  { dataIndex: 'sdtmVariable', key: 'sdtmVariable', titleKey: 'page.mdr.globalLibrary.cols.sdtmVariable', width: 100 }
];

export interface CDASHForm {
  category: string;
  key: string;
  label: string;
  name: string;
  structure: string;
}

export interface CDASHField {
  dataType: string;
  key: string;
  label: string;
  name: string;
  prompt: string;
  required: 'Conditional' | 'No' | 'Yes';
  sdtmDomain: string;
  sdtmVariable: string;
}

export const cdashForms: CDASHForm[] = [
  {
    category: 'General Assessments',
    key: 'VS',
    label: 'Vital Signs',
    name: 'VS',
    structure: 'One record per vital sign measurement'
  },
  { category: 'Safety', key: 'AE', label: 'Adverse Events', name: 'AE', structure: 'One record per adverse event' },
  {
    category: 'Interventions',
    key: 'CM',
    label: 'Concomitant Medications',
    name: 'CM',
    structure: 'One record per medication'
  }
];

export const cdashFields: Record<string, CDASHField[]> = {
  AE: [
    {
      dataType: 'Char',
      key: 'ae-aeterm',
      label: 'Adverse Event Term',
      name: 'AETERM',
      prompt: 'Reported Term',
      required: 'Yes',
      sdtmDomain: 'AE',
      sdtmVariable: 'AETERM'
    },
    {
      dataType: 'Date',
      key: 'ae-aestdat',
      label: 'Start Date',
      name: 'AESTDAT',
      prompt: 'Start Date',
      required: 'Yes',
      sdtmDomain: 'AE',
      sdtmVariable: 'AESTDTC'
    },
    {
      dataType: 'Date',
      key: 'ae-aeendat',
      label: 'End Date',
      name: 'AEENDAT',
      prompt: 'End Date',
      required: 'No',
      sdtmDomain: 'AE',
      sdtmVariable: 'AEENDTC'
    },
    {
      dataType: 'Char',
      key: 'ae-aesev',
      label: 'Severity',
      name: 'AESEV',
      prompt: 'Severity/Intensity',
      required: 'Yes',
      sdtmDomain: 'AE',
      sdtmVariable: 'AESEV'
    }
  ],
  CM: [
    {
      dataType: 'Char',
      key: 'cm-cmtrt',
      label: 'Medication Name',
      name: 'CMTRT',
      prompt: 'Medication Name',
      required: 'Yes',
      sdtmDomain: 'CM',
      sdtmVariable: 'CMTRT'
    },
    {
      dataType: 'Char',
      key: 'cm-cmindc',
      label: 'Indication',
      name: 'CMINDC',
      prompt: 'Indication',
      required: 'No',
      sdtmDomain: 'CM',
      sdtmVariable: 'CMINDC'
    },
    {
      dataType: 'Date',
      key: 'cm-cmstdat',
      label: 'Start Date',
      name: 'CMSTDAT',
      prompt: 'Start Date',
      required: 'Yes',
      sdtmDomain: 'CM',
      sdtmVariable: 'CMSTDTC'
    }
  ],
  VS: [
    {
      dataType: 'Char',
      key: 'vs-visit',
      label: 'Visit Name',
      name: 'VISIT',
      prompt: 'Visit Name',
      required: 'Yes',
      sdtmDomain: 'SV',
      sdtmVariable: 'VISIT'
    },
    {
      dataType: 'Char',
      key: 'vs-vstest',
      label: 'Vital Signs Test',
      name: 'VSTEST',
      prompt: 'Vital Signs Test Name',
      required: 'Yes',
      sdtmDomain: 'VS',
      sdtmVariable: 'VSTEST'
    },
    {
      dataType: 'Char',
      key: 'vs-vsorres',
      label: 'Result in Original Units',
      name: 'VSORRES',
      prompt: 'Result in Original Units',
      required: 'Yes',
      sdtmDomain: 'VS',
      sdtmVariable: 'VSORRES'
    },
    {
      dataType: 'Char',
      key: 'vs-vsorresu',
      label: 'Original Units',
      name: 'VSORRESU',
      prompt: 'Original Units',
      required: 'Yes',
      sdtmDomain: 'VS',
      sdtmVariable: 'VSORRESU'
    },
    {
      dataType: 'Char',
      key: 'vs-vsstresc',
      label: 'Character Result in Standard Format',
      name: 'VSSTRESC',
      prompt: 'Standard Result',
      required: 'No',
      sdtmDomain: 'VS',
      sdtmVariable: 'VSSTRESC'
    },
    {
      dataType: 'Char',
      key: 'vs-vsstresu',
      label: 'Standard Units',
      name: 'VSSTRESU',
      prompt: 'Standard Units',
      required: 'No',
      sdtmDomain: 'VS',
      sdtmVariable: 'VSSTRESU'
    }
  ]
};

// ============ QRS IG 数据 ============

/** QRS IG 项目 Schema */
export const qrsIgSchema: ColumnSchema[] = [
  {
    dataIndex: 'name',
    fixed: 'left',
    key: 'name',
    renderType: 'code',
    titleKey: 'page.mdr.globalLibrary.cols.itemId',
    width: 80
  },
  { dataIndex: 'label', key: 'label', titleKey: 'page.mdr.globalLibrary.cols.label', width: 150 },
  {
    dataIndex: 'dataType',
    key: 'dataType',
    renderType: 'tag',
    tagColorMap: { Char: 'default', Num: 'orange' },
    titleKey: 'page.mdr.globalLibrary.cols.dataType',
    width: 80
  },
  { dataIndex: 'qrsQuestion', key: 'qrsQuestion', titleKey: 'page.mdr.globalLibrary.cols.question', width: 150 },
  {
    dataIndex: 'qrsResponse',
    key: 'qrsResponse',
    renderType: 'tagListPopover',
    titleKey: 'page.mdr.globalLibrary.cols.responseOptions',
    width: 300
  },
  {
    dataIndex: 'sdtmTarget',
    key: 'sdtmTarget',
    renderType: 'tag',
    tagColorMap: {},
    titleKey: 'page.mdr.globalLibrary.cols.sdtmMapping',
    width: 120
  }
];

export interface QRSInstrument {
  category: string;
  key: string;
  label: string;
  name: string;
  shortName: string;
}

export interface QRSItem {
  dataType: string;
  key: string;
  label: string;
  name: string;
  qrsQuestion: string;
  qrsResponse: string[];
  sdtmTarget: string;
}

export const qrsInstruments: QRSInstrument[] = [
  {
    category: 'Psychiatric',
    key: 'BDI-II',
    label: 'Beck Depression Inventory-II',
    name: 'BDI-II',
    shortName: 'Beck Depression'
  },
  {
    category: 'Quality of Life',
    key: 'EQ-5D',
    label: 'EuroQol 5-Dimension Questionnaire',
    name: 'EQ-5D',
    shortName: 'EQ-5D'
  },
  {
    category: 'Psychiatric',
    key: 'HAMD',
    label: 'Hamilton Depression Rating Scale',
    name: 'HAMD',
    shortName: 'Hamilton Depression'
  }
];

export const qrsItems: Record<string, QRSItem[]> = {
  'BDI-II': [
    {
      dataType: 'Num',
      key: 'bdi-q01',
      label: 'Sadness',
      name: 'Q01',
      qrsQuestion: 'Sadness',
      qrsResponse: ['0=I do not feel sad', '1=I feel sad', '2=I am sad all the time'],
      sdtmTarget: 'QS.QSORRES'
    },
    {
      dataType: 'Num',
      key: 'bdi-q02',
      label: 'Pessimism',
      name: 'Q02',
      qrsQuestion: 'Pessimism',
      qrsResponse: ['0=I am not discouraged', '1=I feel discouraged', '2=I feel I have nothing to look forward to'],
      sdtmTarget: 'QS.QSORRES'
    },
    {
      dataType: 'Num',
      key: 'bdi-q03',
      label: 'Past Failure',
      name: 'Q03',
      qrsQuestion: 'Past Failure',
      qrsResponse: [
        '0=I do not feel like a failure',
        '1=I have failed more than I should have',
        '2=I have failed a lot'
      ],
      sdtmTarget: 'QS.QSORRES'
    },
    {
      dataType: 'Num',
      key: 'bdi-q04',
      label: 'Loss of Pleasure',
      name: 'Q04',
      qrsQuestion: 'Loss of Pleasure',
      qrsResponse: [
        '0=I get as much pleasure as ever',
        "1=I don't enjoy things as much",
        '2=I get very little pleasure'
      ],
      sdtmTarget: 'QS.QSORRES'
    }
  ],
  'EQ-5D': [
    {
      dataType: 'Num',
      key: 'eq-mobility',
      label: 'Mobility',
      name: 'MOBILITY',
      qrsQuestion: 'Mobility',
      qrsResponse: [
        '1=I have no problems walking',
        '2=I have slight problems walking',
        '3=I have moderate problems walking'
      ],
      sdtmTarget: 'QS.QSORRES'
    },
    {
      dataType: 'Num',
      key: 'eq-selfcare',
      label: 'Self-Care',
      name: 'SELFCARE',
      qrsQuestion: 'Self-Care',
      qrsResponse: ['1=I have no problems', '2=I have slight problems', '3=I have moderate problems'],
      sdtmTarget: 'QS.QSORRES'
    }
  ],
  HAMD: [
    {
      dataType: 'Num',
      key: 'hamd-q01',
      label: 'Depressed Mood',
      name: 'Q01',
      qrsQuestion: 'Depressed Mood',
      qrsResponse: ['0=Absent', '1=Sadness', '2=Pessimism', '3=Hopelessness'],
      sdtmTarget: 'QS.QSORRES'
    },
    {
      dataType: 'Num',
      key: 'hamd-q02',
      label: 'Guilt',
      name: 'Q02',
      qrsQuestion: 'Guilt',
      qrsResponse: ['0=Absent', '1=Self-reproach', '2=Ideas of guilt', '3=Delusions of guilt'],
      sdtmTarget: 'QS.QSORRES'
    }
  ]
};

// ============ CT (Controlled Terminology) 数据 ============

/** CT 术语 Schema */
export const ctSchema: ColumnSchema[] = [
  {
    dataIndex: 'code',
    fixed: 'left',
    key: 'code',
    renderType: 'tag',
    tagColorMap: {},
    titleKey: 'page.mdr.globalLibrary.cols.nciCode',
    width: 100
  },
  { dataIndex: 'term', key: 'term', renderType: 'text', titleKey: 'page.mdr.globalLibrary.cols.term', width: 200 },
  {
    dataIndex: 'definition',
    ellipsis: true,
    key: 'definition',
    titleKey: 'page.mdr.globalLibrary.cols.definition',
    width: 300
  },
  {
    dataIndex: 'synonyms',
    key: 'synonyms',
    renderType: 'tagListPopover',
    titleKey: 'page.mdr.globalLibrary.cols.synonyms',
    width: 200
  }
];

export interface CTCodelist {
  cdiscSubset: string;
  key: string;
  label: string;
  name: string;
  submissionValue: string;
}

export interface CTTerm {
  code: string;
  definition: string;
  key: string;
  synonyms: string[];
  term: string;
}

export const ctCodelists: CTCodelist[] = [
  { cdiscSubset: 'SDTM/ADaM', key: 'cl-severity', label: 'Severity Scale', name: 'Severity', submissionValue: 'SEV' },
  { cdiscSubset: 'SDTM/ADaM', key: 'cl-sex', label: 'Sex', name: 'Sex', submissionValue: 'SEX' },
  { cdiscSubset: 'SDTM/ADaM', key: 'cl-race', label: 'Race', name: 'Race', submissionValue: 'RACE' },
  { cdiscSubset: 'SDTM/ADaM', key: 'cl-unit', label: 'Unit of Measurement', name: 'Unit', submissionValue: 'UNIT' }
];

export const ctTerms: Record<string, CTTerm[]> = {
  'cl-race': [
    {
      code: 'C16352',
      definition: 'A person having origins in any of the black racial groups of Africa.',
      key: 'race-1',
      synonyms: ['Black', 'African American'],
      term: 'BLACK OR AFRICAN AMERICAN'
    },
    {
      code: 'C41261',
      definition: 'A person having origins in any of the original peoples of Europe.',
      key: 'race-2',
      synonyms: ['White', 'Caucasian'],
      term: 'CAUCASIAN'
    },
    {
      code: 'C41260',
      definition: 'A person having origins in any of the original peoples of the Far East.',
      key: 'race-3',
      synonyms: ['Asian'],
      term: 'ASIAN'
    }
  ],
  'cl-severity': [
    {
      code: 'C1514111',
      definition: 'A severity rating of mild, indicating minimal symptoms.',
      key: 'sev-1',
      synonyms: ['Mild', 'Grade 1'],
      term: 'MILD'
    },
    {
      code: 'C1514112',
      definition: 'A severity rating of moderate, indicating moderate symptoms.',
      key: 'sev-2',
      synonyms: ['Moderate', 'Grade 2'],
      term: 'MODERATE'
    },
    {
      code: 'C1514113',
      definition: 'A severity rating of severe, indicating significant symptoms.',
      key: 'sev-3',
      synonyms: ['Severe', 'Grade 3'],
      term: 'SEVERE'
    }
  ],
  'cl-sex': [
    {
      code: 'C16576',
      definition: 'A person who belongs to the sex that normally produces sperm.',
      key: 'sex-m',
      synonyms: ['Male', 'M'],
      term: 'MALE'
    },
    {
      code: 'C16577',
      definition: 'A person who belongs to the sex that normally produces ova.',
      key: 'sex-f',
      synonyms: ['Female', 'F'],
      term: 'FEMALE'
    },
    {
      code: 'C17998',
      definition: 'Not known, not observed, or not available.',
      key: 'sex-u',
      synonyms: ['Unknown', 'U'],
      term: 'UNKNOWN'
    }
  ],
  'cl-unit': [
    {
      code: 'C67196',
      definition: 'Milligram, a unit of mass.',
      key: 'unit-1',
      synonyms: ['milligram', 'mg'],
      term: 'mg'
    },
    {
      code: 'C67379',
      definition: 'Milliliter, a unit of volume.',
      key: 'unit-2',
      synonyms: ['milliliter', 'mL'],
      term: 'mL'
    },
    { code: 'C67448', definition: 'Kilogram, a unit of mass.', key: 'unit-3', synonyms: ['kilogram', 'kg'], term: 'kg' }
  ]
};

// ============ 统一的 Schema 获取函数 ============

/** 根据子类型获取对应的 Schema */
export function getSchemaBySubType(subType: string): ColumnSchema[] {
  switch (subType) {
    case 'SDTM_IG':
      return sdtmIgSchema;
    case 'SDTM_MODEL':
      return sdtmModelSchema;
    case 'ADAM_IG':
      return adamIgSchema;
    case 'CDASH_IG':
      return cdashIgSchema;
    case 'QRS_IG':
      return qrsIgSchema;
    case 'SDTM_CT':
    case 'ADAM_CT':
    case 'CDASH_CT':
      return ctSchema;
    default:
      return sdtmIgSchema;
  }
}

/** 获取子类型对应的默认节点 Key */
export function getDefaultNodeKey(subType: string): string {
  switch (subType) {
    case 'SDTM_IG':
      return 'AE';
    case 'SDTM_MODEL':
      return 'Events'; // Model 级别按观察类分组
    case 'ADAM_IG':
      return 'ADSL';
    case 'CDASH_IG':
      return 'VS';
    case 'QRS_IG':
      return 'BDI-II';
    case 'SDTM_CT':
    case 'ADAM_CT':
    case 'CDASH_CT':
      return 'cl-severity';
    default:
      return 'AE';
  }
}

/** 获取 SDTM Model 按观察类分组的变量 */
export function getSdtmModelVariablesByClass(observationClass: string): SDTMModelVariable[] {
  return sdtmModelVariables.filter(v => v.observationClass === observationClass);
}

/** 获取 SDTM Model 所有的观察类列表 */
export function getSdtmModelClasses(): string[] {
  return [...new Set(sdtmModelVariables.map(v => v.observationClass))];
}

// ============ Model 基类变量 ============

export const modelBaseVariables: Record<string, ModelBaseVariable> = {
  '--DECOD': {
    core: 'Req',
    description: 'Derived from dictionary matching.',
    label: 'Dictionary-Derived Term',
    name: '--DECOD',
    origin: 'Assigned',
    role: 'Synonym Qualifier',
    type: 'Char'
  },
  '--DTC': {
    core: 'Exp',
    description: 'Date and time in ISO 8601 format.',
    label: 'Date/Time of Collection',
    name: '--DTC',
    origin: 'CRF',
    role: 'Timing',
    type: 'ISO8601'
  },
  '--STAT': {
    core: 'Perm',
    description: 'Completion status of the observation.',
    label: 'Completion Status',
    name: '--STAT',
    origin: 'Derived',
    role: 'Record Qualifier',
    type: 'Char'
  },
  '--TERM': {
    core: 'Req',
    description: 'Verbatim text as reported.',
    label: 'Reported Term',
    name: '--TERM',
    origin: 'CRF',
    role: 'Topic',
    type: 'Char'
  }
};

// ============ Biomedical Concepts ============

export const biomedicalConcepts: Record<string, BiomedicalConcept> = {
  'bc-ae-term': {
    definition: 'Any untoward medical occurrence.',
    description: 'Verbatim text for adverse event.',
    id: 'bc-ae-term',
    name: 'Adverse Event Term',
    source: 'CDISC SDTM',
    synonyms: ['AE Term', 'Verbatim']
  },
  'bc-age': {
    definition: 'Length of time a subject has existed.',
    description: 'Age of subject.',
    id: 'bc-age',
    name: 'Age',
    source: 'CDISC SDTM',
    synonyms: ['Subject Age']
  },
  'bc-meddra': {
    ccode: '10000000',
    definition: 'MedDRA Preferred Terms represent single medical concepts.',
    description: 'MedDRA dictionary term.',
    id: 'bc-meddra',
    name: 'MedDRA Preferred Term',
    source: 'MedDRA',
    synonyms: ['PT', 'Preferred Term']
  },
  'bc-race': {
    definition: 'Racial background of the subject.',
    description: 'Race of subject.',
    id: 'bc-race',
    name: 'Race',
    source: 'CDISC SDTM',
    synonyms: ['Ethnicity']
  },
  'bc-sex': {
    definition: 'Biological sex of the subject.',
    description: 'Biological sex.',
    id: 'bc-sex',
    name: 'Sex',
    source: 'CDISC SDTM',
    synonyms: ['Gender']
  }
};

export function getBiomedicalConcept(id: string): BiomedicalConcept | undefined {
  return biomedicalConcepts[id];
}
