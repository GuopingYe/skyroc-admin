/**
 * Batch Save Utility for Pipeline Management
 *
 * Orchestrates saving all pending changes to the backend.
 * Handles create, update, and delete operations for nodes, milestones, and study config.
 */
import {
  archivePipelineNode,
  createPipelineMilestone,
  createPipelineNode,
  deletePipelineMilestone,
  updatePipelineMilestone,
  updatePipelineStudyConfig
} from '@/service/api/mdr';

import type { ChangeRecord, StudyConfigState } from '../stores';
import type { IProjectMilestone, MilestoneLevel, MilestoneStatus, PresetMilestoneType } from '../types';
import type { NodeType, PipelineNode } from '../mockData';

/** API result for a single change */
export interface BatchSaveResult {
  changeId: string;
  success: boolean;
  error?: string;
  data?: unknown;
}

/** Overall batch save result */
export interface BatchSaveResponse {
  success: boolean;
  results: BatchSaveResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

/**
 * Execute a batch save of all pending changes
 *
 * @param changes - Map of pending changes to save
 * @returns Promise with batch save results
 */
export async function executeBatchSave(changes: Map<string, ChangeRecord>): Promise<BatchSaveResponse> {
  const results: BatchSaveResult[] = [];
  let succeeded = 0;
  let failed = 0;

  // Group changes by type and entity for ordered execution
  const nodeCreates: ChangeRecord[] = [];
  const nodeUpdates: ChangeRecord[] = [];
  const nodeDeletes: ChangeRecord[] = [];
  const milestoneCreates: ChangeRecord[] = [];
  const milestoneUpdates: ChangeRecord[] = [];
  const milestoneDeletes: ChangeRecord[] = [];
  const studyConfigUpdates: ChangeRecord[] = [];

  changes.forEach((change) => {
    if (change.entityType === 'node') {
      if (change.type === 'create') nodeCreates.push(change);
      else if (change.type === 'update') nodeUpdates.push(change);
      else if (change.type === 'delete') nodeDeletes.push(change);
    } else if (change.entityType === 'milestone') {
      if (change.type === 'create') milestoneCreates.push(change);
      else if (change.type === 'update') milestoneUpdates.push(change);
      else if (change.type === 'delete') milestoneDeletes.push(change);
    } else if (change.entityType === 'studyConfig') {
      studyConfigUpdates.push(change);
    }
  });

  // Execute in order: creates first (parent nodes before children),
  // then updates, then deletes (reverse order - children before parents)

  // 1. Node creates (sorted by hierarchy level - parents first)
  const sortedNodeCreates = sortByHierarchyLevel(nodeCreates);
  for (const change of sortedNodeCreates) {
    try {
      const node = change.newState as PipelineNode;
      const result = await createPipelineNode({
        title: node.title,
        node_type: node.nodeType,
        parent_id: change.parentId || undefined,
        phase: (node as any).phase,
        protocol_title: (node as any).protocolTitle,
        description: (node as any).description
      });

      results.push({
        changeId: change.id,
        success: true,
        data: result
      });
      succeeded++;
    } catch (error: any) {
      results.push({
        changeId: change.id,
        success: false,
        error: error?.message || 'Failed to create node'
      });
      failed++;
    }
  }

  // 2. Node updates
  for (const change of nodeUpdates) {
    try {
      const node = change.newState as PipelineNode;
      // For nodes, archive/restore is the main update operation
      if (change.previousState && (change.previousState as PipelineNode).status !== node.status) {
        await archivePipelineNode(node.id, node.status as 'Active' | 'Archived');
      }

      results.push({
        changeId: change.id,
        success: true
      });
      succeeded++;
    } catch (error: any) {
      results.push({
        changeId: change.id,
        success: false,
        error: error?.message || 'Failed to update node'
      });
      failed++;
    }
  }

  // 3. Milestone creates
  for (const change of milestoneCreates) {
    try {
      const milestone = change.newState as IProjectMilestone;
      await createPipelineMilestone({
        study_id: milestone.studyId,
        analysis_id: milestone.analysisId,
        name: milestone.name,
        level: milestone.level as MilestoneLevel,
        preset_type: milestone.presetType as PresetMilestoneType,
        status: milestone.status as MilestoneStatus,
        planned_date: milestone.plannedDate,
        actual_date: milestone.actualDate,
        assignee: milestone.assignee,
        comment: milestone.comment
      });

      results.push({
        changeId: change.id,
        success: true
      });
      succeeded++;
    } catch (error: any) {
      results.push({
        changeId: change.id,
        success: false,
        error: error?.message || 'Failed to create milestone'
      });
      failed++;
    }
  }

  // 4. Milestone updates
  for (const change of milestoneUpdates) {
    try {
      const milestone = change.newState as IProjectMilestone;
      await updatePipelineMilestone(milestone.id, {
        name: milestone.name,
        status: milestone.status as MilestoneStatus,
        planned_date: milestone.plannedDate,
        actual_date: milestone.actualDate,
        assignee: milestone.assignee,
        comment: milestone.comment
      });

      results.push({
        changeId: change.id,
        success: true
      });
      succeeded++;
    } catch (error: any) {
      results.push({
        changeId: change.id,
        success: false,
        error: error?.message || 'Failed to update milestone'
      });
      failed++;
    }
  }

  // 5. Milestone deletes
  for (const change of milestoneDeletes) {
    try {
      await deletePipelineMilestone(change.entityId);

      results.push({
        changeId: change.id,
        success: true
      });
      succeeded++;
    } catch (error: any) {
      results.push({
        changeId: change.id,
        success: false,
        error: error?.message || 'Failed to delete milestone'
      });
      failed++;
    }
  }

  // 6. Study config updates
  for (const change of studyConfigUpdates) {
    try {
      const config = change.newState as StudyConfigState;
      await updatePipelineStudyConfig(config.studyId, {
        phase: config.phase,
        protocol_title: config.protocolTitle,
        sdtm_model_version: config.sdtmModelVersion,
        sdtm_ig_version: config.sdtmIgVersion,
        adam_model_version: config.adamModelVersion,
        adam_ig_version: config.adamIgVersion,
        meddra_version: config.meddraVersion,
        whodrug_version: config.whodrugVersion
      });

      results.push({
        changeId: change.id,
        success: true
      });
      succeeded++;
    } catch (error: any) {
      results.push({
        changeId: change.id,
        success: false,
        error: error?.message || 'Failed to update study config'
      });
      failed++;
    }
  }

  // 7. Node deletes (reverse hierarchy - children before parents)
  const sortedNodeDeletes = sortByHierarchyLevel(nodeDeletes).reverse();
  for (const change of sortedNodeDeletes) {
    try {
      const node = change.previousState as PipelineNode;
      // Archive the node (soft delete)
      await archivePipelineNode(node.id, 'Archived');

      results.push({
        changeId: change.id,
        success: true
      });
      succeeded++;
    } catch (error: any) {
      results.push({
        changeId: change.id,
        success: false,
        error: error?.message || 'Failed to delete node'
      });
      failed++;
    }
  }

  return {
    success: failed === 0,
    results,
    summary: {
      total: changes.size,
      succeeded,
      failed
    }
  };
}

/**
 * Sort node changes by hierarchy level
 * TA (level 0) -> Compound (level 1) -> Study (level 2) -> Analysis (level 3)
 */
function sortByHierarchyLevel(changes: ChangeRecord[]): ChangeRecord[] {
  const hierarchyLevel = (node: PipelineNode | null | undefined): number => {
    if (!node) return 999;
    switch (node.nodeType) {
      case 'TA': return 0;
      case 'COMPOUND': return 1;
      case 'STUDY': return 2;
      case 'ANALYSIS': return 3;
      default: return 999;
    }
  };

  return [...changes].sort((a, b) => {
    const levelA = hierarchyLevel(a.newState as PipelineNode || a.previousState as PipelineNode);
    const levelB = hierarchyLevel(b.newState as PipelineNode || b.previousState as PipelineNode);
    return levelA - levelB;
  });
}

/**
 * Generate a human-readable summary of pending changes
 */
export function getChangesSummary(changes: Map<string, ChangeRecord>): {
  nodes: { created: number; updated: number; deleted: number };
  milestones: { created: number; updated: number; deleted: number };
  studyConfigs: number;
  total: number;
} {
  const result = {
    nodes: { created: 0, updated: 0, deleted: 0 },
    milestones: { created: 0, updated: 0, deleted: 0 },
    studyConfigs: 0,
    total: changes.size
  };

  changes.forEach((change) => {
    if (change.entityType === 'node') {
      if (change.type === 'create') result.nodes.created++;
      else if (change.type === 'update') result.nodes.updated++;
      else if (change.type === 'delete') result.nodes.deleted++;
    } else if (change.entityType === 'milestone') {
      if (change.type === 'create') result.milestones.created++;
      else if (change.type === 'update') result.milestones.updated++;
      else if (change.type === 'delete') result.milestones.deleted++;
    } else if (change.entityType === 'studyConfig') {
      result.studyConfigs++;
    }
  });

  return result;
}