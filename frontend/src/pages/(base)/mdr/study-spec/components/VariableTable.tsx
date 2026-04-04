import { Button, Table, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { LinkOutlined } from '@ant-design/icons'
import type { StudyVariable } from '@/service/api/study-spec'

const ORIGIN_COLORS: Record<string, string> = {
  CDISC: 'blue',
  SPONSOR_STANDARD: 'green',
  TA_STANDARD: 'cyan',
  STUDY_CUSTOM: 'orange',
}

const OVERRIDE_COLORS: Record<string, string> = {
  None: 'default',
  Added: 'success',
  Modified: 'warning',
  Deleted: 'error',
}

interface Props {
  variables: StudyVariable[]
  loading?: boolean
  readOnly?: boolean
  onEdit?: (variable: StudyVariable) => void
  onSourceLink?: (variable: StudyVariable) => void
}

export function VariableTable({ variables, loading, readOnly, onEdit, onSourceLink }: Props) {
  const columns: ColumnsType<StudyVariable> = [
    {
      title: 'Variable',
      dataIndex: 'variable_name',
      key: 'variable_name',
      fixed: 'left',
      width: 120,
      sorter: (a, b) => a.variable_name.localeCompare(b.variable_name),
    },
    {
      title: 'Label',
      dataIndex: 'variable_label',
      key: 'variable_label',
      width: 180,
    },
    {
      title: 'Type',
      dataIndex: 'data_type',
      key: 'data_type',
      width: 80,
    },
    {
      title: 'Length',
      dataIndex: 'length',
      key: 'length',
      width: 70,
      align: 'right',
    },
    {
      title: 'Core',
      dataIndex: 'core',
      key: 'core',
      width: 70,
      render: (v: string) => (
        <Tag color={v === 'Req' ? 'red' : v === 'Exp' ? 'orange' : 'default'}>{v}</Tag>
      ),
    },
    {
      title: 'Role',
      key: 'role',
      width: 120,
      render: (_: unknown, r: StudyVariable) => r.standard_metadata?.role ?? '—',
    },
    {
      title: 'Origin',
      dataIndex: 'origin_type',
      key: 'origin_type',
      width: 140,
      render: (v: string, record: StudyVariable) => (
        <span>
          <Tag color={ORIGIN_COLORS[v] ?? 'default'}>{v.replace(/_/g, ' ')}</Tag>
          {record.base_id && onSourceLink && (
            <Tooltip title="Go to source">
              <Button
                type="link"
                size="small"
                icon={<LinkOutlined />}
                onClick={() => onSourceLink(record)}
                style={{ padding: '0 2px' }}
              />
            </Tooltip>
          )}
        </span>
      ),
    },
    {
      title: 'Codelist',
      key: 'codelist',
      width: 120,
      render: (_: unknown, r: StudyVariable) => r.standard_metadata?.codelist ?? '—',
    },
    {
      title: 'Source / Derivation',
      key: 'source_derivation',
      width: 160,
      render: (_: unknown, r: StudyVariable) =>
        r.standard_metadata?.source_derivation ?? '—',
    },
    {
      title: 'Implementation Notes',
      key: 'impl_notes',
      width: 180,
      render: (_: unknown, r: StudyVariable) =>
        r.standard_metadata?.implementation_notes ?? '—',
    },
    {
      title: 'Comment',
      key: 'comment',
      width: 160,
      render: (_: unknown, r: StudyVariable) =>
        r.standard_metadata?.comment ?? '—',
    },
    {
      title: 'Library Ref',
      key: 'library_ref',
      width: 100,
      render: (_: unknown, r: StudyVariable) => {
        const ref = r.standard_metadata?.global_library_ref
        return ref ? (
          <a href={ref} target="_blank" rel="noreferrer">
            <LinkOutlined /> CDISC
          </a>
        ) : '—'
      },
    },
    {
      title: 'Override',
      dataIndex: 'override_type',
      key: 'override_type',
      fixed: 'right',
      width: 90,
      render: (v: string) =>
        v !== 'None' ? <Tag color={OVERRIDE_COLORS[v] ?? 'default'}>{v}</Tag> : null,
    },
    ...(!readOnly
      ? [{
          title: '',
          key: 'actions',
          fixed: 'right' as const,
          width: 50,
          render: (_: unknown, record: StudyVariable) => (
            <Button size="small" type="text" onClick={() => onEdit?.(record)}>✏️</Button>
          ),
        }]
      : []),
  ]

  const rowClassName = (record: StudyVariable) => {
    if (record.override_type === 'Added') return 'row-added'
    if (record.override_type === 'Modified') return 'row-modified'
    if (record.override_type === 'Deleted') return 'row-deleted'
    return ''
  }

  return (
    <>
      <style>{`
        .row-added td { background: #f6ffed !important; }
        .row-modified td { background: #fffbe6 !important; }
        .row-deleted td { background: #fff1f0 !important; opacity: 0.5; text-decoration: line-through; }
      `}</style>
      <Table<StudyVariable>
        dataSource={variables}
        columns={columns}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1600 }}
        size="small"
        pagination={{ pageSize: 50, showSizeChanger: true }}
        rowClassName={rowClassName}
      />
    </>
  )
}
