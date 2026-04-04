import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  copySpec,
  deleteDataset,
  fetchStudyDatasets,
  fetchStudySpecDetail,
  fetchStudySpecs,
  fetchStudyVariables,
  getSpecSources,
  initializeSpec,
  patchDataset,
  pushUpstream,
  toggleDataset,
  type CopySpecRequest,
  type InitializeSpecRequest,
} from '../api';
import { QUERY_KEYS } from '../keys';

// ============================================================
// Specification Hooks
// ============================================================

/** 获取 Study Spec 列表 Hook */
export function useStudySpecs(params?: Api.StudySpec.StudySpecListParams) {
  return useQuery({
    queryFn: () => fetchStudySpecs(params),
    queryKey: QUERY_KEYS.STUDY_SPEC.LIST(params),
    retry: 1,
    staleTime: 2 * 60 * 1000 // 2 minutes
  });
}

/** 获取 Study Spec 详情 Hook */
export function useStudySpecDetail(specId: number | null) {
  return useQuery({
    enabled: specId !== null,
    queryFn: () => fetchStudySpecDetail(specId!),
    queryKey: QUERY_KEYS.STUDY_SPEC.DETAIL(specId!),
    retry: 1,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

// ============================================================
// Dataset Hooks
// ============================================================

/** 获取数据集列表 Hook */
export function useStudyDatasets(specId: number | null, params?: Api.StudySpec.StudyDatasetListParams) {
  return useQuery({
    enabled: specId !== null,
    queryFn: () => fetchStudyDatasets(specId!, params),
    queryKey: QUERY_KEYS.STUDY_SPEC.DATASETS(specId!, params),
    retry: 1,
    staleTime: 2 * 60 * 1000 // 2 minutes
  });
}

// ============================================================
// Variable Hooks
// ============================================================

/** 获取变量列表 Hook */
export function useStudyVariables(datasetId: number | null, params?: Api.StudySpec.StudyVariableListParams) {
  return useQuery({
    enabled: datasetId !== null,
    queryFn: () => fetchStudyVariables(datasetId!, params),
    queryKey: QUERY_KEYS.STUDY_SPEC.VARIABLES(datasetId!, params),
    retry: 1,
    staleTime: 0 // 禁用缓存，每次都获取最新数据
  });
}

// ============================================================
// Spec Integration Hooks (sources, copy, initialize, toggle, push-upstream)
// ============================================================

export const STUDY_SPEC_QUERY_KEYS = {
  sources: (scopeNodeId: number, specType: string) =>
    ['study-spec', 'sources', scopeNodeId, specType] as const,
};

/** 获取 Spec Sources（CDISC / TA / Product 域列表）Hook */
export function useSpecSources(scopeNodeId: number | undefined, specType = 'SDTM') {
  return useQuery({
    enabled: !!scopeNodeId,
    queryFn: () => getSpecSources(scopeNodeId!, specType),
    queryKey: STUDY_SPEC_QUERY_KEYS.sources(scopeNodeId ?? 0, specType),
  });
}

/** 复制 Spec Mutation */
export function useCopySpec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CopySpecRequest) => copySpec(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studySpec'] });
    },
  });
}

/** 初始化 Spec Mutation */
export function useInitializeSpec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InitializeSpecRequest) => initializeSpec(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studySpec'] });
    },
  });
}

/** 切换数据集 Mutation */
export function useToggleDataset(specId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ datasetId, exclude }: { datasetId: number; exclude: boolean }) =>
      toggleDataset(specId, datasetId, exclude),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studySpec'] });
    },
  });
}

/** 推送覆盖到父 Spec Mutation */
export function usePushUpstream() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (specId: number) => pushUpstream(specId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studySpec'] });
    },
  });
}

/** 更新数据集扩展信息 Mutation */
export function usePatchDataset(specId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ datasetId, data }: { datasetId: number; data: Api.StudySpec.PatchDatasetRequest }) =>
      patchDataset(specId, datasetId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.STUDY_SPEC.DATASETS(specId) });
    },
  });
}

/** 软删除数据集 Mutation */
export function useDeleteDataset(specId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datasetId: number) => deleteDataset(specId, datasetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.STUDY_SPEC.DATASETS(specId) });
    },
  });
}
