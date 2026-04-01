/**
 * Save Confirmation Hook
 *
 * Manages save confirmation modal state and batch save execution.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getPipelineMilestones, getPipelineStudyConfig, getPipelineTree } from '@/service/api/mdr';

import type { PipelineNode } from '../mockData';
import { type ChangeRecord, usePipelineStore } from '../stores';
import type { IProjectMilestone } from '../types';
import { type BatchSaveResponse, executeBatchSave, getChangesSummary } from '../utils/batchSave';

export interface UseSaveConfirmationReturn {
  // Change summary for UI
  changesSummary: ReturnType<typeof getChangesSummary> | null;
  closeSaveModal: () => void;
  // Save execution
  confirmSave: () => Promise<boolean>;

  discardAllChanges: () => void;
  // Modal state
  isModalOpen: boolean;

  // State during save
  isSaving: boolean;
  lastSaveResult: BatchSaveResponse | null;

  openSaveModal: () => void;
  pendingChanges: Map<string, ChangeRecord>;
}

export function useSaveConfirmation(): UseSaveConfirmationReturn {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveResult, setLastSaveResult] = useState<BatchSaveResponse | null>(null);

  const store = usePipelineStore();

  const openSaveModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeSaveModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const confirmSave = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);

    try {
      const changes = store.pendingChanges;
      const result = await executeBatchSave(changes);
      setLastSaveResult(result);

      if (result.success) {
        // Reload data from server to get consistent state
        const treeData = await getPipelineTree();
        if (treeData) {
          store.setTreeData(treeData as PipelineNode[]);
        }

        // Clear pending changes and history
        store.discardChanges();
        setIsModalOpen(false);
        return true;
      }
      // Some saves failed - keep modal open to show errors
      return false;
    } catch (error) {
      console.error('Save failed:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [store]);

  const discardAllChanges = useCallback(() => {
    store.discardChanges();
    setIsModalOpen(false);
    setLastSaveResult(null);
  }, [store]);

  const changesSummary = store.pendingChanges.size > 0 ? getChangesSummary(store.pendingChanges) : null;

  return {
    changesSummary,
    closeSaveModal,
    confirmSave,
    discardAllChanges,
    isModalOpen,
    isSaving,
    lastSaveResult,
    openSaveModal,
    pendingChanges: store.pendingChanges
  };
}

/**
 * Hook for beforeunload warning
 *
 * Shows a warning when user tries to leave with unsaved changes
 */
export function useBeforeUnloadWarning(isDirty: boolean): void {
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    },
    [isDirty]
  );

  useEffect(() => {
    if (isDirty) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, handleBeforeUnload]);
}

/** Hook for keyboard shortcuts (Ctrl+Z / Ctrl+Y) */
export function useKeyboardShortcuts(undo: () => void, redo: () => void, enabled: boolean = true): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const activeElement = document.activeElement as HTMLElement;
      if (
        activeElement &&
        (activeElement.contentEditable === 'true' ||
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }

      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }

      // Ctrl+Y or Cmd+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        redo();
      }
    },
    [undo, redo, enabled]
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}
