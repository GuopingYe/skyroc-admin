import { request } from '../request';
import { STUDY_SPEC_URLS } from '../urls';

// ============================================================
// Specification APIs
// ============================================================

/** 获取 Study Spec 列表 */
export function fetchStudySpecs(params?: Api.StudySpec.StudySpecListParams) {
  return request<Api.StudySpec.StudySpecListResponse>({
    method: 'get',
    params,
    url: STUDY_SPEC_URLS.STUDY_SPECS
  });
}

/** 获取 Study Spec 详情 */
export function fetchStudySpecDetail(specId: number) {
  return request<Api.StudySpec.StudySpecDetail>({
    method: 'get',
    url: STUDY_SPEC_URLS.STUDY_SPEC_DETAIL.replace(':specId', String(specId))
  });
}

// ============================================================
// Dataset APIs
// ============================================================

/** 获取数据集列表 */
export function fetchStudyDatasets(specId: number, params?: Api.StudySpec.StudyDatasetListParams) {
  return request<Api.StudySpec.StudyDatasetListResponse>({
    method: 'get',
    params,
    url: STUDY_SPEC_URLS.STUDY_DATASETS.replace(':specId', String(specId))
  });
}

// ============================================================
// Variable APIs
// ============================================================

/** 获取变量列表 */
export function fetchStudyVariables(datasetId: number, params?: Api.StudySpec.StudyVariableListParams) {
  return request<Api.StudySpec.StudyVariableListResponse>({
    method: 'get',
    params,
    url: STUDY_SPEC_URLS.DATASET_VARIABLES.replace(':datasetId', String(datasetId))
  });
}

// ============================================================
// Add Dataset APIs
// ============================================================

/** 从 Global Library 添加 Dataset */
export function addDatasetFromGlobalLibrary(specId: number, data: Api.StudySpec.AddDatasetFromGlobalLibraryRequest) {
  return request<Api.StudySpec.AddDatasetFromGlobalLibraryResponse>({
    data,
    method: 'post',
    url: STUDY_SPEC_URLS.ADD_DATASET_FROM_GLOBAL_LIBRARY.replace(':specId', String(specId))
  });
}

/** 创建自定义 Domain */
export function createCustomDataset(specId: number, data: Api.StudySpec.CreateCustomDatasetRequest) {
  return request<Api.StudySpec.CreateCustomDatasetResponse>({
    data,
    method: 'post',
    url: STUDY_SPEC_URLS.CREATE_CUSTOM_DATASET.replace(':specId', String(specId))
  });
}

// ============================================================
// Types for new spec integration endpoints
// ============================================================

export interface SpecSource {
  id: number
  dataset_name: string
  description: string | null
  class_type: string
  variable_count: number
  spec_id: number
  spec_name: string
  origin: 'cdisc' | 'ta' | 'product'
}

export interface SpecSourcesResponse {
  cdisc_domains: SpecSource[]
  ta_domains: SpecSource[]
  product_domains: SpecSource[]
}

export interface CopySpecRequest {
  source_spec_id: number
  target_scope_node_id: number
  name?: string
}

export interface CopySpecResponse {
  id: number
  name: string
  spec_type: string
  source_spec_id: number
  dataset_count: number
  variable_count: number
}

export interface InitializeSpecRequest {
  scope_node_id: number
  spec_type: string
  name?: string
  selected_dataset_ids: number[]
}

export interface PushUpstreamResponse {
  parent_spec_id: number
  added_datasets: string[]
  modified_datasets: string[]
  deleted_datasets: string[]
  status: string
}

export interface StudyVariable {
  id: number
  dataset_id: number
  variable_name: string
  variable_label: string | null
  description: string | null
  data_type: string
  length: number | null
  core: string
  sort_order: number
  base_id: number | null
  override_type: string
  origin_type: string
  standard_metadata?: {
    role?: string
    codelist?: string
    source_derivation?: string
    implementation_notes?: string
    comment?: string
    global_library_ref?: string
  }
}

// ============================================================
// Spec integration API functions
// ============================================================

/** 获取 Spec Sources（CDISC / TA / Product 域列表） */
export function getSpecSources(scopeNodeId: number, specType = 'SDTM') {
  return request<SpecSourcesResponse>({
    method: 'get',
    params: { scope_node_id: scopeNodeId, spec_type: specType },
    url: STUDY_SPEC_URLS.SPEC_SOURCES
  });
}

/** 复制 Spec 到新 Scope Node */
export function copySpec(data: CopySpecRequest) {
  return request<CopySpecResponse>({
    data,
    method: 'post',
    url: STUDY_SPEC_URLS.SPEC_COPY
  });
}

/** 从选定数据集初始化 Spec */
export function initializeSpec(data: InitializeSpecRequest) {
  return request<{ id: number; name: string; dataset_count: number; variable_count: number }>({
    data,
    method: 'post',
    url: STUDY_SPEC_URLS.SPEC_INITIALIZE
  });
}

/** 切换数据集的 override_type（排除/包含） */
export function toggleDataset(specId: number, datasetId: number, exclude: boolean) {
  return request<{ id: number; dataset_name: string; override_type: string }>({
    data: { exclude },
    method: 'put',
    url: STUDY_SPEC_URLS.SPEC_TOGGLE_DATASET(specId, datasetId)
  });
}

/** 将分析级覆盖推送到父 Spec */
export function pushUpstream(specId: number) {
  return request<PushUpstreamResponse>({
    method: 'post',
    url: STUDY_SPEC_URLS.SPEC_PUSH_UPSTREAM(specId)
  });
}
