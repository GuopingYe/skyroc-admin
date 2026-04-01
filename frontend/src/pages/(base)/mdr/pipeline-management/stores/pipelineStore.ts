/**
 * Pipeline Management Store (Zustand + Immer)
 *
 * Manages pipeline tree, milestones, and study config with:
 *
 * - Delayed save (pending changes tracking)
 * - Undo/redo support
 * - Committed vs working state separation
 */
import { enableMapSet } from 'immer';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { AnalysisNode, NodeLifecycleStatus, NodeStatus, NodeType, PipelineNode, StudyNode } from '../mockData';
import type { IProjectMilestone } from '../types';

// Enable Map/Set support in Immer (required for pendingChanges Map)
enableMapSet();

// ==================== Utility ====================

/** Generate a unique ID with an optional prefix */
const generateId = (prefix: string = 'id'): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// ==================== Types ====================

/** Change record for tracking pending operations */
export interface ChangeRecord {
  entityId: string;
  entityType: 'milestone' | 'node' | 'studyConfig';
  id: string;
  newState?: PipelineNode | IProjectMilestone | StudyConfigState | null;
  /** For create operations, the parent node ID */
  parentId?: string | null;
  previousState?: PipelineNode | IProjectMilestone | StudyConfigState | null;
  timestamp: number;
  type: 'create' | 'delete' | 'update';
}

/** History entry for undo/redo */
export interface HistoryEntry {
  actionLabel: string;
  snapshot: WorkingState;
  timestamp: number;
}

/** Study configuration state */
export interface StudyConfigState {
  adamIgVersion: string;
  adamModelVersion: string;
  meddraVersion: string;
  phase?: string;
  protocolTitle?: string;
  sdtmIgVersion: string;
  sdtmModelVersion: string;
  studyId: string;
  whodrugVersion: string;
}

/** Committed state (from server) */
export interface CommittedState {
  milestones: IProjectMilestone[];
  studyConfig: StudyConfigState | null;
  treeData: PipelineNode[];
}

/** Working state (local edits) */
export interface WorkingState {
  milestones: IProjectMilestone[];
  studyConfig: StudyConfigState | null;
  treeData: PipelineNode[];
}

/** UI state */
export interface UIState {
  activeTab: string;
  executionJobsLoading: boolean;
  isDirty: boolean;
  milestonesLoading: boolean;
  saveInProgress: boolean;
  selectedNodeId: string | null;
  treeError: string | null;
  treeLoading: boolean;
}

/** Full store state */
export interface PipelineState {
  // Data states
  committed: CommittedState;
  // History for undo/redo
  history: {
    future: HistoryEntry[];
    past: HistoryEntry[];
  };
  pendingChanges: Map<string, ChangeRecord>;

  // UI state
  ui: UIState;

  working: WorkingState;
}

// ==================== Actions Interface ====================

export interface PipelineActions {
  canRedo: () => boolean;
  canUndo: () => boolean;
  // Milestone CRUD operations (on working state)
  createMilestone: (milestone: Omit<IProjectMilestone, 'createdAt' | 'id' | 'updatedAt'> & { id?: string }) => string;
  // Node CRUD operations (on working state)
  createNode: (
    node: Omit<PipelineNode, 'createdAt' | 'id' | 'updatedAt'> & { id?: string },
    parentId?: string | null
  ) => string;
  deleteMilestone: (milestoneId: string) => void;
  deleteNode: (nodeId: string) => void;
  discardChanges: () => void;

  getPendingChangesByType: () => { creates: number; deletes: number; updates: number };
  getPendingChangesCount: () => number;
  redo: () => void;

  // Reset
  reset: () => void;
  // Save actions
  save: () => Promise<void>;
  setActiveTab: (tab: string) => void;

  setExecutionJobsLoading: (loading: boolean) => void;

  setMilestones: (milestones: IProjectMilestone[]) => void;
  setMilestonesLoading: (loading: boolean) => void;

  // UI actions
  setSelectedNodeId: (id: string | null) => void;
  setStudyConfig: (config: StudyConfigState | null) => void;
  // Data loading
  setTreeData: (data: PipelineNode[]) => void;
  setTreeError: (error: string | null) => void;

  setTreeLoading: (loading: boolean) => void;
  // History actions
  undo: () => void;
  updateMilestone: (milestoneId: string, updates: Partial<IProjectMilestone>) => void;
  updateNode: (nodeId: string, updates: Partial<PipelineNode>) => void;

  // Study config operations (on working state)
  updateStudyConfig: (config: Partial<StudyConfigState>) => void;
}

// ==================== Constants ====================

const MAX_HISTORY_SIZE = 50;

const initialUIState: UIState = {
  activeTab: 'portfolio',
  executionJobsLoading: false,
  isDirty: false,
  milestonesLoading: false,
  saveInProgress: false,
  selectedNodeId: null,
  treeError: null,
  treeLoading: true
};

const initialCommittedState: CommittedState = {
  milestones: [],
  studyConfig: null,
  treeData: []
};

const initialWorkingState: WorkingState = {
  milestones: [],
  studyConfig: null,
  treeData: []
};

// ==================== Helper Functions ====================

/** Deep clone state for history snapshots */
const cloneState = (state: WorkingState): WorkingState => {
  return JSON.parse(JSON.stringify(state));
};

/** Find node by ID in tree */
const findNodeById = (nodes: PipelineNode[], id: string): PipelineNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

/** Find parent node by child ID */
const findParentNode = (nodes: PipelineNode[], childId: string): PipelineNode | null => {
  for (const node of nodes) {
    if (node.children?.some(child => child.id === childId)) {
      return node;
    }
    if (node.children) {
      const found = findParentNode(node.children, childId);
      if (found) return found;
    }
  }
  return null;
};

/** Remove node from tree */
const removeNodeFromTree = (nodes: PipelineNode[], nodeId: string): PipelineNode[] => {
  return nodes
    .filter(node => node.id !== nodeId)
    .map(node => ({
      ...node,
      children: node.children ? removeNodeFromTree(node.children, nodeId) : undefined
    }));
};

/** Add node to tree at correct position */
const addNodeToTree = (nodes: PipelineNode[], newNode: PipelineNode, parentId: string | null): PipelineNode[] => {
  if (!parentId) {
    return [...nodes, newNode];
  }

  return nodes.map(node => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...(node.children || []), newNode]
      };
    }
    if (node.children) {
      return {
        ...node,
        children: addNodeToTree(node.children, newNode, parentId)
      };
    }
    return node;
  });
};

/** Update node in tree */
const updateNodeInTree = (nodes: PipelineNode[], nodeId: string, updates: Partial<PipelineNode>): PipelineNode[] => {
  return nodes.map(node => {
    if (node.id === nodeId) {
      return { ...node, ...updates, updatedAt: new Date().toISOString() };
    }
    if (node.children) {
      return {
        ...node,
        children: updateNodeInTree(node.children, nodeId, updates)
      };
    }
    return node;
  });
};

// ==================== Store ====================

export const usePipelineStore = create<PipelineState & PipelineActions>()(
  immer((set, get) => ({
    // ==================== History Helpers ====================

    _pushHistory: (actionLabel: string) =>
      set(state => {
        const snapshot = cloneState(state.working);
        state.history.past.push({
          actionLabel,
          snapshot,
          timestamp: Date.now()
        });
        // Cap history size
        if (state.history.past.length > MAX_HISTORY_SIZE) {
          state.history.past.shift();
        }
        // Clear future stack on new action
        state.history.future = [];
      }),
    canRedo: () => get().history.future.length > 0,
    canUndo: () => get().history.past.length > 0,
    // Initial state
    committed: initialCommittedState,
    // ==================== Milestone CRUD ====================

    createMilestone: milestoneData => {
      const id = milestoneData.id || generateId('ms');
      const now = new Date().toISOString();
      const newMilestone: IProjectMilestone = {
        ...milestoneData,
        createdAt: now,
        id,
        updatedAt: now
      };

      set(state => {
        // Push to history before change
        const snapshot = cloneState(state.working);
        state.history.past.push({
          actionLabel: `Create milestone`,
          snapshot,
          timestamp: Date.now()
        });
        if (state.history.past.length > MAX_HISTORY_SIZE) {
          state.history.past.shift();
        }
        state.history.future = [];

        state.working.milestones.push(newMilestone);

        // Track pending change
        const changeId = `milestone-${id}`;
        const existingChange = state.pendingChanges.get(changeId);

        if (existingChange?.type === 'create') {
          existingChange.newState = newMilestone;
        } else {
          state.pendingChanges.set(changeId, {
            entityId: id,
            entityType: 'milestone',
            id: changeId,
            newState: newMilestone,
            previousState: null,
            timestamp: Date.now(),
            type: 'create'
          });
        }

        state.ui.isDirty = true;
      });

      return id;
    },

    // ==================== Node CRUD ====================

    createNode: (nodeData, parentId = null) => {
      const id = nodeData.id || generateId('node');
      const now = new Date().toISOString();
      const newNode: PipelineNode = {
        ...nodeData,
        createdAt: now,
        id,
        updatedAt: now
      } as PipelineNode;

      set(state => {
        // Push to history before change
        const snapshot = cloneState(state.working);
        state.history.past.push({
          actionLabel: `Create ${nodeData.nodeType} node`,
          snapshot,
          timestamp: Date.now()
        });
        if (state.history.past.length > MAX_HISTORY_SIZE) {
          state.history.past.shift();
        }
        state.history.future = [];

        // Use provided parentId, or try to find parent from tree
        const effectiveParentId = parentId || findParentNode(state.working.treeData, newNode.id)?.id || null;
        state.working.treeData = addNodeToTree(state.working.treeData, newNode, effectiveParentId);

        // Track pending change
        const changeId = `node-${id}`;
        const existingChange = state.pendingChanges.get(changeId);

        if (existingChange?.type === 'create') {
          // Update existing create record
          existingChange.newState = newNode;
        } else {
          // New create record
          state.pendingChanges.set(changeId, {
            entityId: id,
            entityType: 'node',
            id: changeId,
            newState: newNode,
            parentId: effectiveParentId,
            previousState: null,
            timestamp: Date.now(),
            type: 'create'
          });
        }

        state.ui.isDirty = true;
      });

      return id;
    },

    deleteMilestone: milestoneId =>
      set(state => {
        const existingMilestone = state.working.milestones.find(m => m.id === milestoneId);
        if (!existingMilestone) return;

        // Push to history before change
        const snapshot = cloneState(state.working);
        state.history.past.push({
          actionLabel: `Delete milestone`,
          snapshot,
          timestamp: Date.now()
        });
        if (state.history.past.length > MAX_HISTORY_SIZE) {
          state.history.past.shift();
        }
        state.history.future = [];

        // Remove milestone
        state.working.milestones = state.working.milestones.filter(m => m.id !== milestoneId);

        // Track pending change
        const changeId = `milestone-${milestoneId}`;
        const existingChange = state.pendingChanges.get(changeId);

        if (existingChange?.type === 'create') {
          // Milestone was created and then deleted - remove the change entirely
          state.pendingChanges.delete(changeId);
        } else {
          state.pendingChanges.set(changeId, {
            entityId: milestoneId,
            entityType: 'milestone',
            id: changeId,
            newState: null,
            previousState: existingMilestone,
            timestamp: Date.now(),
            type: 'delete'
          });
        }

        state.ui.isDirty = state.pendingChanges.size > 0;
      }),

    deleteNode: nodeId =>
      set(state => {
        const existingNode = findNodeById(state.working.treeData, nodeId);
        if (!existingNode) return;

        // Push to history before change
        const snapshot = cloneState(state.working);
        state.history.past.push({
          actionLabel: `Delete ${existingNode.nodeType} node`,
          snapshot,
          timestamp: Date.now()
        });
        if (state.history.past.length > MAX_HISTORY_SIZE) {
          state.history.past.shift();
        }
        state.history.future = [];

        // Remove node from working tree
        state.working.treeData = removeNodeFromTree(state.working.treeData, nodeId);

        // Track pending change
        const changeId = `node-${nodeId}`;
        const existingChange = state.pendingChanges.get(changeId);

        if (existingChange?.type === 'create') {
          // Node was created and then deleted - remove the change entirely
          state.pendingChanges.delete(changeId);
        } else {
          // Create delete record
          state.pendingChanges.set(changeId, {
            entityId: nodeId,
            entityType: 'node',
            id: changeId,
            newState: null,
            previousState: existingNode,
            timestamp: Date.now(),
            type: 'delete'
          });
        }

        state.ui.isDirty = state.pendingChanges.size > 0;
      }),

    discardChanges: () =>
      set(state => {
        // Reset working state to committed state
        state.working = cloneState(state.committed);
        state.pendingChanges = new Map();
        state.history.past = [];
        state.history.future = [];
        state.ui.isDirty = false;
      }),

    getPendingChangesByType: () => {
      const changes = get().pendingChanges;
      let creates = 0;
      let updates = 0;
      let deletes = 0;

      changes.forEach(change => {
        if (change.type === 'create') creates++;
        else if (change.type === 'update') updates++;
        else if (change.type === 'delete') deletes++;
      });

      return { creates, deletes, updates };
    },

    getPendingChangesCount: () => get().pendingChanges.size,

    history: {
      future: [],
      past: []
    },

    pendingChanges: new Map(),

    redo: () =>
      set(state => {
        if (state.history.future.length === 0) return;

        // Save current state to past
        const currentSnapshot = cloneState(state.working);
        state.history.past.push({
          actionLabel: 'Undo state',
          snapshot: currentSnapshot,
          timestamp: Date.now()
        });
        if (state.history.past.length > MAX_HISTORY_SIZE) {
          state.history.past.shift();
        }

        // Restore from future
        const nextEntry = state.history.future.pop()!;
        state.working = nextEntry.snapshot;

        // Rebuild pending changes
        state.pendingChanges = rebuildPendingChanges(state.committed, state.working);
        state.ui.isDirty = state.pendingChanges.size > 0;
      }),

    // ==================== Reset ====================

    reset: () =>
      set(state => {
        state.committed = initialCommittedState;
        state.working = initialWorkingState;
        state.pendingChanges = new Map();
        state.history.past = [];
        state.history.future = [];
        state.ui = initialUIState;
      }),

    // ==================== Save Actions ====================

    save: async () => {
      const state = get();

      if (state.pendingChanges.size === 0) return;

      set(s => {
        s.ui.saveInProgress = true;
      });

      try {
        // The actual save logic will be handled by the useSaveConfirmation hook
        // which calls batchSave.ts utility

        // After successful save, sync committed state
        set(s => {
          s.committed = cloneState(s.working);
          s.pendingChanges = new Map();
          s.history.past = [];
          s.history.future = [];
          s.ui.isDirty = false;
          s.ui.saveInProgress = false;
        });
      } catch (error) {
        set(s => {
          s.ui.saveInProgress = false;
        });
        throw error;
      }
    },

    setActiveTab: tab =>
      set(state => {
        state.ui.activeTab = tab;
      }),

    setExecutionJobsLoading: loading =>
      set(state => {
        state.ui.executionJobsLoading = loading;
      }),

    setMilestones: milestones =>
      set(state => {
        state.committed.milestones = milestones;
        state.working.milestones = milestones;
        state.ui.milestonesLoading = false;
        // Clear pending changes for milestones
        const keysToRemove: string[] = [];
        state.pendingChanges.forEach((_, key) => {
          if (key.startsWith('milestone-')) keysToRemove.push(key);
        });
        keysToRemove.forEach(key => state.pendingChanges.delete(key));
      }),

    setMilestonesLoading: loading =>
      set(state => {
        state.ui.milestonesLoading = loading;
      }),

    // ==================== UI Actions ====================

    setSelectedNodeId: id =>
      set(state => {
        state.ui.selectedNodeId = id;
      }),

    setStudyConfig: config =>
      set(state => {
        state.committed.studyConfig = config;
        state.working.studyConfig = config;
        // Clear pending changes for study config
        const keysToRemove: string[] = [];
        state.pendingChanges.forEach((_, key) => {
          if (key.startsWith('studyConfig-')) keysToRemove.push(key);
        });
        keysToRemove.forEach(key => state.pendingChanges.delete(key));
      }),

    // ==================== Data Loading ====================

    setTreeData: data =>
      set(state => {
        // Set both committed and working state when loading from API
        state.committed.treeData = data;
        state.working.treeData = data;
        state.ui.treeLoading = false;
        state.ui.treeError = null;
        // Clear pending changes for nodes
        const keysToRemove: string[] = [];
        state.pendingChanges.forEach((_, key) => {
          if (key.startsWith('node-')) keysToRemove.push(key);
        });
        keysToRemove.forEach(key => state.pendingChanges.delete(key));
      }),

    setTreeError: error =>
      set(state => {
        state.ui.treeError = error;
        state.ui.treeLoading = false;
      }),

    setTreeLoading: loading =>
      set(state => {
        state.ui.treeLoading = loading;
      }),

    ui: initialUIState,

    // ==================== History Actions ====================

    undo: () =>
      set(state => {
        if (state.history.past.length === 0) return;

        // Save current state to future
        const currentSnapshot = cloneState(state.working);
        state.history.future.push({
          actionLabel: 'Redo state',
          snapshot: currentSnapshot,
          timestamp: Date.now()
        });

        // Restore from past
        const previousEntry = state.history.past.pop()!;
        state.working = previousEntry.snapshot;

        // Rebuild pending changes from difference
        state.pendingChanges = rebuildPendingChanges(state.committed, state.working);
        state.ui.isDirty = state.pendingChanges.size > 0;
      }),

    updateMilestone: (milestoneId, updates) =>
      set(state => {
        const existingMilestone = state.working.milestones.find(m => m.id === milestoneId);
        if (!existingMilestone) return;

        // Push to history before change
        const snapshot = cloneState(state.working);
        state.history.past.push({
          actionLabel: `Update milestone`,
          snapshot,
          timestamp: Date.now()
        });
        if (state.history.past.length > MAX_HISTORY_SIZE) {
          state.history.past.shift();
        }
        state.history.future = [];

        // Update milestone
        const index = state.working.milestones.findIndex(m => m.id === milestoneId);
        if (index !== -1) {
          state.working.milestones[index] = {
            ...existingMilestone,
            ...updates,
            updatedAt: new Date().toISOString()
          };
        }

        // Track pending change
        const changeId = `milestone-${milestoneId}`;
        const existingChange = state.pendingChanges.get(changeId);

        if (existingChange?.type === 'create') {
          existingChange.newState = { ...existingMilestone, ...updates } as IProjectMilestone;
        } else {
          state.pendingChanges.set(changeId, {
            entityId: milestoneId,
            entityType: 'milestone',
            id: changeId,
            newState: { ...existingMilestone, ...updates } as IProjectMilestone,
            previousState: existingMilestone,
            timestamp: Date.now(),
            type: 'update'
          });
        }

        state.ui.isDirty = true;
      }),

    updateNode: (nodeId, updates) =>
      set(state => {
        const existingNode = findNodeById(state.working.treeData, nodeId);
        if (!existingNode) return;

        // Push to history before change
        const snapshot = cloneState(state.working);
        state.history.past.push({
          actionLabel: `Update ${existingNode.nodeType} node`,
          snapshot,
          timestamp: Date.now()
        });
        if (state.history.past.length > MAX_HISTORY_SIZE) {
          state.history.past.shift();
        }
        state.history.future = [];

        // Update node in working tree
        state.working.treeData = updateNodeInTree(state.working.treeData, nodeId, updates);

        // Track pending change
        const changeId = `node-${nodeId}`;
        const existingChange = state.pendingChanges.get(changeId);

        if (existingChange?.type === 'create') {
          // Update the create record's new state
          existingChange.newState = { ...existingNode, ...updates } as PipelineNode;
        } else {
          // Create update record
          state.pendingChanges.set(changeId, {
            entityId: nodeId,
            entityType: 'node',
            id: changeId,
            newState: { ...existingNode, ...updates } as PipelineNode,
            previousState: existingNode,
            timestamp: Date.now(),
            type: 'update'
          });
        }

        state.ui.isDirty = true;
      }),

    // ==================== Study Config ====================

    updateStudyConfig: config =>
      set(state => {
        // Push to history before change
        const snapshot = cloneState(state.working);
        state.history.past.push({
          actionLabel: `Update study config`,
          snapshot,
          timestamp: Date.now()
        });
        if (state.history.past.length > MAX_HISTORY_SIZE) {
          state.history.past.shift();
        }
        state.history.future = [];

        const previousConfig = state.working.studyConfig;
        state.working.studyConfig = {
          ...state.working.studyConfig,
          ...config
        } as StudyConfigState;

        // Track pending change
        const studyId = config.studyId || state.working.studyConfig?.studyId || 'unknown';
        const changeId = `studyConfig-${studyId}`;

        state.pendingChanges.set(changeId, {
          entityId: studyId,
          entityType: 'studyConfig',
          id: changeId,
          newState: state.working.studyConfig,
          previousState: previousConfig,
          timestamp: Date.now(),
          type: 'update'
        });

        state.ui.isDirty = true;
      }),

    working: initialWorkingState
  }))
);

// ==================== Helper Functions ====================

/** Rebuild pending changes map by comparing committed and working states */
function rebuildPendingChanges(committed: CommittedState, working: WorkingState): Map<string, ChangeRecord> {
  const pendingChanges = new Map<string, ChangeRecord>();
  const now = Date.now();

  // Compare tree data
  const committedNodeIds = new Set<string>();
  const workingNodeIds = new Set<string>();

  const collectNodeIds = (nodes: PipelineNode[], ids: Set<string>) => {
    nodes.forEach(node => {
      ids.add(node.id);
      if (node.children) collectNodeIds(node.children, ids);
    });
  };

  const collectNodes = (nodes: PipelineNode[], map: Map<string, PipelineNode>) => {
    nodes.forEach(node => {
      map.set(node.id, node);
      if (node.children) collectNodes(node.children, map);
    });
  };

  collectNodeIds(committed.treeData, committedNodeIds);
  collectNodeIds(working.treeData, workingNodeIds);

  const committedNodes = new Map<string, PipelineNode>();
  const workingNodes = new Map<string, PipelineNode>();
  collectNodes(committed.treeData, committedNodes);
  collectNodes(working.treeData, workingNodes);

  // Find created nodes
  workingNodeIds.forEach(id => {
    if (!committedNodeIds.has(id)) {
      // Find parent for the new node
      const parentNode = findParentNode(working.treeData, id);
      pendingChanges.set(`node-${id}`, {
        entityId: id,
        entityType: 'node',
        id: `node-${id}`,
        newState: workingNodes.get(id),
        parentId: parentNode?.id || null,
        previousState: null,
        timestamp: now,
        type: 'create'
      });
    }
  });

  // Find deleted nodes
  committedNodeIds.forEach(id => {
    if (!workingNodeIds.has(id)) {
      pendingChanges.set(`node-${id}`, {
        entityId: id,
        entityType: 'node',
        id: `node-${id}`,
        newState: null,
        previousState: committedNodes.get(id),
        timestamp: now,
        type: 'delete'
      });
    }
  });

  // Find updated nodes
  workingNodeIds.forEach(id => {
    if (committedNodeIds.has(id)) {
      const committedNode = committedNodes.get(id);
      const workingNode = workingNodes.get(id);
      if (JSON.stringify(committedNode) !== JSON.stringify(workingNode)) {
        pendingChanges.set(`node-${id}`, {
          entityId: id,
          entityType: 'node',
          id: `node-${id}`,
          newState: workingNode,
          previousState: committedNode,
          timestamp: now,
          type: 'update'
        });
      }
    }
  });

  // Compare milestones
  const committedMilestoneIds = new Set(committed.milestones.map(m => m.id));
  const workingMilestoneIds = new Set(working.milestones.map(m => m.id));
  const committedMilestones = new Map(committed.milestones.map(m => [m.id, m]));
  const workingMilestones = new Map(working.milestones.map(m => [m.id, m]));

  working.milestones.forEach(milestone => {
    if (!committedMilestoneIds.has(milestone.id)) {
      pendingChanges.set(`milestone-${milestone.id}`, {
        entityId: milestone.id,
        entityType: 'milestone',
        id: `milestone-${milestone.id}`,
        newState: milestone,
        previousState: null,
        timestamp: now,
        type: 'create'
      });
    } else {
      const committedMilestone = committedMilestones.get(milestone.id);
      if (JSON.stringify(committedMilestone) !== JSON.stringify(milestone)) {
        pendingChanges.set(`milestone-${milestone.id}`, {
          entityId: milestone.id,
          entityType: 'milestone',
          id: `milestone-${milestone.id}`,
          newState: milestone,
          previousState: committedMilestone,
          timestamp: now,
          type: 'update'
        });
      }
    }
  });

  committed.milestones.forEach(milestone => {
    if (!workingMilestoneIds.has(milestone.id)) {
      pendingChanges.set(`milestone-${milestone.id}`, {
        entityId: milestone.id,
        entityType: 'milestone',
        id: `milestone-${milestone.id}`,
        newState: null,
        previousState: milestone,
        timestamp: now,
        type: 'delete'
      });
    }
  });

  // Compare study config
  if (JSON.stringify(committed.studyConfig) !== JSON.stringify(working.studyConfig)) {
    if (working.studyConfig) {
      pendingChanges.set(`studyConfig-${working.studyConfig.studyId}`, {
        entityId: working.studyConfig.studyId,
        entityType: 'studyConfig',
        id: `studyConfig-${working.studyConfig.studyId}`,
        newState: working.studyConfig,
        previousState: committed.studyConfig,
        timestamp: now,
        type: 'update'
      });
    }
  }

  return pendingChanges;
}
