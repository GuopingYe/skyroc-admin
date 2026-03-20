/**
 * TFL Builder - Nested Row Editor
 *
 * Hierarchical row editor for tables with support for all analysis types
 * Migrated from Redux `useTflBuilderStore` to Zustand `useTableStore`.
 * Uses TableShell/TableRow model instead of ARS document display model.
 */
import { useState, useMemo } from 'react';
import type { MenuProps } from 'antd';
import {
  Table,
  Input,
  Button,
  Space,
  Dropdown,
  Typography,
  Tag,
  Tooltip,
  InputNumber,
  Select,
  Collapse
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  MoreOutlined,
  FolderOutlined,
  FileOutlined,
  DownOutlined,
  RightOutlined,
  LeftOutlined,
  DragOutlined
} from '@ant-design/icons';
import type { TableRow } from '../../types';
import { useTableStore } from '../../stores';

const { Text } = Typography;
const { Panel } = Collapse;

interface Props {
  displayId?: string;
  mode?: 'standard' | 'socpt';
  readOnly?: boolean;
  analysisType?: string;
}

export default function NestedRowEditor({ displayId: _displayId, mode = 'standard', readOnly = false, analysisType }: Props) {
  const currentTable = useTableStore(s => s.currentTable);
  const addRow = useTableStore(s => s.addRow);
  const updateRow = useTableStore(s => s.updateRow);
  const deleteRow = useTableStore(s => s.deleteRow);
  const moveRow = useTableStore(s => s.moveRow);
  const duplicateRow = useTableStore(s => s.duplicateRow);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Get body rows for current table
  const bodyRows = useMemo(() => {
    if (!currentTable) return [];
    return currentTable.rows || [];
  }, [currentTable]);

  // Toggle row expansion
  const toggleExpand = (rowId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set(bodyRows.map(r => r.id));
    setExpandedRows(allIds);
  };

  const collapseAll = () => {
    setExpandedRows(new Set());
  };

  // Toggle row selection
  const toggleRowSelection = (rowId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const selectAllRows = () => {
    setSelectedRowIds(new Set(bodyRows.map(r => r.id)));
  };

  const clearSelection = () => {
    setSelectedRowIds(new Set());
  };

  // Add new row (mapped from old addBodyRow to new addRow)
  const handleAddRow = (parentId?: string, insertIndex?: number) => {
    addRow(parentId, insertIndex);
  };

  const addSOCRow = () => {
    // Add a top-level row (SOC)
    addRow(undefined, undefined);
  };

  const addPTRow = (socId: string) => {
    const socIndex = bodyRows.findIndex(r => r.id === socId);
    if (socIndex < 0) return;

    const soc = bodyRows[socIndex];

    // Find insertion point (after last child of this SOC)
    let insertIndex = socIndex + 1;
    while (insertIndex < bodyRows.length && bodyRows[insertIndex].level > soc.level) {
      insertIndex++;
    }

    // Add row under the SOC parent, then immediately update its level
    addRow(socId, insertIndex);
  };

  const handleDeleteRow = (rowId: string) => {
    const row = bodyRows.find(r => r.id === rowId);
    if (!row) return;

    // Check if row has children
    const hasChildren = bodyRows.some(r => {
      const idx = bodyRows.findIndex(r => r.id === rowId);
      for (let i = idx + 1; i < bodyRows.length; i++) {
        if (bodyRows[i].level > row.level) {
          return true;
        }
        if (bodyRows[i].level <= row.level) {
          break;
        }
      }
      return false;
    });

    if (hasChildren) {
      // In a full implementation, show confirmation dialog
      // For now, proceed with delete
    }

    deleteRow(rowId);
  };

  const handleDuplicateRow = (rowId: string) => {
    duplicateRow(rowId);
  };

  // Determine if a row should be visible based on expansion state
  const isRowVisible = (row: TableRow, index: number): boolean => {
    if (row.level === 0) return true;

    // Find parent (first row with lower indent)
    for (let i = index - 1; i >= 0; i--) {
      if (bodyRows[i].level < row.level) {
        return expandedRows.has(bodyRows[i].id);
      }
    }
    return true;
  };

  // Get row icon based on type and analysis type
  const getRowIcon = (record: TableRow) => {
    // Check if this row has children (simplification)
    const idx = bodyRows.findIndex(r => r.id === record.id);
    const hasChildren = bodyRows.some((r, i) => i > idx && r.level > record.level && r.level <= record.level + 1);

    if (hasChildren) {
      const isExpanded = expandedRows.has(record.id);
      return (
        <span
          onClick={() => toggleExpand(record.id)}
          style={{ cursor: 'pointer', marginRight: 4 }}
        >
          {isExpanded ? <DownOutlined /> : <RightOutlined />}
        </span>
      );
    }

    // Icon based on analysis type
    switch (analysisType) {
      case 'AE':
        return record.level === 0 ? <FolderOutlined /> : <FileOutlined />;
      case 'Laboratory':
      case 'Vital Signs':
      case 'ECG':
      case 'PK':
        return <FileOutlined />;
      default:
        return <FileOutlined />;
    }
  };

  // Get row type tag based on stats
  const getRowTypeTag = (record: TableRow) => {
    const statTypes = record.stats?.map(s => s.type) || [];

    if (statTypes.includes('header')) {
      return <Tag color="blue">Header</Tag>;
    }
    if (record.analysisOfInterest === 'SOC') {
      return <Tag color="purple">SOC</Tag>;
    }
    return null;
  };

  const columns = [
    {
      title: '',
      key: 'checkbox',
      width: 40,
      render: (_: unknown, record: TableRow) => (
        <input
          type="checkbox"
          checked={selectedRowIds.has(record.id)}
          onChange={() => toggleRowSelection(record.id)}
          onClick={e => e.stopPropagation()}
          style={{ cursor: 'pointer' }}
        />
      ),
    },
    {
      title: '',
      key: 'drag',
      width: 30,
      render: () => <DragOutlined style={{ cursor: 'grab', color: '#999' }} />,
    },
    {
      title: mode === 'socpt' ? 'SOC / Preferred Term' : 'Label',
      dataIndex: 'label',
      key: 'label',
      width: '40%',
      render: (text: string, record: TableRow, index: number) => {
        const isVisible = isRowVisible(record, index);
        if (!isVisible) return null;

        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontWeight: record.level === 0 ? 600 : 400,
              color: record.level === 0 ? '#262626' : '#595959',
            }}
          >
            {getRowIcon(record)}
            <Input
              value={text.trimStart()}
              disabled={readOnly}
              placeholder="Row label"
              onChange={e => {
                const prefix = record.level > 0 ? '  '.repeat(record.level) : '';
                updateRow(record.id, { label: prefix + e.target.value });
              }}
              onClick={e => e.stopPropagation()}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                fontWeight: record.level === 0 ? 600 : 400,
              }}
            />
            {getRowTypeTag(record)}
          </div>
        );
      },
    },
    {
      title: 'Variable',
      dataIndex: 'variable',
      key: 'variable',
      width: '15%',
      render: (text: string, record: TableRow, index: number) => {
        if (!isRowVisible(record, index)) return null;
        return (
          <Input
            value={text || ''}
            disabled={readOnly}
            placeholder="Variable"
            onChange={e => updateRow(record.id, { variable: e.target.value })}
            onClick={e => e.stopPropagation()}
          />
        );
      },
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: '80px',
      render: (_: unknown, record: TableRow, index: number) => {
        if (!isRowVisible(record, index)) return null;
        return (
          <InputNumber
            value={record.level}
            disabled={readOnly}
            min={0}
            max={4}
            onChange={val => updateRow(record.id, { level: val ?? 0 })}
            onClick={e => e.stopPropagation()}
          />
        );
      },
    },
    {
      title: 'Decimals',
      key: 'decimals',
      width: '100px',
      render: (_: unknown, record: TableRow, index: number) => {
        if (!isRowVisible(record, index)) return null;
        const firstStat = record.stats?.[0];
        return (
          <InputNumber
            value={firstStat?.decimals ?? 1}
            min={0}
            max={6}
            disabled={readOnly}
            onChange={val => {
              if (record.stats && record.stats.length > 0) {
                const updatedStats = record.stats.map((s, i) =>
                  i === 0 ? { ...s, decimals: val ?? 1 } : s
                );
                updateRow(record.id, { stats: updatedStats });
              }
            }}
            onClick={e => e.stopPropagation()}
          />
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: '15%',
      render: (_: unknown, record: TableRow, index: number) => {
        if (readOnly) return null;
        if (!isRowVisible(record, index)) return null;

        const hasChildren = bodyRows.some((r, i) =>
          i > index && r.level > record.level && r.level <= record.level + 1
        );

        const canAddChild = record.level < 4 && !hasChildren;
        const canIndent = record.level < 4 && index > 0;
        const canOutdent = record.level > 0 && index > 0;

        const rowMenuItems: MenuProps['items'] = [
          {
            key: 'duplicate',
            icon: <CopyOutlined />,
            label: 'Duplicate',
            onClick: () => handleDuplicateRow(record.id),
          },
          { type: 'divider' },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Delete',
            danger: true,
            onClick: () => handleDeleteRow(record.id),
          },
        ];

        return (
          <Space size="small">
            {mode === 'socpt' && record.level === 0 && (
              <Tooltip title="Add PT under this row">
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => addPTRow(record.id)}
                />
              </Tooltip>
            )}
            {canAddChild && (
              <Tooltip title="Add child row">
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => handleAddRow(record.id)}
                />
              </Tooltip>
            )}
            {canIndent && (
              <Tooltip title="Indent">
                <Button
                  type="text"
                  size="small"
                  icon={<RightOutlined />}
                  onClick={() => {
                    const row = bodyRows.find(r => r.id === record.id);
                    if (row) updateRow(record.id, { level: row.level + 1 });
                  }}
                />
              </Tooltip>
            )}
            {canOutdent && (
              <Tooltip title="Outdent">
                <Button
                  type="text"
                  size="small"
                  icon={<LeftOutlined />}
                  onClick={() => {
                    const row = bodyRows.find(r => r.id === record.id);
                    if (row) updateRow(record.id, { level: row.level - 1 });
                  }}
                />
              </Tooltip>
            )}
            <Dropdown menu={{ items: rowMenuItems }} trigger={['click']}>
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  // Analysis type info
  const analysisTypeLabel = useMemo(() => {
    const typeMap: Record<string, string> = {
      'Demographics': 'Baseline & Demographics',
      'Laboratory': 'Laboratory Parameters',
      'AE': 'Adverse Events',
      'Vital Signs': 'Vital Signs',
      'ECG': 'ECG Measurements',
      'PK': 'Pharmacokinetics',
      'Efficacy': 'Efficacy Endpoints',
      'Disposition': 'Subject Disposition',
      'CM': 'Concomitant Medications',
    };
    return typeMap[analysisType || ''] || 'General';
  }, [analysisType]);

  return (
    <div className="nested-row-editor">
      {/* Toolbar */}
      <div
        className="row-editor-toolbar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          padding: '12px',
          backgroundColor: '#fafafa',
          borderRadius: 4,
        }}
      >
        <Space>
          {analysisType && <Tag color="blue">{analysisTypeLabel}</Tag>}
          <Text type="secondary" style={{ marginLeft: 8 }}>
            {bodyRows.length} {bodyRows.length === 1 ? 'row' : 'rows'}
          </Text>
        </Space>
        <Space>
          {selectedRowIds.size > 0 && (
            <>
              <Text type="secondary">{selectedRowIds.size} selected</Text>
              <Button size="small" onClick={clearSelection}>
                Clear
              </Button>
            </>
          )}
          <Button size="small" onClick={selectAllRows}>
            Select All
          </Button>
          <Button size="small" onClick={expandAll}>Expand All</Button>
          <Button size="small" onClick={collapseAll}>Collapse All</Button>
          {mode === 'socpt' ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={addSOCRow}>
              Add SOC
            </Button>
          ) : (
            <Button icon={<PlusOutlined />} onClick={() => handleAddRow()}>
              Add Row
            </Button>
          )}
        </Space>
      </div>

      {/* Analysis type specific info */}
      {analysisType === 'AE' && (
        <div
          style={{
            marginBottom: 12,
            padding: 8,
            backgroundColor: '#e6f7ff',
            borderRadius: 4,
            fontSize: 12,
            color: '#0958d9',
          }}
        >
          <Text>
            <strong>AE Mode:</strong> Use SOC (System Organ Class) rows for body systems,
            then add PT (Preferred Term) rows under each SOC for specific adverse events.
          </Text>
        </div>
      )}

      {analysisType === 'Laboratory' && (
        <div
          style={{
            marginBottom: 12,
            padding: 8,
            backgroundColor: '#f6ffed',
            borderRadius: 4,
            fontSize: 12,
            color: '#cf1322',
          }}
        >
          <Text>
            <strong>Lab Mode:</strong> Build nested structure: Parameter → Visit → Statistics.
            Common statistics: n, Mean (SD), Median (Min, Max), Change from Baseline.
          </Text>
        </div>
      )}

      {/* Table */}
      <Table
        dataSource={bodyRows}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        bordered
        scroll={{ x: 'max-content' }}
        rowClassName={(record) => {
          const classes = [`row-level-${record.level}`];
          const statTypes = record.stats?.map(s => s.type) || [];
          if (statTypes.includes('header')) classes.push('row-header');
          if (statTypes.includes('n_percent')) classes.push('row-total');
          return classes.join(' ');
        }}
        expandable={{
          defaultExpandAllRows: false,
          expandedRowKeys: Array.from(expandedRows),
          onExpand: (expanded, record) => {
            if (expanded) {
              setExpandedRows(prev => new Set([...prev, record.id]));
            } else {
              setExpandedRows(prev => {
                const next = new Set(prev);
                next.delete(record.id);
                return next;
              });
            }
          },
        }}
      />
    </div>
  );
}
