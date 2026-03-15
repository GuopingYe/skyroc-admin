/** Programming Tracker Mock 数据 编程任务跟踪器 - 基于 Product/Study/Analysis 层级的多类型任务管理 */

/** 任务分类 - 必须按此顺序：SDTM, ADaM, TFL, Other */
export type TaskCategory = 'ADaM' | 'Other' | 'SDTM' | 'TFL';

/** 任务分类配置 */
export const TASK_CATEGORY_ORDER: TaskCategory[] = ['SDTM', 'ADaM', 'TFL', 'Other'];

/** TFL 输出类型 */
export type TFLOutputType = 'Figure' | 'Listing' | 'Table';

/** 任务状态 */
export type TaskStatus = 'In Progress' | 'Not Started' | 'QC Pass' | 'Ready for QC' | 'Signed Off';

/** Issue 类别 */
export type IssueCategory = 'Comment' | 'Data' | 'Format' | 'Logic' | 'Validation';

/** Issue 状态 */
export type IssueStatus = 'Closed' | 'Open' | 'Responded';

/** QC Round 状态 */
export type QCRoundStatus = 'Closed' | 'Open';

/** 人员信息 */
export interface IPerson {
  avatar?: string;
  email: string;
  id: string;
  name: string;
}

/** QC Issue */
export interface IQCIssue {
  category: IssueCategory;
  description: string;
  founder: IPerson;
  foundTime: string;
  id: string;
  responder?: IPerson;
  response?: string;
  responseTime?: string;
  status: IssueStatus;
}

/** QC Round */
export interface IQCRound {
  closedAt?: string;
  issues: IQCIssue[];
  roundNumber: number;
  startedAt: string;
  status: QCRoundStatus;
}

/** 编程任务基础接口 */
export interface IProgrammingTaskBase {
  /** 关联的分析批次 ID */
  analysisId: string;
  category: TaskCategory;
  createdAt: string;
  id: string;
  primaryProgrammer: IPerson;
  qcProgrammer: IPerson;
  qcRounds: IQCRound[];
  status: TaskStatus;
  updatedAt: string;
}

/** SDTM 任务 */
export interface ISDTMTask extends IProgrammingTaskBase {
  category: 'SDTM';
  datasetLabel: string;
  domain: string;
  sdrSource: string;
}

/** ADaM 任务 */
export interface IADaMTask extends IProgrammingTaskBase {
  analysisPopulation: string;
  category: 'ADaM';
  dataset: string;
  label: string;
}

/** TFL 任务 */
export interface ITFLTask extends IProgrammingTaskBase {
  category: 'TFL';
  outputId: string;
  population: string;
  sourceDatasets?: string[];
  title: string;
  type: TFLOutputType;
}

/** Other 任务 */
export interface IOtherTask extends IProgrammingTaskBase {
  category: 'Other';
  description: string;
  taskCategory: string;
  taskName: string;
}

/** 统一编程任务类型 */
export type IProgrammingTask = ISDTMTask | IADaMTask | ITFLTask | IOtherTask;

/** Product (产品/管线) */
export interface IProduct {
  code: string;
  id: string;
  name: string;
}

/** Study (研究项目) */
export interface IStudy {
  code: string;
  id: string;
  name: string;
  phase: string;
  productId: string;
}

/** Analysis (分析批次) */
export interface IAnalysis {
  id: string;
  name: string;
  status: 'Active' | 'Completed' | 'Planned';
  studyId: string;
  type: 'Final' | 'Interim' | 'Primary' | 'Safety Update';
}

/** 全局上下文 */
export interface IGlobalContext {
  analysisId: string | null;
  productId: string | null;
  studyId: string | null;
}

// ============================================
// Mock 数据
// ============================================

/** 产品列表 */
export const products: IProduct[] = [
  { code: 'ZL-1310', id: 'prod-001', name: 'ZL-1310' },
  { code: 'ZL-2305', id: 'prod-002', name: 'ZL-2305' },
  { code: 'ZL-4201', id: 'prod-003', name: 'ZL-4201' }
];

/** 研究列表 */
export const studies: IStudy[] = [
  { code: 'ZL-1310-001', id: 'study-001', name: 'ZL-1310-001', phase: 'Phase III', productId: 'prod-001' },
  { code: 'ZL-1310-002', id: 'study-002', name: 'ZL-1310-002', phase: 'Phase II', productId: 'prod-001' },
  { code: 'ZL-2305-001', id: 'study-003', name: 'ZL-2305-001', phase: 'Phase I', productId: 'prod-002' },
  { code: 'ZL-4201-001', id: 'study-004', name: 'ZL-4201-001', phase: 'Phase II', productId: 'prod-003' }
];

/** 分析批次列表 */
export const analyses: IAnalysis[] = [
  { id: 'analysis-001', name: 'Primary Analysis', status: 'Active', studyId: 'study-001', type: 'Primary' },
  { id: 'analysis-002', name: 'Interim Analysis 1', status: 'Completed', studyId: 'study-001', type: 'Interim' },
  { id: 'analysis-003', name: 'Interim Analysis 2', status: 'Active', studyId: 'study-001', type: 'Interim' },
  { id: 'analysis-004', name: 'Primary Analysis', status: 'Planned', studyId: 'study-002', type: 'Primary' },
  { id: 'analysis-005', name: 'Safety Update', status: 'Active', studyId: 'study-003', type: 'Safety Update' },
  { id: 'analysis-006', name: 'Primary Analysis', status: 'Planned', studyId: 'study-004', type: 'Primary' }
];

/** 人员列表 */
export const programmers: IPerson[] = [
  { avatar: 'AC', email: 'alice.chen@pharma.com', id: 'prog-001', name: 'Alice Chen' },
  { avatar: 'BW', email: 'bob.wang@pharma.com', id: 'prog-002', name: 'Bob Wang' },
  { avatar: 'CL', email: 'carol.liu@pharma.com', id: 'prog-003', name: 'Carol Liu' },
  { avatar: 'DZ', email: 'david.zhang@pharma.com', id: 'prog-004', name: 'David Zhang' },
  { avatar: 'EL', email: 'eva.li@pharma.com', id: 'prog-005', name: 'Eva Li' }
];

/** 状态配置 */
export const taskStatusConfig: Record<TaskStatus, { color: string; label: string }> = {
  'In Progress': { color: 'processing', label: 'In Progress' },
  'Not Started': { color: 'default', label: 'Not Started' },
  'QC Pass': { color: 'success', label: 'QC Pass' },
  'Ready for QC': { color: 'warning', label: 'Ready for QC' },
  'Signed Off': { color: 'purple', label: 'Signed Off' }
};

/** TFL 类型配置 */
export const tflTypeConfig: Record<TFLOutputType, { color: string; label: string }> = {
  Figure: { color: 'green', label: 'Figure' },
  Listing: { color: 'orange', label: 'Listing' },
  Table: { color: 'blue', label: 'Table' }
};

/** SDTM Domain 列表 */
export const sdtmDomains = [
  { domain: 'DM', label: 'Demographics' },
  { domain: 'AE', label: 'Adverse Events' },
  { domain: 'LB', label: 'Laboratory Test Results' },
  { domain: 'VS', label: 'Vital Signs' },
  { domain: 'CM', label: 'Concomitant Medications' },
  { domain: 'EX', label: 'Exposure' },
  { domain: 'DS', label: 'Disposition' },
  { domain: 'EG', label: 'ECG Results' },
  { domain: 'PE', label: 'Physical Examination' },
  { domain: 'MH', label: 'Medical History' }
];

/** ADaM Dataset 列表 */
export const adamDatasets = [
  { dataset: 'ADSL', label: 'Subject-Level Analysis Dataset' },
  { dataset: 'ADAE', label: 'Adverse Events Analysis Dataset' },
  { dataset: 'ADLB', label: 'Laboratory Analysis Dataset' },
  { dataset: 'ADVS', label: 'Vital Signs Analysis Dataset' },
  { dataset: 'ADTTE', label: 'Time-to-Event Analysis Dataset' },
  { dataset: 'ADRS', label: 'Response Analysis Dataset' },
  { dataset: 'ADEFF', label: 'Efficacy Analysis Dataset' },
  { dataset: 'ADCM', label: 'Concomitant Medications Analysis Dataset' }
];

/** 人口类型 */
export const populations = [
  { label: 'ITT (Intent-to-Treat)', value: 'ITT' },
  { label: 'Safety', value: 'Safety' },
  { label: 'PP (Per-Protocol)', value: 'PP' },
  { label: 'Efficacy', value: 'Efficacy' }
];

// ============================================
// Mock 任务数据
// ============================================

const createBaseTask = (
  id: string,
  category: TaskCategory,
  status: TaskStatus,
  primaryProg: number,
  qcProg: number,
  analysisId: string = 'analysis-001'
): Omit<IProgrammingTaskBase, 'category' | 'id'> => ({
  analysisId,
  createdAt: '2024-06-01',
  primaryProgrammer: programmers[primaryProg],
  qcProgrammer: programmers[qcProg],
  qcRounds: [],
  status,
  updatedAt: '2024-06-15'
});

/** SDTM Mock 数据 - 按分析批次分组 */
export const sdtmTasksMock: ISDTMTask[] = [
  // analysis-001 (Primary Analysis) 的任务
  {
    ...createBaseTask('sdtm-001', 'SDTM', 'QC Pass', 0, 1, 'analysis-001'),
    category: 'SDTM',
    datasetLabel: 'Demographics',
    domain: 'DM',
    id: 'sdtm-001',
    sdrSource: 'DM Form'
  },
  {
    ...createBaseTask('sdtm-002', 'SDTM', 'Ready for QC', 2, 3, 'analysis-001'),
    category: 'SDTM',
    datasetLabel: 'Adverse Events',
    domain: 'AE',
    id: 'sdtm-002',
    sdrSource: 'AE Form'
  },
  {
    ...createBaseTask('sdtm-003', 'SDTM', 'In Progress', 1, 0, 'analysis-001'),
    category: 'SDTM',
    datasetLabel: 'Laboratory Test Results',
    domain: 'LB',
    id: 'sdtm-003',
    sdrSource: 'LB Form'
  },
  // analysis-002 (Interim Analysis 1) 的任务
  {
    ...createBaseTask('sdtm-004', 'SDTM', 'Not Started', 3, 4, 'analysis-002'),
    category: 'SDTM',
    datasetLabel: 'Vital Signs',
    domain: 'VS',
    id: 'sdtm-004',
    sdrSource: 'VS Form'
  },
  {
    ...createBaseTask('sdtm-005', 'SDTM', 'Signed Off', 4, 2, 'analysis-002'),
    category: 'SDTM',
    datasetLabel: 'Concomitant Medications',
    domain: 'CM',
    id: 'sdtm-005',
    sdrSource: 'CM Form'
  },
  // analysis-003 (Interim Analysis 2) 的任务
  {
    ...createBaseTask('sdtm-006', 'SDTM', 'In Progress', 0, 1, 'analysis-003'),
    category: 'SDTM',
    datasetLabel: 'Exposure',
    domain: 'EX',
    id: 'sdtm-006',
    sdrSource: 'EX Form'
  },
  {
    ...createBaseTask('sdtm-007', 'SDTM', 'Ready for QC', 2, 3, 'analysis-003'),
    category: 'SDTM',
    datasetLabel: 'Disposition',
    domain: 'DS',
    id: 'sdtm-007',
    sdrSource: 'DS Form'
  }
];

/** ADaM Mock 数据 - 按分析批次分组 */
export const adamTasksMock: IADaMTask[] = [
  // analysis-001 的任务
  {
    ...createBaseTask('adam-001', 'ADaM', 'Signed Off', 0, 1, 'analysis-001'),
    analysisPopulation: 'ITT',
    category: 'ADaM',
    dataset: 'ADSL',
    id: 'adam-001',
    label: 'Subject-Level Analysis Dataset'
  },
  {
    ...createBaseTask('adam-002', 'ADaM', 'Ready for QC', 2, 0, 'analysis-001'),
    analysisPopulation: 'Safety',
    category: 'ADaM',
    dataset: 'ADAE',
    id: 'adam-002',
    label: 'Adverse Events Analysis Dataset'
  },
  // analysis-002 的任务
  {
    ...createBaseTask('adam-003', 'ADaM', 'In Progress', 1, 3, 'analysis-002'),
    analysisPopulation: 'ITT',
    category: 'ADaM',
    dataset: 'ADTTE',
    id: 'adam-003',
    label: 'Time-to-Event Analysis Dataset'
  },
  {
    ...createBaseTask('adam-004', 'ADaM', 'QC Pass', 3, 4, 'analysis-002'),
    analysisPopulation: 'Efficacy',
    category: 'ADaM',
    dataset: 'ADRS',
    id: 'adam-004',
    label: 'Response Analysis Dataset'
  },
  // analysis-003 的任务
  {
    ...createBaseTask('adam-005', 'ADaM', 'Not Started', 0, 1, 'analysis-003'),
    analysisPopulation: 'Safety',
    category: 'ADaM',
    dataset: 'ADLB',
    id: 'adam-005',
    label: 'Laboratory Analysis Dataset'
  },
  {
    ...createBaseTask('adam-006', 'ADaM', 'In Progress', 2, 0, 'analysis-003'),
    analysisPopulation: 'ITT',
    category: 'ADaM',
    dataset: 'ADVS',
    id: 'adam-006',
    label: 'Vital Signs Analysis Dataset'
  }
];

/** TFL Mock 数据 - 按分析批次分组 */
export const tflTasksMock: ITFLTask[] = [
  // analysis-001 (Primary Analysis) 的任务
  {
    ...createBaseTask('tfl-001', 'TFL', 'Ready for QC', 0, 1, 'analysis-001'),
    category: 'TFL',
    id: 'tfl-001',
    outputId: 'T-14.1.1',
    population: 'ITT',
    sourceDatasets: ['ADSL'],
    title: 'Summary of Demographic and Baseline Characteristics',
    type: 'Table'
  },
  {
    ...createBaseTask('tfl-002', 'TFL', 'In Progress', 2, 0, 'analysis-001'),
    category: 'TFL',
    id: 'tfl-002',
    outputId: 'T-14.2.1',
    population: 'Efficacy',
    sourceDatasets: ['ADSL', 'ADEFF'],
    title: 'Summary of Primary Efficacy Endpoint',
    type: 'Table'
  },
  {
    ...createBaseTask('tfl-003', 'TFL', 'QC Pass', 1, 3, 'analysis-001'),
    category: 'TFL',
    id: 'tfl-003',
    outputId: 'F-14.1.1',
    population: 'ITT',
    sourceDatasets: ['ADSL', 'ADTTE'],
    title: 'Kaplan-Meier Plot for Overall Survival',
    type: 'Figure'
  },
  // analysis-002 (Interim Analysis 1) 的任务
  {
    ...createBaseTask('tfl-004', 'TFL', 'Ready for QC', 3, 4, 'analysis-002'),
    category: 'TFL',
    id: 'tfl-004',
    outputId: 'L-14.1.1',
    population: 'Safety',
    sourceDatasets: ['ADSL', 'ADAE'],
    title: 'Listing of Adverse Events',
    type: 'Listing'
  },
  {
    ...createBaseTask('tfl-005', 'TFL', 'Signed Off', 4, 2, 'analysis-002'),
    category: 'TFL',
    id: 'tfl-005',
    outputId: 'T-14.3.1',
    population: 'Safety',
    sourceDatasets: ['ADSL', 'ADAE'],
    title: 'Summary of Adverse Events by System Organ Class',
    type: 'Table'
  },
  // analysis-003 (Interim Analysis 2) 的任务
  {
    ...createBaseTask('tfl-006', 'TFL', 'Not Started', 0, 3, 'analysis-003'),
    category: 'TFL',
    id: 'tfl-006',
    outputId: 'T-14.4.1',
    population: 'Safety',
    sourceDatasets: ['ADSL', 'ADLB'],
    title: 'Laboratory Test Results Over Time',
    type: 'Table'
  },
  {
    ...createBaseTask('tfl-007', 'TFL', 'In Progress', 2, 0, 'analysis-003'),
    category: 'TFL',
    id: 'tfl-007',
    outputId: 'F-14.2.1',
    population: 'Efficacy',
    sourceDatasets: ['ADSL', 'ADRS'],
    title: 'Waterfall Plot for Tumor Response',
    type: 'Figure'
  },
  {
    ...createBaseTask('tfl-008', 'TFL', 'Ready for QC', 1, 3, 'analysis-003'),
    category: 'TFL',
    id: 'tfl-008',
    outputId: 'L-14.2.1',
    population: 'Safety',
    sourceDatasets: ['ADSL', 'ADLB'],
    title: 'Listing of Laboratory Values',
    type: 'Listing'
  }
];

/** Other Mock 数据 - 按分析批次分组 */
export const otherTasksMock: IOtherTask[] = [
  // analysis-001 的任务
  {
    ...createBaseTask('other-001', 'Other', 'Ready for QC', 4, 0, 'analysis-001'),
    category: 'Other',
    description: 'Generate Define.xml for SDTM datasets',
    id: 'other-001',
    taskCategory: 'Documentation',
    taskName: 'Define.xml Generation'
  },
  // analysis-002 的任务
  {
    ...createBaseTask('other-002', 'Other', 'In Progress', 1, 2, 'analysis-002'),
    category: 'Other',
    description: 'Prepare and transfer eCTD submission package',
    id: 'other-002',
    taskCategory: 'Regulatory',
    taskName: 'Data Transfer to FDA'
  },
  // analysis-003 的任务
  {
    ...createBaseTask('other-003', 'Other', 'Signed Off', 3, 4, 'analysis-003'),
    category: 'Other',
    description: 'Review and update table shells for CSR',
    id: 'other-003',
    taskCategory: 'Documentation',
    taskName: 'CSR Table Shell Review'
  },
  {
    ...createBaseTask('other-004', 'Other', 'Not Started', 0, 1, 'analysis-003'),
    category: 'Other',
    description: 'Update QC documentation for final deliverables',
    id: 'other-004',
    taskCategory: 'Documentation',
    taskName: 'QC Documentation Update'
  }
];

// ============================================
// 辅助函数
// ============================================

/** 根据分类和分析批次获取任务 */
export function getTasksByCategory(category: TaskCategory, analysisId?: string): IProgrammingTask[] {
  let tasks: IProgrammingTask[];

  switch (category) {
    case 'SDTM':
      tasks = sdtmTasksMock;
      break;
    case 'ADaM':
      tasks = adamTasksMock;
      break;
    case 'TFL':
      tasks = tflTasksMock;
      break;
    case 'Other':
      tasks = otherTasksMock;
      break;
    default:
      return [];
  }

  // 如果指定了 analysisId，则按该 ID 过滤
  if (analysisId) {
    return tasks.filter(task => task.analysisId === analysisId);
  }

  return tasks;
}

/** 获取开放 Issue 数量 */
export const getOpenIssueCount = (task: IProgrammingTask): number => {
  let count = 0;
  task.qcRounds.forEach(round => {
    round.issues.forEach(issue => {
      if (issue.status === 'Open') count++;
    });
  });
  return count;
};

/** 获取统计信息 */
export const getTaskStats = (tasks: IProgrammingTask[]) => {
  const stats = {
    inProgress: 0,
    notStarted: 0,
    openIssues: 0,
    qcPass: 0,
    readyForQC: 0,
    signedOff: 0,
    total: tasks.length
  };

  tasks.forEach(task => {
    switch (task.status) {
      case 'Not Started':
        stats.notStarted++;
        break;
      case 'In Progress':
        stats.inProgress++;
        break;
      case 'Ready for QC':
        stats.readyForQC++;
        break;
      case 'QC Pass':
        stats.qcPass++;
        break;
      case 'Signed Off':
        stats.signedOff++;
        break;
    }
    stats.openIssues += getOpenIssueCount(task);
  });

  return stats;
};

/** 根据 Product ID 获取 Studies */
export const getStudiesByProduct = (productId: string): IStudy[] => {
  return studies.filter(s => s.productId === productId);
};

/** 根据 Study ID 获取 Analyses */
export const getAnalysesByStudy = (studyId: string): IAnalysis[] => {
  return analyses.filter(a => a.studyId === studyId);
};

/** 获取 Product 详情 */
export const getProductById = (productId: string): IProduct | undefined => {
  return products.find(p => p.id === productId);
};

/** 获取 Study 详情 */
export const getStudyById = (studyId: string): IStudy | undefined => {
  return studies.find(s => s.id === studyId);
};

/** 获取 Analysis 详情 */
export const getAnalysisById = (analysisId: string): IAnalysis | undefined => {
  return analyses.find(a => a.id === analysisId);
};
