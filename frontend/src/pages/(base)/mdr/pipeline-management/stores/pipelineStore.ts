/**
 * Pipeline Management Store (Zustand + Immer)
 *
 * Manages pipeline tree, milestones, and study config with:
 * - Delayed save (pending changes tracking)
 * - Undo/redo support
 * - Committed vs working state separation
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

// Enable Map/Set support in Immer (required for pendingChanges Map)
enableMapSet();


import type {
  AnalysisNode,
  NodeLifecycleStatus,
  NodeType,
  NodeStatus,
  PipelineNode,
  StudyNode
} from '../mockData';
import type { IProjectMilestone } from '../types';

// ==================== Utility ====================

/** Generate a unique ID with an optional prefix */
const generateId = (prefix: string = 'id'): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// ==================== Types ====================

/** Change record for tracking pending operations */
export interface ChangeRecord {
  id: string;
  type: 'create' | 'delete' | 'update';
  entityType: 'node' | 'milestone' | 'studyConfig';
  entityId: string;
  previousState?: PipelineNode | IProjectMilestone | StudyConfigState | null;
  newState?: PipelineNode | IProjectMilestone | StudyConfigState | null;
  /** For create operations, the parent node ID */
  parentId?: string | null;
  timestamp: number;
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
  treeData: PipelineNode[];
  milestones: IProjectMilestone[];
  studyConfig: StudyConfigState | null;
}

/** Working state (local edits) */
export interface WorkingState {
  treeData: PipelineNode[];
  milestones: IProjectMilestone[];
  studyConfig: StudyConfigState | null;
}

/** UI state */
export interface UIState {
  selectedNodeId: string | null;
  activeTab: string;
  isDirty: boolean;
  saveInProgress: boolean;
  treeLoading: boolean;
  treeError: string | null;
  milestonesLoading: boolean;
  executionJobsLoading: boolean;
}

/** Full store state */
export interface PipelineState {
  // Data states
  committed: CommittedState;
  working: WorkingState;
  pendingChanges: Map<string, ChangeRecord>;

  // History for undo/redo
  history: {
    past: HistoryEntry[];
    future: HistoryEntry[];
  };

  // UI state
  ui: UIState;
}

// ==================== Actions Interface ====================

export interface PipelineActions {
  // Data loading
  setTreeData: (data: PipelineNode[]) => void;
  setMilestones: (milestones: IProjectMilestone[]) => void;
  setStudyConfig: (config: StudyConfigState | null) => void;
  setTreeLoading: (loading: boolean) => void;
  setTreeError: (error: string | null) => void;
  setMilestonesLoading: (loading: boolean) => void;
  setExecutionJobsLoading: (loading: boolean) => void;

  // Node CRUD operations (on working state)
  createNode: (node: Omit<PipelineNode, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }, parentId?: string | null) => string;
  updateNode: (nodeId: string, updates: Partial<PipelineNode>) => void;
  deleteNode: (nodeId: string) => void;

  // Milestone CRUD operations (on working state)
  createMilestone: (milestone: Omit<IProjectMilestone, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => string;
  updateMilestone: (milestoneId: string, updates: Partial<IProjectMilestone>) => void;
  deleteMilestone: (milestoneId: string) => void;

  // Study config operations (on working state)
  updateStudyConfig: (config: Partial<StudyConfigState>) => void;

  // UI actions
  setSelectedNodeId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;

  // History actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Save actions
  save: () => Promise<void>;
  discardChanges: () => void;
  getPendingChangesCount: () => number;
  getPendingChangesByType: () => { creates: number; updates: number; deletes: number };

  // Reset
  reset: () => void;
}

// ==================== Constants ====================

const MAX_HISTORY_SIZE = 50;

const initialUIState: UIState = {
  selectedNodeId: null,
  activeTab: 'portfolio',
  isDirty: false,
  saveInProgress: false,
  treeLoading: true,
  treeError: null,
  milestonesLoading: false,
  executionJobsLoading: false
};

const initialCommittedState: CommittedState = {
  treeData: [],
  milestones: [],
  studyConfig: null
};

const initialWorkingState: WorkingState = {
  treeData: [],
  milestones: [],
  studyConfig: null
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
const updateNodeInTree = (
  nodes: PipelineNode[],
  nodeId: string,
  updates: Partial<PipelineNode>
): PipelineNode[] => {
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
    // Initial state
    committed: initialCommittedState,
    working: initialWorkingState,
    pendingChanges: new Map(),
    history: {
      past: [],
      future: []
    },
    ui: initialUIState,

    // ==================== Data Loading ====================

    setTreeData: (data) =>
      set((state) => {
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

    setMilestones: (milestones) =>
      set((state) => {
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

    setStudyConfig: (config) =>
      set((state) => {
        state.committed.studyConfig = config;
        state.working.studyConfig = config;
        // Clear pending changes for study config
        const keysToRemove: string[] = [];
        state.pendingChanges.forEach((_, key) => {
          if (key.startsWith('studyConfig-')) keysToRemove.push(key);
        });
        keysToRemove.forEach(key => state.pendingChanges.delete(key));
      }),

    setTreeLoading: (loading) =>
      set((state) => {
        state.ui.treeLoading = loading;
      }),

    setTreeError: (error) =>
      set((state) => {
        state.ui.treeError = error;
        state.ui.treeLoading = false;
      }),

    setMilestonesLoading: (loading) =>
      set((state) => {
        state.ui.milestonesLoading = loading;
      }),

    setExecutionJobsLoading: (loading) =>
      set((state) => {
        state.ui.executionJobsLoading = loading;
      }),

    // ==================== History Helpers ====================

    _pushHistory: (actionLabel: string) =>
      set((state) => {
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

    // ==================== Node CRUD ====================

    createNode: (nodeData, parentId = null) => {
      const id = nodeData.id || generateId('node');
      const now = new Date().toISOString();
      const newNode: PipelineNode = {
        ...nodeData,
        id,
        createdAt: now,
        updatedAt: now
      } as PipelineNode;

      set((state) => {
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
            id: changeId,
            type: 'create',
            entityType: 'node',
            entityId: id,
            previousState: null,
            newState: newNode,
            parentId: effectiveParentId,
            timestamp: Date.now()
          });
        }

        state.ui.isDirty = true;
      });

      return id;
    },

    updateNode: (nodeId, updates) =>
      set((state) => {
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
            id: changeId,
            type: 'update',
            entityType: 'node',
            entityId: nodeId,
            previousState: existingNode,
            newState: { ...existingNode, ...updates } as PipelineNode,
            timestamp: Date.now()
          });
        }

        state.ui.isDirty = true;
      }),

    deleteNode: (nodeId) =>
      set((state) => {
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
            id: changeId,
            type: 'delete',
            entityType: 'node',
            entityId: nodeId,
            previousState: existingNode,
            newState: null,
            timestamp: Date.now()
          });
        }

        state.ui.isDirty = state.pendingChanges.size > 0;
      }),

    // ==================== Milestone CRUD ====================

    createMilestone: (milestoneData) => {
      const id = milestoneData.id || generateId('ms');
      const now = new Date().toISOString();
      const newMilestone: IProjectMilestone = {
        ...milestoneData,
        id,
        createdAt: now,
        updatedAt: now
      };

      set((state) => {
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
            id: changeId,
            type: 'create',
            entityType: 'milestone',
            entityId: id,
            previousState: null,
            newState: newMilestone,
            timestamp: Date.now()
          });
        }

        state.ui.isDirty = true;
      });

      return id;
    },

    updateMilestone: (milestoneId, updates) =>
      set((state) => {
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
            id: changeId,
            type: 'update',
            entityType: 'milestone',
            entityId: milestoneId,
            previousState: existingMilestone,
            newState: { ...existingMilestone, ...updates } as IProjectMilestone,
            timestamp: Date.now()
          });
        }

        state.ui.isDirty = true;
      }),

    deleteMilestone: (milestoneId) =>
      set((state) => {
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
            id: changeId,
            type: 'delete',
            entityType: 'milestone',
            entityId: milestoneId,
            previousState: existingMilestone,
            newState: null,
            timestamp: Date.now()
          });
        }

        state.ui.isDirty = state.pendingChanges.size > 0;
      }),

    // ==================== Study Config ====================

    updateStudyConfig: (config) =>
      set((state) => {
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
          id: changeId,
          type: 'update',
          entityType: 'studyConfig',
          entityId: studyId,
          previousState: previousConfig,
          newState: state.working.studyConfig,
          timestamp: Date.now()
        });

        state.ui.isDirty = true;
      }),

    // ==================== UI Actions ====================

    setSelectedNodeId: (id) =>
      set((state) => {
        state.ui.selectedNodeId = id;
      }),

    setActiveTab: (tab) =>
      set((state) => {
        state.ui.activeTab = tab;
      }),

    // ==================== History Actions ====================

    undo: () =>
      set((state) => {
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

    redo: () =>
      set((state) => {
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

    canUndo: () => get().history.past.length > 0,

    canRedo: () => get().history.future.length > 0,

    // ==================== Save Actions ====================

    save: async () => {
      const state = get();

      if (state.pendingChanges.size === 0) return;

      set((s) => {
        s.ui.saveInProgress = true;
      });

      try {
        // The actual save logic will be handled by the useSaveConfirmation hook
        // which calls batchSave.ts utility

        // After successful save, sync committed state
        set((s) => {
          s.committed = cloneState(s.working);
          s.pendingChanges = new Map();
          s.history.past = [];
          s.history.future = [];
          s.ui.isDirty = false;
          s.ui.saveInProgress = false;
        });
      } catch (error) {
        set((s) => {
          s.ui.saveInProgress = false;
        });
        throw error;
      }
    },

    discardChanges: () =>
      set((state) => {
        // Reset working state to committed state
        state.working = cloneState(state.committed);
        state.pendingChanges = new Map();
        state.history.past = [];
        state.history.future = [];
        state.ui.isDirty = false;
      }),

    getPendingChangesCount: () => get().pendingChanges.size,

    getPendingChangesByType: () => {
      const changes = get().pendingChanges;
      let creates = 0;
      let updates = 0;
      let deletes = 0;

      changes.forEach((change) => {
        if (change.type === 'create') creates++;
        else if (change.type === 'update') updates++;
        else if (change.type === 'delete') deletes++;
      });

      return { creates, updates, deletes };
    },

    // ==================== Reset ====================

    reset: () =>
      set((state) => {
        state.committed = initialCommittedState;
        state.working = initialWorkingState;
        state.pendingChanges = new Map();
        state.history.past = [];
        state.history.future = [];
        state.ui = initialUIState;
      })
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
        id: `node-${id}`,
        type: 'create',
        entityType: 'node',
        entityId: id,
        previousState: null,
        newState: workingNodes.get(id),
        parentId: parentNode?.id || null,
        timestamp: now
      });
    }
  });

  // Find deleted nodes
  committedNodeIds.forEach(id => {
    if (!workingNodeIds.has(id)) {
      pendingChanges.set(`node-${id}`, {
        id: `node-${id}`,
        type: 'delete',
        entityType: 'node',
        entityId: id,
        previousState: committedNodes.get(id),
        newState: null,
        timestamp: now
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
          id: `node-${id}`,
          type: 'update',
          entityType: 'node',
          entityId: id,
          previousState: committedNode,
          newState: workingNode,
          timestamp: now
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
        id: `milestone-${milestone.id}`,
        type: 'create',
        entityType: 'milestone',
        entityId: milestone.id,
        previousState: null,
        newState: milestone,
        timestamp: now
      });
    } else {
      const committedMilestone = committedMilestones.get(milestone.id);
      if (JSON.stringify(committedMilestone) !== JSON.stringify(milestone)) {
        pendingChanges.set(`milestone-${milestone.id}`, {
          id: `milestone-${milestone.id}`,
          type: 'update',
          entityType: 'milestone',
          entityId: milestone.id,
          previousState: committedMilestone,
          newState: milestone,
          timestamp: now
        });
      }
    }
  });

  committed.milestones.forEach(milestone => {
    if (!workingMilestoneIds.has(milestone.id)) {
      pendingChanges.set(`milestone-${milestone.id}`, {
        id: `milestone-${milestone.id}`,
        type: 'delete',
        entityType: 'milestone',
        entityId: milestone.id,
        previousState: milestone,
        newState: null,
        timestamp: now
      });
    }
  });

  // Compare study config
  if (JSON.stringify(committed.studyConfig) !== JSON.stringify(working.studyConfig)) {
    if (working.studyConfig) {
      pendingChanges.set(`studyConfig-${working.studyConfig.studyId}`, {
        id: `studyConfig-${working.studyConfig.studyId}`,
        type: 'update',
        entityType: 'studyConfig',
        entityId: working.studyConfig.studyId,
        previousState: committed.studyConfig,
        newState: working.studyConfig,
        timestamp: now
      });
    }
  }

  return pendingChanges;
}