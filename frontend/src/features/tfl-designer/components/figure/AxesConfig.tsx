/**
 * TFL Builder - Axes Configuration
 *
 * Configure X/Y axis properties for figures
 */
import { Card, Divider, Form, Input, InputNumber, Select, Space, Typography } from 'antd';

import type { AxisType, IAxisConfig } from '../../types';

const { Text, Title } = Typography;

interface Props {
  disabled?: boolean;
  onXAxisChange: (config: Partial<IAxisConfig>) => void;
  onYAxisChange: (config: Partial<IAxisConfig>) => void;
  xAxis: IAxisConfig;
  yAxis: IAxisConfig;
}

export default function AxesConfig({ disabled = false, onXAxisChange, onYAxisChange, xAxis, yAxis }: Props) {
  const [form] = Form.useForm();

  return (
    <Card
      size="small"
      title="Axes Configuration"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          xLabel: xAxis.label,
          xLogScale: xAxis.logScale,
          xRangeMax: xAxis.range?.[1],
          xRangeMin: xAxis.range?.[0],
          xTickFormat: xAxis.tickFormat,
          xType: xAxis.type,
          yLabel: yAxis.label,
          yLogScale: yAxis.logScale,
          yRangeMax: yAxis.range?.[1],
          yRangeMin: yAxis.range?.[0],
          yTickFormat: yAxis.tickFormat,
          yType: yAxis.type
        }}
      >
        <Title level={5}>X Axis</Title>
        <Space
          direction="vertical"
          size="small"
        >
          <Form.Item
            label="Label"
            name="xLabel"
            rules={[{ message: 'Required', required: true }]}
          >
            <Input
              disabled={disabled}
              placeholder="e.g., Time (days)"
              onChange={e => onXAxisChange({ label: e.target.value })}
            />
          </Form.Item>

          <Form.Item
            label="Type"
            name="xType"
          >
            <Select
              disabled={disabled}
              options={[
                { label: 'Continuous', value: 'continuous' },
                { label: 'Categorical', value: 'categorical' },
                { label: 'Date', value: 'date' }
              ]}
              onChange={e => onXAxisChange({ type: e as AxisType })}
            />
          </Form.Item>

          <Form.Item label="Range">
            <Space size="small">
              <InputNumber
                disabled={disabled}
                placeholder="Min"
                style={{ width: 100 }}
                value={xAxis.range?.[0]}
                onChange={value => value !== null && onXAxisChange({ range: [value, xAxis.range?.[1] ?? 0] })}
              />
              <InputNumber
                disabled={disabled}
                placeholder="Max"
                style={{ width: 100 }}
                value={xAxis.range?.[1]}
                onChange={value => value !== null && onXAxisChange({ range: [xAxis.range?.[0] ?? 0, value] })}
              />
            </Space>
          </Form.Item>

          <Form.Item
            name="xLogScale"
            valuePropName="checked"
          >
            <Space>
              <Text>Log Scale</Text>
              <Input
                disabled={disabled}
                type="checkbox"
                onChange={e => onXAxisChange({ logScale: e.target.checked })}
              />
            </Space>
          </Form.Item>

          <Form.Item
            label="Tick Format"
            name="xTickFormat"
          >
            <Select
              disabled={disabled}
              options={[
                { label: 'Default', value: '' },
                { label: '0.1', value: '.1f' },
                { label: '0.12', value: '.2f' },
                { label: '0.1%', value: '.1%' },
                { label: '0.2%', value: '.2%' },
                { label: 'Integer', value: '.0f' }
              ]}
              onChange={value => onXAxisChange({ tickFormat: value })}
            />
          </Form.Item>
        </Space>

        <Divider />

        <Title level={5}>Y Axis</Title>
        <Space
          direction="vertical"
          size="small"
        >
          <Form.Item
            label="Label"
            name="yLabel"
            rules={[{ message: 'Required', required: true }]}
          >
            <Input
              disabled={disabled}
              placeholder="e.g., Survival Probability"
              onChange={e => onYAxisChange({ label: e.target.value })}
            />
          </Form.Item>

          <Form.Item
            label="Type"
            name="yType"
          >
            <Select
              disabled={disabled}
              options={[
                { label: 'Continuous', value: 'continuous' },
                { label: 'Categorical', value: 'categorical' },
                { label: 'Date', value: 'date' }
              ]}
              onChange={e => onYAxisChange({ type: e as AxisType })}
            />
          </Form.Item>

          <Form.Item label="Range">
            <Space size="small">
              <InputNumber
                disabled={disabled}
                placeholder="Min"
                style={{ width: 100 }}
                value={yAxis.range?.[0]}
                onChange={value => value !== null && onYAxisChange({ range: [value, yAxis.range?.[1] ?? 0] })}
              />
              <InputNumber
                disabled={disabled}
                placeholder="Max"
                style={{ width: 100 }}
                value={yAxis.range?.[1]}
                onChange={value => value !== null && onYAxisChange({ range: [yAxis.range?.[0] ?? 0, value] })}
              />
            </Space>
          </Form.Item>

          <Form.Item
            name="yLogScale"
            valuePropName="checked"
          >
            <Space>
              <Text>Log Scale</Text>
              <Input
                disabled={disabled}
                type="checkbox"
                onChange={e => onYAxisChange({ logScale: e.target.checked })}
              />
            </Space>
          </Form.Item>

          <Form.Item
            label="Tick Format"
            name="yTickFormat"
          >
            <Select
              disabled={disabled}
              options={[
                { label: 'Default', value: '' },
                { label: '0.1', value: '.1f' },
                { label: '0.12', value: '.2f' },
                { label: '0.1%', value: '.1%' },
                { label: '0.2%', value: '.2%' },
                { label: 'Integer', value: '.0f' }
              ]}
              onChange={value => onYAxisChange({ tickFormat: value })}
            />
          </Form.Item>
        </Space>
      </Form>
    </Card>
  );
}
