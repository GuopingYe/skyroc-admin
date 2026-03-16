import { useMemo, useState } from 'react'
import { Table, Pagination, Card, Empty, Tag, Space, Button, Alert } from 'antd'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ListingColumn, SortConfig, FilterConfig } from '../../types'
import { mockPreviewData } from '../../stores/listingStore'
import type { ColumnsType } from 'antd/es/table'

interface ListingPreviewProps {
  listingNumber: string
  title: string
  population: string
  dataset: string
  columns: ListingColumn[]
  sortBy?: SortConfig[]
  filter?: FilterConfig[]
  pageSize?: number
}

export default function ListingPreview({
  listingNumber,
  title,
  population,
  dataset,
  columns,
  sortBy = [],
  filter = [],
  pageSize = 20,
}: ListingPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [currentPageSize, setCurrentPageSize] = useState(pageSize)
  
  // Get raw data for the dataset
  const rawData = useMemo(() => {
    return mockPreviewData[dataset] || []
  }, [dataset])
  
  // Apply filters
  const filteredData = useMemo(() => {
    if (filter.length === 0) return rawData
    
    return rawData.filter(row => {
      return filter.every(f => {
        const column = columns.find(c => c.id === f.columnId)
        if (!column) return true
        
        const rowValue = (row as Record<string, unknown>)[column.name]
        const filterValue = f.value
        const operator = f.operator
        
        // Handle null operators
        if (operator === 'is_null') {
          return rowValue === null || rowValue === undefined || rowValue === ''
        }
        if (operator === 'not_null') {
          return rowValue !== null && rowValue !== undefined && rowValue !== ''
        }
        
        // Convert to string for comparison
        const strValue = String(rowValue ?? '').toLowerCase()
        const compareValue = Array.isArray(filterValue) 
          ? filterValue.map(v => String(v).toLowerCase())
          : String(filterValue ?? '').toLowerCase()
        
        switch (operator) {
          case 'eq':
            return strValue === compareValue
          case 'ne':
            return strValue !== compareValue
          case 'gt':
            return parseFloat(strValue) > parseFloat(compareValue as string)
          case 'lt':
            return parseFloat(strValue) < parseFloat(compareValue as string)
          case 'ge':
            return parseFloat(strValue) >= parseFloat(compareValue as string)
          case 'le':
            return parseFloat(strValue) <= parseFloat(compareValue as string)
          case 'contains':
            return strValue.includes(compareValue as string)
          case 'in':
            return Array.isArray(compareValue) && compareValue.includes(strValue)
          default:
            return true
        }
      })
    })
  }, [rawData, filter, columns])
  
  // Apply sorting
  const sortedData = useMemo(() => {
    if (sortBy.length === 0) return filteredData
    
    return [...filteredData].sort((a, b) => {
      for (const sort of sortBy) {
        const column = columns.find(c => c.id === sort.columnId)
        if (!column) continue
        
        const aVal = (a as Record<string, unknown>)[column.name]
        const bVal = (b as Record<string, unknown>)[column.name]
        
        // Handle nulls
        if (aVal === null || aVal === undefined || aVal === '') {
          if (bVal === null || bVal === undefined || bVal === '') continue
          return sort.order === 'asc' ? -1 : 1
        }
        if (bVal === null || bVal === undefined || bVal === '') {
          return sort.order === 'asc' ? 1 : -1
        }
        
        // Compare values
        let comparison = 0
        const aStr = String(aVal)
        const bStr = String(bVal)
        
        // Try numeric comparison first
        const aNum = parseFloat(aStr)
        const bNum = parseFloat(bStr)
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          comparison = aNum - bNum
        } else {
          comparison = aStr.localeCompare(bStr)
        }
        
        if (comparison !== 0) {
          return sort.order === 'asc' ? comparison : -comparison
        }
      }
      return 0
    })
  }, [filteredData, sortBy, columns])
  
  // Generate table columns for preview
  const tableColumns: ColumnsType<Record<string, unknown>> = useMemo(() => {
    return columns
      .filter(c => !c.hidden)
      .map((col) => ({
        title: col.label,
        dataIndex: col.name,
        key: col.name,
        width: col.width,
        align: col.align,
        ellipsis: true,
        render: (value: unknown) => {
          if (value === null || value === undefined || value === '') {
            return <span style={{ color: '#ccc' }}>-</span>
          }
          // Format numbers
          if (typeof value === 'number') {
            return value.toLocaleString()
          }
          return String(value)
        },
      }))
  }, [columns])
  
  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * currentPageSize
    return sortedData.slice(start, start + currentPageSize)
  }, [sortedData, currentPage, currentPageSize])
  
  const handlePageChange = (page: number, newPageSize: number) => {
    setCurrentPage(page)
    setCurrentPageSize(newPageSize)
  }
  
  const handleExport = () => {
    // Generate CSV
    const headers = columns.filter(c => !c.hidden).map(c => c.label).join(',')
    const rows = sortedData.map(row => 
      columns
        .filter(c => !c.hidden)
        .map(c => {
          const val = (row as Record<string, unknown>)[c.name]
          const str = val === null || val === undefined ? '' : String(val)
          // Escape quotes and wrap in quotes if contains comma
          return str.includes(',') || str.includes('"') 
            ? `"${str.replace(/"/g, '""')}"` 
            : str
        })
        .join(',')
    )
    
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${listingNumber.replace(/\s+/g, '_')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }
  
  if (columns.filter(c => !c.hidden).length === 0) {
    return (
      <Card>
        <Empty description="No columns configured. Add columns in the Columns tab." />
      </Card>
    )
  }
  
  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{listingNumber}: {title}</h2>
        <div style={{ color: '#666', marginTop: 4 }}>
          Population: <Tag color="blue">{population}</Tag>
          Dataset: <Tag color="green">{dataset}</Tag>
        </div>
      </div>
      
      {/* Filter/Sort Summary */}
      {(filter.length > 0 || sortBy.length > 0) && (
        <Alert
          type="info"
          style={{ marginBottom: 12 }}
          message={
            <Space split={<span style={{ color: '#ccc' }}>|</span>}>
              {filter.length > 0 && (
                <span>
                  <strong>Filters:</strong> {filter.length} condition{filter.length > 1 ? 's' : ''} applied
                </span>
              )}
              {sortBy.length > 0 && (
                <span>
                  <strong>Sorted by:</strong> {sortBy.map(s => {
                    const col = columns.find(c => c.id === s.columnId)
                    return col ? `${col.label} (${s.order === 'asc' ? '↑' : '↓'})` : ''
                  }).join(', ')}
                </span>
              )}
            </Space>
          }
        />
      )}
      
      {/* Toolbar */}
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ color: '#666' }}>
          Showing {paginatedData.length} of {sortedData.length} records
          {filter.length > 0 && ` (filtered from ${rawData.length})`}
        </div>
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => setCurrentPage(1)}
          >
            Refresh
          </Button>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={handleExport}
          >
            Export CSV
          </Button>
        </Space>
      </div>
      
      {/* Preview Table */}
      <Table
        dataSource={paginatedData.map((row, idx) => ({ ...(row as Record<string, unknown>), key: idx }))}
        columns={tableColumns}
        pagination={false}
        size="small"
        bordered
        scroll={{ x: 'max-content' }}
      />
      
      {/* Pagination */}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Pagination
          current={currentPage}
          pageSize={currentPageSize}
          total={sortedData.length}
          onChange={handlePageChange}
          showSizeChanger
          showQuickJumper
          showTotal={(total, range) => 
            `${range[0]}-${range[1]} of ${total} records`
          }
          pageSizeOptions={['10', '20', '50', '100']}
        />
      </div>
    </div>
  )
}