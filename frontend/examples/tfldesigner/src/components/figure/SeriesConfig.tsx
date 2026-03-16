import { Card, Table, Input, Button, Select } from 'antd'
import { PlusOutlined, DeleteOutlined, HolderOutlined } from '@ant-design/icons'
import type { ChartSeries } from '../../types'

interface Props {
  series: ChartSeries[]
  onAdd: () => void
  onUpdate: (id: string, updates: Partial<ChartSeries>) => void
  onRemove: (id: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
}

const COLORS = ['#1890ff', '#52c41a', '#ff4d4f', '#faad14', '#722ed1', '#13c2c2']

export default function SeriesConfig({ series, onAdd, onUpdate, onRemove }: Props) {
  return (
    <Card 
      title="Data Series" 
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>Add Series</Button>}
    >
      <Table
        dataSource={series}
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
            title: 'Name',
            dataIndex: 'name',
            render: (text, record) => (
              <Input value={text} onChange={e => onUpdate(record.id, { name: e.target.value })} />
            ),
          },
          {
            title: 'Color',
            dataIndex: 'color',
            width: 80,
            render: (color, record, index) => (
              <input
                type="color"
                value={color || COLORS[index % COLORS.length]}
                onChange={e => onUpdate(record.id, { color: e.target.value })}
                style={{ width: 40, height: 30, border: 'none', cursor: 'pointer' }}
              />
            ),
          },
          {
            title: 'Marker',
            width: 100,
            render: (_, record) => (
              <Select
                value={record.marker?.symbol || 'circle'}
                options={[
                  { value: 'circle', label: '● Circle' },
                  { value: 'square', label: '■ Square' },
                  { value: 'triangle', label: '▲ Triangle' },
                  { value: 'diamond', label: '◆ Diamond' },
                ]}
                onChange={val => onUpdate(record.id, { marker: { ...record.marker, symbol: val } })}
              />
            ),
          },
          {
            title: '',
            width: 50,
            render: (_, record) => (
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onRemove(record.id)} />
            ),
          },
        ]}
      />
    </Card>
  )
}