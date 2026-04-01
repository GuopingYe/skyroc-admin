/**
 * TFL Builder - Column Header Set Editor
 *
 * Study-level editor for managing reusable column header groupings. Each set defines a nested column structure (e.g.
 * SOC/PT, Visit-based) that listings can reference via columnHeaderSetId.
 */
import {
  DeleteOutlined,
  EditOutlined,
  GroupOutlined,
  PlusOutlined,
  SaveOutlined,
  UngroupOutlined
} from '@ant-design/icons';
import { Button, Card, Input, Popconfirm, Select, Space, Tag, Tooltip, Typography, message } from 'antd';
import { useMemo, useState } from 'react';

import { useStudyStore } from '../../stores';
import type { ColumnHeaderGroup, ColumnHeaderSet } from '../../types';
import { countLeaves } from '../../utils/treeUtils';

const { Text } = Typography;

// ==================== Helpers ====================

interface FlatGroup {
  depth: number;
  group: ColumnHeaderGroup;
  parentId: string | null;
}

function flattenGroups(groups: ColumnHeaderGroup[], depth = 0, parentId: string | null = null): FlatGroup[] {
  const result: FlatGroup[] = [];
  groups.forEach(g => {
    result.push({ depth, group: g, parentId });
    if (g.children?.length) {
      result.push(...flattenGroups(g.children, depth + 1, g.id));
    }
  });
  return result;
}

// ==================== Component ====================

export default function ColumnHeaderSetEditor() {
  const columnHeaderSets = useStudyStore(s => s.columnHeaderSets);
  const addColumnHeaderSet = useStudyStore(s => s.addColumnHeaderSet);
  const updateColumnHeaderSet = useStudyStore(s => s.updateColumnHeaderSet);
  const deleteColumnHeaderSet = useStudyStore(s => s.deleteColumnHeaderSet);
  const addHeaderGroup = useStudyStore(s => s.addHeaderGroup);
  const updateHeaderGroup = useStudyStore(s => s.updateHeaderGroup);
  const deleteHeaderGroup = useStudyStore(s => s.deleteHeaderGroup);
  const addChildGroup = useStudyStore(s => s.addChildGroup);

  const [activeSetId, setActiveSetId] = useState<string | null>(columnHeaderSets[0]?.id || null);

  // Edit states
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editVariable, setEditVariable] = useState('');

  const activeSet = columnHeaderSets.find(s => s.id === activeSetId);
  const flatGroups = useMemo(() => (activeSet ? flattenGroups(activeSet.headers) : []), [activeSet]);

  // ==================== Set handlers ====================

  const handleAddSet = () => {
    addColumnHeaderSet({ description: '', headers: [], name: 'New Header Set' });
    message.success('Header set created');
  };

  const handleDeleteSet = (id: string) => {
    deleteColumnHeaderSet(id);
    if (activeSetId === id) setActiveSetId(columnHeaderSets.find(s => s.id !== id)?.id || null);
    message.success('Deleted');
  };

  const startEditSet = (set: ColumnHeaderSet) => {
    setEditingSetId(set.id);
    setEditLabel(set.name);
    setEditingGroupId(null);
  };

  const saveEditSet = () => {
    if (editingSetId && editLabel.trim()) {
      updateColumnHeaderSet(editingSetId, { name: editLabel.trim() });
      setEditingSetId(null);
      message.success('Saved');
    }
  };

  // ==================== Group handlers ====================

  const handleAddGroup = () => {
    if (!activeSetId) return;
    addHeaderGroup(activeSetId, { label: 'New Column' });
    message.success('Column added');
  };

  const handleAddSubGroup = (parentId: string) => {
    if (!activeSetId) return;
    addChildGroup(activeSetId, parentId, { label: 'Sub Column' });
    message.success('Child column added');
  };

  const handleUngroup = (groupId: string) => {
    if (!activeSet || !activeSetId) return;
    // Replace group with its children at the same level
    const promote = (groups: ColumnHeaderGroup[]): ColumnHeaderGroup[] => {
      const result: ColumnHeaderGroup[] = [];
      for (const g of groups) {
        if (g.id === groupId) {
          if (g.children?.length) result.push(...g.children);
          // else just remove
        } else if (g.children?.length) {
          result.push({ ...g, children: promote(g.children) });
        } else {
          result.push(g);
        }
      }
      return result;
    };
    updateColumnHeaderSet(activeSetId, { headers: promote(activeSet.headers) });
  };

  const handleDeleteGroup = (groupId: string) => {
    if (!activeSetId) return;
    deleteHeaderGroup(activeSetId, groupId);
    message.success('Deleted');
  };

  const startEditGroup = (group: ColumnHeaderGroup) => {
    setEditingGroupId(group.id);
    setEditLabel(group.label);
    setEditVariable(group.variable || '');
    setEditingSetId(null);
  };

  const saveEditGroup = () => {
    if (!activeSetId || !editingGroupId) return;
    updateHeaderGroup(activeSetId, editingGroupId, {
      label: editLabel.trim(),
      variable: editVariable.trim() || undefined
    });
    setEditingGroupId(null);
    message.success('Saved');
  };

  // ==================== Render ====================

  return (
    <Card
      size="small"
      extra={
        <Button
          icon={<PlusOutlined />}
          size="small"
          type="primary"
          onClick={handleAddSet}
        >
          Add Set
        </Button>
      }
      title={
        <Space>
          <GroupOutlined />
          <span>Column Header Sets</span>
          <Tag color="blue">{columnHeaderSets.length}</Tag>
        </Space>
      }
    >
      {/* Set selector */}
      {columnHeaderSets.length === 0 ? (
        <div style={{ color: '#999', padding: 24, textAlign: 'center' }}>
          <Text type="secondary">No header sets defined. Create one to get started.</Text>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {columnHeaderSets.map(set => (
              <Tag
                color={activeSetId === set.id ? 'blue' : undefined}
                key={set.id}
                style={{ cursor: 'pointer', fontSize: 13, padding: '2px 8px' }}
                onClick={() => setActiveSetId(set.id)}
              >
                {set.name} ({countLeaves(set.headers)} cols)
              </Tag>
            ))}
          </div>

          {/* Active set header info */}
          {activeSet && (
            <div style={{ marginBottom: 12 }}>
              {editingSetId === activeSet.id ? (
                <Space size={4}>
                  <Input
                    autoFocus
                    size="small"
                    style={{ width: 200 }}
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    onPressEnter={saveEditSet}
                  />
                  <Button
                    icon={<SaveOutlined />}
                    size="small"
                    type="primary"
                    onClick={saveEditSet}
                  />
                  <Button
                    size="small"
                    onClick={() => setEditingSetId(null)}
                  >
                    Cancel
                  </Button>
                </Space>
              ) : (
                <Space>
                  <Text strong>{activeSet.name}</Text>
                  {activeSet.description && (
                    <Text
                      style={{ fontSize: 12 }}
                      type="secondary"
                    >
                      {activeSet.description}
                    </Text>
                  )}
                  <Button
                    icon={<EditOutlined />}
                    size="small"
                    type="text"
                    onClick={() => startEditSet(activeSet)}
                  />
                  <Popconfirm
                    title="Delete this header set?"
                    onConfirm={() => handleDeleteSet(activeSet.id)}
                  >
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                      type="text"
                    />
                  </Popconfirm>
                </Space>
              )}
            </div>
          )}

          {/* Group tree */}
          {activeSet && (
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {flatGroups.map(({ depth, group }) => (
                <div
                  key={group.id}
                  style={{
                    alignItems: 'center',
                    backgroundColor: group.children?.length ? '#f0f7ff' : depth % 2 === 0 ? '#fff' : '#fafafa',
                    border: '1px solid #f0f0f0',
                    borderRadius: 4,
                    display: 'flex',
                    gap: 6,
                    marginBottom: 2,
                    padding: '5px 8px',
                    paddingLeft: 8 + depth * 24
                  }}
                >
                  {group.children?.length ? (
                    <GroupOutlined style={{ color: '#1890ff', fontSize: 12 }} />
                  ) : (
                    <span style={{ display: 'inline-block', width: 12 }} />
                  )}

                  {editingGroupId === group.id ? (
                    <Space size={4}>
                      <Input
                        autoFocus
                        placeholder="Label"
                        size="small"
                        style={{ width: 120 }}
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                      />
                      <Input
                        placeholder="Variable"
                        size="small"
                        style={{ width: 100 }}
                        value={editVariable}
                        onChange={e => setEditVariable(e.target.value)}
                      />
                      <Button
                        icon={<SaveOutlined />}
                        size="small"
                        type="primary"
                        onClick={saveEditGroup}
                      />
                      <Button
                        size="small"
                        onClick={() => setEditingGroupId(null)}
                      >
                        Cancel
                      </Button>
                    </Space>
                  ) : (
                    <>
                      <Text style={{ flex: 1, fontSize: 12 }}>
                        {group.label}
                        {group.variable && (
                          <Text
                            style={{ fontSize: 11, marginLeft: 6 }}
                            type="secondary"
                          >
                            [{group.variable}]
                          </Text>
                        )}
                      </Text>
                      <Space size={2}>
                        {group.children?.length && (
                          <>
                            <Tooltip title="Add child column">
                              <Button
                                icon={<PlusOutlined />}
                                size="small"
                                type="text"
                                onClick={() => handleAddSubGroup(group.id)}
                              />
                            </Tooltip>
                            <Tooltip title="Ungroup children">
                              <Button
                                icon={<UngroupOutlined />}
                                size="small"
                                type="text"
                                onClick={() => handleUngroup(group.id)}
                              />
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title="Edit">
                          <Button
                            icon={<EditOutlined />}
                            size="small"
                            type="text"
                            onClick={() => startEditGroup(group)}
                          />
                        </Tooltip>
                        <Tooltip title="Delete">
                          <Button
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                            type="text"
                            onClick={() => handleDeleteGroup(group.id)}
                          />
                        </Tooltip>
                      </Space>
                    </>
                  )}
                </div>
              ))}
              {flatGroups.length === 0 && (
                <div style={{ color: '#999', padding: 16, textAlign: 'center' }}>
                  <Text type="secondary">No columns in this set</Text>
                </div>
              )}
            </div>
          )}

          {/* Add column button */}
          {activeSet && (
            <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 8, paddingTop: 8 }}>
              <Button
                icon={<PlusOutlined />}
                size="small"
                onClick={handleAddGroup}
              >
                Add Column
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
