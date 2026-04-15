/**
 * Api.CdiscSync — CDISC Library sync management types
 */
declare namespace Api {
  namespace CdiscSync {
    /** CDISC configuration */
    interface CdiscConfig {
      id: number;
      api_base_url: string;
      api_key_masked: string;
      enabled_standard_types: string[] | null;
      sync_schedule: ScheduleInfo | null;
      sync_enabled: boolean;
      updated_at: string;
    }

    /** Schedule info */
    interface ScheduleInfo {
      type: 'daily' | 'weekly' | 'monthly' | 'custom';
      interval_hours?: number | null;
      day_of_week?: string | null;
      day_of_month?: number | null;
    }

    /** Update config request */
    interface CdiscConfigUpdate {
      api_base_url?: string;
      api_key?: string;
      enabled_standard_types?: string[];
    }

    /** Test connection response */
    interface CdiscConfigTestResponse {
      status: 'success' | 'error';
      message: string;
    }

    /** Update schedule request */
    interface ScheduleUpdate {
      type: 'daily' | 'weekly' | 'monthly' | 'custom';
      interval_hours?: number | null;
      day_of_week?: string | null;
      day_of_month?: number | null;
      sync_enabled: boolean;
    }

    /** Sync trigger request */
    interface SyncTriggerRequest {
      standard_type: string;
      version: string;
    }

    /** Sync trigger response */
    interface SyncTriggerResponse {
      task_id: string;
      message: string;
    }

    /** Progress checkpoint */
    interface ProgressInfo {
      current_step: string;
      completed: number;
      total: number;
      percentage: number;
    }

    /** Task progress */
    interface SyncProgress {
      task_id: string;
      standard_type: string;
      version: string;
      status: 'pending' | 'running' | 'completed' | 'failed' | 'interrupted';
      progress: ProgressInfo | null;
    }

    /** Sync log item */
    interface SyncLogItem {
      id: number;
      task_id: string;
      standard_type: string;
      version: string;
      status: 'pending' | 'running' | 'completed' | 'failed' | 'interrupted';
      progress: ProgressInfo | null;
      result_summary: Record<string, unknown> | null;
      started_at: string | null;
      completed_at: string | null;
      triggered_by: string;
      created_by: string | null;
      error_message: string | null;
    }

    /** Sync log list response */
    interface SyncLogListResponse {
      total: number;
      items: SyncLogItem[];
      offset: number;
      limit: number;
    }

    /** Available versions for a standard type */
    interface AvailableVersionsResponse {
      standard_type: string;
      versions: string[];
      count: number;
      note?: string | null;
    }
  }
}
