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
  Breadcrumb,
  Typography,
  Spin,
  Divider,
} from 'antd'
import {
  SaveOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import ChartTypeSelector from '../components/figure/ChartTypeSelector'
import AxesConfig from '../components/figure/AxesConfig'
import SeriesConfig from '../components/figure/SeriesConfig'
import FigurePreview from '../components/figure/FigurePreview'
import { useFigureStore, createNewFigure } from '../stores/figureStore'
import type { ChartType, AxisConfig, ChartSeries } from '../types'
import './FigureEditor.css'

const { Title, Text } = Typography

const populationOptions = [
  { value: 'Safety', label: 'Safety' },
  { value: 'ITT', label: 'ITT' },
  { value: 'PP', label: 'Per-Protocol' },
]

export default function FigureEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('metadata')

  const {
    figure,
    setFigure,
    updateMetadata,
    setChartType,
    updateXAxis,
    updateYAxis,
    addSeries,
    updateSeries,
    removeSeries,
    reorderSeries,
    
    
    isDirty,
    markClean,
  } = useFigureStore()

  useEffect(() => {
    if (id === 'new') {
      setFigure(createNewFigure())
    }
    setLoading(false)
  }, [id, setFigure])

  const handleSave = () => {
    message.success('Figure saved successfully')
    markClean()
  }

  if (loading) {
    return <Spin size="large" />
  }

  return (
    <div className="figure-editor">
      <div className="editor-header">
        <Breadcrumb items={[{ title: <a onClick={() => navigate('/studies')}>Studies</a> }, { title: figure?.figureNumber || 'New Figure' }]} />
        <div className="header-content">
          <Title level={3} style={{ margin: 0 }}>
            {figure?.figureNumber}: {figure?.title || 'New Figure'}
          </Title>
          {isDirty && <Text type="warning"> (unsaved)</Text>}
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/studies')}>Back</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} disabled={!isDirty}>Save</Button>
          </Space>
        </div>
      </div>

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
                  <Form form={form} layout="vertical" initialValues={figure || {}}>
                    <Form.Item name="figureNumber" label="Figure Number">
                      <Input placeholder="e.g., Figure 14.2.1" onChange={e => updateMetadata({ figureNumber: e.target.value })} />
                    </Form.Item>
                    <Form.Item name="title" label="Title">
                      <Input placeholder="e.g., Kaplan-Meier Plot" onChange={e => updateMetadata({ title: e.target.value })} />
                    </Form.Item>
                    <Form.Item name="population" label="Population">
                      <Select options={populationOptions} onChange={val => updateMetadata({ population: val })} />
                    </Form.Item>
                  </Form>
                  <Divider />
                  <ChartTypeSelector value={figure?.chartType} onChange={(type: ChartType) => setChartType(type)} />
                </div>
              ),
            },
            {
              key: 'axes',
              label: '📐 Axes',
              children: figure ? (
                <AxesConfig
                  xAxis={figure.xAxis}
                  yAxis={figure.yAxis}
                  onXAxisChange={(config: Partial<AxisConfig>) => updateXAxis(config)}
                  onYAxisChange={(config: Partial<AxisConfig>) => updateYAxis(config)}
                />
              ) : null,
            },
            {
              key: 'series',
              label: '📊 Series',
              children: figure ? (
                <SeriesConfig
                  series={figure.series}
                  onAdd={() => addSeries()}
                  onUpdate={(id: string, updates: Partial<ChartSeries>) => updateSeries(id, updates)}
                  onRemove={(id: string) => removeSeries(id)}
                  onReorder={(from: number, to: number) => reorderSeries(from, to)}
                />
              ) : null,
            },
            {
              key: 'preview',
              label: '👁️ Preview',
              children: figure ? <FigurePreview figure={figure} /> : null,
            },
          ]}
        />
      </Card>
    </div>
  )
}