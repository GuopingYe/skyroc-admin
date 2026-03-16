import { useState, useMemo } from 'react'
import {
  Modal,
  Input,
  Tabs,
  List,
  Tag,
  Typography,
  Empty,
  Button,
  Descriptions,
  Divider,
} from 'antd'
import {
  SearchOutlined,
  FileTextOutlined,
  TableOutlined,
} from '@ant-design/icons'
import { 
  allTemplates, 
  getTemplatesByCategory,
  searchTemplates,
} from '../../data/templates'
import type { Template, TableShell, AnalysisCategory } from '../../types'

const { Text, Title } = Typography

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (template: Template) => void
  category?: AnalysisCategory
}

const categoryColors: Record<string, string> = {
  Demographics: 'blue',
  Disposition: 'green',
  Adverse_Events: 'red',
  Laboratory: 'purple',
  Vital_Signs: 'cyan',
  Concomitant_Meds: 'orange',
  Efficacy: 'gold',
  Protocol_Deviations: 'magenta',
  Other: 'default',
}

const categoryLabels: Record<string, string> = {
  Demographics: '人口统计学',
  Disposition: '受试者状态',
  Adverse_Events: '不良事件',
  Laboratory: '实验室检查',
  Vital_Signs: '生命体征',
  Concomitant_Meds: '合并用药',
  Efficacy: '疗效',
  Protocol_Deviations: '方案偏离',
  Other: '其他',
}

export default function TemplateSelector({ open, onClose, onSelect, category }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  // Filter templates by search query
  const filteredTemplates = useMemo(() => {
    if (searchQuery) {
      return searchTemplates(searchQuery)
    }
    if (category) {
      return getTemplatesByCategory(category)
    }
    return allTemplates
  }, [searchQuery, category])

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, Template[]> = {}
    filteredTemplates.forEach(t => {
      if (!groups[t.category]) {
        groups[t.category] = []
      }
      groups[t.category].push(t)
    })
    return groups
  }, [filteredTemplates])

  const handleSelect = (template: Template) => {
    setSelectedTemplate(template)
  }

  const handleApply = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate)
      handleClose()
    }
  }

  const handleClose = () => {
    setSearchQuery('')
    setSelectedTemplate(null)
    onClose()
  }

  // Preview content for selected template
  const renderPreview = () => {
    if (!selectedTemplate) {
      return (
        <Empty
          description="选择模板查看详情"
          style={{ padding: '40px 0' }}
        />
      )
    }

    const shell = selectedTemplate.shell as TableShell

    return (
      <div className="template-preview">
        <Title level={5}>{selectedTemplate.name}</Title>
        <Text type="secondary">{selectedTemplate.description}</Text>
        
        <Divider style={{ margin: '12px 0' }} />
        
        <Descriptions size="small" column={1} colon={false}>
          <Descriptions.Item label="Table Number">{shell.shellNumber}</Descriptions.Item>
          <Descriptions.Item label="Population">{shell.population}</Descriptions.Item>
          <Descriptions.Item label="Dataset">{shell.dataset}</Descriptions.Item>
          <Descriptions.Item label="Rows">{shell.rows?.length || 0}</Descriptions.Item>
        </Descriptions>
        
        <Divider style={{ margin: '12px 0' }} />
        
        <Title level={5}>行结构预览</Title>
        <div className="row-preview" style={{ maxHeight: 200, overflow: 'auto' }}>
          {shell.rows?.map(row => (
            <div 
              key={row.id} 
              style={{ 
                paddingLeft: row.level * 16,
                fontWeight: row.level === 0 ? 600 : 400,
                marginBottom: 4,
              }}
            >
              {row.label}
            </div>
          ))}
        </div>
        
        <Divider style={{ margin: '12px 0' }} />
        
        <Button type="primary" block onClick={handleApply}>
          应用此模板
        </Button>
      </div>
    )
  }

  const items = [
    {
      key: 'all',
      label: (
        <span>
          <TableOutlined style={{ marginRight: 4 }} />
          全部 ({allTemplates.length})
        </span>
      ),
      children: (
        <div className="template-list-container" style={{ height: 400, overflow: 'auto' }}>
          {Object.entries(groupedTemplates).map(([cat, templates]) => (
            <div key={cat} style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>
                <Tag color={categoryColors[cat] || 'default'}>
                  {categoryLabels[cat] || cat}
                </Tag>
                <Text type="secondary">({templates.length})</Text>
              </div>
              <List
                size="small"
                dataSource={templates}
                renderItem={(template) => (
                  <List.Item
                    onClick={() => handleSelect(template)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: selectedTemplate?.id === template.id ? '#e6f7ff' : 'transparent',
                    }}
                  >
                    <List.Item.Meta
                      avatar={<FileTextOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
                      title={template.name}
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {(template.shell as TableShell).shellNumber}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'ae',
      label: (
        <span>
          <span style={{ marginRight: 4 }}>⚠️</span>
          不良事件 ({getTemplatesByCategory('Adverse_Events').length})
        </span>
      ),
      children: (
        <List
          dataSource={getTemplatesByCategory('Adverse_Events')}
          style={{ height: 400, overflow: 'auto' }}
          renderItem={(template) => (
            <List.Item
              onClick={() => handleSelect(template)}
              style={{
                cursor: 'pointer',
                backgroundColor: selectedTemplate?.id === template.id ? '#e6f7ff' : 'transparent',
              }}
            >
              <List.Item.Meta
                avatar={<FileTextOutlined style={{ fontSize: 20, color: 'red' }} />}
                title={template.name}
                description={template.description}
              />
            </List.Item>
          )}
        />
      ),
    },
    {
      key: 'demo',
      label: (
        <span>
          <span style={{ marginRight: 4 }}>👤</span>
          人口统计 ({getTemplatesByCategory('Demographics').length})
        </span>
      ),
      children: (
        <List
          dataSource={getTemplatesByCategory('Demographics')}
          style={{ height: 400, overflow: 'auto' }}
          renderItem={(template) => (
            <List.Item
              onClick={() => handleSelect(template)}
              style={{
                cursor: 'pointer',
                backgroundColor: selectedTemplate?.id === template.id ? '#e6f7ff' : 'transparent',
              }}
            >
              <List.Item.Meta
                avatar={<FileTextOutlined style={{ fontSize: 20, color: 'blue' }} />}
                title={template.name}
                description={template.description}
              />
            </List.Item>
          )}
        />
      ),
    },
  ]

  return (
    <Modal
      title="选择模板"
      open={open}
      onCancel={handleClose}
      width={900}
      footer={null}
    >
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Left: Template List */}
        <div style={{ flex: '1 1 60%' }}>
          <Input
            placeholder="搜索模板..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Tabs items={items} />
        </div>
        
        {/* Right: Preview */}
        <div style={{ flex: '1 1 40%', borderLeft: '1px solid #f0f0f0', paddingLeft: 16 }}>
          {renderPreview()}
        </div>
      </div>
    </Modal>
  )
}