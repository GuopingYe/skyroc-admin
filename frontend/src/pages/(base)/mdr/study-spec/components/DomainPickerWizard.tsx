import { useState } from 'react'
import { Button, Checkbox, Col, Modal, Row, Spin, Steps, Table, Tag, Typography } from 'antd'
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

  const { data: sources, isLoading } = useSpecSources(scopeNodeId, activeSpecType)

  const allDomains: SpecSource[] = [
    ...(sources?.cdisc_domains ?? []),
    ...(sources?.ta_domains ?? []),
    ...(sources?.product_domains ?? []),
  ]

  const columns = [
    {
      title: 'Domain',
      dataIndex: 'dataset_name',
      key: 'dataset_name',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Class', dataIndex: 'class_type', key: 'class_type' },
    {
      title: 'Source',
      dataIndex: 'origin',
      key: 'origin',
      render: (v: string) => (
        <Tag color={v === 'cdisc' ? 'blue' : v === 'ta' ? 'cyan' : 'green'}>
          {v === 'cdisc' ? 'CDISC Library' : v === 'ta' ? 'TA Spec' : 'Product Spec'}
        </Tag>
      ),
    },
    { title: 'Variables', dataIndex: 'variable_count', key: 'variable_count', align: 'right' as const },
  ]

  const steps = [{ title: 'Spec Type' }, { title: 'Select Domains' }, { title: 'Review' }]

  return (
    <Modal
      open={open}
      title="Initialize Study Spec — Domain Picker"
      width={900}
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
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Select domains from any source. You can mix CDISC Library, TA Spec, and Product Spec domains.
          </Text>
          <Table
            dataSource={allDomains}
            columns={columns}
            rowKey="id"
            size="small"
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys as number[]),
            }}
            pagination={false}
            scroll={{ y: 400 }}
          />
        </Spin>
      )}

      {step === 2 && (
        <div>
          <Text strong>{selectedIds.length} domains selected:</Text>
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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
