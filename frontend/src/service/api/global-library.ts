import { glRequest } from '../request/global-library';
import { GLOBAL_LIBRARY_URLS } from '../urls';

/** 获取 CDISC 标准层级树 */
export function fetchGlobalLibraryTree() {
  return glRequest<Api.GlobalLibrary.TreeNode[]>({
    method: 'get',
    url: GLOBAL_LIBRARY_URLS.TREE
  });
}

/** 获取版本下的数据集列表 */
export function fetchVersionDatasets(versionId: number, params?: Api.GlobalLibrary.DatasetListParams) {
  return glRequest<Api.GlobalLibrary.DatasetListResponse>({
    method: 'get',
    params,
    url: GLOBAL_LIBRARY_URLS.VERSION_DATASETS.replace(':versionId', String(versionId))
  });
}

/** 获取数据集下的变量列表（支持分页） */
export function fetchDatasetVariables(datasetId: number, params?: Api.GlobalLibrary.VariableListParams) {
  return glRequest<Api.GlobalLibrary.VariableListResponse>({
    method: 'get',
    params: {
      core: params?.core,
      limit: params?.limit ?? 20,
      offset: params?.offset ?? 0,
      search: params?.search
    },
    url: GLOBAL_LIBRARY_URLS.DATASET_VARIABLES.replace(':datasetId', String(datasetId))
  });
}

/** 获取所有可用规范列表 */
export function fetchSpecifications(specType?: string) {
  return glRequest<Api.GlobalLibrary.Specification[]>({
    method: 'get',
    params: specType ? { spec_type: specType } : undefined,
    url: GLOBAL_LIBRARY_URLS.SPECIFICATIONS
  });
}

/** 获取表格 Schema（Schema-Driven UI） */
export function fetchTableSchema(standardType: string) {
  return glRequest<Api.GlobalLibrary.TableSchema>({
    method: 'get',
    url: GLOBAL_LIBRARY_URLS.SCHEMA.replace(':standardType', standardType)
  });
}

// ============================================================
// CT (Controlled Terminology) APIs
// ============================================================

/** 获取 CT 版本下的 Codelist 列表 */
export function fetchCtCodelists(scopeNodeId: number, params?: Api.GlobalLibrary.CodelistListParams) {
  return glRequest<Api.GlobalLibrary.CodelistListResponse>({
    method: 'get',
    params: {
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
      search: params?.search
    },
    url: GLOBAL_LIBRARY_URLS.CT_CODELISTS.replace(':scopeNodeId', String(scopeNodeId))
  });
}

/** 获取 Codelist 下的 Term 列表 */
export function fetchCodelistTerms(codelistId: number, params?: Api.GlobalLibrary.TermListParams) {
  return glRequest<Api.GlobalLibrary.TermListResponse>({
    method: 'get',
    params: {
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
      search: params?.search
    },
    url: GLOBAL_LIBRARY_URLS.CODELIST_TERMS.replace(':codelistId', String(codelistId))
  });
}
