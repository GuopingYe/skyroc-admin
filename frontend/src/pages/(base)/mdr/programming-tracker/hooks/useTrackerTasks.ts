/**
 * useTrackerTasks - 编程任务数据管理 Hook
 *
 * 封装 Tracker 任务的 API 调用和状态管理
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getTrackerTaskList } from '@/service/api/mdr';
import {
  transformBackendTrackerList,
  type BackendTrackerListResponse,
  type FrontendTrackerTask
} from '@/service/transforms/tracker';

import type { TaskCategory } from '../mockData';

/** Hook 返回值 */
interface UseTrackerTasksReturn {
  tasks: FrontendTrackerTask[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  categoryCounts: Record<TaskCategory, number>;
}

/**
 * 编程任务数据管理 Hook
 */
export function useTrackerTasks(
  analysisId: string | null,
  activeCategory: TaskCategory
): UseTrackerTasksReturn {
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
      const data = response.data as BackendTrackerListResponse;

      // 使用转换层处理数据
      const mappedTasks = transformBackendTrackerList(data);
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
      SDTM: 0,
      ADaM: 0,
      TFL: 0,
      Other: 0
    };

    allTasks.forEach(task => {
      counts[task.category]++;
    });

    return counts;
  }, [allTasks]);

  return {
    tasks: currentTasks,
    loading,
    error,
    refresh: fetchAllTasks,
    categoryCounts
  };
}

export default useTrackerTasks;