/** MDR module URLs */

export const MDR_URLS = {
  // Pipeline Management
  PIPELINE_ANALYSES: '/api/v1/pipeline/analyses',
  PIPELINE_EXECUTION_JOBS: '/api/v1/pipeline/execution-jobs',
  PIPELINE_MILESTONES: '/api/v1/pipeline/milestones',
  PIPELINE_MILESTONE_DETAIL: '/api/v1/pipeline/milestones/:id',
  PIPELINE_NODE_ARCHIVE: '/api/v1/pipeline/nodes/:id/archive',
  PIPELINE_NODE_CREATE: '/api/v1/pipeline/nodes',
  PIPELINE_PRODUCTS: '/api/v1/pipeline/products',
  PIPELINE_STUDIES: '/api/v1/pipeline/studies',
  PIPELINE_STUDY_CONFIG: '/api/v1/pipeline/studies/:id/config',
  PIPELINE_TREE: '/api/v1/pipeline/tree',
  PIPELINE_AVAILABLE_VERSIONS: '/api/v1/pipeline/available-versions',

  // Study Spec
  SPEC_VARIABLE_CREATE: '/api/v1/mdr/spec/variable',
  SPEC_VARIABLE_DELETE: '/api/v1/mdr/spec/variable/:id',
  SPEC_VARIABLE_LIST: '/api/v1/mdr/spec/variables',
  SPEC_VARIABLE_UPDATE: '/api/v1/mdr/spec/variable/:id',

  // Programming Tracker - 统一 API 路径
  TRACKER_TASK_LIST: '/api/v1/mdr/tracker/tasks',
  TRACKER_TASK_CREATE: '/api/v1/mdr/tracker/task',
  TRACKER_TASK_DETAIL: '/api/v1/mdr/tracker/task/:id',
  TRACKER_TASK_UPDATE: '/api/v1/mdr/tracker/task/:id',
  TRACKER_TASK_DELETE: '/api/v1/mdr/tracker/task/:id',
  TRACKER_TASK_TRANSITION: '/api/v1/mdr/tracker/task/:id/transition',

  // Tracker Issues
  TRACKER_ISSUES: '/api/v1/mdr/tracker/task/:taskId/issues',
  TRACKER_ISSUE_CREATE: '/api/v1/mdr/tracker/task/:taskId/issues',
  TRACKER_ISSUE_RESPONSE: '/api/v1/mdr/tracker/issue/:issueId/response'
} as const;