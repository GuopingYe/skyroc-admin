import { DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import { Avatar, Button, Divider, Drawer, Form, List, Popconfirm, Select, Space, Spin, Tag, Typography, message } from 'antd';
import React, { useMemo } from 'react';

import { useAssignTeam, useRevokePermission, useRoles, useUsers } from '@/service/hooks';

const { Text } = Typography;

interface AssignTeamPanelProps {
  onClose: () => void;
  open: boolean;
  scopeLabel: string;
  scopeNodeId: number;
}

const AssignTeamPanel: React.FC<AssignTeamPanelProps> = ({ onClose, open, scopeLabel, scopeNodeId }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const { data: allUsers, isLoading: usersLoading, refetch: refetchUsers } = useUsers({ is_active: true });
  const { data: allRoles, isLoading: rolesLoading } = useRoles();
  const { mutate: assignTeam, isPending: isAssigning } = useAssignTeam();
  const { mutate: revokePermission, isPending: isRevoking } = useRevokePermission();

  const currentTeam = useMemo(() => {
    return (allUsers || []).flatMap(user =>
      (user.assignments || [])
        .filter(assignment => assignment.scope_node.id === scopeNodeId)
        .map(assignment => ({ assignment, user }))
    );
  }, [allUsers, scopeNodeId]);

  const handleAssign = (values: { role_id: number; user_id: number }) => {
    assignTeam(
      { role_id: values.role_id, scope_node_id: scopeNodeId, user_id: values.user_id },
      {
        onError: (error: any) => {
          messageApi.error(error?.response?.data?.detail ?? 'Assignment failed');
        },
        onSuccess: async () => {
          await refetchUsers();
          messageApi.success('Team member assigned successfully');
          form.resetFields();
        }
      }
    );
  };

  const handleRevoke = (userId: number, roleId: number) => {
    revokePermission(
      { role_id: roleId, scope_node_id: scopeNodeId, user_id: userId },
      {
        onError: (error: any) => {
          messageApi.error(error?.response?.data?.detail ?? 'Revoke failed');
        },
        onSuccess: async () => {
          await refetchUsers();
          messageApi.success('Team member removed');
        }
      }
    );
  };

  return (
    <Drawer
      open={open}
      title={
        <Space>
          <TeamOutlined />
          <span>Assign Team</span>
        </Space>
      }
      width={480}
      onClose={onClose}
    >
      {contextHolder}

      <Text type="secondary">
        Assigning to: <strong>{scopeLabel}</strong>
      </Text>

      <Divider>Current Team</Divider>

      <Spin spinning={usersLoading || rolesLoading}>
        {currentTeam.length === 0 ? (
          <Text type="secondary">No team members assigned yet.</Text>
        ) : (
          <List
            dataSource={currentTeam}
            renderItem={({ assignment, user }) => (
              <List.Item
                actions={[
                  <Popconfirm
                    key="revoke"
                    title="Remove this team assignment?"
                    onConfirm={() => handleRevoke(user.id, assignment.role.id)}
                  >
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      loading={isRevoking}
                      size="small"
                    />
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar>{(user.display_name || user.username).charAt(0).toUpperCase()}</Avatar>}
                  description={<Tag color={assignment.role.color || 'default'}>{assignment.role.name}</Tag>}
                  title={user.display_name || user.username}
                />
              </List.Item>
            )}
          />
        )}
      </Spin>

      <Divider>Add Member</Divider>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleAssign}
      >
        <Form.Item
          label="User"
          name="user_id"
          rules={[{ required: true }]}
        >
          <Select
            data-testid="assign-team-user-select"
            filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
            loading={usersLoading}
            options={(allUsers || []).map(user => ({
              label: `${user.display_name || user.username} (${user.username})`,
              value: user.id
            }))}
            placeholder="Select user"
            showSearch
          />
        </Form.Item>

        <Form.Item
          label="Role"
          name="role_id"
          rules={[{ required: true }]}
        >
          <Select
            data-testid="assign-team-role-select"
            loading={rolesLoading}
            options={(allRoles || []).map(role => ({ label: role.name, value: role.id }))}
            placeholder="Select role"
          />
        </Form.Item>

        <Button
          block
          data-testid="assign-team-submit"
          htmlType="submit"
          loading={isAssigning}
          type="primary"
        >
          Assign
        </Button>
      </Form>
    </Drawer>
  );
};

export default AssignTeamPanel;
