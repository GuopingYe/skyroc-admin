import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchGetMyPermissions,
  fetchGetPermissions,
  fetchGetRoles,
  fetchGetScopeTree,
  fetchGetUserRoles,
  fetchGetUsers,
  fetchGrantPermission,
  fetchRevokePermission
} from '../api';
import { QUERY_KEYS } from '../keys';

/**
 * 获取当前用户权限 Hook
 *
 * @example
 *   const { data: permissions, isLoading } = useMyPermissions();
 */
export function useMyPermissions(includeTree = false) {
  return useQuery({
    queryFn: () => fetchGetMyPermissions(includeTree),
    queryKey: QUERY_KEYS.RBAC.MY_PERMISSIONS(includeTree)
  });
}

/**
 * 获取所有角色 Hook
 *
 * @example
 *   const { data: roles, isLoading } = useRoles();
 */
export function useRoles(includePermissions = true) {
  return useQuery({
    queryFn: () => fetchGetRoles(includePermissions),
    queryKey: QUERY_KEYS.RBAC.ROLES(includePermissions),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

/**
 * 获取所有权限 Hook
 *
 * @example
 *   const { data: permissions, isLoading } = usePermissions();
 */
export function usePermissions(category?: string) {
  return useQuery({
    queryFn: () => fetchGetPermissions(category),
    queryKey: QUERY_KEYS.RBAC.PERMISSIONS(category),
    staleTime: 5 * 60 * 1000
  });
}

/**
 * 获取作用域树 Hook
 *
 * @example
 *   const { data: scopeTree, isLoading } = useScopeTree();
 */
export function useScopeTree(nodeType?: Api.RBAC.ScopeNodeType) {
  return useQuery({
    queryFn: () => fetchGetScopeTree(nodeType),
    queryKey: QUERY_KEYS.RBAC.SCOPE_TREE(nodeType),
    staleTime: 5 * 60 * 1000
  });
}

/**
 * 获取用户角色列表 Hook
 *
 * @example
 *   const { data: userRoles, isLoading } = useUserRoles(userId);
 */
export function useUserRoles(userId: number | null) {
  return useQuery({
    enabled: userId !== null,
    queryFn: () => fetchGetUserRoles(userId!),
    queryKey: QUERY_KEYS.RBAC.USER_ROLES(userId!)
  });
}

/**
 * 获取用户列表 Hook
 *
 * @example
 *   const { data: users, isLoading } = useUsers({ is_active: true });
 */
export function useUsers(params?: { is_active?: boolean; search?: string }) {
  return useQuery({
    queryFn: () => fetchGetUsers(params),
    queryKey: QUERY_KEYS.RBAC.USERS(params)
  });
}

/**
 * 分配权限 Mutation Hook
 *
 * @example
 *   const { mutate: grantPermission, isPending } = useGrantPermission();
 *   grantPermission({ user_id: 1, scope_node_id: 1, role_id: 1 });
 */
export function useGrantPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fetchGrantPermission,
    onSuccess: () => {
      // 刷新相关缓存
      queryClient.invalidateQueries({ queryKey: ['rbac'] });
    }
  });
}

/**
 * 撤销权限 Mutation Hook
 *
 * @example
 *   const { mutate: revokePermission, isPending } = useRevokePermission();
 *   revokePermission({ user_id: 1, scope_node_id: 1, role_id: 1 });
 */
export function useRevokePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fetchRevokePermission,
    onSuccess: () => {
      // 刷新相关缓存
      queryClient.invalidateQueries({ queryKey: ['rbac'] });
    }
  });
}

/**
 * 检查用户是否有特定权限
 *
 * @example
 *   const { hasPermission } = usePermissionCheck();
 *   if (hasPermission('study:create', scopeId)) { ... }
 */
export function usePermissionCheck() {
  const { data: myPermissions } = useMyPermissions(true);

  const hasPermission = (permissionCode: string, scopeId: number): boolean => {
    if (!myPermissions) return false;
    if (myPermissions.is_superuser) return true;

    const scopePerms = myPermissions.scope_permissions[String(scopeId)];
    return scopePerms?.includes(permissionCode) ?? false;
  };

  const hasAnyPermission = (permissionCodes: string[], scopeId: number): boolean => {
    if (!myPermissions) return false;
    if (myPermissions.is_superuser) return true;

    const scopePerms = myPermissions.scope_permissions[String(scopeId)] || [];
    return permissionCodes.some(code => scopePerms.includes(code));
  };

  const hasAllPermissions = (permissionCodes: string[], scopeId: number): boolean => {
    if (!myPermissions) return false;
    if (myPermissions.is_superuser) return true;

    const scopePerms = myPermissions.scope_permissions[String(scopeId)] || [];
    return permissionCodes.every(code => scopePerms.includes(code));
  };

  return {
    hasAllPermissions,
    hasAnyPermission,
    hasPermission,
    isSuperuser: myPermissions?.is_superuser ?? false,
    myPermissions
  };
}
