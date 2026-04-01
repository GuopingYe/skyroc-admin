/**
 * Programming Tracker 数据转换层
 *
 * 负责前后端数据格式转换：
 *
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
  analysis_id: number;
  completed_at: string | null;
  created_at: string;
  created_by: string;
  deliverable_name: string;
  deliverable_type: BackendDeliverableType;
  delivery_batch: string | null;
  description: string | null;
  due_date: string | null;
  execution_order: number;
  extra_attrs: Record<string, unknown> | null;
  id: number;
  is_deleted: boolean;
  output_file_name: string | null;
  // 旧版兼容字段
  priority: BackendPriority;
  prod_file_path: string | null;
  prod_program_name: string | null;
  prod_programmer_id: string | null;
  prod_status: BackendProdStatus;
  qc_completed_at: string | null;
  qc_file_path: string | null;
  qc_method: BackendQCMethod;
  qc_program_name: string | null;
  qc_programmer_id: string | null;
  qc_started_at: string | null;
  qc_status: BackendQCStatus;
  started_at: string | null;
  status: string;
  target_dataset_id: number | null;
  task_name: string;
  tfl_metadata: Record<string, unknown> | null;
  tfl_output_id: number | null;
  updated_at: string;
  updated_by: string | null;
}

/** 后端列表响应 */
export interface BackendTrackerListResponse {
  items: BackendTrackerResponse[];
  total: number;
}

// ============================================================
// 前端类型定义
// ============================================================

/** 前端任务状态 (单一状态) */
export type FrontendTaskStatus = 'In Progress' | 'Not Started' | 'QC Pass' | 'Ready for QC' | 'Signed Off';

/** 前端任务分类 */
export type FrontendTaskCategory = 'ADaM' | 'Other' | 'SDTM' | 'TFL';

/** 前端人员信息 */
export interface FrontendPerson {
  avatar?: string;
  email: string;
  id: string;
  name: string;
}

/** 前端基础任务 */
export interface FrontendBaseTask {
  analysisId: string;
  category: FrontendTaskCategory;
  createdAt: string;
  id: string;
  primaryProgrammer: FrontendPerson;
  priority: BackendPriority;
  qcProgrammer: FrontendPerson;
  status: FrontendTaskStatus;
  updatedAt: string;
}

/** 前端 SDTM 任务 */
export interface FrontendSDTMTask extends FrontendBaseTask {
  category: 'SDTM';
  datasetLabel: string;
  domain: string;
  sdrSource: string;
}

/** 前端 ADaM 任务 */
export interface FrontendADaMTask extends FrontendBaseTask {
  analysisPopulation: string;
  category: 'ADaM';
  dataset: string;
  label: string;
}

/** 前端 TFL 任务 */
export interface FrontendTFLTask extends FrontendBaseTask {
  category: 'TFL';
  outputId: string;
  population: string;
  sourceDatasets?: string[];
  title: string;
  type: 'Figure' | 'Listing' | 'Table';
}

/** 前端 Other 任务 */
export interface FrontendOtherTask extends FrontendBaseTask {
  category: 'Other';
  description: string;
  taskCategory: string;
  taskName: string;
}

/** 前端任务联合类型 */
export type FrontendTrackerTask = FrontendADaMTask | FrontendOtherTask | FrontendSDTMTask | FrontendTFLTask;

// ============================================================
// 转换函数
// ============================================================

/**
 * 将后端双轨状态映射为前端单一状态
 *
 * 映射规则 (参考技术方案 3.3 节):
 *
 * - prod_status=Completed + qc_status=Passed -> Signed Off
 * - qc_status=Passed -> QC Pass
 * - qc_status=In_Progress || Issues_Found -> Ready for QC
 * - prod_status=Programming -> In Progress
 * - 其他 -> Not Started
 */
export function mapToFrontendStatus(prodStatus: BackendProdStatus, qcStatus: BackendQCStatus): FrontendTaskStatus {
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

/** 将前端单一状态映射为后端双轨状态 */
export function mapToBackendStatus(status: FrontendTaskStatus): {
  prod_status: BackendProdStatus;
  qc_status: BackendQCStatus;
} {
  const mapping: Record<FrontendTaskStatus, { prod_status: BackendProdStatus; qc_status: BackendQCStatus }> = {
    'In Progress': { prod_status: 'Programming', qc_status: 'Not_Started' },
    'Not Started': { prod_status: 'Not_Started', qc_status: 'Not_Started' },
    'QC Pass': { prod_status: 'Completed', qc_status: 'Passed' },
    'Ready for QC': { prod_status: 'Ready_for_QC', qc_status: 'Not_Started' },
    'Signed Off': { prod_status: 'Completed', qc_status: 'Passed' }
  };
  return mapping[status];
}

/** 将后端交付物类型映射为前端分类 */
export function mapToFrontendCategory(deliverableType: BackendDeliverableType): FrontendTaskCategory {
  const mapping: Record<BackendDeliverableType, FrontendTaskCategory> = {
    ADaM: 'ADaM',
    OTHER_LOOKUP: 'Other',
    SDTM: 'SDTM',
    TFL: 'TFL'
  };
  return mapping[deliverableType] || 'Other';
}

/** 创建前端人员对象 */
export function createFrontendPerson(userId: string | null, name?: string): FrontendPerson {
  if (!userId) {
    return { email: '', id: 'unassigned', name: 'Unassigned' };
  }
  return {
    avatar: name?.slice(0, 2).toUpperCase(),
    email: `${userId}@pharma.com`,
    id: userId,
    name: name || userId
  };
}

/** 将后端 Tracker 响应转换为前端任务对象 */
export function transformBackendTracker(backend: BackendTrackerResponse): FrontendTrackerTask {
  const category = mapToFrontendCategory(backend.deliverable_type);

  const baseTask: FrontendBaseTask = {
    analysisId: String(backend.analysis_id),
    category,
    createdAt: backend.created_at,
    id: String(backend.id),
    primaryProgrammer: createFrontendPerson(backend.prod_programmer_id),
    priority: backend.priority,
    qcProgrammer: createFrontendPerson(backend.qc_programmer_id),
    status: mapToFrontendStatus(backend.prod_status, backend.qc_status),
    updatedAt: backend.updated_at
  };

  switch (category) {
    case 'SDTM':
      return {
        ...baseTask,
        category: 'SDTM',
        datasetLabel: backend.task_name,
        domain: backend.deliverable_name,
        sdrSource: backend.prod_file_path || ''
      } as FrontendSDTMTask;

    case 'ADaM':
      return {
        ...baseTask,
        analysisPopulation: (backend.tfl_metadata?.population as string) || '',
        category: 'ADaM',
        dataset: backend.deliverable_name,
        label: backend.task_name
      } as FrontendADaMTask;

    case 'TFL': {
      const tflMeta = backend.tfl_metadata || {};
      return {
        ...baseTask,
        category: 'TFL',
        outputId: (tflMeta.outputId as string) || backend.deliverable_name,
        population: (tflMeta.population as string) || '',
        sourceDatasets: tflMeta.sourceDatasets as string[] | undefined,
        title: backend.task_name,
        type: (tflMeta.type as 'Figure' | 'Listing' | 'Table') || 'Table'
      } as FrontendTFLTask;
    }

    case 'Other':
    default:
      return {
        ...baseTask,
        category: 'Other',
        description: backend.description || '',
        taskCategory: backend.delivery_batch || 'General',
        taskName: backend.task_name
      } as FrontendOtherTask;
  }
}

/** 将后端列表响应转换为前端任务数组 */
export function transformBackendTrackerList(response: BackendTrackerListResponse): FrontendTrackerTask[] {
  return response.items.map(transformBackendTracker);
}

/** Helper to extract programmer ID from either string or object */
function extractProgrammerId(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return (value as { id: string }).id;
  }
  return undefined;
}

/** 将前端任务转换为后端创建参数 */
export function transformToFrontendCreateParams(
  task: Partial<FrontendTrackerTask>,
  analysisId: string | number,
  createdBy: string
): Record<string, unknown> {
  const deliverableTypeMap: Record<FrontendTaskCategory, BackendDeliverableType> = {
    ADaM: 'ADaM',
    Other: 'OTHER_LOOKUP',
    SDTM: 'SDTM',
    TFL: 'TFL'
  };

  // Extract programmer IDs - handle both string IDs and objects
  const prodProgrammerId = extractProgrammerId((task as any).primaryProgrammer);
  const qcProgrammerId = extractProgrammerId((task as any).qcProgrammer);

  const baseParams = {
    analysis_id: typeof analysisId === 'string' ? Number.parseInt(analysisId, 10) : analysisId,
    created_by: createdBy,
    deliverable_name: '',
    deliverable_type: deliverableTypeMap[task.category || 'Other'],
    task_name: ''
  };

  switch (task.category) {
    case 'SDTM': {
      const sdtmTask = task as Partial<FrontendSDTMTask>;
      return {
        ...baseParams,
        deliverable_name: sdtmTask.domain || '',
        prod_programmer_id: prodProgrammerId,
        qc_programmer_id: qcProgrammerId,
        task_name: sdtmTask.datasetLabel || ''
      };
    }

    case 'ADaM': {
      const adamTask = task as Partial<FrontendADaMTask>;
      return {
        ...baseParams,
        deliverable_name: adamTask.dataset || '',
        prod_programmer_id: prodProgrammerId,
        qc_programmer_id: qcProgrammerId,
        task_name: adamTask.label || '',
        tfl_metadata: { population: adamTask.analysisPopulation }
      };
    }

    case 'TFL': {
      const tflTask = task as Partial<FrontendTFLTask>;
      return {
        ...baseParams,
        deliverable_name: tflTask.outputId || '',
        prod_programmer_id: prodProgrammerId,
        qc_programmer_id: qcProgrammerId,
        task_name: tflTask.title || '',
        tfl_metadata: {
          outputId: tflTask.outputId,
          population: tflTask.population,
          sourceDatasets: tflTask.sourceDatasets,
          type: tflTask.type
        }
      };
    }

    case 'Other':
    default: {
      const otherTask = task as Partial<FrontendOtherTask>;
      return {
        ...baseParams,
        deliverable_name: otherTask.taskName || '',
        description: otherTask.description,
        prod_programmer_id: prodProgrammerId,
        qc_programmer_id: qcProgrammerId,
        task_name: otherTask.taskName || ''
      };
    }
  }
}

/** 将前端任务转换为后端更新参数 */
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
