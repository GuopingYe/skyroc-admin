/**
 * Pipeline Actions Hook
 *
 * Provides high-level action handlers that integrate with the pipeline store.
 * These handlers wrap store actions with additional logic like message notifications.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { usePipelineStore } from '../stores';
import type { NodeType, PipelineNode, StudyNode } from '../mockData';
import type { IProjectMilestone } from '../types';
import { getPipelineMilestones, getPipelineStudyConfig, getPipelineTree } from '@/service/api/mdr';

export interface UsePipelineActionsReturn {
  // Data loading actions
  loadTree: () => Promise<void>;
  loadMilestones: (studyId: string, analysisId?: string) => Promise<void>;
  loadStudyConfig: (studyId: string) => Promise<void>;

  // Node actions
  createNode: (
    nodeType: NodeType,
    parentId: string | null,
    data: { title: string; phase?: string; protocolTitle?: string; description?: string }
  ) => string;
  updateNode: (nodeId: string, updates: Partial<PipelineNode>) => void;
  deleteNode: (nodeId: string) => void;
  archiveNode: (nodeId: string) => void;
  restoreNode: (nodeId: string) => void;

  // Milestone actions
  createMilestone: (
    data: Omit<IProjectMilestone, 'id' | 'createdAt' | 'updatedAt'>
  ) => string;
  updateMilestone: (milestoneId: string, updates: Partial<IProjectMilestone>) => void;
  deleteMilestone: (milestoneId: string) => void;

  // Study config actions
  updateStudyConfig: (studyId: string, config: Partial<{
    adamIgVersion: string;
    adamModelVersion: string;
    meddraVersion: string;
    phase: string;
    protocolTitle: string;
    sdtmIgVersion: string;
    sdtmModelVersion: string;
    whodrugVersion: string;
  }>) => void;

  // UI actions
  selectNode: (nodeId: string | null) => void;
  setActiveTab: (tab: string) => void;

  // History actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Change management
  discardChanges: () => void;
  isDirty: boolean;
  pendingChangesCount: number;
}

export function usePipelineActions(): UsePipelineActionsReturn {
  const { t } = useTranslation();

  const store = usePipelineStore();

  // ==================== Data Loading ====================

  const loadTree = useCallback(async () => {
    store.setTreeLoading(true);
    store.setTreeError(null);

    try {
      const data = await getPipelineTree();
      if (data) {
        store.setTreeData(data as PipelineNode[]);
      }
    } catch (error) {
      console.error('Failed to load pipeline tree:', error);
      store.setTreeError('Failed to load pipeline tree');
    }
  }, [store]);

  const loadMilestones = useCallback(async (studyId: string, analysisId?: string) => {
    store.setMilestonesLoading(true);

    try {
      const data = await getPipelineMilestones(studyId, analysisId);
      if (data) {
        // Map snake_case from API to camelCase for frontend types
        const mapped: IProjectMilestone[] = (data as any[]).map((m: any) => ({
          actualDate: m.actual_date,
          analysisId: m.analysis_id,
          assignee: m.assignee,
          comment: m.comment,
          createdAt: m.created_at,
          id: m.id,
          level: m.level,
          name: m.name,
          plannedDate: m.planned_date,
          presetType: m.preset_type,
          status: m.status,
          studyId: m.study_id,
          updatedAt: m.updated_at
        }));
        store.setMilestones(mapped);
      }
    } catch (error) {
      console.error('Failed to load milestones:', error);
    }
  }, [store]);

  const loadStudyConfig = useCallback(async (studyId: string) => {
    try {
      const data = await getPipelineStudyConfig(studyId);
      if (data) {
        store.setStudyConfig({
          studyId,
          phase: (data as any).phase,
          protocolTitle: (data as any).protocol_title,
          sdtmModelVersion: (data as any).sdtm_model_version,
          sdtmIgVersion: (data as any).sdtm_ig_version,
          adamModelVersion: (data as any).adam_model_version,
          adamIgVersion: (data as any).adam_ig_version,
          meddraVersion: (data as any).meddra_version,
          whodrugVersion: (data as any).whodrug_version
        });
      }
    } catch (error) {
      console.error('Failed to load study config:', error);
    }
  }, [store]);

  // ==================== Node Actions ====================

  const createNode = useCallback((
    nodeType: NodeType,
    parentId: string | null,
    data: { title: string; phase?: string; protocolTitle?: string; description?: string }
  ) => {
    const now = new Date().toISOString();
    const id = store.createNode({
      nodeType,
      lifecycleStatus: 'Draft' as const,
      status: 'Active' as const,
      createdAt: now,
      updatedAt: now,
      ...data
    } as Omit<PipelineNode, 'id'>);

    return id;
  }, [store]);

  const updateNode = useCallback((nodeId: string, updates: Partial<PipelineNode>) => {
    store.updateNode(nodeId, updates);
  }, [store]);

  const deleteNode = useCallback((nodeId: string) => {
    store.deleteNode(nodeId);
  }, [store]);

  const archiveNode = useCallback((nodeId: string) => {
    store.updateNode(nodeId, { status: 'Archived' });
  }, [store]);

  const restoreNode = useCallback((nodeId: string) => {
    store.updateNode(nodeId, { status: 'Active' });
  }, [store]);

  // ==================== Milestone Actions ====================

  const createMilestone = useCallback((
    data: Omit<IProjectMilestone, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    return store.createMilestone(data);
  }, [store]);

  const updateMilestone = useCallback((milestoneId: string, updates: Partial<IProjectMilestone>) => {
    store.updateMilestone(milestoneId, updates);
  }, [store]);

  const deleteMilestone = useCallback((milestoneId: string) => {
    store.deleteMilestone(milestoneId);
  }, [store]);

  // ==================== Study Config Actions ====================

  const updateStudyConfig = useCallback((studyId: string, config: Partial<{
    adamIgVersion: string;
    adamModelVersion: string;
    meddraVersion: string;
    phase: string;
    protocolTitle: string;
    sdtmIgVersion: string;
    sdtmModelVersion: string;
    whodrugVersion: string;
  }>) => {
    store.updateStudyConfig({
      studyId,
      ...config
    });
  }, [store]);

  // ==================== UI Actions ====================

  const selectNode = useCallback((nodeId: string | null) => {
    store.setSelectedNodeId(nodeId);
  }, [store]);

  const setActiveTab = useCallback((tab: string) => {
    store.setActiveTab(tab);
  }, [store]);

  // ==================== History Actions ====================

  const undo = useCallback(() => {
    store.undo();
  }, [store]);

  const redo = useCallback(() => {
    store.redo();
  }, [store]);

  const canUndo = useCallback(() => {
    return store.canUndo();
  }, [store]);

  const canRedo = useCallback(() => {
    return store.canRedo();
  }, [store]);

  // ==================== Change Management ====================

  const discardChanges = useCallback(() => {
    store.discardChanges();
  }, [store]);

  return {
    loadTree,
    loadMilestones,
    loadStudyConfig,
    createNode,
    updateNode,
    deleteNode,
    archiveNode,
    restoreNode,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    updateStudyConfig,
    selectNode,
    setActiveTab,
    undo,
    redo,
    canUndo,
    canRedo,
    discardChanges,
    isDirty: store.ui.isDirty,
    pendingChangesCount: store.getPendingChangesCount()
  };
}