/**
 * TFL Builder - Series Configuration
 *
 * Configure data series for figures
 */
import { useState, useMemo } from 'react';
import { Card, Button, Space, Input, ColorPicker, Select, InputNumber, Tag, message, Typography } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  DragOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import type { IChartSeries, ChartType } from '../../types';

const { Text } = Typography;

interface Props {
  series: IChartSeries[];
  chartType?: ChartType;
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<IChartSeries>) => void;
  onDelete: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  disabled?: boolean;
}

// Color presets for series
const COLOR_PRESETS = [
  '#1890ff', // Blue
  '#52c41a', // Red
  '#52c41a', // Green
  '#faad14', // Orange
  '#722ed1', // Cyan
  '#eb2f96', // Purple
  '#fadb14', // Gold
  '#13c2c2', // Teal
  '#9254de', // Light blue
  '#f5222d', // Pink
];

export default function SeriesConfig({
  series,
  chartType = 'line',
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  disabled = false
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
      name: seriesItem.name + ' (copy)',
    };

    const idx = series.findIndex(s => s.id === id);
    onAdd();
    onUpdate(series[idx + 1].id, duplicate);
    message.success('Series duplicated');
  };

  // Reorder series
  const moveSeries = (fromIndex: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (newIdx >= 0 && newIdx < series.length) {
      onReorder(fromIndex, newIdx);
    }
  };

  return (
    <Card
      title={
        <Space>
          <span>Data Series</span>
          <Tag color="blue">{series.length}</Tag>
        </Space>
      }
      extra={
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={onAdd}
          disabled={disabled}
        >
          Add Series
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {series.map((s, index) => (
          <Card
            key={s.id}
            size="small"
            style={{
              marginBottom: 12,
              opacity: hiddenSeries.has(s.id) ? 0.5 : 1,
              pointerEvents: hiddenSeries.has(s.id) ? 'none' : undefined,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
                padding: '8px',
                backgroundColor: '#fafafa',
                borderRadius: 4,
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
            <Space direction="vertical" size="small" style={{ marginLeft: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>
                Series Name
              </label>
              <Input
                value={s.name || ''}
                disabled={disabled}
                onChange={e => handleUpdate(s.id, 'name', e.target.value)}
                placeholder="e.g., Treatment A"
              />
            </div>

            {/* Color Picker */}
            <div>
              <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>
                Color
              </label>
              <Space size="small">
                {COLOR_PRESETS.map(color => (
                  <div
                    key={color}
                    onClick={() => handleUpdate(s.id, 'color', color)}
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: color,
                      border: s.color === color ? '2px solid #1890ff' : '2px solid #d9d9d9',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Space>
              {s.color && (
                <Input
                  type="color"
                  value={s.color}
                  disabled={disabled}
                  onChange={e => handleUpdate(s.id, 'color', e.target.value)}
                  style={{ width: 80 }}
                />
              )}
            </div>

            {/* Marker Configuration - for line/scatter charts */}
            {['line', 'scatter', 'km_curve'].includes(chartType) && (
              <>
                <div>
                  <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>
                    Marker Symbol
                  </label>
                  <Select
                    value={s.marker?.symbol || 'circle'}
                    disabled={disabled}
                    onChange={value => handleUpdate(s.id, 'marker', { symbol: value })}
                    style={{ width: '100%' }}
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
                  <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>
                    Marker Size
                  </label>
                  <Space size="small">
                    <InputNumber
                      min={4}
                      max={20}
                      value={s.marker?.size || 8}
                      disabled={disabled}
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
                  <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>
                    Line Width
                  </label>
                  <InputNumber
                    min={0.5}
                    max={6}
                    step={0.5}
                    value={s.line?.width || 2}
                    disabled={disabled}
                    onChange={value => value !== null && handleUpdate(s.id, 'line', { width: value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>
                    Line Style
                  </label>
                  <Select
                    value={s.line?.dash || 'solid'}
                    disabled={disabled}
                    onChange={value => handleUpdate(s.id, 'line', { dash: value as 'solid' | 'dash' | 'dot' | 'dashdot' })}
                    style={{ width: '100%' }}
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
                display: 'flex',
                gap: 4,
                marginTop: 8,
                paddingTop: 8,
                borderTop: '1px solid #e8e8e8',
              }}
            >
              <Button
                size="small"
                type="text"
                icon={<CopyOutlined />}
                onClick={() => handleDuplicate(s.id)}
                disabled={disabled}
                title="Duplicate series"
              />
              {series.length > 1 && (
                <>
                  <Button
                    size="small"
                    type="text"
                    icon={<DeleteOutlined />}
                    danger
                    onClick={() => handleDelete(s.id)}
                    disabled={disabled}
                    title="Delete series"
                  />
                  <Button
                    size="small"
                    type="text"
                    icon={<DragOutlined />}
                    disabled={disabled || index === 0}
                    onClick={() => moveSeries(index, 'up')}
                    title="Move up"
                  />
                  <Button
                    size="small"
                    type="text"
                    icon={<DragOutlined />}
                    disabled={disabled || index === series.length - 1}
                    onClick={() => moveSeries(index, 'down')}
                    title="Move down"
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
