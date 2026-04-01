/** RBAC Module URLs */

export const RBAC_URLS = {
  ASSIGN_TEAM: '/api/v1/rbac/assign-team',

  CREATE_USER: '/api/v1/rbac/users',
  // 用户权限
  GET_MY_PERMISSIONS: '/api/v1/rbac/users/me/permissions',
  GET_PERMISSIONS: '/api/v1/rbac/permissions',
  // 角色和权限
  GET_ROLES: '/api/v1/rbac/roles',

  // 作用域树
  GET_SCOPE_TREE: '/api/v1/rbac/scope-nodes/tree',
  GET_USER_ROLES: (userId: number) => `/api/v1/rbac/users/${userId}/roles`,
  GET_USERS: '/api/v1/rbac/users',
  // 管理员接口
  GRANT_PERMISSION: '/api/v1/rbac/admin/grant',
  REVOKE_PERMISSION: '/api/v1/rbac/admin/revoke',
  SYNC_LDAP: '/api/v1/rbac/admin/sync-ldap',
  UPDATE_ROLE_PERMISSIONS: (roleId: number) => `/api/v1/rbac/roles/${roleId}/permissions`,
  UPDATE_USER: (userId: number) => `/api/v1/rbac/users/${userId}`,

  UPDATE_USER_STATUS: (userId: number) => `/api/v1/rbac/users/${userId}/status`
} as const;
