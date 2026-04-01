import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchCreateReferenceItem,
  fetchDeactivateReferenceItem,
  fetchReferenceCategories,
  fetchReferenceItem,
  fetchReferenceItems,
  fetchRestoreReferenceItem,
  fetchUpdateReferenceItem
} from '../api/reference-data';
import { QUERY_KEYS } from '../keys';

export function useReferenceCategories(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.REFERENCE_DATA.CATEGORIES,
    queryFn: fetchReferenceCategories,
    enabled,
    staleTime: 5 * 60 * 1000
  });
}

export function useReferenceItems(
  category: string,
  params?: { is_active?: boolean; is_deleted?: boolean },
  enabled = true
) {
  return useQuery({
    queryKey: QUERY_KEYS.REFERENCE_DATA.ITEMS(category, params),
    queryFn: () => fetchReferenceItems(category, params),
    enabled: enabled && Boolean(category),
    staleTime: 5 * 60 * 1000
  });
}

export function useReferenceOptions(category: string, enabled = true) {
  const { data, isLoading } = useReferenceItems(category, { is_active: true }, enabled);
  const options: Api.ReferenceData.DropdownOption[] = (data || []).map(item => ({
    label: item.label,
    value: item.code
  }));
  return { options, isLoading };
}

export function useReferenceItem(category: string, code: string, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.REFERENCE_DATA.ITEM(category, code),
    queryFn: () => fetchReferenceItem(category, code),
    enabled: enabled && Boolean(category) && Boolean(code)
  });
}

export function useCreateReferenceItem(category: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Api.ReferenceData.CreateRequest) => fetchCreateReferenceItem(category, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referenceData'] });
    }
  });
}

export function useUpdateReferenceItem(category: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Api.ReferenceData.UpdateRequest }) =>
      fetchUpdateReferenceItem(category, code, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referenceData'] });
    }
  });
}

export function useDeactivateReferenceItem(category: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => fetchDeactivateReferenceItem(category, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referenceData'] });
    }
  });
}

export function useRestoreReferenceItem(category: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => fetchRestoreReferenceItem(category, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referenceData'] });
    }
  });
}
