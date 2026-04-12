import { CloseCircleOutlined, PlusOutlined, SwapOutlined } from '@ant-design/icons';
import { Avatar, Button, Select, Space, Spin, Tag, Tooltip } from 'antd';
import React, { useCallback, useMemo, useState } from 'react';

import { searchPipelineUsers } from '@/service/api/mdr';

import type { AssignedRoleUser } from '../types';

/** Maps role code to user-facing label */
const ROLE_LABELS: Record<string, string> = {
  TA_HEAD: 'TA Lead Programmer',
  COMPOUND_LEAD: 'Product Lead Programmer',
  STUDY_LEAD_PROG: 'Study Lead Programmer',
  STUDY_PROG: 'Study Programmers',
};

interface RoleAssignmentSectionProps {
  assignedUsers: AssignedRoleUser[];
  editable: boolean;
  label?: string;
  maxCount?: number;
  onAssign: (user: AssignedRoleUser) => void;
  onRemove: (userId: number) => void;
  pendingChange?: 'added' | 'changed' | 'removed';
  roleCode: string;
}

const RoleAssignmentSection: React.FC<RoleAssignmentSectionProps> = ({
  assignedUsers,
  editable,
  label,
  maxCount,
  onAssign,
  onRemove,
  pendingChange,
  roleCode,
}) => {
  const [searchLoading, setSearchLoading] = useState(false);
  const [userOptions, setUserOptions] = useState<AssignedRoleUser[]>([]);
  const isSingle = maxCount === 1;
  const displayLabel = label || ROLE_LABELS[roleCode] || roleCode;
  const isBlue = !isSingle;

  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) return;
    setSearchLoading(true);
    try {
      const results = await searchPipelineUsers(query);
      if (results) {
        setUserOptions(
          results.map(u => ({
            displayName: u.display_name ?? '',
            email: u.email,
            userId: u.user_id,
            username: u.username,
          }))
        );
      }
    } catch (err) {
      console.warn('User search failed:', err);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const assignedIds = useMemo(() => new Set(assignedUsers.map(u => u.userId)), [assignedUsers]);

  const filteredOptions = useMemo(
    () => userOptions.filter(u => !assignedIds.has(u.userId)),
    [userOptions, assignedIds]
  );

  const borderColor = isBlue ? '#91d5ff' : '#b7eb8f';
  const bgColor = isBlue ? '#e6f7ff' : '#f6ffed';
  const titleColor = isBlue ? '#096dd9' : '#389e0d';

  return (
    <div
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        marginBottom: 10,
        padding: 12,
        position: 'relative',
      }}
    >
      {pendingChange && (
        <Tag
          color={pendingChange === 'added' ? 'success' : pendingChange === 'removed' ? 'error' : 'warning'}
          style={{ position: 'absolute', right: -4, top: -6, fontSize: 10 }}
        >
          {pendingChange === 'added' ? '+ADDED' : pendingChange === 'removed' ? 'REMOVED' : 'CHANGED'}
        </Tag>
      )}

      <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <Space size={4}>
          <span style={{ color: titleColor, fontSize: 14, fontWeight: 600 }}>{displayLabel}</span>
          <span style={{ color: '#999', fontSize: 11 }}>({roleCode})</span>
          {!isSingle && assignedUsers.length > 0 && (
            <Tag color="blue" style={{ fontSize: 11, marginLeft: 4 }}>
              {assignedUsers.length}
            </Tag>
          )}
        </Space>
      </div>

      {/* Assigned users list */}
      {assignedUsers.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {assignedUsers.map(user => (
            <div key={user.userId} style={{ alignItems: 'center', display: 'flex', gap: 8, padding: isSingle ? 0 : '4px 0' }}>
              <Avatar size={isSingle ? 28 : 24} style={{ backgroundColor: '#1677ff', fontSize: isSingle ? 12 : 10 }}>
                {(user.displayName || user.username).slice(0, 2).toUpperCase()}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{user.displayName || user.username}</div>
                <div style={{ color: '#999', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
              </div>
              {editable && (
                <Tooltip title="Remove">
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    size="small"
                    type="text"
                    onClick={() => onRemove(user.userId)}
                  />
                </Tooltip>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: '#d48806', fontSize: 12 }}>Not assigned</div>
      )}

      {/* Search dropdown for assigning new users */}
      {editable && (
        <div style={{ marginTop: 8 }}>
          <Select
            allowClear
            filterOption={false}
            notFoundContent={searchLoading ? <Spin size="small" /> : 'Type to search users...'}
            placeholder="Search users to assign..."
            showSearch
            size="small"
            style={{ width: '100%' }}
            onSearch={handleSearch}
            onSelect={(_value: unknown, option: unknown) => {
              const opt = option as { user: AssignedRoleUser };
              if (opt?.user) onAssign(opt.user);
            }}
          >
            {filteredOptions.map(u => (
              <Select.Option key={u.userId} value={u.userId} user={u}>
                <Space>
                  <Avatar size={18} style={{ backgroundColor: '#722ed1', fontSize: 9 }}>
                    {(u.displayName || u.username).slice(0, 2).toUpperCase()}
                  </Avatar>
                  <span>{u.displayName || u.username}</span>
                  <span style={{ color: '#999', fontSize: 11 }}>({u.username})</span>
                </Space>
              </Select.Option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
};

export default RoleAssignmentSection;
