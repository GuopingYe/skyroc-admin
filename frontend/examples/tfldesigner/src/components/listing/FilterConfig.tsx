import { useCallback, useMemo } from 'react'
import { Card, Table, Select, Button, Space, Popconfirm, Input, Tooltip, Tag, Divider } from 'antd'
import { DeleteOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons'
import type { FilterConfig, ListingColumn } from '../../types'
import { useListingStore, filterOperatorOptions } from '../../stores/listingStore'
import type { ColumnsType } from 'antd/es/table'

interface FilterConfigProps {
  filter: FilterConfig[]
  columns: ListingColumn[]
}

// Operators that don't require a value input
const NULL_OPERATORS = ['is_null', 'not_null']

// Operators that accept list values
const LIST_OPERATORS = ['in']

export default function FilterConfigEditor({ filter, columns }: FilterConfigProps) {
  const { addFilter, updateFilter, deleteFilter } = useListingStore()
  
  const handleAddFilter = useCallback(() => {
    if (columns.length > 0) {
      addFilter({ 
        columnId: columns[0].id, 
        operator: 'eq',
        value: '' 
      })
    }
  }, [addFilter, columns])
  
  const handleColumnChange = useCallback((index: number, columnId: string) => {
    updateFilter(index, { columnId, value: '' }) // Reset value when column changes
  }, [updateFilter])
  
  const handleOperatorChange = useCallback((index: number, operator: FilterConfig['operator']) => {
    const updates: Partial<FilterConfig> = { operator }
    
    // Clear value if switching to null operator
    if (NULL_OPERATORS.includes(operator)) {
      updates.value = ''
    }
    // Convert to array for 'in' operator
    else if (LIST_OPERATORS.includes(operator)) {
      const currentValue = filter[index]?.value
      if (typeof currentValue === 'string') {
        updates.value = currentValue ? currentValue.split(',').map(v => v.trim()) : []
      }
    }
    // Convert back to string for other operators
    else {
      const currentValue = filter[index]?.value
      if (Array.isArray(currentValue)) {
        updates.value = currentValue.join(',')
      }
    }
    
    updateFilter(index, updates)
  }, [updateFilter, filter])
  
  const handleValueChange = useCallback((index: number, value: string | string[]) => {
    updateFilter(index, { value })
  }, [updateFilter])
  
  const handleDelete = useCallback((index: number) => {
    deleteFilter(index)
  }, [deleteFilter])
  
  const getColumnName = useCallback((columnId: string) => {
    const col = columns.find(c => c.id === columnId)
    return col ? col.name : columnId
  }, [columns])
  
  const needsValueInput = useCallback((operator: string) => {
    return !NULL_OPERATORS.includes(operator)
  }, [])
  
  const tableColumns: ColumnsType<FilterConfig> = [
    {
      title: '#',
      key: 'index',
      width: 40,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Column',
      dataIndex: 'columnId',
      key: 'columnId',
      width: 180,
      render: (columnId: string, _, index) => (
        <Select
          value={columnId}
          onChange={(val) => handleColumnChange(index, val)}
          style={{ width: '100%' }}
          showSearch
          optionFilterProp="label"
          options={columns.map(c => ({
            value: c.id,
            label: `${c.name} (${c.label})`,
          }))}
        />
      ),
    },
    {
      title: 'Operator',
      dataIndex: 'operator',
      key: 'operator',
      width: 160,
      render: (operator: FilterConfig['operator'], _, index) => (
        <Select
          value={operator}
          onChange={(val) => handleOperatorChange(index, val)}
          style={{ width: '100%' }}
          options={filterOperatorOptions}
        />
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (value: string | string[], record: FilterConfig, index) => {
        if (!needsValueInput(record.operator)) {
          return <span style={{ color: '#999' }}>-</span>
        }
        
        if (LIST_OPERATORS.includes(record.operator)) {
          // For 'in' operator, show input for comma-separated values
          const displayValue = Array.isArray(value) ? value.join(', ') : value
          return (
            <Tooltip title="Enter comma-separated values">
              <Input
                value={displayValue}
                onChange={(e) => handleValueChange(index, e.target.value)}
                placeholder="value1, value2, value3"
              />
            </Tooltip>
          )
        }
        
        return (
          <Input
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleValueChange(index, e.target.value)}
            placeholder="Filter value"
          />
        )
      },
    },
    {
      title: 'Preview',
      key: 'preview',
      width: 200,
      render: (_, record: FilterConfig) => {
        const columnName = getColumnName(record.columnId)
        const operatorLabel = filterOperatorOptions.find(o => o.value === record.operator)?.label || record.operator
        
        let preview: string
        if (NULL_OPERATORS.includes(record.operator)) {
          preview = `${columnName} ${operatorLabel}`
        } else if (Array.isArray(record.value)) {
          preview = `${columnName} ${operatorLabel} [${record.value.join(', ')}]`
        } else {
          preview = `${columnName} ${operatorLabel} "${record.value || '?'}"`
        }
        
        return (
          <Tooltip title={preview}>
            <Tag color="blue" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {preview}
            </Tag>
          </Tooltip>
        )
      },
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, __, index) => (
        <Popconfirm
          title="Remove this filter?"
          onConfirm={() => handleDelete(index)}
        >
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]
  
  const filterSummary = useMemo(() => {
    if (filter.length === 0) return null
    
    return filter.map((f, i) => {
      const columnName = getColumnName(f.columnId)
      const opLabel = filterOperatorOptions.find(o => o.value === f.operator)?.label || f.operator
      
      let valueStr = ''
      if (!NULL_OPERATORS.includes(f.operator)) {
        valueStr = Array.isArray(f.value) 
          ? ` [${f.value.join(', ')}]`
          : f.value ? ` "${f.value}"` : ' "?"'
      }
      
      return (
        <Tag key={i} color="blue" style={{ marginBottom: 4 }}>
          {columnName} {opLabel}{valueStr}
        </Tag>
      )
    })
  }, [filter, getColumnName])
  
  return (
    <Card 
      title={
        <Space>
          <span>Filter Conditions</span>
          <Tooltip title="Filters are applied with AND logic - all conditions must be met">
            <InfoCircleOutlined style={{ color: '#999' }} />
          </Tooltip>
        </Space>
      }
      size="small"
      extra={
        <Button 
          type="dashed" 
          size="small" 
          icon={<PlusOutlined />} 
          onClick={handleAddFilter}
          disabled={columns.length === 0}
        >
          Add Filter
        </Button>
      }
    >
      {filter.length === 0 ? (
        <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>
          No filters applied. All records will be included.
        </div>
      ) : (
        <>
          <Table
            dataSource={filter}
            columns={tableColumns}
            rowKey={(_, index) => `filter_${index}`}
            pagination={false}
            size="small"
          />
          <Divider style={{ margin: '12px 0' }} />
          <div>
            <strong>Filter Summary (AND logic):</strong>
            <div style={{ marginTop: 8 }}>
              {filterSummary}
            </div>
          </div>
        </>
      )}
    </Card>
  )
}