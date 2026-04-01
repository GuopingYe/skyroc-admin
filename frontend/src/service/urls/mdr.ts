/** MDR module URLs */

export const MDR_URLS = {
  // Pipeline Management
  PIPELINE_ANALYSES: '/api/v1/pipeline/analyses',
  PIPELINE_AVAILABLE_VERSIONS: '/api/v1/pipeline/available-versions',
  PIPELINE_EXECUTION_JOBS: '/api/v1/pipeline/execution-jobs',
  PIPELINE_MILESTONE_DETAIL: '/api/v1/pipeline/milestones/:id',
  PIPELINE_MILESTONES: '/api/v1/pipeline/milestones',
  PIPELINE_NODE_ARCHIVE: '/api/v1/pipeline/nodes/:id/archive',
  PIPELINE_NODE_CREATE: '/api/v1/pipeline/nodes',
  PIPELINE_PRODUCTS: '/api/v1/pipeline/products',
  PIPELINE_STUDIES: '/api/v1/pipeline/studies',
  PIPELINE_STUDY_CONFIG: '/api/v1/pipeline/studies/:id/config',
  PIPELINE_TREE: '/api/v1/pipeline/tree',

  // Study Spec
  SPEC_VARIABLE_CREATE: '/api/v1/mdr/spec/variable',
  SPEC_VARIABLE_DELETE: '/api/v1/mdr/spec/variable/:id',
  SPEC_VARIABLE_LIST: '/api/v1/mdr/spec/variables',
  SPEC_VARIABLE_UPDATE: '/api/v1/mdr/spec/variable/:id',

  TFL_FIGURE_DETAIL: '/api/v1/mdr/tfl/figure/:id',
  TFL_FIGURES: '/api/v1/mdr/tfl/figures',
  TFL_LISTING_DETAIL: '/api/v1/mdr/tfl/listing/:id',
  TFL_LISTINGS: '/api/v1/mdr/tfl/listings',
  // GET list
  TFL_SHELL_CREATE: '/api/v1/mdr/tfl/shell',
  // POST create (singular, matches backend)
  TFL_SHELL_DETAIL: '/api/v1/mdr/tfl/shell/:id',

  // TFL Shells - Tables, Figures, Listings
  TFL_SHELLS: '/api/v1/mdr/tfl/shells',
  // GET/PUT/DELETE single
  TFL_SHELLS_ORDER: '/api/v1/mdr/tfl/shells/order',
  TFL_TABLE_DETAIL: '/api/v1/mdr/tfl/table/:id',

  // PUT batch order
  TFL_TABLES: '/api/v1/mdr/tfl/tables',
  TRACKER_ISSUE_CREATE: '/api/v1/mdr/tracker/task/:taskId/issues',
  TRACKER_ISSUE_RESPONSE: '/api/v1/mdr/tracker/issue/:issueId/response', // Tracker Issues
  TRACKER_ISSUES: '/api/v1/mdr/tracker/task/:taskId/issues',
  TRACKER_TASK_CREATE: '/api/v1/mdr/tracker/task',
  TRACKER_TASK_DELETE: '/api/v1/mdr/tracker/task/:id',
  TRACKER_TASK_DETAIL: '/api/v1/mdr/tracker/task/:id',
  // Programming Tracker - 统一 API 路径
  TRACKER_TASK_LIST: '/api/v1/mdr/tracker/tasks',
  TRACKER_TASK_TRANSITION: '/api/v1/mdr/tracker/task/:id/transition',
  TRACKER_TASK_UPDATE: '/api/v1/mdr/tracker/task/:id'
} as const;
