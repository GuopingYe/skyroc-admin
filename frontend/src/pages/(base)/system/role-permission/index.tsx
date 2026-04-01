/** Role Permission Configuration - 角色权限配置 超级管理员配置角色功能权限矩阵 */
import { CheckOutlined, LockOutlined, SafetyCertificateOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Divider, Empty, List, Space, Spin, Tag, Tooltip, Typography, message } from 'antd';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { usePermissions, useRoles, useUpdateRolePermissions } from '@/service/hooks';
import auditLog, { AuditActions, EntityTypes } from '@/utils/audit-logger';

const { Text, Title } = Typography;

/** 权限分类配置 */
const PERMISSION_CATEGORIES = [
  { key: 'project', label: 'Project Management' },
  { key: 'metadata', label: 'Metadata Management' },
  { key: 'qc', label: 'QC Management' },
  { key: 'admin', label: 'System Administration' },
  { key: 'project', label: 'PR Approval' },
  { key: 'metadata', label: 'TFL Builder' }
] as const;

// Helper function to get translated permission category label
const getCategoryLabel = (categoryKey: string, t: (key: string) => string): string => {
  return t(`system.userManagement.permissionCategories.${categoryKey}`);
};

// Helper function to get translated permission info
const getPermissionInfo = (permission: Api.RBAC.Permission, t: (key: string) => string) => {
  // 尝试从 i18n 获取，否则使用 API 返回的值
  const permissionKey = permission.code.replace(':', '_'); // study:create -> study_create
  return {
    description: permission.description || t(`system.userManagement.permissions.${permissionKey}.description`),
    label: permission.name || t(`system.userManagement.permissions.${permissionKey}.label`)
  };
};

// 路由 handle 导出
export const handle = {
  i18nKey: 'route.(base)_system_role-permission',
  icon: 'mdi:shield-key',
  order: 2,
  title: 'Role Permission Configuration'
};

const RolePermission: React.FC = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  // API Hooks
  const { data: rolesData, isLoading: rolesLoading } = useRoles(true);
  const { data: permissionsData, isLoading: permissionsLoading } = usePermissions();
  const { isPending: isSaving, mutate: updateRolePermissions } = useUpdateRolePermissions();

  // 当前选中的角色 ID
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  // 本地权限修改状态（用于 UI 交互，实际保存需要调用 API）
  const [modifiedPermissions, setModifiedPermissions] = useState<Record<number, string[]>>({});

  // 按分类分组权限
  const permissionsByCategory = useMemo(() => {
    if (!permissionsData) return {};

    const grouped: Record<string, Api.RBAC.Permission[]> = {};
    permissionsData.forEach(perm => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });

    return grouped;
  }, [permissionsData]);

  // 所有分类
  const categories = useMemo(() => {
    return Object.keys(permissionsByCategory);
  }, [permissionsByCategory]);

  // 当前选中角色
  const selectedRole = useMemo(() => {
    if (!rolesData || !selectedRoleId) return null;
    return rolesData.find(r => r.id === selectedRoleId) || null;
  }, [rolesData, selectedRoleId]);

  const isSuperAdminSelected = useMemo(() => selectedRole?.code === 'SUPER_ADMIN', [selectedRole]);

  // 当前选中角色的权限代码列表
  const currentPermissions = useMemo(() => {
    if (!selectedRoleId) return [];

    // 优先使用本地修改的权限
    if (modifiedPermissions[selectedRoleId]) {
      return modifiedPermissions[selectedRoleId];
    }

    // 否则使用 API 返回的权限
    if (selectedRole?.permissions) {
      return selectedRole.permissions.map(p => p.code);
    }

    return [];
  }, [selectedRoleId, selectedRole, modifiedPermissions]);

  // 检查权限是否选中
  const isPermissionChecked = useCallback(
    (permissionCode: string) => {
      return currentPermissions.includes(permissionCode);
    },
    [currentPermissions]
  );

  // 切换权限
  const togglePermission = useCallback(
    (permissionCode: string) => {
      if (!selectedRoleId) return;

      setModifiedPermissions(prev => {
        const current = prev[selectedRoleId] || selectedRole?.permissions?.map(p => p.code) || [];
        const newPermissions = current.includes(permissionCode)
          ? current.filter(p => p !== permissionCode)
          : [...current, permissionCode];
        return { ...prev, [selectedRoleId]: newPermissions };
      });
    },
    [selectedRoleId, selectedRole]
  );

  // 切换分类下所有权限
  const toggleCategoryPermissions = useCallback(
    (permissionCodes: string[], checked: boolean) => {
      if (!selectedRoleId) return;

      setModifiedPermissions(prev => {
        const current = prev[selectedRoleId] || selectedRole?.permissions?.map(p => p.code) || [];
        const newPermissions = checked
          ? [...new Set([...current, ...permissionCodes])]
          : current.filter(p => !permissionCodes.includes(p));
        return { ...prev, [selectedRoleId]: newPermissions };
      });
    },
    [selectedRoleId, selectedRole]
  );

  // 保存权限配置
  const handleSave = useCallback(() => {
    if (!selectedRole || !selectedRoleId) return;
    if (isSuperAdminSelected) return;

    const permissionIds = (permissionsData || [])
      .filter(permission => currentPermissions.includes(permission.code))
      .map(permission => permission.id);

    updateRolePermissions(
      { permissionIds, roleId: selectedRoleId },
      {
        onError: (error: any) => {
          const detail = error?.response?.data?.detail ?? 'Save failed';
          messageApi.error(detail);
        },
        onSuccess: () => {
          setModifiedPermissions(prev => {
            const next = { ...prev };
            delete next[selectedRoleId];
            return next;
          });

          auditLog(
            AuditActions.UPDATE,
            EntityTypes.ROLE,
            String(selectedRoleId),
            selectedRole.name,
            undefined,
            JSON.stringify(permissionIds),
            'Role permissions updated via API'
          );

          messageApi.success(t('system.userManagement.rolePermission.saveSuccess'));
        }
      }
    );
  }, [
    currentPermissions,
    isSuperAdminSelected,
    messageApi,
    permissionsData,
    selectedRole,
    selectedRoleId,
    t,
    updateRolePermissions
  ]);

  // 检查分类是否全选
  const isCategoryAllChecked = useCallback(
    (permissionCodes: string[]) => {
      return permissionCodes.every(code => currentPermissions.includes(code));
    },
    [currentPermissions]
  );

  // 检查分类是否部分选中
  const isCategoryIndeterminate = useCallback(
    (permissionCodes: string[]) => {
      const checkedCount = permissionCodes.filter(code => currentPermissions.includes(code)).length;
      return checkedCount > 0 && checkedCount < permissionCodes.length;
    },
    [currentPermissions]
  );

  return (
    <div className="h-full flex gap-16px overflow-hidden">
      {contextHolder}

      {/* 左侧角色列表 */}
      <Card
        className="w-320px flex flex-col flex-shrink-0 overflow-hidden card-wrapper"
        size="small"
        variant="borderless"
        title={
          <Space>
            <SafetyCertificateOutlined className="text-blue-500" />
            <Title
              className="m-0"
              level={4}
            >
              {t('system.userManagement.rolePermission.roleList')}
            </Title>
          </Space>
        }
      >
        <Spin spinning={rolesLoading}>
          <div className="flex-1 overflow-y-auto">
            <List
              dataSource={rolesData || []}
              renderItem={role => (
                <List.Item
                  data-testid={`role-item-${role.code}`}
                  className={`cursor-pointer px-12px py-8px rounded-lg transition-colors ${
                    selectedRoleId === role.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  <div className="w-full flex items-center justify-between">
                    <Space>
                      <Tag color={role.color || 'default'}>{role.name}</Tag>
                      {role.is_system && (
                        <Tag
                          className="text-10px"
                          color="default"
                        >
                          {t('system.userManagement.rolePermission.systemRole')}
                        </Tag>
                      )}
                    </Space>
                    {selectedRoleId === role.id && <CheckOutlined className="text-blue-500" />}
                  </div>
                </List.Item>
              )}
            />
          </div>
        </Spin>
      </Card>

      {/* 右侧权限矩阵 */}
      <Card
        className="flex flex-col flex-1 overflow-hidden card-wrapper"
        size="small"
        variant="borderless"
        extra={
          selectedRoleId && (
            <Tooltip title={isSuperAdminSelected ? 'SUPER_ADMIN permissions are immutable' : undefined}>
              <Button
                data-testid="role-permission-save"
                disabled={isSuperAdminSelected || isSaving}
                icon={isSuperAdminSelected ? <LockOutlined /> : undefined}
                loading={isSaving}
                size="small"
                type="primary"
                onClick={handleSave}
              >
                {t('system.userManagement.rolePermission.save')}
              </Button>
            </Tooltip>
          )
        }
        title={
          <Space>
            <SettingOutlined className="text-purple-500" />
            <Title
              className="m-0"
              level={4}
            >
              {t('system.userManagement.rolePermission.permissionMatrix')}
            </Title>
            {selectedRole && <Tag color={selectedRole.color || 'default'}>{selectedRole.name}</Tag>}
          </Space>
        }
      >
        <Spin spinning={permissionsLoading}>
          {selectedRoleId ? (
            <div className="flex-1 overflow-y-auto">
              {categories.map(category => {
                const categoryPermissions = permissionsByCategory[category] || [];
                const permissionCodes = categoryPermissions.map(p => p.code);

                return (
                  <div
                    className="mb-16px"
                    key={category}
                  >
                    <div className="mb-8px flex items-center gap-8px px-4px">
                      <Checkbox
                        checked={isCategoryAllChecked(permissionCodes)}
                        indeterminate={isCategoryIndeterminate(permissionCodes)}
                        onChange={e => toggleCategoryPermissions(permissionCodes, e.target.checked)}
                      >
                        <Text strong>{getCategoryLabel(category, t)}</Text>
                      </Checkbox>
                      <Tag
                        className="text-10px"
                        color="blue"
                      >
                        {permissionCodes.filter(code => currentPermissions.includes(code)).length}/
                        {permissionCodes.length}
                      </Tag>
                    </div>
                    <div className="grid grid-cols-2 gap-8px pl-24px">
                      {categoryPermissions.map(permission => {
                        const permInfo = getPermissionInfo(permission, t);
                        return (
                          <Checkbox
                            checked={isPermissionChecked(permission.code)}
                            data-testid={`permission-checkbox-${permission.code.replaceAll(':', '-')}`}
                            key={permission.id}
                            onChange={() => togglePermission(permission.code)}
                          >
                            <Space
                              direction="vertical"
                              size={0}
                            >
                              <Text>{permInfo.label}</Text>
                              <Text
                                className="text-11px"
                                type="secondary"
                              >
                                {permInfo.description}
                              </Text>
                            </Space>
                          </Checkbox>
                        );
                      })}
                    </div>
                    <Divider className="my-12px" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex-center">
              <Empty description={t('system.userManagement.rolePermission.selectRoleHint')} />
            </div>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default RolePermission;
