/**
 * TFL Builder - Series Configuration
 *
 * Configure data series for figures
 */
import {
  CopyOutlined,
  DeleteOutlined,
  DragOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { Button, Card, ColorPicker, Input, InputNumber, Select, Space, Tag, Typography, message } from 'antd';
import { useMemo, useState } from 'react';

import type { ChartType, IChartSeries } from '../../types';

const { Text } = Typography;

interface Props {
  chartType?: ChartType;
  disabled?: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onUpdate: (id: string, updates: Partial<IChartSeries>) => void;
  series: IChartSeries[];
}

// Color presets for series
const COLOR_PRESETS = [
  '#1890ff', // Blue
  '#f5222d', // Red
  '#52c41a', // Green
  '#faad14', // Orange
  '#722ed1', // Purple
  '#eb2f96', // Pink
  '#fadb14', // Gold
  '#13c2c2', // Cyan
  '#9254de', // Lavender
  '#fa541c' // Sunset
];

export default function SeriesConfig({
  chartType = 'line',
  disabled = false,
  onAdd,
  onDelete,
  onReorder,
  onUpdate,
  series
}: Props) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const toggleVisibility = (id: string) => {
    const newHidden = new Set(hiddenSeries);
    if (newHidden.has(id)) {
      newHidden.delete(id);
    } else {
      newHidden.add(id);
    }
    setHiddenSeries(newHidden);
  };

  const handleUpdate = (id: string, field: keyof IChartSeries, value: unknown) => {
    onUpdate(id, { [field]: value } as any);
  };

  const handleDelete = (id: string) => {
    if (series.length <= 1) {
      message.warning('At least one series must remain');
      return;
    }
    onDelete(id);
  };

  const handleDuplicate = (id: string) => {
    const seriesItem = series.find(s => s.id === id);
    if (!seriesItem) return;

    const duplicate: Omit<IChartSeries, 'id'> = {
      ...seriesItem,
      name: `${seriesItem.name} (copy)`
    };

    const idx = series.findIndex(s => s.id === id);
    onAdd();
    onUpdate(series[idx + 1].id, duplicate);
    message.success('Series duplicated');
  };

  // Reorder series
  const moveSeries = (fromIndex: number, direction: 'down' | 'up') => {
    const newIdx = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (newIdx >= 0 && newIdx < series.length) {
      onReorder(fromIndex, newIdx);
    }
  };

  return (
    <Card
      extra={
        <Button
          disabled={disabled}
          icon={<PlusOutlined />}
          size="small"
          type="primary"
          onClick={onAdd}
        >
          Add Series
        </Button>
      }
      title={
        <Space>
          <span>Data Series</span>
          <Tag color="blue">{series.length}</Tag>
        </Space>
      }
    >
      <Space
        direction="vertical"
        size="small"
        style={{ width: '100%' }}
      >
        {series.map((s, index) => (
          <Card
            key={s.id}
            size="small"
            style={{
              marginBottom: 12,
              opacity: hiddenSeries.has(s.id) ? 0.5 : 1,
              pointerEvents: hiddenSeries.has(s.id) ? 'none' : undefined
            }}
          >
            {/* Header */}
            <div
              style={{
                alignItems: 'center',
                backgroundColor: '#fafafa',
                borderRadius: 4,
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 12,
                padding: '8px'
              }}
            >
              <Space size="small">
                <Tag color={getColorTag(index)}>{index + 1}</Tag>
                <Text strong>{s.name}</Text>
              </Space>
              <Button
                size="small"
                type="text"
                onClick={() => toggleVisibility(s.id)}
              >
                {hiddenSeries.has(s.id) ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              </Button>
            </div>

            {/* Name Configuration */}
            <Space
              direction="vertical"
              size="small"
              style={{ marginLeft: 12 }}
            >
              <div>
                <label style={{ color: '#999', display: 'block', fontSize: 12, marginBottom: 4 }}>Series Name</label>
                <Input
                  disabled={disabled}
                  placeholder="e.g., Treatment A"
                  value={s.name || ''}
                  onChange={e => handleUpdate(s.id, 'name', e.target.value)}
                />
              </div>

              {/* Color Picker */}
              <div>
                <label style={{ color: '#999', display: 'block', fontSize: 12, marginBottom: 4 }}>Color</label>
                <Space size="small">
                  {COLOR_PRESETS.map(color => (
                    <div
                      key={color}
                      style={{
                        backgroundColor: color,
                        border: s.color === color ? '2px solid #1890ff' : '2px solid #d9d9d9',
                        borderRadius: 4,
                        cursor: 'pointer',
                        height: 24,
                        width: 24
                      }}
                      onClick={() => handleUpdate(s.id, 'color', color)}
                    />
                  ))}
                </Space>
                {s.color && (
                  <Input
                    disabled={disabled}
                    style={{ width: 80 }}
                    type="color"
                    value={s.color}
                    onChange={e => handleUpdate(s.id, 'color', e.target.value)}
                  />
                )}
              </div>

              {/* Marker Configuration - for line/scatter charts */}
              {['line', 'scatter', 'km_curve'].includes(chartType) && (
                <>
                  <div>
                    <label style={{ color: '#999', display: 'block', fontSize: 12, marginBottom: 4 }}>
                      Marker Symbol
                    </label>
                    <Select
                      disabled={disabled}
                      style={{ width: '100%' }}
                      value={s.marker?.symbol || 'circle'}
                      onChange={value => handleUpdate(s.id, 'marker', { symbol: value })}
                    >
                      <Select.Option value="circle">Circle</Select.Option>
                      <Select.Option value="square">Square</Select.Option>
                      <Select.Option value="diamond">Diamond</Select.Option>
                      <Select.Option value="triangle-up">Triangle Up</Select.Option>
                      <Select.Option value="triangle-down">Triangle Down</Select.Option>
                      <Select.Option value="cross">Cross</Select.Option>
                      <Select.Option value="star">Star</Select.Option>
                    </Select>
                  </div>
                  <div>
                    <label style={{ color: '#999', display: 'block', fontSize: 12, marginBottom: 4 }}>
                      Marker Size
                    </label>
                    <Space size="small">
                      <InputNumber
                        disabled={disabled}
                        max={20}
                        min={4}
                        value={s.marker?.size || 8}
                        onChange={value => value !== null && handleUpdate(s.id, 'marker', { size: value })}
                      />
                      <span>px</span>
                    </Space>
                  </div>
                </>
              )}

              {/* Line Style Configuration - for line charts */}
              {chartType === 'line' && (
                <>
                  <div>
                    <label style={{ color: '#999', display: 'block', fontSize: 12, marginBottom: 4 }}>Line Width</label>
                    <InputNumber
                      disabled={disabled}
                      max={6}
                      min={0.5}
                      step={0.5}
                      style={{ width: '100%' }}
                      value={s.line?.width || 2}
                      onChange={value => value !== null && handleUpdate(s.id, 'line', { width: value })}
                    />
                  </div>
                  <div>
                    <label style={{ color: '#999', display: 'block', fontSize: 12, marginBottom: 4 }}>Line Style</label>
                    <Select
                      disabled={disabled}
                      style={{ width: '100%' }}
                      value={s.line?.dash || 'solid'}
                      onChange={value =>
                        handleUpdate(s.id, 'line', { dash: value as 'dash' | 'dashdot' | 'dot' | 'solid' })
                      }
                    >
                      <Select.Option value="solid">Solid</Select.Option>
                      <Select.Option value="dash">Dashed</Select.Option>
                      <Select.Option value="dot">Dotted</Select.Option>
                      <Select.Option value="dashdot">Dash Dot</Select.Option>
                    </Select>
                  </div>
                </>
              )}

              {/* Actions */}
              <div
                style={{
                  borderTop: '1px solid #e8e8e8',
                  display: 'flex',
                  gap: 4,
                  marginTop: 8,
                  paddingTop: 8
                }}
              >
                <Button
                  disabled={disabled}
                  icon={<CopyOutlined />}
                  size="small"
                  title="Duplicate series"
                  type="text"
                  onClick={() => handleDuplicate(s.id)}
                />
                {series.length > 1 && (
                  <>
                    <Button
                      danger
                      disabled={disabled}
                      icon={<DeleteOutlined />}
                      size="small"
                      title="Delete series"
                      type="text"
                      onClick={() => handleDelete(s.id)}
                    />
                    <Button
                      disabled={disabled || index === 0}
                      icon={<DragOutlined />}
                      size="small"
                      title="Move up"
                      type="text"
                      onClick={() => moveSeries(index, 'up')}
                    />
                    <Button
                      disabled={disabled || index === series.length - 1}
                      icon={<DragOutlined />}
                      size="small"
                      title="Move down"
                      type="text"
                      onClick={() => moveSeries(index, 'down')}
                    />
                  </>
                )}
              </div>
            </Space>

            {/* Bottom drag handle */}
            {index > 0 && (
              <div style={{ marginTop: 8, textAlign: 'center' }}>
                <Text type="secondary">Drag to reorder</Text>
              </div>
            )}
          </Card>
        ))}
      </Space>
    </Card>
  );
}

function getColorTag(index: number): string {
  const colors = ['blue', 'green', 'cyan', 'orange', 'purple', 'pink', 'gold'];
  return colors[index % colors.length];
}
