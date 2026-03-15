/** RBAC Module URLs */

export const RBAC_URLS = {
  // 用户权限
  GET_MY_PERMISSIONS: '/rbac/users/me/permissions',

  GET_PERMISSIONS: '/rbac/permissions',
  // 角色和权限
  GET_ROLES: '/rbac/roles',
  // 作用域树
  GET_SCOPE_TREE: '/rbac/scope-nodes/tree',
  GET_USER_ROLES: (userId: number) => `/rbac/users/${userId}/roles`,

  GET_USERS: '/rbac/users',
  // 管理员接口
  GRANT_PERMISSION: '/rbac/admin/grant',

  REVOKE_PERMISSION: '/rbac/admin/revoke'
} as const;
