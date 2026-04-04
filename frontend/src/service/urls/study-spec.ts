/** Study Spec module URLs */

export const STUDY_SPEC_URLS = {
  ADD_DATASET_FROM_GLOBAL_LIBRARY: '/api/v1/study-specs/:specId/datasets/from-global-library',
  CREATE_CUSTOM_DATASET: '/api/v1/study-specs/:specId/datasets/custom',
  // Variable APIs
  DATASET_VARIABLES: '/api/v1/study-specs/datasets/:datasetId/variables',
  // Dataset CRUD
  DELETE_DATASET: (specId: number | string, datasetId: number | string) =>
    `/api/v1/study-specs/${specId}/datasets/${datasetId}`,
  PATCH_DATASET: (specId: number | string, datasetId: number | string) =>
    `/api/v1/study-specs/${specId}/datasets/${datasetId}`,
  // Dataset APIs
  STUDY_DATASETS: '/api/v1/study-specs/:specId/datasets',
  STUDY_SPEC_DETAIL: '/api/v1/study-specs/:specId',
  // Specification APIs
  STUDY_SPECS: '/api/v1/study-specs',
  // Spec integration endpoints
  SPEC_COPY: '/api/v1/study-specs/copy',
  SPEC_INITIALIZE: '/api/v1/study-specs/initialize',
  SPEC_PUSH_UPSTREAM: (specId: number | string) =>
    `/api/v1/study-specs/${specId}/push-upstream`,
  SPEC_SOURCES: '/api/v1/study-specs/sources',
  SPEC_TOGGLE_DATASET: (specId: number | string, datasetId: number | string) =>
    `/api/v1/study-specs/${specId}/datasets/${datasetId}/toggle`,
};
