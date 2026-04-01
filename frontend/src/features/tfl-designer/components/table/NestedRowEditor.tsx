/**
 * TFL Builder - Nested Row Editor
 *
 * Hierarchical row editor for tables with support for all analysis types Migrated from Redux `useTflBuilderStore` to
 * Zustand `useTableStore`. Uses TableShell/TableRow model instead of ARS document display model.
 */
import {
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  DragOutlined,
  FileOutlined,
  FolderOutlined,
  LeftOutlined,
  MoreOutlined,
  PlusOutlined,
  RightOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Button, Dropdown, Input, InputNumber, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { useMemo, useState } from 'react';

import { useTableStore } from '../../stores';
import type { TableRow } from '../../types';

const { Text } = Typography;

interface Props {
  analysisType?: string;
  mode?: 'socpt' | 'standard';
  readOnly?: boolean;
}

export default function NestedRowEditor({
  analysisType,
  mode = 'standard',
  readOnly = false
}: Props) {
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
          style={{ cursor: 'pointer', marginRight: 4 }}
          onClick={() => toggleExpand(record.id)}
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
      key: 'checkbox',
      render: (_: unknown, record: TableRow) => (
        <input
          checked={selectedRowIds.has(record.id)}
          style={{ cursor: 'pointer' }}
          type="checkbox"
          onChange={() => toggleRowSelection(record.id)}
          onClick={e => e.stopPropagation()}
        />
      ),
      title: '',
      width: 40
    },
    {
      key: 'drag',
      render: () => <DragOutlined style={{ color: '#999', cursor: 'grab' }} />,
      title: '',
      width: 30
    },
    {
      dataIndex: 'label',
      key: 'label',
      render: (text: string, record: TableRow, index: number) => {
        const isVisible = isRowVisible(record, index);
        if (!isVisible) return null;

        return (
          <div
            style={{
              alignItems: 'center',
              color: record.level === 0 ? '#262626' : '#595959',
              display: 'flex',
              fontWeight: record.level === 0 ? 600 : 400
            }}
          >
            {getRowIcon(record)}
            <Input
              disabled={readOnly}
              placeholder="Row label"
              value={text.trimStart()}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                fontWeight: record.level === 0 ? 600 : 400
              }}
              onClick={e => e.stopPropagation()}
              onChange={e => {
                const prefix = record.level > 0 ? '  '.repeat(record.level) : '';
                updateRow(record.id, { label: prefix + e.target.value });
              }}
            />
            {getRowTypeTag(record)}
          </div>
        );
      },
      title: mode === 'socpt' ? 'SOC / Preferred Term' : 'Label',
      width: '40%'
    },
    {
      dataIndex: 'variable',
      key: 'variable',
      render: (text: string, record: TableRow, index: number) => {
        if (!isRowVisible(record, index)) return null;
        return (
          <Input
            disabled={readOnly}
            placeholder="Variable"
            value={text || ''}
            onChange={e => updateRow(record.id, { variable: e.target.value })}
            onClick={e => e.stopPropagation()}
          />
        );
      },
      title: 'Variable',
      width: '15%'
    },
    {
      dataIndex: 'level',
      key: 'level',
      render: (_: unknown, record: TableRow, index: number) => {
        if (!isRowVisible(record, index)) return null;
        return (
          <InputNumber
            disabled={readOnly}
            max={4}
            min={0}
            value={record.level}
            onChange={val => updateRow(record.id, { level: val ?? 0 })}
            onClick={e => e.stopPropagation()}
          />
        );
      },
      title: 'Level',
      width: '80px'
    },
    {
      key: 'decimals',
      render: (_: unknown, record: TableRow, index: number) => {
        if (!isRowVisible(record, index)) return null;
        const firstStat = record.stats?.[0];
        return (
          <InputNumber
            disabled={readOnly}
            max={6}
            min={0}
            value={firstStat?.decimals ?? 1}
            onClick={e => e.stopPropagation()}
            onChange={val => {
              if (record.stats && record.stats.length > 0) {
                const updatedStats = record.stats.map((s, i) => (i === 0 ? { ...s, decimals: val ?? 1 } : s));
                updateRow(record.id, { stats: updatedStats });
              }
            }}
          />
        );
      },
      title: 'Decimals',
      width: '100px'
    },
    {
      key: 'actions',
      render: (_: unknown, record: TableRow, index: number) => {
        if (readOnly) return null;
        if (!isRowVisible(record, index)) return null;

        const hasChildren = bodyRows.some((r, i) => i > index && r.level > record.level && r.level <= record.level + 1);

        const canAddChild = record.level < 4 && !hasChildren;
        const canIndent = record.level < 4 && index > 0;
        const canOutdent = record.level > 0 && index > 0;

        const rowMenuItems: MenuProps['items'] = [
          {
            icon: <CopyOutlined />,
            key: 'duplicate',
            label: 'Duplicate',
            onClick: () => handleDuplicateRow(record.id)
          },
          { type: 'divider' },
          {
            danger: true,
            icon: <DeleteOutlined />,
            key: 'delete',
            label: 'Delete',
            onClick: () => handleDeleteRow(record.id)
          }
        ];

        return (
          <Space size="small">
            {mode === 'socpt' && record.level === 0 && (
              <Tooltip title="Add PT under this row">
                <Button
                  icon={<PlusOutlined />}
                  size="small"
                  type="text"
                  onClick={() => addPTRow(record.id)}
                />
              </Tooltip>
            )}
            {canAddChild && (
              <Tooltip title="Add child row">
                <Button
                  icon={<PlusOutlined />}
                  size="small"
                  type="text"
                  onClick={() => handleAddRow(record.id)}
                />
              </Tooltip>
            )}
            {canIndent && (
              <Tooltip title="Indent">
                <Button
                  icon={<RightOutlined />}
                  size="small"
                  type="text"
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
                  icon={<LeftOutlined />}
                  size="small"
                  type="text"
                  onClick={() => {
                    const row = bodyRows.find(r => r.id === record.id);
                    if (row) updateRow(record.id, { level: row.level - 1 });
                  }}
                />
              </Tooltip>
            )}
            <Dropdown
              menu={{ items: rowMenuItems }}
              trigger={['click']}
            >
              <Button
                icon={<MoreOutlined />}
                size="small"
                type="text"
              />
            </Dropdown>
          </Space>
        );
      },
      title: '',
      width: '15%'
    }
  ];

  // Analysis type info
  const analysisTypeLabel = useMemo(() => {
    const typeMap: Record<string, string> = {
      AE: 'Adverse Events',
      CM: 'Concomitant Medications',
      Demographics: 'Baseline & Demographics',
      Disposition: 'Subject Disposition',
      ECG: 'ECG Measurements',
      Efficacy: 'Efficacy Endpoints',
      Laboratory: 'Laboratory Parameters',
      PK: 'Pharmacokinetics',
      'Vital Signs': 'Vital Signs'
    };
    return typeMap[analysisType || ''] || 'General';
  }, [analysisType]);

  return (
    <div className="nested-row-editor">
      {/* Toolbar */}
      <div
        className="row-editor-toolbar"
        style={{
          alignItems: 'center',
          backgroundColor: '#fafafa',
          borderRadius: 4,
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 16,
          padding: '12px'
        }}
      >
        <Space>
          {analysisType && <Tag color="blue">{analysisTypeLabel}</Tag>}
          <Text
            style={{ marginLeft: 8 }}
            type="secondary"
          >
            {bodyRows.length} {bodyRows.length === 1 ? 'row' : 'rows'}
          </Text>
        </Space>
        <Space>
          {selectedRowIds.size > 0 && (
            <>
              <Text type="secondary">{selectedRowIds.size} selected</Text>
              <Button
                size="small"
                onClick={clearSelection}
              >
                Clear
              </Button>
            </>
          )}
          <Button
            size="small"
            onClick={selectAllRows}
          >
            Select All
          </Button>
          <Button
            size="small"
            onClick={expandAll}
          >
            Expand All
          </Button>
          <Button
            size="small"
            onClick={collapseAll}
          >
            Collapse All
          </Button>
          {mode === 'socpt' ? (
            <Button
              icon={<PlusOutlined />}
              type="primary"
              onClick={addSOCRow}
            >
              Add SOC
            </Button>
          ) : (
            <Button
              icon={<PlusOutlined />}
              onClick={() => handleAddRow()}
            >
              Add Row
            </Button>
          )}
        </Space>
      </div>

      {/* Analysis type specific info */}
      {analysisType === 'AE' && (
        <div
          style={{
            backgroundColor: '#e6f7ff',
            borderRadius: 4,
            color: '#0958d9',
            fontSize: 12,
            marginBottom: 12,
            padding: 8
          }}
        >
          <Text>
            <strong>AE Mode:</strong> Use SOC (System Organ Class) rows for body systems, then add PT (Preferred Term)
            rows under each SOC for specific adverse events.
          </Text>
        </div>
      )}

      {analysisType === 'Laboratory' && (
        <div
          style={{
            backgroundColor: '#f6ffed',
            borderRadius: 4,
            color: '#cf1322',
            fontSize: 12,
            marginBottom: 12,
            padding: 8
          }}
        >
          <Text>
            <strong>Lab Mode:</strong> Build nested structure: Parameter → Visit → Statistics. Common statistics: n,
            Mean (SD), Median (Min, Max), Change from Baseline.
          </Text>
        </div>
      )}

      {/* Table */}
      <Table
        bordered
        columns={columns}
        dataSource={bodyRows}
        pagination={false}
        rowKey="id"
        scroll={{ x: 'max-content' }}
        size="small"
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
          }
        }}
        rowClassName={record => {
          const classes = [`row-level-${record.level}`];
          const statTypes = record.stats?.map(s => s.type) || [];
          if (statTypes.includes('header')) classes.push('row-header');
          if (statTypes.includes('n_percent')) classes.push('row-total');
          return classes.join(' ');
        }}
      />
    </div>
  );
}
