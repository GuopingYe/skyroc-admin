import { request } from '../request';
import { RBAC_URLS } from '../urls';

/** 获取当前用户权限 */
export function fetchGetMyPermissions(includeTree = false) {
  return request<Api.RBAC.UserPermissionsResponse>({
    method: 'get',
    params: { include_tree: includeTree },
    url: RBAC_URLS.GET_MY_PERMISSIONS
  });
}

/** 获取所有角色 */
export function fetchGetRoles(includePermissions = true) {
  return request<Api.RBAC.Role[]>({
    method: 'get',
    params: { include_permissions: includePermissions },
    url: RBAC_URLS.GET_ROLES
  });
}

/** 获取所有权限 */
export function fetchGetPermissions(category?: string) {
  return request<Api.RBAC.Permission[]>({
    method: 'get',
    params: category ? { category } : undefined,
    url: RBAC_URLS.GET_PERMISSIONS
  });
}

/** 获取作用域树 */
export function fetchGetScopeTree(nodeType?: Api.RBAC.ScopeNodeType) {
  return request<Api.RBAC.ScopeTreeNode[]>({
    method: 'get',
    params: nodeType ? { node_type: nodeType } : undefined,
    url: RBAC_URLS.GET_SCOPE_TREE
  });
}

/** 分配权限 */
export function fetchGrantPermission(data: Api.RBAC.GrantPermissionRequest) {
  return request<Api.RBAC.GrantPermissionResponse>({
    data,
    method: 'post',
    url: RBAC_URLS.GRANT_PERMISSION
  });
}

/** 撤销权限 */
export function fetchRevokePermission(params: Api.RBAC.RevokePermissionRequest) {
  return request<void>({
    method: 'delete',
    params,
    url: RBAC_URLS.REVOKE_PERMISSION
  });
}

/** 获取用户角色列表 */
export function fetchGetUserRoles(userId: number) {
  return request<Api.RBAC.UserScopeRole[]>({
    method: 'get',
    url: RBAC_URLS.GET_USER_ROLES(userId)
  });
}

/** 获取用户列表 */
export function fetchGetUsers(params?: { is_active?: boolean; search?: string }) {
  return request<Api.RBAC.UserListItem[]>({
    method: 'get',
    params,
    url: RBAC_URLS.GET_USERS
  });
}

/** 更新角色权限 */
export function fetchUpdateRolePermissions(roleId: number, permissionIds: number[]) {
  return request<Api.RBAC.Role>({
    data: { permission_ids: permissionIds },
    method: 'put',
    url: RBAC_URLS.UPDATE_ROLE_PERMISSIONS(roleId)
  });
}

/** 创建用户 */
export function fetchCreateUser(data: Api.RBAC.CreateUserRequest) {
  return request<Api.RBAC.UserDetail>({
    data,
    method: 'post',
    url: RBAC_URLS.CREATE_USER
  });
}

/** 更新用户 */
export function fetchUpdateUser(userId: number, data: Api.RBAC.UpdateUserRequest) {
  return request<Api.RBAC.UserDetail>({
    data,
    method: 'put',
    url: RBAC_URLS.UPDATE_USER(userId)
  });
}

/** 更新用户状态 */
export function fetchUpdateUserStatus(userId: number, isActive: boolean) {
  return request<Api.RBAC.UserDetail>({
    data: { is_active: isActive },
    method: 'patch',
    url: RBAC_URLS.UPDATE_USER_STATUS(userId)
  });
}

/** 委派团队分配 */
export function fetchAssignTeam(data: Api.RBAC.AssignTeamRequest) {
  return request<Api.RBAC.GrantPermissionResponse>({
    data,
    method: 'post',
    url: RBAC_URLS.ASSIGN_TEAM
  });
}

/** LDAP 同步 */
export function fetchSyncLdap() {
  return request<unknown>({
    method: 'post',
    url: RBAC_URLS.SYNC_LDAP
  });
}
