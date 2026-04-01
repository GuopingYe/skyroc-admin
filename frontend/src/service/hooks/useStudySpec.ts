import { useQuery } from '@tanstack/react-query';

import { fetchStudyDatasets, fetchStudySpecDetail, fetchStudySpecs, fetchStudyVariables } from '../api';
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
