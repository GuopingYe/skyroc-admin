import { Card, Form, Input, Select, Switch, Row, Col, InputNumber } from 'antd'
import type { AxisConfig } from '../../types'

interface Props {
  xAxis: AxisConfig
  yAxis: AxisConfig
  onXAxisChange: (config: Partial<AxisConfig>) => void
  onYAxisChange: (config: Partial<AxisConfig>) => void
}

const typeOptions = [
  { value: 'continuous', label: 'Continuous' },
  { value: 'categorical', label: 'Categorical' },
  { value: 'date', label: 'Date' },
]

export default function AxesConfig({ xAxis, yAxis, onXAxisChange, onYAxisChange }: Props) {
  return (
    <Row gutter={24}>
      <Col span={12}>
        <Card title="X-Axis" size="small">
          <Form layout="vertical">
            <Form.Item label="Label">
              <Input value={xAxis.label} onChange={e => onXAxisChange({ label: e.target.value })} />
            </Form.Item>
            <Form.Item label="Type">
              <Select value={xAxis.type} options={typeOptions} onChange={val => onXAxisChange({ type: val })} />
            </Form.Item>
            <Form.Item label="Log Scale">
              <Switch checked={xAxis.logScale} onChange={checked => onXAxisChange({ logScale: checked })} />
            </Form.Item>
          </Form>
        </Card>
      </Col>
      <Col span={12}>
        <Card title="Y-Axis" size="small">
          <Form layout="vertical">
            <Form.Item label="Label">
              <Input value={yAxis.label} onChange={e => onYAxisChange({ label: e.target.value })} />
            </Form.Item>
            <Form.Item label="Type">
              <Select value={yAxis.type} options={typeOptions} onChange={val => onYAxisChange({ type: val })} />
            </Form.Item>
            <Form.Item label="Range Min">
              <InputNumber value={yAxis.range?.[0]} onChange={val => onYAxisChange({ range: [val ?? 0, yAxis.range?.[1] ?? 100] })} />
            </Form.Item>
            <Form.Item label="Range Max">
              <InputNumber value={yAxis.range?.[1]} onChange={val => onYAxisChange({ range: [yAxis.range?.[0] ?? 0, val ?? 100] })} />
            </Form.Item>
            <Form.Item label="Log Scale">
              <Switch checked={yAxis.logScale} onChange={checked => onYAxisChange({ logScale: checked })} />
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  )
}