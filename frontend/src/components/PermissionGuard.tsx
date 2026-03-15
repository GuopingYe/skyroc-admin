/**
 * 权限守卫组件
 *
 * 用于基于用户权限控制 UI 元素的显示/隐藏
 *
 * @example
 *   // 基本用法
 *   <PermissionGuard permission="study:create" scopeId={1}>
 *   <Button>创建研究</Button>
 *   </PermissionGuard>
 *
 *   // 多个权限（任意一个满足）
 *   <PermissionGuard permissions={['study:create', 'study:delete']} scopeId={1} mode="any">
 *   <Button>操作</Button>
 *   </PermissionGuard>
 *
 *   // 多个权限（全部满足）
 *   <PermissionGuard permissions={['study:create', 'study:delete']} scopeId={1} mode="all">
 *   <Button>操作</Button>
 *   </PermissionGuard>
 *
 *   // 自定义无权限时显示的内容
 *   <PermissionGuard permission="study:create" scopeId={1} fallback={<div>无权限</div>}>
 *   <Button>创建研究</Button>
 *   </PermissionGuard>
 */
import React from 'react';

import { usePermissionCheck } from '@/service/hooks';

interface PermissionGuardProps {
  /** 子元素 */
  children: React.ReactNode;
  /** 无权限时显示的内容 */
  fallback?: React.ReactNode;
  /** 权限检查模式 */
  mode?: 'all' | 'any';
  /** 单个权限编码 */
  permission?: string;
  /** 多个权限编码列表 */
  permissions?: string[];
  /** 作用域 ID */
  scopeId: number | null;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  fallback = null,
  mode = 'any',
  permission,
  permissions,
  scopeId
}) => {
  const { hasAllPermissions, hasAnyPermission, hasPermission, isSuperuser } = usePermissionCheck();

  // 如果 scopeId 为 null，不显示内容
  if (scopeId === null) {
    return <>{fallback}</>;
  }

  // 超级管理员显示所有内容
  if (isSuperuser) {
    return <>{children}</>;
  }

  // 单个权限检查
  if (permission) {
    if (hasPermission(permission, scopeId)) {
      return <>{children}</>;
    }
    return <>{fallback}</>;
  }

  // 多个权限检查
  if (permissions && permissions.length > 0) {
    const hasAccess = mode === 'all' ? hasAllPermissions(permissions, scopeId) : hasAnyPermission(permissions, scopeId);

    if (hasAccess) {
      return <>{children}</>;
    }
    return <>{fallback}</>;
  }

  // 没有配置权限检查，默认显示
  return <>{children}</>;
};

/**
 * 高阶组件：为组件添加权限检查
 *
 * @example
 *   const ProtectedButton = withPermission(Button, 'study:create');
 *   <ProtectedButton scopeId={1}>创建研究</ProtectedButton>;
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: string,
  scopeIdExtractor?: (props: P) => number
) {
  const WithPermissionComponent: React.FC<P> = props => {
    const scopeId = scopeIdExtractor ? scopeIdExtractor(props) : (props as any).scopeId;
    const { hasPermission, isSuperuser } = usePermissionCheck();

    if (isSuperuser || hasPermission(permission, scopeId)) {
      return <WrappedComponent {...props} />;
    }

    return null;
  };

  WithPermissionComponent.displayName = `WithPermission(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithPermissionComponent;
}

export default PermissionGuard;
