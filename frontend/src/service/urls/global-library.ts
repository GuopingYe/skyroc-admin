/** Global Library module URLs */

export const GLOBAL_LIBRARY_URLS = {
  CODELIST_TERMS: '/global-library/codelists/:codelistId/terms',
  // CT (Controlled Terminology) APIs
  CT_CODELISTS: '/global-library/ct/:scopeNodeId/codelists',
  DATASET_VARIABLES: '/global-library/datasets/:datasetId/variables',
  SCHEMA: '/global-library/schemas/:standardType',
  SPECIFICATIONS: '/global-library/specifications',
  TREE: '/global-library/tree',
  VERSION_DATASETS: '/global-library/versions/:versionId/datasets'
} as const;
