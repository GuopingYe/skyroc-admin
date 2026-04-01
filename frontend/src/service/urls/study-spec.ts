/** Study Spec module URLs */

export const STUDY_SPEC_URLS = {
  ADD_DATASET_FROM_GLOBAL_LIBRARY: '/api/v1/study-specs/:specId/datasets/from-global-library',
  CREATE_CUSTOM_DATASET: '/api/v1/study-specs/:specId/datasets/custom',
  // Variable APIs
  DATASET_VARIABLES: '/api/v1/study-specs/datasets/:datasetId/variables',
  // Dataset APIs
  STUDY_DATASETS: '/api/v1/study-specs/:specId/datasets',
  STUDY_SPEC_DETAIL: '/api/v1/study-specs/:specId',
  // Specification APIs
  STUDY_SPECS: '/api/v1/study-specs'
} as const;
