import { useMemo, useState } from 'react'
import { Alert, Button, Checkbox, Col, Input, Modal, Row, Spin, Steps, Table, Tag, Typography } from 'antd'
import { useSpecSources } from '@/service/hooks/useStudySpec'
import type { SpecSource } from '@/service/api/study-spec'

const { Text } = Typography

interface Props {
  open: boolean
  scopeNodeId: number
  onConfirm: (selectedDatasetIds: number[]) => void
  onCancel: () => void
}

type SpecTypeOption = 'SDTM' | 'ADaM'

export function DomainPickerWizard({ open, scopeNodeId, onConfirm, onCancel }: Props) {
  const [step, setStep] = useState(0)
  const [specTypes, setSpecTypes] = useState<SpecTypeOption[]>(['SDTM'])
  const [activeSpecType] = useState<SpecTypeOption>('SDTM')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [search, setSearch] = useState('')

  const { data: sources, isLoading } = useSpecSources(scopeNodeId, activeSpecType)

  // Deduplicate by dataset_name — keep the highest-priority source:
  // ta/product domains override cdisc domains with the same name.
  const allDomains: SpecSource[] = useMemo(() => {
    const raw: SpecSource[] = [
      ...(sources?.cdisc_domains ?? []),
      ...(sources?.ta_domains ?? []),
      ...(sources?.product_domains ?? []),
    ]
    // Priority: product > ta > cdisc — later entries win for same dataset_name
    const byName = new Map<string, SpecSource>()
    for (const d of raw) {
      byName.set(d.dataset_name, d)
    }
    return Array.from(byName.values()).sort((a, b) => a.dataset_name.localeCompare(b.dataset_name))
  }, [sources])

  const filteredDomains = useMemo(() => {
    if (!search) return allDomains
    const kw = search.toLowerCase()
    return allDomains.filter(
      d => d.dataset_name.toLowerCase().includes(kw) || (d.description?.toLowerCase().includes(kw) ?? false)
    )
  }, [allDomains, search])

  const columns = [
    {
      title: 'Domain',
      dataIndex: 'dataset_name',
      key: 'dataset_name',
      width: 100,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Class', dataIndex: 'class_type', key: 'class_type', width: 140 },
    {
      title: 'Source',
      dataIndex: 'origin',
      key: 'origin',
      width: 120,
      render: (v: string) => (
        <Tag color={v === 'cdisc' ? 'blue' : v === 'ta' ? 'cyan' : 'green'}>
          {v === 'cdisc' ? 'CDISC Library' : v === 'ta' ? 'TA Spec' : 'Product Spec'}
        </Tag>
      ),
    },
    { title: 'Vars', dataIndex: 'variable_count', key: 'variable_count', width: 60, align: 'right' as const },
  ]

  const steps = [{ title: 'Spec Type' }, { title: 'Select Domains' }, { title: 'Review' }]

  return (
    <Modal
      open={open}
      title="Initialize Study Spec — Domain Picker"
      width={900}
      zIndex={1050}
      onCancel={onCancel}
      footer={
        <Row justify="space-between">
          <Col>
            {step > 0 && <Button onClick={() => setStep(s => s - 1)}>Back</Button>}
          </Col>
          <Col>
            {step < 2
              ? <Button type="primary" onClick={() => setStep(s => s + 1)} disabled={selectedIds.length === 0 && step === 1}>
                  Next
                </Button>
              : <Button type="primary" onClick={() => onConfirm(selectedIds)}>
                  Create Spec ({selectedIds.length} domains)
                </Button>
            }
          </Col>
        </Row>
      }
    >
      <Steps current={step} items={steps} style={{ marginBottom: 24 }} />

      {step === 0 && (
        <div>
          <Text>Which spec type(s) do you want to initialize?</Text>
          <div style={{ marginTop: 16 }}>
            <Checkbox.Group
              value={specTypes}
              onChange={(vals) => setSpecTypes(vals as SpecTypeOption[])}
            >
              <Checkbox value="SDTM">SDTM</Checkbox>
              <Checkbox value="ADaM">ADaM</Checkbox>
            </Checkbox.Group>
          </div>
        </div>
      )}

      {step === 1 && (
        <Spin spinning={isLoading}>
          {sources?.warning && (
            <Alert
              showIcon
              message={sources.warning}
              style={{ marginBottom: 8 }}
              type="warning"
            />
          )}
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Select domains to include. Duplicates across versions are automatically deduplicated
            (TA/Product overrides CDISC Library).
          </Text>
          <Input.Search
            allowClear
            placeholder="Search domain name or description…"
            style={{ marginBottom: 8 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Table
            dataSource={filteredDomains}
            columns={columns}
            rowKey="id"
            size="small"
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys as number[]),
            }}
            pagination={{ pageSize: 20, showSizeChanger: false, showTotal: total => `${total} domains` }}
            scroll={{ y: 350 }}
          />
        </Spin>
      )}

      {step === 2 && (
        <div>
          <Alert
            showIcon
            message={`${selectedIds.length} domains selected`}
            style={{ marginBottom: 12 }}
            type="success"
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {allDomains
              .filter(d => selectedIds.includes(d.id))
              .map(d => (
                <Tag key={d.id} color={d.origin === 'cdisc' ? 'blue' : d.origin === 'ta' ? 'cyan' : 'green'}>
                  {d.dataset_name} ({d.origin})
                </Tag>
              ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
