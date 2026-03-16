import { Table, Select, Button, Typography } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { SortConfig } from '../../types'

const { Text } = Typography

interface Props {
  sorts: SortConfig[]
  onChange: (sorts: SortConfig[]) => void
  columns: { id: string; name: string; label: string }[]
}

export default function SortConfigEditor({ sorts, onChange, columns }: Props) {
  const handleAddSort = () => {
    const newSort: SortConfig = {
      columnId: columns[0]?.id || '',
      order: 'asc',
      priority: sorts.length + 1,
    }
    onChange([...sorts, newSort])
  }

  const handleUpdateSort = (index: number, updates: Partial<SortConfig>) => {
    const newSorts = [...sorts]
    newSorts[index] = { ...newSorts[index], ...updates }
    onChange(newSorts)
  }

  const handleDeleteSort = (index: number) => {
    onChange(sorts.filter((_, i) => i !== index))
  }

  const orderOptions = [
    { value: 'asc', label: 'Ascending' },
    { value: 'desc', label: 'Descending' },
  ]

  const columnOptions = columns.map(c => ({ value: c.id, label: `${c.name} - ${c.label}` }))

  return (
    <div>
      <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddSort} style={{ marginBottom: 16 }}>
        Add Sort
      </Button>
      
      {sorts.length === 0 ? (
        <Text type="secondary">No sorting configured</Text>
      ) : (
        <Table
          dataSource={sorts.map((s, i) => ({ ...s, key: i }))}
          size="small"
          pagination={false}
          columns={[
            {
              title: 'Priority',
              dataIndex: 'priority',
              width: 80,
              render: (text) => <Text>{text}</Text>,
            },
            {
              title: 'Column',
              dataIndex: 'columnId',
              render: (text, _, index) => (
                <Select
                  value={text}
                  options={columnOptions}
                  onChange={val => handleUpdateSort(index, { columnId: val })}
                  style={{ width: '100%' }}
                />
              ),
            },
            {
              title: 'Order',
              dataIndex: 'order',
              width: 120,
              render: (text, _, index) => (
                <Select
                  value={text}
                  options={orderOptions}
                  onChange={val => handleUpdateSort(index, { order: val as 'asc' | 'desc' })}
                />
              ),
            },
            {
              title: '',
              width: 50,
              render: (_, __, index) => (
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteSort(index)} />
              ),
            },
          ]}
        />
      )}
    </div>
  )
}