/**
 * TFL Template Editor - Interactive WYSIWYG Editor
 *
 * Provides a Word/PowerPoint-like editing experience for TFL templates. Features:
 *
 * - Direct inline editing of title, rows, columns, footers
 * - Floating formatting toolbar
 * - Element selection with visual feedback
 * - Drag-and-drop positioning (coming soon)
 */
import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BgColorsOutlined,
  BoldOutlined,
  FontSizeOutlined,
  ItalicOutlined,
  UnderlineOutlined
} from '@ant-design/icons';
import {
  Button,
  Card,
  ColorPicker,
  Divider,
  Empty,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { FigureShell, ListingColumn, ListingShell, TableRow, TableShell, Template } from '../../types';

const { Text } = Typography;

// ==================== Types ====================

export interface TextFormat {
  align?: 'center' | 'left' | 'right';
  bold?: boolean;
  color?: string;
  fontSize?: number;
  italic?: boolean;
  underline?: boolean;
}

interface TemplateEditorProps {
  mode?: 'edit-only' | 'full' | 'preview-only';
  onChange: (template: Template) => void;
  readOnly?: boolean;
  template: Template | null;
}

// ==================== Floating Toolbar ====================

interface FloatingToolbarProps {
  format: TextFormat;
  onClose: () => void;
  onFormatChange: (format: TextFormat) => void;
  position: { x: number; y: number };
  visible: boolean;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ format, onClose, onFormatChange, position, visible }) => {
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      className="fixed z-50 flex items-center gap-1 border border-gray-200 rounded-lg bg-white px-2 py-1 shadow-xl"
      ref={toolbarRef}
      style={{
        left: Math.min(position.x, window.innerWidth - 400),
        top: Math.max(position.y, 10)
      }}
    >
      <Tooltip title="Bold (Ctrl+B)">
        <Button
          icon={<BoldOutlined />}
          size="small"
          type={format.bold ? 'primary' : 'text'}
          onClick={() => onFormatChange({ ...format, bold: !format.bold })}
        />
      </Tooltip>
      <Tooltip title="Italic (Ctrl+I)">
        <Button
          icon={<ItalicOutlined />}
          size="small"
          type={format.italic ? 'primary' : 'text'}
          onClick={() => onFormatChange({ ...format, italic: !format.italic })}
        />
      </Tooltip>
      <Tooltip title="Underline (Ctrl+U)">
        <Button
          icon={<UnderlineOutlined />}
          size="small"
          type={format.underline ? 'primary' : 'text'}
          onClick={() => onFormatChange({ ...format, underline: !format.underline })}
        />
      </Tooltip>
      <Divider
        style={{ height: 20, margin: '0 4px' }}
        type="vertical"
      />
      <Select
        size="small"
        style={{ width: 70 }}
        value={format.fontSize || 12}
        options={[
          { label: '8pt', value: 8 },
          { label: '9pt', value: 9 },
          { label: '10pt', value: 10 },
          { label: '11pt', value: 11 },
          { label: '12pt', value: 12 },
          { label: '14pt', value: 14 },
          { label: '16pt', value: 16 },
          { label: '18pt', value: 18 },
          { label: '20pt', value: 20 }
        ]}
        onChange={v => onFormatChange({ ...format, fontSize: v })}
      />
      <ColorPicker
        size="small"
        value={format.color || '#000000'}
        onChange={color => onFormatChange({ ...format, color: color.toHexString() })}
      />
      <Divider
        style={{ height: 20, margin: '0 4px' }}
        type="vertical"
      />
      <Tooltip title="Align Left">
        <Button
          icon={<AlignLeftOutlined />}
          size="small"
          type={format.align === 'left' || !format.align ? 'primary' : 'text'}
          onClick={() => onFormatChange({ ...format, align: 'left' })}
        />
      </Tooltip>
      <Tooltip title="Align Center">
        <Button
          icon={<AlignCenterOutlined />}
          size="small"
          type={format.align === 'center' ? 'primary' : 'text'}
          onClick={() => onFormatChange({ ...format, align: 'center' })}
        />
      </Tooltip>
      <Tooltip title="Align Right">
        <Button
          icon={<AlignRightOutlined />}
          size="small"
          type={format.align === 'right' ? 'primary' : 'text'}
          onClick={() => onFormatChange({ ...format, align: 'right' })}
        />
      </Tooltip>
    </div>
  );
};

// ==================== Editable Text Component ====================

interface EditableTextProps {
  className?: string;
  format: TextFormat;
  multiline?: boolean;
  onChange: (value: string) => void;
  onFormatChange: (format: TextFormat) => void;
  onSelectionChange: (selected: boolean, position: { x: number; y: number }) => void;
  placeholder?: string;
  readOnly?: boolean;
  value: string;
}

const EditableText: React.FC<EditableTextProps> = ({
  className = '',
  format,
  multiline = false,
  onChange,
  onFormatChange,
  onSelectionChange,
  placeholder = 'Click to edit...',
  readOnly = false,
  value
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleFocus = useCallback(() => {
    if (readOnly) return;
    setIsEditing(true);
    const rect = elementRef.current?.getBoundingClientRect();
    if (rect) {
      onSelectionChange(true, { x: rect.left, y: rect.top - 50 });
    }
  }, [readOnly, onSelectionChange]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    onSelectionChange(false, { x: 0, y: 0 });
  }, [onSelectionChange]);

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const text = e.currentTarget.textContent || '';
      onChange(text);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Handle keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            onFormatChange({ ...format, bold: !format.bold });
            break;
          case 'i':
            e.preventDefault();
            onFormatChange({ ...format, italic: !format.italic });
            break;
          case 'u':
            e.preventDefault();
            onFormatChange({ ...format, underline: !format.underline });
            break;
        }
      }
    },
    [format, onFormatChange]
  );

  const style: React.CSSProperties = {
    backgroundColor: isEditing ? '#fafafa' : 'transparent',
    border: isEditing ? '1px solid #1890ff' : '1px solid transparent',
    borderRadius: 4,
    color: format.color || '#000000',
    cursor: readOnly ? 'default' : 'text',
    fontSize: format.fontSize || 12,
    fontStyle: format.italic ? 'italic' : 'normal',
    fontWeight: format.bold ? 'bold' : 'normal',
    minHeight: multiline ? '60px' : '24px',
    outline: 'none',
    overflow: multiline ? 'auto' : 'hidden',
    padding: '4px 8px',
    textAlign: format.align || 'left',
    textDecoration: format.underline ? 'underline' : 'none',
    textOverflow: 'ellipsis',
    transition: 'all 0.2s',
    whiteSpace: multiline ? 'pre-wrap' : 'nowrap'
  };

  return (
    <div
      suppressContentEditableWarning
      className={`editable-text ${className}`}
      contentEditable={!readOnly}
      data-placeholder={placeholder}
      ref={elementRef}
      style={style}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
    >
      {value}
    </div>
  );
};

// ==================== Main Template Editor ====================

export default function TemplateEditor({ mode = 'full', onChange, readOnly = false, template }: TemplateEditorProps) {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [elementFormats, setElementFormats] = useState<Record<string, TextFormat>>({});

  // Initialize element formats from template shell
  useEffect(() => {
    if (!template) return;
    const shell = template.shell as any;
    const formats: Record<string, TextFormat> = {};

    // Title format
    formats.title = { align: 'center', bold: true, fontSize: 14 };

    // Row formats
    if (shell.rows) {
      shell.rows.forEach((row: TableRow) => {
        formats[`row-${row.id}`] = { bold: row.level === 0, fontSize: 11 };
      });
    }

    // Column formats
    if (shell.columns) {
      shell.columns.forEach((col: ListingColumn) => {
        formats[`col-${col.id}`] = { bold: true, fontSize: 11 };
      });
    }

    // Footer formats
    if (shell.footer?.notes) {
      shell.footer.notes.forEach((_: string, idx: number) => {
        formats[`footer-${idx}`] = { fontSize: 9, italic: true };
      });
    }

    setElementFormats(formats);
  }, [template]);

  // Handle element selection
  const handleSelectionChange = useCallback(
    (elementId: string, selected: boolean, position: { x: number; y: number }) => {
      if (selected) {
        setSelectedElement(elementId);
        setToolbarPosition(position);
      } else {
        setSelectedElement(null);
      }
    },
    []
  );

  // Handle format change
  const handleFormatChange = useCallback(
    (format: TextFormat) => {
      if (!selectedElement) return;
      setElementFormats(prev => ({
        ...prev,
        [selectedElement]: format
      }));
    },
    [selectedElement]
  );

  // Handle content change
  const handleContentChange = useCallback(
    (elementId: string, value: string) => {
      if (!template) return;

      const shell = template.shell as any;
      const newShell = { ...shell };

      if (elementId === 'title') {
        newShell.title = value;
      } else if (elementId.startsWith('row-')) {
        const rowId = elementId.replace('row-', '');
        newShell.rows = (shell.rows || []).map((row: TableRow) => (row.id === rowId ? { ...row, label: value } : row));
      } else if (elementId.startsWith('col-')) {
        const colId = elementId.replace('col-', '');
        newShell.columns = (shell.columns || []).map((col: ListingColumn) =>
          col.id === colId ? { ...col, label: value } : col
        );
      } else if (elementId.startsWith('footer-')) {
        const idx = Number.parseInt(elementId.replace('footer-', ''));
        if (newShell.footer?.notes) {
          newShell.footer.notes[idx] = value;
        }
      }

      onChange({ ...template, shell: newShell });
    },
    [template, onChange]
  );

  // Render table shell
  const renderTableShell = () => {
    const shell = template!.shell as TableShell;
    const hasRows = shell.rows && shell.rows.length > 0;

    return (
      <div className="flex flex-col">
        {/* Data Table */}
        <div className="overflow-auto border border-gray-300">
          <table
            className="w-full border-collapse"
            style={{ fontSize: 11 }}
          >
            <thead>
              <tr className="bg-gray-100">
                <th className="w-[200px] border-b border-r border-gray-300 px-2 py-1 text-left font-semibold">
                  Row Label
                </th>
                <th className="border-b border-gray-300 px-2 py-1 text-center font-semibold">
                  {shell.dataset || 'ADSL'}
                </th>
              </tr>
            </thead>
            <tbody>
              {hasRows ? (
                shell.rows!.slice(0, 20).map((row, idx) => (
                  <tr
                    className="hover:bg-blue-50"
                    key={row.id}
                  >
                    <td
                      className="border-b border-r border-gray-300 px-2 py-1"
                      style={{ paddingLeft: (row.level || 0) * 16 + 8 }}
                    >
                      <EditableText
                        format={elementFormats[`row-${row.id}`] || { fontSize: 11 }}
                        placeholder="Enter row label..."
                        readOnly={readOnly}
                        value={row.label}
                        onChange={v => handleContentChange(`row-${row.id}`, v)}
                        onFormatChange={f => setElementFormats(prev => ({ ...prev, [`row-${row.id}`]: f }))}
                        onSelectionChange={(s, p) => handleSelectionChange(`row-${row.id}`, s, p)}
                      />
                    </td>
                    <td className="border-b border-gray-300 px-2 py-1 text-center text-gray-400">-</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="px-2 py-4 text-center text-gray-400"
                    colSpan={2}
                  >
                    No rows defined
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render figure shell
  const renderFigureShell = () => {
    const shell = template!.shell as FigureShell;

    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center border border-gray-300 rounded border-dashed bg-gray-50 p-8">
        <div className="text-center text-gray-400">
          <div className="mb-2 text-4xl">📊</div>
          <div className="text-lg font-medium">Chart: {shell.chartType || 'line'}</div>
          <div className="mt-2 text-sm">
            X: {shell.xAxis?.label || 'Not configured'} | Y: {shell.yAxis?.label || 'Not configured'}
          </div>
        </div>
      </div>
    );
  };

  // Render listing shell
  const renderListingShell = () => {
    const shell = template!.shell as ListingShell;
    const columns = shell.columns || [];

    return (
      <div className="overflow-auto border border-gray-300">
        <table
          className="w-full border-collapse"
          style={{ fontSize: 11 }}
        >
          <thead>
            <tr className="bg-gray-100">
              {columns.slice(0, 6).map(col => (
                <th
                  className="border-b border-r border-gray-300 px-2 py-1 text-left font-semibold"
                  key={col.id}
                  style={{ width: col.width || 100 }}
                >
                  <EditableText
                    format={elementFormats[`col-${col.id}`] || { bold: true, fontSize: 11 }}
                    placeholder="Column name..."
                    readOnly={readOnly}
                    value={col.label}
                    onChange={v => handleContentChange(`col-${col.id}`, v)}
                    onFormatChange={f => setElementFormats(prev => ({ ...prev, [`col-${col.id}`]: f }))}
                    onSelectionChange={(s, p) => handleSelectionChange(`col-${col.id}`, s, p)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map(i => (
              <tr
                className="hover:bg-blue-50"
                key={i}
              >
                {columns.slice(0, 6).map(col => (
                  <td
                    className="border-b border-r border-gray-300 px-2 py-1 text-gray-400"
                    key={col.id}
                  >
                    -
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Main render
  if (!template) {
    return (
      <div className="h-full flex items-center justify-center">
        <Empty description="Select a template to preview" />
      </div>
    );
  }

  const shell = template.shell as any;
  const title = shell.title || template.name;
  const outputNumber = shell.shellNumber || shell.figureNumber || shell.listingNumber || '';
  const footerNotes = shell.footer?.notes || [];

  const content = (
    <div
      className="interactive-template-preview relative border rounded bg-white p-4"
      onClick={() => setSelectedElement(null)}
    >
      {/* Mode badge - always visible */}
      <div className="absolute right-2 top-2 z-10">
        <Tag
          className="text-10px"
          color={readOnly ? 'default' : 'purple'}
        >
          {readOnly ? '📖 View Mode' : '✏️ Edit Mode'}
        </Tag>
      </div>

      {/* Header Section */}
      <div className="mb-4 border-b pb-3">
        {/* Output Number and Title */}
        <div className="mb-2">
          <EditableText
            className="font-semibold"
            format={elementFormats.title || { align: 'center', bold: true, fontSize: 14 }}
            placeholder="Enter title..."
            readOnly={readOnly}
            value={`${outputNumber}${outputNumber ? ' — ' : ''}${title}`}
            onChange={v => handleContentChange('title', v)}
            onFormatChange={f => setElementFormats(prev => ({ ...prev, title: f }))}
            onSelectionChange={(s, p) => handleSelectionChange('title', s, p)}
          />
        </div>

        {/* Population and Dataset tags */}
        <div className="flex gap-2">
          <Tag color="blue">{shell.population || 'Safety'}</Tag>
          <Tag color="green">{shell.dataset || 'ADSL'}</Tag>
          <Tag color="orange">{template.category}</Tag>
        </div>
      </div>

      {/* Content Section */}
      <div
        className="mb-4"
        onClick={e => e.stopPropagation()}
      >
        {template.type === 'table' && renderTableShell()}
        {template.type === 'figure' && renderFigureShell()}
        {template.type === 'listing' && renderListingShell()}
      </div>

      {/* Footer Section */}
      {footerNotes.length > 0 && (
        <div className="mt-4 border-t pt-3 text-gray-500">
          {footerNotes.map((note: string, idx: number) => (
            <EditableText
              multiline
              format={elementFormats[`footer-${idx}`] || { fontSize: 9, italic: true }}
              key={idx}
              placeholder="Enter footnote..."
              readOnly={readOnly}
              value={note}
              onChange={v => handleContentChange(`footer-${idx}`, v)}
              onFormatChange={f => setElementFormats(prev => ({ ...prev, [`footer-${idx}`]: f }))}
              onSelectionChange={(s, p) => handleSelectionChange(`footer-${idx}`, s, p)}
            />
          ))}
        </div>
      )}

      {/* Floating Toolbar - show in both modes, but only functional in edit mode */}
      <FloatingToolbar
        format={elementFormats[selectedElement || ''] || {}}
        position={toolbarPosition}
        visible={selectedElement !== null}
        onClose={() => setSelectedElement(null)}
        onFormatChange={readOnly ? () => {} : handleFormatChange}
      />

      {/* Read-only overlay hint */}
      {readOnly && selectedElement && (
        <div
          className="fixed z-40 rounded bg-black/70 px-3 py-2 text-12px text-white"
          style={{
            left: toolbarPosition.x,
            top: toolbarPosition.y + 50
          }}
        >
          🔒 Login as Admin to enable editing
        </div>
      )}
    </div>
  );

  // Return based on mode
  if (mode === 'preview-only') {
    return content;
  }

  // Full mode with side panel
  return (
    <div className="h-full flex gap-4">
      <div className="flex-1 overflow-auto">{content}</div>
    </div>
  );
}
