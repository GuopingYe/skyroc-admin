/** User Permissions Hook */
import { useMemo } from 'react';

import { useMyPermissions, usePermissionCheck, useUserInfo } from '@/service/hooks';

/** 用户权限 Hook，统一读取真实 RBAC 数据 */
export function useUserPermissions() {
  const { data: userInfo } = useUserInfo();
  const { data: myPermissions } = useMyPermissions(true);
  const { hasAllPermissions, hasAnyPermission, hasPermission: checkPermission, isSuperuser } = usePermissionCheck();

  const roleIdentifiers = useMemo(() => {
    if (myPermissions?.assigned_roles?.length) {
      return [
        ...new Set(
          myPermissions.assigned_roles.flatMap(assignment => [assignment.role.code, assignment.role.name])
        )
      ];
    }
    return userInfo?.roles || [];
  }, [myPermissions?.assigned_roles, userInfo?.roles]);

  const hasRole = useMemo(() => {
    return (role: string) => {
      if (isSuperuser) return true;
      return roleIdentifiers.includes(role);
    };
  }, [isSuperuser, roleIdentifiers]);

  const hasPermission = useMemo(() => {
    return (permission: string, scopeId?: number | null) => {
      if (isSuperuser) return true;
      if (scopeId == null) {
        return Object.values(myPermissions?.scope_permissions || {}).some(scopePermissions =>
          scopePermissions.includes(permission)
        );
      }
      return checkPermission(permission, scopeId);
    };
  }, [checkPermission, isSuperuser, myPermissions?.scope_permissions]);

  const hasAnyPermissionSafe = useMemo(() => {
    return (permissions: string[], scopeId?: number | null) => {
      if (scopeId == null) {
        return permissions.some(permission => hasPermission(permission, scopeId));
      }
      return hasAnyPermission(permissions, scopeId);
    };
  }, [hasAnyPermission, hasPermission]);

  const hasAllPermissionsSafe = useMemo(() => {
    return (permissions: string[], scopeId?: number | null) => {
      if (scopeId == null) {
        return permissions.every(permission => hasPermission(permission, scopeId));
      }
      return hasAllPermissions(permissions, scopeId);
    };
  }, [hasAllPermissions, hasPermission]);

  return {
    hasAllPermissions: hasAllPermissionsSafe,
    hasAnyPermission: hasAnyPermissionSafe,
    hasPermission,
    hasRole,
    isSuperAdmin: isSuperuser,
    myPermissions,
    userInfo
  };
}

export default useUserPermissions;
