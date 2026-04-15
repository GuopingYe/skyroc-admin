import { rbacRequest } from '../request/rbac';
import { CDISC_SYNC_URLS } from '../urls';

export function fetchCdiscConfig() {
  return rbacRequest<Api.CdiscSync.CdiscConfig>({
    method: 'get',
    url: CDISC_SYNC_URLS.CONFIG
  });
}

export function updateCdiscConfig(data: Api.CdiscSync.CdiscConfigUpdate) {
  return rbacRequest<Api.CdiscSync.CdiscConfig>({
    data,
    method: 'put',
    url: CDISC_SYNC_URLS.CONFIG
  });
}

export function testCdiscConnection(data?: Api.CdiscSync.CdiscConfigUpdate) {
  return rbacRequest<Api.CdiscSync.CdiscConfigTestResponse>({
    data,
    method: 'post',
    url: CDISC_SYNC_URLS.TEST_CONNECTION
  });
}

export function updateSchedule(data: Api.CdiscSync.ScheduleUpdate) {
  return rbacRequest<Api.CdiscSync.CdiscConfig>({
    data,
    method: 'put',
    url: CDISC_SYNC_URLS.SCHEDULE
  });
}

export function triggerSync(data: Api.CdiscSync.SyncTriggerRequest) {
  return rbacRequest<Api.CdiscSync.SyncTriggerResponse>({
    data,
    method: 'post',
    url: CDISC_SYNC_URLS.TRIGGER_SYNC
  });
}

export function cancelSync(taskId: string) {
  return rbacRequest<Api.CdiscSync.SyncTriggerResponse>({
    method: 'post',
    url: CDISC_SYNC_URLS.CANCEL_SYNC(taskId)
  });
}

export function retrySync(taskId: string) {
  return rbacRequest<Api.CdiscSync.SyncTriggerResponse>({
    method: 'post',
    url: CDISC_SYNC_URLS.RETRY_SYNC(taskId)
  });
}

export function fetchTaskStatus(taskId: string) {
  return rbacRequest<Api.CdiscSync.SyncProgress>({
    method: 'get',
    url: CDISC_SYNC_URLS.TASK_STATUS(taskId)
  });
}

export function fetchSyncLogs(params?: { status?: string; standard_type?: string; offset?: number; limit?: number }) {
  return rbacRequest<Api.CdiscSync.SyncLogListResponse>({
    method: 'get',
    params,
    url: CDISC_SYNC_URLS.SYNC_LOGS
  });
}

export function fetchAvailableVersions(standardType: string) {
  return rbacRequest<Api.CdiscSync.AvailableVersionsResponse>({
    method: 'get',
    url: CDISC_SYNC_URLS.AVAILABLE_VERSIONS(standardType)
  });
}
