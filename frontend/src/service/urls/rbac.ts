/** RBAC Module URLs */

export const RBAC_URLS = {
  // 用户权限
  GET_MY_PERMISSIONS: '/api/v1/rbac/users/me/permissions',

  GET_PERMISSIONS: '/api/v1/rbac/permissions',
  // 角色和权限
  GET_ROLES: '/api/v1/rbac/roles',
  // 作用域树
  GET_SCOPE_TREE: '/api/v1/rbac/scope-nodes/tree',
  GET_USER_ROLES: (userId: number) => `/api/v1/rbac/users/${userId}/roles`,

  GET_USERS: '/api/v1/rbac/users',
  CREATE_USER: '/api/v1/rbac/users',
  UPDATE_USER: (userId: number) => `/api/v1/rbac/users/${userId}`,
  UPDATE_USER_STATUS: (userId: number) => `/api/v1/rbac/users/${userId}/status`,
  // 管理员接口
  GRANT_PERMISSION: '/api/v1/rbac/admin/grant',
  ASSIGN_TEAM: '/api/v1/rbac/assign-team',
  SYNC_LDAP: '/api/v1/rbac/admin/sync-ldap',
  UPDATE_ROLE_PERMISSIONS: (roleId: number) => `/api/v1/rbac/roles/${roleId}/permissions`,

  REVOKE_PERMISSION: '/api/v1/rbac/admin/revoke'
} as const;
