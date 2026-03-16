import { create } from 'zustand'
import type { TableShell, TableRow, TableFooter, TreatmentArmSet } from '../types'

interface TableState {
  tables: TableShell[]
  currentTable: TableShell | null
  isDirty: boolean
  templates: TableShell[] // Custom templates saved by user
  
  // Actions
  setCurrentTable: (table: TableShell | null) => void
  updateMetadata: (updates: Partial<TableShell>) => void
  addRow: (parentId?: string) => void
  updateRow: (rowId: string, updates: Partial<TableRow>) => void
  deleteRow: (rowId: string) => void
  moveRow: (rowId: string, direction: 'up' | 'down') => void
  duplicateRow: (rowId: string) => void
  updateFooter: (footer: Partial<TableFooter>) => void
  markClean: () => void
  
  // Template Actions
  loadFromTemplate: (template: TableShell) => void
  saveAsTemplate: (table: TableShell, name: string) => void
  deleteTemplate: (templateId: string) => void
  getAllTemplates: () => TableShell[]
}

// Helper to generate unique IDs
const generateId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Mock tables
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
]

// Mock Treatment Arm Sets (for testing nested columns)
export const mockTreatmentArmSets: Record<string, TreatmentArmSet> = {
  tas1: {
    id: 'tas1',
    name: 'Study ABC-001 Treatment Arms',
    arms: [
      { id: 'arm1', name: 'Placebo', order: 1, N: 50 },
      { id: 'arm2', name: 'Drug 10mg', order: 2, grouping: 'Active', N: 48 },
      { id: 'arm3', name: 'Drug 20mg', order: 3, grouping: 'Active', N: 52 },
      { id: 'arm4', name: 'Drug 40mg', order: 4, grouping: 'Active', N: 47 },
    ],
  },
  tas2: {
    id: 'tas2',
    name: 'Simple Two-Arm Study',
    arms: [
      { id: 'arm1', name: 'Placebo', order: 1, N: 100 },
      { id: 'arm2', name: 'Treatment', order: 2, N: 102 },
    ],
  },
}

export const useTableStore = create<TableState>((set, get) => ({
  tables: mockTables,
  currentTable: null,
  isDirty: false,
  templates: [], // User-saved templates (loaded from localStorage if available)
  
  setCurrentTable: (table) => set({ currentTable: table, isDirty: false }),
  
  updateMetadata: (updates) => set((state) => ({
    currentTable: state.currentTable 
      ? { ...state.currentTable, ...updates }
      : null,
    isDirty: true,
  })),
  
  addRow: (parentId) => set((state) => {
    if (!state.currentTable) return state
    
    const currentRows = state.currentTable.rows
    const newRow: TableRow = {
      id: generateId(),
      label: 'New Row',
      level: 0,
      stats: [{ type: 'n' }],
    }
    
    // If parentId provided, add as child (nested row)
    if (parentId) {
      const parentIndex = currentRows.findIndex(r => r.id === parentId)
      if (parentIndex >= 0) {
        const parent = currentRows[parentIndex]
        newRow.level = parent.level + 1
        newRow.label = '  '.repeat(newRow.level) + 'New Row'
        
        // Find where to insert (after parent's last child)
        let insertIndex = parentIndex + 1
        while (insertIndex < currentRows.length && currentRows[insertIndex].level > parent.level) {
          insertIndex++
        }
        
        const newRows = [...currentRows]
        newRows.splice(insertIndex, 0, newRow)
        
        return {
          currentTable: { ...state.currentTable, rows: newRows },
          isDirty: true,
        }
      }
    }
    
    return {
      currentTable: { ...state.currentTable, rows: [...currentRows, newRow] },
      isDirty: true,
    }
  }),
  
  updateRow: (rowId, updates) => set((state) => {
    if (!state.currentTable) return state
    
    return {
      currentTable: {
        ...state.currentTable,
        rows: state.currentTable.rows.map(r =>
          r.id === rowId ? { ...r, ...updates } : r
        ),
      },
      isDirty: true,
    }
  }),
  
  deleteRow: (rowId) => set((state) => {
    if (!state.currentTable) return state
    
    const rows = state.currentTable.rows
    const rowIndex = rows.findIndex(r => r.id === rowId)
    
    if (rowIndex < 0) return state
    
    // Check if this row has children
    const row = rows[rowIndex]
    let deleteCount = 1
    for (let i = rowIndex + 1; i < rows.length && rows[i].level > row.level; i++) {
      deleteCount++
    }
    
    const newRows = [...rows]
    newRows.splice(rowIndex, deleteCount)
    
    return {
      currentTable: { ...state.currentTable, rows: newRows },
      isDirty: true,
    }
  }),
  
  moveRow: (rowId, direction) => set((state) => {
    if (!state.currentTable) return state
    
    const rows = [...state.currentTable.rows]
    const index = rows.findIndex(r => r.id === rowId)
    
    if (index < 0) return state
    
    const row = rows[index]
    
    // Calculate row span (including children)
    let span = 1
    for (let i = index + 1; i < rows.length && rows[i].level > row.level; i++) {
      span++
    }
    
    // Calculate target position
    const targetIndex = direction === 'up' ? index - 1 : index + span
    
    if (targetIndex < 0 || targetIndex >= rows.length) return state
    
    // For 'up', we need to find the previous row group
    // For 'down', we need to find the next row group
    // This is simplified - in reality, we'd need to respect hierarchy
    
    // Simple swap for now (non-hierarchical)
    if (direction === 'up' && index > 0) {
      const prevRow = rows[index - 1]
      // Only swap if same level
      if (prevRow.level === row.level) {
        const movingRows = rows.splice(index, span)
        rows.splice(index - 1, 0, ...movingRows)
      }
    } else if (direction === 'down' && index + span < rows.length) {
      const nextRow = rows[index + span]
      // Only swap if same level
      if (nextRow.level === row.level) {
        const movingRows = rows.splice(index, span)
        rows.splice(index + span, 0, ...movingRows)
      }
    }
    
    return {
      currentTable: { ...state.currentTable, rows },
      isDirty: true,
    }
  }),
  
  duplicateRow: (rowId) => set((state) => {
    if (!state.currentTable) return state
    
    const rows = state.currentTable.rows
    const index = rows.findIndex(r => r.id === rowId)
    
    if (index < 0) return state
    
    const row = rows[index]
    
    // Calculate span
    let span = 1
    for (let i = index + 1; i < rows.length && rows[i].level > row.level; i++) {
      span++
    }
    
    // Duplicate rows with new IDs
    const duplicatedRows = rows.slice(index, index + span).map(r => ({
      ...r,
      id: generateId(),
      label: r.level === row.level ? r.label + ' (copy)' : r.label,
    }))
    
    const newRows = [...rows]
    newRows.splice(index + span, 0, ...duplicatedRows)
    
    return {
      currentTable: { ...state.currentTable, rows: newRows },
      isDirty: true,
    }
  }),
  
  updateFooter: (footer) => set((state) => {
    if (!state.currentTable) return state
    
    return {
      currentTable: {
        ...state.currentTable,
        footer: { ...state.currentTable.footer, ...footer },
      },
      isDirty: true,
    }
  }),
  
  markClean: () => set({ isDirty: false }),
  
  loadFromTemplate: (template) => set({
    currentTable: {
      ...template,
      id: generateId(),
    },
    isDirty: true,
  }),
  
  saveAsTemplate: (table, name) => set((state) => {
    const newTemplate: TableShell = {
      ...table,
      id: `template_${Date.now()}`,
      shellNumber: name,
      title: name,
    }
    
    const updatedTemplates = [...state.templates, newTemplate]
    
    // Save to localStorage
    try {
      localStorage.setItem('tfl-templates', JSON.stringify(updatedTemplates))
    } catch (e) {
      console.error('Failed to save templates to localStorage:', e)
    }
    
    return { templates: updatedTemplates }
  }),
  
  deleteTemplate: (templateId) => set((state) => {
    const updatedTemplates = state.templates.filter(t => t.id !== templateId)
    
    // Update localStorage
    try {
      localStorage.setItem('tfl-templates', JSON.stringify(updatedTemplates))
    } catch (e) {
      console.error('Failed to update templates in localStorage:', e)
    }
    
    return { templates: updatedTemplates }
  }),
  
  getAllTemplates: () => {
    const state = get()
    // Combine mock tables (built-in templates) with user templates
    return [...mockTables, ...state.templates]
  },
}))