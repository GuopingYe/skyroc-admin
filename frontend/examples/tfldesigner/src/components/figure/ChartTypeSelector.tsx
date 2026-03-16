import { Card, Typography, Row, Col } from 'antd'
import {
  LineChartOutlined,
  BarChartOutlined,
  DotChartOutlined,
  BoxPlotOutlined,
  StockOutlined,
} from '@ant-design/icons'
import type { ChartType } from '../../types'

const { Text } = Typography

interface Props {
  value?: ChartType
  onChange: (type: ChartType) => void
}

const chartTypes: { type: ChartType; name: string; icon: React.ReactNode; description: string }[] = [
  { type: 'line', name: 'Line Chart', icon: <LineChartOutlined />, description: 'Trend over time' },
  { type: 'bar', name: 'Bar Chart', icon: <BarChartOutlined />, description: 'Categorical comparison' },
  { type: 'scatter', name: 'Scatter Plot', icon: <DotChartOutlined />, description: 'Correlation analysis' },
  { type: 'box', name: 'Box Plot', icon: <BoxPlotOutlined />, description: 'Distribution summary' },
  { type: 'km_curve', name: 'Kaplan-Meier', icon: <StockOutlined />, description: 'Survival analysis' },
]

export default function ChartTypeSelector({ value, onChange }: Props) {
  return (
    <Card title="Chart Type" size="small">
      <Row gutter={[8, 8]}>
        {chartTypes.map(item => (
          <Col span={8} key={item.type}>
            <div
              onClick={() => onChange(item.type)}
              style={{
                padding: 12,
                border: `2px solid ${value === item.type ? '#1890ff' : '#f0f0f0'}`,
                borderRadius: 8,
                cursor: 'pointer',
                backgroundColor: value === item.type ? '#e6f7ff' : '#fff',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 24, color: value === item.type ? '#1890ff' : '#666' }}>
                {item.icon}
              </div>
              <Text strong style={{ display: 'block', marginTop: 8 }}>{item.name}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>{item.description}</Text>
            </div>
          </Col>
        ))}
      </Row>
    </Card>
  )
}