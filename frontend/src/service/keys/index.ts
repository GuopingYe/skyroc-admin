/**
 * React Query Keys
 *
 * Global unique keys for React Query cache management
 */

export const QUERY_KEYS = {
  // Auth
  AUTH: {
    USER_INFO: ['auth', 'userInfo'] as const
  },
  // Global Library
  GLOBAL_LIBRARY: {
    // CT (Controlled Terminology)
    CODELISTS: (scopeNodeId: number, params?: Api.GlobalLibrary.CodelistListParams) =>
      ['globalLibrary', 'codelists', scopeNodeId, params] as const,
    DATASETS: (versionId: number, params?: Api.GlobalLibrary.DatasetListParams) =>
      ['globalLibrary', 'datasets', versionId, params] as const,
    SCHEMA: (standardType: string) => ['globalLibrary', 'schema', standardType] as const,
    SPECIFICATIONS: (specType?: string) => ['globalLibrary', 'specifications', specType] as const,
    TERMS: (codelistId: number, params?: Api.GlobalLibrary.TermListParams) =>
      ['globalLibrary', 'terms', codelistId, params] as const,
    TREE: ['globalLibrary', 'tree'] as const,
    VARIABLES: (datasetId: number, params?: Api.GlobalLibrary.VariableListParams) =>
      ['globalLibrary', 'variables', datasetId, params] as const
  },
  // MDR
  MDR: {
    SPEC_VARIABLE_LIST: (datasetKey: string, standard: string) =>
      ['mdr', 'specVariables', datasetKey, standard] as const,
    TRACKER_TASK_LIST: (analysisId: string, category: string) => ['mdr', 'trackerTasks', analysisId, category] as const
  },
  // RBAC
  RBAC: {
    MY_PERMISSIONS: (includeTree: boolean) => ['rbac', 'myPermissions', includeTree] as const,
    PERMISSIONS: (category?: string) => ['rbac', 'permissions', category] as const,
    ROLES: (includePermissions: boolean) => ['rbac', 'roles', includePermissions] as const,
    SCOPE_TREE: (nodeType?: Api.RBAC.ScopeNodeType) => ['rbac', 'scopeTree', nodeType] as const,
    USER_ROLES: (userId: number) => ['rbac', 'userRoles', userId] as const,
    USERS: (params?: { is_active?: boolean; search?: string }) => ['rbac', 'users', params] as const
  },
  // Route
  ROUTE: {
    CONSTANT_ROUTES: ['route', 'constantRoutes'] as const,
    IS_ROUTE_EXIST: (routeName: string) => ['route', 'isRouteExist', routeName] as const,
    USER_ROUTES: ['route', 'userRoutes'] as const
  },
  // Study Spec
  STUDY_SPEC: {
    DATASETS: (specId: number, params?: Api.StudySpec.StudyDatasetListParams) =>
      ['studySpec', 'datasets', specId, params] as const,
    DETAIL: (specId: number) => ['studySpec', 'detail', specId] as const,
    LIST: (params?: Api.StudySpec.StudySpecListParams) => ['studySpec', 'list', params] as const,
    VARIABLES: (datasetId: number, params?: Api.StudySpec.StudyVariableListParams) =>
      ['studySpec', 'variables', datasetId, params] as const
  },
  // System Manage
  SYSTEM_MANAGE: {
    ALL_PAGES: ['systemManage', 'allPages'] as const,
    ALL_ROLES: ['systemManage', 'allRoles'] as const,
    MENU_LIST: ['systemManage', 'menuList'] as const,
    MENU_TREE: ['systemManage', 'menuTree'] as const,
    ROLE_LIST: (params?: Api.SystemManage.RoleSearchParams) => ['systemManage', 'roleList', params] as const,
    USER_LIST: (params?: Api.SystemManage.UserSearchParams) => ['systemManage', 'userList', params] as const
  },
  // CDISC Sync
  CDISC_SYNC: {
    CONFIG: ['cdiscSync', 'config'] as const,
    SYNC_LOGS: (params?: { status?: string; standard_type?: string; offset?: number; limit?: number }) =>
      ['cdiscSync', 'logs', params] as const,
    TASK_STATUS: (taskId: string) => ['cdiscSync', 'taskStatus', taskId] as const
  },
  // Reference Data
  REFERENCE_DATA: {
    CATEGORIES: ['referenceData', 'categories'] as const,
    ITEMS: (category: string, params?: { is_active?: boolean; is_deleted?: boolean; offset?: number; limit?: number }) =>
['referenceData', 'items', category, params] as const,
    ITEM: (category: string, code: string) => ['referenceData', 'item', category, code] as const
  }
} as const;

export const MUTATION_KEYS = {
  AUTH: {
    LOGIN: ['auth', 'login'] as const,
    REFRESH_TOKEN: ['auth', 'refreshToken'] as const
  }
} as const;
