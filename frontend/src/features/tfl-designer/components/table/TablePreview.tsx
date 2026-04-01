/**
 * TFL Builder - Table Preview
 *
 * WYSIWYG table preview with dynamic column generation from treatment arms Real-time updates from table configuration
 *
 * Migrated from Redux `useTflBuilderStore` to Zustand `useTableStore`. Uses TableShell model instead of ARS document
 * display model.
 */
import { EditOutlined } from '@ant-design/icons';
import { Card, Empty, Input, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';

import { useStudyStore, useTableStore } from '../../stores';
import type { ColumnHeaderGroup, TableRow } from '../../types';

const { Text } = Typography;

interface Props {
  displayId?: string;
}

export default function TablePreview({ displayId: _displayId }: Props) {
  const currentTable = useTableStore(s => s.currentTable);
  const updateRow = useTableStore(s => s.updateRow);
  const treatmentArmSets = useStudyStore(s => s.treatmentArmSets);
  const columnHeaderSets = useStudyStore(s => s.columnHeaderSets);

  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // Get body rows from current table (the TableShell model stores rows directly)
  const bodyRows = useMemo(() => {
    if (!currentTable) return [];
    return currentTable.rows || [];
  }, [currentTable]);

  // Get treatment arms for the current table's treatmentArmSetId
  const treatmentArmSet = useMemo(() => {
    if (!currentTable) return null;
    return treatmentArmSets.find(tas => tas.id === currentTable.treatmentArmSetId) || null;
  }, [currentTable, treatmentArmSets]);

  const treatmentArms = treatmentArmSet?.arms || [];

  // Resolve column header set: explicit columnHeaderSetId > treatmentArmSet.headers > fallback to arms
  const selectedHeaderSet = useMemo((): { headers: ColumnHeaderGroup[] } | null => {
    if (!currentTable) return null;
    // 1. Explicit study-level column header set
    if (currentTable.columnHeaderSetId) {
      const chs = columnHeaderSets.find(s => s.id === currentTable.columnHeaderSetId);
      if (chs) return chs;
    }
    // 2. Treatment arm set's embedded headers
    if (treatmentArmSet?.headers?.length) {
      return { headers: treatmentArmSet.headers, id: treatmentArmSet.id, name: treatmentArmSet.name } as any;
    }
    return null;
  }, [currentTable, currentTable?.columnHeaderSetId, columnHeaderSets, treatmentArmSet]);

  // Collect leaf column IDs for data cell generation
  const leafColumns = useMemo((): Array<{ groupingId: string; id: string }> => {
    if (!currentTable) return [];
    const collectLeaves = (groups: ColumnHeaderGroup[]): Array<{ groupingId: string; id: string }> => {
      const result: Array<{ groupingId: string; id: string }> = [];
      groups.forEach(g => {
        if (g.children?.length) {
          result.push(...collectLeaves(g.children));
        } else if (g.variable) {
          result.push({ groupingId: g.variable, id: g.id });
        }
      });
      return result;
    };

    if (selectedHeaderSet) {
      return collectLeaves(selectedHeaderSet.headers);
    }
    if (currentTable?.headerLayers && currentTable.headerLayers.length > 0) {
      const lastLayer = currentTable.headerLayers[currentTable.headerLayers.length - 1];
      return lastLayer.cells.map(cell => ({ groupingId: cell.id, id: cell.id }));
    }
    return treatmentArms.map(arm => ({ groupingId: arm.id, id: `cell-${arm.id}` }));
  }, [currentTable, selectedHeaderSet, treatmentArms]);

  const titleText = currentTable?.title || null;
  const footnoteSection = currentTable?.footer || null;

  // Flatten body rows for table display (handle children)
  const flattenedRows = useMemo(() => {
    const rows: Array<{
      indent: number;
      key: string;
      level: number;
      row: TableRow;
    }> = [];

    const flattenRow = (row: TableRow, level: number = 0, indent: number = 0): void => {
      rows.push({
        indent,
        key: row.id,
        level,
        row
      });

      // Process children if expanded
      if (row.children && row.expanded !== false) {
        row.children.forEach(child => {
          flattenRow(child, level + 1, indent + 1);
        });
      }
    };

    bodyRows.forEach(row => flattenRow(row));
    return rows;
  }, [bodyRows]);

  // Helper to replace placeholders like $1, $2, ^
  const processHeaderText = (text: string) => {
    if (!text) return text;
    let processed = text;
    treatmentArms.forEach((arm, idx) => {
      // Replace $1, $2 etc with arm name
      processed = processed.replace(new RegExp(`\\$${idx + 1}\\b`, 'g'), arm.name);
      // Replace ^ with (N=XX) if N is available for that specific arm mapped to this column
      // (This is a simplified global replace for ^ since we don't know exactly which arm a free-text cell maps to)
      // A more robust implementation would tie the ^ to the specific data column's arm, but this works for simple cases.
    });
    // Global ^ replacement
    if (processed.includes('^')) {
      // Try to find if this column maps directly to an order
      const match = text.match(/\$(\d+)/);
      if (match) {
        const armIdx = Number.parseInt(match[1]) - 1;
        const arm = treatmentArms[armIdx];
        if (arm && arm.N) {
          processed = processed.replace(/\^/g, `(N=${arm.N})`);
        } else {
          processed = processed.replace(/\^/g, '(N=XX)');
        }
      } else {
        processed = processed.replace(/\^/g, '(N=XX)');
      }
    }
    return processed;
  };

  // Get nested column headers for grouping
  const nestedColumns = useMemo(() => {
    const columns: any[] = [
      {
        dataIndex: 'drag',
        fixed: 'left' as const,
        key: 'drag',
        title: '',
        width: 40
      },
      {
        dataIndex: 'label',
        fixed: 'left' as const,
        key: 'label',
        title: 'Parameter',
        width: 250
      }
    ];

    if (selectedHeaderSet) {
      // Build from study-level ColumnHeaderSet
      const buildFromGroup = (g: ColumnHeaderGroup): any => {
        if (g.children?.length) {
          return {
            align: 'center',
            children: g.children.map(buildFromGroup),
            key: g.id,
            title: g.label
          };
        }
        return {
          align: g.align || 'center',
          dataIndex: g.variable || g.id,
          key: g.id,
          title: g.label,
          width: g.width || 150
        };
      };
      columns.push(...selectedHeaderSet.headers.map(buildFromGroup));
    } else if (currentTable?.headerLayers && currentTable.headerLayers.length > 0) {
      // Build antd column groups from headerLayers
      const buildAntdColumns = (layerIndex: number, startIndex: number, endIndex: number): any[] => {
        if (layerIndex >= currentTable.headerLayers!.length) return [];
        const layer = currentTable.headerLayers![layerIndex];
        const result = [];
        let currentCellIndex = startIndex;

        for (const cell of layer.cells) {
          const colSpan = cell.colspan || 1;
          const isLastLayer = layerIndex === currentTable.headerLayers!.length - 1;

          const colDef: any = {
            align: 'center',
            title: processHeaderText(cell.text)
          };

          if (isLastLayer) {
            colDef.dataIndex = cell.id;
            colDef.key = cell.id;
            colDef.width = 150;
          } else {
            colDef.children = buildAntdColumns(layerIndex + 1, currentCellIndex, currentCellIndex + colSpan);
          }
          result.push(colDef);
          currentCellIndex += colSpan;

          if (currentCellIndex >= endIndex && endIndex !== -1) break;
        }
        return result;
      };

      const dynamicCols = buildAntdColumns(0, 0, -1);
      columns.push(...dynamicCols);
    } else {
      // Default: columns for each treatment arm
      treatmentArms.forEach(arm => {
        columns.push({
          align: 'center',
          dataIndex: arm.id,
          key: arm.id,
          title: arm.N ? `${arm.name} (N=${arm.N})` : arm.name,
          width: 150
        });
      });
    }

    return columns as ColumnsType<any>;
  }, [currentTable?.headerLayers, treatmentArms, selectedHeaderSet]);

  // Generate mock data specific to formats
  const renderMockValue = (statType: string, isTotal: boolean) => {
    if (statType === 'n') return 'XX';
    if (statType === 'mean') return 'XX.X (X.XX)';
    if (statType === 'sd') return 'X.XX';
    if (statType === 'median') return 'XX.X';
    if (statType === 'min') return 'XX.X';
    if (statType === 'max') return 'XX.X';
    if (statType === 'range') return 'XX.X, XX.X';
    if (statType === 'n_percent') return isTotal ? 'XX' : 'XX (XX.X%)';
    return 'XX.X'; // fallback
  };

  // Generate table data
  const tableData = useMemo(() => {
    let socCounter = 0;

    return flattenedRows.map(({ level, row }) => {
      let displayLabel = row.label;

      // Smart placeholder replacement for context-awareness if label is empty/generic
      if (!displayLabel || displayLabel.trim() === 'New Row' || displayLabel.trim() === 'New Row (copy)') {
        if (row.analysisOfInterest === 'SOC' || row.isSOC) {
          socCounter++;
          displayLabel = `System Organ Class ${socCounter}`;
        } else if (level > 0) {
          displayLabel = `${'  '.repeat(level)}Parameter ${level}`;
        }
      }

      const data: Record<string, unknown> = {
        key: row.id,
        label: displayLabel,
        level,
        originalLabel: row.label
      };

      // Add placeholder cells for each treatment arm / data column
      leafColumns.forEach(cell => {
        // Use stats type to generate display text
        const statTypes = row.stats?.map(s => s.type) || [];
        const isHeader = statTypes.includes('header');
        const isTotal = statTypes.includes('n_percent') && level === 0;

        if (isHeader) {
          data[cell.groupingId] = '';
        } else if (statTypes.length > 0) {
          data[cell.groupingId] = statTypes.map(t => renderMockValue(t, isTotal)).join(' ');
        } else {
          data[cell.groupingId] = isTotal ? 'XX' : 'XX (XX.X%)'; // default clinical stat
        }
      });

      return data;
    });
  }, [flattenedRows, leafColumns]);

  // Render cell content with proper formatting and bidirectional inline editing
  const renderCell = (text: string, record: any, dataIndex?: string) => {
    if (!record) return text;
    const level = record.level || 0;
    const isEditing = editingRowId === record.key && dataIndex === 'label';
    const isLabelCol = dataIndex === 'label';
    const row = bodyRows.find(r => r.id === record.key) || { stats: [] };
    const statTypes = row.stats?.map((s: any) => s.type) || [];
    const isHeader = statTypes.includes('header');

    // Total row usually level 0 with n_percent
    const isTotal = statTypes.includes('n_percent') && level === 0;

    if (isEditing) {
      return (
        <Input
          autoFocus
          defaultValue={record.originalLabel.trimStart()}
          size="small"
          onBlur={e => {
            const val = e.target.value;
            const prefix = level > 0 ? '  '.repeat(level) : '';
            updateRow(record.key, { label: prefix + val });
            setEditingRowId(null);
          }}
          onPressEnter={e => {
            const val = e.currentTarget.value;
            const prefix = level > 0 ? '  '.repeat(level) : '';
            updateRow(record.key, { label: prefix + val });
            setEditingRowId(null);
          }}
        />
      );
    }

    return (
      <div
        className={isLabelCol ? 'preview-label-cell' : ''}
        style={{
          alignItems: 'center',
          cursor: isLabelCol ? 'text' : 'default',
          display: 'flex',
          fontWeight: isHeader || isTotal ? 'bold' : 'normal',
          justifyContent: isLabelCol ? 'space-between' : 'center',
          paddingLeft: isLabelCol ? level * 20 : 0
        }}
        onClick={() => {
          if (isLabelCol) setEditingRowId(record.key);
        }}
        onMouseEnter={e => {
          if (isLabelCol) {
            const icon = e.currentTarget.querySelector('.edit-icon');
            if (icon) (icon as HTMLElement).style.opacity = '1';
          }
        }}
        onMouseLeave={e => {
          if (isLabelCol) {
            const icon = e.currentTarget.querySelector('.edit-icon');
            if (icon) (icon as HTMLElement).style.opacity = '0';
          }
        }}
      >
        <span>{text}</span>
        {isLabelCol && (
          <EditOutlined
            className="edit-icon"
            style={{ color: '#1890ff', marginLeft: 8, opacity: 0, transition: 'opacity 0.2s' }}
          />
        )}
      </div>
    );
  };

  if (!currentTable) {
    return (
      <Card size="small">
        <Empty description="No table selected" />
      </Card>
    );
  }

  return (
    <div>
      <Table
        bordered
        columns={nestedColumns}
        dataSource={tableData}
        pagination={false}
        rowKey="key"
        scroll={{ x: 'max-content' }}
        size="small"
        components={{
          body: {
            cell: ({ children, dataIndex, record, ...props }: any) => {
              // antd may pass record as undefined for header/summary rows
              if (!record) return <td {...props}>{children}</td>;
              return <td {...props}>{renderCell(children as string, record, dataIndex)}</td>;
            }
          }
        }}
      />
    </div>
  );
}
