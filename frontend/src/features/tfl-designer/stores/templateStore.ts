/**
 * TFL Designer - Template Library Store (Zustand + Immer)
 *
 * Manages built-in + user-created TFL templates. Independent of study context — accessible from Template Library page.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { allTemplates as builtInTemplates } from '../data/templates';
import type { Template } from '../types';
import { generateId } from '../types';

interface TemplateState {
  // CRUD
  addTemplate: (t: Omit<Template, 'createdAt' | 'id'>) => void;
  deleteTemplate: (id: string) => void;

  duplicateTemplate: (id: string) => void;
  // Init from built-in
  initTemplates: () => void;
  selectedTemplate: Template | null;
  // Selection
  selectTemplate: (t: Template | null) => void;

  templates: Template[];

  updateTemplate: (id: string, updates: Partial<Template>) => void;
}

export const useTemplateStore = create<TemplateState>()(
  immer((set, get) => ({
    addTemplate: t =>
      set(state => {
        state.templates.push({
          ...t,
          createdAt: new Date().toISOString().split('T')[0],
          id: generateId('tpl')
        });
      }),
    deleteTemplate: id =>
      set(state => {
        state.templates = state.templates.filter(t => t.id !== id);
        if (state.selectedTemplate?.id === id) {
          state.selectedTemplate = null;
        }
      }),

    duplicateTemplate: id =>
      set(state => {
        const source = state.templates.find(t => t.id === id);
        if (!source) return;
        state.templates.push({
          ...structuredClone(source),
          createdAt: new Date().toISOString().split('T')[0],
          id: generateId('tpl'),
          name: `${source.name} (Copy)`
        });
      }),

    initTemplates: () => {
      if (get().templates.length > 0) return;
      set(state => {
        state.templates = builtInTemplates.map(t => ({
          ...t,
          scopeLevel: t.scopeLevel ?? 'global'
        }));
      });
    },

    selectedTemplate: null,

    selectTemplate: t =>
      set(state => {
        state.selectedTemplate = t;
      }),

    templates: [],

    updateTemplate: (id, updates) =>
      set(state => {
        const index = state.templates.findIndex(t => t.id === id);
        if (index !== -1) {
          Object.assign(state.templates[index], updates);
        }
      })
  }))
);
