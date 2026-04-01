/**
 * TFL Designer - Header Style Selector
 *
 * Choose from predefined header styles for tables. Supports both controlled (value + onChange) and uncontrolled modes.
 */
import { Card, Divider, InputNumber, Radio, Select, Space, Tag, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import type { HeaderFontStyle } from '../../types';
import { DEFAULT_HEADER_FONT_STYLE } from '../../types';

const { Text, Title } = Typography;

interface Props {
  onChange?: (style: HeaderFontStyle) => void;
  readOnly?: boolean;
  value?: HeaderFontStyle;
}

// Predefined header styles
const PREDEFINED_STYLES: HeaderFontStyle[] = [
  {
    alignment: 'center',
    columnHeaderBackground: '#f0f0f0',
    columnHeaderFont: 'Arial',
    columnHeaderSize: 10,
    description: 'Standard clinical trial table format',
    id: 'default',
    name: 'Default',
    subtitleFont: 'Arial',
    subtitleSize: 11,
    titleFont: 'Arial',
    titleSize: 12
  },
  {
    alignment: 'center',
    columnHeaderBackground: '#e6e6e6',
    columnHeaderFont: 'Arial',
    columnHeaderSize: 9,
    description: 'FDA-compliant table format',
    id: 'fda_standard',
    name: 'FDA Standard',
    subtitleFont: 'Arial',
    subtitleSize: 10,
    titleFont: 'Arial',
    titleSize: 12
  },
  {
    alignment: 'left',
    columnHeaderBackground: '#fafafa',
    columnHeaderFont: 'Helvetica',
    columnHeaderSize: 11,
    description: 'Clean, minimalist design',
    id: 'minimal',
    name: 'Minimal',
    subtitleFont: 'Helvetica',
    subtitleSize: 12,
    titleFont: 'Helvetica',
    titleSize: 14
  },
  {
    alignment: 'center',
    columnHeaderBackground: '#e8e8e8',
    columnHeaderFont: 'Times New Roman',
    columnHeaderSize: 10,
    description: 'Corporate presentation style',
    id: 'professional',
    name: 'Professional',
    subtitleFont: 'Times New Roman',
    subtitleSize: 11,
    titleFont: 'Times New Roman',
    titleSize: 13
  },
  {
    alignment: 'center',
    columnHeaderBackground: '#f0f0f0',
    columnHeaderFont: 'Verdana',
    columnHeaderSize: 10,
    description: 'Standard clinical research format',
    id: 'clinical',
    name: 'Clinical Research',
    subtitleFont: 'Verdana',
    subtitleSize: 11,
    titleFont: 'Verdana',
    titleSize: 12
  }
];

// Font options
const FONT_OPTIONS = [
  { label: 'Arial', value: 'Arial' },
  { label: 'Helvetica', value: 'Helvetica' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Calibri', value: 'Calibri' },
  { label: 'Georgia', value: 'Georgia' }
];

export default function HeaderStyleSelector({ onChange, readOnly = false, value }: Props) {
  // Controlled mode: use value/onChange; uncontrolled: use local state
  const controlled = value !== undefined && onChange !== undefined;
  const [localStyle, setLocalStyle] = useState<HeaderFontStyle>(value || DEFAULT_HEADER_FONT_STYLE);
  const [mode, setMode] = useState<'custom' | 'preset'>('preset');
  const [customStyle, setCustomStyle] = useState<Partial<HeaderFontStyle>>({});

  const currentStyle = controlled ? value! : localStyle;

  const applyStyle = useCallback(
    (style: HeaderFontStyle) => {
      if (controlled) {
        onChange!(style);
      } else {
        setLocalStyle(style);
      }
    },
    [controlled, onChange]
  );

  // Sync local state when controlled value changes
  useEffect(() => {
    if (controlled && value) {
      setMode(value.id === 'custom' ? 'custom' : 'preset');
    }
  }, [controlled, value]);

  // Handle preset selection
  const handlePresetSelect = useCallback(
    (styleId: string) => {
      const style = PREDEFINED_STYLES.find(s => s.id === styleId);
      if (style) {
        setCustomStyle({});
        setMode('preset');
        applyStyle(style);
      }
    },
    [applyStyle]
  );

  // Handle custom style change
  const handleCustomChange = useCallback(
    (field: keyof HeaderFontStyle, val: any) => {
      const updated = { ...customStyle, [field]: val };
      setCustomStyle(updated);
      setMode('custom');

      const fullStyle: HeaderFontStyle = {
        alignment: updated.alignment || 'center',
        columnHeaderBackground: updated.columnHeaderBackground || '#f0f0f0',
        columnHeaderFont: updated.columnHeaderFont || 'Arial',
        columnHeaderSize: updated.columnHeaderSize ?? 10,
        description: 'User-defined style',
        id: 'custom',
        name: 'Custom',
        subtitleFont: updated.subtitleFont || 'Arial',
        subtitleSize: updated.subtitleSize ?? 11,
        titleFont: updated.titleFont || 'Arial',
        titleSize: updated.titleSize ?? 12
      };
      applyStyle(fullStyle);
    },
    [customStyle, applyStyle]
  );

  return (
    <Card
      size="small"
      title={
        <Space>
          <Title
            level={5}
            style={{ margin: 0 }}
          >
            Header Style
          </Title>
        </Space>
      }
    >
      {/* Mode Selection */}
      <div style={{ marginBottom: 16 }}>
        <Text strong>Style Source:</Text>
        <div style={{ marginTop: 8 }}>
          <Radio.Group
            disabled={readOnly}
            value={mode}
            onChange={e => setMode(e.target.value)}
          >
            <Radio value="preset">Predefined Styles</Radio>
            <Radio value="custom">Custom Style</Radio>
          </Radio.Group>
        </div>
      </div>

      <Divider />

      {mode === 'preset' && (
        <>
          <Text
            strong
            style={{ display: 'block', marginBottom: 12 }}
          >
            Select a Style:
          </Text>
          <Space
            direction="vertical"
            size="middle"
            style={{ width: '100%' }}
          >
            {PREDEFINED_STYLES.map(style => (
              <div
                key={style.id}
                style={{
                  border: currentStyle.id === style.id ? '2px solid #1890ff' : '1px solid #f0f0f0',
                  borderRadius: 4,
                  cursor: readOnly ? 'default' : 'pointer',
                  padding: 12
                }}
                onClick={() => !readOnly && handlePresetSelect(style.id)}
              >
                <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
                  <Space>
                    <Text strong>{style.name}</Text>
                    {currentStyle.id === style.id && <Tag color="blue">Active</Tag>}
                  </Space>
                </div>
                <Text
                  style={{ fontSize: 11 }}
                  type="secondary"
                >
                  {style.description}
                </Text>
                <div style={{ color: '#666', fontSize: 10, marginTop: 8 }}>
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
          <Text
            strong
            style={{ display: 'block', marginBottom: 12 }}
          >
            Customize Header Style:
          </Text>
          <Space
            direction="vertical"
            size="middle"
            style={{ width: '100%' }}
          >
            <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
              <Text>Title Font:</Text>
              <Select
                disabled={readOnly}
                options={FONT_OPTIONS}
                style={{ width: 150 }}
                value={customStyle.titleFont || currentStyle.titleFont}
                onChange={v => handleCustomChange('titleFont', v)}
              />
            </div>
            <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
              <Text>Title Size:</Text>
              <InputNumber
                addonAfter="pt"
                disabled={readOnly}
                max={24}
                min={8}
                style={{ width: 80 }}
                value={customStyle.titleSize ?? currentStyle.titleSize}
                onChange={v => handleCustomChange('titleSize', v)}
              />
            </div>
            <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
              <Text>Subtitle Font:</Text>
              <Select
                disabled={readOnly}
                options={FONT_OPTIONS}
                style={{ width: 150 }}
                value={customStyle.subtitleFont || currentStyle.subtitleFont}
                onChange={v => handleCustomChange('subtitleFont', v)}
              />
            </div>
            <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
              <Text>Subtitle Size:</Text>
              <InputNumber
                addonAfter="pt"
                disabled={readOnly}
                max={20}
                min={8}
                style={{ width: 80 }}
                value={customStyle.subtitleSize ?? currentStyle.subtitleSize}
                onChange={v => handleCustomChange('subtitleSize', v)}
              />
            </div>
            <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
              <Text>Column Header Font:</Text>
              <Select
                disabled={readOnly}
                options={FONT_OPTIONS}
                style={{ width: 150 }}
                value={customStyle.columnHeaderFont || currentStyle.columnHeaderFont}
                onChange={v => handleCustomChange('columnHeaderFont', v)}
              />
            </div>
            <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
              <Text>Column Header Size:</Text>
              <InputNumber
                addonAfter="pt"
                disabled={readOnly}
                max={16}
                min={8}
                style={{ width: 80 }}
                value={customStyle.columnHeaderSize ?? currentStyle.columnHeaderSize}
                onChange={v => handleCustomChange('columnHeaderSize', v)}
              />
            </div>
            <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
              <Text>Header Background:</Text>
              <input
                disabled={readOnly}
                style={{ cursor: readOnly ? 'default' : 'pointer', height: 30, width: 50 }}
                type="color"
                value={customStyle.columnHeaderBackground || currentStyle.columnHeaderBackground}
                onChange={e => handleCustomChange('columnHeaderBackground', e.target.value)}
              />
            </div>
            <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
              <Text>Alignment:</Text>
              <Select
                disabled={readOnly}
                style={{ width: 120 }}
                value={customStyle.alignment || currentStyle.alignment}
                options={[
                  { label: 'Left', value: 'left' },
                  { label: 'Center', value: 'center' },
                  { label: 'Right', value: 'right' }
                ]}
                onChange={v => handleCustomChange('alignment', v)}
              />
            </div>
          </Space>

          {/* Preview */}
          <Divider />
          <Text strong>Preview:</Text>
          <div
            style={{
              backgroundColor: '#fafafa',
              border: '1px solid #f0f0f0',
              borderRadius: 4,
              marginTop: 12,
              padding: 16
            }}
          >
            <div
              style={{
                fontFamily: customStyle?.titleFont || currentStyle?.titleFont,
                fontSize: (customStyle?.titleSize ?? currentStyle?.titleSize ?? 12) * 0.8,
                fontWeight: 'bold',
                marginBottom: 8,
                textAlign: customStyle?.alignment || currentStyle?.alignment
              }}
            >
              Table Title Example
            </div>
            <div
              style={{
                color: '#666',
                fontFamily: customStyle?.subtitleFont || currentStyle?.subtitleFont,
                fontSize: (customStyle?.subtitleSize ?? currentStyle?.subtitleSize ?? 11) * 0.8,
                marginBottom: 12,
                textAlign: customStyle?.alignment || currentStyle?.alignment
              }}
            >
              Subtitle Example
            </div>
            <div
              style={{
                backgroundColor: customStyle?.columnHeaderBackground || currentStyle?.columnHeaderBackground,
                fontFamily: customStyle?.columnHeaderFont || currentStyle?.columnHeaderFont,
                fontSize: (customStyle?.columnHeaderSize ?? currentStyle?.columnHeaderSize ?? 10) * 0.8,
                padding: 8,
                textAlign: customStyle?.alignment || currentStyle?.alignment
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
