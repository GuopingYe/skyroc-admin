/**
 * TFL Builder - Column Editor for Listings
 *
 * Configure columns for listing displays with support for nested/grouped headers.
 */
import { useState, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  InputNumber,
  Select,
  Tag,
  Tooltip,
  Popconfirm,
  Typography,
  Divider,
  Card,
  Modal,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  DragOutlined,
  CopyOutlined,
  SearchOutlined,
  SettingOutlined,
  GroupOutlined,
  UngroupOutlined,
  RightOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import type { ListingColumn } from '../../types';
import { countLeaves } from '../../utils/treeUtils';

const { Text } = Typography;

// ==================== Helpers ====================

/** Flatten nested columns into a flat list with depth info for display */
interface FlatColumn {
  col: ListingColumn;
  depth: number;
  parentId: string | null;
}

function flattenColumns(columns: ListingColumn[], depth = 0, parentId: string | null = null): FlatColumn[] {
  const result: FlatColumn[] = [];
  columns.forEach((col) => {
    result.push({ col, depth, parentId });
    if (col.children?.length) {
      result.push(...flattenColumns(col.children, depth + 1, col.id));
    }
  });
  return result;
}

/** Recursively update a column by id */
function updateInTree(columns: ListingColumn[], id: string, updates: Partial<ListingColumn>): ListingColumn[] {
  return columns.map((col) => {
    if (col.id === id) return { ...col, ...updates };
    if (col.children?.length) {
      return { ...col, children: updateInTree(col.children, id, updates) };
    }
    return col;
  });
}

/** Recursively delete a column by id */
function deleteFromTree(columns: ListingColumn[], id: string): ListingColumn[] {
  return columns
    .filter((col) => col.id !== id)
    .map((col) => {
      if (col.children?.length) {
        return { ...col, children: deleteFromTree(col.children, id) };
      }
      return col;
    });
}

/** Recursively find a column by id */
function findInTree(columns: ListingColumn[], id: string): ListingColumn | null {
  for (const col of columns) {
    if (col.id === id) return col;
    if (col.children?.length) {
      const found = findInTree(col.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** Add a child column to a group */
function addChildToGroup(columns: ListingColumn[], parentId: string, child: ListingColumn): ListingColumn[] {
  return columns.map((col) => {
    if (col.id === parentId) {
      return { ...col, children: [...(col.children || []), child] };
    }
    if (col.children?.length) {
      return { ...col, children: addChildToGroup(col.children, parentId, child) };
    }
    return col;
  });
}

/** Ungroup: move all children of a group up to the parent level, replacing the group */
function ungroupInTree(columns: ListingColumn[], id: string): ListingColumn[] {
  const result: ListingColumn[] = [];
  for (const col of columns) {
    if (col.id === id) {
      // Replace this group with its children
      if (col.children?.length) {
        result.push(...col.children);
      }
      // If no children, just remove the group
    } else if (col.children?.length) {
      result.push({ ...col, children: ungroupInTree(col.children, id) });
    } else {
      result.push(col);
    }
  }
  return result;
}

/** Move a column up or down among its siblings */
function moveInTree(columns: ListingColumn[], id: string, direction: 'up' | 'down'): ListingColumn[] {
  const result = [...columns];
  const idx = result.findIndex((c) => c.id === id);
  if (idx !== -1) {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx >= 0 && targetIdx < result.length) {
      [result[idx], result[targetIdx]] = [result[targetIdx], result[idx]];
      return result;
    }
  }
  return result.map((col) => {
    if (col.children?.length) return { ...col, children: moveInTree(col.children, id, direction) };
    return col;
  });
}

// ==================== Component ====================

interface Props {
  displayId: string;
  columns: ListingColumn[];
  onChange: (columns: ListingColumn[]) => void;
  disabled?: boolean;
}

export default function ColumnEditor({ displayId, columns, onChange, disabled = false }: Props) {
  const [searchValue, setSearchValue] = useState('');

  // Advanced combine configuration state
  const [editingCombinedCol, setEditingCombinedCol] = useState<ListingColumn | null>(null);
  const [combineFormat, setCombineFormat] = useState<string>('');
  const [sourceColumnsStr, setSourceColumnsStr] = useState<string>('');

  // Flatten all columns for display
  const flatColumns = useMemo(() => flattenColumns(columns), [columns]);

  // Filter flat columns by search
  const filteredFlat = useMemo(() => {
    if (!searchValue) return flatColumns;
    return flatColumns.filter(
      ({ col }) =>
        col.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        col.label.toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [flatColumns, searchValue]);

  // Count leaf columns (excluding groups)
  const leafCount = useMemo(() => countLeaves(columns), [columns]);

  // ==================== Handlers ====================

  const handleAddColumn = () => {
    const newCol: ListingColumn = {
      id: `col-${Date.now()}`,
      name: 'NEWVAR',
      label: 'New Column',
      width: 150,
      align: 'left',
    };
    onChange([...columns, newCol]);
  };

  const handleAddGroup = () => {
    const newGroup: ListingColumn = {
      id: `grp-${Date.now()}`,
      name: 'GROUP',
      label: 'New Group',
      children: [],
    };
    onChange([...columns, newGroup]);
  };

  const handleAddChild = (parentId: string) => {
    const child: ListingColumn = {
      id: `col-${Date.now()}`,
      name: 'NEWVAR',
      label: 'New Column',
      width: 150,
      align: 'left',
    };
    onChange(addChildToGroup(columns, parentId, child));
  };

  const handleUpdate = (id: string, updates: Partial<ListingColumn>) => {
    onChange(updateInTree(columns, id, updates));
  };

  const handleDelete = (id: string) => {
    onChange(deleteFromTree(columns, id));
  };

  const handleDuplicate = (id: string) => {
    const col = findInTree(columns, id);
    if (!col) return;
    const dup: ListingColumn = {
      ...col,
      id: `col-${Date.now()}`,
      name: `${col.name}_copy`,
      label: `${col.label} (copy)`,
      children: col.children
        ? col.children.map((c) => ({ ...c, id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }))
        : undefined,
    };
    // Insert after the original at top level
    const idx = columns.findIndex((c) => c.id === id);
    if (idx >= 0) {
      onChange([...columns.slice(0, idx + 1), dup, ...columns.slice(idx + 1)]);
    }
  };

  const handleUngroup = (id: string) => {
    onChange(ungroupInTree(columns, id));
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    onChange(moveInTree(columns, id, direction));
  };

  // Combined column settings
  const openCombineSettings = (col: ListingColumn) => {
    setEditingCombinedCol(col);
    setCombineFormat(col.combineFormat || '');
    setSourceColumnsStr((col.sourceColumns || []).join(', '));
  };

  const saveCombineSettings = () => {
    if (editingCombinedCol) {
      const sourceCols = sourceColumnsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      handleUpdate(editingCombinedCol.id, {
        combineFormat,
        sourceColumns: sourceCols.length > 0 ? sourceCols : undefined,
      });
      setEditingCombinedCol(null);
    }
  };

  // ==================== Table Columns ====================

  const tableColumns = [
    {
      title: '',
      key: 'drag',
      width: 50,
      render: (_: unknown, record: FlatColumn) => (
        <div style={{ textAlign: 'center', paddingLeft: record.depth * 20 }}>
          {record.col.children?.length ? (
            <GroupOutlined style={{ color: '#1890ff' }} />
          ) : (
            <DragOutlined />
          )}
        </div>
      ),
    },
    {
      title: 'Variable',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text: string, record: FlatColumn) => (
        <Input
          value={text}
          disabled={disabled}
          onChange={(e) => handleUpdate(record.col.id, { name: e.target.value })}
          style={{ fontSize: 12 }}
          size="small"
        />
      ),
    },
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
      width: 150,
      render: (text: string, record: FlatColumn) => (
        <Input
          value={text}
          disabled={disabled}
          onChange={(e) => handleUpdate(record.col.id, { label: e.target.value })}
          style={{ fontSize: 12 }}
          size="small"
        />
      ),
    },
    {
      title: 'Width',
      dataIndex: 'width',
      key: 'width',
      width: 70,
      render: (value: number, record: FlatColumn) =>
        record.col.children?.length ? null : (
          <InputNumber
            value={value}
            min={50}
            max={500}
            step={10}
            disabled={disabled}
            onChange={(val) => val !== null && handleUpdate(record.col.id, { width: val })}
            style={{ fontSize: 12, width: '100%' }}
            size="small"
          />
        ),
    },
    {
      title: 'Align',
      dataIndex: 'align',
      key: 'align',
      width: 80,
      render: (align: string, record: FlatColumn) =>
        record.col.children?.length ? null : (
          <Select
            value={align}
            options={[
              { value: 'left', label: 'L' },
              { value: 'center', label: 'C' },
              { value: 'right', label: 'R' },
            ]}
            disabled={disabled}
            onChange={(value) => handleUpdate(record.col.id, { align: value as 'left' | 'center' | 'right' })}
            size="small"
            style={{ width: '100%' }}
          />
        ),
    },
    {
      title: '',
      key: 'children',
      width: 40,
      render: (_: unknown, record: FlatColumn) =>
        record.col.children?.length ? <Tag color="blue">{record.col.children.length}</Tag> : null,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_: unknown, record: FlatColumn) => (
        <Space size={2}>
          <Tooltip title="Move Up">
            <Button type="text" size="small" icon={<ArrowUpOutlined />} onClick={() => handleMove(record.col.id, 'up')} />
          </Tooltip>
          <Tooltip title="Move Down">
            <Button type="text" size="small" icon={<ArrowDownOutlined />} onClick={() => handleMove(record.col.id, 'down')} />
          </Tooltip>
          {record.col.children?.length ? (
            <>
              <Tooltip title="Add child column">
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => handleAddChild(record.col.id)}
                />
              </Tooltip>
              <Tooltip title="Ungroup (move children up)">
                <Button
                  type="text"
                  size="small"
                  icon={<UngroupOutlined />}
                  onClick={() => handleUngroup(record.col.id)}
                />
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title="Combine settings">
                <Button
                  type="text"
                  size="small"
                  icon={<SettingOutlined style={{ color: record.col.sourceColumns?.length ? '#1890ff' : undefined }} />}
                  onClick={() => openCombineSettings(record.col)}
                />
              </Tooltip>
              <Tooltip title="Duplicate">
                <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => handleDuplicate(record.col.id)} />
              </Tooltip>
            </>
          )}
          <Tooltip title="Delete">
            <Popconfirm title="Delete this column?" onConfirm={() => handleDelete(record.col.id)} okText="Delete" cancelText="Cancel">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ==================== Render ====================

  return (
    <Card
      title={
        <Space>
          <span>Column Configuration</span>
          <Tag color="blue">{leafCount} columns</Tag>
          {columns.some((c) => c.children?.length) && <Tag color="green">Grouped</Tag>}
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="Add grouped header">
            <Button icon={<GroupOutlined />} onClick={handleAddGroup} size="small" disabled={disabled}>
              Group
            </Button>
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddColumn} size="small" disabled={disabled}>
            Column
          </Button>
        </Space>
      }
      size="small"
    >
      {/* Search */}
      <Input
        placeholder="Search columns..."
        prefix={<SearchOutlined />}
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        allowClear
        style={{ marginBottom: 8 }}
        size="small"
      />

      {/* Columns Table */}
      <Table
        dataSource={filteredFlat}
        columns={tableColumns}
        rowKey={(record) => record.col.id}
        pagination={false}
        size="small"
        bordered
        rowClassName={(record: FlatColumn) =>
          record.col.children?.length ? 'group-row' : record.col.hidden ? 'hidden-row' : ''
        }
      />

      {filteredFlat.length === 0 && (
        <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
          <Text type="secondary">No columns defined</Text>
        </div>
      )}

      {/* Column Visibility */}
      {filteredFlat.length > 0 && <Divider />}
      <div>
        <Text strong style={{ marginBottom: 8, display: 'block' }}>Visibility</Text>
        <Space size={4} wrap>
          {flatColumns.map(({ col }) => (
            <Tag
              key={col.id}
              color={col.hidden ? 'default' : 'blue'}
              style={{ cursor: 'pointer', fontSize: 11 }}
              onClick={() => handleUpdate(col.id, { hidden: !col.hidden })}
            >
              {col.children?.length ? (
                <Space size={4}>
                  <GroupOutlined />
                  {col.label}
                </Space>
              ) : (
                col.name
              )}
            </Tag>
          ))}
        </Space>
      </div>

      {/* Combined Column Settings Modal */}
      <Modal
        title={`Combine Settings: ${editingCombinedCol?.label || editingCombinedCol?.name}`}
        open={!!editingCombinedCol}
        onCancel={() => setEditingCombinedCol(null)}
        onOk={saveCombineSettings}
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Merge data from multiple variables into one column (e.g. SOC and PT).
          </Text>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text strong>Source Columns (comma separated):</Text>
          <Input
            value={sourceColumnsStr}
            onChange={(e) => setSourceColumnsStr(e.target.value)}
            placeholder="e.g. AEBODSYS, AEDECOD"
            style={{ marginTop: 8 }}
          />
        </div>
        <div>
          <Text strong>Format String:</Text>
          <Input
            value={combineFormat}
            onChange={(e) => setCombineFormat(e.target.value)}
            placeholder="e.g. {0} / {1}"
            style={{ marginTop: 8 }}
          />
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
            Use {'{0}'}, {'{1}'}, etc. to reference source columns in order.
          </Text>
        </div>
      </Modal>
    </Card>
  );
}
