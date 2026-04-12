import { useCallback, useMemo, useRef, useState } from 'react';

import { saveNodeRoles } from '@/service/api/mdr';

import type { AssignedRoleUser, AssignedRoles, RoleChangeAction } from '../types';

const MAX_HISTORY = 30;

function cloneRoles(roles: AssignedRoles): AssignedRoles {
  return JSON.parse(JSON.stringify(roles));
}

function diffRoles(committed: AssignedRoles, working: AssignedRoles): RoleChangeAction[] {
  const allCodes = new Set([...Object.keys(committed), ...Object.keys(working)]);
  const actions: RoleChangeAction[] = [];

  for (const code of allCodes) {
    const cIds = new Set((committed[code] || []).map(u => u.userId));
    const wIds = new Set((working[code] || []).map(u => u.userId));
    const wUsers = new Map((working[code] || []).map(u => [u.userId, u]));

    for (const id of wIds) {
      if (!cIds.has(id)) {
        actions.push({ action: 'assign', roleCode: code, userId: id, userDetails: wUsers.get(id) });
      }
    }
    for (const id of cIds) {
      if (!wIds.has(id)) {
        actions.push({ action: 'revoke', roleCode: code, userId: id });
      }
    }
  }
  return actions;
}

export interface UseRoleAssignmentsReturn {
  assignUser: (roleCode: string, user: AssignedRoleUser) => void;
  assignedRoles: AssignedRoles;
  canRedo: boolean;
  canUndo: boolean;
  discardAll: () => void;
  isDirty: boolean;
  pendingChanges: RoleChangeAction[];
  pendingCount: number;
  redo: () => void;
  removeUser: (roleCode: string, userId: number) => void;
  resetRoles: (roles: AssignedRoles) => void;
  saveAll: () => Promise<void>;
  saving: boolean;
  undo: () => void;
}

export function useRoleAssignments(nodeId: string | null): UseRoleAssignmentsReturn {
  const [committed, setCommitted] = useState<AssignedRoles>({});
  const [working, setWorking] = useState<AssignedRoles>({});
  const [saving, setSaving] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const pastRef = useRef<AssignedRoles[]>([]);
  const futureRef = useRef<AssignedRoles[]>([]);

  const pendingChanges = useMemo(() => diffRoles(committed, working), [committed, working]);
  const pendingCount = pendingChanges.length;
  const isDirty = pendingCount > 0;
  const canUndo = historyVersion > 0 && pastRef.current.length > 0;
  const canRedo = historyVersion >= 0 && futureRef.current.length > 0;

  const resetRoles = useCallback((roles: AssignedRoles) => {
    const cloned = cloneRoles(roles);
    setCommitted(cloned);
    setWorking(cloned);
    pastRef.current = [];
    futureRef.current = [];
    setHistoryVersion(0);
  }, []);

  const assignUser = useCallback((roleCode: string, user: AssignedRoleUser) => {
    setWorking(prev => {
      pastRef.current.push(cloneRoles(prev));
      if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
      futureRef.current = [];
      setHistoryVersion(v => v + 1);

      const current = prev[roleCode] || [];
      if (current.some(u => u.userId === user.userId)) return prev;
      return { ...prev, [roleCode]: [...current, user] };
    });
  }, []);

  const removeUser = useCallback((roleCode: string, userId: number) => {
    setWorking(prev => {
      pastRef.current.push(cloneRoles(prev));
      if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
      futureRef.current = [];
      setHistoryVersion(v => v + 1);

      const current = prev[roleCode] || [];
      if (!current.some(u => u.userId === userId)) return prev;
      return { ...prev, [roleCode]: current.filter(u => u.userId !== userId) };
    });
  }, []);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    setWorking(prev => {
      futureRef.current.push(cloneRoles(prev));
      const previous = pastRef.current.pop()!;
      setHistoryVersion(v => v + 1);
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    setWorking(prev => {
      pastRef.current.push(cloneRoles(prev));
      const next = futureRef.current.pop()!;
      setHistoryVersion(v => v + 1);
      return next;
    });
  }, []);

  const discardAll = useCallback(() => {
    setWorking(cloneRoles(committed));
    pastRef.current = [];
    futureRef.current = [];
    setHistoryVersion(0);
  }, [committed]);

  const saveAll = useCallback(async () => {
    if (!nodeId || pendingCount === 0) return;
    setSaving(true);
    try {
      const assignments = pendingChanges.map(c => ({
        action: c.action,
        role_code: c.roleCode,
        user_id: c.userId,
      }));
      await saveNodeRoles(nodeId, assignments);
      setCommitted(cloneRoles(working));
      pastRef.current = [];
      futureRef.current = [];
    } finally {
      setSaving(false);
    }
  }, [nodeId, pendingCount, pendingChanges, working]);

  return {
    assignUser,
    assignedRoles: working,
    canRedo,
    canUndo,
    discardAll,
    isDirty,
    pendingChanges,
    pendingCount,
    redo,
    removeUser,
    resetRoles,
    saveAll,
    saving,
    undo,
  };
}
