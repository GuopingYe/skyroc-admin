import { useMemo } from 'react'
import { Table, Typography, Divider } from 'antd'
import type { TableShell, TableRow, TreatmentArmSet, TreatmentArm, TableColumn } from '../../types'
import './TablePreview.css'

const { Text, Title } = Typography

interface Props {
  table: TableShell
  treatmentArmSet?: TreatmentArmSet
}

export default function TablePreview({ table, treatmentArmSet }: Props) {
  // Generate nested column headers from treatment arm set
  const columns = useMemo(() => {
    const baseColumn: TableColumn = {
      title: '',
      dataIndex: 'label',
      key: 'label',
      width: '40%',
      render: (text: unknown) => {
        // Handle indentation based on leading spaces or level
        const textStr = String(text || '')
        const trimmed = textStr.trimStart()
        const indent = textStr.length - trimmed.length
        const isBold = indent === 0
        
        return (
          <span 
            style={{ 
              paddingLeft: indent * 8,
              fontWeight: isBold ? 600 : 400,
            }}
          >
            {trimmed}
          </span>
        )
      },
    }

    // If no treatment arm set, use default columns
    if (!treatmentArmSet?.arms?.length) {
      return [baseColumn, 
        { title: 'Placebo (N=XX)', dataIndex: 'col1', key: 'col1', align: 'center' as const },
        { title: 'Treatment (N=XX)', dataIndex: 'col2', key: 'col2', align: 'center' as const },
      ]
    }

    // Check if we have groupings
    const hasGroupings = treatmentArmSet.arms.some(arm => arm.grouping)

    if (!hasGroupings) {
      // Simple flat columns (no nesting)
      const treatmentColumns = treatmentArmSet.arms.map((arm: TreatmentArm) => ({
        title: `${arm.name} (N=${arm.N || 'XX'})`,
        dataIndex: arm.id,
        key: arm.id,
        align: 'center' as const,
        render: () => <Text type="secondary">XX.XX</Text>,
      }))
      return [baseColumn, ...treatmentColumns]
    }

    // Nested columns based on groupings
    const groupedArms = groupArmsByGrouping(treatmentArmSet.arms)
    const treatmentColumns = buildNestedColumns(groupedArms)
    
    return [baseColumn, ...treatmentColumns]
  }, [treatmentArmSet])

  // Convert rows to table data
  const dataSource = useMemo(() => {
    return table.rows.map((row: TableRow) => {
      const data: Record<string, unknown> = {
        key: row.id,
        label: row.label,
      }
      
      // Add placeholder data for each treatment arm
      treatmentArmSet?.arms.forEach((arm: TreatmentArm) => {
        data[arm.id] = generatePlaceholderValue(row.stats)
      })
      
      return data
    })
  }, [table.rows, treatmentArmSet])

  return (
    <div className="table-preview">
      {/* Table Header */}
      <div className="preview-header">
        <Title level={4} style={{ textAlign: 'center', marginBottom: 4 }}>
          {table.shellNumber}: {table.title}
        </Title>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
          Population: {table.population}
        </Text>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Table Body */}
      <div className="preview-table-wrapper">
        <Table
          dataSource={dataSource}
          columns={columns}
          pagination={false}
          size="small"
          bordered
        />
      </div>

      {/* Footer */}
      {table.footer && (
        <div className="preview-footer">
          {table.footer.source && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Source: {table.footer.source}
            </Text>
          )}
          {table.footer.notes?.map((note: string, i: number) => (
            <Text key={i} type="secondary" style={{ fontSize: 11, display: 'block' }}>
              {note}
            </Text>
          ))}
          {table.footer.abbreviations && Object.keys(table.footer.abbreviations).length > 0 && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {Object.entries(table.footer.abbreviations)
                .map(([k, v]) => `${k} = ${v}`)
                .join('; ')}
            </Text>
          )}
        </div>
      )}
    </div>
  )
}

// Helper to generate placeholder values based on stats type
function generatePlaceholderValue(stats?: TableRow['stats']): string {
  if (!stats || stats.length === 0) return '-'
  
  const types = stats.map((s: { type: string }) => s.type)
  
  if (types.includes('header')) return ''
  if (types.includes('n') && types.includes('percent')) return 'XX (XX.X%)'
  if (types.includes('n_percent')) return 'XX (XX.X%)'
  if (types.includes('n')) return 'XX'
  if (types.includes('mean') && types.includes('sd')) return 'XX.XX (XX.XX)'
  if (types.includes('mean')) return 'XX.XX'
  if (types.includes('median')) return 'XX.XX'
  if (types.includes('min') && types.includes('max')) return '(XX.XX, XX.XX)'
  if (types.includes('range')) return '(XX.XX, XX.XX)'
  
  return 'XX.XX'
}

// Group arms by their grouping property
function groupArmsByGrouping(arms: TreatmentArm[]): Map<string | undefined, TreatmentArm[]> {
  const groups = new Map<string | undefined, TreatmentArm[]>()
  
  arms.forEach(arm => {
    const key = arm.grouping
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(arm)
  })
  
  return groups
}

// Build nested column structure for Ant Design Table
function buildNestedColumns(groupedArms: Map<string | undefined, TreatmentArm[]>): TableColumn[] {
  const columns: TableColumn[] = []
  
  groupedArms.forEach((arms, grouping) => {
    if (!grouping) {
      // No grouping - add as flat columns
      arms.forEach(arm => {
        columns.push({
          title: `${arm.name} (N=${arm.N || 'XX'})`,
          dataIndex: arm.id,
          key: arm.id,
          align: 'center',
          render: () => <Text type="secondary">XX.XX</Text>,
        })
      })
    } else {
      // Has grouping - create parent column with children
      const childColumns = arms.map(arm => ({
        title: `${arm.name} (N=${arm.N || 'XX'})`,
        dataIndex: arm.id,
        key: arm.id,
        align: 'center' as const,
        render: () => <Text type="secondary">XX.XX</Text>,
      }))
      
      // Calculate total N for the group
      const totalN = arms.reduce((sum, arm) => {
        const n = typeof arm.N === 'number' ? arm.N : parseInt(String(arm.N)) || 0
        return sum + n
      }, 0)
      
      columns.push({
        title: `${grouping} (N=${totalN || 'XX'})`,
        key: `group_${grouping}`,
        align: 'center',
        children: childColumns,
      })
    }
  })
  
  return columns
}