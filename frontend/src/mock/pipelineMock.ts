/**
 * Pipeline Management - Comprehensive Mock Data System
 *
 * 用于全面测试 pipeline-management 页面的 4 个核心 Tabs 以及全局 Shared Context 的联动功能
 *
 * 层级结构：TA -> Product (Compound) -> Study -> Analysis
 */

// ==================== 核心类型定义 ====================

/** 治疗领域 (Therapeutic Area) */
export interface ITherapeuticArea {
  code: string;
  createdAt: string;
  description?: string;
  id: string;
  name: string;
  status: 'Active' | 'Archived';
  updatedAt: string;
}

/** 产品 (Product/Compound) */
export interface IProduct {
  code: string;
  createdAt: string;
  id: string;
  indication: string;
  mechanismOfAction?: string;
  name: string;
  status: 'Active' | 'Archived';
  taId: string;
  updatedAt: string;
}

/** 临床研究 (Study) */
export interface IStudy {
  createdAt: string;
  currentEnrollment: number;
  estimatedEndDate?: string;
  id: string;
  lifecycleStatus: 'Active' | 'Draft' | 'Locked';
  phase: 'Phase I' | 'Phase I/II' | 'Phase II' | 'Phase II/III' | 'Phase III' | 'Phase IV';
  productId: string;
  protocolNumber: string;
  protocolTitle: string;
  startDate?: string;
  status: 'Active' | 'Archived' | 'Completed';
  studyCode: string;
  targetEnrollment: number;
  therapeuticIndication: string;
  updatedAt: string;
}

/** 分析批次 (Analysis) */
export interface IAnalysis {
  createdAt: string;
  description?: string;
  id: string;
  lifecycleStatus: 'Active' | 'Draft' | 'Locked';
  lockedAt?: string;
  lockedBy?: string;
  name: string;
  status: 'Active' | 'Archived' | 'Completed' | 'Planned';
  studyId: string;
  type: 'Efficacy' | 'Exploratory' | 'Interim' | 'Primary' | 'Safety';
  updatedAt: string;
}

/** 研究配置 (Study Configuration) */
export interface IStudyConfiguration {
  adamIgVersion: string;
  adamModelVersion: string;
  blindingStatus: 'Double Blind' | 'Open Label' | 'Single Blind';
  controlType: 'Active Control' | 'Dose Comparison' | 'No Control' | 'Placebo';
  createdAt: string;
  dataCollectionSystem: string;
  ecrfVersion?: string;
  id: string;
  indNumber?: string;
  meddraVersion: string;
  randomizationMethod?: string;
  regulatoryAgency: 'EMA' | 'FDA' | 'Health Canada' | 'NMPA' | 'PMDA';
  sdtmIgVersion: string;
  sdtmModelVersion: string;
  studyDesign: 'Crossover' | 'Factorial' | 'Parallel' | 'Single Group';
  studyId: string;
  updatedAt: string;
  whodrugVersion: string;
}

/** 执行作业 (Execution Job) */
export interface IExecutionJob {
  analysisId: string;
  createdAt: string;
  duration?: number;
  endTime?: string;
  environment: 'Development' | 'Production' | 'UAT';
  error?: string;
  id: string;
  name: string;
  parameters?: Record<string, string>;
  pipelineType:
    | 'ADaM Derivation'
    | 'Data Import'
    | 'Define.xml'
    | 'QC Validation'
    | 'SDTM Generation'
    | 'TFL Production';
  priority: 'High' | 'Low' | 'Normal';
  progress: number;
  startTime: string;
  status: 'Cancelled' | 'Failed' | 'Queued' | 'Running' | 'Success';
  triggeredBy: string;
}

/** 扩展的里程碑接口 */
export interface IExtendedMilestone {
  actualDate: string | null;
  analysisId?: string;
  assignee?: string;
  category: 'Analysis' | 'Data Collection' | 'Enrollment' | 'Operational' | 'Regulatory';
  comment?: string;
  createdAt: string;
  criticalPath: boolean;
  dependencies?: string[];
  id: string;
  level: 'Analysis' | 'Study';
  name: string;
  plannedDate: string | null;
  presetType: 'CUSTOM' | 'DBL' | 'DCO' | 'FPI' | 'LPI' | 'SNAPSHOT';
  status: 'AtRisk' | 'Completed' | 'Delayed' | 'OnTrack' | 'Pending';
  studyId: string;
  updatedAt: string;
}

// ==================== 基础层级数据 ====================

export const therapeuticAreas: ITherapeuticArea[] = [
  {
    code: 'ONC',
    createdAt: '2023-01-15',
    description: '肿瘤治疗领域',
    id: 'ta-001',
    name: 'Oncology',
    status: 'Active',
    updatedAt: '2024-06-20'
  },
  {
    code: 'IMM',
    createdAt: '2023-02-20',
    description: '免疫治疗领域',
    id: 'ta-002',
    name: 'Immunology',
    status: 'Active',
    updatedAt: '2024-05-15'
  },
  {
    code: 'NEU',
    createdAt: '2023-06-10',
    description: '神经科学领域',
    id: 'ta-003',
    name: 'Neurology',
    status: 'Active',
    updatedAt: '2024-03-01'
  }
];

export const products: IProduct[] = [
  {
    code: 'ZL1310',
    createdAt: '2023-03-01',
    id: 'prod-001',
    indication: 'Non-Small Cell Lung Cancer (NSCLC)',
    mechanismOfAction: 'EGFR-Targeted ADC',
    name: 'ZL-1310',
    status: 'Active',
    taId: 'ta-001',
    updatedAt: '2024-06-15'
  },
  {
    code: 'ZL1501',
    createdAt: '2023-05-15',
    id: 'prod-002',
    indication: 'Triple-Negative Breast Cancer (TNBC)',
    mechanismOfAction: 'PD-L1 Inhibitor',
    name: 'ZL-1501',
    status: 'Active',
    taId: 'ta-001',
    updatedAt: '2024-04-20'
  },
  {
    code: 'ZL1201',
    createdAt: '2024-01-10',
    id: 'prod-003',
    indication: 'Small Cell Lung Cancer (SCLC)',
    mechanismOfAction: 'DLL3-Targeted ADC',
    name: 'ZL-1201',
    status: 'Active',
    taId: 'ta-001',
    updatedAt: '2024-06-01'
  },
  {
    code: 'ZL2201',
    createdAt: '2023-04-20',
    id: 'prod-004',
    indication: 'Rheumatoid Arthritis',
    mechanismOfAction: 'IL-6 Receptor Antagonist',
    name: 'ZL-2201',
    status: 'Active',
    taId: 'ta-002',
    updatedAt: '2024-05-10'
  },
  {
    code: 'ZL2301',
    createdAt: '2023-07-15',
    id: 'prod-005',
    indication: 'Psoriasis',
    mechanismOfAction: 'IL-17A Inhibitor',
    name: 'ZL-2301',
    status: 'Active',
    taId: 'ta-002',
    updatedAt: '2024-02-28'
  },
  {
    code: 'ZL3101',
    createdAt: '2023-09-01',
    id: 'prod-006',
    indication: "Alzheimer's Disease",
    mechanismOfAction: 'Amyloid Beta Antibody',
    name: 'ZL-3101',
    status: 'Active',
    taId: 'ta-003',
    updatedAt: '2024-06-10'
  }
];

export const studies: IStudy[] = [
  {
    createdAt: '2023-10-15',
    currentEnrollment: 148,
    estimatedEndDate: '2025-12-31',
    id: 'study-001',
    lifecycleStatus: 'Locked',
    phase: 'Phase II',
    productId: 'prod-001',
    protocolNumber: 'PROTO-2023-001',
    protocolTitle: 'A Phase II Study of ZL-1310 in Advanced NSCLC',
    startDate: '2024-01-15',
    status: 'Active',
    studyCode: 'ZL-1310-001',
    targetEnrollment: 150,
    therapeuticIndication: 'Advanced NSCLC',
    updatedAt: '2024-06-10'
  },
  {
    createdAt: '2024-03-01',
    currentEnrollment: 125,
    estimatedEndDate: '2026-12-31',
    id: 'study-002',
    lifecycleStatus: 'Active',
    phase: 'Phase III',
    productId: 'prod-001',
    protocolNumber: 'PROTO-2024-001',
    protocolTitle: 'A Phase III Study of ZL-1310 vs Standard of Care',
    startDate: '2024-06-01',
    status: 'Active',
    studyCode: 'ZL-1310-002',
    targetEnrollment: 500,
    therapeuticIndication: 'First-line NSCLC',
    updatedAt: '2024-06-20'
  },
  {
    createdAt: '2022-04-01',
    currentEnrollment: 52,
    estimatedEndDate: '2023-12-31',
    id: 'study-003',
    lifecycleStatus: 'Locked',
    phase: 'Phase I',
    productId: 'prod-001',
    protocolNumber: 'PROTO-2022-001',
    protocolTitle: 'A Phase I Dose-Escalation Study',
    startDate: '2022-06-01',
    status: 'Completed',
    studyCode: 'ZL-1310-101',
    targetEnrollment: 50,
    therapeuticIndication: 'Advanced Solid Tumors',
    updatedAt: '2024-01-15'
  },
  {
    createdAt: '2023-11-20',
    currentEnrollment: 45,
    estimatedEndDate: '2025-09-30',
    id: 'study-004',
    lifecycleStatus: 'Active',
    phase: 'Phase II',
    productId: 'prod-002',
    protocolNumber: 'PROTO-2023-005',
    protocolTitle: 'A Phase II Study of ZL-1501 in TNBC',
    startDate: '2024-03-01',
    status: 'Active',
    studyCode: 'ZL-1501-001',
    targetEnrollment: 120,
    therapeuticIndication: 'TNBC',
    updatedAt: '2024-06-15'
  },
  {
    createdAt: '2024-04-15',
    currentEnrollment: 0,
    estimatedEndDate: '2026-03-31',
    id: 'study-005',
    lifecycleStatus: 'Draft',
    phase: 'Phase I/II',
    productId: 'prod-003',
    protocolNumber: 'PROTO-2024-003',
    protocolTitle: 'A Phase I/II Study in SCLC',
    startDate: '2024-09-01',
    status: 'Active',
    studyCode: 'ZL-1201-001',
    targetEnrollment: 80,
    therapeuticIndication: 'SCLC',
    updatedAt: '2024-06-01'
  },
  {
    createdAt: '2023-06-15',
    currentEnrollment: 320,
    estimatedEndDate: '2025-06-30',
    id: 'study-006',
    lifecycleStatus: 'Active',
    phase: 'Phase III',
    productId: 'prod-004',
    protocolNumber: 'PROTO-2023-008',
    protocolTitle: 'A Phase III Study in Rheumatoid Arthritis',
    startDate: '2023-09-01',
    status: 'Active',
    studyCode: 'ZL-2201-001',
    targetEnrollment: 600,
    therapeuticIndication: 'Rheumatoid Arthritis',
    updatedAt: '2024-06-18'
  },
  {
    createdAt: '2023-08-01',
    currentEnrollment: 450,
    estimatedEndDate: '2027-12-31',
    id: 'study-007',
    lifecycleStatus: 'Active',
    phase: 'Phase III',
    productId: 'prod-006',
    protocolNumber: 'PROTO-2023-012',
    protocolTitle: "A Phase III Study in Early Alzheimer's Disease",
    startDate: '2024-01-01',
    status: 'Active',
    studyCode: 'ZL-3101-001',
    targetEnrollment: 1000,
    therapeuticIndication: "Early Alzheimer's Disease",
    updatedAt: '2024-06-20'
  }
];

export const analyses: IAnalysis[] = [
  {
    createdAt: '2024-03-01',
    description: 'First interim analysis for safety and efficacy',
    id: 'analysis-001',
    lifecycleStatus: 'Locked',
    lockedAt: '2024-05-20T10:00:00Z',
    lockedBy: 'dr.smith@pharma.com',
    name: 'Interim Analysis 1',
    status: 'Active',
    studyId: 'study-001',
    type: 'Interim',
    updatedAt: '2024-05-20'
  },
  {
    createdAt: '2024-03-01',
    description: 'Primary efficacy analysis',
    id: 'analysis-002',
    lifecycleStatus: 'Draft',
    name: 'Final Analysis',
    status: 'Planned',
    studyId: 'study-001',
    type: 'Primary',
    updatedAt: '2024-06-01'
  },
  {
    createdAt: '2024-04-15',
    description: 'Quarterly safety data update',
    id: 'analysis-003',
    lifecycleStatus: 'Active',
    name: 'Safety Update',
    status: 'Active',
    studyId: 'study-001',
    type: 'Safety',
    updatedAt: '2024-06-15'
  },
  {
    createdAt: '2024-06-15',
    description: 'First planned interim for efficacy',
    id: 'analysis-004',
    lifecycleStatus: 'Draft',
    name: 'Interim Analysis 1',
    status: 'Planned',
    studyId: 'study-002',
    type: 'Interim',
    updatedAt: '2024-06-20'
  },
  {
    createdAt: '2023-06-01',
    description: 'Primary analysis for Phase I',
    id: 'analysis-005',
    lifecycleStatus: 'Locked',
    lockedAt: '2024-01-15T14:00:00Z',
    lockedBy: 'biostat.lead@pharma.com',
    name: 'Primary Analysis',
    status: 'Completed',
    studyId: 'study-003',
    type: 'Primary',
    updatedAt: '2024-01-15'
  },
  {
    createdAt: '2024-05-01',
    description: 'First interim for TNBC study',
    id: 'analysis-006',
    lifecycleStatus: 'Active',
    name: 'Interim Analysis',
    status: 'Active',
    studyId: 'study-004',
    type: 'Interim',
    updatedAt: '2024-06-15'
  },
  {
    createdAt: '2024-01-15',
    description: 'First interim analysis for RA study',
    id: 'analysis-007',
    lifecycleStatus: 'Locked',
    lockedAt: '2024-04-01T09:00:00Z',
    lockedBy: 'stat.lead@pharma.com',
    name: 'Interim Analysis 1',
    status: 'Completed',
    studyId: 'study-006',
    type: 'Interim',
    updatedAt: '2024-04-01'
  },
  {
    createdAt: '2024-05-15',
    description: 'Second interim analysis',
    id: 'analysis-008',
    lifecycleStatus: 'Active',
    name: 'Interim Analysis 2',
    status: 'Active',
    studyId: 'study-006',
    type: 'Interim',
    updatedAt: '2024-06-10'
  },
  {
    createdAt: '2024-04-01',
    description: "First interim for Alzheimer's study",
    id: 'analysis-009',
    lifecycleStatus: 'Active',
    name: 'Interim Analysis 1',
    status: 'Active',
    studyId: 'study-007',
    type: 'Interim',
    updatedAt: '2024-06-01'
  }
];

// ==================== 研究配置数据 ====================

export const studyConfigurations: IStudyConfiguration[] = [
  {
    adamIgVersion: 'ADaMIG v1.4',
    adamModelVersion: 'ADaM v1.3',
    blindingStatus: 'Open Label',
    controlType: 'No Control',
    createdAt: '2023-10-20',
    dataCollectionSystem: 'Medidata Rave',
    ecrfVersion: 'v2.3',
    id: 'config-001',
    indNumber: 'IND-123456',
    meddraVersion: 'MedDRA 26.1',
    randomizationMethod: 'N/A - Single Arm',
    regulatoryAgency: 'FDA',
    sdtmIgVersion: 'SDTMIG v3.4',
    sdtmModelVersion: 'SDTM v1.9',
    studyDesign: 'Parallel',
    studyId: 'study-001',
    updatedAt: '2024-05-15',
    whodrugVersion: 'WHODrug Global 5.1'
  },
  {
    adamIgVersion: 'ADaMIG v1.4',
    adamModelVersion: 'ADaM v1.3',
    blindingStatus: 'Double Blind',
    controlType: 'Active Control',
    createdAt: '2024-03-10',
    dataCollectionSystem: 'Medidata Rave',
    ecrfVersion: 'v1.0',
    id: 'config-002',
    indNumber: 'IND-123789',
    meddraVersion: 'MedDRA 26.1',
    randomizationMethod: 'Stratified Block Randomization',
    regulatoryAgency: 'FDA',
    sdtmIgVersion: 'SDTMIG v3.4',
    sdtmModelVersion: 'SDTM v1.9',
    studyDesign: 'Parallel',
    studyId: 'study-002',
    updatedAt: '2024-06-01',
    whodrugVersion: 'WHODrug Global 5.1'
  },
  {
    adamIgVersion: 'ADaMIG v1.3',
    adamModelVersion: 'ADaM v1.2',
    blindingStatus: 'Open Label',
    controlType: 'No Control',
    createdAt: '2022-04-15',
    dataCollectionSystem: 'Oracle InForm',
    ecrfVersion: 'v3.0',
    id: 'config-003',
    indNumber: 'IND-120001',
    meddraVersion: 'MedDRA 26.0',
    regulatoryAgency: 'FDA',
    sdtmIgVersion: 'SDTMIG v3.3',
    sdtmModelVersion: 'SDTM v1.8',
    studyDesign: 'Single Group',
    studyId: 'study-003',
    updatedAt: '2023-12-01',
    whodrugVersion: 'WHODrug Global 5.0'
  },
  {
    adamIgVersion: 'ADaMIG v1.4',
    adamModelVersion: 'ADaM v1.3',
    blindingStatus: 'Double Blind',
    controlType: 'Placebo',
    createdAt: '2023-12-01',
    dataCollectionSystem: 'Medidata Rave',
    ecrfVersion: 'v1.2',
    id: 'config-004',
    indNumber: 'IND-124001',
    meddraVersion: 'MedDRA 26.1',
    randomizationMethod: 'Central Randomization',
    regulatoryAgency: 'FDA',
    sdtmIgVersion: 'SDTMIG v3.4',
    sdtmModelVersion: 'SDTM v1.9',
    studyDesign: 'Parallel',
    studyId: 'study-004',
    updatedAt: '2024-05-20',
    whodrugVersion: 'WHODrug Global 5.1'
  },
  {
    adamIgVersion: 'ADaMIG v1.4',
    adamModelVersion: 'ADaM v1.3',
    blindingStatus: 'Double Blind',
    controlType: 'Active Control',
    createdAt: '2023-07-01',
    dataCollectionSystem: 'Veeva Vault EDC',
    ecrfVersion: 'v2.0',
    id: 'config-005',
    indNumber: 'EMA-2201-001',
    meddraVersion: 'MedDRA 26.1',
    randomizationMethod: 'Permuted Block',
    regulatoryAgency: 'EMA',
    sdtmIgVersion: 'SDTMIG v3.4',
    sdtmModelVersion: 'SDTM v1.9',
    studyDesign: 'Parallel',
    studyId: 'study-006',
    updatedAt: '2024-06-01',
    whodrugVersion: 'WHODrug Global 5.1'
  },
  {
    adamIgVersion: 'ADaMIG v1.4',
    adamModelVersion: 'ADaM v1.3',
    blindingStatus: 'Double Blind',
    controlType: 'Placebo',
    createdAt: '2023-08-15',
    dataCollectionSystem: 'Medidata Rave',
    ecrfVersion: 'v1.5',
    id: 'config-006',
    indNumber: 'IND-131001',
    meddraVersion: 'MedDRA 26.1',
    randomizationMethod: 'Stratified Permuted Block',
    regulatoryAgency: 'FDA',
    sdtmIgVersion: 'SDTMIG v3.4',
    sdtmModelVersion: 'SDTM v1.9',
    studyDesign: 'Parallel',
    studyId: 'study-007',
    updatedAt: '2024-06-10',
    whodrugVersion: 'WHODrug Global 5.1'
  }
];

// ==================== 里程碑数据 ====================

export const milestones: IExtendedMilestone[] = [
  // Study-001 Milestones
  {
    actualDate: '2024-01-20',
    assignee: 'Dr. Sarah Chen',
    category: 'Enrollment',
    comment: 'Slight delay due to site activation',
    createdAt: '2023-11-01T10:00:00Z',
    criticalPath: true,
    id: 'ms-fpi-001',
    level: 'Study',
    name: 'First Patient In (FPI)',
    plannedDate: '2024-01-15',
    presetType: 'FPI',
    status: 'Completed',
    studyId: 'study-001',
    updatedAt: '2024-01-20T16:30:00Z'
  },
  {
    actualDate: '2024-07-05',
    assignee: 'Dr. Sarah Chen',
    category: 'Enrollment',
    createdAt: '2023-11-01T10:00:00Z',
    criticalPath: true,
    dependencies: ['ms-fpi-001'],
    id: 'ms-lpi-001',
    level: 'Study',
    name: 'Last Patient In (LPI)',
    plannedDate: '2024-06-30',
    presetType: 'LPI',
    status: 'Completed',
    studyId: 'study-001',
    updatedAt: '2024-07-05T18:00:00Z'
  },
  {
    actualDate: null,
    assignee: 'Dr. Sarah Chen',
    category: 'Enrollment',
    createdAt: '2024-01-01T10:00:00Z',
    criticalPath: true,
    dependencies: ['ms-lpi-001'],
    id: 'ms-lpo-001',
    level: 'Study',
    name: 'Last Patient Out (LPO)',
    plannedDate: '2025-03-31',
    presetType: 'CUSTOM',
    status: 'OnTrack',
    studyId: 'study-001',
    updatedAt: '2024-06-15T09:00:00Z'
  },
  // Analysis-001 Milestones
  {
    actualDate: '2024-05-15',
    analysisId: 'analysis-001',
    assignee: 'Data Management Team',
    category: 'Data Collection',
    createdAt: '2024-03-01T14:00:00Z',
    criticalPath: true,
    id: 'ms-snapshot-001',
    level: 'Analysis',
    name: 'Data Snapshot',
    plannedDate: '2024-05-15',
    presetType: 'SNAPSHOT',
    status: 'Completed',
    studyId: 'study-001',
    updatedAt: '2024-05-15T20:00:00Z'
  },
  {
    actualDate: '2024-05-18',
    analysisId: 'analysis-001',
    assignee: 'Data Management Team',
    category: 'Data Collection',
    createdAt: '2024-03-01T14:00:00Z',
    criticalPath: true,
    dependencies: ['ms-snapshot-001'],
    id: 'ms-dco-001',
    level: 'Analysis',
    name: 'Data Cut-Off (DCO)',
    plannedDate: '2024-05-18',
    presetType: 'DCO',
    status: 'Completed',
    studyId: 'study-001',
    updatedAt: '2024-05-18T17:00:00Z'
  },
  {
    actualDate: '2024-05-20',
    analysisId: 'analysis-001',
    assignee: 'Database Team',
    category: 'Data Collection',
    comment: 'DBL completed for interim analysis',
    createdAt: '2024-03-01T14:00:00Z',
    criticalPath: true,
    dependencies: ['ms-dco-001'],
    id: 'ms-dbl-001',
    level: 'Analysis',
    name: 'Database Lock (DBL)',
    plannedDate: '2024-05-20',
    presetType: 'DBL',
    status: 'Completed',
    studyId: 'study-001',
    updatedAt: '2024-05-20T10:00:00Z'
  },
  {
    actualDate: '2024-05-26',
    analysisId: 'analysis-001',
    assignee: 'Programming Team',
    category: 'Analysis',
    createdAt: '2024-03-01T14:00:00Z',
    criticalPath: true,
    dependencies: ['ms-dbl-001'],
    id: 'ms-sdtm-001',
    level: 'Analysis',
    name: 'SDTM Submission Package',
    plannedDate: '2024-05-25',
    presetType: 'CUSTOM',
    status: 'Completed',
    studyId: 'study-001',
    updatedAt: '2024-05-26T15:00:00Z'
  },
  {
    actualDate: '2024-05-30',
    analysisId: 'analysis-001',
    assignee: 'Biostatistics Team',
    category: 'Analysis',
    createdAt: '2024-03-01T14:00:00Z',
    criticalPath: true,
    dependencies: ['ms-sdtm-001'],
    id: 'ms-adam-001',
    level: 'Analysis',
    name: 'ADaM Dataset Finalization',
    plannedDate: '2024-05-30',
    presetType: 'CUSTOM',
    status: 'Completed',
    studyId: 'study-001',
    updatedAt: '2024-05-30T12:00:00Z'
  },
  // Analysis-002 Milestones (Planned)
  {
    actualDate: null,
    analysisId: 'analysis-002',
    assignee: 'Database Team',
    category: 'Data Collection',
    createdAt: '2024-06-01T10:00:00Z',
    criticalPath: true,
    id: 'ms-dbl-002',
    level: 'Analysis',
    name: 'Database Lock (DBL)',
    plannedDate: '2025-06-15',
    presetType: 'DBL',
    status: 'Pending',
    studyId: 'study-001',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  {
    actualDate: null,
    analysisId: 'analysis-002',
    assignee: 'Programming Team',
    category: 'Analysis',
    createdAt: '2024-06-01T10:00:00Z',
    criticalPath: true,
    dependencies: ['ms-dbl-002'],
    id: 'ms-tfl-002',
    level: 'Analysis',
    name: 'TFL Production Complete',
    plannedDate: '2025-07-31',
    presetType: 'CUSTOM',
    status: 'Pending',
    studyId: 'study-001',
    updatedAt: '2024-06-01T10:00:00Z'
  },
  // Study-002 Milestones
  {
    actualDate: '2024-06-05',
    assignee: 'Dr. Michael Lee',
    category: 'Enrollment',
    createdAt: '2024-04-01T10:00:00Z',
    criticalPath: true,
    id: 'ms-fpi-002',
    level: 'Study',
    name: 'First Patient In (FPI)',
    plannedDate: '2024-06-01',
    presetType: 'FPI',
    status: 'Completed',
    studyId: 'study-002',
    updatedAt: '2024-06-05T14:00:00Z'
  },
  {
    actualDate: null,
    assignee: 'Dr. Michael Lee',
    category: 'Enrollment',
    createdAt: '2024-04-01T10:00:00Z',
    criticalPath: true,
    dependencies: ['ms-fpi-002'],
    id: 'ms-lpi-002',
    level: 'Study',
    name: 'Last Patient In (LPI)',
    plannedDate: '2025-06-30',
    presetType: 'LPI',
    status: 'OnTrack',
    studyId: 'study-002',
    updatedAt: '2024-06-20T09:00:00Z'
  },
  {
    actualDate: null,
    analysisId: 'analysis-004',
    assignee: 'Biostatistics Team',
    category: 'Analysis',
    createdAt: '2024-06-15T10:00:00Z',
    criticalPath: false,
    id: 'ms-interim-002',
    level: 'Analysis',
    name: 'Interim Analysis',
    plannedDate: '2025-03-31',
    presetType: 'CUSTOM',
    status: 'Pending',
    studyId: 'study-002',
    updatedAt: '2024-06-20T10:00:00Z'
  },
  // Study-003 Milestones (Completed)
  {
    actualDate: '2022-06-15',
    assignee: 'Dr. James Wilson',
    category: 'Enrollment',
    createdAt: '2022-04-01T10:00:00Z',
    criticalPath: true,
    id: 'ms-fpi-003',
    level: 'Study',
    name: 'First Patient In (FPI)',
    plannedDate: '2022-06-01',
    presetType: 'FPI',
    status: 'Completed',
    studyId: 'study-003',
    updatedAt: '2022-06-15T16:00:00Z'
  },
  {
    actualDate: '2024-01-15',
    analysisId: 'analysis-005',
    assignee: 'Database Team',
    category: 'Data Collection',
    createdAt: '2023-10-01T10:00:00Z',
    criticalPath: true,
    id: 'ms-dbl-003',
    level: 'Analysis',
    name: 'Database Lock (DBL)',
    plannedDate: '2024-01-10',
    presetType: 'DBL',
    status: 'Completed',
    studyId: 'study-003',
    updatedAt: '2024-01-15T12:00:00Z'
  },
  // Study-004 Milestones
  {
    actualDate: '2024-03-15',
    assignee: 'Dr. Emily Brown',
    category: 'Enrollment',
    createdAt: '2024-01-15T10:00:00Z',
    criticalPath: true,
    id: 'ms-fpi-004',
    level: 'Study',
    name: 'First Patient In (FPI)',
    plannedDate: '2024-03-01',
    presetType: 'FPI',
    status: 'Completed',
    studyId: 'study-004',
    updatedAt: '2024-03-15T14:00:00Z'
  },
  {
    actualDate: null,
    assignee: 'Dr. Emily Brown',
    category: 'Enrollment',
    comment: 'Enrollment slower than expected',
    createdAt: '2024-01-15T10:00:00Z',
    criticalPath: true,
    dependencies: ['ms-fpi-004'],
    id: 'ms-lpi-004',
    level: 'Study',
    name: 'Last Patient In (LPI)',
    plannedDate: '2024-12-31',
    presetType: 'LPI',
    status: 'AtRisk',
    studyId: 'study-004',
    updatedAt: '2024-06-15T09:00:00Z'
  },
  // Study-006 Milestones
  {
    actualDate: '2023-09-01',
    assignee: 'Dr. Anna Schmidt',
    category: 'Enrollment',
    createdAt: '2023-07-01T10:00:00Z',
    criticalPath: true,
    id: 'ms-fpi-006',
    level: 'Study',
    name: 'First Patient In (FPI)',
    plannedDate: '2023-09-01',
    presetType: 'FPI',
    status: 'Completed',
    studyId: 'study-006',
    updatedAt: '2023-09-01T10:00:00Z'
  },
  {
    actualDate: '2024-04-01',
    analysisId: 'analysis-007',
    assignee: 'Database Team',
    category: 'Data Collection',
    createdAt: '2024-01-15T10:00:00Z',
    criticalPath: true,
    id: 'ms-dbl-006-1',
    level: 'Analysis',
    name: 'Database Lock - Interim 1',
    plannedDate: '2024-04-01',
    presetType: 'DBL',
    status: 'Completed',
    studyId: 'study-006',
    updatedAt: '2024-04-01T16:00:00Z'
  },
  {
    actualDate: null,
    analysisId: 'analysis-008',
    assignee: 'Database Team',
    category: 'Data Collection',
    comment: 'Data quality issues under review',
    createdAt: '2024-05-15T10:00:00Z',
    criticalPath: true,
    id: 'ms-dbl-006-2',
    level: 'Analysis',
    name: 'Database Lock - Interim 2',
    plannedDate: '2024-08-01',
    presetType: 'DBL',
    status: 'Delayed',
    studyId: 'study-006',
    updatedAt: '2024-06-10T09:00:00Z'
  },
  // Study-007 Milestones
  {
    actualDate: '2024-01-10',
    assignee: 'Dr. Robert Kim',
    category: 'Enrollment',
    createdAt: '2023-10-01T10:00:00Z',
    criticalPath: true,
    id: 'ms-fpi-007',
    level: 'Study',
    name: 'First Patient In (FPI)',
    plannedDate: '2024-01-01',
    presetType: 'FPI',
    status: 'Completed',
    studyId: 'study-007',
    updatedAt: '2024-01-10T11:00:00Z'
  },
  {
    actualDate: null,
    assignee: 'Dr. Robert Kim',
    category: 'Enrollment',
    createdAt: '2023-10-01T10:00:00Z',
    criticalPath: true,
    dependencies: ['ms-fpi-007'],
    id: 'ms-lpi-007',
    level: 'Study',
    name: 'Last Patient In (LPI)',
    plannedDate: '2025-12-31',
    presetType: 'LPI',
    status: 'OnTrack',
    studyId: 'study-007',
    updatedAt: '2024-06-20T09:00:00Z'
  },
  {
    actualDate: null,
    analysisId: 'analysis-009',
    assignee: 'Database Team',
    category: 'Data Collection',
    createdAt: '2024-04-01T10:00:00Z',
    criticalPath: true,
    id: 'ms-dbl-007-1',
    level: 'Analysis',
    name: 'Database Lock - Interim 1',
    plannedDate: '2024-09-30',
    presetType: 'DBL',
    status: 'Pending',
    studyId: 'study-007',
    updatedAt: '2024-06-01T10:00:00Z'
  }
];

// ==================== 执行作业数据 ====================

export const executionJobs: IExecutionJob[] = [
  // Analysis-001 Jobs
  {
    analysisId: 'analysis-001',
    createdAt: '2024-05-20T10:00:00Z',
    duration: 720,
    endTime: '2024-05-20T10:12:00Z',
    environment: 'Production',
    id: 'job-001',
    name: 'SDTM Migration - DM Domain',
    pipelineType: 'SDTM Generation',
    priority: 'High',
    progress: 100,
    startTime: '2024-05-20T10:00:00Z',
    status: 'Success',
    triggeredBy: 'john.doe@pharma.com'
  },
  {
    analysisId: 'analysis-001',
    createdAt: '2024-05-20T10:15:00Z',
    duration: 780,
    endTime: '2024-05-20T10:28:00Z',
    environment: 'Production',
    id: 'job-002',
    name: 'SDTM Migration - AE Domain',
    pipelineType: 'SDTM Generation',
    priority: 'High',
    progress: 100,
    startTime: '2024-05-20T10:15:00Z',
    status: 'Success',
    triggeredBy: 'john.doe@pharma.com'
  },
  {
    analysisId: 'analysis-001',
    createdAt: '2024-05-20T10:30:00Z',
    duration: 900,
    endTime: '2024-05-20T10:45:00Z',
    environment: 'Production',
    id: 'job-003',
    name: 'SDTM Migration - LB Domain',
    pipelineType: 'SDTM Generation',
    priority: 'Normal',
    progress: 100,
    startTime: '2024-05-20T10:30:00Z',
    status: 'Success',
    triggeredBy: 'john.doe@pharma.com'
  },
  {
    analysisId: 'analysis-001',
    createdAt: '2024-05-21T09:00:00Z',
    duration: 900,
    endTime: '2024-05-21T09:15:00Z',
    environment: 'Production',
    id: 'job-004',
    name: 'ADaM ADSL Derivation',
    pipelineType: 'ADaM Derivation',
    priority: 'High',
    progress: 100,
    startTime: '2024-05-21T09:00:00Z',
    status: 'Success',
    triggeredBy: 'jane.smith@pharma.com'
  },
  {
    analysisId: 'analysis-001',
    createdAt: '2024-05-22T14:00:00Z',
    duration: 2700,
    endTime: '2024-05-22T14:45:00Z',
    environment: 'Production',
    id: 'job-005',
    name: 'TFL Production - Primary Efficacy',
    pipelineType: 'TFL Production',
    priority: 'High',
    progress: 100,
    startTime: '2024-05-22T14:00:00Z',
    status: 'Success',
    triggeredBy: 'stat.lead@pharma.com'
  },
  {
    analysisId: 'analysis-001',
    createdAt: '2024-05-23T10:00:00Z',
    duration: 5400,
    endTime: '2024-05-23T11:30:00Z',
    environment: 'Production',
    id: 'job-006',
    name: 'QC Validation - All Domains',
    pipelineType: 'QC Validation',
    priority: 'High',
    progress: 100,
    startTime: '2024-05-23T10:00:00Z',
    status: 'Success',
    triggeredBy: 'qc.lead@pharma.com'
  },
  {
    analysisId: 'analysis-001',
    createdAt: '2024-05-23T14:00:00Z',
    duration: 600,
    endTime: '2024-05-23T14:10:00Z',
    environment: 'Production',
    id: 'job-007',
    name: 'Define.xml Generation',
    pipelineType: 'Define.xml',
    priority: 'Normal',
    progress: 100,
    startTime: '2024-05-23T14:00:00Z',
    status: 'Success',
    triggeredBy: 'john.doe@pharma.com'
  },
  // Analysis-003 Jobs (Running)
  {
    analysisId: 'analysis-003',
    createdAt: '2024-06-15T08:00:00Z',
    environment: 'Production',
    id: 'job-008',
    name: 'SDTM Update - Safety Domains',
    pipelineType: 'SDTM Generation',
    priority: 'High',
    progress: 67,
    startTime: '2024-06-15T08:00:00Z',
    status: 'Running',
    triggeredBy: 'safety.lead@pharma.com'
  },
  {
    analysisId: 'analysis-003',
    createdAt: '2024-06-15T08:30:00Z',
    environment: 'Production',
    id: 'job-009',
    name: 'ADaM Safety Update',
    pipelineType: 'ADaM Derivation',
    priority: 'Normal',
    progress: 0,
    startTime: '2024-06-15T09:00:00Z',
    status: 'Queued',
    triggeredBy: 'safety.lead@pharma.com'
  },
  // Analysis-006 Jobs
  {
    analysisId: 'analysis-006',
    createdAt: '2024-06-10T10:00:00Z',
    duration: 1800,
    endTime: '2024-06-10T10:30:00Z',
    environment: 'Production',
    id: 'job-010',
    name: 'SDTM Migration - Oncology Domains',
    pipelineType: 'SDTM Generation',
    priority: 'High',
    progress: 100,
    startTime: '2024-06-10T10:00:00Z',
    status: 'Success',
    triggeredBy: 'oncology.stat@pharma.com'
  },
  {
    analysisId: 'analysis-006',
    createdAt: '2024-06-12T14:00:00Z',
    duration: 900,
    endTime: '2024-06-12T14:15:00Z',
    environment: 'Production',
    error: 'Error: Missing required variable TRT01P in ADSL',
    id: 'job-011',
    name: 'TFL Production - Interim',
    pipelineType: 'TFL Production',
    priority: 'High',
    progress: 45,
    startTime: '2024-06-12T14:00:00Z',
    status: 'Failed',
    triggeredBy: 'oncology.stat@pharma.com'
  },
  {
    analysisId: 'analysis-006',
    createdAt: '2024-06-14T09:00:00Z',
    environment: 'Production',
    id: 'job-012',
    name: 'TFL Production - Interim (Retry)',
    pipelineType: 'TFL Production',
    priority: 'High',
    progress: 78,
    startTime: '2024-06-14T09:00:00Z',
    status: 'Running',
    triggeredBy: 'oncology.stat@pharma.com'
  },
  // Analysis-007 Jobs
  {
    analysisId: 'analysis-007',
    createdAt: '2024-03-25T08:00:00Z',
    duration: 3600,
    endTime: '2024-03-25T09:00:00Z',
    environment: 'Production',
    id: 'job-013',
    name: 'SDTM Generation - Full Submission',
    pipelineType: 'SDTM Generation',
    priority: 'High',
    progress: 100,
    startTime: '2024-03-25T08:00:00Z',
    status: 'Success',
    triggeredBy: 'ra.study@pharma.com'
  },
  {
    analysisId: 'analysis-007',
    createdAt: '2024-03-26T09:00:00Z',
    duration: 5400,
    endTime: '2024-03-26T10:30:00Z',
    environment: 'Production',
    id: 'job-014',
    name: 'ADaM Generation - Interim',
    pipelineType: 'ADaM Derivation',
    priority: 'High',
    progress: 100,
    startTime: '2024-03-26T09:00:00Z',
    status: 'Success',
    triggeredBy: 'ra.study@pharma.com'
  },
  // Analysis-008 Jobs
  {
    analysisId: 'analysis-008',
    createdAt: '2024-06-01T10:00:00Z',
    duration: 300,
    endTime: '2024-06-01T10:05:00Z',
    environment: 'UAT',
    error: 'Job cancelled - data quality issues detected',
    id: 'job-015',
    name: 'Data Import - EDC Extract',
    pipelineType: 'Data Import',
    priority: 'Normal',
    progress: 30,
    startTime: '2024-06-01T10:00:00Z',
    status: 'Cancelled',
    triggeredBy: 'data.mgmt@pharma.com'
  },
  // Analysis-009 Jobs
  {
    analysisId: 'analysis-009',
    createdAt: '2024-06-20T07:00:00Z',
    environment: 'Production',
    id: 'job-016',
    name: 'SDTM Generation - CNS Domains',
    pipelineType: 'SDTM Generation',
    priority: 'High',
    progress: 45,
    startTime: '2024-06-20T07:00:00Z',
    status: 'Running',
    triggeredBy: 'neuro.study@pharma.com'
  },
  {
    analysisId: 'analysis-009',
    createdAt: '2024-06-20T07:30:00Z',
    environment: 'Production',
    id: 'job-017',
    name: 'QC Validation - Baseline',
    pipelineType: 'QC Validation',
    priority: 'Normal',
    progress: 0,
    startTime: '2024-06-20T08:00:00Z',
    status: 'Queued',
    triggeredBy: 'neuro.study@pharma.com'
  },
  // Analysis-005 Jobs
  {
    analysisId: 'analysis-005',
    createdAt: '2024-01-10T08:00:00Z',
    duration: 1800,
    endTime: '2024-01-10T08:30:00Z',
    environment: 'Production',
    id: 'job-018',
    name: 'SDTM Final Submission',
    pipelineType: 'SDTM Generation',
    priority: 'High',
    progress: 100,
    startTime: '2024-01-10T08:00:00Z',
    status: 'Success',
    triggeredBy: 'admin@pharma.com'
  },
  {
    analysisId: 'analysis-005',
    createdAt: '2024-01-12T09:00:00Z',
    duration: 10800,
    endTime: '2024-01-12T12:00:00Z',
    environment: 'Production',
    id: 'job-019',
    name: 'Full TFL Package',
    pipelineType: 'TFL Production',
    priority: 'High',
    progress: 100,
    startTime: '2024-01-12T09:00:00Z',
    status: 'Success',
    triggeredBy: 'admin@pharma.com'
  },
  {
    analysisId: 'analysis-005',
    createdAt: '2024-01-13T10:00:00Z',
    duration: 900,
    endTime: '2024-01-13T10:15:00Z',
    environment: 'Production',
    id: 'job-020',
    name: 'Define.xml Generation',
    pipelineType: 'Define.xml',
    priority: 'Normal',
    progress: 100,
    startTime: '2024-01-13T10:00:00Z',
    status: 'Success',
    triggeredBy: 'admin@pharma.com'
  }
];

// ==================== Mock API 函数 ====================

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const fetchTherapeuticAreas = async (): Promise<ITherapeuticArea[]> => {
  await delay(300);
  return therapeuticAreas.filter(ta => ta.status === 'Active');
};

export const fetchProductsByTA = async (taId: string): Promise<IProduct[]> => {
  await delay(250);
  return products.filter(p => p.taId === taId && p.status === 'Active');
};

export const fetchStudiesByProduct = async (productId: string): Promise<IStudy[]> => {
  await delay(300);
  return studies.filter(s => s.productId === productId && s.status !== 'Archived');
};

export const fetchAnalysesByStudy = async (studyId: string): Promise<IAnalysis[]> => {
  await delay(250);
  return analyses.filter(a => a.studyId === studyId);
};

export const fetchStudyConfiguration = async (studyId: string): Promise<IStudyConfiguration | null> => {
  await delay(400);
  return studyConfigurations.find(c => c.studyId === studyId) || null;
};

export const fetchMilestones = async (studyId: string, analysisId?: string): Promise<IExtendedMilestone[]> => {
  await delay(350);
  return milestones.filter(m => {
    if (m.level === 'Study' && m.studyId === studyId) return true;
    if (m.level === 'Analysis' && m.studyId === studyId) {
      if (analysisId) return m.analysisId === analysisId;
      return true;
    }
    return false;
  });
};

export const fetchExecutionJobs = async (analysisId: string): Promise<IExecutionJob[]> => {
  await delay(300);
  return executionJobs.filter(job => job.analysisId === analysisId);
};

export const fetchStudyDetails = async (
  studyId: string
): Promise<{
  analyses: IAnalysis[];
  config: IStudyConfiguration | null;
  study: IStudy | null;
}> => {
  await delay(400);
  const study = studies.find(s => s.id === studyId) || null;
  const config = studyConfigurations.find(c => c.studyId === studyId) || null;
  const studyAnalyses = analyses.filter(a => a.studyId === studyId);
  return { analyses: studyAnalyses, config, study };
};

export const fetchAnalysisDetails = async (
  analysisId: string
): Promise<{
  analysis: IAnalysis | null;
  product: IProduct | null;
  study: IStudy | null;
  ta: ITherapeuticArea | null;
}> => {
  await delay(350);
  const analysis = analyses.find(a => a.id === analysisId) || null;
  if (!analysis) return { analysis: null, product: null, study: null, ta: null };

  const study = studies.find(s => s.id === analysis.studyId) || null;
  if (!study) return { analysis, product: null, study: null, ta: null };

  const product = products.find(p => p.id === study.productId) || null;
  if (!product) return { analysis, product: null, study, ta: null };

  const ta = therapeuticAreas.find(t => t.id === product.taId) || null;
  return { analysis, product, study, ta };
};

// ==================== 统计辅助函数 ====================

export const calculateMilestoneStats = (milestoneList: IExtendedMilestone[]) => {
  const stats = { AtRisk: 0, Completed: 0, Delayed: 0, OnTrack: 0, Pending: 0, total: milestoneList.length };
  milestoneList.forEach(m => {
    stats[m.status]++;
  });
  return stats;
};

export const calculateJobStats = (jobList: IExecutionJob[]) => {
  const stats = { avgDuration: 0, Cancelled: 0, Failed: 0, Queued: 0, Running: 0, Success: 0, total: jobList.length };
  const durations: number[] = [];
  jobList.forEach(job => {
    stats[job.status]++;
    if (job.duration) durations.push(job.duration);
  });
  stats.avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  return stats;
};

export const calculateEnrollmentProgress = (study: IStudy) => ({
  enrolled: study.currentEnrollment,
  percentage: Math.round((study.currentEnrollment / study.targetEnrollment) * 100),
  remaining: study.targetEnrollment - study.currentEnrollment,
  target: study.targetEnrollment
});
