import { useState, useMemo } from 'react'
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
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  MoreOutlined,
  HolderOutlined,
  FolderOutlined,
  FileOutlined,
  MedicineBoxOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons'
import type { TableRow, RowStats } from '../../types'
import './NestedRowEditor.css'

const { Text } = Typography

interface Props {
  rows: TableRow[]
  onChange: (rows: TableRow[]) => void
  mode?: 'standard' | 'socpt'  // standard = 通用模式, socpt = SOC/PT 专用模式
  readOnly?: boolean
}

export default function NestedRowEditor({ 
  rows, 
  onChange, 
  mode = 'standard',
  readOnly = false 
}: Props) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Toggle row expansion
  const toggleExpand = (rowId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }

  // Expand all SOC rows
  const expandAll = () => {
    const socRows = rows.filter(r => r.isSOC)
    setExpandedRows(new Set(socRows.map(r => r.id)))
  }

  // Collapse all
  const collapseAll = () => {
    setExpandedRows(new Set())
  }

  // Add SOC row (for SOC/PT mode)
  const addSOCRow = () => {
    const newRow: TableRow = {
      id: `soc_${Date.now()}`,
      label: 'New SOC',
      level: 0,
      isSOC: true,
      stats: [{ type: 'n_percent' }],
    }
    onChange([...rows, newRow])
  }

  // Add PT row under SOC
  const addPTRow = (socId: string) => {
    const socIndex = rows.findIndex(r => r.id === socId)
    if (socIndex < 0) return

    const soc = rows[socIndex]
    const newRow: TableRow = {
      id: `pt_${Date.now()}`,
      label: '  New PT',
      level: 1,
      stats: [{ type: 'n_percent' }],
    }

    // Find where to insert (after last child of this SOC)
    let insertIndex = socIndex + 1
    while (insertIndex < rows.length && rows[insertIndex].level > soc.level) {
      insertIndex++
    }

    const newRows = [...rows]
    newRows.splice(insertIndex, 0, newRow)
    onChange(newRows)
    
    // Expand the SOC to show the new PT
    setExpandedRows(prev => new Set([...prev, socId]))
  }

  const handleDeleteRow = (rowId: string) => {
    const rowIndex = rows.findIndex(r => r.id === rowId)
    if (rowIndex < 0) return

    const row = rows[rowIndex]
    
    // If SOC, delete all children too
    if (row.isSOC) {
      let deleteCount = 1
      for (let i = rowIndex + 1; i < rows.length && rows[i].level > 0; i++) {
        deleteCount++
      }
      const newRows = [...rows]
      newRows.splice(rowIndex, deleteCount)
      onChange(newRows)
    } else {
      onChange(rows.filter(r => r.id !== rowId))
    }
  }

  const handleDuplicateRow = (rowId: string) => {
    const index = rows.findIndex(r => r.id === rowId)
    if (index < 0) return

    const row = rows[index]
    const duplicate: TableRow = {
      ...row,
      id: `row_${Date.now()}`,
      label: row.label + ' (copy)',
    }

    const newRows = [...rows]
    newRows.splice(index + 1, 0, duplicate)
    onChange(newRows)
  }

  // Determine if a row should be visible based on expansion state
  const isRowVisible = (row: TableRow, index: number): boolean => {
    if (row.level === 0) return true // Top-level rows always visible
    
    // Find the parent SOC
    for (let i = index - 1; i >= 0; i--) {
      if (rows[i].level === 0) {
        // Found parent SOC
        return expandedRows.has(rows[i].id)
      }
    }
    return true
  }

  // Get row icon based on type
  const getRowIcon = (record: TableRow) => {
    if (record.isSOC) {
      const isExpanded = expandedRows.has(record.id)
      return (
        <span 
          onClick={() => toggleExpand(record.id)}
          style={{ cursor: 'pointer', marginRight: 4 }}
        >
          {isExpanded ? <DownOutlined /> : <RightOutlined />}
        </span>
      )
    }
    if (record.level === 1) {
      return <MedicineBoxOutlined style={{ marginRight: 4, color: '#1890ff' }} />
    }
    return <FileOutlined style={{ marginRight: 4, color: '#999' }} />
  }

  const columns = [
    {
      title: '',
      key: 'drag',
      width: 30,
      render: () => <HolderOutlined style={{ cursor: 'grab', color: '#999' }} />,
    },
    {
      title: mode === 'socpt' ? 'SOC / Preferred Term' : 'Label',
      dataIndex: 'label',
      key: 'label',
      width: '35%',
      render: (text: string, record: TableRow, index: number) => {
        const isVisible = isRowVisible(record, index)
        if (!isVisible) return null

        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            fontWeight: record.level === 0 ? 600 : 400,
            color: record.isSOC ? '#262626' : '#595959',
          }}>
            {getRowIcon(record)}
            <Input
              value={text.trimStart()}
              disabled={readOnly}
              placeholder={record.isSOC ? "SOC name" : "PT name"}
              onChange={(e) => {
                const prefix = record.level > 0 ? '  '.repeat(record.level) : ''
                const updated = rows.map(r => 
                  r.id === record.id ? { ...r, label: prefix + e.target.value } : r
                )
                onChange(updated)
              }}
              style={{ 
                fontWeight: record.level === 0 ? 600 : 400,
                border: record.isSOC ? '1px solid #d9d9d9' : 'none',
                backgroundColor: record.isSOC ? '#fafafa' : 'transparent',
              }}
            />
            {record.isSOC && <Tag color="blue" style={{ marginLeft: 8 }}>SOC</Tag>}
            {record.level === 1 && !record.isSOC && <Tag color="green" style={{ marginLeft: 8 }}>PT</Tag>}
          </div>
        )
      },
    },
    {
      title: 'MedDRA Code',
      key: 'meddraCode',
      width: '12%',
      render: (_: unknown, record: TableRow) => {
        if (!isRowVisible(record, rows.findIndex(r => r.id === record.id))) return null
        return (
          <Input
            value={record.isSOC ? record.socCode : record.ptCode}
            disabled={readOnly}
            placeholder={record.isSOC ? "SOC code" : "PT code"}
            onChange={(e) => {
              const updated = rows.map(r => 
                r.id === record.id 
                  ? { ...r, ...(record.isSOC ? { socCode: e.target.value } : { ptCode: e.target.value }) } 
                  : r
              )
              onChange(updated)
            }}
            style={{ width: '100%' }}
          />
        )
      },
    },
    {
      title: 'Variable',
      dataIndex: 'variable',
      key: 'variable',
      width: '12%',
      render: (text: string, record: TableRow) => {
        if (!isRowVisible(record, rows.findIndex(r => r.id === record.id))) return null
        return (
          <Input
            value={text}
            disabled={readOnly}
            placeholder="e.g., AEDECOD"
            onChange={(e) => {
              const updated = rows.map(r => 
                r.id === record.id ? { ...r, variable: e.target.value } : r
              )
              onChange(updated)
            }}
          />
        )
      },
    },
    {
      title: 'Statistics',
      dataIndex: 'stats',
      key: 'stats',
      width: '20%',
      render: (stats: RowStats[], record: TableRow) => {
        if (!isRowVisible(record, rows.findIndex(r => r.id === record.id))) return null
        return (
          <Space>
            <InputNumber
              min={0}
              max={99}
              value={stats?.[0]?.decimals ?? 1}
              disabled={readOnly}
              placeholder=" decimals"
              style={{ width: 70 }}
              onChange={(val) => {
                const newStats = stats?.map((s, i) => i === 0 ? { ...s, decimals: val ?? 1 } : s) || [{ type: 'n_percent', decimals: val ?? 1 }]
                const updated = rows.map(r => 
                  r.id === record.id ? { ...r, stats: newStats } : r
                )
                onChange(updated)
              }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>decimals</Text>
          </Space>
        )
      },
    },
    {
      title: '',
      key: 'actions',
      width: '15%',
      render: (_: unknown, record: TableRow) => {
        if (readOnly) return null
        if (!isRowVisible(record, rows.findIndex(r => r.id === record.id))) return null

        return (
          <Space size="small">
            {record.isSOC && (
              <Tooltip title="Add PT under this SOC">
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => addPTRow(record.id)}
                />
              </Tooltip>
            )}
            <Dropdown
              menu={{
                items: [
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
                    label: record.isSOC ? 'Delete SOC (and all PTs)' : 'Delete',
                    danger: true,
                    onClick: () => handleDeleteRow(record.id),
                  },
                ],
              }}
              trigger={['click']}
            >
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        )
      },
    },
  ]

  // Filter visible rows for display
  const visibleRows = useMemo(() => {
    return rows.filter((row, index) => isRowVisible(row, index))
  }, [rows, expandedRows])

  return (
    <div className="nested-row-editor">
      <div className="row-editor-toolbar">
        <Space>
          {mode === 'socpt' ? (
            <>
              <Button type="primary" icon={<FolderOutlined />} onClick={addSOCRow}>
                Add SOC
              </Button>
              <Button onClick={expandAll}>Expand All</Button>
              <Button onClick={collapseAll}>Collapse All</Button>
            </>
          ) : (
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => {
              const newRow: TableRow = {
                id: `row_${Date.now()}`,
                label: 'New Row',
                level: 0,
                stats: [{ type: 'n' }],
              }
              onChange([...rows, newRow])
            }}>
              Add Row
            </Button>
          )}
        </Space>
        <Text type="secondary" style={{ marginLeft: 16 }}>
          {mode === 'socpt' ? (
            <>
              {rows.filter(r => r.isSOC).length} SOCs, {' '}
              {rows.filter(r => !r.isSOC && r.level === 1).length} PTs
            </>
          ) : (
            `${rows.length} rows`
          )}
        </Text>
      </div>
      
      <Table
        dataSource={visibleRows}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        rowClassName={(record) => 
          `row-level-${record.level} ${record.isSOC ? 'soc-row' : 'pt-row'}`
        }
      />

      {mode === 'socpt' && (
        <div style={{ marginTop: 12, padding: 8, backgroundColor: '#f6f6f6', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 <strong>SOC/PT Mode:</strong> Add SOC (System Organ Class) rows first, then add PT (Preferred Term) rows under each SOC. 
            SOC rows represent body systems (e.g., "Cardiac disorders"), PT rows represent specific events (e.g., "Atrial fibrillation").
          </Text>
        </div>
      )}
    </div>
  )
}