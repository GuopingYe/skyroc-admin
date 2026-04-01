/**
 * TFL Builder - Chart Type Selector
 *
 * Select chart type for figures
 */
import { Card, Radio, Space, Typography } from 'antd';
import type { RadioChangeEvent } from 'antd';

import type { ChartType } from '../../types';

const { Text, Title } = Typography;

interface Props {
  disabled?: boolean;
  onChange: (type: ChartType) => void;
  value?: ChartType;
}

const CHART_TYPES: Array<{
  description: string;
  icon: string;
  label: string;
  value: ChartType;
}> = [
  {
    description: 'Display trends over time with connected points',
    icon: '📈',
    label: 'Line Chart',
    value: 'line'
  },
  {
    description: 'Display relationship between two variables',
    icon: '🔵',
    label: 'Scatter Plot',
    value: 'scatter'
  },
  {
    description: 'Compare values across categories',
    icon: '📊',
    label: 'Bar Chart',
    value: 'bar'
  },
  {
    description: 'Display distribution of data',
    icon: '📦',
    label: 'Box Plot',
    value: 'box'
  },
  {
    description: 'Enhanced box plot with density',
    icon: '🎻',
    label: 'Violin Plot',
    value: 'violin'
  },
  {
    description: 'Display sequential changes',
    icon: '🌊',
    label: 'Waterfall Plot',
    value: 'waterfall'
  },
  {
    description: 'Survival probability over time',
    icon: '📉',
    label: 'Kaplan-Meier Curve',
    value: 'km_curve'
  },
  {
    description: 'Odds ratios with confidence intervals',
    icon: '🌲',
    label: 'Forest Plot',
    value: 'forest'
  }
];

export default function ChartTypeSelector({ disabled = false, onChange, value }: Props) {
  const handleChange = (e: RadioChangeEvent) => {
    onChange(e.target.value as ChartType);
  };

  return (
    <Card
      size="small"
      title="Chart Type"
    >
      <Radio.Group
        disabled={disabled}
        value={value}
        onChange={handleChange}
      >
        <Space
          direction="vertical"
          size="small"
          style={{ width: '100%' }}
        >
          {CHART_TYPES.map(type => (
            <div
              key={type.value}
              style={{ marginBottom: 16 }}
            >
              <Radio value={type.value}>
                <Space>
                  <span style={{ fontSize: 18, marginRight: 8 }}>{type.icon}</span>
                  <div>
                    <div>
                      <Text strong>{type.label}</Text>
                    </div>
                    <Text
                      style={{ fontSize: 11 }}
                      type="secondary"
                    >
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
