/**
 * TFL Designer - Template Library Store (Zustand + Immer)
 *
 * Manages built-in + user-created TFL templates.
 * Independent of study context — accessible from Template Library page.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Template } from '../types';
import { generateId } from '../types';
import { allTemplates as builtInTemplates } from '../data/templates';

interface TemplateState {
  templates: Template[];
  selectedTemplate: Template | null;

  // CRUD
  addTemplate: (t: Omit<Template, 'id' | 'createdAt'>) => void;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => void;

  // Selection
  selectTemplate: (t: Template | null) => void;

  // Init from built-in
  initTemplates: () => void;
}

export const useTemplateStore = create<TemplateState>()(
  immer((set, get) => ({
    templates: [],
    selectedTemplate: null,

    addTemplate: (t) =>
      set((state) => {
        state.templates.push({
          ...t,
          id: generateId('tpl'),
          createdAt: new Date().toISOString().split('T')[0],
        });
      }),

    updateTemplate: (id, updates) =>
      set((state) => {
        const index = state.templates.findIndex((t) => t.id === id);
        if (index !== -1) {
          Object.assign(state.templates[index], updates);
        }
      }),

    deleteTemplate: (id) =>
      set((state) => {
        state.templates = state.templates.filter((t) => t.id !== id);
        if (state.selectedTemplate?.id === id) {
          state.selectedTemplate = null;
        }
      }),

    duplicateTemplate: (id) =>
      set((state) => {
        const source = state.templates.find((t) => t.id === id);
        if (!source) return;
        state.templates.push({
          ...JSON.parse(JSON.stringify(source)),
          id: generateId('tpl'),
          name: `${source.name} (Copy)`,
          createdAt: new Date().toISOString().split('T')[0],
        });
      }),

    selectTemplate: (t) =>
      set((state) => {
        state.selectedTemplate = t;
      }),

    initTemplates: () =>
      set((state) => {
        if (state.templates.length === 0) {
          state.templates = [...builtInTemplates];
        }
      }),
  }))
);
