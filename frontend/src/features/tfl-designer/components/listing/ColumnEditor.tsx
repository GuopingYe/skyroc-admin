/**
 * TFL Builder - Column Editor for Listings
 *
 * Configure columns for listing displays with support for nested/grouped headers.
 */
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
  DragOutlined,
  GroupOutlined,
  PlusOutlined,
  RightOutlined,
  SearchOutlined,
  SettingOutlined,
  UngroupOutlined
} from '@ant-design/icons';
import {
  Button,
  Card,
  Divider,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography
} from 'antd';
const { Text: AntText } = Typography;
import { useMemo, useState } from 'react';

import type { ListingColumn } from '../../types';
import {
  addChildToTree,
  countLeaves,
  deleteFromTree,
  findInTree,
  moveInTree,
  ungroupInTree,
  updateInTree
} from '../../utils/treeUtils';

// ==================== Helpers ====================

/** Flatten nested columns into a flat list with depth info for display */
interface FlatColumn {
  col: ListingColumn;
  depth: number;
  parentId: string | null;
}

function flattenColumns(columns: ListingColumn[], depth = 0, parentId: string | null = null): FlatColumn[] {
  const result: FlatColumn[] = [];
  columns.forEach(col => {
    result.push({ col, depth, parentId });
    if (col.children?.length) {
      result.push(...flattenColumns(col.children, depth + 1, col.id));
    }
  });
  return result;
}

// Tree operations imported from shared treeUtils — local duplicates removed

// ==================== Component ====================

interface Props {
  columns: ListingColumn[];
  disabled?: boolean;
  displayId: string;
  onChange: (columns: ListingColumn[]) => void;
}

export default function ColumnEditor({ columns, disabled = false, displayId, onChange }: Props) {
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
        col.label.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [flatColumns, searchValue]);

  // Count leaf columns (excluding groups)
  const leafCount = useMemo(() => countLeaves(columns), [columns]);

  // ==================== Handlers ====================

  const handleAddColumn = () => {
    const newCol: ListingColumn = {
      align: 'left',
      id: `col-${Date.now()}`,
      label: 'New Column',
      name: 'NEWVAR',
      width: 150
    };
    onChange([...columns, newCol]);
  };

  const handleAddGroup = () => {
    const newGroup: ListingColumn = {
      children: [],
      id: `grp-${Date.now()}`,
      label: 'New Group',
      name: 'GROUP'
    };
    onChange([...columns, newGroup]);
  };

  const handleAddChild = (parentId: string) => {
    const child: ListingColumn = {
      align: 'left',
      id: `col-${Date.now()}`,
      label: 'New Column',
      name: 'NEWVAR',
      width: 150
    };
    onChange(addChildToTree(columns, parentId, child));
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
      children: col.children
        ? col.children.map(c => ({ ...c, id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }))
        : undefined,
      id: `col-${Date.now()}`,
      label: `${col.label} (copy)`,
      name: `${col.name}_copy`
    };
    // Insert after the original at top level
    const idx = columns.findIndex(c => c.id === id);
    if (idx >= 0) {
      onChange([...columns.slice(0, idx + 1), dup, ...columns.slice(idx + 1)]);
    }
  };

  const handleUngroup = (id: string) => {
    onChange(ungroupInTree(columns, id));
  };

  const handleMove = (id: string, direction: 'down' | 'up') => {
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
        .map(s => s.trim())
        .filter(Boolean);
      handleUpdate(editingCombinedCol.id, {
        combineFormat,
        sourceColumns: sourceCols.length > 0 ? sourceCols : undefined
      });
      setEditingCombinedCol(null);
    }
  };

  // ==================== Table Columns ====================

  const tableColumns = [
    {
      key: 'drag',
      render: (_: unknown, record: FlatColumn) => (
        <div style={{ paddingLeft: record.depth * 20, textAlign: 'center' }}>
          {record.col.children?.length ? <GroupOutlined style={{ color: '#1890ff' }} /> : <DragOutlined />}
        </div>
      ),
      title: '',
      width: 50
    },
    {
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: FlatColumn) => (
        <Input
          disabled={disabled}
          size="small"
          style={{ fontSize: 12 }}
          value={text}
          onChange={e => handleUpdate(record.col.id, { name: e.target.value })}
        />
      ),
      title: 'Variable',
      width: 150
    },
    {
      dataIndex: 'label',
      key: 'label',
      render: (text: string, record: FlatColumn) => (
        <Input
          disabled={disabled}
          size="small"
          style={{ fontSize: 12 }}
          value={text}
          onChange={e => handleUpdate(record.col.id, { label: e.target.value })}
        />
      ),
      title: 'Label',
      width: 150
    },
    {
      dataIndex: 'width',
      key: 'width',
      render: (value: number, record: FlatColumn) =>
        record.col.children?.length ? null : (
          <InputNumber
            disabled={disabled}
            max={500}
            min={50}
            size="small"
            step={10}
            style={{ fontSize: 12, width: '100%' }}
            value={value}
            onChange={val => val !== null && handleUpdate(record.col.id, { width: val })}
          />
        ),
      title: 'Width',
      width: 70
    },
    {
      dataIndex: 'align',
      key: 'align',
      render: (align: string, record: FlatColumn) =>
        record.col.children?.length ? null : (
          <Select
            disabled={disabled}
            size="small"
            style={{ width: '100%' }}
            value={align}
            options={[
              { label: 'L', value: 'left' },
              { label: 'C', value: 'center' },
              { label: 'R', value: 'right' }
            ]}
            onChange={value => handleUpdate(record.col.id, { align: value as 'center' | 'left' | 'right' })}
          />
        ),
      title: 'Align',
      width: 80
    },
    {
      key: 'children',
      render: (_: unknown, record: FlatColumn) =>
        record.col.children?.length ? <Tag color="blue">{record.col.children.length}</Tag> : null,
      title: '',
      width: 40
    },
    {
      key: 'actions',
      render: (_: unknown, record: FlatColumn) => (
        <Space size={2}>
          <Tooltip title="Move Up">
            <Button
              icon={<ArrowUpOutlined />}
              size="small"
              type="text"
              onClick={() => handleMove(record.col.id, 'up')}
            />
          </Tooltip>
          <Tooltip title="Move Down">
            <Button
              icon={<ArrowDownOutlined />}
              size="small"
              type="text"
              onClick={() => handleMove(record.col.id, 'down')}
            />
          </Tooltip>
          {record.col.children?.length ? (
            <>
              <Tooltip title="Add child column">
                <Button
                  icon={<PlusOutlined />}
                  size="small"
                  type="text"
                  onClick={() => handleAddChild(record.col.id)}
                />
              </Tooltip>
              <Tooltip title="Ungroup (move children up)">
                <Button
                  icon={<UngroupOutlined />}
                  size="small"
                  type="text"
                  onClick={() => handleUngroup(record.col.id)}
                />
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title="Combine settings">
                <Button
                  icon={<SettingOutlined style={{ color: record.col.sourceColumns?.length ? '#1890ff' : undefined }} />}
                  size="small"
                  type="text"
                  onClick={() => openCombineSettings(record.col)}
                />
              </Tooltip>
              <Tooltip title="Duplicate">
                <Button
                  icon={<CopyOutlined />}
                  size="small"
                  type="text"
                  onClick={() => handleDuplicate(record.col.id)}
                />
              </Tooltip>
            </>
          )}
          <Tooltip title="Delete">
            <Popconfirm
              cancelText="Cancel"
              okText="Delete"
              title="Delete this column?"
              onConfirm={() => handleDelete(record.col.id)}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
                type="text"
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
      title: 'Actions',
      width: 140
    }
  ];

  // ==================== Render ====================

  return (
    <Card
      size="small"
      extra={
        <Space>
          <Tooltip title="Add grouped header">
            <Button
              disabled={disabled}
              icon={<GroupOutlined />}
              size="small"
              onClick={handleAddGroup}
            >
              Group
            </Button>
          </Tooltip>
          <Button
            disabled={disabled}
            icon={<PlusOutlined />}
            size="small"
            type="primary"
            onClick={handleAddColumn}
          >
            Column
          </Button>
        </Space>
      }
      title={
        <Space>
          <span>Column Configuration</span>
          <Tag color="blue">{leafCount} columns</Tag>
          {columns.some(c => c.children?.length) && <Tag color="green">Grouped</Tag>}
        </Space>
      }
    >
      {/* Search */}
      <Input
        allowClear
        placeholder="Search columns..."
        prefix={<SearchOutlined />}
        size="small"
        style={{ marginBottom: 8 }}
        value={searchValue}
        onChange={e => setSearchValue(e.target.value)}
      />

      {/* Columns Table */}
      <Table
        bordered
        columns={tableColumns}
        dataSource={filteredFlat}
        pagination={false}
        rowKey={record => record.col.id}
        size="small"
        rowClassName={(record: FlatColumn) =>
          record.col.children?.length ? 'group-row' : record.col.hidden ? 'hidden-row' : ''
        }
      />

      {filteredFlat.length === 0 && (
        <div style={{ color: '#999', padding: 24, textAlign: 'center' }}>
          <AntText type="secondary">No columns defined</AntText>
        </div>
      )}

      {/* Column Visibility */}
      {filteredFlat.length > 0 && <Divider />}
      <div>
        <AntText
          strong
          style={{ display: 'block', marginBottom: 8 }}
        >
          Visibility
        </AntText>
        <Space
          wrap
          size={4}
        >
          {flatColumns.map(({ col }) => (
            <Tag
              color={col.hidden ? 'default' : 'blue'}
              key={col.id}
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
        open={Boolean(editingCombinedCol)}
        title={`Combine Settings: ${editingCombinedCol?.label || editingCombinedCol?.name}`}
        width={500}
        onCancel={() => setEditingCombinedCol(null)}
        onOk={saveCombineSettings}
      >
        <div style={{ marginBottom: 16 }}>
          <AntText
            style={{ fontSize: 13 }}
            type="secondary"
          >
            Merge data from multiple variables into one column (e.g. SOC and PT).
          </AntText>
        </div>
        <div style={{ marginBottom: 16 }}>
          <AntText strong>Source Columns (comma separated):</AntText>
          <Input
            placeholder="e.g. AEBODSYS, AEDECOD"
            style={{ marginTop: 8 }}
            value={sourceColumnsStr}
            onChange={e => setSourceColumnsStr(e.target.value)}
          />
        </div>
        <div>
          <AntText strong>Format String:</AntText>
          <Input
            placeholder="e.g. {0} / {1}"
            style={{ marginTop: 8 }}
            value={combineFormat}
            onChange={e => setCombineFormat(e.target.value)}
          />
          <AntText
            style={{ display: 'block', fontSize: 12, marginTop: 4 }}
            type="secondary"
          >
            Use {'{0}'}, {'{1}'}, etc. to reference source columns in order.
          </AntText>
        </div>
      </Modal>
    </Card>
  );
}
