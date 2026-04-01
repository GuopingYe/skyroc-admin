/**
 * TFL Designer - Treatment Arm & Column Header Editor (Unified)
 *
 * Arms and column headers are ONE concept: every node in the tree is a column.
 *
 * - Group nodes: collapsible parent headers (e.g., "Active" containing "Drug X 10mg", "Drug X 20mg")
 * - Leaf nodes: individual arm columns with label, variable, N, width, align
 *
 * The flat `arms` array is auto-synced from leaf nodes for backward compatibility.
 */
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  FolderOutlined,
  GroupOutlined,
  MinusSquareOutlined,
  PlusOutlined,
  PlusSquareOutlined,
  SaveOutlined,
  SearchOutlined,
  UngroupOutlined
} from '@ant-design/icons';
import {
  Button,
  Card,
  Divider,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  message
} from 'antd';
import { useCallback, useMemo, useState } from 'react';

import { useStudyStore } from '../../stores';
import type { ColumnHeaderGroup, TreatmentArm, TreatmentArmSet } from '../../types';
import {
  addChildToTree as addChildToSharedTree,
  countLeaves,
  deleteFromTree as deleteFromSharedTree,
  moveInTree as moveInSharedTree,
  ungroupInTree as ungroupInSharedTree,
  updateInTree as updateInSharedTree
} from '../../utils/treeUtils';

const { Text } = Typography;

// ==================== Helpers ====================

/** Sync flat arms[] from leaf nodes of the headers tree */
function deriveArmsFromHeaders(headers: ColumnHeaderGroup[]): TreatmentArm[] {
  const arms: TreatmentArm[] = [];
  const collect = (groups: ColumnHeaderGroup[]) => {
    groups.forEach(g => {
      if (g.children?.length) {
        collect(g.children);
      } else {
        arms.push({
          grouping: undefined,
          id: g.id,
          N: g.N,
          name: g.label,
          order: arms.length + 1
        });
      }
    });
  };
  collect(headers);
  return arms;
}

/** Build flat list with depth for rendering, respecting expanded state */
function flattenTree(
  groups: ColumnHeaderGroup[],
  depth = 0,
  expandedGroups?: Set<string>
): Array<{ depth: number; group: ColumnHeaderGroup }> {
  const result: Array<{ depth: number; group: ColumnHeaderGroup }> = [];
  groups.forEach(g => {
    result.push({ depth, group: g });
    const isExpanded = g.children?.length && (!expandedGroups || expandedGroups.has(g.id));
    if (isExpanded) result.push(...flattenTree(g.children!, depth + 1, expandedGroups));
  });
  return result;
}

/** Tree operations delegated to shared treeUtils */
const updateInTree = updateInSharedTree as <T extends ColumnHeaderGroup>(nodes: T[], id: string, updates: Partial<T>) => T[];
const deleteFromTree = deleteFromSharedTree as <T extends ColumnHeaderGroup>(nodes: T[], id: string) => T[];
const addChildToTree = addChildToSharedTree as <T extends ColumnHeaderGroup>(nodes: T[], parentId: string, child: T) => T[];
const ungroupInTree = ungroupInSharedTree as <T extends ColumnHeaderGroup>(nodes: T[], id: string) => T[];
const moveInTree = moveInSharedTree as <T extends ColumnHeaderGroup>(nodes: T[], id: string, direction: 'down' | 'up') => T[];

// ==================== Inline Edit Row ====================

interface InlineEditProps {
  depth: number;
  group: ColumnHeaderGroup;
  isExpanded?: boolean;
  isGroup: boolean;
  onAddChild?: () => void;
  onDelete: () => void;
  onInsertAfterColumn: () => void;
  onInsertAfterGroup: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onSave: (updates: Partial<ColumnHeaderGroup>) => void;
  onToggleExpand?: () => void;
  onUngroup?: () => void;
}

function InlineEditRow({
  depth,
  group,
  isExpanded,
  isGroup,
  onAddChild,
  onDelete,
  onInsertAfterColumn,
  onInsertAfterGroup,
  onMoveDown,
  onMoveUp,
  onSave,
  onToggleExpand,
  onUngroup
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
      align: (align as ColumnHeaderGroup['align']) || undefined,
      label: label.trim(),
      N: n !== undefined && n !== '' ? n : undefined,
      variable: variable.trim() || undefined,
      width: width || undefined
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
          alignItems: 'center',
          backgroundColor: isGroup ? '#f0f7ff' : depth % 2 === 0 ? '#fff' : '#fafafa',
          borderBottom: '1px solid #f5f5f5',
          display: 'flex',
          gap: 6,
          padding: '5px 8px',
          paddingLeft: 8 + depth * 20,
          transition: 'background-color 0.15s'
        }}
      >
        {/* Expand/collapse for groups */}
        {isGroup ? (
          <Button
            icon={isExpanded ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
            size="small"
            style={{ color: '#1890ff', padding: 0, width: 20 }}
            type="text"
            onClick={onToggleExpand}
          />
        ) : (
          <span style={{ display: 'inline-block', width: 20 }} />
        )}

        {/* Icon */}
        {isGroup ? (
          <FolderOutlined style={{ color: '#1890ff', fontSize: 13 }} />
        ) : (
          <span style={{ display: 'inline-block', width: 13 }} />
        )}

        {/* Label */}
        <Text style={{ flex: 1, fontSize: 12, fontWeight: isGroup ? 600 : 400 }}>
          {group.label}
          {group.variable && (
            <Text
              style={{ fontSize: 11, marginLeft: 6 }}
              type="secondary"
            >
              [{group.variable}]
            </Text>
          )}
          {group.N !== undefined && group.N !== '' && (
            <Text
              style={{ fontSize: 11, marginLeft: 6 }}
              type="secondary"
            >
              N={group.N}
            </Text>
          )}
        </Text>

        {/* Action buttons */}
        <Space size={1}>
          <Tooltip title="Insert Column Below">
            <Button
              icon={<PlusOutlined />}
              size="small"
              type="text"
              onClick={onInsertAfterColumn}
            />
          </Tooltip>
          <Tooltip title="Insert Group Below">
            <Button
              icon={<GroupOutlined />}
              size="small"
              type="text"
              onClick={onInsertAfterGroup}
            />
          </Tooltip>
          {isGroup && (
            <>
              <Tooltip title="Add Column Inside">
                <Button
                  icon={<FolderOutlined />}
                  size="small"
                  style={{ color: '#52c41a' }}
                  type="text"
                  onClick={onAddChild}
                />
              </Tooltip>
              <Tooltip title="Ungroup">
                <Button
                  icon={<UngroupOutlined />}
                  size="small"
                  type="text"
                  onClick={onUngroup}
                />
              </Tooltip>
            </>
          )}
          <Tooltip title="Move Up">
            <Button
              icon={<ArrowUpOutlined />}
              size="small"
              type="text"
              onClick={onMoveUp}
            />
          </Tooltip>
          <Tooltip title="Move Down">
            <Button
              icon={<ArrowDownOutlined />}
              size="small"
              type="text"
              onClick={onMoveDown}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              icon={<EditOutlined />}
              size="small"
              type="text"
              onClick={handleStartEdit}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
              type="text"
              onClick={onDelete}
            />
          </Tooltip>
        </Space>
      </div>
    );
  }

  // Render in edit mode
  return (
    <div
      style={{
        backgroundColor: '#e6f7ff',
        borderBottom: '1px solid #91caff',
        padding: '6px 8px',
        paddingLeft: 8 + depth * 20
      }}
    >
      <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {/* Label */}
        <Input
          autoFocus
          placeholder="Label"
          size="small"
          style={{ width: 130 }}
          value={label}
          onChange={e => setLabel(e.target.value)}
        />

        {/* Variable (leaf only) */}
        {!isGroup && (
          <Input
            placeholder="Variable"
            size="small"
            style={{ fontFamily: 'monospace', width: 110 }}
            value={variable}
            onChange={e => setVariable(e.target.value)}
          />
        )}

        {/* N (leaf only) */}
        {!isGroup && (
          <Input
            placeholder="N"
            size="small"
            style={{ width: 60 }}
            value={n as string}
            onChange={e => setN(e.target.value || undefined)}
          />
        )}

        {/* Width (leaf only) */}
        {!isGroup && (
          <InputNumber
            max={400}
            min={40}
            placeholder="Width"
            size="small"
            style={{ width: 80 }}
            value={width}
            onChange={v => setWidth(v || undefined)}
          />
        )}

        {/* Align (leaf only) */}
        {!isGroup && (
          <Select
            size="small"
            style={{ width: 80 }}
            value={align}
            options={[
              { label: 'Left', value: 'left' },
              { label: 'Center', value: 'center' },
              { label: 'Right', value: 'right' }
            ]}
            onChange={setAlign}
          />
        )}

        {/* Save / Cancel */}
        <Button
          icon={<SaveOutlined />}
          size="small"
          type="primary"
          onClick={handleSave}
        />
        <Button
          size="small"
          onClick={handleCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export default function TreatmentArmEditor() {
  const treatmentArmSets = useStudyStore(s => s.treatmentArmSets);
  const addTreatmentArmSet = useStudyStore(s => s.addTreatmentArmSet);
  const updateTreatmentArmSet = useStudyStore(s => s.updateTreatmentArmSet);
  const deleteTreatmentArmSet = useStudyStore(s => s.deleteTreatmentArmSet);

  const [form] = Form.useForm();
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState('');

  // ==================== Set-level handlers ====================

  const handleAddSet = () => {
    addTreatmentArmSet({
      arms: [{ id: `arm_${Date.now()}`, name: 'New Column', order: 1 }],
      name: 'New Arm Set'
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
    form.validateFields().then(values => {
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
  const getHeaders = useCallback((set: TreatmentArmSet): ColumnHeaderGroup[] => {
    if (set.headers?.length) return set.headers;
    // Auto-derive flat list from arms
    return set.arms.map(arm => ({
      id: arm.id,
      label: arm.name,
      N: arm.N,
      variable: undefined
    }));
  }, []);

  /** Update headers and auto-sync arms */
  const saveHeaders = useCallback(
    (setId: string, headers: ColumnHeaderGroup[]) => {
      const arms = deriveArmsFromHeaders(headers);
      updateTreatmentArmSet(setId, { arms, headers });
    },
    [updateTreatmentArmSet]
  );

  const handleUpdateNode = useCallback(
    (setId: string, headers: ColumnHeaderGroup[], nodeId: string, updates: Partial<ColumnHeaderGroup>) => {
      const newHeaders = updateInTree(headers, nodeId, updates);
      saveHeaders(setId, newHeaders);
    },
    [saveHeaders]
  );

  const handleDeleteNode = useCallback(
    (setId: string, headers: ColumnHeaderGroup[], nodeId: string) => {
      const newHeaders = deleteFromTree(headers, nodeId);
      saveHeaders(setId, newHeaders);
      message.success('Deleted');
    },
    [saveHeaders]
  );

  const handleAddColumn = useCallback(
    (setId: string, headers: ColumnHeaderGroup[]) => {
      const newHeaders = [...headers, { id: `col_${Date.now()}`, label: 'New Column' }];
      saveHeaders(setId, newHeaders);
      message.success('Column added');
    },
    [saveHeaders]
  );

  const handleAddGroup = useCallback(
    (setId: string, headers: ColumnHeaderGroup[]) => {
      const newHeaders = [
        ...headers,
        {
          children: [{ id: `col_${Date.now()}_a`, label: 'Column 1' }],
          id: `grp_${Date.now()}`,
          label: 'New Group'
        }
      ];
      saveHeaders(setId, newHeaders);
      message.success('Group added');
    },
    [saveHeaders]
  );

  const handleAddChild = useCallback(
    (setId: string, headers: ColumnHeaderGroup[], parentId: string) => {
      const child: ColumnHeaderGroup = { id: `col_${Date.now()}`, label: 'New Column' };
      const newHeaders = addChildToTree(headers, parentId, child);
      saveHeaders(setId, newHeaders);
      // Auto-expand parent
      setExpandedGroups(prev => new Set([...prev, parentId]));
      message.success('Column added');
    },
    [saveHeaders]
  );

  const handleUngroup = useCallback(
    (setId: string, headers: ColumnHeaderGroup[], groupId: string) => {
      const newHeaders = ungroupInTree(headers, groupId);
      saveHeaders(setId, newHeaders);
      message.success('Ungrouped');
    },
    [saveHeaders]
  );

  const handleMove = useCallback(
    (setId: string, headers: ColumnHeaderGroup[], nodeId: string, direction: 'down' | 'up') => {
      const newHeaders = moveInTree(headers, nodeId, direction);
      saveHeaders(setId, newHeaders);
    },
    [saveHeaders]
  );

  const toggleExpand = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Filtered sets
  const filteredSets = useMemo(
    () =>
      filterText
        ? treatmentArmSets.filter(s => s.name.toLowerCase().includes(filterText.toLowerCase()))
        : treatmentArmSets,
    [treatmentArmSets, filterText]
  );

  // Total leaf count across all sets
  const totalColumns = useMemo(
    () => treatmentArmSets.reduce((sum, s) => sum + countLeaves(getHeaders(s)), 0),
    [treatmentArmSets, getHeaders]
  );

  // Set expand/collapse
  const toggleSetExpand = (setId: string) => {
    setExpandedSets(prev => {
      const next = new Set(prev);
      if (next.has(setId)) next.delete(setId);
      else next.add(setId);
      return next;
    });
  };
  const expandAll = () => setExpandedSets(new Set(treatmentArmSets.map(s => s.id)));
  const collapseAll = () => setExpandedSets(new Set());

  // Insert column/group after a specific node at the same level
  const handleInsertAfter = useCallback(
    (setId: string, headers: ColumnHeaderGroup[], afterId: string, type: 'column' | 'group') => {
      const newHeaders = [...headers];
      if (type === 'group') {
        const idx = newHeaders.findIndex(g => g.id === afterId);
        if (idx !== -1) {
          const child: ColumnHeaderGroup = {
            children: [{ id: `col_${Date.now()}`, label: 'Column 1' }],
            id: `grp_${Date.now()}`,
            label: 'New Group'
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
    [saveHeaders]
  );

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
        <Space size={6}>
          <span>Header Styles</span>
          <Tag color="blue">{treatmentArmSets.length} sets</Tag>
          <Tag color="green">{totalColumns} columns</Tag>
          {treatmentArmSets.length > 2 && (
            <Select
              allowClear
              placeholder="Filter..."
              popupMatchSelectWidth={false}
              size="small"
              style={{ width: 140 }}
              value={filterText || undefined}
              options={treatmentArmSets.map(s => ({
                label: s.name,
                value: s.name
              }))}
              onChange={v => setFilterText(v || '')}
            />
          )}
          {treatmentArmSets.length > 2 && (
            <>
              <Tooltip title="Expand All">
                <Button
                  size="small"
                  style={{ padding: '0 4px' }}
                  type="text"
                  onClick={expandAll}
                >
                  <DownOutlined style={{ fontSize: 10 }} />
                </Button>
              </Tooltip>
              <Tooltip title="Collapse All">
                <Button
                  size="small"
                  style={{ padding: '0 4px' }}
                  type="text"
                  onClick={collapseAll}
                >
                  <DownOutlined style={{ fontSize: 10, transform: 'rotate(-90deg)' }} />
                </Button>
              </Tooltip>
            </>
          )}
        </Space>
      }
    >
      <div style={{ maxHeight: 600, overflowY: 'auto' }}>
        {filteredSets.map(set => {
          const headers = getHeaders(set);
          const leaves = countLeaves(headers);
          const flatNodes = flattenTree(headers, 0, expandedGroups);
          const isSetExpanded = expandedSets.has(set.id);

          return (
            <div
              key={set.id}
              style={{ marginBottom: 8 }}
            >
              {/* Set Header — always visible, click to expand/collapse */}
              <div
                style={{
                  alignItems: 'center',
                  backgroundColor: '#e6f7ff',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  marginBottom: isSetExpanded ? 4 : 0,
                  padding: '6px 10px'
                }}
                onClick={() => toggleSetExpand(set.id)}
              >
                <DownOutlined
                  style={{
                    fontSize: 10,
                    marginRight: 8,
                    transform: isSetExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.15s'
                  }}
                />
                {editingSetId === set.id ? (
                  <Form
                    form={form}
                    initialValues={{ name: set.name }}
                    layout="inline"
                    onClick={e => e.stopPropagation()}
                  >
                    <Form.Item
                      name="name"
                      rules={[{ message: 'Required', required: true }]}
                      style={{ margin: 0 }}
                    >
                      <Input
                        autoFocus
                        size="small"
                        style={{ width: 200 }}
                        onClick={e => e.stopPropagation()}
                      />
                    </Form.Item>
                    <Space size="small">
                      <Button
                        icon={<SaveOutlined />}
                        size="small"
                        type="primary"
                        onClick={e => {
                          e.stopPropagation();
                          saveEditSet();
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          cancelEditSet();
                        }}
                      >
                        Cancel
                      </Button>
                    </Space>
                  </Form>
                ) : (
                  <>
                    <Text
                      strong
                      style={{ flex: 1 }}
                    >
                      {set.name}
                    </Text>
                    <Tag
                      color="blue"
                      style={{ marginRight: 4 }}
                    >
                      {leaves} cols
                    </Tag>
                    <Space
                      size={2}
                      onClick={e => e.stopPropagation()}
                    >
                      <Tooltip title="Edit name">
                        <Button
                          icon={<EditOutlined />}
                          size="small"
                          type="text"
                          onClick={e => {
                            e.stopPropagation();
                            startEditSet(set.id);
                          }}
                        />
                      </Tooltip>
                      <Tooltip title="Delete set">
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          size="small"
                          type="text"
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteSet(set.id);
                          }}
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
                    overflow: 'hidden'
                  }}
                >
                  {flatNodes.map(({ depth, group }) => {
                    const isGroup = Boolean(group.children?.length);
                    const isExpanded = expandedGroups.has(group.id);

                    return (
                      <InlineEditRow
                        depth={depth}
                        group={group}
                        isExpanded={isExpanded}
                        isGroup={isGroup}
                        key={group.id}
                        onAddChild={() => handleAddChild(set.id, headers, group.id)}
                        onDelete={() => handleDeleteNode(set.id, headers, group.id)}
                        onInsertAfterColumn={() => handleInsertAfter(set.id, headers, group.id, 'column')}
                        onInsertAfterGroup={() => handleInsertAfter(set.id, headers, group.id, 'group')}
                        onMoveDown={() => handleMove(set.id, headers, group.id, 'down')}
                        onMoveUp={() => handleMove(set.id, headers, group.id, 'up')}
                        onSave={updates => handleUpdateNode(set.id, headers, group.id, updates)}
                        onToggleExpand={() => toggleExpand(group.id)}
                        onUngroup={isGroup ? () => handleUngroup(set.id, headers, group.id) : undefined}
                      />
                    );
                  })}

                  {flatNodes.length === 0 && (
                    <div style={{ color: '#999', padding: 16, textAlign: 'center' }}>
                      <Text
                        style={{ fontSize: 12 }}
                        type="secondary"
                      >
                        No columns defined
                      </Text>
                    </div>
                  )}

                  {/* Add buttons at bottom — for adding to root level */}
                  <div style={{ borderTop: '1px solid #f0f0f0', display: 'flex', gap: 6, padding: '6px 8px' }}>
                    <Tooltip title="Add a new column at the end">
                      <Button
                        icon={<PlusOutlined />}
                        size="small"
                        onClick={() => handleAddColumn(set.id, headers)}
                      >
                        + Column (end)
                      </Button>
                    </Tooltip>
                    <Tooltip title="Add a new group at the end">
                      <Button
                        icon={<GroupOutlined />}
                        size="small"
                        onClick={() => handleAddGroup(set.id, headers)}
                      >
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
          <div style={{ color: '#999', padding: 24, textAlign: 'center' }}>
            <Text type="secondary">No matching sets</Text>
          </div>
        )}

        {treatmentArmSets.length === 0 && (
          <div style={{ color: '#999', padding: 32, textAlign: 'center' }}>
            <div>No column header sets defined</div>
            <div style={{ marginTop: 8 }}>
              <Button
                icon={<PlusOutlined />}
                type="dashed"
                onClick={handleAddSet}
              >
                Add First Set
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
