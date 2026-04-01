/**
 * Pipeline Actions Hook
 *
 * Provides high-level action handlers that integrate with the pipeline store. These handlers wrap store actions with
 * additional logic like message notifications.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { getPipelineMilestones, getPipelineStudyConfig, getPipelineTree } from '@/service/api/mdr';

import type { NodeType, PipelineNode, StudyNode } from '../mockData';
import { usePipelineStore } from '../stores';
import type { IProjectMilestone } from '../types';

export interface UsePipelineActionsReturn {
  archiveNode: (nodeId: string) => void;
  canRedo: () => boolean;
  canUndo: () => boolean;

  // Milestone actions
  createMilestone: (data: Omit<IProjectMilestone, 'createdAt' | 'id' | 'updatedAt'>) => string;
  // Node actions
  createNode: (
    nodeType: NodeType,
    parentId: string | null,
    data: { description?: string; phase?: string; protocolTitle?: string; title: string }
  ) => string;
  deleteMilestone: (milestoneId: string) => void;
  deleteNode: (nodeId: string) => void;
  // Change management
  discardChanges: () => void;

  isDirty: boolean;
  loadMilestones: (studyId: string, analysisId?: string) => Promise<void>;
  loadStudyConfig: (studyId: string) => Promise<void>;

  // Data loading actions
  loadTree: () => Promise<void>;

  pendingChangesCount: number;
  redo: () => void;

  restoreNode: (nodeId: string) => void;
  // UI actions
  selectNode: (nodeId: string | null) => void;
  setActiveTab: (tab: string) => void;
  // History actions
  undo: () => void;

  updateMilestone: (milestoneId: string, updates: Partial<IProjectMilestone>) => void;
  updateNode: (nodeId: string, updates: Partial<PipelineNode>) => void;
  // Study config actions
  updateStudyConfig: (
    studyId: string,
    config: Partial<{
      adamIgVersion: string;
      adamModelVersion: string;
      meddraVersion: string;
      phase: string;
      protocolTitle: string;
      sdtmIgVersion: string;
      sdtmModelVersion: string;
      whodrugVersion: string;
    }>
  ) => void;
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

  const loadMilestones = useCallback(
    async (studyId: string, analysisId?: string) => {
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
    },
    [store]
  );

  const loadStudyConfig = useCallback(
    async (studyId: string) => {
      try {
        const data = await getPipelineStudyConfig(studyId);
        if (data) {
          store.setStudyConfig({
            adamIgVersion: (data as any).adam_ig_version,
            adamModelVersion: (data as any).adam_model_version,
            meddraVersion: (data as any).meddra_version,
            phase: (data as any).phase,
            protocolTitle: (data as any).protocol_title,
            sdtmIgVersion: (data as any).sdtm_ig_version,
            sdtmModelVersion: (data as any).sdtm_model_version,
            studyId,
            whodrugVersion: (data as any).whodrug_version
          });
        }
      } catch (error) {
        console.error('Failed to load study config:', error);
      }
    },
    [store]
  );

  // ==================== Node Actions ====================

  const createNode = useCallback(
    (
      nodeType: NodeType,
      parentId: string | null,
      data: { description?: string; phase?: string; protocolTitle?: string; title: string }
    ) => {
      const now = new Date().toISOString();
      const id = store.createNode({
        createdAt: now,
        lifecycleStatus: 'Draft' as const,
        nodeType,
        status: 'Active' as const,
        updatedAt: now,
        ...data
      } as Omit<PipelineNode, 'id'>);

      return id;
    },
    [store]
  );

  const updateNode = useCallback(
    (nodeId: string, updates: Partial<PipelineNode>) => {
      store.updateNode(nodeId, updates);
    },
    [store]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      store.deleteNode(nodeId);
    },
    [store]
  );

  const archiveNode = useCallback(
    (nodeId: string) => {
      store.updateNode(nodeId, { status: 'Archived' });
    },
    [store]
  );

  const restoreNode = useCallback(
    (nodeId: string) => {
      store.updateNode(nodeId, { status: 'Active' });
    },
    [store]
  );

  // ==================== Milestone Actions ====================

  const createMilestone = useCallback(
    (data: Omit<IProjectMilestone, 'createdAt' | 'id' | 'updatedAt'>) => {
      return store.createMilestone(data);
    },
    [store]
  );

  const updateMilestone = useCallback(
    (milestoneId: string, updates: Partial<IProjectMilestone>) => {
      store.updateMilestone(milestoneId, updates);
    },
    [store]
  );

  const deleteMilestone = useCallback(
    (milestoneId: string) => {
      store.deleteMilestone(milestoneId);
    },
    [store]
  );

  // ==================== Study Config Actions ====================

  const updateStudyConfig = useCallback(
    (
      studyId: string,
      config: Partial<{
        adamIgVersion: string;
        adamModelVersion: string;
        meddraVersion: string;
        phase: string;
        protocolTitle: string;
        sdtmIgVersion: string;
        sdtmModelVersion: string;
        whodrugVersion: string;
      }>
    ) => {
      store.updateStudyConfig({
        studyId,
        ...config
      });
    },
    [store]
  );

  // ==================== UI Actions ====================

  const selectNode = useCallback(
    (nodeId: string | null) => {
      store.setSelectedNodeId(nodeId);
    },
    [store]
  );

  const setActiveTab = useCallback(
    (tab: string) => {
      store.setActiveTab(tab);
    },
    [store]
  );

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
    archiveNode,
    canRedo,
    canUndo,
    createMilestone,
    createNode,
    deleteMilestone,
    deleteNode,
    discardChanges,
    isDirty: store.ui.isDirty,
    loadMilestones,
    loadStudyConfig,
    loadTree,
    pendingChangesCount: store.getPendingChangesCount(),
    redo,
    restoreNode,
    selectNode,
    setActiveTab,
    undo,
    updateMilestone,
    updateNode,
    updateStudyConfig
  };
}
