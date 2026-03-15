/** User Management Mock 数据 用户管理与权限分配 - 支持基于作用域的多角色分配 */

/** 用户状态 */
export type UserStatus = 'Active' | 'Inactive' | 'Locked';

/** 角色类型 */
export type RoleType = 'Admin' | 'Programmer' | 'QC Reviewer' | 'Study Lead' | 'Super Admin' | 'Viewer';

/** 作用域节点类型 */
export type ScopeNodeType = 'Analysis' | 'Compound' | 'Study' | 'TA';

/** 功能权限类型 */
export type PermissionType =
  // 项目管理
  | 'archive_node'
  | 'assign_roles'
  | 'close_issue'
  | 'create_study'
  | 'create_ta'
  | 'delete_study'
  // 元数据管理
  | 'delete_ta'
  | 'edit_mapping'
  | 'edit_spec'
  | 'export_mapping'
  // QC 管理
  | 'import_sdr'
  | 'lock_study'
  | 'manage_users'
  | 'open_issue'
  // 用户管理
  | 'respond_issue'
  | 'sign_off'
  | 'view_audit_log';

/** 功能权限分类 */
export interface PermissionCategory {
  key: string;
  label: string;
  permissions: { description: string; key: PermissionType; label: string }[];
}

/** 角色权限定义 */
export interface RoleDefinition {
  color: string;
  description: string;
  isSystem?: boolean;
  key: RoleType;
  label: string;
  permissions: PermissionType[]; // 系统内置角色不可删除
}

/** 用户角色分配（基于作用域） */
export interface RoleAssignment {
  assignedAt: string;
  assignedBy: string;
  id: string;
  roleId: RoleType;
  scopeId: string;
  scopeName: string;
  scopeType: ScopeNodeType;
}

/** 用户信息 */
export interface UserInfo {
  /** 使用新的 assignments 数组替代旧的 permissions */
  assignments: RoleAssignment[];
  createdAt: string;
  department: string;
  displayName: string;
  email: string;
  id: string;
  lastLoginAt?: string;
  /** @deprecated 使用 assignments 替代 */
  permissions?: RoleAssignment[];
  status: UserStatus;
  username: string;
}

/** 用户状态配置 */
export const userStatusConfig: Record<UserStatus, { color: string; label: string }> = {
  Active: { color: 'success', label: 'Active' },
  Inactive: { color: 'default', label: 'Inactive' },
  Locked: { color: 'error', label: 'Locked' }
};

/** 功能权限分类配置 */
export const permissionCategories: PermissionCategory[] = [
  {
    key: 'project',
    label: 'Project Management',
    permissions: [
      { description: 'Create top-level Therapeutic Area', key: 'create_ta', label: 'Create TA' },
      { description: 'Delete Therapeutic Area', key: 'delete_ta', label: 'Delete TA' },
      { description: 'Create new study under compound', key: 'create_study', label: 'Create Study' },
      { description: 'Delete study and all child nodes', key: 'delete_study', label: 'Delete Study' },
      { description: 'Lock study to prevent modifications', key: 'lock_study', label: 'Lock Study' },
      { description: 'Archive any pipeline node', key: 'archive_node', label: 'Archive Node' }
    ]
  },
  {
    key: 'metadata',
    label: 'Metadata Management',
    permissions: [
      { description: 'Edit study specification', key: 'edit_spec', label: 'Edit Spec' },
      { description: 'Import SDR data', key: 'import_sdr', label: 'Import SDR' },
      { description: 'Edit SDTM mapping rules', key: 'edit_mapping', label: 'Edit Mapping' },
      { description: 'Export mapping definitions', key: 'export_mapping', label: 'Export Mapping' }
    ]
  },
  {
    key: 'qc',
    label: 'QC Management',
    permissions: [
      { description: 'Create QC issues', key: 'open_issue', label: 'Open Issue' },
      { description: 'Respond to QC issues', key: 'respond_issue', label: 'Respond Issue' },
      { description: 'Close QC issues', key: 'close_issue', label: 'Close Issue' },
      { description: 'Sign off on deliverables', key: 'sign_off', label: 'Sign Off' }
    ]
  },
  {
    key: 'admin',
    label: 'System Administration',
    permissions: [
      { description: 'Create, edit, delete users', key: 'manage_users', label: 'Manage Users' },
      { description: 'Assign roles to users', key: 'assign_roles', label: 'Assign Roles' },
      { description: 'View system audit logs', key: 'view_audit_log', label: 'View Audit Log' }
    ]
  }
];

/** 所有权限列表 */
export const allPermissions: PermissionType[] = permissionCategories.flatMap(cat => cat.permissions.map(p => p.key));

/** 角色定义配置 */
export const roleDefinitions: RoleDefinition[] = [
  {
    color: 'magenta',
    description: 'Full system access with all permissions including user management',
    isSystem: true,
    key: 'Super Admin',
    label: 'Super Admin',
    permissions: allPermissions
  },
  {
    color: 'red',
    description: 'Administrative access for assigned scope',
    isSystem: true,
    key: 'Admin',
    label: 'Admin',
    permissions: [
      'create_study',
      'lock_study',
      'archive_node',
      'edit_spec',
      'import_sdr',
      'edit_mapping',
      'export_mapping',
      'open_issue',
      'respond_issue',
      'close_issue',
      'sign_off'
    ]
  },
  {
    color: 'purple',
    description: 'Lead programmer responsible for study deliverables',
    isSystem: true,
    key: 'Study Lead',
    label: 'Study Lead',
    permissions: ['edit_spec', 'import_sdr', 'edit_mapping', 'export_mapping', 'respond_issue', 'sign_off']
  },
  {
    color: 'blue',
    description: 'Primary programmer for TFL outputs and mapping',
    isSystem: true,
    key: 'Programmer',
    label: 'Programmer',
    permissions: ['edit_spec', 'edit_mapping', 'respond_issue']
  },
  {
    color: 'green',
    description: 'Quality control reviewer for outputs',
    isSystem: true,
    key: 'QC Reviewer',
    label: 'QC Reviewer',
    permissions: ['open_issue', 'close_issue', 'sign_off']
  },
  {
    color: 'default',
    description: 'Read-only access to assigned scope',
    isSystem: true,
    key: 'Viewer',
    label: 'Viewer',
    permissions: []
  }
];

/** 角色配置（简化版，用于快速查找） */
export const roleConfig = Object.fromEntries(
  roleDefinitions.map(r => [r.key, { color: r.color, description: r.description, label: r.label }])
) as Record<RoleType, { color: string; description: string; label: string }>;

/** 作用域节点配置 */
export const scopeNodeConfig: Record<ScopeNodeType, { color: string; icon: string; label: string }> = {
  Analysis: { color: 'purple', icon: 'FundOutlined', label: 'Analysis' },
  Compound: { color: 'green', icon: 'ExperimentOutlined', label: 'Compound' },
  Study: { color: 'orange', icon: 'FileTextOutlined', label: 'Study' },
  TA: { color: 'blue', icon: 'ApartmentOutlined', label: 'Therapeutic Area' }
};

/** Pipeline 作用域树数据 */
export const pipelineScopeTree = [
  {
    children: [
      {
        children: [
          {
            children: [
              { children: [], id: 'analysis-001', name: 'Interim Analysis 1', type: 'Analysis' as ScopeNodeType },
              { children: [], id: 'analysis-002', name: 'Final Analysis', type: 'Analysis' as ScopeNodeType }
            ],
            id: 'study-001',
            name: 'ZL-1310-001',
            type: 'Study' as ScopeNodeType
          },
          { children: [], id: 'study-002', name: 'ZL-1310-002', type: 'Study' as ScopeNodeType }
        ],
        id: 'cp-001',
        name: 'ZL-1310',
        type: 'Compound' as ScopeNodeType
      }
    ],
    id: 'ta-001',
    name: 'Oncology',
    type: 'TA' as ScopeNodeType
  },
  {
    children: [],
    id: 'ta-002',
    name: 'Immunology',
    type: 'TA' as ScopeNodeType
  }
];

/** 根据 ID 查找作用域节点 */
export const findScopeNode = (
  nodes: typeof pipelineScopeTree,
  id: string
): { id: string; name: string; type: ScopeNodeType } | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findScopeNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

/** 用户 Mock 数据 */
export const usersMock: UserInfo[] = [
  {
    assignments: [
      {
        assignedAt: '2024-01-01',
        assignedBy: 'system',
        id: 'asgn-001',
        roleId: 'Super Admin',
        scopeId: 'ta-001',
        scopeName: 'Oncology',
        scopeType: 'TA'
      },
      {
        assignedAt: '2024-01-01',
        assignedBy: 'system',
        id: 'asgn-002',
        roleId: 'Super Admin',
        scopeId: 'ta-002',
        scopeName: 'Immunology',
        scopeType: 'TA'
      }
    ],
    createdAt: '2024-01-01',
    department: 'IT Department',
    displayName: 'System Admin',
    email: 'admin@pharma.com',
    id: 'user-001',
    lastLoginAt: '2024-06-18 09:30',
    status: 'Active',
    username: 'admin'
  },
  {
    assignments: [
      {
        assignedAt: '2024-02-20',
        assignedBy: 'admin@pharma.com',
        id: 'asgn-003',
        roleId: 'Study Lead',
        scopeId: 'study-001',
        scopeName: 'ZL-1310-001',
        scopeType: 'Study'
      },
      {
        assignedAt: '2024-03-01',
        assignedBy: 'admin@pharma.com',
        id: 'asgn-004',
        roleId: 'Programmer',
        scopeId: 'study-002',
        scopeName: 'ZL-1310-002',
        scopeType: 'Study'
      }
    ],
    createdAt: '2024-02-15',
    department: 'Biostatistics',
    displayName: 'Alice Chen',
    email: 'alice.chen@pharma.com',
    id: 'user-002',
    lastLoginAt: '2024-06-18 08:15',
    status: 'Active',
    username: 'alice.chen'
  },
  {
    assignments: [
      {
        assignedAt: '2024-03-05',
        assignedBy: 'admin@pharma.com',
        id: 'asgn-005',
        roleId: 'QC Reviewer',
        scopeId: 'study-001',
        scopeName: 'ZL-1310-001',
        scopeType: 'Study'
      }
    ],
    createdAt: '2024-03-01',
    department: 'Biostatistics',
    displayName: 'Bob Wang',
    email: 'bob.wang@pharma.com',
    id: 'user-003',
    lastLoginAt: '2024-06-17 16:45',
    status: 'Active',
    username: 'bob.wang'
  },
  {
    assignments: [
      {
        assignedAt: '2024-03-15',
        assignedBy: 'alice.chen@pharma.com',
        id: 'asgn-006',
        roleId: 'Programmer',
        scopeId: 'analysis-001',
        scopeName: 'Interim Analysis 1',
        scopeType: 'Analysis'
      },
      {
        assignedAt: '2024-03-15',
        assignedBy: 'alice.chen@pharma.com',
        id: 'asgn-007',
        roleId: 'Programmer',
        scopeId: 'analysis-002',
        scopeName: 'Final Analysis',
        scopeType: 'Analysis'
      }
    ],
    createdAt: '2024-03-10',
    department: 'Statistical Programming',
    displayName: 'Carol Liu',
    email: 'carol.liu@pharma.com',
    id: 'user-004',
    lastLoginAt: '2024-06-18 10:00',
    status: 'Active',
    username: 'carol.liu'
  },
  {
    assignments: [],
    createdAt: '2024-01-20',
    department: 'Statistical Programming',
    displayName: 'David Zhang',
    email: 'david.zhang@pharma.com',
    id: 'user-005',
    status: 'Inactive',
    username: 'david.zhang'
  },
  {
    assignments: [
      {
        assignedAt: '2024-04-05',
        assignedBy: 'admin@pharma.com',
        id: 'asgn-008',
        roleId: 'Viewer',
        scopeId: 'study-001',
        scopeName: 'ZL-1310-001',
        scopeType: 'Study'
      }
    ],
    createdAt: '2024-04-01',
    department: 'Clinical Operations',
    displayName: 'Eva Li',
    email: 'eva.li@pharma.com',
    id: 'user-006',
    lastLoginAt: '2024-06-16 14:30',
    status: 'Active',
    username: 'eva.li'
  }
];

/** 获取用户统计 */
export const getUserStats = () => {
  const total = usersMock.length;
  const active = usersMock.filter(u => u.status === 'Active').length;
  const inactive = usersMock.filter(u => u.status === 'Inactive').length;
  const locked = usersMock.filter(u => u.status === 'Locked').length;
  return { active, inactive, locked, total };
};

/** 检查用户是否为超级管理员 */
export const isSuperAdmin = (user: UserInfo): boolean => {
  return user.assignments.some(a => a.roleId === 'Super Admin');
};
