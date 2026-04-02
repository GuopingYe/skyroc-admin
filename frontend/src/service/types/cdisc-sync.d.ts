/**
 * 命名空间 Api.CdiscSync
 *
 * 后端 API 模块：CDISC Library 同步管理
 */
declare namespace Api {
  namespace CdiscSync {
    /** CDISC 配置 */
    interface CdiscConfig {
      id: number;
      api_base_url: string;
      api_key_masked: string;
      enabled_standard_types: string[];
      sync_schedule: ScheduleInfo;
      sync_enabled: boolean;
      updated_at: string;
    }

    /** 调度信息 */
    interface ScheduleInfo {
      type: 'daily' | 'weekly' | 'monthly' | 'custom';
      interval_hours?: number | null;
      day_of_week?: number | null;
      day_of_month?: number | null;
    }

    /** 更新配置请求 */
    interface CdiscConfigUpdate {
      api_base_url?: string;
      api_key?: string;
      enabled_standard_types?: string[];
    }

    /** 测试连接响应 */
    interface CdiscConfigTestResponse {
      status: 'success' | 'error';
      message: string;
    }

    /** 更新调度请求 */
    interface ScheduleUpdate {
      type: 'daily' | 'weekly' | 'monthly' | 'custom';
      interval_hours?: number | null;
      day_of_week?: number | null;
      day_of_month?: number | null;
      sync_enabled: boolean;
    }

    /** 同步触发请求 */
    interface SyncTriggerRequest {
      standard_type: string;
      version: string;
    }

    /** 同步触发响应 */
    interface SyncTriggerResponse {
      task_id: string;
      message: string;
    }

    /** 任务进度 */
    interface SyncProgress {
      task_id: string;
      standard_type: string;
      version: string;
      status: 'pending' | 'running' | 'completed' | 'failed' | 'interrupted';
      progress: number;
    }

    /** 同步日志项 */
    interface SyncLogItem {
      id: number;
      task_id: string;
      standard_type: string;
      version: string;
      status: 'pending' | 'running' | 'completed' | 'failed' | 'interrupted';
      progress: number;
      result_summary: Record<string, unknown> | null;
      started_at: string | null;
      completed_at: string | null;
      triggered_by: string | null;
      created_by: string | null;
      error_message: string | null;
    }

    /** 同步日志列表响应 */
    interface SyncLogListResponse {
      total: number;
      items: SyncLogItem[];
      offset: number;
      limit: number;
    }
  }
}
