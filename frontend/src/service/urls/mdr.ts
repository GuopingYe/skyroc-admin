/** MDR module URLs */

export const MDR_URLS = {
  SPEC_VARIABLE_CREATE: '/mdr/spec/variable',
  SPEC_VARIABLE_DELETE: '/mdr/spec/variable/:id',
  // Study Spec
  SPEC_VARIABLE_LIST: '/mdr/spec/variables',
  SPEC_VARIABLE_UPDATE: '/mdr/spec/variable/:id',

  TRACKER_TASK_CREATE: '/mdr/tracker/task',
  TRACKER_TASK_DELETE: '/mdr/tracker/task/:id',
  // Programming Tracker
  TRACKER_TASK_LIST: '/mdr/tracker/tasks',
  TRACKER_TASK_UPDATE: '/mdr/tracker/task/:id'
} as const;
