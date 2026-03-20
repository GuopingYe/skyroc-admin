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
  // 管理员接口
  GRANT_PERMISSION: '/api/v1/rbac/admin/grant',

  REVOKE_PERMISSION: '/api/v1/rbac/admin/revoke'
} as const;
