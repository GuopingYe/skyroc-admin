/**
 * Pipeline Management Mock 数据 - 研发管线与项目空间管理
 *
 * 四级树状结构：TA -> Compound -> Study -> Analysis 数据来源于 @/mock/pipelineMock 统一数据源
 */

import {
  type IAnalysis,
  type IProduct,
  type IStudy,
  type IStudyConfiguration,
  type ITherapeuticArea,
  analyses,
  products,
  studies,
  studyConfigurations,
  therapeuticAreas
} from '@/mock/pipelineMock';

// ==================== 类型定义 ====================

/** 节点类型枚举 */
export type NodeType = 'ANALYSIS' | 'COMPOUND' | 'STUDY' | 'TA';

/** 节点生命周期状态（状态机） */
export type NodeLifecycleStatus = 'Active' | 'Draft' | 'Locked';

/** 节点归档状态 */
export type NodeStatus = 'Active' | 'Archived';

/** 基础节点接口 */
export interface PipelineNode {
  children?: PipelineNode[] | StudyNode[] | AnalysisNode[];
  createdAt: string;
  id: string;
  /** 生命周期状态（状态机） */
  lifecycleStatus: NodeLifecycleStatus;
  nodeType: NodeType;
  /** 归档状态 */
  status: NodeStatus;
  title: string;
  updatedAt: string;
}

/** Study 节点扩展配置 */
export interface StudyConfig {
  adamIgVersion: string;
  adamModelVersion: string;
  meddraVersion: string;
  sdtmIgVersion: string;
  sdtmModelVersion: string;
  whodrugVersion: string;
}

/** Study 节点接口 */
export interface StudyNode extends PipelineNode {
  config: StudyConfig;
  nodeType: 'STUDY';
  phase?: string;
  protocolTitle?: string;
}

/** Analysis 节点接口 */
export interface AnalysisNode extends PipelineNode {
  description?: string;
  lockedAt?: string;
  lockedBy?: string;
  nodeType: 'ANALYSIS';
}

// ==================== 配置常量 ====================

/** 节点类型配置 */
export const nodeTypeConfig: Record<NodeType, { color: string; icon: string; label: string }> = {
  ANALYSIS: { color: 'purple', icon: 'FundOutlined', label: 'Analysis' },
  COMPOUND: { color: 'green', icon: 'ExperimentOutlined', label: 'Compound' },
  STUDY: { color: 'orange', icon: 'FileTextOutlined', label: 'Study' },
  TA: { color: 'blue', icon: 'ApartmentOutlined', label: 'Therapeutic Area' }
};

/** 状态配置 */
export const statusConfig: Record<NodeStatus, { color: string; label: string }> = {
  Active: { color: 'success', label: 'Active' },
  Archived: { color: 'default', label: 'Archived' }
};

/** 生命周期状态配置（状态机） */
export const lifecycleConfig: Record<
  NodeLifecycleStatus,
  { color: string; description: string; icon: string; label: string }
> = {
  Active: {
    color: 'processing',
    description: 'Active state - in production use',
    icon: 'CheckCircleOutlined',
    label: 'Active'
  },
  Draft: {
    color: 'default',
    description: 'Draft state - can be edited freely',
    icon: 'EditOutlined',
    label: 'Draft'
  },
  Locked: {
    color: 'error',
    description: 'Locked state - no modifications allowed',
    icon: 'LockOutlined',
    label: 'Locked'
  }
};

/** 临床研究阶段（静态枚举，行业标准不变） */
export const studyPhases = [
  { label: 'Phase I', value: 'Phase I' },
  { label: 'Phase I/II', value: 'Phase I/II' },
  { label: 'Phase II', value: 'Phase II' },
  { label: 'Phase II/III', value: 'Phase II/III' },
  { label: 'Phase III', value: 'Phase III' },
  { label: 'Phase IV', value: 'Phase IV' }
];

// ==================== 数据转换函数 ====================

/** 将 IStudyConfiguration 转换为 StudyConfig */
const convertStudyConfig = (config: IStudyConfiguration | null): StudyConfig => {
  if (!config) return {} as StudyConfig;
  return {
    adamIgVersion: config.adamIgVersion,
    adamModelVersion: config.adamModelVersion,
    meddraVersion: config.meddraVersion,
    sdtmIgVersion: config.sdtmIgVersion,
    sdtmModelVersion: config.sdtmModelVersion,
    whodrugVersion: config.whodrugVersion
  };
};

/** 将 IAnalysis 转换为 AnalysisNode */
const convertToAnalysisNode = (analysis: IAnalysis): AnalysisNode => ({
  createdAt: analysis.createdAt,
  description: analysis.description,
  id: analysis.id,
  lifecycleStatus: analysis.lifecycleStatus,
  lockedAt: analysis.lockedAt,
  lockedBy: analysis.lockedBy,
  nodeType: 'ANALYSIS',
  status: analysis.status === 'Completed' ? 'Active' : 'Active',
  title: analysis.name,
  updatedAt: analysis.updatedAt
});

/** 将 IStudy 转换为 StudyNode */
const convertToStudyNode = (study: IStudy, config: IStudyConfiguration | null): StudyNode => ({
  children: analyses.filter(a => a.studyId === study.id).map(convertToAnalysisNode),
  config: convertStudyConfig(config),
  createdAt: study.createdAt,
  id: study.id,
  lifecycleStatus: study.lifecycleStatus,
  nodeType: 'STUDY',
  phase: study.phase,
  protocolTitle: study.protocolTitle,
  status: study.status === 'Completed' ? 'Active' : study.status,
  title: study.studyCode,
  updatedAt: study.updatedAt
});

/** 将 IProduct 转换为 Compound 节点 */
const convertToCompoundNode = (product: IProduct): PipelineNode => {
  const productStudies = studies.filter(s => s.productId === product.id && s.status !== 'Archived');
  return {
    children: productStudies.map(study => {
      const config = studyConfigurations.find(c => c.studyId === study.id) || null;
      return convertToStudyNode(study, config);
    }),
    createdAt: product.createdAt,
    id: product.id,
    lifecycleStatus: 'Active',
    nodeType: 'COMPOUND',
    status: product.status,
    title: product.name,
    updatedAt: product.updatedAt
  };
};

/** 将 ITherapeuticArea 转换为 TA 节点 */
const convertToTANode = (ta: ITherapeuticArea): PipelineNode => {
  const taProducts = products.filter(p => p.taId === ta.id && p.status === 'Active');
  return {
    children: taProducts.map(convertToCompoundNode),
    createdAt: ta.createdAt,
    id: ta.id,
    lifecycleStatus: 'Active',
    nodeType: 'TA',
    status: ta.status,
    title: ta.name,
    updatedAt: ta.updatedAt
  };
};

// ==================== 导出数据 ====================

/** Pipeline 树数据 - 从统一数据源生成 */
export const pipelineTree: PipelineNode[] = therapeuticAreas.filter(ta => ta.status === 'Active').map(convertToTANode);

// ==================== 辅助函数 ====================

/** 根据 ID 查找节点 */
export const findNodeById = (nodes: PipelineNode[], id: string): PipelineNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

/** 获取节点的所有子节点 */
export const getChildNodes = (nodes: PipelineNode[], parentId: string): PipelineNode[] => {
  const parent = findNodeById(nodes, parentId);
  return parent?.children || [];
};

/** 根据节点类型获取允许的子节点类型 */
export const getAllowedChildType = (nodeType: NodeType): NodeType | null => {
  const mapping: Partial<Record<NodeType, NodeType>> = {
    COMPOUND: 'STUDY',
    STUDY: 'ANALYSIS',
    TA: 'COMPOUND'
  };
  return mapping[nodeType] || null;
};

/** 根据 Study ID 获取完整的研究信息 */
export const getStudyById = (studyId: string): IStudy | undefined => {
  return studies.find(s => s.id === studyId);
};

/** 根据 Analysis ID 获取完整的分析信息 */
export const getAnalysisById = (analysisId: string): IAnalysis | undefined => {
  return analyses.find(a => a.id === analysisId);
};

/** 根据 Study ID 获取研究配置 */
export const getStudyConfigById = (studyId: string): IStudyConfiguration | undefined => {
  return studyConfigurations.find(c => c.studyId === studyId);
};
