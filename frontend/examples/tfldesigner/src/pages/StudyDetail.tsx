import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Tabs, Button, Space, Descriptions, Tag, Modal, Input, message } from 'antd'
import { 
  TableOutlined, 
  BarChartOutlined, 
  UnorderedListOutlined,
  SettingOutlined,
  DatabaseOutlined,
  ExportOutlined,
  PlusOutlined,
  FileAddOutlined,
} from '@ant-design/icons'
import ExportModal from '../components/common/ExportModal'
import TemplateSelector from '../components/table/TemplateSelector'
import type { Study, TableShell, FigureShell, ListingShell, TreatmentArmSet, Template } from '../types'

// Mock data
const mockStudy: Study = {
  id: '1',
  studyId: 'STUDY-001',
  title: 'Phase III Clinical Trial for Drug X',
  compound: 'Drug X',
  phase: 'Phase III',
  diseaseArea: 'Oncology',
  therapeuticArea: 'Solid Tumors',
  createdAt: '2026-03-01',
  updatedAt: '2026-03-12',
}

const mockTreatmentArmSets: TreatmentArmSet[] = [
  {
    id: 'tas1',
    name: 'Study Treatment Arms',
    arms: [
      { id: 'arm1', name: 'Placebo', order: 1, N: 50 },
      { id: 'arm2', name: 'Drug X 10mg', order: 2, N: 52 },
      { id: 'arm3', name: 'Drug X 20mg', order: 3, N: 48 },
    ],
  },
]

const mockTables: TableShell[] = [
  { id: 't1', shellNumber: 'Table 14.1.1', title: 'Demographics', population: 'Safety', category: 'Demographics', dataset: 'ADSL', treatmentArmSetId: 'tas1', statisticsSetId: 'ss1', rows: [], footer: {} },
  { id: 't2', shellNumber: 'Table 14.1.2', title: 'Disposition', population: 'Safety', category: 'Disposition', dataset: 'ADSL', treatmentArmSetId: 'tas1', statisticsSetId: 'ss1', rows: [], footer: {} },
  { id: 't3', shellNumber: 'Table 14.3.1', title: 'Adverse Events by SOC', population: 'Safety', category: 'Adverse_Events', dataset: 'ADAE', treatmentArmSetId: 'tas1', statisticsSetId: 'ss1', rows: [], footer: {} },
]

const mockFigures: FigureShell[] = [
  { id: 'f1', figureNumber: 'Figure 14.2.1', title: 'Kaplan-Meier Plot', population: 'ITT', chartType: 'km_curve', xAxis: { label: 'Time (months)', type: 'continuous' }, yAxis: { label: 'Survival Probability', type: 'continuous' }, series: [] },
]

const mockListings: ListingShell[] = [
  { id: 'l1', listingNumber: 'Listing 16.1.1', title: 'Adverse Events Listing', population: 'Safety', dataset: 'ADAE', columns: [] },
]

export default function StudyDetail() {
  useParams()
  const navigate = useNavigate()
  
  const [exportModalVisible, setExportModalVisible] = useState(false)
  const [templateSelectorVisible, setTemplateSelectorVisible] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [newTableNumber, setNewTableNumber] = useState('')
  const [newTableTitle, setNewTableTitle] = useState('')

  // Build treatment arm set map
  const treatmentArmSetMap = useMemo(() => {
    const map = new Map<string, TreatmentArmSet>()
    mockTreatmentArmSets.forEach(tas => map.set(tas.id, tas))
    return map
  }, [])

  const handleCreateTable = () => {
    if (!newTableNumber || !newTableTitle) {
      message.warning('请填写表格编号和标题')
      return
    }
    // Navigate to table editor with new table
    const newId = `t_${Date.now()}`
    navigate(`/tables/${newId}`)
    setCreateModalVisible(false)
  }

  const handleTemplateSelect = (template: Template) => {
    // Navigate to table editor with template
    navigate(`/tables/new?template=${template.id}`)
    setTemplateSelectorVisible(false)
  }

  return (
    <div>
      <Card>
        <Descriptions title="Study Information" bordered column={2} extra={
          <Space>
            <Button 
              icon={<ExportOutlined />}
              onClick={() => setExportModalVisible(true)}
            >
              Export All
            </Button>
          </Space>
        }>
          <Descriptions.Item label="Study ID">
            <Tag color="blue">{mockStudy.studyId}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Title">{mockStudy.title}</Descriptions.Item>
          <Descriptions.Item label="Compound">{mockStudy.compound}</Descriptions.Item>
          <Descriptions.Item label="Phase">{mockStudy.phase}</Descriptions.Item>
          <Descriptions.Item label="Disease Area">{mockStudy.diseaseArea}</Descriptions.Item>
          <Descriptions.Item label="Therapeutic Area">{mockStudy.therapeuticArea}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Tabs
          defaultActiveKey="tables"
          items={[
            {
              key: 'tables',
              label: (
                <span>
                  <TableOutlined />
                  Tables ({mockTables.length})
                </span>
              ),
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Space>
                      <Button 
                        type="primary" 
                        icon={<PlusOutlined />}
                        onClick={() => setCreateModalVisible(true)}
                      >
                        Create Table
                      </Button>
                      <Button 
                        icon={<FileAddOutlined />}
                        onClick={() => setTemplateSelectorVisible(true)}
                      >
                        From Template
                      </Button>
                    </Space>
                  </div>
                  {mockTables.map((table) => (
                    <Card 
                      key={table.id} 
                      size="small" 
                      style={{ marginBottom: 8, cursor: 'pointer' }}
                      hoverable
                      onClick={() => navigate(`/tables/${table.id}`)}
                    >
                      <Space>
                        <Tag color="blue">{table.shellNumber}</Tag>
                        <span>{table.title}</span>
                        <Tag>{table.category}</Tag>
                        <Tag color="green">{table.population}</Tag>
                      </Space>
                    </Card>
                  ))}
                </div>
              ),
            },
            {
              key: 'figures',
              label: (
                <span>
                  <BarChartOutlined />
                  Figures ({mockFigures.length})
                </span>
              ),
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Button type="primary" icon={<PlusOutlined />}>Create Figure</Button>
                  </div>
                  {mockFigures.map((figure) => (
                    <Card 
                      key={figure.id} 
                      size="small" 
                      style={{ marginBottom: 8, cursor: 'pointer' }}
                      hoverable
                      onClick={() => navigate(`/figures/${figure.id}`)}
                    >
                      <Space>
                        <Tag color="green">{figure.figureNumber}</Tag>
                        <span>{figure.title}</span>
                        <Tag>{figure.chartType}</Tag>
                      </Space>
                    </Card>
                  ))}
                </div>
              ),
            },
            {
              key: 'listings',
              label: (
                <span>
                  <UnorderedListOutlined />
                  Listings ({mockListings.length})
                </span>
              ),
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Button type="primary" icon={<PlusOutlined />}>Create Listing</Button>
                  </div>
                  {mockListings.map((listing) => (
                    <Card 
                      key={listing.id} 
                      size="small" 
                      style={{ marginBottom: 8, cursor: 'pointer' }}
                      hoverable
                      onClick={() => navigate(`/listings/${listing.id}`)}
                    >
                      <Space>
                        <Tag color="orange">{listing.listingNumber}</Tag>
                        <span>{listing.title}</span>
                      </Space>
                    </Card>
                  ))}
                </div>
              ),
            },
            {
              key: 'settings',
              label: (
                <span>
                  <SettingOutlined />
                  Settings
                </span>
              ),
              children: (
                <div>
                  <Card title="Treatment Arm Sets" size="small" style={{ marginBottom: 16 }}>
                    <Button icon={<DatabaseOutlined />}>Configure Treatment Arms</Button>
                  </Card>
                  <Card title="Statistics Sets" size="small">
                    <Button icon={<DatabaseOutlined />}>Configure Statistics</Button>
                  </Card>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Export Modal */}
      <ExportModal
        open={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        tables={mockTables}
        treatmentArmSets={treatmentArmSetMap}
      />

      {/* Template Selector */}
      <TemplateSelector
        open={templateSelectorVisible}
        onClose={() => setTemplateSelectorVisible(false)}
        onSelect={handleTemplateSelect}
      />

      {/* Create Table Modal */}
      <Modal
        title="Create New Table"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={handleCreateTable}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>Table Number</label>
            <Input 
              placeholder="e.g., Table 14.1.1"
              value={newTableNumber}
              onChange={e => setNewTableNumber(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>Title</label>
            <Input 
              placeholder="e.g., Demographics"
              value={newTableTitle}
              onChange={e => setNewTableTitle(e.target.value)}
            />
          </div>
        </Space>
      </Modal>
    </div>
  )
}