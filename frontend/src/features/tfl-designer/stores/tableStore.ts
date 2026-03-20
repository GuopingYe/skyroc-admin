/**
 * TFL Designer - Table Store (Zustand + Immer)
 *
 * Manages table shells with full CRUD, row operations, and template management.
 * Follows the POC store pattern with immer middleware.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { TableShell, TableRow, TableFooter } from '../types';
import { generateId } from '../types';

// ==================== State Interface ====================

interface TableState {
  tables: TableShell[];
  currentTable: TableShell | null;
  isDirty: boolean;
  templates: TableShell[];

  // Selection
  setCurrentTable: (table: TableShell | null) => void;

  // Metadata
  updateMetadata: (updates: Partial<TableShell>) => void;
  updateHeaderLayers: (layers: TableShell['headerLayers']) => void;

  // Row operations
  addRow: (parentId?: string, insertIndex?: number) => void;
  updateRow: (rowId: string, updates: Partial<TableRow>) => void;
  deleteRow: (rowId: string) => void;
  moveRow: (rowId: string, direction: 'up' | 'down') => void;
  duplicateRow: (rowId: string) => void;

  // Footer
  updateFooter: (footer: Partial<TableFooter>) => void;

  // Dirty tracking
  markClean: () => void;

  // Template operations
  loadFromTemplate: (template: TableShell) => void;
  saveAsTemplate: (table: TableShell, name: string) => void;
  deleteTemplate: (templateId: string) => void;
  getAllTemplates: () => TableShell[];
}

// ==================== Mock Tables ====================

const mockTables: TableShell[] = [
  {
    id: 't1',
    shellNumber: 'Table 14.1.1',
    title: 'Demographics',
    population: 'Safety',
    category: 'Demographics',
    dataset: 'ADSL',
    treatmentArmSetId: 'tas1',
    statisticsSetId: 'ss1',
    rows: [
      { id: 'r1', label: 'Age (years)', level: 0, stats: [{ type: 'header' }] },
      { id: 'r2', label: '  n', level: 1, variable: 'AGE', stats: [{ type: 'n' }] },
      { id: 'r3', label: '  Mean (SD)', level: 1, variable: 'AGE', stats: [{ type: 'mean' }, { type: 'sd' }] },
      { id: 'r4', label: '  Median', level: 1, variable: 'AGE', stats: [{ type: 'median' }] },
      { id: 'r5', label: '  Range', level: 1, variable: 'AGE', stats: [{ type: 'min' }, { type: 'max' }] },
      { id: 'r6', label: 'Sex, n (%)', level: 0, stats: [{ type: 'header' }] },
      { id: 'r7', label: '  Male', level: 1, variable: 'SEX', stats: [{ type: 'n_percent' }] },
      { id: 'r8', label: '  Female', level: 1, variable: 'SEX', stats: [{ type: 'n_percent' }] },
    ],
    footer: {
      source: 'ADSL',
      notes: ['N = Number of subjects in the analysis population', 'SD = Standard Deviation'],
    },
  },
  {
    id: 't2',
    shellNumber: 'Table 14.2.1',
    title: 'Treatment-Emergent Adverse Events by SOC and PT',
    population: 'Safety',
    category: 'Adverse_Events',
    dataset: 'ADAE',
    treatmentArmSetId: 'tas1',
    statisticsSetId: 'ss1',
    rows: [
      { id: 'r1', label: 'Cardiac disorders', level: 0, stats: [{ type: 'n_percent' }], analysisOfInterest: 'SOC' },
      { id: 'r2', label: '  Atrial fibrillation', level: 1, variable: 'PT', stats: [{ type: 'n_percent' }] },
      { id: 'r3', label: '  Palpitations', level: 1, variable: 'PT', stats: [{ type: 'n_percent' }] },
      { id: 'r4', label: 'Gastrointestinal disorders', level: 0, stats: [{ type: 'n_percent' }], analysisOfInterest: 'SOC' },
      { id: 'r5', label: '  Nausea', level: 1, variable: 'PT', stats: [{ type: 'n_percent' }] },
      { id: 'r6', label: '  Vomiting', level: 1, variable: 'PT', stats: [{ type: 'n_percent' }] },
    ],
    footer: {
      source: 'ADAE',
      notes: ['SOC = System Organ Class', 'PT = Preferred Term', 'n (%) = Number (percentage) of subjects'],
    },
  },
];

// ==================== Store ====================

export const useTableStore = create<TableState>()(
  immer((set, get) => ({
    tables: mockTables,
    currentTable: null,
    isDirty: false,
    templates: [],

    setCurrentTable: (table) =>
      set((state) => {
        state.currentTable = table;
        state.isDirty = false;
      }),

    updateMetadata: (updates) =>
      set((state) => {
        if (state.currentTable) {
          Object.assign(state.currentTable, updates);
          state.isDirty = true;
        }
      }),

    updateHeaderLayers: (layers) =>
      set((state) => {
        if (state.currentTable) {
          state.currentTable.headerLayers = layers;
          state.isDirty = true;
        }
      }),

    addRow: (parentId, insertIndex) =>
      set((state) => {
        if (!state.currentTable) return;

        const newRow: TableRow = {
          id: generateId('row'),
          label: 'New Row',
          level: 0,
          stats: [{ type: 'n' }],
        };

        const rows = state.currentTable.rows;

        if (parentId) {
          const parentIndex = rows.findIndex((r) => r.id === parentId);
          if (parentIndex >= 0) {
            const parent = rows[parentIndex];
            newRow.level = parent.level + 1;
            newRow.label = '  '.repeat(newRow.level) + 'New Row';

            // Find where to insert (after parent's last child)
            let idx = parentIndex + 1;
            while (idx < rows.length && rows[idx].level > parent.level) {
              idx++;
            }
            rows.splice(idx, 0, newRow);
          }
        } else if (insertIndex !== undefined) {
          rows.splice(insertIndex, 0, newRow);
        } else {
          rows.push(newRow);
        }

        state.isDirty = true;
      }),

    updateRow: (rowId, updates) =>
      set((state) => {
        if (!state.currentTable) return;

        const row = state.currentTable.rows.find((r) => r.id === rowId);
        if (row) {
          Object.assign(row, updates);
          state.isDirty = true;
        }
      }),

    deleteRow: (rowId) =>
      set((state) => {
        if (!state.currentTable) return;

        const rows = state.currentTable.rows;
        const rowIndex = rows.findIndex((r) => r.id === rowId);
        if (rowIndex < 0) return;

        // Delete this row and all its children (deeper level rows that follow)
        const row = rows[rowIndex];
        let deleteCount = 1;
        for (let i = rowIndex + 1; i < rows.length && rows[i].level > row.level; i++) {
          deleteCount++;
        }
        rows.splice(rowIndex, deleteCount);
        state.isDirty = true;
      }),

    moveRow: (rowId, direction) =>
      set((state) => {
        if (!state.currentTable) return;

        const rows = state.currentTable.rows;
        const index = rows.findIndex((r) => r.id === rowId);
        if (index < 0) return;

        const row = rows[index];

        // Calculate row span (including children)
        let span = 1;
        for (let i = index + 1; i < rows.length && rows[i].level > row.level; i++) {
          span++;
        }

        if (direction === 'up' && index > 0) {
          const prevRow = rows[index - 1];
          if (prevRow.level === row.level) {
            const movingRows = rows.splice(index, span);
            rows.splice(index - 1, 0, ...movingRows);
          }
        } else if (direction === 'down' && index + span < rows.length) {
          const nextRow = rows[index + span];
          if (nextRow.level === row.level) {
            const movingRows = rows.splice(index, span);
            rows.splice(index + span, 0, ...movingRows);
          }
        }

        state.isDirty = true;
      }),

    duplicateRow: (rowId) =>
      set((state) => {
        if (!state.currentTable) return;

        const rows = state.currentTable.rows;
        const index = rows.findIndex((r) => r.id === rowId);
        if (index < 0) return;

        const row = rows[index];

        // Calculate span
        let span = 1;
        for (let i = index + 1; i < rows.length && rows[i].level > row.level; i++) {
          span++;
        }

        // Duplicate rows with new IDs
        const duplicatedRows = rows.slice(index, index + span).map((r) => ({
          ...r,
          id: generateId('row'),
          label: r.level === row.level ? r.label + ' (copy)' : r.label,
        }));

        rows.splice(index + span, 0, ...duplicatedRows);
        state.isDirty = true;
      }),

    updateFooter: (footer) =>
      set((state) => {
        if (!state.currentTable) return;

        Object.assign(state.currentTable.footer, footer);
        state.isDirty = true;
      }),

    markClean: () =>
      set((state) => {
        state.isDirty = false;
      }),

    loadFromTemplate: (template) =>
      set((state) => {
        state.currentTable = {
          ...JSON.parse(JSON.stringify(template)),
          id: generateId('table'),
        };
        state.isDirty = true;
      }),

    saveAsTemplate: (table, name) =>
      set((state) => {
        const newTemplate: TableShell = {
          ...JSON.parse(JSON.stringify(table)),
          id: `template_${Date.now()}`,
          shellNumber: name,
          title: name,
        };

        state.templates.push(newTemplate);

        // Persist to localStorage
        try {
          localStorage.setItem('tfl-table-templates', JSON.stringify(state.templates));
        } catch (e) {
          console.error('Failed to save table templates to localStorage:', e);
        }
      }),

    deleteTemplate: (templateId) =>
      set((state) => {
        state.templates = state.templates.filter((t) => t.id !== templateId);

        try {
          localStorage.setItem('tfl-table-templates', JSON.stringify(state.templates));
        } catch (e) {
          console.error('Failed to update table templates in localStorage:', e);
        }
      }),

    getAllTemplates: () => {
      const state = get();
      return [...mockTables, ...state.templates];
    },
  }))
);
