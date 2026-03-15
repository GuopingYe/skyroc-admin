/**
 * Study Spec Mock 数据 项目规范 (Study Specification) - 数据规范定义
 *
 * 业务架构说明：
 *
 * - Study Spec 是所有目标 SDTM/ADaM 变量的"源头"
 * - 定义了每个 Dataset 下的所有 Variable 及其属性
 * - Origin (来源) 属性决定了变量如何生成：
 *
 *   - CRF: 从 CRF/SDR 直接映射，需在 Mapping Studio 配置
 *   - Assigned: 系统分配或协议规定，如 STUDYID, DOMAIN
 *   - Derived: 通过推导逻辑计算，如 AESEQ, AESTDY
 *   - Protocol: 从试验方案获取
 * - 支持标准类型切换：SDTM / ADaM
 */

/** 标准类型 */
export type StandardType = 'ADaM' | 'SDTM';

/** 变量来源类型 */
export type VariableOrigin = 'Assigned' | 'CRF' | 'Derived' | 'Protocol';

/** Origin 显示配置 */
export const originConfig: Record<VariableOrigin, { color: string; description: string; label: string }> = {
  Assigned: {
    color: 'blue',
    description: '系统分配或协议规定，如 STUDYID, DOMAIN',
    label: 'Assigned'
  },
  CRF: {
    color: 'green',
    description: '从 CRF/SDR 直接映射，需在 Mapping Studio 配置',
    label: 'CRF'
  },
  Derived: {
    color: 'orange',
    description: '通过推导逻辑计算，如 AESEQ, AESTDY',
    label: 'Derived'
  },
  Protocol: {
    color: 'purple',
    description: '从试验方案获取',
    label: 'Protocol'
  }
};

/** Study Spec 变量定义 */
export interface SpecVariable {
  /** 关联的分析批次 ID */
  analysisId?: string;
  codelist?: string;
  comment?: string;
  core: 'Exp' | 'Perm' | 'Req';
  dataType: 'Char' | 'Date' | 'DateTime' | 'Num';
  format?: string;
  /** Global Library 引用 ID（用于溯源） */
  globalLibraryRef?: string;
  /** 实施说明/AI Prompt */
  implementationNotes?: string;
  key: string;
  label: string;
  length: number;
  /** 关联的 SDR 字段（仅 Origin=CRF 时有效） */
  mappedSourceField?: string;
  name: string;
  /** 排序序号 - 用于拖拽排序 */
  order: number;
  origin: VariableOrigin;
  role: string;
  /** 来源/推导逻辑 */
  sourceDerivation?: string;
}

/** Study Spec Dataset 定义 */
export interface SpecDataset {
  class: string;
  key: string;
  keys: string[];
  label: string;
  name: string;
  purpose: string;
  structure: string;
}

/** Study Spec Mock 数据结构 - 按标准类型分组 */
export interface StudySpecMock {
  ADaM: {
    datasets: SpecDataset[];
    variables: Record<string, SpecVariable[]>;
  };
  SDTM: {
    datasets: SpecDataset[];
    variables: Record<string, SpecVariable[]>;
  };
}

/** SDTM Dataset 列表 */
const sdtmDatasets: SpecDataset[] = [
  {
    class: 'Special Purpose',
    key: 'DM',
    keys: ['STUDYID', 'USUBJID'],
    label: 'Demographics',
    name: 'DM',
    purpose: 'Subject-level demographics',
    structure: 'One record per subject'
  },
  {
    class: 'Events',
    key: 'AE',
    keys: ['STUDYID', 'USUBJID', 'AESEQ'],
    label: 'Adverse Events',
    name: 'AE',
    purpose: 'Adverse event data collection',
    structure: 'One record per adverse event per subject'
  },
  {
    class: 'Findings',
    key: 'VS',
    keys: ['STUDYID', 'USUBJID', 'VSTESTCD', 'VISITNUM'],
    label: 'Vital Signs',
    name: 'VS',
    purpose: 'Vital signs measurements',
    structure: 'One record per vital sign measurement per visit'
  },
  {
    class: 'Findings',
    key: 'LB',
    keys: ['STUDYID', 'USUBJID', 'LBTESTCD', 'VISITNUM'],
    label: 'Laboratory Tests',
    name: 'LB',
    purpose: 'Laboratory test results',
    structure: 'One record per lab test result per visit'
  },
  {
    class: 'Interventions',
    key: 'EX',
    keys: ['STUDYID', 'USUBJID', 'EXTRT', 'EXSTDTC'],
    label: 'Exposure',
    name: 'EX',
    purpose: 'Study treatment exposure',
    structure: 'One record per dosing interval'
  }
];

/** ADaM Dataset 列表 */
const adamDatasets: SpecDataset[] = [
  {
    class: 'ADaM Subject Level',
    key: 'ADSL',
    keys: ['STUDYID', 'USUBJID'],
    label: 'Subject-Level Analysis Dataset',
    name: 'ADSL',
    purpose: 'Subject-level analysis variables',
    structure: 'One record per subject'
  },
  {
    class: 'ADaM Occurrence',
    key: 'ADAE',
    keys: ['STUDYID', 'USUBJID', 'AESEQ'],
    label: 'Adverse Events Analysis Dataset',
    name: 'ADAE',
    purpose: 'Adverse event analysis',
    structure: 'One record per adverse event per subject'
  },
  {
    class: 'ADaM Basic Data Structure',
    key: 'ADVS',
    keys: ['STUDYID', 'USUBJID', 'PARAMCD', 'AVISITN'],
    label: 'Vital Signs Analysis Dataset',
    name: 'ADVS',
    purpose: 'Vital signs analysis',
    structure: 'One record per vital sign measurement per visit'
  },
  {
    class: 'ADaM Basic Data Structure',
    key: 'ADLB',
    keys: ['STUDYID', 'USUBJID', 'PARAMCD', 'AVISITN'],
    label: 'Laboratory Analysis Dataset',
    name: 'ADLB',
    purpose: 'Laboratory test analysis',
    structure: 'One record per lab test result per visit'
  }
];

/** SDTM 变量数据 - 按 Dataset 分组 */
const sdtmVariables: Record<string, SpecVariable[]> = {
  AE: [
    // Assigned 类型变量
    {
      core: 'Req',
      dataType: 'Char',
      key: 'ae-studyid',
      label: 'Study Identifier',
      length: 12,
      name: 'STUDYID',
      order: 1,
      origin: 'Assigned',
      role: 'Identifier'
    },
    {
      comment: 'Fixed value "AE"',
      core: 'Req',
      dataType: 'Char',
      key: 'ae-domain',
      label: 'Domain Abbreviation',
      length: 2,
      name: 'DOMAIN',
      order: 2,
      origin: 'Assigned',
      role: 'Identifier'
    },
    {
      comment: 'From DM.USUBJID',
      core: 'Req',
      dataType: 'Char',
      key: 'ae-usubjid',
      label: 'Unique Subject Identifier',
      length: 40,
      name: 'USUBJID',
      order: 3,
      origin: 'Derived',
      role: 'Identifier'
    },

    // Derived 类型变量 - 序号和日期
    {
      comment: 'Sequential number within subject',
      core: 'Req',
      dataType: 'Num',
      key: 'ae-aeseq',
      label: 'Sequence Number',
      length: 8,
      name: 'AESEQ',
      order: 4,
      origin: 'Derived',
      role: 'Identifier'
    },

    // CRF 类型变量 - 需从 SDR 映射
    {
      core: 'Req',
      dataType: 'Char',
      key: 'ae-aeterm',
      label: 'Reported Term for the Adverse Event',
      length: 200,
      mappedSourceField: 'AETERM',
      name: 'AETERM',
      order: 5,
      origin: 'CRF',
      role: 'Topic'
    },
    {
      codelist: 'MedDRA LLT',
      core: 'Perm',
      dataType: 'Char',
      key: 'ae-aellt',
      label: 'Lowest Level Term',
      length: 100,
      name: 'AELLT',
      order: 6,
      origin: 'Assigned',
      role: 'Synonym Qualifier'
    },
    {
      codelist: 'MedDRA PT',
      core: 'Req',
      dataType: 'Char',
      key: 'ae-aedecod',
      label: 'Dictionary-Derived Term',
      length: 100,
      name: 'AEDECOD',
      order: 7,
      origin: 'Assigned',
      role: 'Synonym Qualifier'
    },
    {
      codelist: 'MedDRA SOC',
      core: 'Req',
      dataType: 'Char',
      key: 'ae-aebodsys',
      label: 'Body System or Organ Class',
      length: 100,
      name: 'AEBODSYS',
      order: 8,
      origin: 'Assigned',
      role: 'Grouping Qualifier'
    },
    {
      core: 'Exp',
      dataType: 'DateTime',
      key: 'ae-aestdtc',
      label: 'Start Date/Time of Adverse Event',
      length: 26,
      mappedSourceField: 'AESTDT',
      name: 'AESTDTC',
      order: 9,
      origin: 'CRF',
      role: 'Timing'
    },
    {
      core: 'Perm',
      dataType: 'DateTime',
      key: 'ae-aeendtc',
      label: 'End Date/Time of Adverse Event',
      length: 26,
      mappedSourceField: 'AEENDT',
      name: 'AEENDTC',
      order: 10,
      origin: 'CRF',
      role: 'Timing'
    },
    {
      codelist: 'SEV',
      core: 'Req',
      dataType: 'Char',
      key: 'ae-aesev',
      label: 'Severity/Intensity',
      length: 20,
      mappedSourceField: 'AESEV',
      name: 'AESEV',
      order: 11,
      origin: 'CRF',
      role: 'Record Qualifier'
    },
    {
      codelist: 'YESNO',
      core: 'Req',
      dataType: 'Char',
      key: 'ae-aeser',
      label: 'Serious Event',
      length: 1,
      mappedSourceField: 'AESER',
      name: 'AESER',
      order: 12,
      origin: 'CRF',
      role: 'Record Qualifier'
    },

    // Derived 类型变量
    {
      comment: 'Derived from AESTDTC and RFSTDTC',
      core: 'Exp',
      dataType: 'Num',
      key: 'ae-aestdy',
      label: 'Study Day of Start of Adverse Event',
      length: 8,
      name: 'AESTDY',
      order: 13,
      origin: 'Derived',
      role: 'Timing'
    },
    {
      comment: 'Derived from AEENDTC and RFSTDTC',
      core: 'Perm',
      dataType: 'Num',
      key: 'ae-aeendy',
      label: 'Study Day of End of Adverse Event',
      length: 8,
      name: 'AEENDY',
      order: 14,
      origin: 'Derived',
      role: 'Timing'
    }
  ],

  DM: [
    // Assigned 类型变量 - 系统分配
    {
      comment: 'Protocol-defined study ID',
      core: 'Req',
      dataType: 'Char',
      globalLibraryRef: 'STUDYID',
      key: 'dm-studyid',
      label: 'Study Identifier',
      length: 12,
      name: 'STUDYID',
      order: 1,
      origin: 'Assigned',
      role: 'Identifier',
      sourceDerivation: 'Directly assigned from protocol'
    },
    {
      comment: 'Fixed value "DM"',
      core: 'Req',
      dataType: 'Char',
      globalLibraryRef: 'DOMAIN',
      key: 'dm-domain',
      label: 'Domain Abbreviation',
      length: 2,
      name: 'DOMAIN',
      order: 2,
      origin: 'Assigned',
      role: 'Identifier',
      sourceDerivation: 'Hardcoded as "DM"'
    },
    {
      comment: 'Concatenation of STUDYID-SITEID-SUBJID',
      core: 'Req',
      dataType: 'Char',
      globalLibraryRef: 'USUBJID',
      implementationNotes: 'Concatenate study ID, site ID, and subject ID with hyphens',
      key: 'dm-usubjid',
      label: 'Unique Subject Identifier',
      length: 40,
      name: 'USUBJID',
      order: 3,
      origin: 'Derived',
      role: 'Identifier',
      sourceDerivation: 'CATX(STUDYID, "-", SITEID, "-", SUBJID)'
    },

    // CRF 类型变量 - 需从 SDR 映射
    {
      core: 'Req',
      dataType: 'Char',
      globalLibraryRef: 'SUBJID',
      key: 'dm-subjid',
      label: 'Subject Identifier for the Study',
      length: 20,
      mappedSourceField: 'SUBJID',
      name: 'SUBJID',
      order: 4,
      origin: 'CRF',
      role: 'Identifier'
    },
    {
      core: 'Req',
      dataType: 'Char',
      globalLibraryRef: 'SITEID',
      key: 'dm-siteid',
      label: 'Study Site Identifier',
      length: 8,
      mappedSourceField: 'SITEID',
      name: 'SITEID',
      order: 5,
      origin: 'CRF',
      role: 'Identifier'
    },
    {
      core: 'Req',
      dataType: 'Num',
      globalLibraryRef: 'AGE',
      key: 'dm-age',
      label: 'Age',
      length: 8,
      mappedSourceField: 'AGE',
      name: 'AGE',
      order: 6,
      origin: 'CRF',
      role: 'Topic'
    },
    {
      comment: 'Fixed value "YEARS"',
      core: 'Req',
      dataType: 'Char',
      globalLibraryRef: 'AGEU',
      key: 'dm-ageu',
      label: 'Age Units',
      length: 10,
      name: 'AGEU',
      order: 7,
      origin: 'Assigned',
      role: 'Topic',
      sourceDerivation: 'Hardcoded as "YEARS"'
    },
    {
      codelist: 'SEX',
      core: 'Req',
      dataType: 'Char',
      globalLibraryRef: 'SEX',
      key: 'dm-sex',
      label: 'Sex',
      length: 1,
      mappedSourceField: 'SEX',
      name: 'SEX',
      order: 8,
      origin: 'CRF',
      role: 'Topic'
    },
    {
      codelist: 'RACE',
      core: 'Exp',
      dataType: 'Char',
      globalLibraryRef: 'RACE',
      key: 'dm-race',
      label: 'Race',
      length: 100,
      mappedSourceField: 'RACE',
      name: 'RACE',
      order: 9,
      origin: 'CRF',
      role: 'Topic'
    },
    {
      core: 'Perm',
      dataType: 'DateTime',
      globalLibraryRef: 'BRTHDTC',
      key: 'dm-brthdtc',
      label: 'Date/Time of Birth',
      length: 26,
      mappedSourceField: 'BRTHDT',
      name: 'BRTHDTC',
      order: 10,
      origin: 'CRF',
      role: 'Topic'
    },

    // Derived 类型变量 - 推导计算
    {
      comment: 'Date of first study treatment',
      core: 'Req',
      dataType: 'DateTime',
      globalLibraryRef: 'RFSTDTC',
      implementationNotes: 'Find the first exposure date with non-zero dose',
      key: 'dm-rfstdtc',
      label: 'Subject Reference Start Date/Time',
      length: 26,
      name: 'RFSTDTC',
      order: 11,
      origin: 'Derived',
      role: 'Timing',
      sourceDerivation: 'Min(EXSTDTC) where EXDOSE > 0'
    },
    {
      comment: 'Date of last study treatment',
      core: 'Exp',
      dataType: 'DateTime',
      globalLibraryRef: 'RFENDTC',
      implementationNotes: 'Find the last exposure date with non-zero dose',
      key: 'dm-rfendtc',
      label: 'Subject Reference End Date/Time',
      length: 26,
      name: 'RFENDTC',
      order: 12,
      origin: 'Derived',
      role: 'Timing',
      sourceDerivation: 'Max(EXENDTC) where EXDOSE > 0'
    }
  ],

  EX: [
    // Assigned 类型变量
    {
      core: 'Req',
      dataType: 'Char',
      key: 'ex-studyid',
      label: 'Study Identifier',
      length: 12,
      name: 'STUDYID',
      order: 1,
      origin: 'Assigned',
      role: 'Identifier'
    },
    {
      comment: 'Fixed value "EX"',
      core: 'Req',
      dataType: 'Char',
      key: 'ex-domain',
      label: 'Domain Abbreviation',
      length: 2,
      name: 'DOMAIN',
      order: 2,
      origin: 'Assigned',
      role: 'Identifier'
    },
    {
      core: 'Req',
      dataType: 'Char',
      key: 'ex-usubjid',
      label: 'Unique Subject Identifier',
      length: 40,
      name: 'USUBJID',
      order: 3,
      origin: 'Derived',
      role: 'Identifier'
    },
    {
      comment: 'Sequential number within subject',
      core: 'Req',
      dataType: 'Num',
      key: 'ex-exseq',
      label: 'Sequence Number',
      length: 8,
      name: 'EXSEQ',
      order: 4,
      origin: 'Derived',
      role: 'Identifier'
    },

    // CRF 类型变量
    {
      core: 'Req',
      dataType: 'Char',
      key: 'ex-extrt',
      label: 'Name of Actual Treatment',
      length: 100,
      mappedSourceField: 'EXTRT',
      name: 'EXTRT',
      order: 5,
      origin: 'CRF',
      role: 'Topic'
    },
    {
      core: 'Exp',
      dataType: 'Num',
      key: 'ex-exdose',
      label: 'Dose per Administration',
      length: 8,
      mappedSourceField: 'EXDOSE',
      name: 'EXDOSE',
      order: 6,
      origin: 'CRF',
      role: 'Record Qualifier'
    },
    {
      core: 'Exp',
      dataType: 'Char',
      key: 'ex-exdosu',
      label: 'Dose Units',
      length: 20,
      mappedSourceField: 'EXDOSU',
      name: 'EXDOSU',
      order: 7,
      origin: 'CRF',
      role: 'Record Qualifier'
    },
    {
      core: 'Exp',
      dataType: 'DateTime',
      key: 'ex-exstdtc',
      label: 'Start Date/Time of Treatment',
      length: 26,
      mappedSourceField: 'EXSTDTC',
      name: 'EXSTDTC',
      order: 8,
      origin: 'CRF',
      role: 'Timing'
    },
    {
      core: 'Perm',
      dataType: 'DateTime',
      key: 'ex-exendtc',
      label: 'End Date/Time of Treatment',
      length: 26,
      mappedSourceField: 'EXENDTC',
      name: 'EXENDTC',
      order: 9,
      origin: 'CRF',
      role: 'Timing'
    },

    // Derived 类型变量
    {
      comment: 'Derived from EXSTDTC and RFSTDTC',
      core: 'Exp',
      dataType: 'Num',
      key: 'ex-exstdy',
      label: 'Study Day of Start of Treatment',
      length: 8,
      name: 'EXSTDY',
      order: 10,
      origin: 'Derived',
      role: 'Timing'
    },
    {
      comment: 'Derived from EXENDTC and RFSTDTC',
      core: 'Perm',
      dataType: 'Num',
      key: 'ex-exendy',
      label: 'Study Day of End of Treatment',
      length: 8,
      name: 'EXENDY',
      order: 11,
      origin: 'Derived',
      role: 'Timing'
    }
  ],

  LB: [
    // Assigned 类型变量
    {
      core: 'Req',
      dataType: 'Char',
      key: 'lb-studyid',
      label: 'Study Identifier',
      length: 12,
      name: 'STUDYID',
      order: 1,
      origin: 'Assigned',
      role: 'Identifier'
    },
    {
      comment: 'Fixed value "LB"',
      core: 'Req',
      dataType: 'Char',
      key: 'lb-domain',
      label: 'Domain Abbreviation',
      length: 2,
      name: 'DOMAIN',
      order: 2,
      origin: 'Assigned',
      role: 'Identifier'
    },
    {
      core: 'Req',
      dataType: 'Char',
      key: 'lb-usubjid',
      label: 'Unique Subject Identifier',
      length: 40,
      name: 'USUBJID',
      order: 3,
      origin: 'Derived',
      role: 'Identifier'
    },
    {
      comment: 'Sequential number within subject',
      core: 'Req',
      dataType: 'Num',
      key: 'lb-lbseq',
      label: 'Sequence Number',
      length: 8,
      name: 'LBSEQ',
      order: 4,
      origin: 'Derived',
      role: 'Identifier'
    },
    {
      codelist: 'LBTESTCD',
      core: 'Req',
      dataType: 'Char',
      key: 'lb-lbtestcd',
      label: 'Lab Test or Examination Short Name',
      length: 8,
      name: 'LBTESTCD',
      order: 5,
      origin: 'Assigned',
      role: 'Topic'
    },
    {
      core: 'Req',
      dataType: 'Char',
      key: 'lb-lbtest',
      label: 'Lab Test or Examination Name',
      length: 40,
      name: 'LBTEST',
      order: 6,
      origin: 'Assigned',
      role: 'Topic'
    },

    // CRF 类型变量
    {
      core: 'Exp',
      dataType: 'Char',
      key: 'lb-lborres',
      label: 'Result in Original Units',
      length: 40,
      mappedSourceField: 'LB_VAL',
      name: 'LBORRES',
      order: 7,
      origin: 'CRF',
      role: 'Result Qualifier'
    },
    {
      core: 'Exp',
      dataType: 'Char',
      key: 'lb-lborresu',
      label: 'Original Units',
      length: 20,
      mappedSourceField: 'LB_UNIT',
      name: 'LBORRESU',
      order: 8,
      origin: 'CRF',
      role: 'Result Qualifier'
    },
    {
      core: 'Exp',
      dataType: 'DateTime',
      key: 'lb-lbdtc',
      label: 'Date/Time of Specimen Collection',
      length: 26,
      mappedSourceField: 'LBDTC',
      name: 'LBDTC',
      order: 9,
      origin: 'CRF',
      role: 'Timing'
    },

    // Derived 类型变量
    {
      comment: 'Standardized result',
      core: 'Exp',
      dataType: 'Char',
      key: 'lb-lbstresc',
      label: 'Character Result in Standard Format',
      length: 40,
      name: 'LBSTRESC',
      order: 10,
      origin: 'Derived',
      role: 'Result Qualifier'
    },
    {
      comment: 'Numeric standardized result',
      core: 'Exp',
      dataType: 'Num',
      key: 'lb-lbstresn',
      label: 'Numeric Result in Standard Units',
      length: 8,
      name: 'LBSTRESN',
      order: 11,
      origin: 'Derived',
      role: 'Result Qualifier'
    }
  ],

  VS: [
    // Assigned 类型变量
    {
      core: 'Req',
      dataType: 'Char',
      key: 'vs-studyid',
      label: 'Study Identifier',
      length: 12,
      name: 'STUDYID',
      order: 1,
      origin: 'Assigned',
      role: 'Identifier'
    },
    {
      comment: 'Fixed value "VS"',
      core: 'Req',
      dataType: 'Char',
      key: 'vs-domain',
      label: 'Domain Abbreviation',
      length: 2,
      name: 'DOMAIN',
      order: 2,
      origin: 'Assigned',
      role: 'Identifier'
    },
    {
      core: 'Req',
      dataType: 'Char',
      key: 'vs-usubjid',
      label: 'Unique Subject Identifier',
      length: 40,
      name: 'USUBJID',
      order: 3,
      origin: 'Derived',
      role: 'Identifier'
    },
    {
      comment: 'Sequential number within subject',
      core: 'Req',
      dataType: 'Num',
      key: 'vs-vsseq',
      label: 'Sequence Number',
      length: 8,
      name: 'VSSEQ',
      order: 4,
      origin: 'Derived',
      role: 'Identifier'
    },

    // Assigned 类型变量 - 测试相关
    {
      codelist: 'VSTESTCD',
      core: 'Req',
      dataType: 'Char',
      key: 'vs-vstestcd',
      label: 'Vital Signs Test Short Name',
      length: 8,
      name: 'VSTESTCD',
      order: 5,
      origin: 'Assigned',
      role: 'Topic'
    },
    {
      core: 'Req',
      dataType: 'Char',
      key: 'vs-vstest',
      label: 'Vital Signs Test Name',
      length: 40,
      name: 'VSTEST',
      order: 6,
      origin: 'Assigned',
      role: 'Topic'
    },

    // CRF 类型变量
    {
      core: 'Exp',
      dataType: 'Char',
      key: 'vs-vsorres',
      label: 'Result in Original Units',
      length: 40,
      mappedSourceField: 'VS_VAL',
      name: 'VSORRES',
      order: 7,
      origin: 'CRF',
      role: 'Result Qualifier'
    },
    {
      core: 'Exp',
      dataType: 'Char',
      key: 'vs-vsorresu',
      label: 'Original Units',
      length: 20,
      mappedSourceField: 'VS_UNIT',
      name: 'VSORRESU',
      order: 8,
      origin: 'CRF',
      role: 'Result Qualifier'
    },
    {
      core: 'Exp',
      dataType: 'DateTime',
      key: 'vs-vsdtc',
      label: 'Date/Time of Measurement',
      length: 26,
      mappedSourceField: 'VSDTC',
      name: 'VSDTC',
      order: 9,
      origin: 'CRF',
      role: 'Timing'
    },

    // Derived 类型变量
    {
      comment: 'Derived from VSDTC and RFSTDTC',
      core: 'Exp',
      dataType: 'Num',
      key: 'vs-vsstdy',
      label: 'Study Day of Measurement',
      length: 8,
      name: 'VSSTDY',
      order: 10,
      origin: 'Derived',
      role: 'Timing'
    },
    {
      comment: 'Standardized result',
      core: 'Exp',
      dataType: 'Char',
      key: 'vs-vsstresc',
      label: 'Character Result in Standard Format',
      length: 40,
      name: 'VSSTRESC',
      order: 11,
      origin: 'Derived',
      role: 'Result Qualifier'
    },
    {
      comment: 'Numeric standardized result',
      core: 'Exp',
      dataType: 'Num',
      key: 'vs-vsstresn',
      label: 'Numeric Result in Standard Units',
      length: 8,
      name: 'VSSTRESN',
      order: 12,
      origin: 'Derived',
      role: 'Result Qualifier'
    }
  ]
};

/** ADaM 变量数据 - 按 Dataset 分组 */
const adamVariables: Record<string, SpecVariable[]> = {
  ADAE: [
    // 标识变量
    {
      core: 'Req',
      dataType: 'Char',
      key: 'adae-studyid',
      label: 'Study Identifier',
      length: 12,
      name: 'STUDYID',
      order: 1,
      origin: 'Assigned',
      role: 'Identifier',
      sourceDerivation: 'AE.STUDYID'
    },
    {
      core: 'Req',
      dataType: 'Char',
      key: 'adae-usubjid',
      label: 'Unique Subject Identifier',
      length: 40,
      name: 'USUBJID',
      order: 2,
      origin: 'Derived',
      role: 'Identifier',
      sourceDerivation: 'AE.USUBJID'
    },
    {
      core: 'Req',
      dataType: 'Num',
      key: 'adae-aeseq',
      label: 'Sequence Number',
      length: 8,
      name: 'AESEQ',
      order: 3,
      origin: 'Derived',
      role: 'Identifier',
      sourceDerivation: 'AE.AESEQ'
    },

    // AE 术语变量
    {
      core: 'Req',
      dataType: 'Char',
      key: 'adae-aeterm',
      label: 'Reported Term for the Adverse Event',
      length: 200,
      mappedSourceField: 'AE.AETERM',
      name: 'AETERM',
      order: 4,
      origin: 'CRF',
      role: 'Topic'
    },
    {
      codelist: 'MedDRA PT',
      core: 'Req',
      dataType: 'Char',
      key: 'adae-aedecod',
      label: 'Dictionary-Derived Term',
      length: 100,
      name: 'AEDECOD',
      order: 5,
      origin: 'Assigned',
      role: 'Synonym Qualifier'
    },
    {
      codelist: 'MedDRA SOC',
      core: 'Req',
      dataType: 'Char',
      key: 'adae-aebodsys',
      label: 'Body System or Organ Class',
      length: 100,
      name: 'AEBODSYS',
      order: 6,
      origin: 'Assigned',
      role: 'Grouping Qualifier'
    },

    // 分析变量
    {
      core: 'Req',
      dataType: 'Char',
      key: 'adae-trta',
      label: 'Actual Treatment',
      length: 40,
      name: 'TRTA',
      order: 7,
      origin: 'Derived',
      role: 'Topic',
      sourceDerivation: 'ADSL.TRT01A'
    },
    {
      codelist: 'SEV',
      core: 'Req',
      dataType: 'Char',
      key: 'adae-aesev',
      label: 'Severity/Intensity',
      length: 20,
      mappedSourceField: 'AE.AESEV',
      name: 'AESEV',
      order: 8,
      origin: 'CRF',
      role: 'Record Qualifier'
    },
    {
      codelist: 'YESNO',
      core: 'Req',
      dataType: 'Char',
      key: 'adae-aeser',
      label: 'Serious Event',
      length: 1,
      mappedSourceField: 'AE.AESER',
      name: 'AESER',
      order: 9,
      origin: 'CRF',
      role: 'Record Qualifier'
    },

    // 分析标记
    {
      codelist: 'YESNO',
      core: 'Req',
      dataType: 'Char',
      key: 'adae-saffl',
      label: 'Safety Population Flag',
      length: 1,
      name: 'SAFFL',
      order: 10,
      origin: 'Derived',
      role: 'Record Qualifier',
      sourceDerivation: 'ADSL.SAFFL'
    }
  ],

  ADLB: [
    // 标识变量
    {
      core: 'Req',
      dataType: 'Char',
      key: 'adlb-studyid',
      label: 'Study Identifier',
      length: 12,
      name: 'STUDYID',
      order: 1,
      origin: 'Assigned',
      role: 'Identifier'
    },
    {
      core: 'Req',
      dataType: 'Char',
      key: 'adlb-usubjid',
      label: 'Unique Subject Identifier',
      length: 40,
      name: 'USUBJID',
      order: 2,
      origin: 'Derived',
      role: 'Identifier'
    },

    // 参数变量
    {
      codelist: 'PARAMCD',
      core: 'Req',
      dataType: 'Char',
      key: 'adlb-paramcd',
      label: 'Parameter Code',
      length: 8,
      name: 'PARAMCD',
      order: 3,
      origin: 'Assigned',
      role: 'Topic'
    },
    {
      core: 'Req',
      dataType: 'Char',
      key: 'adlb-param',
      label: 'Parameter',
      length: 40,
      name: 'PARAM',
      order: 4,
      origin: 'Assigned',
      role: 'Topic'
    },
    {
      core: 'Req',
      dataType: 'Num',
      key: 'adlb-avisitn',
      label: 'Analysis Visit (N)',
      length: 8,
      name: 'AVISITN',
      order: 5,
      origin: 'Derived',
      role: 'Timing',
      sourceDerivation: 'VISITNUM mapping'
    },

    // 结果变量
    {
      core: 'Req',
      dataType: 'Num',
      key: 'adlb-aval',
      label: 'Analysis Value',
      length: 8,
      name: 'AVAL',
      order: 6,
      origin: 'Derived',
      role: 'Result Qualifier',
      sourceDerivation: 'LBSTRESN'
    },
    {
      core: 'Exp',
      dataType: 'Char',
      key: 'adlb-avalc',
      label: 'Analysis Value (C)',
      length: 40,
      name: 'AVALC',
      order: 7,
      origin: 'Derived',
      role: 'Result Qualifier',
      sourceDerivation: 'LBSTRESC'
    },
    {
      core: 'Exp',
      dataType: 'Num',
      key: 'adlb-chg',
      label: 'Change from Baseline',
      length: 8,
      name: 'CHG',
      order: 8,
      origin: 'Derived',
      role: 'Result Qualifier',
      sourceDerivation: 'AVAL - BASE'
    },
    {
      core: 'Exp',
      dataType: 'Num',
      key: 'adlb-base',
      label: 'Baseline Value',
      length: 8,
      name: 'BASE',
      order: 9,
      origin: 'Derived',
      role: 'Result Qualifier',
      sourceDerivation: 'AVAL where ABLFL="Y"'
    },

    // 分析标记
    {
      codelist: 'YESNO',
      core: 'Exp',
      dataType: 'Char',
      key: 'adlb-ablfl',
      label: 'Baseline Record Flag',
      length: 1,
      name: 'ABLFL',
      order: 10,
      origin: 'Derived',
      role: 'Record Qualifier'
    },
    {
      codelist: 'YESNO',
      core: 'Exp',
      dataType: 'Char',
      key: 'adlb-anl01fl',
      label: 'Analysis Record Flag',
      length: 1,
      name: 'ANL01FL',
      order: 11,
      origin: 'Derived',
      role: 'Record Qualifier'
    }
  ],

  ADSL: [
    // 标识变量
    {
      comment: 'From DM.STUDYID',
      core: 'Req',
      dataType: 'Char',
      key: 'adsl-studyid',
      label: 'Study Identifier',
      length: 12,
      name: 'STUDYID',
      order: 1,
      origin: 'Assigned',
      role: 'Identifier',
      sourceDerivation: 'DM.STUDYID'
    },
    {
      comment: 'From DM.USUBJID',
      core: 'Req',
      dataType: 'Char',
      key: 'adsl-usubjid',
      label: 'Unique Subject Identifier',
      length: 40,
      name: 'USUBJID',
      order: 2,
      origin: 'Derived',
      role: 'Identifier',
      sourceDerivation: 'DM.USUBJID'
    },
    {
      core: 'Req',
      dataType: 'Char',
      key: 'adsl-subjid',
      label: 'Subject Identifier for the Study',
      length: 20,
      mappedSourceField: 'DM.SUBJID',
      name: 'SUBJID',
      order: 3,
      origin: 'CRF',
      role: 'Identifier'
    },

    // 人口学变量
    {
      core: 'Req',
      dataType: 'Num',
      key: 'adsl-age',
      label: 'Age',
      length: 8,
      mappedSourceField: 'DM.AGE',
      name: 'AGE',
      order: 4,
      origin: 'CRF',
      role: 'Topic'
    },
    {
      comment: 'Age grouping',
      core: 'Exp',
      dataType: 'Char',
      key: 'adsl-agegr1',
      label: 'Pooled Age Group 1',
      length: 20,
      name: 'AGEGR1',
      order: 5,
      origin: 'Derived',
      role: 'Topic',
      sourceDerivation: 'IF AGE < 65 THEN "<65" ELSE ">=65"'
    },
    {
      codelist: 'SEX',
      core: 'Req',
      dataType: 'Char',
      key: 'adsl-sex',
      label: 'Sex',
      length: 1,
      mappedSourceField: 'DM.SEX',
      name: 'SEX',
      order: 6,
      origin: 'CRF',
      role: 'Topic'
    },
    {
      codelist: 'RACE',
      core: 'Exp',
      dataType: 'Char',
      key: 'adsl-race',
      label: 'Race',
      length: 100,
      mappedSourceField: 'DM.RACE',
      name: 'RACE',
      order: 7,
      origin: 'CRF',
      role: 'Topic'
    },

    // 处置变量
    {
      comment: 'Planned treatment',
      core: 'Req',
      dataType: 'Char',
      key: 'adsl-trt01p',
      label: 'Planned Treatment for Period 01',
      length: 40,
      name: 'TRT01P',
      order: 8,
      origin: 'Assigned',
      role: 'Topic'
    },
    {
      comment: 'Actual treatment from EX',
      core: 'Req',
      dataType: 'Char',
      key: 'adsl-trt01a',
      label: 'Actual Treatment for Period 01',
      length: 40,
      name: 'TRT01A',
      order: 9,
      origin: 'Derived',
      role: 'Topic'
    },
    {
      comment: 'Last exposure date',
      core: 'Exp',
      dataType: 'Date',
      key: 'adsl-trtedt',
      label: 'End Date of Treatment',
      length: 10,
      name: 'TRTEDT',
      order: 10,
      origin: 'Derived',
      role: 'Timing',
      sourceDerivation: 'Max(EX.EXENDTC)'
    },

    // 分析标记变量
    {
      codelist: 'YESNO',
      core: 'Req',
      dataType: 'Char',
      key: 'adsl-saffl',
      label: 'Safety Population Flag',
      length: 1,
      name: 'SAFFL',
      order: 11,
      origin: 'Derived',
      role: 'Record Qualifier',
      sourceDerivation: 'IF EXDOSE > 0 THEN "Y" ELSE "N"'
    },
    {
      codelist: 'YESNO',
      core: 'Req',
      dataType: 'Char',
      key: 'adsl-ittfl',
      label: 'Intent-to-Treat Population Flag',
      length: 1,
      name: 'ITTFL',
      order: 12,
      origin: 'Derived',
      role: 'Record Qualifier',
      sourceDerivation: 'IF RANDFL = "Y" THEN "Y" ELSE "N"'
    },
    {
      codelist: 'YESNO',
      core: 'Exp',
      dataType: 'Char',
      key: 'adsl-pprotfl',
      label: 'Per-Protocol Population Flag',
      length: 1,
      name: 'PPROTFL',
      order: 13,
      origin: 'Derived',
      role: 'Record Qualifier',
      sourceDerivation: 'IF SAFFL="Y" AND MAJORPROTFL="N" THEN "Y" ELSE "N"'
    }
  ],

  ADVS: [
    // 标识变量
    {
      core: 'Req',
      dataType: 'Char',
      key: 'advs-studyid',
      label: 'Study Identifier',
      length: 12,
      name: 'STUDYID',
      order: 1,
      origin: 'Assigned',
      role: 'Identifier'
    },
    {
      core: 'Req',
      dataType: 'Char',
      key: 'advs-usubjid',
      label: 'Unique Subject Identifier',
      length: 40,
      name: 'USUBJID',
      order: 2,
      origin: 'Derived',
      role: 'Identifier'
    },

    // 参数变量
    {
      codelist: 'PARAMCD',
      core: 'Req',
      dataType: 'Char',
      key: 'advs-paramcd',
      label: 'Parameter Code',
      length: 8,
      name: 'PARAMCD',
      order: 3,
      origin: 'Assigned',
      role: 'Topic'
    },
    {
      core: 'Req',
      dataType: 'Char',
      key: 'advs-param',
      label: 'Parameter',
      length: 40,
      name: 'PARAM',
      order: 4,
      origin: 'Assigned',
      role: 'Topic'
    },
    {
      core: 'Req',
      dataType: 'Num',
      key: 'advs-avisitn',
      label: 'Analysis Visit (N)',
      length: 8,
      name: 'AVISITN',
      order: 5,
      origin: 'Derived',
      role: 'Timing',
      sourceDerivation: 'VISITNUM mapping'
    },

    // 结果变量
    {
      core: 'Req',
      dataType: 'Num',
      key: 'advs-aval',
      label: 'Analysis Value',
      length: 8,
      name: 'AVAL',
      order: 6,
      origin: 'Derived',
      role: 'Result Qualifier',
      sourceDerivation: 'VSSTRESN'
    },
    {
      core: 'Exp',
      dataType: 'Char',
      key: 'advs-avalc',
      label: 'Analysis Value (C)',
      length: 40,
      name: 'AVALC',
      order: 7,
      origin: 'Derived',
      role: 'Result Qualifier',
      sourceDerivation: 'VSSTRESC'
    },
    {
      core: 'Exp',
      dataType: 'Num',
      key: 'advs-chg',
      label: 'Change from Baseline',
      length: 8,
      name: 'CHG',
      order: 8,
      origin: 'Derived',
      role: 'Result Qualifier',
      sourceDerivation: 'AVAL - BASE'
    },
    {
      core: 'Exp',
      dataType: 'Num',
      key: 'advs-base',
      label: 'Baseline Value',
      length: 8,
      name: 'BASE',
      order: 9,
      origin: 'Derived',
      role: 'Result Qualifier',
      sourceDerivation: 'AVAL where ABLFL="Y"'
    },

    // 分析标记
    {
      codelist: 'YESNO',
      core: 'Exp',
      dataType: 'Char',
      key: 'advs-ablfl',
      label: 'Baseline Record Flag',
      length: 1,
      name: 'ABLFL',
      order: 10,
      origin: 'Derived',
      role: 'Record Qualifier',
      sourceDerivation: 'First post-baseline visit'
    },
    {
      codelist: 'YESNO',
      core: 'Exp',
      dataType: 'Char',
      key: 'advs-anl01fl',
      label: 'Analysis Record Flag',
      length: 1,
      name: 'ANL01FL',
      order: 11,
      origin: 'Derived',
      role: 'Record Qualifier'
    }
  ]
};

/** Study Spec Mock 数据导出 */
export const studySpecMock: StudySpecMock = {
  ADaM: {
    datasets: adamDatasets,
    variables: adamVariables
  },
  SDTM: {
    datasets: sdtmDatasets,
    variables: sdtmVariables
  }
};

// 保留旧变量名以兼容现有代码
export const specDatasets = sdtmDatasets;
export const specVariables = sdtmVariables;

/** 获取指定标准类型的 Dataset 列表 */
export const getDatasetsByStandard = (standard: StandardType): SpecDataset[] => {
  return studySpecMock[standard].datasets;
};

/** 获取指定标准类型的变量数据 */
export const getVariablesByStandard = (standard: StandardType): Record<string, SpecVariable[]> => {
  return studySpecMock[standard].variables;
};

/** 获取所有 Dataset 的变量数量统计 */
export const getDatasetVariableStats = (standard: StandardType = 'SDTM') => {
  const datasets = studySpecMock[standard].datasets;
  const variables = studySpecMock[standard].variables;

  return datasets.map(dataset => {
    const vars = variables[dataset.key] || [];
    const crfCount = vars.filter(v => v.origin === 'CRF').length;
    const assignedCount = vars.filter(v => v.origin === 'Assigned').length;
    const derivedCount = vars.filter(v => v.origin === 'Derived').length;
    const protocolCount = vars.filter(v => v.origin === 'Protocol').length;

    return {
      ...dataset,
      assignedCount,
      crfCount,
      derivedCount,
      protocolCount,
      totalCount: vars.length
    };
  });
};

/** 根据 Domain 获取变量列表（按 order 字段排序） */
export const getVariablesByDomain = (domainKey: string, standard: StandardType = 'SDTM'): SpecVariable[] => {
  const variables = studySpecMock[standard].variables[domainKey] || [];
  return [...variables].sort((a, b) => a.order - b.order);
};

/** 根据分析批次 ID 获取变量列表 */
export const getVariablesByAnalysis = (
  domainKey: string,
  analysisId: string,
  standard: StandardType = 'SDTM'
): SpecVariable[] => {
  const variables = studySpecMock[standard].variables[domainKey] || [];
  // 如果变量没有指定 analysisId，则默认属于所有分析批次
  return variables.filter(v => !v.analysisId || v.analysisId === analysisId).sort((a, b) => a.order - b.order);
};

/** 获取可映射的变量（Origin 为 CRF 或 Derived） */
export const getMappableVariables = (domainKey: string, standard: StandardType = 'SDTM'): SpecVariable[] => {
  const variables = studySpecMock[standard].variables[domainKey] || [];
  return variables.filter(v => v.origin === 'CRF' || v.origin === 'Derived');
};

/** 根据域名和变量名获取变量定义 */
export const getVariableDef = (
  domainKey: string,
  variableName: string,
  standard: StandardType = 'SDTM'
): SpecVariable | undefined => {
  const variables = studySpecMock[standard].variables[domainKey];
  if (!variables) return undefined;
  return variables.find(v => v.name === variableName);
};
