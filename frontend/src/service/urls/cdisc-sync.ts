/** CDISC Sync Module URLs */

export const CDISC_SYNC_URLS = {
  CONFIG: '/api/v1/admin/cdisc-config',
  TEST_CONNECTION: '/api/v1/admin/cdisc-config/test-connection',
  SCHEDULE: '/api/v1/admin/cdisc-config/schedule',
  TRIGGER_SYNC: '/api/v1/admin/sync/cdisc/trigger',
  CANCEL_SYNC: (taskId: string) => `/api/v1/admin/sync/cdisc/${taskId}/cancel`,
  RETRY_SYNC: (taskId: string) => `/api/v1/admin/sync/cdisc/${taskId}/retry`,
  TASK_STATUS: (taskId: string) => `/api/v1/admin/sync/cdisc/tasks/${taskId}`,
  SYNC_LOGS: '/api/v1/admin/sync/cdisc/logs',
  SYNC_LOG_DETAIL: (taskId: string) => `/api/v1/admin/sync/cdisc/logs/${taskId}`,
  AVAILABLE_VERSIONS: (standardType: string) =>
    `/api/v1/admin/sync/cdisc/versions?standard_type=${encodeURIComponent(standardType)}`
} as const;
