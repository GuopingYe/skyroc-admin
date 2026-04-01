import { useQuery } from '@tanstack/react-query';

import {
  fetchCodelistTerms,
  fetchCtCodelists,
  fetchDatasetVariables,
  fetchGlobalLibraryTree,
  fetchSpecifications,
  fetchTableSchema,
  fetchVersionDatasets
} from '../api';
import { QUERY_KEYS } from '../keys';

/** 获取 CDISC 标准层级树 Hook */
export function useGlobalLibraryTree() {
  return useQuery({
    queryFn: fetchGlobalLibraryTree,
    queryKey: QUERY_KEYS.GLOBAL_LIBRARY.TREE,
    // 5 minutes
    retry: 1,
    staleTime: 5 * 60 * 1000
  });
}

/** 获取版本下的数据集列表 Hook */
export function useVersionDatasets(versionId: number | null, params?: Api.GlobalLibrary.DatasetListParams) {
  return useQuery({
    enabled: versionId !== null,
    queryFn: () => fetchVersionDatasets(versionId!, params),
    queryKey: QUERY_KEYS.GLOBAL_LIBRARY.DATASETS(versionId!, params),
    retry: 1
  });
}

/** 获取数据集下的变量列表 Hook 支持分页、搜索和 Core 过滤 */
export function useDatasetVariables(datasetId: number | null, params?: Api.GlobalLibrary.VariableListParams) {
  return useQuery({
    enabled: datasetId !== null,
    // 禁用缓存，每次都获取最新数据
    gcTime: 0,
    queryFn: () => fetchDatasetVariables(datasetId!, params),
    queryKey: QUERY_KEYS.GLOBAL_LIBRARY.VARIABLES(datasetId!, params),
    retry: 1,
    staleTime: 0
  });
}

/** 获取所有可用规范列表 Hook */
export function useSpecifications(specType?: string) {
  return useQuery({
    queryFn: () => fetchSpecifications(specType),
    queryKey: QUERY_KEYS.GLOBAL_LIBRARY.SPECIFICATIONS(specType),
    // 5 minutes
    retry: 1,
    staleTime: 5 * 60 * 1000
  });
}

/** 获取表格 Schema Hook Schema-Driven UI 支持 */
export function useTableSchema(standardType: string | null) {
  return useQuery({
    enabled: standardType !== null,
    queryFn: () => fetchTableSchema(standardType!),
    queryKey: QUERY_KEYS.GLOBAL_LIBRARY.SCHEMA(standardType!),
    // 30 minutes - Schema 不常变化
    retry: 1,
    staleTime: 30 * 60 * 1000
  });
}

// ============================================================
// CT (Controlled Terminology) Hooks
// ============================================================

/** 获取 CT 版本下的 Codelist 列表 Hook */
export function useCtCodelists(scopeNodeId: number | null, params?: Api.GlobalLibrary.CodelistListParams) {
  return useQuery({
    enabled: scopeNodeId !== null,
    placeholderData: previousData => previousData,
    queryFn: () => fetchCtCodelists(scopeNodeId!, params),
    queryKey: QUERY_KEYS.GLOBAL_LIBRARY.CODELISTS(scopeNodeId!, params),
    retry: 1
  });
}

/** 获取 Codelist 下的 Term 列表 Hook */
export function useCodelistTerms(codelistId: number | null, params?: Api.GlobalLibrary.TermListParams) {
  return useQuery({
    enabled: codelistId !== null,
    placeholderData: previousData => previousData,
    queryFn: () => fetchCodelistTerms(codelistId!, params),
    queryKey: QUERY_KEYS.GLOBAL_LIBRARY.TERMS(codelistId!, params),
    retry: 1
  });
}
