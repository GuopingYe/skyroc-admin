/**
 * TFL Designer - Treatment Arm & Column Header Editor (Unified)
 *
 * Arms and column headers are ONE concept: every node in the tree is a column.
 * - Group nodes: collapsible parent headers (e.g., "Active" containing "Drug X 10mg", "Drug X 20mg")
 * - Leaf nodes: individual arm columns with label, variable, N, width, align
 *
 * The flat `arms` array is auto-synced from leaf nodes for backward compatibility.
 */
import { useState, useMemo, useCallback } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Divider,
  Tag,
  Tooltip,
  Typography,
  Select,
  message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  FolderOutlined,
  MinusSquareOutlined,
  PlusSquareOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  GroupOutlined,
  UngroupOutlined,
  SearchOutlined,
  DownOutlined,
} from '@ant-design/icons';
import type { TreatmentArmSet, TreatmentArm, ColumnHeaderGroup } from '../../types';
import { useStudyStore } from '../../stores';

const { Text } = Typography;

// ==================== Helpers ====================

/** Sync flat arms[] from leaf nodes of the headers tree */
function deriveArmsFromHeaders(headers: ColumnHeaderGroup[]): TreatmentArm[] {
  const arms: TreatmentArm[] = [];
  const collect = (groups: ColumnHeaderGroup[]) => {
    groups.forEach((g) => {
      if (g.children?.length) {
        collect(g.children);
      } else {
        arms.push({
          id: g.id,
          name: g.label,
          order: arms.length + 1,
          N: g.N,
          grouping: undefined,
        });
      }
    });
  };
  collect(headers);
  return arms;
}

/** Count leaf columns */
function countLeaves(groups: ColumnHeaderGroup[]): number {
  let n = 0;
  groups.forEach((g) => {
    if (g.children?.length) n += countLeaves(g.children);
    else n++;
  });
  return n;
}

/** Build flat list with depth for rendering, respecting expanded state */
function flattenTree(
  groups: ColumnHeaderGroup[],
  depth = 0,
  expandedGroups?: Set<string>,
): Array<{ group: ColumnHeaderGroup; depth: number }> {
  const result: Array<{ group: ColumnHeaderGroup; depth: number }> = [];
  groups.forEach((g) => {
    result.push({ group: g, depth });
    const isExpanded = g.children?.length && (!expandedGroups || expandedGroups.has(g.id));
    if (isExpanded) result.push(...flattenTree(g.children!, depth + 1, expandedGroups));
  });
  return result;
}

/** Recursively update a node in the tree */
function updateInTree(groups: ColumnHeaderGroup[], id: string, updates: Partial<ColumnHeaderGroup>): ColumnHeaderGroup[] {
  return groups.map((g) => {
    if (g.id === id) return { ...g, ...updates };
    if (g.children?.length) return { ...g, children: updateInTree(g.children, id, updates) };
    return g;
  });
}

/** Recursively delete a node from the tree */
function deleteFromTree(groups: ColumnHeaderGroup[], id: string): ColumnHeaderGroup[] {
  return groups
    .filter((g) => g.id !== id)
    .map((g) => (g.children?.length ? { ...g, children: deleteFromTree(g.children, id) } : g));
}

/** Add child to a specific group */
function addChildToTree(groups: ColumnHeaderGroup[], parentId: string, child: ColumnHeaderGroup): ColumnHeaderGroup[] {
  return groups.map((g) => {
    if (g.id === parentId) {
      return { ...g, children: [...(g.children || []), child] };
    }
    if (g.children?.length) return { ...g, children: addChildToTree(g.children, parentId, child) };
    return g;
  });
}

/** Promote children of a group (ungroup) */
function ungroupInTree(groups: ColumnHeaderGroup[], id: string): ColumnHeaderGroup[] {
  const result: ColumnHeaderGroup[] = [];
  for (const g of groups) {
    if (g.id === id) {
      if (g.children?.length) result.push(...g.children);
    } else if (g.children?.length) {
      result.push({ ...g, children: ungroupInTree(g.children, id) });
    } else {
      result.push(g);
    }
  }
  return result;
}

/** Move a node up or down among its siblings */
function moveInTree(groups: ColumnHeaderGroup[], id: string, direction: 'up' | 'down'): ColumnHeaderGroup[] {
  const result = [...groups];
  const idx = result.findIndex((g) => g.id === id);
  if (idx !== -1) {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx >= 0 && targetIdx < result.length) {
      [result[idx], result[targetIdx]] = [result[targetIdx], result[idx]];
      return result;
    }
  }
  // Search in children
  return result.map((g) => {
    if (g.children?.length) return { ...g, children: moveInTree(g.children, id, direction) };
    return g;
  });
}

// ==================== Inline Edit Row ====================

interface InlineEditProps {
  group: ColumnHeaderGroup;
  isGroup: boolean;
  depth: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onSave: (updates: Partial<ColumnHeaderGroup>) => void;
  onDelete: () => void;
  onAddChild?: () => void;
  onUngroup?: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onInsertAfterColumn: () => void;
  onInsertAfterGroup: () => void;
}

function InlineEditRow({
  group,
  isGroup,
  depth,
  isExpanded,
  onToggleExpand,
  onSave,
  onDelete,
  onAddChild,
  onUngroup,
  onMoveUp,
  onMoveDown,
  onInsertAfterColumn,
  onInsertAfterGroup,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(group.label);
  const [variable, setVariable] = useState(group.variable || '');
  const [n, setN] = useState<string | number | undefined>(group.N);
  const [width, setWidth] = useState<number | undefined>(group.width);
  const [align, setAlign] = useState<string>(group.align || 'center');

  const handleSave = () => {
    if (!label.trim()) {
      message.warning('Label is required');
      return;
    }
    onSave({
      label: label.trim(),
      variable: variable.trim() || undefined,
      N: n !== undefined && n !== '' ? n : undefined,
      width: width || undefined,
      align: (align as ColumnHeaderGroup['align']) || undefined,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setLabel(group.label);
    setVariable(group.variable || '');
    setN(group.N);
    setWidth(group.width);
    setAlign(group.align || 'center');
    setEditing(false);
  };

  const handleStartEdit = () => {
    setLabel(group.label);
    setVariable(group.variable || '');
    setN(group.N);
    setWidth(group.width);
    setAlign(group.align || 'center');
    setEditing(true);
  };

  // Render in view mode
  if (!editing) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 8px',
          paddingLeft: 8 + depth * 20,
          backgroundColor: isGroup ? '#f0f7ff' : depth % 2 === 0 ? '#fff' : '#fafafa',
          borderBottom: '1px solid #f5f5f5',
          transition: 'background-color 0.15s',
        }}
      >
        {/* Expand/collapse for groups */}
        {isGroup ? (
          <Button
            type="text"
            size="small"
            icon={isExpanded ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
            onClick={onToggleExpand}
            style={{ padding: 0, width: 20, color: '#1890ff' }}
          />
        ) : (
          <span style={{ width: 20, display: 'inline-block' }} />
        )}

        {/* Icon */}
        {isGroup ? (
          <FolderOutlined style={{ color: '#1890ff', fontSize: 13 }} />
        ) : (
          <span style={{ width: 13, display: 'inline-block' }} />
        )}

        {/* Label */}
        <Text style={{ flex: 1, fontSize: 12, fontWeight: isGroup ? 600 : 400 }}>
          {group.label}
          {group.variable && (
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
              [{group.variable}]
            </Text>
          )}
          {group.N !== undefined && group.N !== '' && (
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
              N={group.N}
            </Text>
          )}
        </Text>

        {/* Action buttons */}
        <Space size={1}>
          <Tooltip title="Insert Column Below">
            <Button type="text" size="small" icon={<PlusOutlined />} onClick={onInsertAfterColumn} />
          </Tooltip>
          <Tooltip title="Insert Group Below">
            <Button type="text" size="small" icon={<GroupOutlined />} onClick={onInsertAfterGroup} />
          </Tooltip>
          {isGroup && (
            <>
              <Tooltip title="Add Column Inside">
                <Button type="text" size="small" icon={<FolderOutlined />} style={{ color: '#52c41a' }} onClick={onAddChild} />
              </Tooltip>
              <Tooltip title="Ungroup">
                <Button type="text" size="small" icon={<UngroupOutlined />} onClick={onUngroup} />
              </Tooltip>
            </>
          )}
          <Tooltip title="Move Up">
            <Button type="text" size="small" icon={<ArrowUpOutlined />} onClick={onMoveUp} />
          </Tooltip>
          <Tooltip title="Move Down">
            <Button type="text" size="small" icon={<ArrowDownOutlined />} onClick={onMoveDown} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={handleStartEdit} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={onDelete} />
          </Tooltip>
        </Space>
      </div>
    );
  }

  // Render in edit mode
  return (
    <div
      style={{
        padding: '6px 8px',
        paddingLeft: 8 + depth * 20,
        backgroundColor: '#e6f7ff',
        borderBottom: '1px solid #91caff',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {/* Label */}
        <Input
          size="small"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label"
          style={{ width: 130 }}
          autoFocus
        />

        {/* Variable (leaf only) */}
        {!isGroup && (
          <Input
            size="small"
            value={variable}
            onChange={(e) => setVariable(e.target.value)}
            placeholder="Variable"
            style={{ width: 110, fontFamily: 'monospace' }}
          />
        )}

        {/* N (leaf only) */}
        {!isGroup && (
          <Input
            size="small"
            value={n as string}
            onChange={(e) => setN(e.target.value || undefined)}
            placeholder="N"
            style={{ width: 60 }}
          />
        )}

        {/* Width (leaf only) */}
        {!isGroup && (
          <InputNumber
            size="small"
            value={width}
            onChange={(v) => setWidth(v || undefined)}
            placeholder="Width"
            min={40}
            max={400}
            style={{ width: 80 }}
          />
        )}

        {/* Align (leaf only) */}
        {!isGroup && (
          <Select
            size="small"
            value={align}
            onChange={setAlign}
            style={{ width: 80 }}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
            ]}
          />
        )}

        {/* Save / Cancel */}
        <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSave} />
        <Button size="small" onClick={handleCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export default function TreatmentArmEditor() {
  const treatmentArmSets = useStudyStore((s) => s.treatmentArmSets);
  const addTreatmentArmSet = useStudyStore((s) => s.addTreatmentArmSet);
  const updateTreatmentArmSet = useStudyStore((s) => s.updateTreatmentArmSet);
  const deleteTreatmentArmSet = useStudyStore((s) => s.deleteTreatmentArmSet);

  const [form] = Form.useForm();
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState('');

  // ==================== Set-level handlers ====================

  const handleAddSet = () => {
    addTreatmentArmSet({
      name: 'New Arm Set',
      arms: [{ id: `arm_${Date.now()}`, name: 'New Column', order: 1 }],
    });
    message.success('Arm set added');
  };

  const startEditSet = (id: string) => {
    setEditingSetId(id);
  };

  const cancelEditSet = () => {
    setEditingSetId(null);
    form.resetFields();
  };

  const saveEditSet = () => {
    if (!editingSetId) return;
    form.validateFields().then((values) => {
      updateTreatmentArmSet(editingSetId, { name: values.name });
      setEditingSetId(null);
      form.resetFields();
      message.success('Saved');
    });
  };

  const handleDeleteSet = (id: string) => {
    deleteTreatmentArmSet(id);
    message.success('Deleted');
  };

  // ==================== Tree-level handlers ====================

  /** Get headers for a set, auto-deriving from arms if missing */
  const getHeaders = useCallback(
    (set: TreatmentArmSet): ColumnHeaderGroup[] => {
      if (set.headers?.length) return set.headers;
      // Auto-derive flat list from arms
      return set.arms.map((arm) => ({
        id: arm.id,
        label: arm.name,
        variable: undefined,
        N: arm.N,
      }));
    },
    [],
  );

  /** Update headers and auto-sync arms */
  const saveHeaders = useCallback(
    (setId: string, headers: ColumnHeaderGroup[]) => {
      const arms = deriveArmsFromHeaders(headers);
      updateTreatmentArmSet(setId, { headers, arms });
    },
    [updateTreatmentArmSet],
  );

  const handleUpdateNode = useCallback(
    (setId: string, headers: ColumnHeaderGroup[], nodeId: string, updates: Partial<ColumnHeaderGroup>) => {
      const newHeaders = updateInTree(headers, nodeId, updates);
      saveHeaders(setId, newHeaders);
    },
    [saveHeaders],
  );

  const handleDeleteNode = useCallback(
    (setId: string, headers: ColumnHeaderGroup[], nodeId: string) => {
      const newHeaders = deleteFromTree(headers, nodeId);
      saveHeaders(setId, newHeaders);
      message.success('Deleted');
    },
    [saveHeaders],
  );

  const handleAddColumn = useCallback(
    (setId: string, headers: ColumnHeaderGroup[]) => {
      const newHeaders = [
        ...headers,
        { id: `col_${Date.now()}`, label: 'New Column' },
      ];
      saveHeaders(setId, newHeaders);
      message.success('Column added');
    },
    [saveHeaders],
  );

  const handleAddGroup = useCallback(
    (setId: string, headers: ColumnHeaderGroup[]) => {
      const newHeaders = [
        ...headers,
        {
          id: `grp_${Date.now()}`,
          label: 'New Group',
          children: [{ id: `col_${Date.now()}_a`, label: 'Column 1' }],
        },
      ];
      saveHeaders(setId, newHeaders);
      message.success('Group added');
    },
    [saveHeaders],
  );

  const handleAddChild = useCallback(
    (setId: string, headers: ColumnHeaderGroup[], parentId: string) => {
      const child: ColumnHeaderGroup = { id: `col_${Date.now()}`, label: 'New Column' };
      const newHeaders = addChildToTree(headers, parentId, child);
      saveHeaders(setId, newHeaders);
      // Auto-expand parent
      setExpandedGroups((prev) => new Set([...prev, parentId]));
      message.success('Column added');
    },
    [saveHeaders],
  );

  const handleUngroup = useCallback(
    (setId: string, headers: ColumnHeaderGroup[], groupId: string) => {
      const newHeaders = ungroupInTree(headers, groupId);
      saveHeaders(setId, newHeaders);
      message.success('Ungrouped');
    },
    [saveHeaders],
  );

  const handleMove = useCallback(
    (setId: string, headers: ColumnHeaderGroup[], nodeId: string, direction: 'up' | 'down') => {
      const newHeaders = moveInTree(headers, nodeId, direction);
      saveHeaders(setId, newHeaders);
    },
    [saveHeaders],
  );

  const toggleExpand = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Filtered sets
  const filteredSets = useMemo(
    () => filterText
      ? treatmentArmSets.filter((s) => s.name.toLowerCase().includes(filterText.toLowerCase()))
      : treatmentArmSets,
    [treatmentArmSets, filterText],
  );

  // Total leaf count across all sets
  const totalColumns = useMemo(
    () => treatmentArmSets.reduce((sum, s) => sum + countLeaves(getHeaders(s)), 0),
    [treatmentArmSets, getHeaders],
  );

  // Set expand/collapse
  const toggleSetExpand = (setId: string) => {
    setExpandedSets((prev) => {
      const next = new Set(prev);
      if (next.has(setId)) next.delete(setId);
      else next.add(setId);
      return next;
    });
  };
  const expandAll = () => setExpandedSets(new Set(treatmentArmSets.map((s) => s.id)));
  const collapseAll = () => setExpandedSets(new Set());

  // Insert column/group after a specific node at the same level
  const handleInsertAfter = useCallback(
    (setId: string, headers: ColumnHeaderGroup[], afterId: string, type: 'column' | 'group') => {
      let newHeaders = [...headers];
      if (type === 'group') {
        const idx = newHeaders.findIndex((g) => g.id === afterId);
        if (idx !== -1) {
          const child: ColumnHeaderGroup = {
            id: `grp_${Date.now()}`,
            label: 'New Group',
            children: [{ id: `col_${Date.now()}`, label: 'Column 1' }],
          };
          newHeaders.splice(idx + 1, 0, child);
        }
      } else {
        // Find the parent and insert after the sibling
        const insertAt = (list: ColumnHeaderGroup[], targetId: string): boolean => {
          for (let i = 0; i < list.length; i++) {
            if (list[i].id === targetId) {
              list.splice(i + 1, 0, { id: `col_${Date.now()}`, label: 'New Column' });
              return true;
            }
            if (list[i].children?.length && insertAt(list[i].children!, targetId)) return true;
          }
          return false;
        };
        insertAt(newHeaders, afterId);
      }
      saveHeaders(setId, newHeaders);
      message.success(`${type === 'group' ? 'Group' : 'Column'} added`);
    },
    [saveHeaders],
  );

  return (
    <Card
      title={
        <Space size={6}>
          <span>Header Styles</span>
          <Tag color="blue">{treatmentArmSets.length} sets</Tag>
          <Tag color="green">{totalColumns} columns</Tag>
          {treatmentArmSets.length > 2 && (
            <Select
              size="small"
              value={filterText || undefined}
              placeholder="Filter..."
              allowClear
              style={{ width: 140 }}
              onChange={(v) => setFilterText(v || '')}
              options={treatmentArmSets.map((s) => ({
                value: s.name,
                label: s.name,
              }))}
              popupMatchSelectWidth={false}
            />
          )}
          {treatmentArmSets.length > 2 && (
            <>
              <Tooltip title="Expand All"><Button type="text" size="small" onClick={expandAll} style={{ padding: '0 4px' }}><DownOutlined style={{ fontSize: 10 }} /></Button></Tooltip>
              <Tooltip title="Collapse All"><Button type="text" size="small" onClick={collapseAll} style={{ padding: '0 4px' }}><DownOutlined style={{ fontSize: 10, transform: 'rotate(-90deg)' }} /></Button></Tooltip>
            </>
          )}
        </Space>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSet} size="small">
          Add Set
        </Button>
      }
      size="small"
    >
      <div style={{ maxHeight: 600, overflowY: 'auto' }}>

        {filteredSets.map((set) => {
          const headers = getHeaders(set);
          const leaves = countLeaves(headers);
          const flatNodes = flattenTree(headers, 0, expandedGroups);
          const isSetExpanded = expandedSets.has(set.id);

          return (
            <div key={set.id} style={{ marginBottom: 8 }}>
              {/* Set Header — always visible, click to expand/collapse */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 10px',
                  backgroundColor: '#e6f7ff',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  marginBottom: isSetExpanded ? 4 : 0,
                  cursor: 'pointer',
                }}
                onClick={() => toggleSetExpand(set.id)}
              >
                <DownOutlined
                  style={{
                    fontSize: 10,
                    marginRight: 8,
                    transition: 'transform 0.15s',
                    transform: isSetExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                  }}
                />
                {editingSetId === set.id ? (
                  <Form
                    form={form}
                    layout="inline"
                    initialValues={{ name: set.name }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Form.Item name="name" rules={[{ required: true, message: 'Required' }]} style={{ margin: 0 }}>
                      <Input size="small" style={{ width: 200 }} autoFocus onClick={(e) => e.stopPropagation()} />
                    </Form.Item>
                    <Space size="small">
                      <Button type="primary" size="small" icon={<SaveOutlined />} onClick={(e) => { e.stopPropagation(); saveEditSet(); }}>
                        Save
                      </Button>
                      <Button size="small" onClick={(e) => { e.stopPropagation(); cancelEditSet(); }}>
                        Cancel
                      </Button>
                    </Space>
                  </Form>
                ) : (
                  <>
                    <Text strong style={{ flex: 1 }}>{set.name}</Text>
                    <Tag color="blue" style={{ marginRight: 4 }}>{leaves} cols</Tag>
                    <Space size={2} onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Edit name">
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={(e) => { e.stopPropagation(); startEditSet(set.id); }}
                        />
                      </Tooltip>
                      <Tooltip title="Delete set">
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => { e.stopPropagation(); handleDeleteSet(set.id); }}
                        />
                      </Tooltip>
                    </Space>
                  </>
                )}
              </div>

              {/* Tree — only shown when expanded */}
              {isSetExpanded && (
                <div
                  style={{
                    border: '1px solid #f0f0f0',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  {flatNodes.map(({ group, depth }) => {
                    const isGroup = !!group.children?.length;
                    const isExpanded = expandedGroups.has(group.id);

                    return (
                      <InlineEditRow
                        key={group.id}
                        group={group}
                        isGroup={isGroup}
                        depth={depth}
                        isExpanded={isExpanded}
                        onToggleExpand={() => toggleExpand(group.id)}
                        onSave={(updates) => handleUpdateNode(set.id, headers, group.id, updates)}
                        onDelete={() => handleDeleteNode(set.id, headers, group.id)}
                        onAddChild={() => handleAddChild(set.id, headers, group.id)}
                        onUngroup={isGroup ? () => handleUngroup(set.id, headers, group.id) : undefined}
                        onMoveUp={() => handleMove(set.id, headers, group.id, 'up')}
                        onMoveDown={() => handleMove(set.id, headers, group.id, 'down')}
                        onInsertAfterColumn={() => handleInsertAfter(set.id, headers, group.id, 'column')}
                        onInsertAfterGroup={() => handleInsertAfter(set.id, headers, group.id, 'group')}
                      />
                    );
                  })}

                  {flatNodes.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 16, color: '#999' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>No columns defined</Text>
                    </div>
                  )}

                  {/* Add buttons at bottom — for adding to root level */}
                  <div style={{ padding: '6px 8px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 6 }}>
                    <Tooltip title="Add a new column at the end">
                      <Button size="small" icon={<PlusOutlined />} onClick={() => handleAddColumn(set.id, headers)}>
                        + Column (end)
                      </Button>
                    </Tooltip>
                    <Tooltip title="Add a new group at the end">
                      <Button size="small" icon={<GroupOutlined />} onClick={() => handleAddGroup(set.id, headers)}>
                        + Group (end)
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredSets.length === 0 && treatmentArmSets.length > 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
            <Text type="secondary">No matching sets</Text>
          </div>
        )}

        {treatmentArmSets.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>
            <div>No column header sets defined</div>
            <div style={{ marginTop: 8 }}>
              <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddSet}>
                Add First Set
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
