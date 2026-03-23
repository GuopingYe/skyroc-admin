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