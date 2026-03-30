/**
 * Interactive Output Editor — shared WYSIWYG preview/editor
 *
 * Used by both tfl-designer and tfl-template-library.
 *
 * Every logical block (title, population, header-rows, data-rows,
 * footnotes, abbreviations) is independently selectable and editable.
 * Rows can reorder up/down; columns can reorder left/right.
 *
 * Modern UX: hover between rows/columns to get a blue "+" insert line.
 * Hover a row to see move/delete/indent actions in a context bar.
 */
import React, { useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import {
  Button, Tooltip, ColorPicker, Divider, Empty, message,
} from 'antd';
import {
  BoldOutlined, ItalicOutlined, UnderlineOutlined,
  AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined,
  HolderOutlined, DeleteOutlined, PlusOutlined,
  ArrowLeftOutlined, ArrowRightOutlined, UndoOutlined,
} from '@ant-design/icons';
import type {
  Template, TableShell, ListingShell, FigureShell,
  TableRow, ListingColumn, HeaderFontStyle, ColumnHeaderGroup, LabelColumn,
  DecimalConfig,
} from '../../types';
import { generateId, DEFAULT_DECIMAL_RULES } from '../../types';
import { formatPlaceholder, buildDecimalsMap } from '../../utils/placeholderFormatter';
import {
  countLeaves, getTreeDepth, collectLeaves,
  updateInTree, deleteFromTree, addChildToTree, insertAfterInTree, moveInTree,
} from '../../utils/treeUtils';

/* ------------------------------------------------------------------ */
/*  Tiny types                                                  */
/* ------------------------------------------------------------------ */

export interface TextFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
}

export interface InteractiveEditorProps {
  template: Template | null;
  onTemplateChange: (t: Template) => void;
  editable?: boolean;
  compact?: boolean;
  headerStyle?: HeaderFontStyle;
  /** Column headers from treatment arm set — used to render table columns */
  columnHeaders?: ColumnHeaderGroup[];
  /** Callback when column headers are edited (rename, add, delete, reorder) */
  onColumnHeadersChange?: (headers: ColumnHeaderGroup[]) => void;
  /** Decimal config for resolving placeholder precision */
  decimalConfig?: {
    shellDefaults?: DecimalConfig;
    studyDefaults?: DecimalConfig;
  };
}

export interface InteractiveOutputEditorRef {
  /** Trigger undo (returns true if there was something to undo) */
  undo: () => boolean;
  /** Trigger redo (returns true if there was something to redo) */
  redo: () => boolean;
  /** Whether the undo stack is non-empty */
  canUndo: boolean;
  /** Whether the redo stack is non-empty */
  canRedo: boolean;
}

/* ------------------------------------------------------------------ */
/*  Floating toolbar                                             */
/* ------------------------------------------------------------------ */

interface ToolbarProps {
  visible: boolean;
  pos: { x: number; y: number };
  fmt: TextFormat;
  onFmt: (f: TextFormat) => void;
  onClose: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ visible, pos, fmt, onFmt, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 80);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [visible, onClose]);

  if (!visible) return null;

  const btn = (tip: string, active: boolean | undefined, icon: React.ReactNode, action: () => void) => (
    <Tooltip title={tip}><Button type={active ? 'primary' : 'text'} size="small" icon={icon} onClick={action} /></Tooltip>
  );

  return (
    <div
      ref={ref}
      className="fixed z-50 flex items-center gap-1 px-2 py-1.5 bg-white rounded-lg shadow-xl border border-gray-200"
      style={{ left: Math.max(10, Math.min(pos.x, window.innerWidth - 440)), top: Math.max(10, pos.y) }}
      onMouseDown={e => e.stopPropagation()}
    >
      {btn('Bold (Ctrl+B)', fmt.bold, <BoldOutlined />, () => onFmt({ ...fmt, bold: !fmt.bold }))}
      {btn('Italic (Ctrl+I)', fmt.italic, <ItalicOutlined />, () => onFmt({ ...fmt, italic: !fmt.italic }))}
      {btn('Underline (Ctrl+U)', fmt.underline, <UnderlineOutlined />, () => onFmt({ ...fmt, underline: !fmt.underline }))}
      <Divider type="vertical" style={{ height: 20, margin: '0 4px' }} />
      <select
        className="h-6 border border-gray-300 rounded px-1 text-xs"
        value={fmt.fontSize || 11}
        onChange={e => onFmt({ ...fmt, fontSize: Number(e.target.value) })}
      >
        {[8, 9, 10, 11, 12, 14, 16].map(s => <option key={s} value={s}>{s}pt</option>)}
      </select>
      <ColorPicker size="small" value={fmt.color || '#000'} onChange={c => onFmt({ ...fmt, color: c.toHexString() })} />
      <Divider type="vertical" style={{ height: 20, margin: '0 4px' }} />
      {btn('Align Left', fmt.align === 'left' || !fmt.align, <AlignLeftOutlined />, () => onFmt({ ...fmt, align: 'left' }))}
      {btn('Align Center', fmt.align === 'center', <AlignCenterOutlined />, () => onFmt({ ...fmt, align: 'center' }))}
      {btn('Align Right', fmt.align === 'right', <AlignRightOutlined />, () => onFmt({ ...fmt, align: 'right' }))}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Module-level ref: tracks the currently focused InlineEdit        */
/*  so the toolbar can apply execCommand formatting.               */
/* ------------------------------------------------------------------ */
let _activeEditable: HTMLDivElement | null = null;

/* ------------------------------------------------------------------ */
/*  Inline editable <div>                                        */
/* ------------------------------------------------------------------ */

interface InlineEditProps {
  value: string;
  fmt: TextFormat;
  onChange: (v: string) => void;
  onFmt: (f: TextFormat) => void;
  onSelect: (sel: boolean, pos: { x: number; y: number }) => void;
  eid: string;
  editable?: boolean;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Apply formatting via document.execCommand on the currently focused
 * contentEditable.  This is the only reliable way to make bold/italic/
 * underline/alignment take effect inside contentEditable (CSS inheritance
 * alone doesn't override browser-internal formatting nodes).
 */
function applyExecCommand(fmt: TextFormat) {
  const el = _activeEditable;
  if (!el || document.activeElement !== el) return;
  try {
    if (fmt.bold !== undefined) {
      const isBold = document.queryCommandState('bold');
      if (isBold !== fmt.bold) document.execCommand('bold');
    }
    if (fmt.italic !== undefined) {
      const isItalic = document.queryCommandState('italic');
      if (isItalic !== fmt.italic) document.execCommand('italic');
    }
    if (fmt.underline !== undefined) {
      const isUnder = document.queryCommandState('underline');
      if (isUnder !== fmt.underline) document.execCommand('underline');
    }
    if (fmt.color) {
      document.execCommand('foreColor', false, fmt.color);
    }
    if (fmt.align === 'center') {
      document.execCommand('justifyCenter');
    } else if (fmt.align === 'right') {
      document.execCommand('justifyRight');
    } else if (fmt.align === 'left') {
      document.execCommand('justifyLeft');
    }
  } catch { /* ignore */ }
}

const InlineEdit: React.FC<InlineEditProps> = ({
  value, fmt, onChange, onFmt, onSelect, eid,
  editable = true, multiline = false, placeholder = 'Click to edit...', className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);

  // Sync content from value prop ONLY when not editing.
  // This prevents React from overwriting contentEditable DOM during typing,
  // which causes reversed characters and cursor jumps.
  useLayoutEffect(() => {
    if (ref.current && !editing) {
      // Only update if content actually differs (avoid cursor reset)
      if (ref.current.textContent !== value) {
        ref.current.textContent = value;
      }
    }
  }, [value, editing]);

  const focus = useCallback(() => {
    if (!editable) return;
    setEditing(true);
    _activeEditable = ref.current;  // track globally for toolbar
    const r = ref.current?.getBoundingClientRect();
    if (r) onSelect(true, { x: r.left, y: r.top - 50 });
  }, [editable, onSelect]);

  const blur = useCallback(() => {
    if (_activeEditable === ref.current) _activeEditable = null;
    setEditing(false);
    onSelect(false, { x: 0, y: 0 });
  }, [onSelect]);

  const input = useCallback((e: React.FormEvent<HTMLDivElement>) => onChange(e.currentTarget.textContent || ''), [onChange]);

  const key = useCallback((e: React.KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'b') { e.preventDefault(); document.execCommand('bold'); onFmt({ ...fmt, bold: !fmt.bold }); }
    else if (k === 'i') { e.preventDefault(); document.execCommand('italic'); onFmt({ ...fmt, italic: !fmt.italic }); }
    else if (k === 'u') { e.preventDefault(); document.execCommand('underline'); onFmt({ ...fmt, underline: !fmt.underline }); }
  }, [fmt, onFmt]);

  return (
    <div
      ref={ref}
      className={`inline-edit ${className}`}
      contentEditable={editable}
      suppressContentEditableWarning
      onFocus={focus} onBlur={blur} onInput={input} onKeyDown={key}
      style={{
        fontSize: fmt.fontSize || 11,
        color: fmt.color || '#000',
        minHeight: multiline ? 36 : 28,
        outline: 'none',
        cursor: editable ? 'text' : 'default',
        backgroundColor: editing ? '#fffbe6' : 'transparent',
        border: editing ? '1px solid #faad14' : '1px solid transparent',
        borderRadius: 4,
        padding: '4px 8px',
        transition: 'all 0.15s',
        whiteSpace: 'pre-wrap',
        overflow: 'visible',
        width: '100%',
        minWidth: 60,
      }}
    />
  );
};

/* ------------------------------------------------------------------ */
/*  Row insert gap — shows "+" between rows on hover             */
/* ------------------------------------------------------------------ */

const RowInsertGap: React.FC<{ onInsert: () => void; tooltip?: string }> = ({ onInsert, tooltip }) => (
  <tr className="row-gap">
    <td
      colSpan={99}
      className="px-0 py-0 border-b-0 relative"
      style={{ height: 2, lineHeight: 0 }}
    >
      <div
        className="absolute inset-x-0 -top-[9px] flex justify-center z-10"
        style={{ height: 20 }}
      >
        <Tooltip title={tooltip || 'Insert row here'}>
          <button
            className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs leading-none flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity shadow-sm border-0 cursor-pointer"
            style={{ fontSize: 14, fontWeight: 300 }}
            onClick={(e) => { e.stopPropagation(); onInsert(); }}
            onMouseDown={e => e.stopPropagation()}
          >
            +
          </button>
        </Tooltip>
      </div>
    </td>
  </tr>
);

/* ------------------------------------------------------------------ */
/*  Footnote insert gap — shows "+" between footnotes on hover    */
/* ------------------------------------------------------------------ */

const FootnoteInsertGap: React.FC<{ onInsert: () => void; tooltip?: string }> = ({ onInsert, tooltip }) => (
  <div className="relative group-fn-gap" style={{ height: 4 }}>
    <div
      className="absolute inset-x-0 -top-[9px] flex justify-center z-10"
      style={{ height: 20 }}
    >
      <Tooltip title={tooltip || 'Insert footnote here'}>
        <button
          className="w-4 h-4 rounded-full bg-blue-500 text-white leading-none flex items-center justify-center opacity-0 group-fn-gap-hover:opacity-100 transition-opacity shadow-sm border-0 cursor-pointer"
          style={{ fontSize: 12, fontWeight: 300 }}
          onClick={(e) => { e.stopPropagation(); onInsert(); }}
          onMouseDown={e => e.stopPropagation()}
        >
          +
        </button>
      </Tooltip>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Move button pair (up / down / left / right)                  */
/* ------------------------------------------------------------------ */

const MoveBtn: React.FC<{
  dir: 'v' | 'h';
  onFirst: boolean;
  onLast: boolean;
  onPrev: () => void;
  onNext: () => void;
}> = ({ dir, onFirst, onLast, onPrev, onNext }) => {
  const Up = dir === 'v' ? <HolderOutlined style={{ fontSize: 10 }} /> : <HolderOutlined rotate={90} style={{ fontSize: 10 }} />;
  const Dn = dir === 'v' ? <HolderOutlined rotate={90} style={{ fontSize: 10 }} /> : <HolderOutlined rotate={-90} style={{ fontSize: 10 }} />;
  return (
    <span className={`inline-flex ${dir === 'h' ? 'flex-row' : 'flex-col'} opacity-0 group-hover:opacity-100 transition-opacity leading-none`}>
      <Button type="text" size="small" icon={Up} className="h-4 w-4 p-0" disabled={onFirst} onClick={onPrev} />
      <Button type="text" size="small" icon={Dn} className="h-4 w-4 p-0" disabled={onLast} onClick={onNext} />
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                               */
/* ------------------------------------------------------------------ */

const InteractiveOutputEditor = React.forwardRef<InteractiveOutputEditorRef, InteractiveEditorProps>(
  function InteractiveOutputEditor({
    template, onTemplateChange, editable = true, compact = false, headerStyle, columnHeaders, onColumnHeadersChange, decimalConfig,
  }, ref) {
  const [sel, setSel] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [fmts, setFmts] = useState<Record<string, TextFormat>>({});
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);

  // Expose undo/redo via ref
  React.useImperativeHandle(ref, () => ({
    undo: () => {
      if (undoStack.current.length === 0) return false;
      redoStack.current.push(JSON.parse(JSON.stringify(template)));
      if (redoStack.current.length > 50) redoStack.current.shift();
      setRedoCount(redoStack.current.length);
      const prev = undoStack.current.pop()!;
      setUndoCount(undoStack.current.length);
      onTemplateChange(prev);
      return true;
    },
    redo: () => {
      if (redoStack.current.length === 0) return false;
      undoStack.current.push(JSON.parse(JSON.stringify(template)));
      if (undoStack.current.length > 50) undoStack.current.shift();
      setUndoCount(undoStack.current.length);
      const next = redoStack.current.pop()!;
      setRedoCount(redoStack.current.length);
      onTemplateChange(next);
      return true;
    },
    get canUndo() { return undoStack.current.length > 0; },
    get canRedo() { return redoStack.current.length > 0; },
  }));

  // reset formats on template change
  useEffect(() => {
    if (!template) { setFmts({}); return; }
    const s = template.shell as Record<string, any>;
    const f: Record<string, TextFormat> = {
      title: { bold: true, fontSize: compact ? 12 : 14, align: 'center' },
      population: { fontSize: compact ? 12 : 14, align: 'center' },
    };
    (s.rows || []).forEach((r: TableRow) => { f[`row-${r.id}`] = { fontSize: 11, bold: r.level === 0 }; });
    (s.columns || []).forEach((c: ListingColumn) => { f[`col-${c.id}`] = { fontSize: 11, bold: true }; });
    (s.footer?.notes || []).forEach((_: string, i: number) => { f[`fn-${i}`] = { fontSize: 9, italic: true }; });
    (s.footer?.abbreviations && Object.keys(s.footer.abbreviations).length > 0) && (f.abbreviations = { fontSize: 9 });
    setFmts(f);
    setSel(null);
  }, [template?.id, compact]);

  // Seed default source footnote when footer has no notes
  useEffect(() => {
    if (!template || !editable) return;
    const s = template.shell as Record<string, any>;
    if (s.footer && (!s.footer.notes || s.footer.notes.length === 0)) {
      onTemplateChange({
        ...template,
        shell: {
          ...s,
          footer: { ...s.footer, notes: [`Source: ${s.dataset || 'ADSL'}`] },
        } as typeof template.shell,
      });
    }
  }, [template?.id, editable]);

  const selH = useCallback((eid: string, on: boolean, p: { x: number; y: number }) => {
    if (on) { setSel(eid); setPos(p); } else setSel(null);
  }, []);

  const fmtH = useCallback((f: TextFormat) => {
    if (sel) {
      applyExecCommand(f);
      setFmts(p => ({ ...p, [sel]: f }));
    }
  }, [sel]);

  /* ---- undo / redo stacks ---- */
  const undoStack = useRef<Template[]>([]);
  const redoStack = useRef<Template[]>([]);

  /* ---- resize handler cleanup (for column width resizing) ---- */
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  // Cleanup resize handlers on unmount
  useEffect(() => {
    return () => {
      if (resizeCleanupRef.current) {
        resizeCleanupRef.current();
        resizeCleanupRef.current = null;
      }
    };
  }, []);

  /* ---- mutate shell field (with undo capture) ---- */
  const setShell = useCallback((updater: (s: any) => void) => {
    if (!template) return;
    // Push current state to undo stack; clear redo stack
    undoStack.current.push(JSON.parse(JSON.stringify(template)));
    if (undoStack.current.length > 50) undoStack.current.shift();
    setUndoCount(undoStack.current.length);
    redoStack.current = [];
    setRedoCount(0);
    const s = { ...template.shell, rows: [...(template.shell as any).rows || []], footer: (template.shell as any).footer ? { ...(template.shell as any).footer, notes: [...((template.shell as any).footer?.notes || [])] } : undefined, columns: [...(template.shell as any).columns || []] } as any;
    updater(s);
    onTemplateChange({ ...template, shell: s });
  }, [template, onTemplateChange]);

  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0 || !template) return;
    redoStack.current.push(JSON.parse(JSON.stringify(template)));
    if (redoStack.current.length > 50) redoStack.current.shift();
    setRedoCount(redoStack.current.length);
    const prev = undoStack.current.pop()!;
    setUndoCount(undoStack.current.length);
    onTemplateChange(prev);
  }, [onTemplateChange, template]);

  const handleRedo = useCallback(() => {
    if (redoStack.current.length === 0 || !template) return;
    undoStack.current.push(JSON.parse(JSON.stringify(template)));
    if (undoStack.current.length > 50) undoStack.current.shift();
    setUndoCount(undoStack.current.length);
    const next = redoStack.current.pop()!;
    setRedoCount(redoStack.current.length);
    onTemplateChange(next);
  }, [onTemplateChange, template]);

  // Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z global handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement;
      if (ae && (ae.contentEditable === 'true' || ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault(); handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z') || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault(); handleRedo();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  /* ---- change output number (shellNumber/figureNumber/listingNumber) ---- */
  const onOutputNumberChange = useCallback((v: string) => {
    setShell(sh => {
      // Update the correct field based on template type
      if ('shellNumber' in sh) sh.shellNumber = v;
      else if ('figureNumber' in sh) sh.figureNumber = v;
      else if ('listingNumber' in sh) sh.listingNumber = v;
    });
  }, [setShell]);

  /* ---- change title text ---- */
  const onTitleChange = useCallback((v: string) => {
    setShell(sh => { sh.title = v; });
  }, [setShell]);

  /* ---- row move / delete ---- */
  /**
   * Find the index range [start, end) occupied by a row and all its descendants.
   * A row at `rows[idx]` with level L "owns" all consecutive rows after it whose level > L.
   */
  const rowRange = useCallback((rows: TableRow[], idx: number): [number, number] => {
    const level = rows[idx].level || 0;
    let end = idx + 1;
    while (end < rows.length && (rows[end].level || 0) > level) end++;
    return [idx, end];
  }, []);

  /** Find the previous sibling at the same level (returns its index or -1). */
  const prevSibling = useCallback((rows: TableRow[], idx: number): number => {
    const level = rows[idx].level || 0;
    let i = idx - 1;
    while (i >= 0 && (rows[i].level || 0) > level) i--;
    return (i >= 0 && (rows[i].level || 0) === level) ? i : -1;
  }, []);

  /** Find the next sibling at the same level (returns its index or -1). */
  const nextSibling = useCallback((rows: TableRow[], idx: number): number => {
    const level = rows[idx].level || 0;
    const [, rangeEnd] = rowRange(rows, idx);
    return (rangeEnd < rows.length && (rows[rangeEnd].level || 0) === level) ? rangeEnd : -1;
  }, [rowRange]);

  const moveRow = useCallback((idx: number, delta: number) => {
    setShell(sh => {
      const rows = [...(sh.rows || [])];
      if (rows.length === 0) return;

      if (delta === -1) {
        // Move up — find previous sibling
        const psi = prevSibling(rows, idx);
        if (psi < 0) return;
        const [curStart, curEnd] = rowRange(rows, idx);
        const [prevStart, prevEnd] = rowRange(rows, psi);
        // Rebuild: before + current block + prev block + after
        const before = rows.slice(0, prevStart);
        const prevBlock = rows.slice(prevStart, prevEnd);
        const middle = rows.slice(prevEnd, curStart);
        const curBlock = rows.slice(curStart, curEnd);
        const after = rows.slice(curEnd);
        sh.rows = [...before, ...curBlock, ...middle, ...prevBlock, ...after];
      } else {
        // Move down — find next sibling
        const nsi = nextSibling(rows, idx);
        if (nsi < 0) return;
        const [curStart, curEnd] = rowRange(rows, idx);
        const [nextStart, nextEnd] = rowRange(rows, nsi);
        // Rebuild: before + next block + middle + current block + after
        const before = rows.slice(0, curStart);
        const curBlock = rows.slice(curStart, curEnd);
        const middle = rows.slice(curEnd, nextStart);
        const nextBlock = rows.slice(nextStart, nextEnd);
        const after = rows.slice(nextEnd);
        sh.rows = [...before, ...nextBlock, ...middle, ...curBlock, ...after];
      }
    });
    message.success('Row moved');
  }, [setShell, rowRange, prevSibling, nextSibling]);

  const delRow = useCallback((rid: string) => {
    setShell(sh => { sh.rows = (sh.rows || []).filter((r: TableRow) => r.id !== rid); });
    message.success('Row deleted');
  }, [setShell]);

  /* ---- row add ---- */
  const addRow = useCallback((afterIdx?: number) => {
    setShell(sh => {
      const rows = [...(sh.rows || [])];
      const newIdx = afterIdx !== undefined ? afterIdx + 1 : rows.length;
      rows.splice(newIdx, 0, {
        id: generateId('row'),
        label: 'New Row',
        level: 0,
        indent: 0,
      });
      sh.rows = rows;
    });
    message.success('Row added');
  }, [setShell]);

  /* ---- row level change (indent/outdent) ---- */
  const changeRowLevel = useCallback((rowId: string, delta: number) => {
    setShell(sh => {
      sh.rows = (sh.rows || []).map((r: TableRow) => {
        if (r.id === rowId) {
          const newLevel = Math.max(0, (r.level || 0) + delta);
          return { ...r, level: newLevel, indent: newLevel };
        }
        return r;
      });
    });
    message.success('Row level changed');
  }, [setShell]);

  /* ---- column move ---- */
  const moveCol = useCallback((idx: number, delta: number) => {
    setShell(sh => {
      const cols = [...(sh.columns || [])];
      const [item] = cols.splice(idx, 1);
      cols.splice(idx + delta, 0, item);
      sh.columns = cols;
    });
    message.success('Column moved');
  }, [setShell]);

  /* ---- column add / delete ---- */
  const addColumn = useCallback((afterIdx?: number) => {
    setShell(sh => {
      const cols = [...(sh.columns || [])];
      const newIdx = afterIdx !== undefined ? afterIdx + 1 : cols.length;
      cols.splice(newIdx, 0, {
        id: generateId('col'),
        label: `Col ${newIdx + 1}`,
        name: `VAR_${newIdx + 1}`,
        width: 100,
      });
      sh.columns = cols;
    });
    message.success('Column added');
  }, [setShell]);

  const delCol = useCallback((cid: string) => {
    setShell(sh => { sh.columns = (sh.columns || []).filter((c: ListingColumn) => c.id !== cid); });
    message.success('Column deleted');
  }, [setShell]);

  /* ---- footnote change ---- */
  const onFnChange = useCallback((idx: number, v: string) => {
    setShell(sh => {
      if (sh.footer?.notes) sh.footer = { ...sh.footer, notes: sh.footer.notes.map((n: string, i: number) => i === idx ? v : n) };
    });
  }, [setShell]);

  /* ---- footnote add / delete ---- */
  const addFootnote = useCallback(() => {
    setShell(sh => {
      if (!sh.footer) sh.footer = { source: sh.dataset, notes: [] };
      if (!sh.footer.notes) sh.footer.notes = [];
      sh.footer.notes = [...sh.footer.notes, 'Note: '];
    });
    message.success('Footnote added');
  }, [setShell]);

  const insertFootnote = useCallback((atIndex: number) => {
    setShell(sh => {
      if (!sh.footer) sh.footer = { source: sh.dataset, notes: [] };
      if (!sh.footer.notes) sh.footer.notes = [];
      const notes = [...sh.footer.notes];
      notes.splice(atIndex, 0, 'Note: ');
      sh.footer.notes = notes;
    });
    message.success('Footnote inserted');
  }, [setShell]);

  const delFootnote = useCallback((idx: number) => {
    setShell(sh => {
      if (sh.footer?.notes) sh.footer = { ...sh.footer, notes: sh.footer.notes.filter((_: string, i: number) => i !== idx) };
    });
    message.success('Footnote removed');
  }, [setShell]);

  /* ---- footnote move (up/down) ---- */
  const moveFootnote = useCallback((idx: number, delta: number) => {
    setShell(sh => {
      if (!sh.footer?.notes) return;
      const notes = [...sh.footer.notes];
      const newIdx = idx + delta;
      if (newIdx < 0 || newIdx >= notes.length) return;
      [notes[idx], notes[newIdx]] = [notes[newIdx], notes[idx]];
      sh.footer = { ...sh.footer, notes };
    });
  }, [setShell]);

  /* ---- add custom title line (insert at position) ---- */
  const insertTitleLine = useCallback((atIndex: number) => {
    setShell(sh => {
      if (!sh.extraTitleLines) sh.extraTitleLines = [];
      const lines = [...sh.extraTitleLines];
      lines.splice(atIndex, 0, { id: generateId('tl'), text: '' });
      sh.extraTitleLines = lines;
    });
    message.success('Title line added');
  }, [setShell]);

  const updateTitleLine = useCallback((lineId: string, text: string) => {
    setShell(sh => {
      if (!sh.extraTitleLines) return;
      sh.extraTitleLines = sh.extraTitleLines.map((l: { id: string; text: string }) => l.id === lineId ? { ...l, text } : l);
    });
  }, [setShell]);

  const deleteTitleLine = useCallback((lineId: string) => {
    setShell(sh => {
      if (!sh.extraTitleLines) return;
      sh.extraTitleLines = sh.extraTitleLines.filter((l: { id: string; text: string }) => l.id !== lineId);
    });
    message.success('Title line removed');
  }, [setShell]);

  const moveTitleLine = useCallback((idx: number, delta: number) => {
    setShell(sh => {
      if (!sh.extraTitleLines) return;
      const lines = [...sh.extraTitleLines];
      const newIdx = idx + delta;
      if (newIdx < 0 || newIdx >= lines.length) return;
      [lines[idx], lines[newIdx]] = [lines[newIdx], lines[idx]];
      sh.extraTitleLines = lines;
    });
  }, [setShell]);

  /* ---- column header editing (for table mode) ---- */
  const updateHeaderLabel = useCallback((headerId: string, newLabel: string) => {
    if (onColumnHeadersChange && columnHeaders) {
      const walk = (headers: ColumnHeaderGroup[]): ColumnHeaderGroup[] =>
        headers.map(h => {
          if (h.id === headerId) return { ...h, label: newLabel };
          if (h.children) return { ...h, children: walk(h.children) };
          return h;
        });
      onColumnHeadersChange(walk(columnHeaders));
    } else {
      // Fallback: update shell.columns directly
      setShell(sh => {
        if (!sh.columns) return;
        sh.columns = (sh.columns || []).map((c: ListingColumn) =>
          c.id === headerId ? { ...c, label: newLabel } : c
        );
      });
    }
  }, [columnHeaders, onColumnHeadersChange, setShell]);

  const addHeaderColumn = useCallback((afterId?: string) => {
    const newCol: ColumnHeaderGroup = { id: generateId('hcol'), label: 'New Col', width: 120, align: 'center' };
    // Prefer external columnHeaders state; fall back to local shell
    if (onColumnHeadersChange && columnHeaders) {
      if (!afterId) {
        onColumnHeadersChange([...columnHeaders, newCol]);
      } else {
        onColumnHeadersChange(insertAfterInTree(columnHeaders, afterId, newCol));
      }
    } else {
      // No external header management — store columns in the shell itself
      setShell(sh => {
        const cols = [...(sh.columns || [])];
        const newIdx = afterId ? cols.findIndex((c: ListingColumn) => c.id === afterId) + 1 : cols.length;
        cols.splice(newIdx, 0, {
          id: newCol.id,
          label: newCol.label,
          name: `VAR_${newIdx + 1}`,
          width: newCol.width,
        } as any);
        sh.columns = cols;
      });
    }
    message.success('Column added');
  }, [columnHeaders, onColumnHeadersChange, setShell]);

  /** Add a new column as a child of a group header (for nested headers) */
  const addHeaderChild = useCallback((parentId: string) => {
    if (!onColumnHeadersChange || !columnHeaders) return;
    const newCol: ColumnHeaderGroup = { id: generateId('hcol'), label: 'New Col', width: 120, align: 'center' };
    onColumnHeadersChange(addChildToTree(columnHeaders, parentId, newCol));
    message.success('Column added under group');
  }, [columnHeaders, onColumnHeadersChange]);

  const deleteHeaderColumn = useCallback((headerId: string) => {
    if (!onColumnHeadersChange || !columnHeaders) return;
    onColumnHeadersChange(deleteFromTree(columnHeaders, headerId));
    message.success('Column deleted');
  }, [columnHeaders, onColumnHeadersChange]);

  const moveHeaderColumn = useCallback((headerId: string, delta: number) => {
    if (!onColumnHeadersChange || !columnHeaders) return;
    onColumnHeadersChange(moveInTree(columnHeaders, headerId, delta < 0 ? 'up' : 'down'));
  }, [columnHeaders, onColumnHeadersChange]);

  /* ---- editable "Row Label" text (legacy compat) ---- */
  const [rowLabelText, setRowLabelText] = useState('Row Label');
  useEffect(() => {
    if (!template || template.type !== 'table') return;
    const s = template.shell as any;
    setRowLabelText(s.labelColumns?.[0]?.label || s.rowLabel || 'Row Label');
  }, [template?.id]);

  /* ---- Label column operations ---- */
  const updateLabelColumn = useCallback((colId: string, newLabel: string) => {
    setShell(sh => {
      if (!sh.labelColumns) return;
      sh.labelColumns = sh.labelColumns.map((c: LabelColumn) => c.id === colId ? { ...c, label: newLabel } : c);
    });
  }, [setShell]);

  const addLabelColumn = useCallback((afterId?: string) => {
    setShell(sh => {
      // Seed from default when shell has never been edited
      const lbls: LabelColumn[] = [...(sh.labelColumns || [{ id: 'lbl_0', label: sh.rowLabel || 'Row Label', width: 280 }])];
      const newCol: LabelColumn = { id: generateId('lbl'), label: 'New Column', width: 120 };
      if (!afterId) {
        lbls.push(newCol);
      } else {
        const idx = lbls.findIndex(c => c.id === afterId);
        if (idx >= 0) lbls.splice(idx + 1, 0, newCol);
        else lbls.push(newCol);
      }
      sh.labelColumns = lbls;
    });
    message.success('Label column added');
  }, [setShell]);

  const deleteLabelColumn = useCallback((colId: string) => {
    setShell(sh => {
      const lbls: LabelColumn[] = sh.labelColumns || [{ id: 'lbl_0', label: 'Row Label', width: 280 }];
      if (lbls.length <= 1) {
        message.warning('Must have at least one label column');
        return;
      }
      sh.labelColumns = lbls.filter((c: LabelColumn) => c.id !== colId);
    });
    message.success('Label column removed');
  }, [setShell]);

  const moveLabelColumn = useCallback((colId: string, delta: number) => {
    setShell(sh => {
      const lbls: LabelColumn[] = [...(sh.labelColumns || [{ id: 'lbl_0', label: 'Row Label', width: 280 }])];
      const idx = lbls.findIndex(c => c.id === colId);
      if (idx < 0) return;
      const newIdx = idx + delta;
      if (newIdx < 0 || newIdx >= lbls.length) return;
      [lbls[idx], lbls[newIdx]] = [lbls[newIdx], lbls[idx]];
      sh.labelColumns = lbls;
    });
  }, [setShell]);

  /* ---- Listing header line operations ---- */
  const updateColumnHeaderLines = useCallback((colId: string, updater: (lines: string[]) => string[]) => {
    setShell(sh => {
      sh.columns = (sh.columns || []).map((c: ListingColumn) => {
        if (c.id !== colId) return c;
        const lines = c.headerLines ? [...c.headerLines] : [c.label];
        const newLines = updater(lines);
        return { ...c, headerLines: newLines, label: newLines[0] };
      });
    });
  }, [setShell]);

  const updateHeaderLine = useCallback((colId: string, lineIdx: number, value: string) => {
    updateColumnHeaderLines(colId, lines => {
      while (lines.length <= lineIdx) lines.push('');
      lines[lineIdx] = value;
      return lines;
    });
  }, [updateColumnHeaderLines]);

  const addHeaderLine = useCallback((colId: string) => {
    updateColumnHeaderLines(colId, lines => [...lines, '']);
    message.success('Header line added');
  }, [updateColumnHeaderLines]);

  const removeHeaderLine = useCallback((colId: string, lineIdx: number) => {
    let removed = false;
    updateColumnHeaderLines(colId, lines => {
      if (lines.length <= 1) return lines;
      lines.splice(lineIdx, 1);
      removed = true;
      return lines;
    });
    if (removed) {
      message.success('Header line removed');
    } else {
      message.warning('Cannot remove the last header line');
    }
  }, [updateColumnHeaderLines]);

  const updateColumnWidth = useCallback((colId: string, width: number) => {
    setShell(sh => {
      sh.columns = (sh.columns || []).map((c: ListingColumn) =>
        c.id === colId ? { ...c, width } : c
      );
    });
  }, [setShell]);

  /* ---- helper: mk InlineEdit ---- */
  const mk = (eid: string, value: string, onChange: (v: string) => void, opts?: { multiline?: boolean; placeholder?: string; className?: string }) => (
    <InlineEdit
      eid={eid} value={value} fmt={fmts[eid] || { fontSize: 11 }}
      onChange={onChange} onFmt={f => setFmts(p => ({ ...p, [eid]: f }))}
      onSelect={(s, p) => selH(eid, s, p)} editable={editable}
      multiline={opts?.multiline} placeholder={opts?.placeholder} className={opts?.className}
    />
  );

  /* ======================== RENDER ======================== */
  if (!template) return <Empty description="Select an output to preview" />;

  const shell = template.shell as any;
  const rows: TableRow[] = shell.rows || [];
  const cols: ListingColumn[] = shell.columns || [];
  const fns: string[] = shell.footer?.notes || [];
  const abbrs = shell.footer?.abbreviations as Record<string, string> | undefined;
  const armHeaders: ColumnHeaderGroup[] = columnHeaders || [];
  const totalCols = armHeaders.length > 0 ? countLeaves(armHeaders) : 1;
  // Also collect leaf columns from shell.columns (used when no armHeaders are provided)
  const shellColHeaders: ColumnHeaderGroup[] = (cols || []).map((c: ListingColumn) => ({
    id: c.id, label: c.label, width: c.width || 80, align: 'center' as const,
  }));

  // Merge: armHeaders take priority, shell.columns as fallback
  const effectiveHeaders: ColumnHeaderGroup[] = armHeaders.length > 0 ? armHeaders : shellColHeaders;
  const leafColCount = effectiveHeaders.length > 0 ? countLeaves(effectiveHeaders) : 0;

  // Collect all leaf column IDs for data cell rendering
  const leafCols: ColumnHeaderGroup[] = collectLeaves(effectiveHeaders);
  const title = shell.title || template.name;
  const outNum = shell.shellNumber || shell.figureNumber || shell.listingNumber || '';

  // Header style defaults
  const hs = headerStyle;
  const titleStyle: React.CSSProperties = hs ? {
    fontFamily: hs.titleFont,
    fontSize: (hs.titleSize || 12) * (compact ? 0.85 : 1),
    textAlign: hs.alignment,
  } : {};
  const subtitleStyle: React.CSSProperties = hs ? {
    fontFamily: hs.subtitleFont,
    fontSize: (hs.subtitleSize || 11) * (compact ? 0.85 : 1),
  } : {};
  const colHeaderStyle: React.CSSProperties = hs ? {
    fontFamily: hs.columnHeaderFont,
    fontSize: (hs.columnHeaderSize || 10) * (compact ? 0.85 : 1),
    backgroundColor: hs.columnHeaderBackground,
  } : {};

  /* ======================== SHARED TITLE BLOCK ======================== */
  const extraTitleLines: Array<{ id: string; text: string }> = shell.extraTitleLines || [];

  /* Title-line insert gap — same pattern as FootnoteInsertGap */
  const TitleInsertGap: React.FC<{ onInsert: () => void; tooltip?: string }> = ({ onInsert, tooltip }) => (
    <div className="relative group-tl-gap" style={{ height: 4 }}>
      <div className="absolute inset-x-0 -top-[9px] flex justify-center z-10" style={{ height: 20 }}>
        <Tooltip title={tooltip || 'Insert line here'}>
          <button
            className="w-4 h-4 rounded-full bg-blue-500 text-white leading-none flex items-center justify-center opacity-0 group-tl-gap-hover:opacity-100 transition-opacity shadow-sm border-0 cursor-pointer"
            style={{ fontSize: 12, fontWeight: 300 }}
            onClick={(e) => { e.stopPropagation(); onInsert(); }}
            onMouseDown={e => e.stopPropagation()}
          >+</button>
        </Tooltip>
      </div>
    </div>
  );

  const renderTitleBlock = () => (
    <div className="mb-2 border-b pb-2" onClick={e => e.stopPropagation()} style={titleStyle}>
      {/* Number + Title on one line - EDITED SEPARATELY */}
      <div className="mb-1" style={{ textAlign: hs?.alignment || 'center' }}>
        {editable ? (
          <>
            {/* Output Number editable separately from title */}
            {mk('outNum', outNum, onOutputNumberChange, { placeholder: 'X.X.X', className: 'font-semibold' })}
            {outNum && <span>&nbsp;&nbsp;</span>}
            {mk('title', title, onTitleChange, { placeholder: 'Output Title' })}
          </>
        ) : (
          <span>{outNum}{outNum ? '  ' : ''}{title}</span>
        )}
      </div>
      {/* Population — simple centered text, no Tag */}
      {shell.population && (
        <div className="mb-1" style={{ textAlign: 'center', ...subtitleStyle }}>
          {mk('population', shell.population, v => setShell(s => { s.population = v; }), { placeholder: 'Population' })}
        </div>
      )}
      {/* Custom extra lines with inline "+" insert (same UX as footnotes) */}
      {editable && (
        <div
          className="tl-section"
          onMouseDown={e => (e.currentTarget as HTMLElement).classList.add('hovering')}
          onMouseUp={() => document.querySelectorAll('.tl-section').forEach(el => el.classList.remove('hovering'))}
        >
          <style>{`
            .tl-section:not(.hovering) .group-tl-gap button { opacity: 0 !important; }
            .tl-section .group-tl-gap:hover button { opacity: 1 !important; }
          `}</style>
          {extraTitleLines.length === 0 ? (
            <TitleInsertGap onInsert={() => insertTitleLine(0)} tooltip="Add a line" />
          ) : (
            <>
              <TitleInsertGap onInsert={() => insertTitleLine(0)} tooltip="Insert line at top" />
              {extraTitleLines.map((line, idx) => (
                <React.Fragment key={line.id}>
                  <div className="group relative flex items-center gap-1">
                    {editable && (
                      <MoveBtn dir="v" onFirst={idx === 0} onLast={idx === extraTitleLines.length - 1}
                        onPrev={() => moveTitleLine(idx, -1)} onNext={() => moveTitleLine(idx, 1)} />
                    )}
                    {mk(`tl-${line.id}`, line.text, v => updateTitleLine(line.id, v), { placeholder: 'Custom line...' })}
                    {editable && (
                      <div className="ml-auto flex-shrink-0 pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip title="Remove line">
                          <button className="text-red-300 hover:text-red-600 border-0 bg-transparent cursor-pointer p-1"
                            onClick={() => deleteTitleLine(line.id)}>
                            <DeleteOutlined style={{ fontSize: 12 }} />
                          </button>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                  <TitleInsertGap onInsert={() => insertTitleLine(idx + 1)} tooltip={`Insert line after`} />
                </React.Fragment>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );

  /* ======================== SHARED FOOTNOTE BLOCK ======================== */

  const renderFootnoteSection = (cssClass: string) => {
    const displayNotes = fns;

    return (
    <div className="mt-2 pt-2 border-t text-gray-500" onClick={e => e.stopPropagation()}>
      <style>{`
        .${cssClass}:not(.hovering) .group-fn-gap button { opacity: 0 !important; }
        .${cssClass} .group-fn-gap:hover button { opacity: 1 !important; }
      `}</style>
      <div
        className={cssClass}
        onMouseDown={e => (e.currentTarget as HTMLElement).classList.add('hovering')}
        onMouseUp={() => document.querySelectorAll(`.${cssClass}`).forEach(el => el.classList.remove('hovering'))}
      >
        <FootnoteInsertGap onInsert={() => insertFootnote(0)} tooltip="Insert footnote at top" />
        {displayNotes.map((fn: string, i: number) => (
            <React.Fragment key={i}>
              <div className="group relative flex items-start gap-1">
                {editable && (
                  <MoveBtn dir="v" onFirst={i === 0} onLast={i === displayNotes.length - 1}
                    onPrev={() => moveFootnote(i, -1)}
                    onNext={() => moveFootnote(i, 1)}
                  />
                )}
                <span className="text-10px text-gray-400 mt-1.5 flex-shrink-0">{i + 1}.</span>
                {mk(`fn-${i}`, fn,
                  (v) => onFnChange(i, v),
                  { multiline: true, placeholder: 'Footnote...' }
                )}
                {editable && (
                  <Tooltip title="Remove footnote">
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-red-400 hover:text-red-600 border-0 bg-transparent cursor-pointer flex-shrink-0 mt-1"
                      onClick={() => delFootnote(i)}
                    >
                      <DeleteOutlined style={{ fontSize: 10 }} />
                    </button>
                  </Tooltip>
                )}
              </div>
              <FootnoteInsertGap onInsert={() => insertFootnote(i + 1)} tooltip={`Insert footnote after #${i + 1}`} />
            </React.Fragment>
        ))}
        {displayNotes.length === 0 && (
          <div className="text-center text-gray-400 text-xs py-2">No footnotes — hover to add</div>
        )}
      </div>
    </div>
    );
  };

  /* ---------- TABLE ---------- */
  if (template.type === 'table') {
    // Label columns from shell (default: single "Row Label" column, supports legacy rowLabel)
    const lblColumns: LabelColumn[] = shell.labelColumns?.length
      ? shell.labelColumns
      : [{ id: 'lbl_0', label: shell.rowLabel || 'Row Label', width: 280 }];
    const lblColCount = lblColumns.length;

    // Compute max nesting depth for multi-level column headers
    const treeDepth = effectiveHeaders.length > 0 ? getTreeDepth(effectiveHeaders) : 1;

    // Build nested header rows for the <thead>
    const buildHeaderRows = (): React.ReactNode[] => {
      const rows: React.ReactNode[] = [];
      for (let level = 0; level < treeDepth; level++) {
        const isLeaf = level === treeDepth - 1;
        rows.push(
          <tr key={`h${level}`} style={colHeaderStyle}>
            {/* Label columns — only in first row, span all header rows */}
            {level === 0 && lblColumns.map((lbl, lblIdx) => (
              <th
                key={lbl.id}
                className="px-2 py-1 text-left font-semibold group relative"
                style={{ minWidth: lbl.width || 120, width: lblIdx === 0 ? 280 : undefined }}
                rowSpan={treeDepth}
              >
                <div className="flex items-center gap-1">
                  {editable && (
                    <MoveBtn dir="h"
                      onFirst={lblIdx === 0}
                      onLast={lblIdx === lblColCount - 1}
                      onPrev={() => moveLabelColumn(lbl.id, -1)}
                      onNext={() => moveLabelColumn(lbl.id, 1)}
                    />
                  )}
                  {editable
                    ? mk(`lbl-${lbl.id}`, lbl.label, v => updateLabelColumn(lbl.id, v), { placeholder: '' })
                    : <span>{lbl.label}</span>}
                  {editable && lblColCount > 1 && (
                    <Tooltip title="Remove label column">
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 border-0 bg-transparent cursor-pointer p-0"
                        style={{ fontSize: 10 }}
                        onClick={(e) => { e.stopPropagation(); deleteLabelColumn(lbl.id); }}
                      >
                        <DeleteOutlined />
                      </button>
                    </Tooltip>
                  )}
                </div>
                {/* Right-edge hover zone: only shows "+" when hovering on the edge */}
                {editable && (
                  <div
                    className="absolute top-0 bottom-0 -right-[6px] w-3 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseEnter={e => { e.stopPropagation(); }}
                  >
                    <Tooltip title="Add label column">
                      <button
                        className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs leading-none flex items-center justify-center shadow-sm border-0 cursor-pointer"
                        style={{ fontSize: 14, fontWeight: 300 }}
                        onClick={(e) => { e.stopPropagation(); addLabelColumn(lbl.id); }}
                        onMouseDown={e => e.stopPropagation()}
                      >+</button>
                      </Tooltip>
                  </div>
                )}
              </th>
            ))}
            {/* Data column headers */}
            {effectiveHeaders.map((h) => renderHeaderCell(h, level, isLeaf, treeDepth))}
            {/* Show "+" when no data columns exist */}
            {editable && isLeaf && effectiveHeaders.length === 0 && (
              <th className="px-2 py-1 text-center text-gray-400">
                <Tooltip title="Add column">
                  <button
                    className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs leading-none flex items-center justify-center shadow-sm border-0 cursor-pointer"
                    style={{ fontSize: 14, fontWeight: 300 }}
                    onClick={(e) => { e.stopPropagation(); addHeaderColumn(); }}
                    onMouseDown={e => e.stopPropagation()}
                  >+</button>
                </Tooltip>
              </th>
            )}
          </tr>
        );
      }
      return rows;
    };

    // Recursively render a header cell at the given depth level
    const renderHeaderCell = (group: ColumnHeaderGroup, level: number, isLeaf: boolean, maxDepth: number): React.ReactNode => {
      if (level === 0) {
        if (group.children?.length) {
          const leaves = countLeaves(group.children);
          const span = isLeaf ? leaves : undefined;
          const rowSpan = isLeaf ? undefined : 1;
          return (
            <th
              key={group.id}
              colSpan={span || leaves}
              rowSpan={rowSpan}
              className="px-2 py-1 text-center font-semibold group relative"
              style={colHeaderStyle}
            >
              {editable
                ? mk(`hdr-${group.id}`, group.label, v => updateHeaderLabel(group.id, v))
                : <span>{group.label}</span>}
              {/* Right-edge hover zone: only shows "+" when hovering on the edge */}
              {editable && (
                <div
                  className="absolute top-0 bottom-0 -right-[6px] w-3 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseEnter={e => { e.stopPropagation(); }}
                >
                  <Tooltip title="Add column under group">
                    <button
                      className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs leading-none flex items-center justify-center shadow-sm border-0 cursor-pointer"
                      style={{ fontSize: 14, fontWeight: 300 }}
                      onClick={(e) => { e.stopPropagation(); addHeaderChild(group.id); }}
                      onMouseDown={e => e.stopPropagation()}
                    >+</button>
                  </Tooltip>
                </div>
              )}
            </th>
          );
        }
        // Leaf node at level 0 — editable with move/delete
        const leafIdx = leafCols.indexOf(group);
        const useArmHeaders = !!(onColumnHeadersChange && columnHeaders);
        return (
          <th
            key={group.id}
            rowSpan={maxDepth}
            className="px-2 py-1 text-center font-semibold group relative"
            style={{ ...colHeaderStyle, minWidth: group.width || 100 }}
          >
            <div className="flex items-center justify-center gap-1">
              {editable && (
                <MoveBtn dir="h"
                  onFirst={leafIdx === 0}
                  onLast={leafIdx === leafCols.length - 1}
                  onPrev={() => useArmHeaders ? moveHeaderColumn(group.id, -1) : moveCol(leafIdx, -1)}
                  onNext={() => useArmHeaders ? moveHeaderColumn(group.id, 1) : moveCol(leafIdx, 1)}
                />
              )}
              {editable
                ? mk(`hdr-${group.id}`, group.label, v => updateHeaderLabel(group.id, v))
                : <span>{group.label}</span>
              }
              {editable && (
                <Tooltip title="Delete column">
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 border-0 bg-transparent cursor-pointer p-0"
                    style={{ fontSize: 10 }}
                    onClick={(e) => { e.stopPropagation(); useArmHeaders ? deleteHeaderColumn(group.id) : delCol(group.id); }}
                  >
                    <DeleteOutlined />
                  </button>
                </Tooltip>
              )}
            </div>
            {/* Right-edge hover zone: only shows "+" when hovering on the edge, not the whole cell */}
            {editable && (
              <div
                className="absolute top-0 bottom-0 -right-[6px] w-3 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onMouseEnter={e => { e.stopPropagation(); }}
              >
                <Tooltip title="Add column">
                  <button
                    className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs leading-none flex items-center justify-center shadow-sm border-0 cursor-pointer"
                    style={{ fontSize: 14, fontWeight: 300 }}
                    onClick={(e) => { e.stopPropagation(); useArmHeaders ? addHeaderColumn(group.id) : addColumn(); }}
                    onMouseDown={e => e.stopPropagation()}
                  >+</button>
                </Tooltip>
              </div>
            )}
          </th>
        );
      }
      if (group.children?.length) {
        return group.children.map(child => renderHeaderCell(child, level - 1, isLeaf, maxDepth));
      }
      return null;
    };

    // Total column count for colSpan: label columns + data columns (no gap columns)
    const totalHeaderCols = lblColCount + Math.max(leafColCount, editable ? 1 : 0);

    return (
      <div className={`bg-white ${compact ? '' : 'p-3 border rounded'}`} onClick={() => setSel(null)}>
        {/* Title block */}
        {renderTitleBlock()}

        {/* Data rows with modern insert UX — three-line table style */}
        <div
          className="table-editor-wrapper"
          onClick={e => e.stopPropagation()}
          onMouseDown={e => {
            (e.currentTarget as HTMLElement).classList.add('hovering');
          }}
          onMouseUp={() => {
            document.querySelectorAll('.table-editor-wrapper').forEach(el => el.classList.remove('hovering'));
          }}
        >
          <style>{`
            .table-editor-wrapper:not(.hovering) .row-gap button { opacity: 0 !important; }
            .table-editor-wrapper .row-gap:hover button { opacity: 1 !important; }
            /* Three-line table: top rule, header separator, bottom rule */
            .three-line-table { border-collapse: separate; border-spacing: 0; }
            .three-line-table thead tr:first-child th { border-top: 2px solid #333; }
            .three-line-table thead tr:last-child th { border-bottom: 1px solid #333; }
            .three-line-table tbody tr:last-child td { border-bottom: 2px solid #333; }
          `}</style>
          <table className="three-line-table w-full" style={{ fontSize: hs ? hs.columnHeaderSize : 11 }}>
            <thead>
              {buildHeaderRows()}
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <>
                  <RowInsertGap onInsert={() => addRow(-1)} tooltip="Insert first row" />
                  <tr><td colSpan={totalHeaderCols} className="px-2 py-4 text-center text-gray-400">No rows defined</td></tr>
                  <RowInsertGap onInsert={() => addRow()} tooltip="Add row at end" />
                </>
              ) : (
                <>
                  <RowInsertGap onInsert={() => addRow(-1)} tooltip="Insert row at top" />
                  {rows.map((row, idx) => (
                    <React.Fragment key={row.id}>
                      <tr className="group hover:bg-blue-50 transition-colors">
                        {/* Label columns cells */}
                        {lblColumns.map((lbl, lblIdx) => (
                          <td key={lbl.id} className="px-2 py-1" style={{ paddingLeft: lblIdx === 0 ? (row.level || 0) * 20 + 8 : 8 }}>
                            {lblIdx === 0 ? (
                              /* First label column: row label with actions */
                              <div className="flex items-center gap-2">
                                {editable && (
                                  <MoveBtn dir="v" onFirst={prevSibling(rows, idx) < 0} onLast={nextSibling(rows, idx) < 0} onPrev={() => moveRow(idx, -1)} onNext={() => moveRow(idx, 1)} />
                                )}
                                {mk(`row-${row.id}`, row.label, v => setShell(s => {
                                  s.rows = (s.rows || []).map((r: TableRow) => r.id === row.id ? { ...r, label: v } : r);
                                }))}
                                {editable && (
                                  <>
                                    <Tooltip title="Outdent">
                                      <button className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 border-0 bg-transparent cursor-pointer p-0"
                                        onClick={(e) => { e.stopPropagation(); changeRowLevel(row.id, -1); }}>
                                        <ArrowLeftOutlined style={{ fontSize: 10 }} />
                                      </button>
                                    </Tooltip>
                                    <Tooltip title="Indent">
                                      <button className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 border-0 bg-transparent cursor-pointer p-0"
                                        onClick={(e) => { e.stopPropagation(); changeRowLevel(row.id, 1); }}>
                                        <ArrowRightOutlined style={{ fontSize: 10 }} />
                                      </button>
                                    </Tooltip>
                                    <Divider type="vertical" style={{ height: 12, margin: '0 2px' }} />
                                    <Tooltip title="Delete row">
                                      <button className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 border-0 bg-transparent cursor-pointer p-0"
                                        onClick={(e) => { e.stopPropagation(); delRow(row.id); }}>
                                        <DeleteOutlined style={{ fontSize: 10 }} />
                                      </button>
                                    </Tooltip>
                                  </>
                                )}
                              </div>
                            ) : (
                              /* Additional label columns: empty placeholder */
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                        ))}
                        {/* Data column cells */}
                        {(() => {
                          const statTypes = (row.stats ?? []).map(s => s.type);
                          const hasStats = statTypes.length > 0 && !statTypes.includes('header');
                          const placeholder = hasStats
                            ? formatPlaceholder(
                                statTypes,
                                buildDecimalsMap(row.stats!, decimalConfig?.shellDefaults, decimalConfig?.studyDefaults, DEFAULT_DECIMAL_RULES),
                              )
                            : null;
                          return leafCols.length === 0
                            ? <td className="px-2 py-1 text-center text-gray-400">-</td>
                            : leafCols.map(c => (
                              <td key={c.id} className="px-2 py-1 text-center" style={{ minWidth: c.width || 80 }}>
                                {placeholder
                                  ? <span style={{ color: '#1890ff', fontStyle: 'italic' }}>{placeholder}</span>
                                  : <span className="text-gray-400">-</span>}
                              </td>
                            ));
                        })()}
                      </tr>
                      <RowInsertGap onInsert={() => addRow(idx)} tooltip={`Insert row after "${row.label.slice(0, 20)}"`} />
                    </React.Fragment>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Footnotes */}
        {renderFootnoteSection('fn-section')}

        <Toolbar visible={sel !== null && editable} pos={pos} fmt={fmts[sel || ''] || {}} onFmt={fmtH} onClose={() => setSel(null)} />
      </div>
    );
  }

  /* ---------- LISTING ---------- */
  if (template.type === 'listing') {
    // Compute max header lines for multi-line headers
    const maxHeaderLines = Math.max(1, ...cols.map(c => c.headerLines?.length || 1));

    return (
      <div className={`bg-white ${compact ? '' : 'p-3 border rounded'}`} onClick={() => setSel(null)}>
        {/* Title block */}
        {renderTitleBlock()}

        {/* Columns with multi-line headers and resizable width */}
        <div onClick={e => e.stopPropagation()}>
          <style>{`
            .listing-three-line { border-collapse: separate; border-spacing: 0; table-layout: fixed; width: 100%; }
            .listing-three-line thead tr:first-child th { border-top: 2px solid #333; }
            .listing-three-line thead tr:last-child th { border-bottom: 1px solid #333; }
            .listing-three-line tbody tr:last-child td { border-bottom: 2px solid #333; }
            .listing-header-cell { position: relative; }
            .listing-header-cell:hover .col-resize-handle { opacity: 1; }
            .col-resize-handle {
              position: absolute;
              right: 0;
              top: 0;
              bottom: 0;
              width: 6px;
              cursor: col-resize;
              background: transparent;
              opacity: 0;
              transition: opacity 0.15s;
              z-index: 10;
            }
            .col-resize-handle:hover { background: rgba(24, 144, 255, 0.3); }
            .col-resize-handle.dragging { background: rgba(24, 144, 255, 0.5); }
          `}</style>
          <table className="listing-three-line" style={{ fontSize: hs ? hs.columnHeaderSize : 11 }}>
            <thead>
              {/* Render multiple header rows based on headerLines */}
              {Array.from({ length: maxHeaderLines }).map((_, lineIdx) => (
                <tr key={`header-line-${lineIdx}`} className="sticky top-0" style={colHeaderStyle}>
                  {cols.slice(0, 10).map((col, idx) => {
                    const lines = col.headerLines || [col.label];
                    const lineText = lines[lineIdx] || '';
                    const isFirstLine = lineIdx === 0;
                    const isLastLine = lineIdx === maxHeaderLines - 1;

                    return (
                      <th
                        key={col.id}
                        className={`px-2 py-1 text-left font-semibold group relative listing-header-cell ${isFirstLine ? '' : 'border-t-0'}`}
                        style={{ minWidth: col.width || 80, width: col.width || 80 }}
                      >
                        <div className="flex items-center gap-1">
                          {/* Actions only on first line */}
                          {isFirstLine && editable && (
                            <MoveBtn dir="h" onFirst={idx === 0} onLast={idx === cols.length - 1} onPrev={() => moveCol(idx, -1)} onNext={() => moveCol(idx, 1)} />
                          )}
                          {/* Editable text for this line */}
                          {editable ? (
                            <div className="flex-1 flex items-center gap-1">
                              {mk(`col-${col.id}-line-${lineIdx}`, lineText, v => updateHeaderLine(col.id, lineIdx, v), { placeholder: `Line ${lineIdx + 1}...` })}
                              {/* Add/remove line buttons on last visible line */}
                              {editable && isFirstLine && (
                                <Tooltip title="Add header line">
                                  <button
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400 hover:text-blue-600 border-0 bg-transparent cursor-pointer p-0"
                                    style={{ fontSize: 10 }}
                                    onClick={(e) => { e.stopPropagation(); addHeaderLine(col.id); }}
                                  >
                                    +
                                  </button>
                                </Tooltip>
                              )}
                              {editable && lines.length > 1 && (
                                <Tooltip title="Remove this line">
                                  <button
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 border-0 bg-transparent cursor-pointer p-0"
                                    style={{ fontSize: 10 }}
                                    onClick={(e) => { e.stopPropagation(); removeHeaderLine(col.id, lineIdx); }}
                                  >
                                    ×
                                  </button>
                                </Tooltip>
                              )}
                            </div>
                          ) : (
                            <span>{lineText}</span>
                          )}
                          {/* Delete column only on first line */}
                          {isFirstLine && editable && (
                            <Tooltip title="Delete column">
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-red-400 hover:text-red-600 border-0 bg-transparent cursor-pointer"
                                style={{ fontSize: 10 }}
                                onClick={(e) => { e.stopPropagation(); delCol(col.id); }}
                              >
                                <DeleteOutlined />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                        {/* Column resize handle - only on last header row */}
                        {isLastLine && editable && (
                          <div
                            className="col-resize-handle"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              const startX = e.clientX;
                              const startWidth = col.width || 80;
                              const th = e.currentTarget.parentElement as HTMLElement;

                              const onMouseMove = (ev: MouseEvent) => {
                                const delta = ev.clientX - startX;
                                const newWidth = Math.max(40, startWidth + delta);
                                updateColumnWidth(col.id, newWidth);
                                th.style.width = `${newWidth}px`;
                              };

                              const onMouseUp = () => {
                                document.removeEventListener('mousemove', onMouseMove);
                                document.removeEventListener('mouseup', onMouseUp);
                                document.body.style.cursor = '';
                                resizeCleanupRef.current = null;
                              };

                              document.addEventListener('mousemove', onMouseMove);
                              document.addEventListener('mouseup', onMouseUp);
                              document.body.style.cursor = 'col-resize';
                              resizeCleanupRef.current = onMouseUp;
                            }}
                          />
                        )}
                        {/* Right-edge hover zone for adding columns - only on first line */}
                        {isFirstLine && editable && (
                          <div
                            className="absolute top-0 bottom-0 -right-[6px] w-3 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onMouseEnter={e => { e.stopPropagation(); }}
                          >
                            <Tooltip title="Add column">
                              <button
                                className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs leading-none flex items-center justify-center shadow-sm border-0 cursor-pointer"
                                style={{ fontSize: 14, fontWeight: 300 }}
                                onClick={(e) => { e.stopPropagation(); addColumn(idx); }}
                                onMouseDown={e => e.stopPropagation()}
                              >+</button>
                            </Tooltip>
                          </div>
                        )}
                      </th>
                    );
                  })}
                  {/* Empty state - only show on first line */}
                  {lineIdx === 0 && editable && cols.length === 0 && (
                    <th className="px-2 py-1 text-center text-gray-400">
                      No columns — click + to add
                    </th>
                  )}
                  {/* Final add column at the end - only on first line */}
                  {lineIdx === 0 && editable && cols.length > 0 && cols.length <= 10 && (
                    <th className="px-2 py-1 w-[32px] relative group-col-gap">
                      <Tooltip title="Add column at end">
                        <button
                          className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs leading-none flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity shadow-sm border-0 cursor-pointer"
                          style={{ fontSize: 14, fontWeight: 300 }}
                          onClick={(e) => { e.stopPropagation(); addColumn(); }}
                          onMouseDown={e => e.stopPropagation()}
                        >
                          +
                        </button>
                      </Tooltip>
                    </th>
                  )}
                </tr>
              ))}
            </thead>
            <tbody>
              {[0, 1, 2].map(i => (
                <tr key={i}>
                  {cols.slice(0, 10).map(col => (
                    <td key={col.id} className="px-2 py-1 text-gray-400" style={{ width: col.width || 80 }}>-</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footnotes */}
        {renderFootnoteSection('fn-section-lst')}

        <Toolbar visible={sel !== null && editable} pos={pos} fmt={fmts[sel || ''] || {}} onFmt={fmtH} onClose={() => setSel(null)} />
      </div>
    );
  }

  /* ---------- FIGURE ---------- */
  if (template.type === 'figure') {
    const fig = template.shell as FigureShell;
    return (
      <div className={`bg-white ${compact ? '' : 'p-3 border rounded'}`} onClick={() => setSel(null)}>
        {/* Title block */}
        {renderTitleBlock()}

        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-300 rounded bg-gray-50 min-h-[180px]" onClick={e => e.stopPropagation()}>
          <div className="text-4xl mb-2">📊</div>
          <div className="text-base font-medium text-gray-600">{fig.chartType || 'line'} Chart</div>
          <div className="text-xs text-gray-400 mt-2">X: {fig.xAxis?.label || '-'} | Y: {fig.yAxis?.label || '-'}</div>
          <div className="text-xs text-gray-400 mt-1">{fig.series?.length || 0} series</div>
        </div>

        {/* Footnotes */}
        {renderFootnoteSection('fn-section-fig')}

        <Toolbar visible={sel !== null && editable} pos={pos} fmt={fmts[sel || ''] || {}} onFmt={fmtH} onClose={() => setSel(null)} />
      </div>
    );
  }

  return null;
});

export default InteractiveOutputEditor;
