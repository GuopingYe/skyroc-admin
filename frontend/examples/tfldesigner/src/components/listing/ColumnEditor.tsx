import { Table, Input, Select, Button } from 'antd'
import { DeleteOutlined, HolderOutlined } from '@ant-design/icons'
import type { ListingColumn } from '../../types'

interface Props {
  columns: ListingColumn[]
  onChange: (columns: ListingColumn[]) => void
}

const alignOptions = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]

export default function ColumnEditor({ columns, onChange }: Props) {
  const handleAddColumn = () => {
    const newColumn: ListingColumn = {
      id: `col_${Date.now()}`,
      name: 'NEWVAR',
      label: 'New Column',
      width: 100,
      align: 'left',
    }
    onChange([...columns, newColumn])
  }

  const handleUpdateColumn = (id: string, updates: Partial<ListingColumn>) => {
    onChange(columns.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  const handleDeleteColumn = (id: string) => {
    onChange(columns.filter(c => c.id !== id))
  }

  return (
    <div>
      <Button type="dashed" onClick={handleAddColumn} style={{ marginBottom: 16 }}>
        Add Column
      </Button>
      <Table
        dataSource={columns}
        rowKey="id"
        size="small"
        pagination={false}
        columns={[
          {
            title: '',
            width: 30,
            render: () => <HolderOutlined style={{ cursor: 'grab', color: '#999' }} />,
          },
          {
            title: 'Variable',
            dataIndex: 'name',
            width: 120,
            render: (text, record) => (
              <Input
                value={text}
                onChange={e => handleUpdateColumn(record.id, { name: e.target.value })}
              />
            ),
          },
          {
            title: 'Label',
            dataIndex: 'label',
            render: (text, record) => (
              <Input
                value={text}
                onChange={e => handleUpdateColumn(record.id, { label: e.target.value })}
              />
            ),
          },
          {
            title: 'Width',
            dataIndex: 'width',
            width: 80,
            render: (text, record) => (
              <Input
                type="number"
                value={text}
                onChange={e => handleUpdateColumn(record.id, { width: parseInt(e.target.value) || 100 })}
              />
            ),
          },
          {
            title: 'Align',
            dataIndex: 'align',
            width: 100,
            render: (text, record) => (
              <Select
                value={text}
                options={alignOptions}
                onChange={val => handleUpdateColumn(record.id, { align: val as 'left' | 'center' | 'right' })}
              />
            ),
          },
          {
            title: '',
            width: 50,
            render: (_, record) => (
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteColumn(record.id)} />
            ),
          },
        ]}
      />
    </div>
  )
}