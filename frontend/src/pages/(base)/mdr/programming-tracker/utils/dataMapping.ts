/**
 * Programming Tracker 数据映射层
 *
 * 负责将后端 ProgrammingTracker 模型转换为前端 TrackerTask 类型
 *
 * 后端使用双轨状态机 (prod_status + qc_status)
 * 前端使用单一 status 字段
 */
import type { Api } from '@/types/app';

// 后端状态枚举值
type BackendProdStatus = 'Completed' | 'Not_Started' | 'Programming' | 'Ready_for_QC';
type BackendQCStatus = 'In_Progress' | 'Issues_Found' | 'Not_Started' | 'Passed';
type BackendDeliverableType = 'ADaM' | 'OTHER_LOOKUP' | 'SDTM' | 'TFL';

// 后端响应类型
interface BackendTracker {
  id: number;
  analysis_id: number;
  deliverable_type: BackendDeliverableType;
  deliverable_name: string;
  task_name: string;
  description: string | null;
  prod_programmer_id: string | null;
  qc_programmer_id: string | null;
  prod_status: BackendProdStatus;
  qc_status: BackendQCStatus;
  status: string; // 旧版状态
  priority: 'High' | 'Low' | 'Medium';
  execution_order: number;
  qc_method: string;
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
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

/**
 * 将后端双轨状态映射为前端单一状态
 *
 * 映射规则：
 * - prod_status=Completed + qc_status=Passed -> Signed Off
 * - qc_status=Passed -> QC Pass
 * - prod_status=Ready_for_QC -> Ready for QC
 * - qc_status=Issues_Found -> In Progress (有问题需修复)
 * - prod_status=Programming -> In Progress
 * - prod_status=Not_Started -> Not Started
 */
function mapStatus(prodStatus: BackendProdStatus, qcStatus: BackendQCStatus): Api.MDR.TaskStatus {
  // QC 通过
  if (qcStatus === 'Passed') {
    if (prodStatus === 'Completed') {
      return 'Signed Off';
    }
    return 'QC Pass';
  }

  // 发现问题
  if (qcStatus === 'Issues_Found') {
    return 'In Progress'; // 有问题需要修复
  }

  // QC 进行中
  if (qcStatus === 'In_Progress') {
    return 'Ready for QC';
  }

  // 生产状态判断
  if (prodStatus === 'Ready_for_QC') {
    return 'Ready for QC';
  }

  if (prodStatus === 'Programming') {
    return 'In Progress';
  }

  return 'Not Started';
}

/**
 * 将后端 deliverable_type 转换为前端 category
 */
function mapCategory(deliverableType: BackendDeliverableType): Api.MDR.TaskCategory {
  const mapping: Record<BackendDeliverableType, Api.MDR.TaskCategory> = {
    SDTM: 'SDTM',
    ADaM: 'ADaM',
    TFL: 'TFL',
    OTHER_LOOKUP: 'Other'
  };
  return mapping[deliverableType] || 'Other';
}

/**
 * 创建简化的人员对象
 */
function createPerson(id: string | null, name?: string): Api.MDR.Person | null {
  if (!id) return null;
  return {
    id,
    name: name || id,
    email: `${id}@pharma.com` // 默认邮箱格式
  };
}

/**
 * 将后端 ProgrammingTracker 转换为前端 TrackerTask
 */
export function mapBackendToTrackerTask(backend: BackendTracker): Api.MDR.TrackerTask {
  const category = mapCategory(backend.deliverable_type);
  const baseTask = {
    id: String(backend.id),
    createdAt: backend.created_at,
    updatedAt: backend.updated_at,
    status: mapStatus(backend.prod_status, backend.qc_status),
    primaryProgrammer: createPerson(backend.prod_programmer_id) || {
      id: 'unknown',
      name: 'Unassigned',
      email: ''
    },
    qcProgrammer: createPerson(backend.qc_programmer_id) || {
      id: 'unknown',
      name: 'Unassigned',
      email: ''
    },
    qcRounds: [] // QC rounds 需要单独查询
  };

  // 根据 category 构建不同类型的任务
  switch (category) {
    case 'SDTM':
      return {
        ...baseTask,
        category: 'SDTM',
        domain: backend.deliverable_name,
        datasetLabel: backend.task_name,
        sdrSource: backend.prod_file_path || ''
      } as Api.MDR.SDTMTask;

    case 'ADaM':
      return {
        ...baseTask,
        category: 'ADaM',
        dataset: backend.deliverable_name,
        label: backend.task_name,
        analysisPopulation: (backend.tfl_metadata?.population as string) || ''
      } as Api.MDR.ADaMTask;

    case 'TFL': {
      const tflMeta = backend.tfl_metadata || {};
      return {
        ...baseTask,
        category: 'TFL',
        outputId: (tflMeta.outputId as string) || backend.deliverable_name,
        title: backend.task_name,
        type: (tflMeta.type as Api.MDR.TFLOutputType) || 'Table',
        population: (tflMeta.population as string) || '',
        sourceDatasets: tflMeta.sourceDatasets as string[] | undefined
      } as Api.MDR.TFLTask;
    }

    case 'Other':
    default:
      return {
        ...baseTask,
        category: 'Other',
        taskName: backend.task_name,
        taskCategory: backend.delivery_batch || 'General',
        description: backend.description || ''
      } as Api.MDR.OtherTask;
  }
}

/**
 * 将前端 TrackerTask 转换为后端创建参数
 */
export function mapTrackerTaskToCreateParams(
  task: Partial<Api.MDR.TrackerTask>,
  analysisId: string
): Record<string, unknown> {
  const baseParams = {
    analysis_id: parseInt(analysisId, 10),
    deliverable_name: '',
    task_name: '',
    created_by: task.primaryProgrammer?.id || 'system'
  };

  switch (task.category) {
    case 'SDTM': {
      const sdtmTask = task as Partial<Api.MDR.SDTMTask>;
      return {
        ...baseParams,
        deliverable_type: 'SDTM',
        deliverable_name: sdtmTask.domain || '',
        task_name: sdtmTask.datasetLabel || '',
        prod_programmer_id: task.primaryProgrammer?.id,
        qc_programmer_id: task.qcProgrammer?.id
      };
    }

    case 'ADaM': {
      const adamTask = task as Partial<Api.MDR.ADaMTask>;
      return {
        ...baseParams,
        deliverable_type: 'ADaM',
        deliverable_name: adamTask.dataset || '',
        task_name: adamTask.label || '',
        prod_programmer_id: task.primaryProgrammer?.id,
        qc_programmer_id: task.qcProgrammer?.id,
        tfl_metadata: {
          population: adamTask.analysisPopulation
        }
      };
    }

    case 'TFL': {
      const tflTask = task as Partial<Api.MDR.TFLTask>;
      return {
        ...baseParams,
        deliverable_type: 'TFL',
        deliverable_name: tflTask.outputId || '',
        task_name: tflTask.title || '',
        prod_programmer_id: task.primaryProgrammer?.id,
        qc_programmer_id: task.qcProgrammer?.id,
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
      const otherTask = task as Partial<Api.MDR.OtherTask>;
      return {
        ...baseParams,
        deliverable_type: 'OTHER_LOOKUP',
        deliverable_name: otherTask.taskName || '',
        task_name: otherTask.taskName || '',
        description: otherTask.description,
        prod_programmer_id: task.primaryProgrammer?.id,
        qc_programmer_id: task.qcProgrammer?.id
      };
    }
  }
}

/**
 * 将前端状态映射为后端状态参数
 */
export function mapStatusToBackend(status: Api.MDR.TaskStatus): {
  prod_status: BackendProdStatus;
  qc_status: BackendQCStatus;
} {
  const mapping: Record<Api.MDR.TaskStatus, { prod_status: BackendProdStatus; qc_status: BackendQCStatus }> = {
    'Not Started': { prod_status: 'Not_Started', qc_status: 'Not_Started' },
    'In Progress': { prod_status: 'Programming', qc_status: 'Not_Started' },
    'Ready for QC': { prod_status: 'Ready_for_QC', qc_status: 'Not_Started' },
    'QC Pass': { prod_status: 'Completed', qc_status: 'Passed' },
    'Signed Off': { prod_status: 'Completed', qc_status: 'Passed' }
  };
  return mapping[status];
}

export type { BackendTracker, BackendDeliverableType, BackendProdStatus, BackendQCStatus };