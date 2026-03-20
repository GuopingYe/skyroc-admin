/** Global Library module URLs */

export const GLOBAL_LIBRARY_URLS = {
  CODELIST_TERMS: '/api/v1/global-library/codelists/:codelistId/terms',
  // CT (Controlled Terminology) APIs
  CT_CODELISTS: '/api/v1/global-library/ct/:scopeNodeId/codelists',
  DATASET_VARIABLES: '/api/v1/global-library/datasets/:datasetId/variables',
  SCHEMA: '/api/v1/global-library/schemas/:standardType',
  SPECIFICATIONS: '/api/v1/global-library/specifications',
  TREE: '/api/v1/global-library/tree',
  VERSION_DATASETS: '/api/v1/global-library/versions/:versionId/datasets'
} as const;
