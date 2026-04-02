import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelSync,
  fetchCdiscConfig,
  fetchSyncLogs,
  fetchTaskStatus,
  retrySync,
  testCdiscConnection,
  triggerSync,
  updateCdiscConfig,
  updateSchedule
} from '../api/cdisc-sync';
import { QUERY_KEYS } from '../keys';

export function useCdiscConfig(enabled = true) {
  return useQuery({
    enabled,
    queryFn: fetchCdiscConfig,
    queryKey: QUERY_KEYS.CDISC_SYNC.CONFIG,
    staleTime: 5 * 60 * 1000
  });
}

export function useUpdateCdiscConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCdiscConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CDISC_SYNC.CONFIG });
    }
  });
}

export function useTestCdiscConnection() {
  return useMutation({
    mutationFn: testCdiscConnection
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CDISC_SYNC.CONFIG });
    }
  });
}

export function useTriggerSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: triggerSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CDISC_SYNC.SYNC_LOGS() });
    }
  });
}

export function useCancelSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CDISC_SYNC.SYNC_LOGS() });
    }
  });
}

export function useRetrySync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: retrySync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CDISC_SYNC.SYNC_LOGS() });
    }
  });
}

export function useTaskPolling(taskId: string | null) {
  return useQuery({
    enabled: Boolean(taskId),
    queryFn: () => fetchTaskStatus(taskId!),
    queryKey: QUERY_KEYS.CDISC_SYNC.TASK_STATUS(taskId ?? ''),
    refetchInterval: query => {
      const status = query.state.data?.status;
      if (status === 'running' || status === 'pending') {
        return 3000;
      }
      return false;
    },
    staleTime: 0
  });
}

export function useSyncLogs(
  params?: { status?: string; standard_type?: string; offset?: number; limit?: number },
  enabled = true
) {
  return useQuery({
    enabled,
    queryFn: () => fetchSyncLogs(params),
    queryKey: QUERY_KEYS.CDISC_SYNC.SYNC_LOGS(params),
    staleTime: 30 * 1000
  });
}
