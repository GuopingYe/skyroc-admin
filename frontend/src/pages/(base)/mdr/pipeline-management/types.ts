/**
 * Pipeline Management - Milestone Types
 *
 * 临床项目里程碑管理类型定义
 */

/** 里程碑状态 */
export type MilestoneStatus = 'AtRisk' | 'Completed' | 'Delayed' | 'OnTrack' | 'Pending';

/** 里程碑级别 - 决定数据所属层级 */
export type MilestoneLevel = 'Analysis' | 'Study';

/** 预设临床里程碑节点 */
export type PresetMilestoneType =
  | 'CUSTOM' // First Patient In
  | 'DBL' // Last Patient In
  | 'DCO' // Data Cut-Off
  | 'FPI' // Data Snapshot
  | 'LPI' // Database Lock
  | 'SNAPSHOT'; // 自定义节点

/** 项目里程碑 */
export interface IProjectMilestone {
  /** 实际完成时间 */
  actualDate: string | null;
  /** 关联的 Analysis ID (Analysis 级别必填) */
  analysisId?: string;
  /** 负责人 */
  assignee?: string;
  /** 备注 */
  comment?: string;
  /** 创建时间 */
  createdAt: string;
  id: string;
  /** 所属级别 */
  level: MilestoneLevel;
  /** 里程碑名称 */
  name: string;
  /** 预计完成时间 */
  plannedDate: string | null;
  /** 预设类型 */
  presetType: PresetMilestoneType;
  /** 状态 */
  status: MilestoneStatus;
  /** 关联的 Study ID */
  studyId: string;
  /** 更新时间 */
  updatedAt: string;
}

/** 里程碑状态配置 */
export const milestoneStatusConfig: Record<MilestoneStatus, { color: string; label: string }> = {
  AtRisk: { color: 'orange', label: 'At Risk' },
  Completed: { color: 'blue', label: 'Completed' },
  Delayed: { color: 'red', label: 'Delayed' },
  OnTrack: { color: 'green', label: 'On Track' },
  Pending: { color: 'default', label: 'Pending' }
};

/** 预设里程碑配置 */
export const presetMilestoneConfig: Record<
  PresetMilestoneType,
  { description: string; label: string; level: MilestoneLevel }
> = {
  CUSTOM: {
    description: '自定义里程碑',
    label: 'Custom Milestone',
    level: 'Analysis'
  },
  DBL: {
    description: '数据库锁定',
    label: 'Database Lock (DBL)',
    level: 'Analysis'
  },
  DCO: {
    description: '数据截止点',
    label: 'Data Cut-Off (DCO)',
    level: 'Analysis'
  },
  FPI: {
    description: '首例受试者入组',
    label: 'First Patient In (FPI)',
    level: 'Study'
  },
  LPI: {
    description: '末例受试者入组',
    label: 'Last Patient In (LPI)',
    level: 'Study'
  },
  SNAPSHOT: {
    description: '数据快照',
    label: 'Data Snapshot',
    level: 'Analysis'
  }
};

/** 预设里程碑选项（用于下拉选择） */
export const presetMilestoneOptions = Object.entries(presetMilestoneConfig).map(([key, config]) => ({
  label: config.label,
  level: config.level,
  value: key as PresetMilestoneType
}));
