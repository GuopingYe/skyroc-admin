import { Alert, Checkbox, Space, Table, Tag, Typography } from 'antd'

const { Text } = Typography

interface ParentSpec {
  id: number
  name: string
  spec_type: string
  dataset_count: number
}

interface Dataset {
  id: number
  dataset_name: string
  class_type: string
}

interface Props {
  parentSpecs: ParentSpec[]
  allDatasets: Dataset[]
  excludedDatasetIds: number[]
  parentSpecReady: boolean
  onToggleExclude: (datasetId: number, exclude: boolean) => void
}

/**
 * Steps 2-3 of analysis creation modal:
 * - Step 2: Read-only inheritance summary
 * - Step 3: Optional domain exclusions
 */
export function AnalysisSpecStepModal({
  parentSpecs,
  allDatasets,
  excludedDatasetIds,
  parentSpecReady,
  onToggleExclude,
}: Props) {
  if (!parentSpecReady) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Parent study has no spec configured yet."
        description="This analysis will automatically inherit the study spec once it is set up. You can configure domain exclusions later on the Study Spec page."
      />
    )
  }

  const specColumns = [
    { title: 'Spec Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Type',
      dataIndex: 'spec_type',
      key: 'spec_type',
      render: (v: string) => <Tag color={v === 'SDTM' ? 'blue' : 'green'}>{v}</Tag>,
    },
    { title: 'Domains', dataIndex: 'dataset_count', key: 'dataset_count' },
    {
      title: 'Status',
      key: 'status',
      render: () => <Tag color="success">Will be inherited</Tag>,
    },
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <div>
        <Text strong>Study specs to inherit (auto)</Text>
        <Table
          dataSource={parentSpecs}
          columns={specColumns}
          rowKey="id"
          size="small"
          pagination={false}
          style={{ marginTop: 8 }}
        />
      </div>

      {allDatasets.length > 0 && (
        <div>
          <Text strong>Domain customization </Text>
          <Text type="secondary">(optional — can be done later on Study Spec page)</Text>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {allDatasets.map((ds) => {
              const excluded = excludedDatasetIds.includes(ds.id)
              return (
                <Checkbox
                  key={ds.id}
                  checked={!excluded}
                  onChange={(e) => onToggleExclude(ds.id, !e.target.checked)}
                >
                  <Tag color={excluded ? 'default' : 'blue'}>{ds.dataset_name}</Tag>
                </Checkbox>
              )
            })}
          </div>
          {excludedDatasetIds.length > 0 && (
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              {excludedDatasetIds.length} domain(s) will be excluded for this analysis.
            </Text>
          )}
        </div>
      )}
    </Space>
  )
}
