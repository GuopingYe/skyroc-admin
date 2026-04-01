/**
 * Programming Tracker 数据映射层
 *
 * 负责将后端 ProgrammingTracker 模型转换为前端 TrackerTask 类型
 *
 * 后端使用双轨状态机 (prod_status + qc_status) 前端使用单一 status 字段
 */

// Api.MDR 类型通过全局声明文件 (service/types/mdr.d.ts) 提供

// 后端状态枚举值
type BackendProdStatus = 'Completed' | 'Not_Started' | 'Programming' | 'Ready_for_QC';
type BackendQCStatus = 'In_Progress' | 'Issues_Found' | 'Not_Started' | 'Passed';
type BackendDeliverableType = 'ADaM' | 'OTHER_LOOKUP' | 'SDTM' | 'TFL';

// 后端响应类型
interface BackendTracker {
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
  id: number;
  is_deleted: boolean;
  output_file_name: string | null;
  // 旧版状态
  priority: 'High' | 'Low' | 'Medium';
  prod_file_path: string | null;
  prod_program_name: string | null;
  prod_programmer_id: string | null;
  prod_status: BackendProdStatus;
  qc_completed_at: string | null;
  qc_file_path: string | null;
  qc_method: string;
  qc_program_name: string | null;
  qc_programmer_id: string | null;
  qc_started_at: string | null;
  qc_status: BackendQCStatus;
  started_at: string | null;
  status: string;
  task_name: string;
  tfl_metadata: Record<string, unknown> | null;
  updated_at: string;
  updated_by: string | null;
}

/**
 * 将后端双轨状态映射为前端单一状态
 *
 * 映射规则：
 *
 * - prod_status=Completed + qc_status=Passed -> Signed Off
 * - qc_status=Passed -> QC Pass
 * - prod_status=Ready_for_QC -> Ready for QC
 * - qc_status=Issues_Found -> In Progress (有问题需修复)
 * - prod_status=Programming -> In Progress
 * - prod_status=Not_Started -> Not Started
 */
function mapStatus(
  prodStatus: BackendProdStatus,
  qcStatus: BackendQCStatus
): 'In Progress' | 'Not Started' | 'QC Pass' | 'Ready for QC' | 'Signed Off' {
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

/** 将后端 deliverable_type 转换为前端 category */
function mapCategory(deliverableType: BackendDeliverableType): 'ADaM' | 'Other' | 'SDTM' | 'TFL' {
  const mapping: Record<BackendDeliverableType, Api.MDR.TaskCategory> = {
    ADaM: 'ADaM',
    OTHER_LOOKUP: 'Other',
    SDTM: 'SDTM',
    TFL: 'TFL'
  };
  return mapping[deliverableType] || 'Other';
}

/** 创建简化的人员对象 */
function createPerson(id: string | null, name?: string): Api.MDR.Person | null {
  if (!id) return null;
  return {
    email: `${id}@pharma.com`,
    id,
    name: name || id // 默认邮箱格式
  };
}

/** 将后端 ProgrammingTracker 转换为前端 TrackerTask */
export function mapBackendToTrackerTask(backend: BackendTracker): Api.MDR.TrackerTask {
  const category = mapCategory(backend.deliverable_type);
  const baseTask = {
    createdAt: backend.created_at,
    id: String(backend.id),
    primaryProgrammer: createPerson(backend.prod_programmer_id) || {
      email: '',
      id: 'unknown',
      name: 'Unassigned'
    },
    qcProgrammer: createPerson(backend.qc_programmer_id) || {
      email: '',
      id: 'unknown',
      name: 'Unassigned'
    },
    qcRounds: [],
    status: mapStatus(backend.prod_status, backend.qc_status),
    updatedAt: backend.updated_at // QC rounds 需要单独查询
  };

  // 根据 category 构建不同类型的任务
  switch (category) {
    case 'SDTM':
      return {
        ...baseTask,
        category: 'SDTM',
        datasetLabel: backend.task_name,
        domain: backend.deliverable_name,
        sdrSource: backend.prod_file_path || ''
      } as Api.MDR.SDTMTask;

    case 'ADaM':
      return {
        ...baseTask,
        analysisPopulation: (backend.tfl_metadata?.population as string) || '',
        category: 'ADaM',
        dataset: backend.deliverable_name,
        label: backend.task_name
      } as Api.MDR.ADaMTask;

    case 'TFL': {
      const tflMeta = backend.tfl_metadata || {};
      return {
        ...baseTask,
        category: 'TFL',
        outputId: (tflMeta.outputId as string) || backend.deliverable_name,
        population: (tflMeta.population as string) || '',
        sourceDatasets: tflMeta.sourceDatasets as string[] | undefined,
        title: backend.task_name,
        type: (tflMeta.type as Api.MDR.TFLOutputType) || 'Table'
      } as Api.MDR.TFLTask;
    }

    case 'Other':
    default:
      return {
        ...baseTask,
        category: 'Other',
        description: backend.description || '',
        taskCategory: backend.delivery_batch || 'General',
        taskName: backend.task_name
      } as Api.MDR.OtherTask;
  }
}

/** 将前端 TrackerTask 转换为后端创建参数 */
export function mapTrackerTaskToCreateParams(
  task: Partial<Api.MDR.TrackerTask>,
  analysisId: string
): Record<string, unknown> {
  const baseParams = {
    analysis_id: Number.parseInt(analysisId, 10),
    created_by: task.primaryProgrammer?.id || 'system',
    deliverable_name: '',
    task_name: ''
  };

  switch (task.category) {
    case 'SDTM': {
      const sdtmTask = task as Partial<Api.MDR.SDTMTask>;
      return {
        ...baseParams,
        deliverable_name: sdtmTask.domain || '',
        deliverable_type: 'SDTM',
        prod_programmer_id: task.primaryProgrammer?.id,
        qc_programmer_id: task.qcProgrammer?.id,
        task_name: sdtmTask.datasetLabel || ''
      };
    }

    case 'ADaM': {
      const adamTask = task as Partial<Api.MDR.ADaMTask>;
      return {
        ...baseParams,
        deliverable_name: adamTask.dataset || '',
        deliverable_type: 'ADaM',
        prod_programmer_id: task.primaryProgrammer?.id,
        qc_programmer_id: task.qcProgrammer?.id,
        task_name: adamTask.label || '',
        tfl_metadata: {
          population: adamTask.analysisPopulation
        }
      };
    }

    case 'TFL': {
      const tflTask = task as Partial<Api.MDR.TFLTask>;
      return {
        ...baseParams,
        deliverable_name: tflTask.outputId || '',
        deliverable_type: 'TFL',
        prod_programmer_id: task.primaryProgrammer?.id,
        qc_programmer_id: task.qcProgrammer?.id,
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
      const otherTask = task as Partial<Api.MDR.OtherTask>;
      return {
        ...baseParams,
        deliverable_name: otherTask.taskName || '',
        deliverable_type: 'OTHER_LOOKUP',
        description: otherTask.description,
        prod_programmer_id: task.primaryProgrammer?.id,
        qc_programmer_id: task.qcProgrammer?.id,
        task_name: otherTask.taskName || ''
      };
    }
  }
}

/** 将前端状态映射为后端状态参数 */
export function mapStatusToBackend(status: Api.MDR.TaskStatus): {
  prod_status: BackendProdStatus;
  qc_status: BackendQCStatus;
} {
  const mapping: Record<Api.MDR.TaskStatus, { prod_status: BackendProdStatus; qc_status: BackendQCStatus }> = {
    'In Progress': { prod_status: 'Programming', qc_status: 'Not_Started' },
    'Not Started': { prod_status: 'Not_Started', qc_status: 'Not_Started' },
    'QC Pass': { prod_status: 'Completed', qc_status: 'Passed' },
    'Ready for QC': { prod_status: 'Ready_for_QC', qc_status: 'Not_Started' },
    'Signed Off': { prod_status: 'Completed', qc_status: 'Passed' }
  };
  return mapping[status];
}

export type { BackendDeliverableType, BackendProdStatus, BackendQCStatus, BackendTracker };
