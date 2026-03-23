/**
 * Clinical Context Types - 全局临床上下文类型定义
 *
 * 用于 Product -> Study -> Analysis 三级联动的全局状态管理
 */

/** Product 信息 */
export interface IClinicalProduct {
  id: string;
  name: string;
  /** Therapeutic Area 治疗领域 */
  ta?: string;
  /** ScopeNode ID (数据库主键) */
  scopeNodeId?: number;
}

/** Study 信息 */
export interface IClinicalStudy {
  id: string;
  name: string;
  /** 研究阶段 */
  phase: string;
  /** 研究状态 */
  status: string;
  /** ScopeNode ID (数据库主键) */
  scopeNodeId?: number;
  /** 标准版本配置 */
  config?: {
    sdtmIgVersion?: string;
    sdtmModelVersion?: string;
    adamIgVersion?: string;
    adamModelVersion?: string;
    meddraVersion?: string;
    whodrugVersion?: string;
  };
}

/** Analysis 信息 */
export interface IClinicalAnalysis {
  id: string;
  /** 锁定时间 */
  lockedAt?: string;
  /** 锁定人 */
  lockedBy?: string;
  name: string;
  /** 分析状态 */
  status: 'Active' | 'Archived' | 'Completed' | 'Planned';
  /** ScopeNode ID (数据库主键) */
  scopeNodeId?: number;
}

/** 全局上下文选择状态 */
export interface IClinicalContext {
  /** 完整 Analysis 对象（用于 UI 显示名称） */
  analysis?: IClinicalAnalysis;
  /** 当前选中的 Analysis ID */
  analysisId: string | null;
  /** 完整 Product 对象（用于 UI 显示名称） */
  product?: IClinicalProduct;
  /** 当前选中的 Product ID */
  productId: string | null;
  /** 完整 Study 对象（用于 UI 显示名称） */
  study?: IClinicalStudy;
  /** 当前选中的 Study ID */
  studyId: string | null;
}

/** 最近访问项 */
export interface IRecentContextAccess {
  /** ISO timestamp */
  accessedAt: string;
  analysisId: string;
  analysisName: string;
  productId: string;
  productName: string;
  studyId: string;
  studyName: string;
}

/** Slice 状态 */
export interface IClinicalContextState {
  /** 当前上下文 */
  context: IClinicalContext;
  /** 最近访问列表 */
  recentAccessList: IRecentContextAccess[];
}

/** 需要显示全局上下文选择器的路由 */
export const MDR_CONTEXT_ROUTES = [
  '/mdr/programming-tracker',
  '/mdr/study-spec',
  '/mdr/mapping-studio',
  '/mdr/tfl-designer',
  '/mdr/pipeline-management'
] as const;

export type MdrContextRoute = (typeof MDR_CONTEXT_ROUTES)[number];
