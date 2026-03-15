/**
 * TFL Builder Store - ARS-Driven Redux Slice
 *
 * 基于 CDISC ARS 标准的状态管理 支持 Outputs, Displays, Groupings, Methods 的完整 CRUD
 */
import { type PayloadAction, createSlice } from '@reduxjs/toolkit';
import { useMemo } from 'react';

import type {
  IARSDocument,
  IAnalysisGrouping,
  IBodyCell,
  IBodyRow,
  IDisplay,
  IDisplaySection,
  IEditorUIState,
  IHistoryEntry,
  IMethod,
  IOutput,
  ISelectedElement,
  ITflBuilderState,
  SelectedElementType
} from './types';
import { createDefaultARSDocument, createDefaultBodyRow } from './types';

// ==================== 初始状态 ====================

const initialUIState: IEditorUIState = {
  activeDisplayId: null,
  isPreviewMode: false,
  leftPanelTab: 'outputs',
  leftPanelWidth: 280,
  outputFilter: 'all',
  rightPanelWidth: 320,
  searchKeyword: '',
  showBoundingBoxes: true,
  showGridLines: true,
  zoomLevel: 100
};

const initialSelectedElement: ISelectedElement = {
  id: null,
  type: 'none'
};

const initialState: ITflBuilderState = {
  document: null,
  dragState: {
    dragData: null,
    dragType: null,
    isDragging: false
  },
  history: {
    future: [],
    past: []
  },
  selectedElement: initialSelectedElement,
  ui: initialUIState
};

// ==================== 辅助函数 ====================

/** 生成唯一 ID */
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** 深拷贝 */
const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

// ==================== Slice 定义 ====================

const tflBuilderSlice = createSlice({
  initialState,
  name: 'tflBuilder',
  reducers: {
    // ==================== 分组操作 ====================

    /** 添加分析分组 */
    addAnalysisGrouping: (state, action: PayloadAction<Omit<IAnalysisGrouping, 'id'>>) => {
      if (state.document) {
        const newGrouping: IAnalysisGrouping = {
          ...action.payload,
          id: generateId('grouping')
        };
        state.document.analysisGroupings.push(newGrouping);
        // 更新所有显示的列头
        state.document.displays.forEach(display => {
          const colHeader = display.displaySections.find(s => s.type === 'ColumnHeader');
          if (colHeader && 'cells' in colHeader.content) {
            colHeader.content.cells.push({
              alignment: 'center',
              groupingId: newGrouping.id,
              id: generateId('colcell'),
              text: newGrouping.name
            });
          }
        });
      }
    },

    // ==================== Body 行操作 ====================

    /** 添加数据行 */
    addBodyRow: (
      state,
      action: PayloadAction<{
        displayId: string;
        insertIndex?: number;
        parentId?: string;
        row: Omit<IBodyRow, 'cells' | 'id'>;
      }>
    ) => {
      if (state.document) {
        const display = state.document.displays.find(d => d.id === action.payload.displayId);
        if (display) {
          const bodySection = display.displaySections.find(s => s.type === 'Body');
          if (bodySection && 'rows' in bodySection.content) {
            const groupings = state.document!.analysisGroupings;
            const newRow: IBodyRow = {
              ...action.payload.row,
              cells: groupings.map(g => ({
                alignment: 'center' as const,
                cellType: 'placeholder' as const,
                groupingId: g.id,
                id: generateId('cell'),
                text: 'xx.x'
              })),
              id: generateId('row'),
              isDraggable: true,
              isExpanded: true
            };

            if (action.payload.parentId) {
              // 添加为子行
              const addToParent = (rows: IBodyRow[]): boolean => {
                for (const row of rows) {
                  if (row.id === action.payload.parentId) {
                    if (!row.children) row.children = [];
                    row.children.push(newRow);
                    return true;
                  }
                  if (row.children && addToParent(row.children)) return true;
                }
                return false;
              };
              addToParent(bodySection.content.rows);
            } else {
              // 添加到顶层
              if (action.payload.insertIndex !== undefined) {
                bodySection.content.rows.splice(action.payload.insertIndex, 0, newRow);
              } else {
                bodySection.content.rows.push(newRow);
              }
            }
          }
        }
      }
    },

    // ==================== 显示操作 ====================

    /** 添加显示 */
    addDisplay: (state, action: PayloadAction<IDisplay>) => {
      if (state.document) {
        state.document.displays.push(action.payload);
      }
    },

    /** 添加脚注 */
    addFootnote: (state, action: PayloadAction<{ displayId: string; text: string }>) => {
      if (state.document) {
        const display = state.document.displays.find(d => d.id === action.payload.displayId);
        if (display) {
          const footnoteSection = display.displaySections.find(s => s.type === 'Footnote');
          if (footnoteSection) {
            // 已有脚注区，追加
            if ('text' in footnoteSection.content) {
              footnoteSection.content.text += `\n${action.payload.text}`;
            }
          } else {
            // 创建新的脚注区
            display.displaySections.push({
              content: {
                alignment: 'left',
                fontSize: 9,
                text: action.payload.text
              },
              id: generateId('section'),
              order: 99,
              type: 'Footnote'
            });
          }
        }
      }
    },

    // ==================== 方法操作 ====================

    /** 添加方法 */
    addMethod: (state, action: PayloadAction<Omit<IMethod, 'id'>>) => {
      if (state.document) {
        const newMethod: IMethod = {
          ...action.payload,
          id: generateId('method')
        };
        state.document.methods.push(newMethod);
      }
    },

    // ==================== 输出操作 ====================

    /** 添加输出 */
    addOutput: (state, action: PayloadAction<Omit<IOutput, 'id'>>) => {
      if (state.document) {
        const newOutput: IOutput = {
          ...action.payload,
          id: generateId('output'),
          order: state.document.outputs.length + 1
        };
        state.document.outputs.push(newOutput);
      }
    },

    /** 清除选择 */
    clearSelection: state => {
      state.selectedElement = initialSelectedElement;
    },

    /** 删除分析分组 */
    deleteAnalysisGrouping: (state, action: PayloadAction<string>) => {
      if (state.document) {
        state.document.analysisGroupings = state.document.analysisGroupings.filter(g => g.id !== action.payload);
        // 重新排序
        state.document.analysisGroupings.forEach((g, i) => {
          g.order = i + 1;
        });
        // 更新所有显示的列头
        state.document.displays.forEach(display => {
          const colHeader = display.displaySections.find(s => s.type === 'ColumnHeader');
          if (colHeader && 'cells' in colHeader.content) {
            colHeader.content.cells = colHeader.content.cells.filter(c => c.groupingId !== action.payload);
          }
          // 同时删除 Body 行中对应的单元格
          const bodySection = display.displaySections.find(s => s.type === 'Body');
          if (bodySection && 'rows' in bodySection.content) {
            const removeCellsFromRows = (rows: IBodyRow[]) => {
              rows.forEach(row => {
                row.cells = row.cells.filter(c => c.groupingId !== action.payload);
                if (row.children) {
                  removeCellsFromRows(row.children);
                }
              });
            };
            removeCellsFromRows(bodySection.content.rows);
          }
        });
      }
    },

    /** 删除数据行 */
    deleteBodyRow: (state, action: PayloadAction<{ displayId: string; rowId: string }>) => {
      if (state.document) {
        const display = state.document.displays.find(d => d.id === action.payload.displayId);
        if (display) {
          const bodySection = display.displaySections.find(s => s.type === 'Body');
          if (bodySection && 'rows' in bodySection.content) {
            const removeFromRows = (rows: IBodyRow[]): IBodyRow[] =>
              rows
                .filter(r => r.id !== action.payload.rowId)
                .map(r => ({
                  ...r,
                  children: r.children ? removeFromRows(r.children) : undefined
                }));
            bodySection.content.rows = removeFromRows(bodySection.content.rows);
          }
        }
      }
    },

    /** 删除显示 */
    deleteDisplay: (state, action: PayloadAction<string>) => {
      if (state.document) {
        state.document.displays = state.document.displays.filter(d => d.id !== action.payload);
        // 同时删除关联的输出
        state.document.outputs = state.document.outputs.filter(o => o.displayId !== action.payload);
        if (state.ui.activeDisplayId === action.payload) {
          state.ui.activeDisplayId = state.document.displays[0]?.id || null;
        }
      }
    },

    /** 删除方法 */
    deleteMethod: (state, action: PayloadAction<string>) => {
      if (state.document) {
        state.document.methods = state.document.methods.filter(m => m.id !== action.payload);
      }
    },

    /** 删除输出 */
    deleteOutput: (state, action: PayloadAction<string>) => {
      if (state.document) {
        state.document.outputs = state.document.outputs.filter(o => o.id !== action.payload);
        // 重新排序
        state.document.outputs.forEach((o, i) => {
          o.order = i + 1;
        });
      }
    },

    /** 结束拖拽 */
    endDrag: state => {
      state.dragState.isDragging = false;
      state.dragState.dragType = null;
      state.dragState.dragData = null;
    },

    // ==================== 文档操作 ====================

    /** 初始化文档 */
    initDocument: (state, action: PayloadAction<{ analysisId: string; studyId: string }>) => {
      state.document = createDefaultARSDocument(action.payload.studyId, action.payload.analysisId);
      state.selectedElement = initialSelectedElement;
      if (state.document.displays.length > 0) {
        state.ui.activeDisplayId = state.document.displays[0].id;
      }
    },

    /** 加载文档 */
    loadDocument: (state, action: PayloadAction<IARSDocument>) => {
      state.document = action.payload;
      state.selectedElement = initialSelectedElement;
      if (state.document.displays.length > 0) {
        state.ui.activeDisplayId = state.document.displays[0].id;
      }
    },

    /** 重做 */
    redo: state => {
      if (state.document && state.history.future.length > 0) {
        const nextEntry = state.history.future[0];
        const currentEntry: IHistoryEntry = {
          action: 'Current',
          snapshot: deepClone(state.document),
          timestamp: Date.now()
        };
        state.document = nextEntry.snapshot;
        state.history.past = [...state.history.past, currentEntry];
        state.history.future = state.history.future.slice(1);
      }
    },

    /** 重排分组 */
    reorderAnalysisGroupings: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      if (state.document) {
        const { fromIndex, toIndex } = action.payload;
        const [removed] = state.document.analysisGroupings.splice(fromIndex, 1);
        state.document.analysisGroupings.splice(toIndex, 0, removed);
        state.document.analysisGroupings.forEach((g, i) => {
          g.order = i + 1;
        });
      }
    },

    /** 重排数据行 */
    reorderBodyRows: (
      state,
      action: PayloadAction<{
        displayId: string;
        fromIndex: number;
        parentId?: string;
        toIndex: number;
      }>
    ) => {
      if (state.document) {
        const display = state.document.displays.find(d => d.id === action.payload.displayId);
        if (display) {
          const bodySection = display.displaySections.find(s => s.type === 'Body');
          if (bodySection && 'rows' in bodySection.content) {
            const { fromIndex, parentId, toIndex } = action.payload;
            if (parentId) {
              // 在子层级中重排
              const findAndReorder = (rows: IBodyRow[]): boolean => {
                for (const row of rows) {
                  if (row.id === parentId && row.children) {
                    const [removed] = row.children.splice(fromIndex, 1);
                    row.children.splice(toIndex, 0, removed);
                    return true;
                  }
                  if (row.children && findAndReorder(row.children)) return true;
                }
                return false;
              };
              findAndReorder(bodySection.content.rows);
            } else {
              // 在顶层重排
              const [removed] = bodySection.content.rows.splice(fromIndex, 1);
              bodySection.content.rows.splice(toIndex, 0, removed);
            }
          }
        }
      }
    },

    /** 重排输出 */
    reorderOutputs: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      if (state.document) {
        const { fromIndex, toIndex } = action.payload;
        const [removed] = state.document.outputs.splice(fromIndex, 1);
        state.document.outputs.splice(toIndex, 0, removed);
        state.document.outputs.forEach((o, i) => {
          o.order = i + 1;
        });
      }
    },

    // ==================== 重置 ====================

    reset: () => initialState,

    /** 重置文档 */
    resetDocument: state => {
      state.document = null;
      state.selectedElement = initialSelectedElement;
      state.history = { future: [], past: [] };
      state.ui.activeDisplayId = null;
    },

    // ==================== 历史记录 ====================

    /** 保存到历史 */
    saveToHistory: (state, action: PayloadAction<string>) => {
      if (state.document) {
        const entry: IHistoryEntry = {
          action: action.payload,
          snapshot: deepClone(state.document),
          timestamp: Date.now()
        };
        state.history.past = [...state.history.past.slice(-49), entry];
        state.history.future = [];
      }
    },

    // ==================== 选择操作 ====================

    /** 选择元素 */
    selectElement: (state, action: PayloadAction<ISelectedElement>) => {
      state.selectedElement = action.payload;
    },

    /** 设置活动显示 */
    setActiveDisplay: (state, action: PayloadAction<string | null>) => {
      state.ui.activeDisplayId = action.payload;
    },

    setLeftPanelTab: (state, action: PayloadAction<'groupings' | 'methods' | 'outputs'>) => {
      state.ui.leftPanelTab = action.payload;
    },

    // ==================== UI 状态 ====================

    setLeftPanelWidth: (state, action: PayloadAction<number>) => {
      state.ui.leftPanelWidth = action.payload;
    },

    setOutputFilter: (state, action: PayloadAction<'all' | 'figures' | 'listings' | 'tables'>) => {
      state.ui.outputFilter = action.payload;
    },

    setRightPanelWidth: (state, action: PayloadAction<number>) => {
      state.ui.rightPanelWidth = action.payload;
    },

    setSearchKeyword: (state, action: PayloadAction<string>) => {
      state.ui.searchKeyword = action.payload;
    },

    setZoomLevel: (state, action: PayloadAction<number>) => {
      state.ui.zoomLevel = Math.max(50, Math.min(200, action.payload));
    },

    // ==================== 拖拽状态 ====================

    /** 开始拖拽 */
    startDrag: (
      state,
      action: PayloadAction<{
        dragData: unknown;
        dragType: 'column' | 'method' | 'row' | 'variable';
      }>
    ) => {
      state.dragState.isDragging = true;
      state.dragState.dragType = action.payload.dragType;
      state.dragState.dragData = action.payload.dragData;
    },

    toggleBoundingBoxes: state => {
      state.ui.showBoundingBoxes = !state.ui.showBoundingBoxes;
    },

    toggleGridLines: state => {
      state.ui.showGridLines = !state.ui.showGridLines;
    },

    togglePreviewMode: state => {
      state.ui.isPreviewMode = !state.ui.isPreviewMode;
    },

    /** 撤销 */
    undo: state => {
      if (state.document && state.history.past.length > 0) {
        const previousEntry = state.history.past[state.history.past.length - 1];
        const currentEntry: IHistoryEntry = {
          action: 'Current',
          snapshot: deepClone(state.document),
          timestamp: Date.now()
        };
        state.document = previousEntry.snapshot;
        state.history.past = state.history.past.slice(0, -1);
        state.history.future = [currentEntry, ...state.history.future];
      }
    },

    /** 更新分析分组 */
    updateAnalysisGrouping: (state, action: PayloadAction<{ id: string; updates: Partial<IAnalysisGrouping> }>) => {
      if (state.document) {
        const idx = state.document.analysisGroupings.findIndex(g => g.id === action.payload.id);
        if (idx !== -1) {
          state.document.analysisGroupings[idx] = {
            ...state.document.analysisGroupings[idx],
            ...action.payload.updates
          };
          // 同步更新列头显示
          if (action.payload.updates.name) {
            state.document.displays.forEach(display => {
              const colHeader = display.displaySections.find(s => s.type === 'ColumnHeader');
              if (colHeader && 'cells' in colHeader.content) {
                const cell = colHeader.content.cells.find(c => c.groupingId === action.payload.id);
                if (cell) {
                  cell.text = action.payload.updates.name!;
                }
              }
            });
          }
        }
      }
    },

    /** 更新数据单元格 */
    updateBodyCell: (
      state,
      action: PayloadAction<{
        cellId: string;
        displayId: string;
        rowId: string;
        updates: Partial<IBodyCell>;
      }>
    ) => {
      if (state.document) {
        const display = state.document.displays.find(d => d.id === action.payload.displayId);
        if (display) {
          const bodySection = display.displaySections.find(s => s.type === 'Body');
          if (bodySection && 'rows' in bodySection.content) {
            const updateCell = (rows: IBodyRow[]): boolean => {
              for (const row of rows) {
                if (row.id === action.payload.rowId) {
                  const idx = row.cells.findIndex(c => c.id === action.payload.cellId);
                  if (idx !== -1) {
                    row.cells[idx] = { ...row.cells[idx], ...action.payload.updates };
                  }
                  return true;
                }
                if (row.children && updateCell(row.children)) return true;
              }
              return false;
            };
            updateCell(bodySection.content.rows);
          }
        }
      }
    },

    /** 更新数据行 */
    updateBodyRow: (
      state,
      action: PayloadAction<{
        displayId: string;
        rowId: string;
        updates: Partial<IBodyRow>;
      }>
    ) => {
      if (state.document) {
        const display = state.document.displays.find(d => d.id === action.payload.displayId);
        if (display) {
          const bodySection = display.displaySections.find(s => s.type === 'Body');
          if (bodySection && 'rows' in bodySection.content) {
            const updateRow = (rows: IBodyRow[]): boolean => {
              for (let i = 0; i < rows.length; i++) {
                if (rows[i].id === action.payload.rowId) {
                  rows[i] = { ...rows[i], ...action.payload.updates };
                  return true;
                }
                if (rows[i].children && updateRow(rows[i].children!)) return true;
              }
              return false;
            };
            updateRow(bodySection.content.rows);
          }
        }
      }
    },

    /** 更新显示 */
    updateDisplay: (state, action: PayloadAction<{ id: string; updates: Partial<IDisplay> }>) => {
      if (state.document) {
        const idx = state.document.displays.findIndex(d => d.id === action.payload.id);
        if (idx !== -1) {
          state.document.displays[idx] = { ...state.document.displays[idx], ...action.payload.updates };
        }
      }
    },

    // ==================== 显示区块操作 ====================

    /** 更新显示区块 */
    updateDisplaySection: (
      state,
      action: PayloadAction<{ displayId: string; sectionId: string; updates: Partial<IDisplaySection> }>
    ) => {
      if (state.document) {
        const display = state.document.displays.find(d => d.id === action.payload.displayId);
        if (display) {
          const idx = display.displaySections.findIndex(s => s.id === action.payload.sectionId);
          if (idx !== -1) {
            display.displaySections[idx] = { ...display.displaySections[idx], ...action.payload.updates };
          }
        }
      }
    },

    /** 更新方法 */
    updateMethod: (state, action: PayloadAction<{ id: string; updates: Partial<IMethod> }>) => {
      if (state.document) {
        const idx = state.document.methods.findIndex(m => m.id === action.payload.id);
        if (idx !== -1) {
          state.document.methods[idx] = { ...state.document.methods[idx], ...action.payload.updates };
        }
      }
    },

    /** 更新输出 */
    updateOutput: (state, action: PayloadAction<{ id: string; updates: Partial<IOutput> }>) => {
      if (state.document) {
        const idx = state.document.outputs.findIndex(o => o.id === action.payload.id);
        if (idx !== -1) {
          state.document.outputs[idx] = { ...state.document.outputs[idx], ...action.payload.updates };
        }
      }
    },

    /** 更新标题 */
    updateTitle: (
      state,
      action: PayloadAction<{ alignment?: 'center' | 'left' | 'right'; displayId: string; text: string }>
    ) => {
      if (state.document) {
        const display = state.document.displays.find(d => d.id === action.payload.displayId);
        if (display) {
          const titleSection = display.displaySections.find(s => s.type === 'Title');
          if (titleSection && 'text' in titleSection.content) {
            titleSection.content.text = action.payload.text;
            if (action.payload.alignment) {
              titleSection.content.alignment = action.payload.alignment;
            }
          }
        }
      }
    }
  }
});

// ==================== Selectors ====================

export const selectDocument = (state: { tflBuilder: ITflBuilderState }) => state.tflBuilder.document;
export const selectSelectedElement = (state: { tflBuilder: ITflBuilderState }) => state.tflBuilder.selectedElement;
export const selectDragState = (state: { tflBuilder: ITflBuilderState }) => state.tflBuilder.dragState;
export const selectUI = (state: { tflBuilder: ITflBuilderState }) => state.tflBuilder.ui;
export const selectCanUndo = (state: { tflBuilder: ITflBuilderState }) => state.tflBuilder.history.past.length > 0;
export const selectCanRedo = (state: { tflBuilder: ITflBuilderState }) => state.tflBuilder.history.future.length > 0;
export const selectActiveDisplay = (state: { tflBuilder: ITflBuilderState }) => {
  const doc = state.tflBuilder.document;
  const activeId = state.tflBuilder.ui.activeDisplayId;
  return doc?.displays.find(d => d.id === activeId) || null;
};
export const selectOutputs = (state: { tflBuilder: ITflBuilderState }) => state.tflBuilder.document?.outputs || [];
export const selectGroupings = (state: { tflBuilder: ITflBuilderState }) =>
  state.tflBuilder.document?.analysisGroupings || [];
export const selectMethods = (state: { tflBuilder: ITflBuilderState }) => state.tflBuilder.document?.methods || [];

// ==================== Actions ====================

export const {
  addAnalysisGrouping,
  addBodyRow,
  addDisplay,
  addFootnote,
  addMethod,
  addOutput,
  clearSelection,
  deleteAnalysisGrouping,
  deleteBodyRow,
  deleteDisplay,
  deleteMethod,
  deleteOutput,
  endDrag,
  initDocument,
  loadDocument,
  redo,
  reorderAnalysisGroupings,
  reorderBodyRows,
  reorderOutputs,
  reset,
  resetDocument,
  saveToHistory,
  selectElement,
  setActiveDisplay,
  setLeftPanelTab,
  setLeftPanelWidth,
  setOutputFilter,
  setRightPanelWidth,
  setSearchKeyword,
  setZoomLevel,
  startDrag,
  toggleBoundingBoxes,
  toggleGridLines,
  togglePreviewMode,
  undo,
  updateAnalysisGrouping,
  updateBodyCell,
  updateBodyRow,
  updateDisplay,
  updateDisplaySection,
  updateMethod,
  updateOutput,
  updateTitle
} = tflBuilderSlice.actions;

// ==================== useTflBuilderStore Hook ====================

/** TFL Builder 状态管理 Hook */
export function useTflBuilderStore() {
  const dispatch = useAppDispatch();

  // State selectors
  const document = useAppSelector(selectDocument);
  const selectedElement = useAppSelector(selectSelectedElement);
  const dragState = useAppSelector(selectDragState);
  const ui = useAppSelector(selectUI);
  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);
  const activeDisplay = useAppSelector(selectActiveDisplay);
  const outputs = useAppSelector(selectOutputs);
  const groupings = useAppSelector(selectGroupings);
  const methods = useAppSelector(selectMethods);

  // Memoized actions
  const actions = useMemo(
    () => ({
      // Groupings
      addAnalysisGrouping: (grouping: Omit<IAnalysisGrouping, 'id'>) => dispatch(addAnalysisGrouping(grouping)),
      // Body Rows
      addBodyRow: (displayId: string, row: Omit<IBodyRow, 'cells' | 'id'>, parentId?: string, insertIndex?: number) =>
        dispatch(addBodyRow({ displayId, insertIndex, parentId, row })),
      addFootnote: (displayId: string, text: string) => dispatch(addFootnote({ displayId, text })),

      // Methods
      addMethod: (method: Omit<IMethod, 'id'>) => dispatch(addMethod(method)),
      // Outputs
      addOutput: (output: Omit<IOutput, 'id'>) => dispatch(addOutput(output)),
      clearSelection: () => dispatch(clearSelection()),
      deleteAnalysisGrouping: (id: string) => dispatch(deleteAnalysisGrouping(id)),

      deleteBodyRow: (displayId: string, rowId: string) => dispatch(deleteBodyRow({ displayId, rowId })),
      deleteDisplay: (id: string) => dispatch(deleteDisplay(id)),
      deleteMethod: (id: string) => dispatch(deleteMethod(id)),

      deleteOutput: (id: string) => dispatch(deleteOutput(id)),
      endDrag: () => dispatch(endDrag()),

      // Document
      initDocument: (studyId: string, analysisId: string) => dispatch(initDocument({ analysisId, studyId })),
      loadDocument: (doc: IARSDocument) => dispatch(loadDocument(doc)),
      redo: () => dispatch(redo()),
      reorderAnalysisGroupings: (fromIndex: number, toIndex: number) =>
        dispatch(reorderAnalysisGroupings({ fromIndex, toIndex })),

      reorderBodyRows: (displayId: string, fromIndex: number, toIndex: number, parentId?: string) =>
        dispatch(reorderBodyRows({ displayId, fromIndex, parentId, toIndex })),
      reorderOutputs: (fromIndex: number, toIndex: number) => dispatch(reorderOutputs({ fromIndex, toIndex })),
      // Reset
      reset: () => dispatch(reset()),

      resetDocument: () => dispatch(resetDocument()),
      // History
      saveToHistory: (action: string) => dispatch(saveToHistory(action)),
      // Selection
      selectElement: (element: ISelectedElement) => dispatch(selectElement(element)),
      // Displays
      setActiveDisplay: (id: string | null) => dispatch(setActiveDisplay(id)),
      setLeftPanelTab: (tab: 'groupings' | 'methods' | 'outputs') => dispatch(setLeftPanelTab(tab)),

      // UI
      setLeftPanelWidth: (width: number) => dispatch(setLeftPanelWidth(width)),
      setOutputFilter: (filter: 'all' | 'figures' | 'listings' | 'tables') => dispatch(setOutputFilter(filter)),

      setRightPanelWidth: (width: number) => dispatch(setRightPanelWidth(width)),
      setSearchKeyword: (keyword: string) => dispatch(setSearchKeyword(keyword)),

      setZoomLevel: (level: number) => dispatch(setZoomLevel(level)),
      // Drag
      startDrag: (dragType: 'column' | 'method' | 'row' | 'variable', dragData: unknown) =>
        dispatch(startDrag({ dragData, dragType })),
      toggleBoundingBoxes: () => dispatch(toggleBoundingBoxes()),

      toggleGridLines: () => dispatch(toggleGridLines()),
      togglePreviewMode: () => dispatch(togglePreviewMode()),
      undo: () => dispatch(undo()),
      updateAnalysisGrouping: (id: string, updates: Partial<IAnalysisGrouping>) =>
        dispatch(updateAnalysisGrouping({ id, updates })),
      updateBodyCell: (displayId: string, rowId: string, cellId: string, updates: Partial<IBodyCell>) =>
        dispatch(updateBodyCell({ cellId, displayId, rowId, updates })),
      updateBodyRow: (displayId: string, rowId: string, updates: Partial<IBodyRow>) =>
        dispatch(updateBodyRow({ displayId, rowId, updates })),
      updateDisplay: (id: string, updates: Partial<IDisplay>) => dispatch(updateDisplay({ id, updates })),
      updateMethod: (id: string, updates: Partial<IMethod>) => dispatch(updateMethod({ id, updates })),
      updateOutput: (id: string, updates: Partial<IOutput>) => dispatch(updateOutput({ id, updates })),

      // Sections
      updateTitle: (displayId: string, text: string, alignment?: 'center' | 'left' | 'right') =>
        dispatch(updateTitle({ alignment, displayId, text }))
    }),
    [dispatch]
  );

  return {
    activeDisplay,
    canRedo,
    canUndo,
    // State
    document,
    dragState,
    groupings,
    methods,
    outputs,
    selectedElement,
    ui,
    // Actions
    ...actions
  };
}

// ==================== ARS 序列化 Helper ====================

/** 将当前状态序列化为 ARS JSON */
export const serializeToARS = (state: ITflBuilderState): IARSDocument | null => {
  if (!state.document) return null;
  return deepClone(state.document);
};

/** 从 ARS JSON 导入状态 */
export const deserializeFromARS = (arsJson: IARSDocument): IARSDocument => {
  return deepClone(arsJson);
};

// ==================== Export ====================

export { tflBuilderSlice };
export type { IEditorUIState, ITflBuilderState };
export default tflBuilderSlice.reducer;
