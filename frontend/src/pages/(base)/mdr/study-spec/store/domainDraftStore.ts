/**
 * Domain Draft Store
 *
 * Command-pattern Zustand store persisted to localStorage per specId.
 * All domain edits are staged here until the user saves.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ============================================================
// Types
// ============================================================

export type DraftStatus = 'added' | 'deleted' | 'modified' | 'unchanged';

export interface DomainDraft {
  _status: DraftStatus;
  class_type: string;
  comments: string;
  domain_label: string;
  domain_name: string;
  id: string;                            // stringified numeric ID from backend
  key_variables: string[];               // variable names selected from domain variable list
  /** 'global_library' = inherited (base_id set) → name/class_type locked */
  origin: 'custom' | 'global_library';
  sort_variables: string[];
  structure: string;
}

export type DomainCommand =
  | { payload: DomainDraft; type: 'ADD_DOMAIN' }
  | { payload: { id: string; snapshot: DomainDraft }; type: 'DELETE_DOMAIN' }
  | { payload: { after: DomainDraft; before: DomainDraft; id: string }; type: 'EDIT_DOMAIN' }
  | { payload: { id: string; snapshot: DomainDraft }; type: 'RESTORE_DOMAIN' };

export interface DomainDraftState {
  baseline: DomainDraft[];   // last saved/loaded state
  current: DomainDraft[];    // working state
  future: DomainCommand[];   // redo stack
  past: DomainCommand[];     // undo stack
  specId: string;
}

export interface DomainDraftActions {
  commitSave: () => void;
  dispatch: (cmd: DomainCommand) => void;
  initBaseline: (domains: DomainDraft[]) => void;
  redo: () => void;
  resetDraft: () => void;
  undo: () => void;
}

export type DomainDraftStore = DomainDraftActions & DomainDraftState;

// ============================================================
// Command application helpers
// ============================================================

function applyCommand(current: DomainDraft[], cmd: DomainCommand): DomainDraft[] {
  switch (cmd.type) {
    case 'ADD_DOMAIN':
      return [...current, { ...cmd.payload, _status: 'added' }];
    case 'DELETE_DOMAIN':
      return current.map(d =>
        d.id === cmd.payload.id ? { ...d, _status: 'deleted' } : d
      );
    case 'EDIT_DOMAIN':
      return current.map(d => (d.id === cmd.payload.id ? cmd.payload.after : d));
    case 'RESTORE_DOMAIN':
      return current.map(d => {
        if (d.id !== cmd.payload.id) return d;
        const restored = cmd.payload.snapshot;
        return { ...restored, _status: restored._status === 'added' ? 'added' : 'unchanged' };
      });
  }
}

function undoCommand(current: DomainDraft[], cmd: DomainCommand): DomainDraft[] {
  switch (cmd.type) {
    case 'ADD_DOMAIN':
      return current.filter(d => d.id !== cmd.payload.id);
    case 'DELETE_DOMAIN':
      return current.map(d => (d.id === cmd.payload.id ? cmd.payload.snapshot : d));
    case 'EDIT_DOMAIN':
      return current.map(d => (d.id === cmd.payload.id ? cmd.payload.before : d));
    case 'RESTORE_DOMAIN':
      return current.map(d =>
        d.id === cmd.payload.id ? { ...cmd.payload.snapshot, _status: 'deleted' } : d
      );
  }
}

// ============================================================
// Store factory (one store per specId, cached)
// ============================================================

function createDomainDraftStore(specId: string) {
  return create<DomainDraftStore>()(
    persist(
      (set, get) => ({
        // Initial state
        baseline: [],
        current: [],
        future: [],
        past: [],
        specId,

        // Load initial data from server (only if no existing draft)
        initBaseline: (domains: DomainDraft[]) => {
          const state = get();
          // If we have an existing draft (past commands), keep it
          if (state.past.length > 0 || state.current.some(d => d._status !== 'unchanged')) {
            return;
          }
          set({ baseline: domains, current: domains, future: [], past: [] });
        },

        dispatch: (cmd: DomainCommand) => {
          set(state => ({
            current: applyCommand(state.current, cmd),
            future: [],  // new action clears redo stack
            past: [...state.past, cmd],
          }));
        },

        undo: () => {
          set(state => {
            if (state.past.length === 0) return state;
            const last = state.past[state.past.length - 1];
            return {
              current: undoCommand(state.current, last),
              future: [last, ...state.future],
              past: state.past.slice(0, -1),
            };
          });
        },

        redo: () => {
          set(state => {
            if (state.future.length === 0) return state;
            const next = state.future[0];
            return {
              current: applyCommand(state.current, next),
              future: state.future.slice(1),
              past: [...state.past, next],
            };
          });
        },

        commitSave: () => {
          set(state => ({
            baseline: state.current.filter(d => d._status !== 'deleted'),
            current: state.current
              .filter(d => d._status !== 'deleted')
              .map(d => ({ ...d, _status: 'unchanged' as DraftStatus })),
            future: [],
            past: [],
          }));
        },

        resetDraft: () => {
          set(state => ({
            current: state.baseline,
            future: [],
            past: [],
          }));
        },
      }),
      {
        name: `domain-draft-${specId}`,
        storage: createJSONStorage(() => localStorage),
      }
    )
  );
}

// Cache: avoid recreating stores on every render
const storeCache = new Map<string, ReturnType<typeof createDomainDraftStore>>();

export function getDomainDraftStore(specId: string) {
  if (!storeCache.has(specId)) {
    storeCache.set(specId, createDomainDraftStore(specId));
  }
  return storeCache.get(specId)!;
}

// ============================================================
// Utility: convert backend dataset to DomainDraft
// ============================================================

export function datasetToDomainDraft(item: Api.StudySpec.StudyDatasetListItem): DomainDraft {
  return {
    _status: 'unchanged',
    class_type: item.class_type,
    comments: item.extra_attrs?.comments ?? '',
    domain_label: item.description ?? '',
    domain_name: item.dataset_name,
    id: String(item.id),
    key_variables: item.standard_metadata?.key_variables ?? [],
    origin: item.base_id ? 'global_library' : 'custom',
    sort_variables: item.standard_metadata?.sort_variables ?? [],
    structure: item.standard_metadata?.structure ?? '',
  };
}

// ============================================================
// Utility: compute pending changes for the save diff
// ============================================================

export interface DomainDiff {
  added: DomainDraft[];
  deleted: DomainDraft[];
  modified: Array<{ after: DomainDraft; before: DomainDraft; domain: DomainDraft }>;
}

export function computeDiff(baseline: DomainDraft[], current: DomainDraft[]): DomainDiff {
  const baselineMap = new Map(baseline.map(d => [d.id, d]));
  return {
    added: current.filter(d => d._status === 'added'),
    deleted: current.filter(d => d._status === 'deleted'),
    modified: current
      .filter(d => d._status === 'modified')
      .map(d => ({
        after: d,
        before: baselineMap.get(d.id) ?? d,
        domain: d,
      })),
  };
}

export function hasPendingChanges(current: DomainDraft[]): boolean {
  return current.some(d => d._status !== 'unchanged');
}

export function pendingChangeCount(current: DomainDraft[]): number {
  return current.filter(d => d._status !== 'unchanged').length;
}
