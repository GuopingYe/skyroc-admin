/** User Management - 用户管理 用户中心与权限分配 */
import {
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  UserOutlined
} from '@ant-design/icons';
import {
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Tree,
  Typography,
  message
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useCreateUser,
  useGrantPermission,
  useRevokePermission,
  useRoles,
  useScopeTree,
  useSyncLdap,
  useUpdateUser,
  useUpdateUserStatus,
  useUsers
} from '@/service/hooks';
import auditLog, { AuditActions, EntityTypes } from '@/utils/audit-logger';

const { Text, Title } = Typography;

/** 用户状态类型 */
type UserStatus = 'Active' | 'Inactive' | 'Locked';

/** 用户状态配置 */
const userStatusConfig: Record<UserStatus, { color: string }> = {
  Active: { color: 'success' },
  Inactive: { color: 'default' },
  Locked: { color: 'error' }
};

// Helper function to get translated status label
export const getStatusLabel = (status: UserStatus, t: (key: string) => string): string => {
  return t(`system.userManagement.status.${status}`);
};

// Helper function to get role display info from API role data
export const getRoleDisplayInfo = (
  role: Api.RBAC.Role,
  t: (key: string) => string
): { color: string; description: string; label: string } => {
  const roleKey = role.code.replace('_', ''); // SUPER_ADMIN -> SUPERADMIN
  return {
    color: role.color || 'default',
    description: role.description || t(`system.userManagement.roles.${roleKey}.description`),
    label: role.name
  };
};

// 路由 handle 导出
export const handle = {
  i18nKey: 'route.(base)_system_user-management',
  icon: 'mdi:account-cog',
  order: 1,
  title: 'User Management'
};

/** 将 API 作用域树转换为 Antd Tree 数据 */
const convertScopeTreeToDataNode = (nodes: Api.RBAC.ScopeTreeNode[]): DataNode[] => {
  return nodes.map(node => ({
    children: node.children?.length ? convertScopeTreeToDataNode(node.children) : undefined,
    key: String(node.id),
    title: `${node.name} (${node.node_type})`
  }));
};

/** 从 API 用户数据转换状态 */
const getUserStatus = (user: Api.RBAC.UserListItem): UserStatus => {
  if (!user.is_active) return 'Inactive';
  return 'Active';
};

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  // API Hooks
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useUsers();
  const { data: rolesData, isLoading: rolesLoading } = useRoles();
  const { data: scopeTreeData, isLoading: scopeTreeLoading } = useScopeTree();

  // Mutations
  const { mutate: createUser, isPending: isCreating } = useCreateUser();
  const grantMutation = useGrantPermission();
  const revokeMutation = useRevokePermission();
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();
  const { mutate: updateUserStatus, isPending: isUpdatingStatus } = useUpdateUserStatus();
  const { mutate: syncLdap, isPending: isSyncing } = useSyncLdap();

  // 搜索和筛选状态
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<UserStatus | 'all'>('all');

  // 创建 Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();

  // 编辑 Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Api.RBAC.UserListItem | null>(null);
  const [editForm] = Form.useForm();

  // 权限分配 Modal
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Api.RBAC.UserListItem | null>(null);
  const [selectedNodeKeys, setSelectedNodeKeys] = useState<number[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  // 统计数据
  const stats = useMemo(() => {
    if (!usersData) return { active: 0, inactive: 0, locked: 0, total: 0 };
    const total = usersData.length;
    const active = usersData.filter(u => u.is_active && !u.is_superuser).length;
    const inactive = usersData.filter(u => !u.is_active).length;
    const locked = 0; // API 暂无锁定状态
    return { active, inactive, locked, total };
  }, [usersData]);

  // 筛选后的用户列表
  const filteredUsers = useMemo(() => {
    if (!usersData) return [];
    return usersData.filter(user => {
      const status = getUserStatus(user);
      if (filterStatus !== 'all' && status !== filterStatus) return false;
      if (searchText) {
        const keyword = searchText.toLowerCase();
        const matchName = (user.display_name || user.username).toLowerCase().includes(keyword);
        const matchEmail = user.email.toLowerCase().includes(keyword);
        const matchDept = (user.department || '').toLowerCase().includes(keyword);
        if (!matchName && !matchEmail && !matchDept) return false;
      }
      return true;
    });
  }, [usersData, filterStatus, searchText]);

  // Pipeline 树数据
  const pipelineTreeData = useMemo(() => {
    if (!scopeTreeData) return [];
    return convertScopeTreeToDataNode(scopeTreeData);
  }, [scopeTreeData]);

  // 角色选项
  const roleOptions = useMemo(() => {
    if (!rolesData) return [];
    return rolesData.map(role => ({
      label: (
        <Space>
          <Tag color={role.color || 'default'}>{role.name}</Tag>
          <span className="text-12px text-gray-500">{role.description}</span>
        </Space>
      ),
      value: role.id
    }));
  }, [rolesData]);

  // 打开权限分配 Modal
  const openPermissionModal = useCallback((user: Api.RBAC.UserListItem) => {
    setSelectedUser(user);
    setSelectedNodeKeys([]);
    setSelectedRoleId(null);
    setPermissionModalOpen(true);
  }, []);

  // 打开编辑 Modal
  const openEditModal = useCallback(
    (user: Api.RBAC.UserListItem) => {
      setEditingUser(user);
      editForm.setFieldsValue({
        department: user.department,
        display_name: user.display_name,
        email: user.email,
      });
      setEditModalOpen(true);
    },
    [editForm]
  );

  const handleCreateUser = useCallback(
    (values: Record<string, string>) => {
      createUser(
        {
          username: values.username,
          email: values.email,
          display_name: values.display_name || null,
          department: values.department || null,
          password: values.password
        },
        {
          onError: (error: any) => {
            messageApi.error(error?.response?.data?.detail ?? 'Failed to create user');
          },
          onSuccess: createdUser => {
            auditLog(
              AuditActions.CREATE,
              EntityTypes.USER,
              String(createdUser.id),
              createdUser.display_name || createdUser.username,
              undefined,
              JSON.stringify(createdUser),
              'Local user created'
            );
            messageApi.success('User created successfully');
            setCreateModalOpen(false);
            createForm.resetFields();
          }
        }
      );
    },
    [createForm, createUser, messageApi]
  );

  const handleEditUser = useCallback(
    (values: Record<string, string>) => {
      if (!editingUser) return;

      updateUser(
        {
          data: {
            display_name: values.display_name || null,
            email: values.email || null,
            department: values.department || null
          },
          userId: editingUser.id
        },
        {
          onError: (error: any) => {
            messageApi.error(error?.response?.data?.detail ?? 'Failed to update user');
          },
          onSuccess: updatedUser => {
            auditLog(
              AuditActions.UPDATE,
              EntityTypes.USER,
              String(updatedUser.id),
              updatedUser.display_name || updatedUser.username,
              undefined,
              JSON.stringify(updatedUser),
              'User profile updated'
            );
            messageApi.success(t('system.userManagement.editModal.saveSuccess'));
            setEditModalOpen(false);
            setEditingUser(null);
            editForm.resetFields();
          }
        }
      );
    },
    [editForm, editingUser, messageApi, t, updateUser]
  );

  const handleToggleUserStatus = useCallback(
    (user: Api.RBAC.UserListItem) => {
      updateUserStatus(
        { isActive: !user.is_active, userId: user.id },
        {
          onError: (error: any) => {
            messageApi.error(error?.response?.data?.detail ?? 'Failed to update status');
          },
          onSuccess: updatedUser => {
            auditLog(
              AuditActions.UPDATE,
              EntityTypes.USER,
              String(updatedUser.id),
              updatedUser.display_name || updatedUser.username,
              undefined,
              JSON.stringify({ is_active: updatedUser.is_active }),
              'User status updated'
            );
            messageApi.success(user.is_active ? 'User deactivated' : 'User activated');
          }
        }
      );
    },
    [messageApi, updateUserStatus]
  );

  const handleSyncLdap = useCallback(() => {
    syncLdap(undefined, {
      onError: () => {
        messageApi.info('LDAP sync is not yet configured. Coming soon.');
      }
    });
  }, [messageApi, syncLdap]);

  // 分配权限
  const handleAssignPermission = useCallback(async () => {
    if (!selectedUser || selectedNodeKeys.length === 0 || !selectedRoleId) {
      messageApi.warning(t('system.userManagement.permission.selectRequired'));
      return;
    }

    try {
      // 为每个选中的节点分配角色
      for (const scopeNodeId of selectedNodeKeys) {
        await grantMutation.mutateAsync({
          role_id: selectedRoleId,
          scope_node_id: scopeNodeId,
          user_id: selectedUser.id
        });
      }

      auditLog(
        AuditActions.ASSIGN_ROLE,
        EntityTypes.USER,
        String(selectedUser.id),
        selectedUser.display_name || selectedUser.username,
        undefined,
        `Role ID: ${selectedRoleId}, Nodes: ${selectedNodeKeys.join(', ')}`,
        'Permission assignment'
      );

      messageApi.success(t('system.userManagement.permission.assignSuccess'));
      setPermissionModalOpen(false);
      setSelectedUser(null);
      refetchUsers();
    } catch {
      messageApi.error(t('system.userManagement.permission.assignFailed') || 'Failed to assign permission');
    }
  }, [selectedUser, selectedNodeKeys, selectedRoleId, grantMutation, messageApi, t, refetchUsers]);

  // 撤销权限
  const handleRevokePermission = useCallback(
    async (userId: number, scopeNodeId: number, roleId: number) => {
      try {
        await revokeMutation.mutateAsync({
          role_id: roleId,
          scope_node_id: scopeNodeId,
          user_id: userId
        });
        messageApi.success(t('system.userManagement.permission.revokeSuccess') || 'Permission revoked');
        refetchUsers();
      } catch {
        messageApi.error(t('system.userManagement.permission.revokeFailed') || 'Failed to revoke permission');
      }
    },
    [revokeMutation, messageApi, t, refetchUsers]
  );

  // 表格列
  const columns: ColumnsType<Api.RBAC.UserListItem> = useMemo(
    () => [
      {
        key: 'user',
        render: (_: unknown, record) => (
          <Space>
            <Avatar
              icon={<UserOutlined />}
              style={{ backgroundColor: record.is_superuser ? '#722ed1' : '#1890ff' }}
            >
              {(record.display_name || record.username).charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <div className="font-medium">
                {record.display_name || record.username}
                {record.is_superuser && (
                  <Tag
                    className="ml-4px"
                    color="magenta"
                  >
                    Super
                  </Tag>
                )}
              </div>
              <div className="text-12px text-gray-400">{record.email}</div>
            </div>
          </Space>
        ),
        title: t('system.userManagement.cols.user'),
        width: 200
      },
      {
        dataIndex: 'department',
        key: 'department',
        render: (text?: string) => text || '-',
        title: t('system.userManagement.cols.department'),
        width: 150
      },
      {
        key: 'status',
        render: (_: unknown, record) => {
          const status = getUserStatus(record);
          return <Tag color={userStatusConfig[status].color}>{getStatusLabel(status, t)}</Tag>;
        },
        title: t('system.userManagement.cols.status'),
        width: 100
      },
      {
        key: 'permissions',
        render: (_: unknown, record) => (
          <Space
            wrap
            size={4}
          >
            {record.assignments.length === 0 ? (
              <Tag color="default">{t('system.userManagement.noPermissions')}</Tag>
            ) : (
              record.assignments.slice(0, 3).map((assignment: Api.RBAC.UserScopeRole) => {
                const roleInfo = rolesData
                  ? getRoleDisplayInfo(assignment.role, t)
                  : { color: assignment.role.color || 'default', description: '', label: assignment.role.name };
                return (
                  <Tooltip
                    key={assignment.id}
                    title={`${assignment.scope_node.name} - ${roleInfo.description}`}
                  >
                    <Tag
                      closable
                      color={roleInfo.color}
                      onClose={e => {
                        e.preventDefault();
                        handleRevokePermission(record.id, assignment.scope_node.id, assignment.role.id);
                      }}
                    >
                      {assignment.scope_node.name}: {roleInfo.label}
                    </Tag>
                  </Tooltip>
                );
              })
            )}
            {record.assignments.length > 3 && <Tag color="blue">+{record.assignments.length - 3}</Tag>}
          </Space>
        ),
        title: t('system.userManagement.cols.permissions'),
        width: 280
      },
      {
        dataIndex: 'last_login_at',
        key: 'lastLoginAt',
        render: (text?: string) => (text ? new Date(text).toLocaleString() : '-'),
        title: t('system.userManagement.cols.lastLogin'),
        width: 140
      },
      {
        fixed: 'right',
        key: 'action',
        render: (_: unknown, record) => (
          <Space size={4}>
            <Button
              icon={<KeyOutlined />}
              size="small"
              type="link"
              onClick={() => openPermissionModal(record)}
            >
              {t('system.userManagement.assignPermission')}
            </Button>
            <Button
              icon={<EditOutlined />}
              size="small"
              type="link"
              onClick={() => openEditModal(record)}
            >
              {t('system.userManagement.edit')}
            </Button>
            <Popconfirm
              title={record.is_active ? 'Deactivate this user?' : 'Activate this user?'}
              onConfirm={() => handleToggleUserStatus(record)}
            >
              <Button
                danger={record.is_active}
                icon={<DeleteOutlined />}
                loading={isUpdatingStatus}
                size="small"
                type="link"
              >
                {t('system.userManagement.delete')}
              </Button>
            </Popconfirm>
          </Space>
        ),
        title: t('system.userManagement.cols.action'),
        width: 180
      }
    ],
    [t, openPermissionModal, openEditModal, rolesData, handleRevokePermission, handleToggleUserStatus, isUpdatingStatus]
  );

  return (
    <div className="h-full flex flex-col gap-12px overflow-hidden">
      {contextHolder}

      {/* 统计看板 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card
            className="card-wrapper text-center"
            size="small"
          >
            <div className="text-28px text-blue-600 font-bold">{stats.total}</div>
            <div className="text-12px text-gray-500">{t('system.userManagement.stats.total')}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card
            className="card-wrapper text-center"
            size="small"
          >
            <div className="text-28px text-green-600 font-bold">{stats.active}</div>
            <div className="text-12px text-gray-500">{t('system.userManagement.stats.active')}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card
            className="card-wrapper text-center"
            size="small"
          >
            <div className="text-28px text-gray-400 font-bold">{stats.inactive}</div>
            <div className="text-12px text-gray-500">{t('system.userManagement.stats.inactive')}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card
            className="card-wrapper text-center"
            size="small"
          >
            <div className="text-28px text-red-600 font-bold">{stats.locked}</div>
            <div className="text-12px text-gray-500">{t('system.userManagement.stats.locked')}</div>
          </Card>
        </Col>
      </Row>

      {/* 主表格 */}
      <Card
        className="flex flex-col flex-1 overflow-hidden card-wrapper"
        size="small"
        variant="borderless"
        extra={
          <Space>
            <Input.Search
              allowClear
              placeholder={t('system.userManagement.searchPlaceholder')}
              size="small"
              style={{ width: 200 }}
              onSearch={setSearchText}
            />
            <Select
              size="small"
              style={{ width: 120 }}
              value={filterStatus}
              options={[
                { label: t('system.userManagement.filters.allStatus'), value: 'all' },
                { label: t('system.userManagement.status.Active'), value: 'Active' },
                { label: t('system.userManagement.status.Inactive'), value: 'Inactive' },
                { label: t('system.userManagement.status.Locked'), value: 'Locked' }
              ]}
              onChange={setFilterStatus}
            />
            <Button
              icon={<PlusOutlined />}
              size="small"
              type="primary"
              onClick={() => setCreateModalOpen(true)}
            >
              {t('system.userManagement.addUser')}
            </Button>
            <Button
              loading={isSyncing}
              size="small"
              onClick={handleSyncLdap}
            >
              Sync from LDAP
            </Button>
          </Space>
        }
        title={
          <Space>
            <UserOutlined className="text-blue-600" />
            <Title
              className="m-0"
              level={4}
            >
              {t('system.userManagement.title')}
            </Title>
            <Tag color="blue">{filteredUsers.length}</Tag>
          </Space>
        }
      >
        <Spin spinning={usersLoading}>
          <Table
            className="flex-1 overflow-hidden"
            columns={columns}
            dataSource={filteredUsers}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            rowKey="id"
            scroll={{ x: 'max-content', y: 'calc(100vh - 350px)' }}
            size="small"
          />
        </Spin>
      </Card>

      <Modal
        confirmLoading={isCreating}
        open={createModalOpen}
        title="Create User"
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateUser}
        >
          <Form.Item
            label="Username"
            name="username"
            rules={[{ min: 3, required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, type: 'email' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Display Name"
            name="display_name"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Department"
            name="department"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ min: 8, required: true }]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>

      {/* 权限分配 Modal */}
      <Modal
        cancelText={t('system.userManagement.permission.cancel')}
        confirmLoading={grantMutation.isPending}
        okText={t('system.userManagement.permission.assign')}
        open={permissionModalOpen}
        width={700}
        title={
          <Space>
            <SafetyCertificateOutlined className="text-blue-500" />
            <span>{t('system.userManagement.permission.title')}</span>
            {selectedUser && <Tag color="blue">{selectedUser.display_name || selectedUser.username}</Tag>}
          </Space>
        }
        onCancel={() => setPermissionModalOpen(false)}
        onOk={handleAssignPermission}
      >
        <div className="flex flex-col gap-16px">
          {/* 当前权限列表 */}
          {selectedUser && selectedUser.assignments.length > 0 && (
            <div>
              <Text
                strong
                className="mb-8px block"
              >
                {t('system.userManagement.permission.currentPermissions')}
              </Text>
              <Space
                wrap
                size={4}
              >
                {selectedUser.assignments.map((assignment: Api.RBAC.UserScopeRole) => {
                  const roleInfo = rolesData
                    ? getRoleDisplayInfo(assignment.role, t)
                    : { color: 'default', label: assignment.role.name };
                  return (
                    <Tag
                      closable
                      color={roleInfo.color}
                      key={assignment.id}
                      onClose={() =>
                        handleRevokePermission(selectedUser.id, assignment.scope_node.id, assignment.role.id)
                      }
                    >
                      {assignment.scope_node.name}: {roleInfo.label}
                    </Tag>
                  );
                })}
              </Space>
              <Divider className="my-12px" />
            </div>
          )}

          {/* 选择节点 */}
          <div>
            <Text
              strong
              className="mb-8px block"
            >
              {t('system.userManagement.permission.selectNode')}
            </Text>
            <Spin spinning={scopeTreeLoading}>
              <div className="max-h-200px overflow-y-auto border border-gray-200 rounded-lg p-12px">
                <Tree
                  checkable
                  checkedKeys={selectedNodeKeys.map(String)}
                  className="bg-transparent"
                  treeData={pipelineTreeData}
                  onCheck={keys => setSelectedNodeKeys((keys as string[]).map(Number))}
                />
              </div>
            </Spin>
          </div>

          {/* 选择角色 */}
          <div>
            <Text
              strong
              className="mb-8px block"
            >
              {t('system.userManagement.permission.selectRole')}
            </Text>
            <Spin spinning={rolesLoading}>
              <Select
                options={roleOptions}
                placeholder={t('system.userManagement.permission.rolePlaceholder')}
                style={{ width: '100%' }}
                value={selectedRoleId}
                onChange={setSelectedRoleId}
              />
            </Spin>
          </div>

          {/* 提示信息 */}
          <div className="border border-blue-100 rounded-lg bg-blue-50 p-12px">
            <Text
              className="text-12px"
              type="secondary"
            >
              {t('system.userManagement.permission.hint')}
            </Text>
          </div>
        </div>
      </Modal>

      {/* 编辑用户 Modal */}
      <Modal
        cancelText={t('system.userManagement.editModal.cancel')}
        confirmLoading={isUpdating}
        okText={t('system.userManagement.editModal.save')}
        open={editModalOpen}
        width={500}
        title={
          <Space>
            <EditOutlined className="text-blue-500" />
            <span>{t('system.userManagement.editModal.title')}</span>
            {editingUser && <Tag color="blue">{editingUser.display_name || editingUser.username}</Tag>}
          </Space>
        }
        onOk={() => editForm.submit()}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingUser(null);
          editForm.resetFields();
        }}
      >
        <Form
          className="mt-16px"
          form={editForm}
          layout="vertical"
          onFinish={handleEditUser}
        >
          <Form.Item
            label={t('system.userManagement.editModal.displayName')}
            name="display_name"
            rules={[{ message: t('system.userManagement.editModal.displayNameRequired'), required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={t('system.userManagement.editModal.email')}
            name="email"
            rules={[
              { message: t('system.userManagement.editModal.emailRequired'), required: true },
              { message: t('system.userManagement.editModal.emailInvalid'), type: 'email' }
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={t('system.userManagement.editModal.department')}
            name="department"
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
