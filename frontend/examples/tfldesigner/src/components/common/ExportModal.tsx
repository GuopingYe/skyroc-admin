import { useState } from 'react'
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Switch,
  Space,
  Button,
  Typography,
  Divider,
  Radio,
  message,
} from 'antd'
import {
  DownloadOutlined,
  FileWordOutlined,
  FilePdfOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { 
  generateWordDocument,
  generateRTFDocument,
  downloadFile,
  type ExportOptions,
} from '../../utils/exportUtils'
import type { TableShell, TreatmentArmSet } from '../../types'

const { Text, Title } = Typography

interface Props {
  open: boolean
  onClose: () => void
  tables: TableShell[]
  treatmentArmSets: Map<string, TreatmentArmSet>
}

const defaultOptions: ExportOptions = {
  format: 'word',
  pageSize: 'A4',
  orientation: 'portrait',
  margins: { top: 25, bottom: 25, left: 20, right: 20 },
  includePageNumbers: true,
  fontSize: 10,
  fontFamily: 'Courier New',
}

export default function ExportModal({ open, onClose, tables, treatmentArmSets }: Props) {
  const [form] = Form.useForm()
  const [exporting, setExporting] = useState(false)
  const [selectedTables, setSelectedTables] = useState<string[]>(tables.map(t => t.id))

  const handleExport = async () => {
    const values = await form.validateFields()
    const options: ExportOptions = {
      ...defaultOptions,
      ...values,
      margins: {
        top: values.marginTop || 25,
        bottom: values.marginBottom || 25,
        left: values.marginLeft || 20,
        right: values.marginRight || 20,
      },
    }

    setExporting(true)

    try {
      const tablesToExport = tables.filter(t => selectedTables.includes(t.id))
      
      if (tablesToExport.length === 0) {
        message.warning('请选择要导出的表格')
        return
      }

      let blob: Blob
      let filename: string

      switch (options.format) {
        case 'word':
          blob = await generateWordDocument(tablesToExport, treatmentArmSets, options)
          filename = `TFL_Tables_${Date.now()}.doc`
          break
        case 'rtf':
          const rtfContent = generateRTFDocument(tablesToExport, treatmentArmSets, options)
          blob = new Blob([rtfContent], { type: 'application/rtf' })
          filename = `TFL_Tables_${Date.now()}.rtf`
          break
        case 'pdf':
          // For PDF, we'll use HTML for now (can be converted in browser)
          blob = await generateWordDocument(tablesToExport, treatmentArmSets, options)
          filename = `TFL_Tables_${Date.now()}.html`
          message.info('PDF 导出将生成 HTML 文件，可在浏览器中打印为 PDF')
          break
        default:
          throw new Error('不支持的导出格式')
      }

      downloadFile(blob, filename)
      message.success(`已导出 ${tablesToExport.length} 个表格`)
      onClose()
    } catch (error) {
      message.error('导出失败: ' + (error as Error).message)
    } finally {
      setExporting(false)
    }
  }

  const formatIcon = (format: string) => {
    switch (format) {
      case 'word':
        return <FileWordOutlined style={{ color: '#2b579a' }} />
      case 'pdf':
        return <FilePdfOutlined style={{ color: '#d93025' }} />
      case 'rtf':
        return <FileTextOutlined style={{ color: '#666' }} />
      default:
        return null
    }
  }

  return (
    <Modal
      title="导出 TFL"
      open={open}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="export"
          type="primary"
          icon={<DownloadOutlined />}
          loading={exporting}
          onClick={handleExport}
        >
          导出
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={defaultOptions}
      >
        {/* 格式选择 */}
        <Form.Item name="format" label="导出格式">
          <Radio.Group>
            <Radio.Button value="word">
              <Space>
                {formatIcon('word')}
                Word (.doc)
              </Space>
            </Radio.Button>
            <Radio.Button value="rtf">
              <Space>
                {formatIcon('rtf')}
                RTF (.rtf)
              </Space>
            </Radio.Button>
            <Radio.Button value="pdf">
              <Space>
                {formatIcon('pdf')}
                PDF (.pdf)
              </Space>
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Divider />

        {/* 页面设置 */}
        <Title level={5}>页面设置</Title>
        
        <Form.Item name="pageSize" label="纸张大小">
          <Select style={{ width: 120 }}>
            <Select.Option value="A4">A4</Select.Option>
            <Select.Option value="Letter">Letter</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="orientation" label="页面方向">
          <Select style={{ width: 120 }}>
            <Select.Option value="portrait">纵向</Select.Option>
            <Select.Option value="landscape">横向</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="页边距 (mm)">
          <Space>
            <Form.Item name="marginTop" noStyle>
              <InputNumber min={0} max={50} placeholder="上" style={{ width: 70 }} />
            </Form.Item>
            <Form.Item name="marginBottom" noStyle>
              <InputNumber min={0} max={50} placeholder="下" style={{ width: 70 }} />
            </Form.Item>
            <Form.Item name="marginLeft" noStyle>
              <InputNumber min={0} max={50} placeholder="左" style={{ width: 70 }} />
            </Form.Item>
            <Form.Item name="marginRight" noStyle>
              <InputNumber min={0} max={50} placeholder="右" style={{ width: 70 }} />
            </Form.Item>
          </Space>
        </Form.Item>

        <Form.Item name="fontSize" label="字体大小 (pt)">
          <Select style={{ width: 100 }}>
            <Select.Option value={8}>8pt</Select.Option>
            <Select.Option value={9}>9pt</Select.Option>
            <Select.Option value={10}>10pt</Select.Option>
            <Select.Option value={11}>11pt</Select.Option>
            <Select.Option value={12}>12pt</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="includePageNumbers" label="包含页码" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Divider />

        {/* 表格选择 */}
        <Title level={5}>选择导出的表格</Title>
        <div style={{ maxHeight: 200, overflow: 'auto' }}>
          {tables.map(table => (
            <div 
              key={table.id}
              style={{ 
                padding: '8px 12px',
                backgroundColor: selectedTables.includes(table.id) ? '#e6f7ff' : '#fff',
                border: '1px solid #f0f0f0',
                borderRadius: 4,
                marginBottom: 4,
                cursor: 'pointer',
              }}
              onClick={() => {
                setSelectedTables(prev => 
                  prev.includes(table.id)
                    ? prev.filter(id => id !== table.id)
                    : [...prev, table.id]
                )
              }}
            >
              <Space>
                <input 
                  type="checkbox" 
                  checked={selectedTables.includes(table.id)}
                  onChange={() => {}}
                />
                <Text strong>{table.shellNumber}</Text>
                <Text type="secondary">{table.title}</Text>
              </Space>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          <Space>
            <Button 
              size="small" 
              onClick={() => setSelectedTables(tables.map(t => t.id))}
            >
              全选
            </Button>
            <Button 
              size="small" 
              onClick={() => setSelectedTables([])}
            >
              清除
            </Button>
          </Space>
          <Text type="secondary" style={{ marginLeft: 16 }}>
            已选择 {selectedTables.length} / {tables.length} 个表格
          </Text>
        </div>
      </Form>
    </Modal>
  )
}