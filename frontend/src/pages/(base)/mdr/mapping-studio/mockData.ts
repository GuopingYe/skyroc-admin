/**
 * 映射工作室 Mock 数据 Mapping Studio Mock Data - SDR to SDTM 映射数据 支持 1:N 关系：一个源字段可映射到多个目标域/变量 支持多模态推导逻辑 (SAS, R, Natural
 * Language)
 */

/** 源字段类型 */
export interface SourceField {
  /** 关联的分析批次 ID */
  analysisId: string;
  description?: string;
  field_label: string;
  field_name: string;
  form_name: string;
  id: string;
  type: 'Char' | 'Date' | 'DateTime' | 'Num';
}

/** 映射状态枚举 */
export type MappingStatus = 'Draft' | 'In_Production' | 'Locked' | 'QCing';

/** 多模态推导逻辑 */
export interface Derivation {
  /** 自然语言描述 (用于 AI 生成) */
  nl?: string;
  /** R 代码 */
  r?: string;
  /** SAS 代码 */
  sas?: string;
}

/** 单条映射记录 */
export interface MappingItem {
  created_at: string;
  /** 多模态推导逻辑 (替代原来的 derivation_logic) */
  derivation: Derivation;
  id: string;
  programmer_name: string;
  status: MappingStatus;
  target_domain: string;
  target_variable: string;
  updated_at: string;
}

/** 映射详情 - 以 source_id 为 key，映射数组为 value */
export interface MappingDetailsMap {
  [source_id: string]: MappingItem[];
}

/** SDR 源字段数据 - 按分析批次分组 */
export const sourceFields: SourceField[] = [
  // analysis-001 (Primary Analysis) 的源字段
  {
    analysisId: 'analysis-001',
    description: 'Unique identifier for the subject',
    field_label: 'Subject Identifier',
    field_name: 'SUBJID',
    form_name: 'Demographics',
    id: 'src-001',
    type: 'Char'
  },
  {
    analysisId: 'analysis-001',
    description: 'Age in years at the time of enrollment',
    field_label: 'Age at Enrollment',
    field_name: 'AGE',
    form_name: 'Demographics',
    id: 'src-002',
    type: 'Num'
  },
  {
    analysisId: 'analysis-001',
    description: 'Sex of the subject (M/F/U)',
    field_label: 'Sex',
    field_name: 'SEX',
    form_name: 'Demographics',
    id: 'src-003',
    type: 'Char'
  },
  {
    analysisId: 'analysis-001',
    description: 'Date of birth in ISO format',
    field_label: 'Date of Birth',
    field_name: 'BRTHDT',
    form_name: 'Demographics',
    id: 'src-004',
    type: 'Date'
  },
  // analysis-002 (Interim Analysis 1) 的源字段
  {
    analysisId: 'analysis-002',
    description: 'Heart rate value in beats per minute',
    field_label: 'Heart Rate (bpm)',
    field_name: 'HR_VAL',
    form_name: 'Vital Signs',
    id: 'src-005',
    type: 'Num'
  },
  {
    analysisId: 'analysis-002',
    description: 'Systolic blood pressure in mmHg',
    field_label: 'Systolic Blood Pressure (mmHg)',
    field_name: 'SYSBP_VAL',
    form_name: 'Vital Signs',
    id: 'src-006',
    type: 'Num'
  },
  {
    analysisId: 'analysis-002',
    description: 'Diastolic blood pressure in mmHg',
    field_label: 'Diastolic Blood Pressure (mmHg)',
    field_name: 'DIABP_VAL',
    form_name: 'Vital Signs',
    id: 'src-007',
    type: 'Num'
  },
  // analysis-003 (Interim Analysis 2) 的源字段
  {
    analysisId: 'analysis-003',
    description: 'Date when the adverse event started',
    field_label: 'AE Start Date',
    field_name: 'AESTDT',
    form_name: 'Adverse Events',
    id: 'src-008',
    type: 'Date'
  },
  {
    analysisId: 'analysis-003',
    description: 'Hemoglobin concentration',
    field_label: 'Hemoglobin (g/dL)',
    field_name: 'HGB_VAL',
    form_name: 'Laboratory',
    id: 'src-009',
    type: 'Num'
  },
  {
    analysisId: 'analysis-003',
    description: 'White blood cell count',
    field_label: 'WBC Count (10^9/L)',
    field_name: 'WBC_VAL',
    form_name: 'Laboratory',
    id: 'src-010',
    type: 'Num'
  }
];

/** 映射详情数据 - 1:N 结构，支持多模态推导 */
export const mappingDetailsMap: MappingDetailsMap = {
  // SUBJID -> 单个映射
  'src-001': [
    {
      created_at: '2024-01-10T09:00:00Z',
      derivation: {
        nl: '直接将源数据中的受试者标识符赋值给目标变量',
        r: `# 直接赋值
df$SUBJID <- df$SDR_SUBJID`,
        sas: `/* 直接赋值 */
SUBJID = SDR_SUBJID;`
      },
      id: 'map-001',
      programmer_name: 'John Smith',
      status: 'In_Production',
      target_domain: 'DM',
      target_variable: 'SUBJID',
      updated_at: '2024-01-15T14:30:00Z'
    }
  ],

  // AGE -> 多个映射 (1:N 示例)
  'src-002': [
    {
      created_at: '2024-01-10T10:00:00Z',
      derivation: {
        nl: '如果年龄大于0，则将源数据中的年龄赋值给目标变量',
        r: `# 年龄映射逻辑
df$AGE <- dplyr::if_else(df$SDR_AGE > 0, df$SDR_AGE, NA_real_)`,
        sas: `/* 年龄映射逻辑 */
IF AGE > 0 THEN DO;
  AGE = SDR_AGE;
END;`
      },
      id: 'map-002-a',
      programmer_name: 'John Smith',
      status: 'In_Production',
      target_domain: 'DM',
      target_variable: 'AGE',
      updated_at: '2024-01-14T11:20:00Z'
    },
    {
      created_at: '2024-01-12T09:00:00Z',
      derivation: {
        nl: '如果测试代码为AGE，则将年龄转换为字符型结果值',
        r: `# 疾病特征年龄映射
df <- df %>%
  dplyr::mutate(
    DCORRES = dplyr::if_else(DCTESTCD == "AGE",
                             as.character(SDR_AGE),
                             DCORRES),
    DCORRESU = dplyr::if_else(DCTESTCD == "AGE",
                              "YEARS",
                              DCORRESU)
  )`,
        sas: `/* 疾病特征年龄映射 */
IF DCTESTCD = "AGE" THEN DO;
  DCORRES = PUT(SDR_AGE, 3.);
  DCORRESU = "YEARS";
END;`
      },
      id: 'map-002-b',
      programmer_name: 'Jane Doe',
      status: 'QCing',
      target_domain: 'DC',
      target_variable: 'DCORRES',
      updated_at: '2024-01-13T15:45:00Z'
    }
  ],

  // SEX -> 单个映射
  'src-003': [
    {
      created_at: '2024-01-11T09:00:00Z',
      derivation: {
        nl: '如果性别为M、F或U，则直接赋值给目标变量',
        r: `# 性别映射逻辑
valid_sex <- c('M', 'F', 'U')
df$SEX <- dplyr::if_else(df$SDR_SEX %in% valid_sex,
                          df$SDR_SEX,
                          NA_character_)`,
        sas: `/* 性别映射逻辑 */
IF SDR_SEX IN ('M', 'F', 'U') THEN DO;
  SEX = SDR_SEX;
END;`
      },
      id: 'map-003',
      programmer_name: 'Admin',
      status: 'Draft',
      target_domain: 'DM',
      target_variable: 'SEX',
      updated_at: '2024-01-11T09:00:00Z'
    }
  ],

  // HR_VAL -> 单个映射
  'src-005': [
    {
      created_at: '2024-01-12T09:00:00Z',
      derivation: {
        nl: '如果测试代码为HR，则取其心率结果值，并设置单位和测试名称',
        r: `# 心率映射逻辑
df <- df %>%
  dplyr::mutate(
    VSORRES = dplyr::if_else(VSTESTCD == "HR", HR_VAL, VSORRES),
    VSORRESU = dplyr::if_else(VSTESTCD == "HR", "beats/min", VSORRESU),
    VSTEST = dplyr::if_else(VSTESTCD == "HR", "Heart Rate", VSTEST)
  )`,
        sas: `/* 心率映射逻辑 */
IF VSTESTCD = "HR" THEN DO;
  VSORRES = HR_VAL;
  VSORRESU = "beats/min";
  VSTEST = "Heart Rate";
END;`
      },
      id: 'map-005',
      programmer_name: 'Admin',
      status: 'Draft',
      target_domain: 'VS',
      target_variable: 'VSORRES',
      updated_at: '2024-01-12T09:00:00Z'
    }
  ]
};

/** SDTM Domain 列表 */
export const sdtmDomains = [
  { label: 'DM - Demographics', value: 'DM' },
  { label: 'VS - Vital Signs', value: 'VS' },
  { label: 'AE - Adverse Events', value: 'AE' },
  { label: 'LB - Laboratory Tests', value: 'LB' },
  { label: 'DC - Disease Characteristics', value: 'DC' },
  { label: 'EX - Exposure', value: 'EX' },
  { label: 'MH - Medical History', value: 'MH' },
  { label: 'CM - Concomitant Medications', value: 'CM' },
  { label: 'DS - Disposition', value: 'DS' }
];

/** 状态配置 */
export const statusConfig: Record<MappingStatus, { color: string; label: string }> = {
  Draft: { color: 'blue', label: 'Draft' },
  In_Production: { color: 'green', label: 'In Production' },
  Locked: { color: 'purple', label: 'Locked' },
  QCing: { color: 'orange', label: 'QCing' }
};

/** 生成唯一 ID */
export const generateMappingId = () => `map-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** 创建空白映射 */
export const createEmptyMapping = (programmerName: string = 'Admin'): MappingItem => ({
  created_at: new Date().toISOString(),
  derivation: {
    nl: '',
    r: '',
    sas: ''
  },
  id: generateMappingId(),
  programmer_name: programmerName,
  status: 'Draft',
  target_domain: '',
  target_variable: '',
  updated_at: new Date().toISOString()
});

/** 根据分析批次 ID 获取源字段 */
export const getSourceFieldsByAnalysis = (analysisId: string): SourceField[] => {
  return sourceFields.filter(field => field.analysisId === analysisId);
};
