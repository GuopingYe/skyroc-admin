import { useState, useMemo } from 'react'
import {
  Card,
  Table,
  Input,
  Button,
  Space,
  Popconfirm,
  Divider,
  Typography,
  Tooltip,
  Select,
  Alert,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  FolderOutlined,
} from '@ant-design/icons'
import type { TreatmentArmSet, TreatmentArm } from '../../types'

const { Text, Title } = Typography

interface Props {
  treatmentArmSet: TreatmentArmSet
  onChange: (set: TreatmentArmSet) => void
}

export default function TreatmentArmEditor({ treatmentArmSet, onChange }: Props) {
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(treatmentArmSet.name)

  // Get unique groupings
  const groupings = useMemo(() => {
    const set = new Set<string>()
    treatmentArmSet.arms.forEach(arm => {
      if (arm.grouping) set.add(arm.grouping)
    })
    return Array.from(set)
  }, [treatmentArmSet.arms])

  const handleAddArm = () => {
    const newArm: TreatmentArm = {
      id: `arm_${Date.now()}`,
      name: `Treatment ${treatmentArmSet.arms.length + 1}`,
      order: treatmentArmSet.arms.length + 1,
      N: 'XX',
    }
    onChange({
      ...treatmentArmSet,
      arms: [...treatmentArmSet.arms, newArm],
    })
  }

  const handleUpdateArm = (armId: string, updates: Partial<TreatmentArm>) => {
    onChange({
      ...treatmentArmSet,
      arms: treatmentArmSet.arms.map(arm =>
        arm.id === armId ? { ...arm, ...updates } : arm
      ),
    })
  }

  const handleDeleteArm = (armId: string) => {
    onChange({
      ...treatmentArmSet,
      arms: treatmentArmSet.arms.filter(arm => arm.id !== armId),
    })
  }

  const handleMoveArm = (armId: string, direction: 'up' | 'down') => {
    const index = treatmentArmSet.arms.findIndex(arm => arm.id === armId)
    if (index < 0) return

    const newArms = [...treatmentArmSet.arms]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newArms.length) return

    // Swap
    ;[newArms[index], newArms[targetIndex]] = [newArms[targetIndex], newArms[index]]
    
    // Update order
    newArms.forEach((arm: TreatmentArm, i: number) => {
      arm.order = i + 1
    })

    onChange({ ...treatmentArmSet, arms: newArms })
  }

  const handleSaveName = () => {
    onChange({ ...treatmentArmSet, name: newName })
    setEditingName(false)
  }

  const columns = [
    {
      title: 'Order',
      dataIndex: 'order',
      key: 'order',
      width: 60,
      render: (value: number) => (
        <Text type="secondary">{value}</Text>
      ),
    },
    {
      title: 'Treatment Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: TreatmentArm) => (
        <Input
          value={text}
          placeholder="e.g., Placebo"
          onChange={(e) => handleUpdateArm(record.id, { name: e.target.value })}
        />
      ),
    },
    {
      title: 'Grouping',
      dataIndex: 'grouping',
      key: 'grouping',
      width: 150,
      render: (text: string, record: TreatmentArm) => (
        <Select
          value={text || undefined}
          placeholder="Select or type"
          allowClear
          mode="tags"
          maxCount={1}
          style={{ width: '100%' }}
          options={groupings.map(g => ({ value: g, label: g }))}
          onChange={(values) => {
            const val = Array.isArray(values) ? values[0] : values
            handleUpdateArm(record.id, { grouping: val || undefined })
          }}
        />
      ),
    },
    {
      title: 'N (Sample Size)',
      dataIndex: 'N',
      key: 'N',
      width: 120,
      render: (value: number | string, record: TreatmentArm) => (
        <Input
          value={String(value)}
          placeholder="XX"
          style={{ width: 80 }}
          onChange={(e) => {
            const val = e.target.value
            handleUpdateArm(record.id, { 
              N: val === '' ? 'XX' : (isNaN(Number(val)) ? val : Number(val))
            })
          }}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: TreatmentArm, index: number) => (
        <Space size="small">
          <Tooltip title="Move up">
            <Button
              type="text"
              size="small"
              icon="↑"
              disabled={index === 0}
              onClick={() => handleMoveArm(record.id, 'up')}
            />
          </Tooltip>
          <Tooltip title="Move down">
            <Button
              type="text"
              size="small"
              icon="↓"
              disabled={index === treatmentArmSet.arms.length - 1}
              onClick={() => handleMoveArm(record.id, 'down')}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this treatment arm?"
            onConfirm={() => handleDeleteArm(record.id)}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // Preview of column structure
  const columnPreview = useMemo(() => {
    const groups = new Map<string | undefined, TreatmentArm[]>()
    treatmentArmSet.arms.forEach(arm => {
      const key = arm.grouping
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(arm)
    })
    
    const parts: string[] = []
    groups.forEach((arms, grouping) => {
      if (grouping) {
        parts.push(`${grouping}: [${arms.map(a => a.name || '(empty)').join(', ')}]`)
      } else {
        parts.push(...arms.map(a => a.name || '(empty)'))
      }
    })
    return parts.join(' | ')
  }, [treatmentArmSet.arms])

  return (
    <Card size="small">
      <div style={{ marginBottom: 16 }}>
        {editingName ? (
          <Space>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ width: 200 }}
            />
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveName}>
              Save
            </Button>
            <Button icon={<CloseOutlined />} onClick={() => setEditingName(false)}>
              Cancel
            </Button>
          </Space>
        ) : (
          <Space>
            <Title level={5} style={{ margin: 0 }}>{treatmentArmSet.name}</Title>
            <Button type="text" icon={<EditOutlined />} onClick={() => setEditingName(true)} />
          </Space>
        )}
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* Column Structure Preview */}
      <Alert
        type="info"
        showIcon
        icon={<FolderOutlined />}
        style={{ marginBottom: 12 }}
        message={
          <div>
            <Text strong>Column Structure Preview:</Text>
            <br />
            <Text code>{columnPreview || 'No columns defined'}</Text>
          </div>
        }
      />

      <Table
        dataSource={treatmentArmSet.arms}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
      />

      <div style={{ marginTop: 12 }}>
        <Space>
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddArm}>
            Add Treatment Arm
          </Button>
        </Space>
      </div>

      <Divider style={{ margin: '16px 0 12px' }} />
      
      <Space direction="vertical" size="small">
        <Text type="secondary" style={{ fontSize: 12 }}>
          💡 <strong>Grouping</strong>: Arms with the same grouping will appear under a nested column header.
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Example: Grouping="Active" creates a parent column "Active" containing all arms with that grouping.
        </Text>
      </Space>
    </Card>
  )
}