/**
 * Programming Tracker 数据转换层
 *
 * 负责前后端数据格式转换：
 * 1. ID 格式转换 (number -> string)
 * 2. 双轨状态机到单一状态的映射
 * 3. 交付物类型映射
 */

// ============================================================
// 后端类型定义 (与后端 Schema 对齐)
// ============================================================

/** 交付物类型 */
export type BackendDeliverableType = 'ADaM' | 'OTHER_LOOKUP' | 'SDTM' | 'TFL';

/** 生产状态 (双轨状态机 - 生产侧) */
export type BackendProdStatus = 'Completed' | 'Not_Started' | 'Programming' | 'Ready_for_QC';

/** QC 状态 (双轨状态机 - QC 侧) */
export type BackendQCStatus = 'In_Progress' | 'Issues_Found' | 'Not_Started' | 'Passed';

/** 优先级 */
export type BackendPriority = 'High' | 'Low' | 'Medium';

/** QC 方法 */
export type BackendQCMethod = 'Double_Programming' | 'Review' | 'Spot_Check';

/** 后端 Tracker 响应类型 */
export interface BackendTrackerResponse {
  id: number;
  analysis_id: number;
  deliverable_type: BackendDeliverableType;
  deliverable_name: string;
  task_name: string;
  description: string | null;
  target_dataset_id: number | null;
  tfl_output_id: number | null;
  prod_programmer_id: string | null;
  qc_programmer_id: string | null;
  prod_status: BackendProdStatus;
  qc_status: BackendQCStatus;
  status: string; // 旧版兼容字段
  priority: BackendPriority;
  execution_order: number;
  qc_method: BackendQCMethod;
  started_at: string | null;
  completed_at: string | null;
  qc_started_at: string | null;
  qc_completed_at: string | null;
  due_date: string | null;
  prod_file_path: string | null;
  qc_file_path: string | null;
  prod_program_name: string | null;
  qc_program_name: string | null;
  output_file_name: string | null;
  delivery_batch: string | null;
  tfl_metadata: Record<string, unknown> | null;
  extra_attrs: Record<string, unknown> | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

/** 后端列表响应 */
export interface BackendTrackerListResponse {
  total: number;
  items: BackendTrackerResponse[];
}

// ============================================================
// 前端类型定义
// ============================================================

/** 前端任务状态 (单一状态) */
export type FrontendTaskStatus =
  | 'In Progress'
  | 'Not Started'
  | 'QC Pass'
  | 'Ready for QC'
  | 'Signed Off';

/** 前端任务分类 */
export type FrontendTaskCategory = 'ADaM' | 'Other' | 'SDTM' | 'TFL';

/** 前端人员信息 */
export interface FrontendPerson {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

/** 前端基础任务 */
export interface FrontendBaseTask {
  id: string;
  analysisId: string;
  category: FrontendTaskCategory;
  status: FrontendTaskStatus;
  primaryProgrammer: FrontendPerson;
  qcProgrammer: FrontendPerson;
  createdAt: string;
  updatedAt: string;
  priority: BackendPriority;
}

/** 前端 SDTM 任务 */
export interface FrontendSDTMTask extends FrontendBaseTask {
  category: 'SDTM';
  domain: string;
  datasetLabel: string;
  sdrSource: string;
}

/** 前端 ADaM 任务 */
export interface FrontendADaMTask extends FrontendBaseTask {
  category: 'ADaM';
  dataset: string;
  label: string;
  analysisPopulation: string;
}

/** 前端 TFL 任务 */
export interface FrontendTFLTask extends FrontendBaseTask {
  category: 'TFL';
  outputId: string;
  title: string;
  type: 'Figure' | 'Listing' | 'Table';
  population: string;
  sourceDatasets?: string[];
}

/** 前端 Other 任务 */
export interface FrontendOtherTask extends FrontendBaseTask {
  category: 'Other';
  taskName: string;
  taskCategory: string;
  description: string;
}

/** 前端任务联合类型 */
export type FrontendTrackerTask =
  | FrontendADaMTask
  | FrontendOtherTask
  | FrontendSDTMTask
  | FrontendTFLTask;

// ============================================================
// 转换函数
// ============================================================

/**
 * 将后端双轨状态映射为前端单一状态
 *
 * 映射规则 (参考技术方案 3.3 节):
 * - prod_status=Completed + qc_status=Passed -> Signed Off
 * - qc_status=Passed -> QC Pass
 * - qc_status=In_Progress || Issues_Found -> Ready for QC
 * - prod_status=Programming -> In Progress
 * - 其他 -> Not Started
 */
export function mapToFrontendStatus(
  prodStatus: BackendProdStatus,
  qcStatus: BackendQCStatus
): FrontendTaskStatus {
  if (prodStatus === 'Completed' && qcStatus === 'Passed') {
    return 'Signed Off';
  }
  if (qcStatus === 'Passed') {
    return 'QC Pass';
  }
  if (qcStatus === 'In_Progress' || qcStatus === 'Issues_Found') {
    return 'Ready for QC';
  }
  if (prodStatus === 'Programming') {
    return 'In Progress';
  }
  return 'Not Started';
}

/**
 * 将前端单一状态映射为后端双轨状态
 */
export function mapToBackendStatus(
  status: FrontendTaskStatus
): { prod_status: BackendProdStatus; qc_status: BackendQCStatus } {
  const mapping: Record<
    FrontendTaskStatus,
    { prod_status: BackendProdStatus; qc_status: BackendQCStatus }
  > = {
    'Not Started': { prod_status: 'Not_Started', qc_status: 'Not_Started' },
    'In Progress': { prod_status: 'Programming', qc_status: 'Not_Started' },
    'Ready for QC': { prod_status: 'Ready_for_QC', qc_status: 'Not_Started' },
    'QC Pass': { prod_status: 'Completed', qc_status: 'Passed' },
    'Signed Off': { prod_status: 'Completed', qc_status: 'Passed' }
  };
  return mapping[status];
}

/**
 * 将后端交付物类型映射为前端分类
 */
export function mapToFrontendCategory(
  deliverableType: BackendDeliverableType
): FrontendTaskCategory {
  const mapping: Record<BackendDeliverableType, FrontendTaskCategory> = {
    SDTM: 'SDTM',
    ADaM: 'ADaM',
    TFL: 'TFL',
    OTHER_LOOKUP: 'Other'
  };
  return mapping[deliverableType] || 'Other';
}

/**
 * 创建前端人员对象
 */
export function createFrontendPerson(
  userId: string | null,
  name?: string
): FrontendPerson {
  if (!userId) {
    return { id: 'unassigned', name: 'Unassigned', email: '' };
  }
  return {
    id: userId,
    name: name || userId,
    email: `${userId}@pharma.com`,
    avatar: name?.slice(0, 2).toUpperCase()
  };
}

/**
 * 将后端 Tracker 响应转换为前端任务对象
 */
export function transformBackendTracker(
  backend: BackendTrackerResponse
): FrontendTrackerTask {
  const category = mapToFrontendCategory(backend.deliverable_type);

  const baseTask: FrontendBaseTask = {
    id: String(backend.id),
    analysisId: String(backend.analysis_id),
    category,
    status: mapToFrontendStatus(backend.prod_status, backend.qc_status),
    primaryProgrammer: createFrontendPerson(backend.prod_programmer_id),
    qcProgrammer: createFrontendPerson(backend.qc_programmer_id),
    createdAt: backend.created_at,
    updatedAt: backend.updated_at,
    priority: backend.priority
  };

  switch (category) {
    case 'SDTM':
      return {
        ...baseTask,
        category: 'SDTM',
        domain: backend.deliverable_name,
        datasetLabel: backend.task_name,
        sdrSource: backend.prod_file_path || ''
      } as FrontendSDTMTask;

    case 'ADaM':
      return {
        ...baseTask,
        category: 'ADaM',
        dataset: backend.deliverable_name,
        label: backend.task_name,
        analysisPopulation:
          (backend.tfl_metadata?.population as string) || ''
      } as FrontendADaMTask;

    case 'TFL': {
      const tflMeta = backend.tfl_metadata || {};
      return {
        ...baseTask,
        category: 'TFL',
        outputId: (tflMeta.outputId as string) || backend.deliverable_name,
        title: backend.task_name,
        type: (tflMeta.type as 'Figure' | 'Listing' | 'Table') || 'Table',
        population: (tflMeta.population as string) || '',
        sourceDatasets: tflMeta.sourceDatasets as string[] | undefined
      } as FrontendTFLTask;
    }

    case 'Other':
    default:
      return {
        ...baseTask,
        category: 'Other',
        taskName: backend.task_name,
        taskCategory: backend.delivery_batch || 'General',
        description: backend.description || ''
      } as FrontendOtherTask;
  }
}

/**
 * 将后端列表响应转换为前端任务数组
 */
export function transformBackendTrackerList(
  response: BackendTrackerListResponse
): FrontendTrackerTask[] {
  return response.items.map(transformBackendTracker);
}

/**
 * Helper to extract programmer ID from either string or object
 */
function extractProgrammerId(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return (value as { id: string }).id;
  }
  return undefined;
}

/**
 * 将前端任务转换为后端创建参数
 */
export function transformToFrontendCreateParams(
  task: Partial<FrontendTrackerTask>,
  analysisId: string | number,
  createdBy: string
): Record<string, unknown> {
  const deliverableTypeMap: Record<FrontendTaskCategory, BackendDeliverableType> = {
    SDTM: 'SDTM',
    ADaM: 'ADaM',
    TFL: 'TFL',
    Other: 'OTHER_LOOKUP'
  };

  // Extract programmer IDs - handle both string IDs and objects
  const prodProgrammerId = extractProgrammerId((task as any).primaryProgrammer);
  const qcProgrammerId = extractProgrammerId((task as any).qcProgrammer);

  const baseParams = {
    analysis_id: typeof analysisId === 'string' ? parseInt(analysisId, 10) : analysisId,
    deliverable_type: deliverableTypeMap[task.category || 'Other'],
    deliverable_name: '',
    task_name: '',
    created_by: createdBy
  };

  switch (task.category) {
    case 'SDTM': {
      const sdtmTask = task as Partial<FrontendSDTMTask>;
      return {
        ...baseParams,
        deliverable_name: sdtmTask.domain || '',
        task_name: sdtmTask.datasetLabel || '',
        prod_programmer_id: prodProgrammerId,
        qc_programmer_id: qcProgrammerId
      };
    }

    case 'ADaM': {
      const adamTask = task as Partial<FrontendADaMTask>;
      return {
        ...baseParams,
        deliverable_name: adamTask.dataset || '',
        task_name: adamTask.label || '',
        prod_programmer_id: prodProgrammerId,
        qc_programmer_id: qcProgrammerId,
        tfl_metadata: { population: adamTask.analysisPopulation }
      };
    }

    case 'TFL': {
      const tflTask = task as Partial<FrontendTFLTask>;
      return {
        ...baseParams,
        deliverable_name: tflTask.outputId || '',
        task_name: tflTask.title || '',
        prod_programmer_id: prodProgrammerId,
        qc_programmer_id: qcProgrammerId,
        tfl_metadata: {
          outputId: tflTask.outputId,
          type: tflTask.type,
          population: tflTask.population,
          sourceDatasets: tflTask.sourceDatasets
        }
      };
    }

    case 'Other':
    default: {
      const otherTask = task as Partial<FrontendOtherTask>;
      return {
        ...baseParams,
        deliverable_name: otherTask.taskName || '',
        task_name: otherTask.taskName || '',
        description: otherTask.description,
        prod_programmer_id: prodProgrammerId,
        qc_programmer_id: qcProgrammerId
      };
    }
  }
}

/**
 * 将前端任务转换为后端更新参数
 */
export function transformToFrontendUpdateParams(
  taskId: string,
  updates: Partial<FrontendTrackerTask>,
  updatedBy: string
): Record<string, unknown> {
  const params: Record<string, unknown> = {
    updated_by: updatedBy
  };

  if (updates.status) {
    const statusParams = mapToBackendStatus(updates.status);
    params.prod_status = statusParams.prod_status;
    params.qc_status = statusParams.qc_status;
  }

  if (updates.primaryProgrammer) {
    params.prod_programmer_id = updates.primaryProgrammer.id;
  }

  if (updates.qcProgrammer) {
    params.qc_programmer_id = updates.qcProgrammer.id;
  }

  if (updates.priority) {
    params.priority = updates.priority;
  }

  return params;
}