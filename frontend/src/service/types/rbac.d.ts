/**
 * 命名空间 Api.RBAC
 *
 * 后端 API 模块：RBAC 权限管理
 */
declare namespace Api {
  namespace RBAC {
    /** 权限 */
    interface Permission {
      /** 权限分类 */
      category: string;
      /** 权限编码 */
      code: string;
      /** 权限描述 */
      description: string | null;
      /** 权限 ID */
      id: number;
      /** 权限名称 */
      name: string;
    }

    /** 角色权限关联 */
    interface RolePermission {
      /** 权限分类 */
      category: string;
      /** 权限编码 */
      code: string;
      /** 权限描述 */
      description: string | null;
      /** 权限 ID */
      id: number;
      /** 权限名称 */
      name: string;
    }

    /** 角色 */
    interface Role {
      /** 角色编码 */
      code: string;
      /** 显示颜色 */
      color: string | null;
      /** 角色描述 */
      description: string | null;
      /** 角色 ID */
      id: number;
      /** 是否系统内置 */
      is_system: boolean;
      /** 角色名称 */
      name: string;
      /** 权限列表 */
      permissions: RolePermission[];
    }

    /** 作用域节点类型 */
    type ScopeNodeType = 'ANALYSIS' | 'CDISC' | 'COMPOUND' | 'GLOBAL' | 'INDICATION' | 'STUDY' | 'TA';

    /** 作用域节点简要 */
    interface ScopeNode {
      /** 节点编码 */
      code: string;
      /** 节点 ID */
      id: number;
      /** 节点名称 */
      name: string;
      /** 节点类型 */
      node_type: ScopeNodeType;
      /** 节点路径 */
      path: string | null;
    }

    /** 用户作用域角色 */
    interface UserScopeRole {
      /** 授权时间 */
      granted_at: string;
      /** 授权人 */
      granted_by: string;
      /** 分配 ID */
      id: number;
      /** 角色 */
      role: Role;
      /** 作用域节点 */
      scope_node: ScopeNode;
      /** 生效时间 */
      valid_from: string | null;
      /** 失效时间 */
      valid_until: string | null;
    }

    /** 用户权限响应 */
    interface UserPermissionsResponse {
      /** 已分配角色列表 */
      assigned_roles: UserScopeRole[];
      /** 是否超级管理员 */
      is_superuser: boolean;
      /** 作用域权限映射 (scope_id -> permission_codes[]) */
      scope_permissions: Record<string, string[]>;
      /** 用户 ID */
      user_id: number;
      /** 用户名 */
      username: string;
    }

    /** 权限分配请求 */
    interface GrantPermissionRequest {
      /** 角色 ID */
      role_id: number;
      /** 作用域节点 ID */
      scope_node_id: number;
      /** 目标用户 ID */
      user_id: number;
      /** 生效时间 */
      valid_from?: string | null;
      /** 失效时间 */
      valid_until?: string | null;
    }

    /** 权限分配响应 */
    interface GrantPermissionResponse {
      /** 分配详情 */
      assignment: UserScopeRole | null;
      /** 消息 */
      message: string;
      /** 是否成功 */
      success: boolean;
    }

    /** 权限撤销请求 */
    interface RevokePermissionRequest {
      /** 角色 ID */
      role_id: number;
      /** 作用域节点 ID */
      scope_node_id: number;
      /** 用户 ID */
      user_id: number;
    }

    /** 作用域树节点 */
    interface ScopeTreeNode {
      /** 子节点 */
      children: ScopeTreeNode[];
      /** 节点编码 */
      code: string;
      /** 深度 */
      depth: number;
      /** 节点 ID */
      id: number;
      /** 节点名称 */
      name: string;
      /** 节点类型 */
      node_type: string;
      /** 节点路径 */
      path: string | null;
    }

    /** 用户 */
    interface User {
      /** 创建时间 */
      created_at: string;
      /** 部门 */
      department: string | null;
      /** 显示名称 */
      display_name: string | null;
      /** 邮箱 */
      email: string;
      /** 用户 ID */
      id: number;
      /** 是否激活 */
      is_active: boolean;
      /** 是否超级管理员 */
      is_superuser: boolean;
      /** 最后登录时间 */
      last_login_at: string | null;
      /** 用户名 */
      username: string;
    }

    /** 用户列表项（包含角色分配） */
    interface UserListItem {
      /** 角色分配列表 */
      assignments: UserScopeRole[];
      /** 创建时间 */
      created_at: string;
      /** 部门 */
      department: string | null;
      /** 显示名称 */
      display_name: string | null;
      /** 邮箱 */
      email: string;
      /** 用户 ID */
      id: number;
      /** 是否激活 */
      is_active: boolean;
      /** 是否超级管理员 */
      is_superuser: boolean;
      /** 最后登录时间 */
      last_login_at: string | null;
      /** 用户名 */
      username: string;
    }
  }
}
