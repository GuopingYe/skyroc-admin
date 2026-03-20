/**
 * TFL Template Editor - Interactive WYSIWYG Editor
 *
 * Provides a Word/PowerPoint-like editing experience for TFL templates.
 * Features:
 * - Direct inline editing of title, rows, columns, footers
 * - Floating formatting toolbar
 * - Element selection with visual feedback
 * - Drag-and-drop positioning (coming soon)
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Card,
  Input,
  Select,
  InputNumber,
  Button,
  Space,
  Typography,
  Tag,
  Tooltip,
  ColorPicker,
  Divider,
  Empty,
} from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  FontSizeOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';
import type { Template, TableShell, ListingShell, FigureShell, TableRow, ListingColumn } from '../../types';

const { Text } = Typography;

// ==================== Types ====================

export interface TextFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
}

interface TemplateEditorProps {
  template: Template | null;
  onChange: (template: Template) => void;
  readOnly?: boolean;
  mode?: 'full' | 'preview-only' | 'edit-only';
}

// ==================== Floating Toolbar ====================

interface FloatingToolbarProps {
  visible: boolean;
  position: { x: number; y: number };
  format: TextFormat;
  onFormatChange: (format: TextFormat) => void;
  onClose: () => void;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  visible,
  position,
  format,
  onFormatChange,
  onClose,
}) => {
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
      ref={toolbarRef}
      className="fixed z-50 flex items-center gap-1 px-2 py-1 bg-white rounded-lg shadow-xl border border-gray-200"
      style={{
        left: Math.min(position.x, window.innerWidth - 400),
        top: Math.max(position.y, 10),
      }}
    >
      <Tooltip title="Bold (Ctrl+B)">
        <Button
          type={format.bold ? 'primary' : 'text'}
          size="small"
          icon={<BoldOutlined />}
          onClick={() => onFormatChange({ ...format, bold: !format.bold })}
        />
      </Tooltip>
      <Tooltip title="Italic (Ctrl+I)">
        <Button
          type={format.italic ? 'primary' : 'text'}
          size="small"
          icon={<ItalicOutlined />}
          onClick={() => onFormatChange({ ...format, italic: !format.italic })}
        />
      </Tooltip>
      <Tooltip title="Underline (Ctrl+U)">
        <Button
          type={format.underline ? 'primary' : 'text'}
          size="small"
          icon={<UnderlineOutlined />}
          onClick={() => onFormatChange({ ...format, underline: !format.underline })}
        />
      </Tooltip>
      <Divider type="vertical" style={{ height: 20, margin: '0 4px' }} />
      <Select
        size="small"
        value={format.fontSize || 12}
        onChange={(v) => onFormatChange({ ...format, fontSize: v })}
        options={[
          { value: 8, label: '8pt' },
          { value: 9, label: '9pt' },
          { value: 10, label: '10pt' },
          { value: 11, label: '11pt' },
          { value: 12, label: '12pt' },
          { value: 14, label: '14pt' },
          { value: 16, label: '16pt' },
          { value: 18, label: '18pt' },
          { value: 20, label: '20pt' },
        ]}
        style={{ width: 70 }}
      />
      <ColorPicker
        size="small"
        value={format.color || '#000000'}
        onChange={(color) => onFormatChange({ ...format, color: color.toHexString() })}
      />
      <Divider type="vertical" style={{ height: 20, margin: '0 4px' }} />
      <Tooltip title="Align Left">
        <Button
          type={format.align === 'left' || !format.align ? 'primary' : 'text'}
          size="small"
          icon={<AlignLeftOutlined />}
          onClick={() => onFormatChange({ ...format, align: 'left' })}
        />
      </Tooltip>
      <Tooltip title="Align Center">
        <Button
          type={format.align === 'center' ? 'primary' : 'text'}
          size="small"
          icon={<AlignCenterOutlined />}
          onClick={() => onFormatChange({ ...format, align: 'center' })}
        />
      </Tooltip>
      <Tooltip title="Align Right">
        <Button
          type={format.align === 'right' ? 'primary' : 'text'}
          size="small"
          icon={<AlignRightOutlined />}
          onClick={() => onFormatChange({ ...format, align: 'right' })}
        />
      </Tooltip>
    </div>
  );
};

// ==================== Editable Text Component ====================

interface EditableTextProps {
  value: string;
  format: TextFormat;
  onChange: (value: string) => void;
  onFormatChange: (format: TextFormat) => void;
  onSelectionChange: (selected: boolean, position: { x: number; y: number }) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  readOnly?: boolean;
}

const EditableText: React.FC<EditableTextProps> = ({
  value,
  format,
  onChange,
  onFormatChange,
  onSelectionChange,
  placeholder = 'Click to edit...',
  className = '',
  multiline = false,
  readOnly = false,
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

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.textContent || '';
    onChange(text);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
  }, [format, onFormatChange]);

  const style: React.CSSProperties = {
    fontWeight: format.bold ? 'bold' : 'normal',
    fontStyle: format.italic ? 'italic' : 'normal',
    textDecoration: format.underline ? 'underline' : 'none',
    fontSize: format.fontSize || 12,
    color: format.color || '#000000',
    textAlign: format.align || 'left',
    minHeight: multiline ? '60px' : '24px',
    outline: 'none',
    cursor: readOnly ? 'default' : 'text',
    backgroundColor: isEditing ? '#fafafa' : 'transparent',
    border: isEditing ? '1px solid #1890ff' : '1px solid transparent',
    borderRadius: 4,
    padding: '4px 8px',
    transition: 'all 0.2s',
    whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
    overflow: multiline ? 'auto' : 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <div
      ref={elementRef}
      className={`editable-text ${className}`}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onFocus={handleFocus}
      onBlur={handleBlur}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      style={style}
      data-placeholder={placeholder}
    >
      {value}
    </div>
  );
};

// ==================== Main Template Editor ====================

export default function TemplateEditor({
  template,
  onChange,
  readOnly = false,
  mode = 'full',
}: TemplateEditorProps) {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [elementFormats, setElementFormats] = useState<Record<string, TextFormat>>({});

  // Initialize element formats from template shell
  useEffect(() => {
    if (!template) return;
    const shell = template.shell as any;
    const formats: Record<string, TextFormat> = {};

    // Title format
    formats['title'] = { bold: true, fontSize: 14, align: 'center' };

    // Row formats
    if (shell.rows) {
      shell.rows.forEach((row: TableRow) => {
        formats[`row-${row.id}`] = { fontSize: 11, bold: row.level === 0 };
      });
    }

    // Column formats
    if (shell.columns) {
      shell.columns.forEach((col: ListingColumn) => {
        formats[`col-${col.id}`] = { fontSize: 11, bold: true };
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
  const handleSelectionChange = useCallback((elementId: string, selected: boolean, position: { x: number; y: number }) => {
    if (selected) {
      setSelectedElement(elementId);
      setToolbarPosition(position);
    } else {
      setSelectedElement(null);
    }
  }, []);

  // Handle format change
  const handleFormatChange = useCallback((format: TextFormat) => {
    if (!selectedElement) return;
    setElementFormats(prev => ({
      ...prev,
      [selectedElement]: format,
    }));
  }, [selectedElement]);

  // Handle content change
  const handleContentChange = useCallback((elementId: string, value: string) => {
    if (!template) return;

    const shell = template.shell as any;
    let newShell = { ...shell };

    if (elementId === 'title') {
      newShell.title = value;
    } else if (elementId.startsWith('row-')) {
      const rowId = elementId.replace('row-', '');
      newShell.rows = (shell.rows || []).map((row: TableRow) =>
        row.id === rowId ? { ...row, label: value } : row
      );
    } else if (elementId.startsWith('col-')) {
      const colId = elementId.replace('col-', '');
      newShell.columns = (shell.columns || []).map((col: ListingColumn) =>
        col.id === colId ? { ...col, label: value } : col
      );
    } else if (elementId.startsWith('footer-')) {
      const idx = parseInt(elementId.replace('footer-', ''));
      if (newShell.footer?.notes) {
        newShell.footer.notes[idx] = value;
      }
    }

    onChange({ ...template, shell: newShell });
  }, [template, onChange]);

  // Render table shell
  const renderTableShell = () => {
    const shell = template!.shell as TableShell;
    const hasRows = shell.rows && shell.rows.length > 0;

    return (
      <div className="flex flex-col">
        {/* Data Table */}
        <div className="border border-gray-300 overflow-auto">
          <table className="w-full border-collapse" style={{ fontSize: 11 }}>
            <thead>
              <tr className="bg-gray-100">
                <th className="border-b border-r border-gray-300 px-2 py-1 text-left font-semibold w-[200px]">
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
                  <tr key={row.id} className="hover:bg-blue-50">
                    <td
                      className="border-b border-r border-gray-300 px-2 py-1"
                      style={{ paddingLeft: (row.level || 0) * 16 + 8 }}
                    >
                      <EditableText
                        value={row.label}
                        format={elementFormats[`row-${row.id}`] || { fontSize: 11 }}
                        onChange={(v) => handleContentChange(`row-${row.id}`, v)}
                        onFormatChange={(f) => setElementFormats(prev => ({ ...prev, [`row-${row.id}`]: f }))}
                        onSelectionChange={(s, p) => handleSelectionChange(`row-${row.id}`, s, p)}
                        readOnly={readOnly}
                        placeholder="Enter row label..."
                      />
                    </td>
                    <td className="border-b border-gray-300 px-2 py-1 text-center text-gray-400">
                      -
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-2 py-4 text-center text-gray-400">
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
      <div className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-300 rounded bg-gray-50 min-h-[300px]">
        <div className="text-gray-400 text-center">
          <div className="text-4xl mb-2">📊</div>
          <div className="text-lg font-medium">Chart: {shell.chartType || 'line'}</div>
          <div className="text-sm mt-2">
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
      <div className="border border-gray-300 overflow-auto">
        <table className="w-full border-collapse" style={{ fontSize: 11 }}>
          <thead>
            <tr className="bg-gray-100">
              {columns.slice(0, 6).map((col) => (
                <th
                  key={col.id}
                  className="border-b border-r border-gray-300 px-2 py-1 text-left font-semibold"
                  style={{ width: col.width || 100 }}
                >
                  <EditableText
                    value={col.label}
                    format={elementFormats[`col-${col.id}`] || { fontSize: 11, bold: true }}
                    onChange={(v) => handleContentChange(`col-${col.id}`, v)}
                    onFormatChange={(f) => setElementFormats(prev => ({ ...prev, [`col-${col.id}`]: f }))}
                    onSelectionChange={(s, p) => handleSelectionChange(`col-${col.id}`, s, p)}
                    readOnly={readOnly}
                    placeholder="Column name..."
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((i) => (
              <tr key={i} className="hover:bg-blue-50">
                {columns.slice(0, 6).map((col) => (
                  <td key={col.id} className="border-b border-r border-gray-300 px-2 py-1 text-gray-400">
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
      <div className="flex h-full items-center justify-center">
        <Empty description="Select a template to preview" />
      </div>
    );
  }

  const shell = template.shell as any;
  const title = shell.title || template.name;
  const outputNumber = shell.shellNumber || shell.figureNumber || shell.listingNumber || '';
  const footerNotes = shell.footer?.notes || [];

  const content = (
    <div className="interactive-template-preview bg-white p-4 rounded border relative" onClick={() => setSelectedElement(null)}>
      {/* Mode badge - always visible */}
      <div className="absolute top-2 right-2 z-10">
        <Tag color={readOnly ? 'default' : 'purple'} className="text-10px">
          {readOnly ? '📖 View Mode' : '✏️ Edit Mode'}
        </Tag>
      </div>

      {/* Header Section */}
      <div className="mb-4 border-b pb-3">
        {/* Output Number and Title */}
        <div className="mb-2">
          <EditableText
            value={`${outputNumber}${outputNumber ? ' — ' : ''}${title}`}
            format={elementFormats['title'] || { bold: true, fontSize: 14, align: 'center' }}
            onChange={(v) => handleContentChange('title', v)}
            onFormatChange={(f) => setElementFormats(prev => ({ ...prev, ['title']: f }))}
            onSelectionChange={(s, p) => handleSelectionChange('title', s, p)}
            readOnly={readOnly}
            placeholder="Enter title..."
            className="font-semibold"
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
      <div className="mb-4" onClick={(e) => e.stopPropagation()}>
        {template.type === 'table' && renderTableShell()}
        {template.type === 'figure' && renderFigureShell()}
        {template.type === 'listing' && renderListingShell()}
      </div>

      {/* Footer Section */}
      {footerNotes.length > 0 && (
        <div className="mt-4 pt-3 border-t text-gray-500">
          {footerNotes.map((note: string, idx: number) => (
            <EditableText
              key={idx}
              value={note}
              format={elementFormats[`footer-${idx}`] || { fontSize: 9, italic: true }}
              onChange={(v) => handleContentChange(`footer-${idx}`, v)}
              onFormatChange={(f) => setElementFormats(prev => ({ ...prev, [`footer-${idx}`]: f }))}
              onSelectionChange={(s, p) => handleSelectionChange(`footer-${idx}`, s, p)}
              readOnly={readOnly}
              placeholder="Enter footnote..."
              multiline
            />
          ))}
        </div>
      )}

      {/* Floating Toolbar - show in both modes, but only functional in edit mode */}
      <FloatingToolbar
        visible={selectedElement !== null}
        position={toolbarPosition}
        format={elementFormats[selectedElement || ''] || {}}
        onFormatChange={readOnly ? () => {} : handleFormatChange}
        onClose={() => setSelectedElement(null)}
      />

      {/* Read-only overlay hint */}
      {readOnly && selectedElement && (
        <div
          className="fixed z-40 bg-black/70 text-white px-3 py-2 rounded text-12px"
          style={{
            left: toolbarPosition.x,
            top: toolbarPosition.y + 50,
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
    <div className="flex gap-4 h-full">
      <div className="flex-1 overflow-auto">
        {content}
      </div>
    </div>
  );
}
