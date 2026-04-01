/**
 * TFL Designer - Template Editor Store (Zustand + Immer)
 *
 * Manages the editing state for a template in the Template Library page.
 * Provides store-level undo/redo and dirty tracking, independent of the
 * InteractiveOutputEditor's component-level undo/redo.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { Template } from '../types';

const MAX_UNDO = 50;

function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

function markDirty(state: TemplateEditorState): void {
  // Any edit makes the document dirty; only commit/cancel/startEditing resets it
  state.isDirty = true;
}

function pushUndo(state: TemplateEditorState): void {
  if (!state.editingTemplate) return;
  state.undoStack.push(deepClone(state.editingTemplate));
  if (state.undoStack.length > MAX_UNDO) {
    state.undoStack.shift();
  }
  state.redoStack = [];
  state.canUndo = true;
  state.canRedo = false;
}

export interface TemplateEditorState {
  canRedo: boolean;
  canUndo: boolean;
  baselineTemplate: Template | null;
  cancelEditing: () => void;
  clearEditing: () => void;
  commitEditing: () => Template | null;
  editingTemplate: Template | null;
  isDirty: boolean;
  redo: () => void;
  redoStack: Template[];
  setEditingTemplate: (template: Template) => void;
  startEditing: (template: Template) => void;
  undo: () => void;
  undoStack: Template[];
  updateEditing: (updates: Partial<Template>) => void;
  updateShell: (shellUpdates: Partial<Template['shell']>) => void;
}

export const useTemplateEditorStore = create<TemplateEditorState>()(
  immer((set, get) => ({
    canRedo: false,
    canUndo: false,
    baselineTemplate: null,
    cancelEditing: () =>
      set(state => {
        if (state.baselineTemplate) {
          state.editingTemplate = deepClone(state.baselineTemplate);
        }
        state.isDirty = false;
        state.undoStack = [];
        state.redoStack = [];
        state.canUndo = false;
        state.canRedo = false;
      }),
    clearEditing: () =>
      set(state => {
        state.editingTemplate = null;
        state.baselineTemplate = null;
        state.isDirty = false;
        state.undoStack = [];
        state.redoStack = [];
        state.canUndo = false;
        state.canRedo = false;
      }),
    commitEditing: () => {
      const { editingTemplate } = get();
      if (!editingTemplate) return null;
      const result = deepClone(editingTemplate);
      set(state => {
        state.baselineTemplate = deepClone(editingTemplate);
        state.isDirty = false;
        state.undoStack = [];
        state.redoStack = [];
        state.canUndo = false;
        state.canRedo = false;
      });
      return result;
    },
    editingTemplate: null,
    isDirty: false,
    redo: () =>
      set(state => {
        if (state.redoStack.length === 0 || !state.editingTemplate) return;
        state.undoStack.push(deepClone(state.editingTemplate));
        const next = state.redoStack.pop()!;
        state.editingTemplate = next;
        state.canUndo = true;
        state.canRedo = state.redoStack.length > 0;
        markDirty(state);
      }),
    redoStack: [],
    setEditingTemplate: template =>
      set(state => {
        if (!state.editingTemplate) return;
        pushUndo(state);
        state.editingTemplate = deepClone(template);
        markDirty(state);
      }),
    startEditing: template =>
      set(state => {
        const clone = deepClone(template);
        state.editingTemplate = clone;
        state.baselineTemplate = deepClone(template);
        state.isDirty = false;
        state.undoStack = [];
        state.redoStack = [];
        state.canUndo = false;
        state.canRedo = false;
      }),
    undo: () =>
      set(state => {
        if (state.undoStack.length === 0 || !state.editingTemplate) return;
        state.redoStack.push(deepClone(state.editingTemplate));
        const prev = state.undoStack.pop()!;
        state.editingTemplate = prev;
        state.canRedo = true;
        state.canUndo = state.undoStack.length > 0;
        markDirty(state);
      }),
    undoStack: [],
    updateEditing: updates =>
      set(state => {
        if (!state.editingTemplate) return;
        pushUndo(state);
        Object.assign(state.editingTemplate, updates);
        markDirty(state);
      }),
    updateShell: shellUpdates =>
      set(state => {
        if (!state.editingTemplate) return;
        pushUndo(state);
        Object.assign(state.editingTemplate.shell, shellUpdates);
        markDirty(state);
      })
  }))
);
