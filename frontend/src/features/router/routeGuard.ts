import type { NavigateFunction } from 'react-router-dom';

const PAGE_PERMISSION_MAP: Record<string, string> = {
  '/mdr/global-library': 'page:global-library:view',
  '/mdr/mapping-studio': 'page:mapping-studio:view',
  '/mdr/pipeline-management': 'page:pipeline-management:view',
  '/mdr/pr-approval': 'page:pr-approval:view',
  '/mdr/programming-tracker': 'page:programming-tracker:view',
  '/mdr/study-spec': 'page:study-spec:view',
  '/mdr/tfl-designer': 'page:tfl-designer:view',
  '/mdr/tfl-template-library': 'page:tfl-template-library:view',
  '/mdr/tracker': 'page:tracker:view',
  '/system/role-permission': 'page:role-permission:view',
  '/system/user-management': 'page:user-management:view'
};

const SORTED_PAGE_PATHS = Object.keys(PAGE_PERMISSION_MAP).sort((left, right) => right.length - left.length);

export function getEffectiveMenuPermissions(
  myPermissions: Api.RBAC.UserPermissionsResponse | undefined,
  scopeNodeId: number | null | undefined
): Set<string> {
  if (!myPermissions) return new Set();
  if (myPermissions.is_superuser) {
    return new Set(Object.values(PAGE_PERMISSION_MAP));
  }

  if (scopeNodeId != null) {
    return new Set(myPermissions.scope_permissions[String(scopeNodeId)] || []);
  }

  const union = new Set<string>();
  Object.values(myPermissions.scope_permissions).forEach(scopePermissions => {
    scopePermissions.forEach(permission => {
      if (permission.startsWith('page:')) {
        union.add(permission);
      }
    });
  });
  return union;
}

export function canAccessRoute(routePath: string, effectivePermissions: Set<string>): boolean {
  const normalizedPath = routePath.split('?')[0] || routePath;
  const matchedPath = SORTED_PAGE_PATHS.find(path => normalizedPath.startsWith(path));
  if (!matchedPath) return true;

  const requiredPermission = PAGE_PERMISSION_MAP[matchedPath];
  return effectivePermissions.has(requiredPermission);
}

export function guardRoute(
  routePath: string,
  myPermissions: Api.RBAC.UserPermissionsResponse | undefined,
  scopeNodeId: number | null | undefined,
  navigate: NavigateFunction
): boolean {
  if (!myPermissions) return false;

  const effectivePermissions = getEffectiveMenuPermissions(myPermissions, scopeNodeId);
  const allowed = canAccessRoute(routePath, effectivePermissions);
  if (!allowed) {
    navigate('/403', { replace: true });
  }
  return allowed;
}

export function filterMenuItems<T extends { children?: T[]; key?: string }>(
  menuItems: T[],
  myPermissions: Api.RBAC.UserPermissionsResponse | undefined,
  scopeNodeId: number | null | undefined
): T[] {
  const effectivePermissions = getEffectiveMenuPermissions(myPermissions, scopeNodeId);

  const filterRecursive = (items: T[]): T[] => {
    return items
      .map(item => {
        const children = item.children ? filterRecursive(item.children) : undefined;
        return { ...item, children };
      })
      .filter(item => {
        const itemAllowed = !item.key || canAccessRoute(item.key, effectivePermissions);
        const hasVisibleChildren = Boolean(item.children?.length);
        return itemAllowed || hasVisibleChildren;
      });
  };

  return filterRecursive(menuItems);
}

export { PAGE_PERMISSION_MAP };
