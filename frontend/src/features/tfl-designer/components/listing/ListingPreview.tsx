/**
 * TFL Builder - Listing Preview
 *
 * Paginated listing display with virtual scrolling support
 */
import { useState, useMemo } from 'react';
import {
  Table,
  Pagination,
  Space,
  Tag,
  Typography,
  Button,
  Tooltip,
  Select,
  Empty,
  Card,
  Statistic
} from 'antd';
import {
  DownloadOutlined,
  FullscreenOutlined,
  ReloadOutlined,
  FilterOutlined,
  SortAscendingOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ListingColumn, SortConfig, FilterConfig, ColumnHeaderGroup } from '../../types';
import { useListingStore, useStudyStore, mockPreviewData } from '../../stores';

const { Text, Title } = Typography;

interface Props {
  displayId: string;
  columns: ListingColumn[];
  sortRules: SortConfig[];
  filterRules: FilterConfig[];
  readOnly?: boolean;
}

export default function ListingPreview({
  displayId,
  columns,
  sortRules,
  filterRules,
  readOnly = false
}: Props) {
  const currentListing = useListingStore(s => s.currentListing);
  const columnHeaderSets = useStudyStore(s => s.columnHeaderSets);

  // Resolve the selected column header set (study-level nested headers)
  const selectedHeaderSet = useMemo(() => {
    if (!currentListing?.columnHeaderSetId) return null;
    return columnHeaderSets.find(s => s.id === currentListing.columnHeaderSetId) || null;
  }, [currentListing?.columnHeaderSetId, columnHeaderSets]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(currentListing?.pageSize || 10);
  const [fullscreen, setFullscreen] = useState(false);

  // Get preview data from the store's mock data based on dataset name
  const allData = useMemo(() => {
    if (!currentListing?.dataset) {
      // Fallback: generate simple mock data from columns
      return generateMockListingData(100, columns);
    }
    const datasetData = mockPreviewData[currentListing.dataset];
    if (!datasetData || datasetData.length === 0) {
      return generateMockListingData(100, columns);
    }
    // Add key to each row for React rendering
    return (datasetData as Record<string, any>[]).map((row, i) => ({ ...row, key: i.toString() }));
  }, [currentListing?.dataset, columns]);

  // Apply filters (mock implementation)
  const filteredData = useMemo(() => {
    let data = [...allData];
    filterRules.forEach(rule => {
      if (!rule.columnId || !rule.value) return;
      const col = columns.find(c => c.id === rule.columnId);
      const fieldName = col?.name || rule.columnId;
      data = data.filter(row => {
        const value = (row as Record<string, unknown>)[fieldName];
        switch (rule.operator) {
          case 'eq':
            return String(value) === String(rule.value);
          case 'ne':
            return String(value) !== String(rule.value);
          case 'contains':
            return String(value).toLowerCase().includes(String(rule.value).toLowerCase());
          case 'gt':
            return Number(value) > Number(rule.value);
          case 'lt':
            return Number(value) < Number(rule.value);
          case 'ge':
            return Number(value) >= Number(rule.value);
          case 'le':
            return Number(value) <= Number(rule.value);
          default:
            return true;
        }
      });
    });
    return data;
  }, [allData, filterRules, columns]);

  // Apply sorting (mock implementation)
  const sortedData = useMemo(() => {
    let data = [...filteredData];
    sortRules.forEach(rule => {
      const col = columns.find(c => c.id === rule.columnId);
      const fieldName = col?.name || rule.columnId;
      data.sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[fieldName];
        const bVal = (b as Record<string, unknown>)[fieldName];
        if (rule.order === 'asc') {
          return (aVal as any) > (bVal as any) ? 1 : -1;
        } else {
          return (aVal as any) < (bVal as any) ? 1 : -1;
        }
      });
    });
    return data;
  }, [filteredData, sortRules, columns]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Build table columns: from study-level header set or from listing's own columns
  const tableColumns: ColumnsType<Record<string, any>> = useMemo(() => {
    // ---- Branch A: Study-level ColumnHeaderSet ----
    if (selectedHeaderSet) {
      const buildFromGroup = (g: ColumnHeaderGroup): any => {
        // Group with children → antd column group
        if (g.children?.length) {
          return {
            title: <Text strong>{g.label}</Text>,
            key: g.id,
            children: g.children.map(buildFromGroup),
          };
        }
        // Leaf → data column
        return {
          title: <Text strong>{g.label}</Text>,
          dataIndex: g.variable || g.id,
          key: g.id,
          width: g.width || 120,
          align: g.align || 'left',
          render: (value: any) => {
            const paddingLeft = g.indentLevel ? g.indentLevel * 24 : 0;
            return (
              <div style={{ paddingLeft }}>
                <Text>{value ?? '-'}</Text>
              </div>
            );
          },
        };
      };
      return selectedHeaderSet.headers.map(buildFromGroup);
    }

    // ---- Branch B: Listing's own columns (supports children) ----
    const buildAntdColumn = (col: ListingColumn): any => {
      if (col.hidden) return null;

      if (col.children && col.children.length > 0) {
        const childColumns = col.children
          .map(child => buildAntdColumn(child))
          .filter(Boolean);
        if (childColumns.length === 0) return null;
        return {
          title: (
            <div style={{ textAlign: col.align || 'center' }}>
              <Text strong>{col.label || col.name}</Text>
            </div>
          ),
          key: col.id,
          children: childColumns,
        };
      }

      return {
        title: (
          <div style={{ textAlign: col.align }}>
            <Text strong>{col.label || col.name}</Text>
          </div>
        ),
        dataIndex: col.name,
        key: col.name,
        width: col.width || 120,
        align: col.align,
        render: (value: any, record: Record<string, any>) => {
          let displayValue = value ?? '-';

          if (col.combineFormat && col.sourceColumns?.length) {
            let formatted = col.combineFormat;
            col.sourceColumns.forEach((sourceCol, idx) => {
               const srcVal = record[sourceCol] ?? '';
               formatted = formatted.replace(new RegExp(`\\{${idx}\\}`, 'g'), String(srcVal));
            });
            displayValue = formatted;
          }

          const paddingLeft = col.indentLevel ? col.indentLevel * 24 : 0;

          return (
            <div style={{ paddingLeft }}>
               <Text>{displayValue}</Text>
            </div>
          );
        },
      };
    };

    return columns.map(buildAntdColumn).filter(Boolean);
  }, [columns, selectedHeaderSet]);

  // Row number column
  const rowNumberColumn: ColumnsType<Record<string, any>> = useMemo(() => [
    {
      title: '#',
      key: 'rowNumber',
      width: 60,
      align: 'center',
      fixed: 'left' as const,
      render: (_: unknown, __: unknown, index: number) => (
        <Text type="secondary">
          {(currentPage - 1) * pageSize + index + 1}
        </Text>
      ),
    },
    ...tableColumns
  ], [tableColumns, currentPage, pageSize]);

  // Handle export to CSV
  const handleExportCSV = () => {
    const headers = leafColumns.map(c => c.label || c.name).join(',');
    const rows = sortedData.map(row =>
      leafColumns.map(c => `"${(row as Record<string, unknown>)[c.name] || ''}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `listing_${displayId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Collect all leaf columns (flattened) for CSV export and empty check
  const leafColumns = useMemo(() => {
    const leaves: ListingColumn[] = [];
    const collect = (cols: ListingColumn[]) => {
      cols.forEach(col => {
        if (col.hidden) return;
        if (col.children?.length) {
          collect(col.children);
        } else {
          leaves.push(col);
        }
      });
    };
    collect(columns);
    return leaves;
  }, [columns]);

  if (leafColumns.length === 0) {
    return (
      <Card>
        <Empty
          description="No columns configured for this listing"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <div
      className="listing-preview"
      style={{
        position: 'relative',
        ...(fullscreen ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          backgroundColor: '#fff',
          padding: 24,
        } : {})
      }}
    >
      {/* Preview Header */}
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <Title level={5} style={{ margin: 0 }}>Listing Preview</Title>
            {fullscreen && (
              <Tag color="blue">Fullscreen</Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="Toggle Fullscreen">
              <Button
                type="text"
                icon={<FullscreenOutlined />}
                onClick={() => setFullscreen(!fullscreen)}
              />
            </Tooltip>
            <Tooltip title="Export to CSV">
              <Button
                type="text"
                icon={<DownloadOutlined />}
                onClick={handleExportCSV}
              >
                Export
              </Button>
            </Tooltip>
            <Tooltip title="Refresh Data">
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={() => setCurrentPage(1)}
              />
            </Tooltip>
          </Space>
        }
      >
        {/* Statistics */}
        <Space size="large" wrap>
          <Statistic
            title="Total Records"
            value={sortedData.length}
            prefix={<FilterOutlined />}
          />
          <Statistic
            title="Filters Applied"
            value={filterRules.length}
            prefix={<FilterOutlined />}
            valueStyle={{ color: filterRules.length > 0 ? '#cf1322' : undefined }}
          />
          <Statistic
            title="Sort Rules"
            value={sortRules.length}
            prefix={<SortAscendingOutlined />}
            valueStyle={{ color: sortRules.length > 0 ? '#1890ff' : undefined }}
          />
        </Space>

        {/* Active Filters Display */}
        {filterRules.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Text strong>Active Filters:</Text>
            <div style={{ marginTop: 4 }}>
              <Space wrap>
                {filterRules.map((rule, index) => (
                  <Tag key={`filter-${index}`} closable={!readOnly}>
                    {columns.find(c => c.id === rule.columnId)?.label || rule.columnId}{' '}
                    {rule.operator} {String(rule.value)}
                  </Tag>
                ))}
              </Space>
            </div>
          </div>
        )}

        {/* Active Sort Display */}
        {sortRules.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Text strong>Sort Order:</Text>
            <div style={{ marginTop: 4 }}>
              <Space wrap>
                {sortRules.map((rule, index) => (
                  <Tag key={`sort-${index}`} icon={<SortAscendingOutlined />}>
                    {columns.find(c => c.id === rule.columnId)?.label || rule.columnId}{' '}
                    {rule.order === 'asc' ? '\u2191' : '\u2193'}
                    {index < sortRules.length - 1 && <Text type="secondary">{'\u2192'}</Text>}
                  </Tag>
                ))}
              </Space>
            </div>
          </div>
        )}
      </Card>

      {/* Data Table */}
      <Card
        size="small"
        bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={rowNumberColumn}
          dataSource={paginatedData}
          pagination={false}
          size="small"
          bordered
          scroll={{ x: 'max-content', y: fullscreen ? 'calc(100vh - 300px)' : 500 }}
          rowClassName={(_record, index) =>
            index % 2 === 0 ? 'listing-row-even' : 'listing-row-odd'
          }
        />

        {/* Pagination */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text type="secondary">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} records
          </Text>
          <Space>
            <Text type="secondary">Rows per page:</Text>
            <Select
              value={pageSize}
              onChange={handlePageSizeChange}
              options={[10, 20, 50, 100].map(size => ({
                label: size.toString(),
                value: size,
              }))}
              style={{ width: 80 }}
            />
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={sortedData.length}
              onChange={setCurrentPage}
              showSizeChanger={false}
              showQuickJumper
            />
          </Space>
        </div>
      </Card>
    </div>
  );
}

// Fallback mock data generator when no real dataset is available
function generateMockListingData(count: number, columns: ListingColumn[]) {
  // Flatten to leaf columns only
  const leaves: ListingColumn[] = [];
  const collect = (cols: ListingColumn[]) => {
    cols.forEach(col => {
      if (col.hidden) return;
      if (col.children?.length) {
        collect(col.children);
      } else {
        leaves.push(col);
      }
    });
  };
  collect(columns);

  return Array.from({ length: count }, (_, i) => {
    const row: Record<string, any> = { key: i.toString() };
    leaves.forEach(col => {
      row[col.name] = `Value ${i}`;
    });
    return row;
  });
}
