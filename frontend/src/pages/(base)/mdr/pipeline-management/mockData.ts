/**
 * Pipeline Management - 类型定义与 UI 配置常量
 *
 * 四级树状结构：TA -> Compound -> Study -> Analysis
 * 数据来源：后端 /api/v1/pipeline/tree（通过 usePipelineActions 加载）
 */

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
  /** 数据库主键 ID (ScopeNode.id) - 用于 API 查询 */
  dbId?: number;
  /** 额外属性（如 spec_status），来自后端动态字段 */
  extra_attrs?: Record<string, unknown>;
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

// ==================== 辅助函数 ====================

/** 根据 ID 查找节点 */
export const findNodeById = (nodes: PipelineNode[], id: string): PipelineNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children as PipelineNode[], id);
      if (found) return found;
    }
  }
  return null;
};

/** 获取节点的所有子节点 */
export const getChildNodes = (nodes: PipelineNode[], parentId: string): PipelineNode[] => {
  const parent = findNodeById(nodes, parentId);
  return (parent?.children as PipelineNode[]) || [];
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
