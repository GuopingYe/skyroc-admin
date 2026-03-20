/**
 * TFL Designer - Header Style Selector
 *
 * Choose from predefined header styles for tables.
 * Supports both controlled (value + onChange) and uncontrolled modes.
 */
import { useState, useCallback, useEffect } from 'react';
import {
  Card,
  Radio,
  Space,
  Typography,
  Divider,
  Tag,
  Select,
  InputNumber,
} from 'antd';

import type { HeaderFontStyle } from '../../types';
import { DEFAULT_HEADER_FONT_STYLE } from '../../types';

const { Text, Title } = Typography;

interface Props {
  readOnly?: boolean;
  value?: HeaderFontStyle;
  onChange?: (style: HeaderFontStyle) => void;
}

// Predefined header styles
const PREDEFINED_STYLES: HeaderFontStyle[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Standard clinical trial table format',
    titleFont: 'Arial',
    titleSize: 12,
    subtitleFont: 'Arial',
    subtitleSize: 11,
    columnHeaderFont: 'Arial',
    columnHeaderSize: 10,
    columnHeaderBackground: '#f0f0f0',
    alignment: 'center',
  },
  {
    id: 'fda_standard',
    name: 'FDA Standard',
    description: 'FDA-compliant table format',
    titleFont: 'Arial',
    titleSize: 12,
    subtitleFont: 'Arial',
    subtitleSize: 10,
    columnHeaderFont: 'Arial',
    columnHeaderSize: 9,
    columnHeaderBackground: '#e6e6e6',
    alignment: 'center',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, minimalist design',
    titleFont: 'Helvetica',
    titleSize: 14,
    subtitleFont: 'Helvetica',
    subtitleSize: 12,
    columnHeaderFont: 'Helvetica',
    columnHeaderSize: 11,
    columnHeaderBackground: '#fafafa',
    alignment: 'left',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Corporate presentation style',
    titleFont: 'Times New Roman',
    titleSize: 13,
    subtitleFont: 'Times New Roman',
    subtitleSize: 11,
    columnHeaderFont: 'Times New Roman',
    columnHeaderSize: 10,
    columnHeaderBackground: '#e8e8e8',
    alignment: 'center',
  },
  {
    id: 'clinical',
    name: 'Clinical Research',
    description: 'Standard clinical research format',
    titleFont: 'Verdana',
    titleSize: 12,
    subtitleFont: 'Verdana',
    subtitleSize: 11,
    columnHeaderFont: 'Verdana',
    columnHeaderSize: 10,
    columnHeaderBackground: '#f0f0f0',
    alignment: 'center',
  },
];

// Font options
const FONT_OPTIONS = [
  { label: 'Arial', value: 'Arial' },
  { label: 'Helvetica', value: 'Helvetica' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Calibri', value: 'Calibri' },
  { label: 'Georgia', value: 'Georgia' },
];

export default function HeaderStyleSelector({ readOnly = false, value, onChange }: Props) {
  // Controlled mode: use value/onChange; uncontrolled: use local state
  const controlled = value !== undefined && onChange !== undefined;
  const [localStyle, setLocalStyle] = useState<HeaderFontStyle>(value || DEFAULT_HEADER_FONT_STYLE);
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [customStyle, setCustomStyle] = useState<Partial<HeaderFontStyle>>({});

  const currentStyle = controlled ? value! : localStyle;

  const applyStyle = useCallback((style: HeaderFontStyle) => {
    if (controlled) {
      onChange!(style);
    } else {
      setLocalStyle(style);
    }
  }, [controlled, onChange]);

  // Sync local state when controlled value changes
  useEffect(() => {
    if (controlled && value) {
      setMode(value.id === 'custom' ? 'custom' : 'preset');
    }
  }, [controlled, value]);

  // Handle preset selection
  const handlePresetSelect = useCallback((styleId: string) => {
    const style = PREDEFINED_STYLES.find(s => s.id === styleId);
    if (style) {
      setCustomStyle({});
      setMode('preset');
      applyStyle(style);
    }
  }, [applyStyle]);

  // Handle custom style change
  const handleCustomChange = useCallback((field: keyof HeaderFontStyle, val: any) => {
    const updated = { ...customStyle, [field]: val };
    setCustomStyle(updated);
    setMode('custom');

    const fullStyle: HeaderFontStyle = {
      id: 'custom',
      name: 'Custom',
      description: 'User-defined style',
      titleFont: updated.titleFont || 'Arial',
      titleSize: updated.titleSize ?? 12,
      subtitleFont: updated.subtitleFont || 'Arial',
      subtitleSize: updated.subtitleSize ?? 11,
      columnHeaderFont: updated.columnHeaderFont || 'Arial',
      columnHeaderSize: updated.columnHeaderSize ?? 10,
      columnHeaderBackground: updated.columnHeaderBackground || '#f0f0f0',
      alignment: updated.alignment || 'center',
    };
    applyStyle(fullStyle);
  }, [customStyle, applyStyle]);

  return (
    <Card
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>Header Style</Title>
        </Space>
      }
      size="small"
    >
      {/* Mode Selection */}
      <div style={{ marginBottom: 16 }}>
        <Text strong>Style Source:</Text>
        <div style={{ marginTop: 8 }}>
          <Radio.Group
            value={mode}
            onChange={e => setMode(e.target.value)}
            disabled={readOnly}
          >
            <Radio value="preset">Predefined Styles</Radio>
            <Radio value="custom">Custom Style</Radio>
          </Radio.Group>
        </div>
      </div>

      <Divider />

      {mode === 'preset' && (
        <>
          <Text strong style={{ display: 'block', marginBottom: 12 }}>Select a Style:</Text>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {PREDEFINED_STYLES.map(style => (
              <div
                key={style.id}
                style={{
                  padding: 12,
                  border: currentStyle.id === style.id ? '2px solid #1890ff' : '1px solid #f0f0f0',
                  borderRadius: 4,
                  cursor: readOnly ? 'default' : 'pointer',
                }}
                onClick={() => !readOnly && handlePresetSelect(style.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <Text strong>{style.name}</Text>
                    {currentStyle.id === style.id && <Tag color="blue">Active</Tag>}
                  </Space>
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {style.description}
                </Text>
                <div style={{ marginTop: 8, fontSize: 10, color: '#666' }}>
                  <div>Font: {style.titleFont}</div>
                  <div>Title Size: {style.titleSize}pt</div>
                  <div>Alignment: {style.alignment}</div>
                </div>
              </div>
            ))}
          </Space>
        </>
      )}

      {mode === 'custom' && (
        <>
          <Text strong style={{ display: 'block', marginBottom: 12 }}>Customize Header Style:</Text>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Title Font:</Text>
              <Select
                value={customStyle.titleFont || currentStyle.titleFont}
                onChange={v => handleCustomChange('titleFont', v)}
                style={{ width: 150 }}
                disabled={readOnly}
                options={FONT_OPTIONS}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Title Size:</Text>
              <InputNumber
                value={customStyle.titleSize ?? currentStyle.titleSize}
                onChange={v => handleCustomChange('titleSize', v)}
                min={8}
                max={24}
                disabled={readOnly}
                style={{ width: 80 }}
                addonAfter="pt"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Subtitle Font:</Text>
              <Select
                value={customStyle.subtitleFont || currentStyle.subtitleFont}
                onChange={v => handleCustomChange('subtitleFont', v)}
                style={{ width: 150 }}
                disabled={readOnly}
                options={FONT_OPTIONS}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Subtitle Size:</Text>
              <InputNumber
                value={customStyle.subtitleSize ?? currentStyle.subtitleSize}
                onChange={v => handleCustomChange('subtitleSize', v)}
                min={8}
                max={20}
                disabled={readOnly}
                style={{ width: 80 }}
                addonAfter="pt"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Column Header Font:</Text>
              <Select
                value={customStyle.columnHeaderFont || currentStyle.columnHeaderFont}
                onChange={v => handleCustomChange('columnHeaderFont', v)}
                style={{ width: 150 }}
                disabled={readOnly}
                options={FONT_OPTIONS}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Column Header Size:</Text>
              <InputNumber
                value={customStyle.columnHeaderSize ?? currentStyle.columnHeaderSize}
                onChange={v => handleCustomChange('columnHeaderSize', v)}
                min={8}
                max={16}
                disabled={readOnly}
                style={{ width: 80 }}
                addonAfter="pt"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Header Background:</Text>
              <input
                type="color"
                value={customStyle.columnHeaderBackground || currentStyle.columnHeaderBackground}
                onChange={e => handleCustomChange('columnHeaderBackground', e.target.value)}
                disabled={readOnly}
                style={{ width: 50, height: 30, cursor: readOnly ? 'default' : 'pointer' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Alignment:</Text>
              <Select
                value={customStyle.alignment || currentStyle.alignment}
                onChange={v => handleCustomChange('alignment', v)}
                style={{ width: 120 }}
                disabled={readOnly}
                options={[
                  { label: 'Left', value: 'left' },
                  { label: 'Center', value: 'center' },
                  { label: 'Right', value: 'right' },
                ]}
              />
            </div>
          </Space>

          {/* Preview */}
          <Divider />
          <Text strong>Preview:</Text>
          <div
            style={{
              marginTop: 12,
              padding: 16,
              border: '1px solid #f0f0f0',
              borderRadius: 4,
              backgroundColor: '#fafafa',
            }}
          >
            <div
              style={{
                fontFamily: customStyle?.titleFont || currentStyle?.titleFont,
                fontSize: (customStyle?.titleSize ?? currentStyle?.titleSize ?? 12) * 0.8,
                fontWeight: 'bold',
                textAlign: customStyle?.alignment || currentStyle?.alignment,
                marginBottom: 8,
              }}
            >
              Table Title Example
            </div>
            <div
              style={{
                fontFamily: customStyle?.subtitleFont || currentStyle?.subtitleFont,
                fontSize: (customStyle?.subtitleSize ?? currentStyle?.subtitleSize ?? 11) * 0.8,
                textAlign: customStyle?.alignment || currentStyle?.alignment,
                marginBottom: 12,
                color: '#666',
              }}
            >
              Subtitle Example
            </div>
            <div
              style={{
                backgroundColor: customStyle?.columnHeaderBackground || currentStyle?.columnHeaderBackground,
                fontFamily: customStyle?.columnHeaderFont || currentStyle?.columnHeaderFont,
                fontSize: (customStyle?.columnHeaderSize ?? currentStyle?.columnHeaderSize ?? 10) * 0.8,
                textAlign: customStyle?.alignment || currentStyle?.alignment,
                padding: 8,
              }}
            >
              Column 1 &nbsp;&nbsp; Column 2 &nbsp;&nbsp; Column 3
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
