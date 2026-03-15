/**
 * Clinical Data Store - 统一的临床数据源
 *
 * 作为全局 Shared Context 和各业务页面的唯一数据来源 层级结构：TherapeuticArea -> Product -> Study -> Analysis
 */

// ==================== 核心类型定义 ====================

/** 治疗领域 */
export interface ITherapeuticArea {
  code: string;
  id: string;
  name: string;
  status: 'Active' | 'Archived';
}

/** 产品 */
export interface IClinicalProduct {
  code: string;
  id: string;
  indication: string;
  name: string;
  status: 'Active' | 'Archived';
  taId: string;
}

/** 临床研究 */
export interface IClinicalStudy {
  currentEnrollment: number;
  id: string;
  lifecycleStatus: 'Active' | 'Draft' | 'Locked';
  name: string;
  phase: string;
  productId: string;
  protocolTitle: string;
  status: 'Active' | 'Archived' | 'Completed';
  studyCode: string;
  targetEnrollment: number;
}

/** 分析批次 */
export interface IClinicalAnalysis {
  description?: string;
  id: string;
  lifecycleStatus: 'Active' | 'Draft' | 'Locked';
  lockedAt?: string;
  lockedBy?: string;
  name: string;
  status: 'Active' | 'Archived' | 'Completed' | 'Planned';
  studyId: string;
  type: 'Efficacy' | 'Exploratory' | 'Interim' | 'Primary' | 'Safety';
}

/** 研究配置 */
export interface IStudyConfiguration {
  adamIgVersion: string;
  adamModelVersion: string;
  blindingStatus: 'Double Blind' | 'Open Label' | 'Single Blind';
  controlType: 'Active Control' | 'Dose Comparison' | 'No Control' | 'Placebo';
  dataCollectionSystem: string;
  id: string;
  indNumber?: string;
  meddraVersion: string;
  regulatoryAgency: 'EMA' | 'FDA' | 'Health Canada' | 'NMPA' | 'PMDA';
  sdtmIgVersion: string;
  sdtmModelVersion: string;
  studyDesign: 'Crossover' | 'Factorial' | 'Parallel' | 'Single Group';
  studyId: string;
  whodrugVersion: string;
}

// ==================== 静态数据 ====================

/** 治疗领域列表 */
export const therapeuticAreas: ITherapeuticArea[] = [
  { code: 'ONC', id: 'ta-001', name: 'Oncology', status: 'Active' },
  { code: 'IMM', id: 'ta-002', name: 'Immunology', status: 'Active' },
  { code: 'NEU', id: 'ta-003', name: 'Neurology', status: 'Active' }
];

/** 产品列表 - 用于 GlobalContextSelector 的 Product 下拉框 */
export const products: IClinicalProduct[] = [
  { code: 'ZL1310', id: 'prod-001', indication: 'NSCLC', name: 'ZL-1310', status: 'Active', taId: 'ta-001' },
  { code: 'ZL1501', id: 'prod-002', indication: 'TNBC', name: 'ZL-1501', status: 'Active', taId: 'ta-001' },
  { code: 'ZL1201', id: 'prod-003', indication: 'SCLC', name: 'ZL-1201', status: 'Active', taId: 'ta-001' },
  {
    code: 'ZL2201',
    id: 'prod-004',
    indication: 'Rheumatoid Arthritis',
    name: 'ZL-2201',
    status: 'Active',
    taId: 'ta-002'
  },
  { code: 'ZL2301', id: 'prod-005', indication: 'Psoriasis', name: 'ZL-2301', status: 'Active', taId: 'ta-002' },
  {
    code: 'ZL3101',
    id: 'prod-006',
    indication: "Alzheimer's Disease",
    name: 'ZL-3101',
    status: 'Active',
    taId: 'ta-003'
  }
];

/** 研究列表 - 用于 GlobalContextSelector 的 Study 下拉框 */
export const studies: IClinicalStudy[] = [
  // ZL-1310 Studies
  {
    currentEnrollment: 148,
    id: 'study-001',
    lifecycleStatus: 'Locked',
    name: 'ZL-1310-001',
    phase: 'Phase II',
    productId: 'prod-001',
    protocolTitle: 'A Phase II Study of ZL-1310 in Advanced NSCLC',
    status: 'Active',
    studyCode: 'ZL-1310-001',
    targetEnrollment: 150
  },
  {
    currentEnrollment: 125,
    id: 'study-002',
    lifecycleStatus: 'Active',
    name: 'ZL-1310-002',
    phase: 'Phase III',
    productId: 'prod-001',
    protocolTitle: 'A Phase III Study of ZL-1310 vs Standard of Care',
    status: 'Active',
    studyCode: 'ZL-1310-002',
    targetEnrollment: 500
  },
  {
    currentEnrollment: 52,
    id: 'study-003',
    lifecycleStatus: 'Locked',
    name: 'ZL-1310-101',
    phase: 'Phase I',
    productId: 'prod-001',
    protocolTitle: 'A Phase I Dose-Escalation Study',
    status: 'Completed',
    studyCode: 'ZL-1310-101',
    targetEnrollment: 50
  },
  // ZL-1501 Studies
  {
    currentEnrollment: 45,
    id: 'study-004',
    lifecycleStatus: 'Active',
    name: 'ZL-1501-001',
    phase: 'Phase II',
    productId: 'prod-002',
    protocolTitle: 'A Phase II Study of ZL-1501 in TNBC',
    status: 'Active',
    studyCode: 'ZL-1501-001',
    targetEnrollment: 120
  },
  // ZL-1201 Studies
  {
    currentEnrollment: 0,
    id: 'study-005',
    lifecycleStatus: 'Draft',
    name: 'ZL-1201-001',
    phase: 'Phase I/II',
    productId: 'prod-003',
    protocolTitle: 'A Phase I/II Study in SCLC',
    status: 'Active',
    studyCode: 'ZL-1201-001',
    targetEnrollment: 80
  },
  // ZL-2201 Studies
  {
    currentEnrollment: 320,
    id: 'study-006',
    lifecycleStatus: 'Active',
    name: 'ZL-2201-001',
    phase: 'Phase III',
    productId: 'prod-004',
    protocolTitle: 'A Phase III Study in Rheumatoid Arthritis',
    status: 'Active',
    studyCode: 'ZL-2201-001',
    targetEnrollment: 600
  },
  // ZL-3101 Studies
  {
    currentEnrollment: 450,
    id: 'study-007',
    lifecycleStatus: 'Active',
    name: 'ZL-3101-001',
    phase: 'Phase III',
    productId: 'prod-006',
    protocolTitle: "A Phase III Study in Early Alzheimer's Disease",
    status: 'Active',
    studyCode: 'ZL-3101-001',
    targetEnrollment: 1000
  }
];

/** 分析批次列表 - 用于 GlobalContextSelector 的 Analysis 下拉框 */
export const analyses: IClinicalAnalysis[] = [
  // Study-001 Analyses
  {
    description: 'First interim analysis',
    id: 'analysis-001',
    lifecycleStatus: 'Locked',
    lockedAt: '2024-05-20',
    lockedBy: 'admin@pharma.com',
    name: 'Interim Analysis 1',
    status: 'Active',
    studyId: 'study-001',
    type: 'Interim'
  },
  {
    description: 'Primary efficacy analysis',
    id: 'analysis-002',
    lifecycleStatus: 'Draft',
    name: 'Final Analysis',
    status: 'Planned',
    studyId: 'study-001',
    type: 'Primary'
  },
  {
    description: 'Quarterly safety update',
    id: 'analysis-003',
    lifecycleStatus: 'Active',
    name: 'Safety Update',
    status: 'Active',
    studyId: 'study-001',
    type: 'Safety'
  },
  // Study-002 Analyses
  {
    description: 'First planned interim',
    id: 'analysis-004',
    lifecycleStatus: 'Draft',
    name: 'Interim Analysis 1',
    status: 'Planned',
    studyId: 'study-002',
    type: 'Interim'
  },
  // Study-003 Analyses (Completed)
  {
    description: 'Primary analysis for Phase I',
    id: 'analysis-005',
    lifecycleStatus: 'Locked',
    lockedAt: '2024-01-15',
    lockedBy: 'biostat@pharma.com',
    name: 'Primary Analysis',
    status: 'Completed',
    studyId: 'study-003',
    type: 'Primary'
  },
  // Study-004 Analyses
  {
    description: 'First interim for TNBC',
    id: 'analysis-006',
    lifecycleStatus: 'Active',
    name: 'Interim Analysis',
    status: 'Active',
    studyId: 'study-004',
    type: 'Interim'
  },
  // Study-006 Analyses
  {
    description: 'First interim for RA',
    id: 'analysis-007',
    lifecycleStatus: 'Locked',
    lockedAt: '2024-04-01',
    lockedBy: 'stat@pharma.com',
    name: 'Interim Analysis 1',
    status: 'Completed',
    studyId: 'study-006',
    type: 'Interim'
  },
  {
    description: 'Second interim analysis',
    id: 'analysis-008',
    lifecycleStatus: 'Active',
    name: 'Interim Analysis 2',
    status: 'Active',
    studyId: 'study-006',
    type: 'Interim'
  },
  // Study-007 Analyses
  {
    description: "First interim for Alzheimer's",
    id: 'analysis-009',
    lifecycleStatus: 'Active',
    name: 'Interim Analysis 1',
    status: 'Active',
    studyId: 'study-007',
    type: 'Interim'
  }
];

/** 研究配置列表 */
export const studyConfigurations: IStudyConfiguration[] = [
  {
    adamIgVersion: 'ADaMIG v1.4',
    adamModelVersion: 'ADaM v1.3',
    blindingStatus: 'Open Label',
    controlType: 'No Control',
    dataCollectionSystem: 'Medidata Rave',
    id: 'config-001',
    indNumber: 'IND-123456',
    meddraVersion: 'MedDRA 26.1',
    regulatoryAgency: 'FDA',
    sdtmIgVersion: 'SDTMIG v3.4',
    sdtmModelVersion: 'SDTM v1.9',
    studyDesign: 'Parallel',
    studyId: 'study-001',
    whodrugVersion: 'WHODrug Global 5.1'
  },
  {
    adamIgVersion: 'ADaMIG v1.4',
    adamModelVersion: 'ADaM v1.3',
    blindingStatus: 'Double Blind',
    controlType: 'Active Control',
    dataCollectionSystem: 'Medidata Rave',
    id: 'config-002',
    indNumber: 'IND-123789',
    meddraVersion: 'MedDRA 26.1',
    regulatoryAgency: 'FDA',
    sdtmIgVersion: 'SDTMIG v3.4',
    sdtmModelVersion: 'SDTM v1.9',
    studyDesign: 'Parallel',
    studyId: 'study-002',
    whodrugVersion: 'WHODrug Global 5.1'
  },
  {
    adamIgVersion: 'ADaMIG v1.3',
    adamModelVersion: 'ADaM v1.2',
    blindingStatus: 'Open Label',
    controlType: 'No Control',
    dataCollectionSystem: 'Oracle InForm',
    id: 'config-003',
    indNumber: 'IND-120001',
    meddraVersion: 'MedDRA 26.0',
    regulatoryAgency: 'FDA',
    sdtmIgVersion: 'SDTMIG v3.3',
    sdtmModelVersion: 'SDTM v1.8',
    studyDesign: 'Single Group',
    studyId: 'study-003',
    whodrugVersion: 'WHODrug Global 5.0'
  },
  {
    adamIgVersion: 'ADaMIG v1.4',
    adamModelVersion: 'ADaM v1.3',
    blindingStatus: 'Double Blind',
    controlType: 'Placebo',
    dataCollectionSystem: 'Medidata Rave',
    id: 'config-004',
    indNumber: 'IND-124001',
    meddraVersion: 'MedDRA 26.1',
    regulatoryAgency: 'FDA',
    sdtmIgVersion: 'SDTMIG v3.4',
    sdtmModelVersion: 'SDTM v1.9',
    studyDesign: 'Parallel',
    studyId: 'study-004',
    whodrugVersion: 'WHODrug Global 5.1'
  },
  {
    adamIgVersion: 'ADaMIG v1.4',
    adamModelVersion: 'ADaM v1.3',
    blindingStatus: 'Double Blind',
    controlType: 'Active Control',
    dataCollectionSystem: 'Veeva Vault EDC',
    id: 'config-005',
    indNumber: 'EMA-2201-001',
    meddraVersion: 'MedDRA 26.1',
    regulatoryAgency: 'EMA',
    sdtmIgVersion: 'SDTMIG v3.4',
    sdtmModelVersion: 'SDTM v1.9',
    studyDesign: 'Parallel',
    studyId: 'study-006',
    whodrugVersion: 'WHODrug Global 5.1'
  },
  {
    adamIgVersion: 'ADaMIG v1.4',
    adamModelVersion: 'ADaM v1.3',
    blindingStatus: 'Double Blind',
    controlType: 'Placebo',
    dataCollectionSystem: 'Medidata Rave',
    id: 'config-006',
    indNumber: 'IND-131001',
    meddraVersion: 'MedDRA 26.1',
    regulatoryAgency: 'FDA',
    sdtmIgVersion: 'SDTMIG v3.4',
    sdtmModelVersion: 'SDTM v1.9',
    studyDesign: 'Parallel',
    studyId: 'study-007',
    whodrugVersion: 'WHODrug Global 5.1'
  }
];

// ==================== 查询函数 ====================

/** 获取所有活跃产品（用于 Product 下拉框） */
export const getActiveProducts = (): IClinicalProduct[] => {
  return products.filter(p => p.status === 'Active');
};

/** 根据 Product ID 获取研究列表 */
export const getStudiesByProduct = (productId: string | null): IClinicalStudy[] => {
  if (!productId) return [];
  return studies.filter(s => s.productId === productId && s.status !== 'Archived');
};

/** 根据 Study ID 获取分析批次列表 */
export const getAnalysesByStudy = (studyId: string | null): IClinicalAnalysis[] => {
  if (!studyId) return [];
  return analyses.filter(a => a.studyId === studyId);
};

/** 根据 ID 获取单个产品 */
export const getProductById = (productId: string | null): IClinicalProduct | undefined => {
  if (!productId) return undefined;
  return products.find(p => p.id === productId);
};

/** 根据 ID 获取单个研究 */
export const getStudyById = (studyId: string | null): IClinicalStudy | undefined => {
  if (!studyId) return undefined;
  return studies.find(s => s.id === studyId);
};

/** 根据 ID 获取单个分析批次 */
export const getAnalysisById = (analysisId: string | null): IClinicalAnalysis | undefined => {
  if (!analysisId) return undefined;
  return analyses.find(a => a.id === analysisId);
};

/** 根据 Study ID 获取研究配置 */
export const getStudyConfiguration = (studyId: string | null): IStudyConfiguration | undefined => {
  if (!studyId) return undefined;
  return studyConfigurations.find(c => c.studyId === studyId);
};

/** 根据研究 ID 获取所属产品 */
export const getProductByStudyId = (studyId: string | null): IClinicalProduct | undefined => {
  const study = getStudyById(studyId);
  return study ? getProductById(study.productId) : undefined;
};

/** 根据分析 ID 获取完整链路 */
export const getAnalysisChain = (
  analysisId: string | null
): {
  analysis?: IClinicalAnalysis;
  product?: IClinicalProduct;
  study?: IClinicalStudy;
  ta?: ITherapeuticArea;
} => {
  const analysis = getAnalysisById(analysisId);
  if (!analysis) return {};

  const study = getStudyById(analysis.studyId);
  if (!study) return { analysis };

  const product = getProductById(study.productId);
  if (!product) return { analysis, study };

  const ta = therapeuticAreas.find(t => t.id === product.taId);
  return { analysis, product, study, ta };
};

// ==================== 异步 API 模拟函数 ====================

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/** 模拟 API：获取产品列表 */
export const fetchProducts = async (): Promise<IClinicalProduct[]> => {
  await delay(200);
  return getActiveProducts();
};

/** 模拟 API：获取研究列表 */
export const fetchStudies = async (productId: string): Promise<IClinicalStudy[]> => {
  await delay(250);
  return getStudiesByProduct(productId);
};

/** 模拟 API：获取分析批次列表 */
export const fetchAnalyses = async (studyId: string): Promise<IClinicalAnalysis[]> => {
  await delay(200);
  return getAnalysesByStudy(studyId);
};

/** 模拟 API：获取研究配置 */
export const fetchStudyConfiguration = async (studyId: string): Promise<IStudyConfiguration | undefined> => {
  await delay(300);
  return getStudyConfiguration(studyId);
};

// ==================== 辅助配置 ====================

/** 分析状态颜色映射 */
export const analysisStatusColorMap: Record<IClinicalAnalysis['status'], string> = {
  Active: 'green',
  Archived: 'red',
  Completed: 'default',
  Planned: 'blue'
};

/** 研究状态颜色映射 */
export const studyStatusColorMap: Record<IClinicalStudy['status'], string> = {
  Active: 'green',
  Archived: 'default',
  Completed: 'blue'
};

/** 生命周期状态颜色映射 */
export const lifecycleStatusColorMap: Record<
  IClinicalStudy['lifecycleStatus'] | IClinicalAnalysis['lifecycleStatus'],
  string
> = {
  Active: 'processing',
  Draft: 'default',
  Locked: 'error'
};
