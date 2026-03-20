/**
 * TFL Builder - Axes Configuration
 *
 * Configure X/Y axis properties for figures
 */
import { Card, Form, Input, InputNumber, Select, Space, Typography, Divider } from 'antd';
import type { IAxisConfig, AxisType } from '../../types';

const { Title, Text } = Typography;

interface Props {
  xAxis: IAxisConfig;
  yAxis: IAxisConfig;
  onXAxisChange: (config: Partial<IAxisConfig>) => void;
  onYAxisChange: (config: Partial<IAxisConfig>) => void;
  disabled?: boolean;
}

export default function AxesConfig({
  xAxis,
  yAxis,
  onXAxisChange,
  onYAxisChange,
  disabled = false
}: Props) {
  const [form] = Form.useForm();

  return (
    <Card title="Axes Configuration" size="small">
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          xLabel: xAxis.label,
          xType: xAxis.type,
          xRangeMin: xAxis.range?.[0],
          xRangeMax: xAxis.range?.[1],
          xLogScale: xAxis.logScale,
          xTickFormat: xAxis.tickFormat,
          yLabel: yAxis.label,
          yType: yAxis.type,
          yRangeMin: yAxis.range?.[0],
          yRangeMax: yAxis.range?.[1],
          yLogScale: yAxis.logScale,
          yTickFormat: yAxis.tickFormat,
        }}
      >
        <Title level={5}>X Axis</Title>
        <Space direction="vertical" size="small">
          <Form.Item
            name="xLabel"
            label="Label"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input
              placeholder="e.g., Time (days)"
              disabled={disabled}
              onChange={e => onXAxisChange({ label: e.target.value })}
            />
          </Form.Item>

          <Form.Item name="xType" label="Type">
            <Select
              options={[
                { value: 'continuous', label: 'Continuous' },
                { value: 'categorical', label: 'Categorical' },
                { value: 'date', label: 'Date' },
              ]}
              disabled={disabled}
              onChange={e => onXAxisChange({ type: e as AxisType })}
            />
          </Form.Item>

          <Form.Item label="Range">
            <Space size="small">
              <InputNumber
                placeholder="Min"
                value={xAxis.range?.[0]}
                disabled={disabled}
                onChange={value => value !== null && onXAxisChange({ range: [value, xAxis.range?.[1] ?? 0] })}
                style={{ width: 100 }}
              />
              <InputNumber
                placeholder="Max"
                value={xAxis.range?.[1]}
                disabled={disabled}
                onChange={value => value !== null && onXAxisChange({ range: [xAxis.range?.[0] ?? 0, value] })}
                style={{ width: 100 }}
              />
            </Space>
          </Form.Item>

          <Form.Item name="xLogScale" valuePropName="checked">
            <Space>
              <Text>Log Scale</Text>
              <Input
                type="checkbox"
                disabled={disabled}
                onChange={e => onXAxisChange({ logScale: e.target.checked })}
              />
            </Space>
          </Form.Item>

          <Form.Item name="xTickFormat" label="Tick Format">
            <Select
              options={[
                { value: '', label: 'Default' },
                { value: '.1f', label: '0.1' },
                { value: '.2f', label: '0.12' },
                { value: '.1%', label: '0.1%' },
                { value: '.2%', label: '0.2%' },
                { value: '.0f', label: 'Integer' },
              ]}
              disabled={disabled}
              onChange={value => onXAxisChange({ tickFormat: value })}
            />
          </Form.Item>
        </Space>

        <Divider />

        <Title level={5}>Y Axis</Title>
        <Space direction="vertical" size="small">
          <Form.Item
            name="yLabel"
            label="Label"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input
              placeholder="e.g., Survival Probability"
              disabled={disabled}
              onChange={e => onYAxisChange({ label: e.target.value })}
            />
          </Form.Item>

          <Form.Item name="yType" label="Type">
            <Select
              options={[
                { value: 'continuous', label: 'Continuous' },
                { value: 'categorical', label: 'Categorical' },
                { value: 'date', label: 'Date' },
              ]}
              disabled={disabled}
              onChange={e => onYAxisChange({ type: e as AxisType })}
            />
          </Form.Item>

          <Form.Item label="Range">
            <Space size="small">
              <InputNumber
                placeholder="Min"
                value={yAxis.range?.[0]}
                disabled={disabled}
                onChange={value => value !== null && onYAxisChange({ range: [value, yAxis.range?.[1] ?? 0] })}
                style={{ width: 100 }}
              />
              <InputNumber
                placeholder="Max"
                value={yAxis.range?.[1]}
                disabled={disabled}
                onChange={value => value !== null && onYAxisChange({ range: [yAxis.range?.[0] ?? 0, value] })}
                style={{ width: 100 }}
              />
            </Space>
          </Form.Item>

          <Form.Item name="yLogScale" valuePropName="checked">
            <Space>
              <Text>Log Scale</Text>
              <Input
                type="checkbox"
                disabled={disabled}
                onChange={e => onYAxisChange({ logScale: e.target.checked })}
              />
            </Space>
          </Form.Item>

          <Form.Item name="yTickFormat" label="Tick Format">
            <Select
              options={[
                { value: '', label: 'Default' },
                { value: '.1f', label: '0.1' },
                { value: '.2f', label: '0.12' },
                { value: '.1%', label: '0.1%' },
                { value: '.2%', label: '0.2%' },
                { value: '.0f', label: 'Integer' },
              ]}
              disabled={disabled}
              onChange={value => onYAxisChange({ tickFormat: value })}
            />
          </Form.Item>
        </Space>
      </Form>
    </Card>
  );
}
