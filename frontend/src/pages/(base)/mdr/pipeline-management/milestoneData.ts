/**
 * Pipeline Management - Milestone & Execution Job Data
 *
 * 项目里程碑与执行作业数据 数据来源于 @/mock/pipelineMock 统一数据源
 */

import {
  type IExecutionJob,
  type IExtendedMilestone,
  calculateMilestoneStats as calcMilestoneStats,
  executionJobs as mockExecutionJobs,
  milestones as mockMilestones
} from '@/mock/pipelineMock';

import type { IProjectMilestone, MilestoneStatus, PresetMilestoneType } from './types';

// ==================== 类型转换 ====================

/** 将 IExtendedMilestone 转换为 IProjectMilestone */
const convertToProjectMilestone = (m: IExtendedMilestone): IProjectMilestone => ({
  actualDate: m.actualDate,
  analysisId: m.analysisId,
  assignee: m.assignee,
  comment: m.comment,
  createdAt: m.createdAt,
  id: m.id,
  level: m.level,
  name: m.name,
  plannedDate: m.plannedDate,
  presetType: m.presetType,
  status: m.status,
  studyId: m.studyId,
  updatedAt: m.updatedAt
});

// ==================== 里程碑数据管理 ====================

// 使用可变存储以支持 CRUD 操作
let milestoneStore: IProjectMilestone[] = mockMilestones.map(convertToProjectMilestone);

/** 生成唯一 ID */
const generateId = (): string => `ms-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** 获取里程碑列表 */
export const getMilestones = (studyId: string, analysisId?: string): IProjectMilestone[] => {
  return milestoneStore.filter(m => {
    // Study-level milestones: always include if studyId matches
    if (m.level === 'Study' && m.studyId === studyId) {
      return true;
    }
    // Analysis-level milestones: include if analysisId matches
    if (m.level === 'Analysis' && m.studyId === studyId && m.analysisId === analysisId) {
      return true;
    }
    return false;
  });
};

/** 获取单个里程碑 */
export const getMilestoneById = (id: string): IProjectMilestone | undefined => {
  return milestoneStore.find(m => m.id === id);
};

/** 创建里程碑 */
export const createMilestone = (data: Omit<IProjectMilestone, 'createdAt' | 'id' | 'updatedAt'>): IProjectMilestone => {
  const now = new Date().toISOString();
  const newMilestone: IProjectMilestone = {
    ...data,
    createdAt: now,
    id: generateId(),
    updatedAt: now
  };
  milestoneStore.push(newMilestone);
  return newMilestone;
};

/** 更新里程碑 */
export const updateMilestone = (id: string, data: Partial<IProjectMilestone>): IProjectMilestone | null => {
  const index = milestoneStore.findIndex(m => m.id === id);
  if (index === -1) return null;

  milestoneStore[index] = {
    ...milestoneStore[index],
    ...data,
    updatedAt: new Date().toISOString()
  };
  return milestoneStore[index];
};

/** 删除里程碑 */
export const deleteMilestone = (id: string): boolean => {
  const index = milestoneStore.findIndex(m => m.id === id);
  if (index === -1) return false;
  milestoneStore.splice(index, 1);
  return true;
};

/** 获取里程碑统计 */
export const getMilestoneStats = (milestoneList: IProjectMilestone[]) => {
  const stats = {
    AtRisk: 0,
    Completed: 0,
    Delayed: 0,
    OnTrack: 0,
    Pending: 0,
    total: milestoneList.length
  };

  milestoneList.forEach(m => {
    stats[m.status]++;
  });

  return stats;
};

/** 重置里程碑数据（用于测试） */
export const resetMilestoneStore = (): void => {
  milestoneStore = mockMilestones.map(convertToProjectMilestone);
};

// ==================== 执行作业数据 ====================

/** 执行作业接口 */
export interface IExecutionJobDisplay {
  analysisId: string;
  duration?: string;
  durationSeconds?: number;
  endTime?: string;
  environment: 'Development' | 'Production' | 'UAT';
  error?: string;
  id: string;
  name: string;
  priority: 'High' | 'Low' | 'Normal';
  progress: number;
  startTime: string;
  status: 'Cancelled' | 'Failed' | 'Queued' | 'Running' | 'Success';
  triggeredBy: string;
  type: 'ADaM' | 'Data Import' | 'Define.xml' | 'QC' | 'SDTM' | 'TFL';
}

/** 格式化持续时间 */
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds} sec`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

/** 将 IExecutionJob 转换为显示格式 */
const convertToDisplayJob = (job: IExecutionJob): IExecutionJobDisplay => {
  // 提取类型简称
  const typeMap: Record<string, IExecutionJobDisplay['type']> = {
    'ADaM Derivation': 'ADaM',
    'Data Import': 'Data Import',
    'Define.xml': 'Define.xml',
    'QC Validation': 'QC',
    'SDTM Generation': 'SDTM',
    'TFL Production': 'TFL'
  };

  return {
    analysisId: job.analysisId,
    duration: job.duration ? formatDuration(job.duration) : undefined,
    durationSeconds: job.duration,
    endTime: job.endTime,
    environment: job.environment,
    error: job.error,
    id: job.id,
    name: job.name,
    priority: job.priority,
    progress: job.progress,
    startTime: job.startTime,
    status: job.status,
    triggeredBy: job.triggeredBy,
    type: typeMap[job.pipelineType] || 'SDTM'
  };
};

/** 获取执行作业列表 */
export const getExecutionJobs = (analysisId: string): IExecutionJobDisplay[] => {
  return mockExecutionJobs.filter(job => job.analysisId === analysisId).map(convertToDisplayJob);
};

/** 获取所有执行作业 */
export const getAllExecutionJobs = (): IExecutionJobDisplay[] => {
  return mockExecutionJobs.map(convertToDisplayJob);
};

/** 获取执行作业统计 */
export const getExecutionJobStats = (analysisId: string) => {
  const jobs = mockExecutionJobs.filter(job => job.analysisId === analysisId);
  const stats = {
    avgDuration: 0,
    Cancelled: 0,
    Failed: 0,
    Queued: 0,
    Running: 0,
    Success: 0,
    total: jobs.length,
    totalDuration: 0
  };

  const durations: number[] = [];
  jobs.forEach(job => {
    stats[job.status]++;
    if (job.duration) {
      durations.push(job.duration);
      stats.totalDuration += job.duration;
    }
  });

  stats.avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  return stats;
};

/** 根据 ID 获取执行作业 */
export const getExecutionJobById = (id: string): IExecutionJobDisplay | undefined => {
  const job = mockExecutionJobs.find(j => j.id === id);
  return job ? convertToDisplayJob(job) : undefined;
};

// ==================== 导出原始数据类型 ====================

export type { IExecutionJob, IExtendedMilestone };
