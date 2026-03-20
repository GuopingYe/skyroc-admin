/**
 * TFL Builder - Chart Type Selector
 *
 * Select chart type for figures
 */
import { Card, Radio, Space, Typography } from 'antd';
import type { RadioChangeEvent } from 'antd';
import type { ChartType } from '../../types';

const { Title, Text } = Typography;

interface Props {
  value?: ChartType;
  onChange: (type: ChartType) => void;
  disabled?: boolean;
}

const CHART_TYPES: Array<{
  value: ChartType;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: 'line',
    label: 'Line Chart',
    description: 'Display trends over time with connected points',
    icon: '📈',
  },
  {
    value: 'scatter',
    label: 'Scatter Plot',
    description: 'Display relationship between two variables',
    icon: '🔵',
  },
  {
    value: 'bar',
    label: 'Bar Chart',
    description: 'Compare values across categories',
    icon: '📊',
  },
  {
    value: 'box',
    label: 'Box Plot',
    description: 'Display distribution of data',
    icon: '📦',
  },
  {
    value: 'violin',
    label: 'Violin Plot',
    description: 'Enhanced box plot with density',
    icon: '🎻',
  },
  {
    value: 'waterfall',
    label: 'Waterfall Plot',
    description: 'Display sequential changes',
    icon: '🌊',
  },
  {
    value: 'km_curve',
    label: 'Kaplan-Meier Curve',
    description: 'Survival probability over time',
    icon: '📉',
  },
  {
    value: 'forest',
    label: 'Forest Plot',
    description: 'Odds ratios with confidence intervals',
    icon: '🌲',
  },
];

export default function ChartTypeSelector({ value, onChange, disabled = false }: Props) {
  const handleChange = (e: RadioChangeEvent) => {
    onChange(e.target.value as ChartType);
  };

  return (
    <Card title="Chart Type" size="small">
      <Radio.Group
        value={value}
        onChange={handleChange}
        disabled={disabled}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {CHART_TYPES.map(type => (
            <div key={type.value} style={{ marginBottom: 16 }}>
              <Radio value={type.value}>
                <Space>
                  <span style={{ fontSize: 18, marginRight: 8 }}>
                    {type.icon}
                  </span>
                  <div>
                    <div>
                      <Text strong>{type.label}</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {type.description}
                    </Text>
                  </div>
                </Space>
              </Radio>
            </div>
          ))}
        </Space>
      </Radio.Group>
    </Card>
  );
}
