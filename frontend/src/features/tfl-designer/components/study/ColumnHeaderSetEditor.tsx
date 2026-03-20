/**
 * TFL Builder - Column Header Set Editor
 *
 * Study-level editor for managing reusable column header groupings.
 * Each set defines a nested column structure (e.g. SOC/PT, Visit-based)
 * that listings can reference via columnHeaderSetId.
 */
import { useState, useMemo } from 'react';
import {
  Card,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Tooltip,
  Popconfirm,
  Typography,
  message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  GroupOutlined,
  UngroupOutlined,
} from '@ant-design/icons';
import type { ColumnHeaderSet, ColumnHeaderGroup } from '../../types';
import { useStudyStore } from '../../stores';

const { Text } = Typography;

// ==================== Helpers ====================

interface FlatGroup {
  group: ColumnHeaderGroup;
  depth: number;
  parentId: string | null;
}

function flattenGroups(groups: ColumnHeaderGroup[], depth = 0, parentId: string | null = null): FlatGroup[] {
  const result: FlatGroup[] = [];
  groups.forEach((g) => {
    result.push({ group: g, depth, parentId });
    if (g.children?.length) {
      result.push(...flattenGroups(g.children, depth + 1, g.id));
    }
  });
  return result;
}

function countLeaves(groups: ColumnHeaderGroup[]): number {
  let n = 0;
  groups.forEach((g) => {
    if (g.children?.length) n += countLeaves(g.children);
    else n++;
  });
  return n;
}

// ==================== Component ====================

export default function ColumnHeaderSetEditor() {
  const columnHeaderSets = useStudyStore((s) => s.columnHeaderSets);
  const addColumnHeaderSet = useStudyStore((s) => s.addColumnHeaderSet);
  const updateColumnHeaderSet = useStudyStore((s) => s.updateColumnHeaderSet);
  const deleteColumnHeaderSet = useStudyStore((s) => s.deleteColumnHeaderSet);
  const addHeaderGroup = useStudyStore((s) => s.addHeaderGroup);
  const updateHeaderGroup = useStudyStore((s) => s.updateHeaderGroup);
  const deleteHeaderGroup = useStudyStore((s) => s.deleteHeaderGroup);
  const addChildGroup = useStudyStore((s) => s.addChildGroup);

  const [activeSetId, setActiveSetId] = useState<string | null>(
    columnHeaderSets[0]?.id || null,
  );

  // Edit states
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editVariable, setEditVariable] = useState('');

  const activeSet = columnHeaderSets.find((s) => s.id === activeSetId);
  const flatGroups = useMemo(() => (activeSet ? flattenGroups(activeSet.headers) : []), [activeSet]);

  // ==================== Set handlers ====================

  const handleAddSet = () => {
    addColumnHeaderSet({ name: 'New Header Set', description: '', headers: [] });
    message.success('Header set created');
  };

  const handleDeleteSet = (id: string) => {
    deleteColumnHeaderSet(id);
    if (activeSetId === id) setActiveSetId(columnHeaderSets.find((s) => s.id !== id)?.id || null);
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
      variable: editVariable.trim() || undefined,
    });
    setEditingGroupId(null);
    message.success('Saved');
  };

  // ==================== Render ====================

  return (
    <Card
      title={
        <Space>
          <GroupOutlined />
          <span>Column Header Sets</span>
          <Tag color="blue">{columnHeaderSets.length}</Tag>
        </Space>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSet} size="small">
          Add Set
        </Button>
      }
      size="small"
    >
      {/* Set selector */}
      {columnHeaderSets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
          <Text type="secondary">No header sets defined. Create one to get started.</Text>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {columnHeaderSets.map((set) => (
              <Tag
                key={set.id}
                color={activeSetId === set.id ? 'blue' : undefined}
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
                    size="small"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onPressEnter={saveEditSet}
                    style={{ width: 200 }}
                    autoFocus
                  />
                  <Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveEditSet} />
                  <Button size="small" onClick={() => setEditingSetId(null)}>Cancel</Button>
                </Space>
              ) : (
                <Space>
                  <Text strong>{activeSet.name}</Text>
                  {activeSet.description && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{activeSet.description}</Text>
                  )}
                  <Button size="small" type="text" icon={<EditOutlined />} onClick={() => startEditSet(activeSet)} />
                  <Popconfirm title="Delete this header set?" onConfirm={() => handleDeleteSet(activeSet.id)}>
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              )}
            </div>
          )}

          {/* Group tree */}
          {activeSet && (
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {flatGroups.map(({ group, depth }) => (
                <div
                  key={group.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 8px',
                    paddingLeft: 8 + depth * 24,
                    backgroundColor: group.children?.length ? '#f0f7ff' : depth % 2 === 0 ? '#fff' : '#fafafa',
                    border: '1px solid #f0f0f0',
                    borderRadius: 4,
                    marginBottom: 2,
                  }}
                >
                  {group.children?.length ? (
                    <GroupOutlined style={{ color: '#1890ff', fontSize: 12 }} />
                  ) : (
                    <span style={{ width: 12, display: 'inline-block' }} />
                  )}

                  {editingGroupId === group.id ? (
                    <Space size={4}>
                      <Input
                        size="small"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        placeholder="Label"
                        style={{ width: 120 }}
                        autoFocus
                      />
                      <Input
                        size="small"
                        value={editVariable}
                        onChange={(e) => setEditVariable(e.target.value)}
                        placeholder="Variable"
                        style={{ width: 100 }}
                      />
                      <Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveEditGroup} />
                      <Button size="small" onClick={() => setEditingGroupId(null)}>Cancel</Button>
                    </Space>
                  ) : (
                    <>
                      <Text style={{ flex: 1, fontSize: 12 }}>
                        {group.label}
                        {group.variable && (
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
                            [{group.variable}]
                          </Text>
                        )}
                      </Text>
                      <Space size={2}>
                        {group.children?.length && (
                          <>
                            <Tooltip title="Add child column">
                              <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => handleAddSubGroup(group.id)} />
                            </Tooltip>
                            <Tooltip title="Ungroup children">
                              <Button type="text" size="small" icon={<UngroupOutlined />} onClick={() => handleUngroup(group.id)} />
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title="Edit">
                          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => startEditGroup(group)} />
                        </Tooltip>
                        <Tooltip title="Delete">
                          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteGroup(group.id)} />
                        </Tooltip>
                      </Space>
                    </>
                  )}
                </div>
              ))}
              {flatGroups.length === 0 && (
                <div style={{ textAlign: 'center', padding: 16, color: '#999' }}>
                  <Text type="secondary">No columns in this set</Text>
                </div>
              )}
            </div>
          )}

          {/* Add column button */}
          {activeSet && (
            <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
              <Button size="small" icon={<PlusOutlined />} onClick={handleAddGroup}>
                Add Column
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
