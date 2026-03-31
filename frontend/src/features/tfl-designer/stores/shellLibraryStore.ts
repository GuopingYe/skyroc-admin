/**
 * Shell Library Store (Zustand + Immer)
 *
 * Manages Global/TA level shell templates.
 * Replaces the deprecated templateStore.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ShellLibraryTemplate, ScopeLevel } from '../types';

type ScopeLevelFilter = 'all' | ScopeLevel;

interface ShellLibraryState {
  templates: ShellLibraryTemplate[];
  selectedTemplate: ShellLibraryTemplate | null;

  // Filters
  scopeLevelFilter: ScopeLevelFilter;
  searchQuery: string;

  // CRUD
  setTemplates: (templates: ShellLibraryTemplate[]) => void;
  addTemplate: (template: ShellLibraryTemplate) => void;
  updateTemplate: (id: number, updates: Partial<ShellLibraryTemplate>) => void;
  archiveTemplate: (id: number) => void;
  duplicateTemplate: (id: number) => void;

  // Selection
  selectTemplate: (template: ShellLibraryTemplate | null) => void;

  // Filters
  setScopeLevelFilter: (filter: ScopeLevelFilter) => void;
  setSearchQuery: (query: string) => void;

  // Computed
  getFilteredTemplates: () => ShellLibraryTemplate[];
}

export const useShellLibraryStore = create<ShellLibraryState>()(
  immer((set, get) => ({
    templates: [],
    selectedTemplate: null,
    scopeLevelFilter: 'all',
    searchQuery: '',

    setTemplates: (templates) =>
      set((state) => {
        state.templates = templates;
      }),

    addTemplate: (template) =>
      set((state) => {
        state.templates.push(template);
      }),

    updateTemplate: (id, updates) =>
      set((state) => {
        const index = state.templates.findIndex((t) => t.id === id);
        if (index !== -1) {
          Object.assign(state.templates[index], updates);
        }
      }),

    archiveTemplate: (id) =>
      set((state) => {
        const template = state.templates.find((t) => t.id === id);
        if (template) {
          template.isDeleted = true;
        }
        if (state.selectedTemplate?.id === id) {
          state.selectedTemplate = null;
        }
      }),

    duplicateTemplate: (id) =>
      set((state) => {
        const source = state.templates.find((t) => t.id === id);
        if (!source) return;

        const copy: ShellLibraryTemplate = {
          ...JSON.parse(JSON.stringify(source)),
          id: Date.now(), // Temporary ID, will be replaced by backend
          templateName: `${source.templateName} (Copy)`,
          version: 1,
          createdBy: 'duplicate',
          createdAt: new Date().toISOString().split('T')[0],
        };

        state.templates.push(copy);
      }),

    selectTemplate: (template) =>
      set((state) => {
        state.selectedTemplate = template;
      }),

    setScopeLevelFilter: (filter) =>
      set((state) => {
        state.scopeLevelFilter = filter;
      }),

    setSearchQuery: (query) =>
      set((state) => {
        state.searchQuery = query;
      }),

    getFilteredTemplates: () => {
      const state = get();
      let result = state.templates.filter((t) => !t.isDeleted);

      if (state.scopeLevelFilter !== 'all') {
        result = result.filter((t) => t.scopeLevel === state.scopeLevelFilter);
      }

      if (state.searchQuery.trim()) {
        const q = state.searchQuery.toLowerCase();
        result = result.filter(
          (t) =>
            t.templateName.toLowerCase().includes(q) ||
            t.description?.toLowerCase().includes(q)
        );
      }

      return result;
    },
  }))
);