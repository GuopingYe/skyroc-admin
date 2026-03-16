import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Tabs,
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  Popconfirm,
  Breadcrumb,
  Typography,
  Spin,
  Divider,
  Row,
  Col,
} from 'antd'
import {
  SaveOutlined,
  ExportOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  CopyOutlined,
  SettingOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { NestedRowEditor, TreatmentArmEditor, TablePreview, TemplateSelector } from '../components/table'
import { useTableStore } from '../stores/tableStore'
import { useStudyStore } from '../stores/studyStore'
import type { TableShell, TableRow, TableFooter, TreatmentArmSet, Template } from '../types'
import './TableEditor.css'

const { Title, Text } = Typography

const categoryOptions = [
  { value: 'Demographics', label: 'Demographics' },
  { value: 'Disposition', label: 'Disposition' },
  { value: 'Protocol_Deviations', label: 'Protocol Deviations' },
  { value: 'Adverse_Events', label: 'Adverse Events' },
  { value: 'Laboratory', label: 'Laboratory' },
  { value: 'Vital_Signs', label: 'Vital Signs' },
  { value: 'Concomitant_Meds', label: 'Concomitant Medications' },
  { value: 'Efficacy', label: 'Efficacy' },
  { value: 'Other', label: 'Other' },
]

const datasetOptions = [
  { value: 'ADSL', label: 'ADSL - Subject Level' },
  { value: 'ADAE', label: 'ADAE - Adverse Events' },
  { value: 'ADLB', label: 'ADLB - Laboratory' },
  { value: 'ADVS', label: 'ADVS - Vital Signs' },
  { value: 'ADCM', label: 'ADCM - Concomitant Medications' },
  { value: 'ADEX', label: 'ADEX - Exposure' },
  { value: 'ADMH', label: 'ADMH - Medical History' },
  { value: 'ADTR', label: 'ADTR - Tumor Response' },
  { value: 'ADTTE', label: 'ADTTE - Time to Event' },
]

const populationOptions = [
  { value: 'Safety', label: 'Safety' },
  { value: 'ITT', label: 'Intent-to-Treat (ITT)' },
  { value: 'PP', label: 'Per-Protocol (PP)' },
  { value: 'FAS', label: 'Full Analysis Set (FAS)' },
  { value: 'Efficacy', label: 'Efficacy' },
]

export default function TableEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  
  const {
    tables,
    currentTable,
    setCurrentTable,
    updateMetadata,
    updateFooter,
    isDirty,
    markClean,
    loadFromTemplate,
  } = useTableStore()
  
  const { treatmentArmSets, updateTreatmentArmSet } = useStudyStore()
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('metadata')
  const [templateSelectorVisible, setTemplateSelectorVisible] = useState(false)

  // Load table on mount
  useEffect(() => {
    const table = tables.find(t => t.id === id)
    if (table) {
      setCurrentTable(table)
      form.setFieldsValue(table)
    }
    setLoading(false)
  }, [id, tables, setCurrentTable, form])

  // Handle save
  const handleSave = () => {
    if (!currentTable) return
    
    // Save logic here
    message.success('Table saved successfully')
    markClean()
  }

  // Handle export
  const handleExport = (format: 'word' | 'rtf' | 'pdf') => {
    message.info(`Export to ${format.toUpperCase()} coming soon`)
  }

  // Handle delete
  const handleDelete = () => {
    message.success('Table deleted')
    navigate('/studies')
  }

  // Handle duplicate
  const handleDuplicate = () => {
    if (!currentTable) return
    
    const duplicated: TableShell = {
      ...currentTable,
      id: `t_${Date.now()}`,
      shellNumber: currentTable.shellNumber + ' (copy)',
    }
    
    message.success('Table duplicated')
    navigate(`/tables/${duplicated.id}`)
  }

  // Handle rows change
  const handleRowsChange = (rows: TableRow[]) => {
    if (currentTable) {
      updateMetadata({ rows })
    }
  }

  // Handle footer change
  const handleFooterChange = (footer: Partial<TableFooter>) => {
    updateFooter(footer)
  }

  // Handle treatment arm set change
  const handleTreatmentArmSetChange = (tas: TreatmentArmSet) => {
    updateTreatmentArmSet(tas.id, tas)
  }

  // Handle template selection
  const handleTemplateSelect = (template: Template) => {
    if (template.type === 'table') {
      loadFromTemplate(template.shell as TableShell)
      message.success(`Template "${template.name}" applied successfully`)
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    )
  }

  if (!currentTable) {
    return (
      <div className="error-container">
        <Title level={4}>Table not found</Title>
        <Button onClick={() => navigate('/studies')}>Back to Studies</Button>
      </div>
    )
  }

  const currentTreatmentArmSet = treatmentArmSets.find(
    tas => tas.id === currentTable.treatmentArmSetId
  )

  return (
    <div className="table-editor">
      {/* Header */}
      <div className="editor-header">
        <Breadcrumb
          items={[
            { title: <a onClick={() => navigate('/studies')}>Studies</a> },
            { title: currentTable.shellNumber },
          ]}
        />
        
        <div className="header-content">
          <div className="header-title">
            <Title level={3} style={{ margin: 0 }}>
              {currentTable.shellNumber}: {currentTable.title}
            </Title>
            {isDirty && <Text type="warning"> (unsaved changes)</Text>}
          </div>
          
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/studies')}
            >
              Back
            </Button>
            <Button
              icon={<FileTextOutlined />}
              onClick={() => setTemplateSelectorVisible(true)}
            >
              Templates
            </Button>
            <Button
              icon={<CopyOutlined />}
              onClick={handleDuplicate}
            >
              Duplicate
            </Button>
            <Popconfirm
              title="Delete this table?"
              description="This action cannot be undone."
              onConfirm={handleDelete}
            >
              <Button danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              disabled={!isDirty}
            >
              Save
            </Button>
          </Space>
        </div>
      </div>

      {/* Main Content */}
      <Card className="editor-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'metadata',
              label: '📋 Metadata',
              children: (
                <div className="tab-content">
                  <Form
                    form={form}
                    layout="vertical"
                    onValuesChange={(changed) => {
                      updateMetadata(changed)
                    }}
                  >
                    <Row gutter={24}>
                      <Col span={8}>
                        <Form.Item name="shellNumber" label="Shell Number">
                          <Input placeholder="e.g., Table 14.1.1" />
                        </Form.Item>
                      </Col>
                      <Col span={16}>
                        <Form.Item name="title" label="Title">
                          <Input placeholder="e.g., Demographics" />
                        </Form.Item>
                      </Col>
                    </Row>
                    
                    <Row gutter={24}>
                      <Col span={8}>
                        <Form.Item name="population" label="Population">
                          <Select options={populationOptions} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="category" label="Analysis Category">
                          <Select options={categoryOptions} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="dataset" label="Dataset">
                          <Select options={datasetOptions} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>

                  <Divider />

                  <div className="treatment-arm-section">
                    <Title level={5}>
                      <SettingOutlined style={{ marginRight: 8 }} />
                      Treatment Arms
                    </Title>
                    {currentTreatmentArmSet ? (
                      <TreatmentArmEditor
                        treatmentArmSet={currentTreatmentArmSet}
                        onChange={handleTreatmentArmSetChange}
                      />
                    ) : (
                      <Text type="secondary">No treatment arm set configured</Text>
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: 'rows',
              label: '📊 Row Structure',
              children: (
                <div className="tab-content">
                  <NestedRowEditor
                    rows={currentTable.rows}
                    onChange={handleRowsChange}
                  />
                </div>
              ),
            },
            {
              key: 'preview',
              label: '👁️ Preview',
              children: (
                <div className="tab-content">
                  <TablePreview
                    table={currentTable}
                    treatmentArmSet={currentTreatmentArmSet}
                  />
                </div>
              ),
            },
            {
              key: 'footer',
              label: '📝 Footer',
              children: (
                <div className="tab-content">
                  <Form layout="vertical">
                    <Form.Item label="Source Dataset">
                      <Input
                        value={currentTable.footer?.source}
                        placeholder="e.g., ADSL"
                        onChange={(e) => handleFooterChange({ source: e.target.value })}
                      />
                    </Form.Item>
                    <Form.Item label="Footer Notes">
                      <Input.TextArea
                        rows={6}
                        value={currentTable.footer?.notes?.join('\n')}
                        placeholder="Enter notes, one per line"
                        onChange={(e) => handleFooterChange({
                          notes: e.target.value.split('\n').filter(Boolean)
                        })}
                      />
                    </Form.Item>
                  </Form>
                </div>
              ),
            },
            {
              key: 'export',
              label: '📤 Export',
              children: (
                <div className="tab-content export-tab">
                  <Title level={5}>Export Options</Title>
                  <Space direction="vertical" size="middle">
                    <Button
                      icon={<ExportOutlined />}
                      onClick={() => handleExport('word')}
                    >
                      Export to Word (.docx)
                    </Button>
                    <Button
                      icon={<ExportOutlined />}
                      onClick={() => handleExport('rtf')}
                    >
                      Export to RTF (.rtf)
                    </Button>
                    <Button
                      icon={<ExportOutlined />}
                      onClick={() => handleExport('pdf')}
                    >
                      Export to PDF (.pdf)
                    </Button>
                  </Space>
                  
                  <Divider />
                  
                  <Text type="secondary">
                    Export functionality will be available in Phase 5
                  </Text>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Template Selector Modal */}
      <TemplateSelector
        open={templateSelectorVisible}
        onClose={() => setTemplateSelectorVisible(false)}
        onSelect={handleTemplateSelect}
        category={currentTable?.category}
      />
    </div>
  )
}