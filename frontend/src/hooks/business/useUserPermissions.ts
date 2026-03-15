/** User Permissions Hook 检查用户权限的自定义 Hook */
import { useMemo } from 'react';

import {
  type PermissionType,
  type RoleType,
  isSuperAdmin as checkIsSuperAdmin
} from '@/pages/(base)/system/user-management/mockData';
import { useUserInfo } from '@/service/hooks/useAuth';

/** 用户权限 Hook 提供权限检查功能 */
export function useUserPermissions() {
  const { data: userInfo } = useUserInfo();

  // 检查用户是否为超级管理员
  const isSuperAdmin = useMemo(() => {
    if (!userInfo?.roles) return false;
    return userInfo.roles.includes('Super Admin' as RoleType);
  }, [userInfo?.roles]);

  // 检查用户是否拥有指定角色
  const hasRole = useMemo(() => {
    return (role: RoleType) => {
      if (!userInfo?.roles) return false;
      return userInfo.roles.includes(role);
    };
  }, [userInfo?.roles]);

  // 检查用户是否拥有指定权限
  const hasPermission = useMemo(() => {
    return (permission: PermissionType) => {
      // Super Admin 拥有所有权限
      if (isSuperAdmin) return true;

      // TODO: 根据用户角色检查具体权限
      // 目前简化实现，后续可扩展
      return false;
    };
  }, [isSuperAdmin]);

  // 检查用户是否拥有任一指定权限
  const hasAnyPermission = useMemo(() => {
    return (permissions: PermissionType[]) => {
      return permissions.some(p => hasPermission(p));
    };
  }, [hasPermission]);

  // 检查用户是否拥有所有指定权限
  const hasAllPermissions = useMemo(() => {
    return (permissions: PermissionType[]) => {
      return permissions.every(p => hasPermission(p));
    };
  }, [hasPermission]);

  return {
    hasAllPermissions,
    hasAnyPermission,
    hasPermission,
    hasRole,
    isSuperAdmin,
    userInfo
  };
}

export default useUserPermissions;
