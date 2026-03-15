/**
 * useTrackerState - 编程任务跟踪器页面状态 Hook
 *
 * 仅管理页面特有的 activeCategory 状态 全局上下文状态已迁移至 useClinicalContext
 */
import { useCallback, useState } from 'react';

import type { TaskCategory } from '../mockData';

/** localStorage key */
const STORAGE_KEY = 'programming-tracker-active-category';

/** 默认激活分类 */
const DEFAULT_CATEGORY: TaskCategory = 'SDTM';

/** 从 localStorage 读取激活分类 */
function loadActiveCategory(): TaskCategory {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ['SDTM', 'ADaM', 'TFL', 'Other'].includes(stored)) {
      return stored as TaskCategory;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to load active category from localStorage:', error);
  }
  return DEFAULT_CATEGORY;
}

/** 保存激活分类到 localStorage */
function saveActiveCategory(category: TaskCategory): void {
  try {
    localStorage.setItem(STORAGE_KEY, category);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to save active category to localStorage:', error);
  }
}

/** Hook 返回值 */
interface UseTrackerStateReturn {
  activeCategory: TaskCategory;
  setActiveCategory: (category: TaskCategory) => void;
}

/** 编程任务跟踪器页面状态 Hook */
export function useTrackerState(): UseTrackerStateReturn {
  // 初始化时从 localStorage 读取
  const [activeCategory, setActiveCategoryState] = useState<TaskCategory>(() => loadActiveCategory());

  // 更新激活的分类
  const setActiveCategory = useCallback((category: TaskCategory) => {
    setActiveCategoryState(category);
    saveActiveCategory(category);
  }, []);

  return {
    activeCategory,
    setActiveCategory
  };
}

export default useTrackerState;
