/**
 * useTrackerTasks - 编程任务数据管理 Hook
 *
 * 封装 Tracker 任务的 API 调用和状态管理
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getTrackerTaskList } from '@/service/api/mdr';
import {
  type BackendTrackerListResponse,
  type FrontendTrackerTask,
  transformBackendTrackerList
} from '@/service/transforms/tracker';

import type { TaskCategory } from '../mockData';

/** Hook 返回值 */
interface UseTrackerTasksReturn {
  categoryCounts: Record<TaskCategory, number>;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  tasks: FrontendTrackerTask[];
}

/** 编程任务数据管理 Hook */
export function useTrackerTasks(analysisId: string | null, activeCategory: TaskCategory): UseTrackerTasksReturn {
  const [allTasks, setAllTasks] = useState<FrontendTrackerTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllTasks = useCallback(async () => {
    if (!analysisId) {
      setAllTasks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getTrackerTaskList(analysisId);
      // response 已经是解包后的数据 { total, items }
      const mappedTasks = transformBackendTrackerList(response);
      setAllTasks(mappedTasks);
    } catch (err) {
      console.error('Failed to fetch tracker tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
      setAllTasks([]);
    } finally {
      setLoading(false);
    }
  }, [analysisId]);

  useEffect(() => {
    fetchAllTasks();
  }, [fetchAllTasks]);

  const currentTasks = useMemo(() => {
    return allTasks.filter(task => task.category === activeCategory);
  }, [allTasks, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<TaskCategory, number> = {
      ADaM: 0,
      Other: 0,
      SDTM: 0,
      TFL: 0
    };

    allTasks.forEach(task => {
      counts[task.category]++;
    });

    return counts;
  }, [allTasks]);

  return {
    categoryCounts,
    error,
    loading,
    refresh: fetchAllTasks,
    tasks: currentTasks
  };
}

export default useTrackerTasks;
