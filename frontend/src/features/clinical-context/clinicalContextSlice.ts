/**
 * Clinical Context Slice - 全局临床上下文 Redux Slice
 *
 * 管理 Product -> Study -> Analysis 三级联动选择状态 支持 localStorage 持久化
 */
import { type Middleware, type PayloadAction, createSlice } from '@reduxjs/toolkit';

import type {
  IClinicalAnalysis,
  IClinicalContext,
  IClinicalContextState,
  IClinicalProduct,
  IClinicalStudy,
  IRecentContextAccess
} from './types';

/** localStorage key */
const STORAGE_KEY = 'clinical-context-state';

/** 最大最近访问数量 */
const MAX_RECENT_COUNT = 5;

/** 默认状态 */
const defaultState: IClinicalContextState = {
  context: {
    analysisId: null,
    productId: null,
    studyId: null
  },
  recentAccessList: []
};

/** 从 localStorage 读取状态 */
function loadState(): IClinicalContextState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as IClinicalContextState;
      // 验证数据结构
      if (parsed && typeof parsed.context === 'object' && Array.isArray(parsed.recentAccessList)) {
        return {
          ...defaultState,
          ...parsed
        };
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to load clinical context from localStorage:', error);
  }
  return defaultState;
}

/** 保存状态到 localStorage */
function saveState(state: IClinicalContextState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to save clinical context to localStorage:', error);
  }
}

/** 初始状态 */
const initialState: IClinicalContextState = loadState();

export const clinicalContextSlice = createSlice({
  initialState,
  name: 'clinicalContext',
  reducers: {
    /** 添加最近访问 */
    addRecentAccess: (state, action: PayloadAction<Omit<IRecentContextAccess, 'accessedAt'>>) => {
      const access = action.payload;

      // 移除已存在的相同 Analysis
      const filtered = state.recentAccessList.filter(item => item.analysisId !== access.analysisId);

      // 添加新项到开头
      const newItem: IRecentContextAccess = {
        ...access,
        accessedAt: new Date().toISOString()
      };

      // 限制最大数量
      state.recentAccessList = [newItem, ...filtered].slice(0, MAX_RECENT_COUNT);
    },

    /** 清空上下文 */
    clearContext: state => {
      state.context = {
        analysisId: null,
        productId: null,
        studyId: null
      };
    },

    /** 清空最近访问 */
    clearRecentAccess: state => {
      state.recentAccessList = [];
    },

    /** 设置 Analysis */
    setAnalysis: (state, action: PayloadAction<{ analysis?: IClinicalAnalysis; analysisId: string | null }>) => {
      state.context.analysisId = action.payload.analysisId;
      state.context.analysis = action.payload.analysis;
    },

    /** 批量设置上下文 */
    setContext: (state, action: PayloadAction<IClinicalContext>) => {
      state.context = action.payload;
    },

    /** 设置 Product（自动清空 Study 和 Analysis） */
    setProduct: (state, action: PayloadAction<{ product?: IClinicalProduct; productId: string | null }>) => {
      state.context.productId = action.payload.productId;
      state.context.product = action.payload.product;
      // 清空下游
      state.context.studyId = null;
      state.context.study = undefined;
      state.context.analysisId = null;
      state.context.analysis = undefined;
    },

    /** 设置 Study（自动清空 Analysis） */
    setStudy: (state, action: PayloadAction<{ study?: IClinicalStudy; studyId: string | null }>) => {
      state.context.studyId = action.payload.studyId;
      state.context.study = action.payload.study;
      // 清空 Analysis
      state.context.analysisId = null;
      state.context.analysis = undefined;
    }
  },
  selectors: {
    /** 获取 Analysis ID */
    getAnalysisId: state => state.context.analysisId,
    /** 获取完整上下文 */
    getContext: state => state.context,
    /** 获取 Product ID */
    getProductId: state => state.context.productId,
    /** 获取最近访问列表 */
    getRecentAccessList: state => state.recentAccessList,
    /** 获取 Study ID */
    getStudyId: state => state.context.studyId,
    /** 判断是否已选择到 Analysis 级别（Tab 4 依赖） */
    isAnalysisReady: state => Boolean(state.context.analysisId),

    /** 判断上下文是否完整（Analysis 级别） */
    isContextReady: state => Boolean(state.context.productId && state.context.studyId && state.context.analysisId),

    /** 判断是否已选择到 Study 级别（Tab 2, Tab 3 依赖） */
    isStudyReady: state => Boolean(state.context.productId && state.context.studyId)
  }
});

// Action creators
export const { addRecentAccess, clearContext, clearRecentAccess, setAnalysis, setContext, setProduct, setStudy } =
  clinicalContextSlice.actions;

// Selectors
export const {
  getAnalysisId,
  getContext,
  getProductId,
  getRecentAccessList,
  getStudyId,
  isAnalysisReady,
  isContextReady,
  isStudyReady
} = clinicalContextSlice.selectors;

// Re-export wrapped selectors for root state access
// These selectors work with the root Redux state
export const selectClinicalContext = (state: { clinicalContext: IClinicalContextState }) =>
  state.clinicalContext.context;
export const selectProductId = (state: { clinicalContext: IClinicalContextState }) =>
  state.clinicalContext.context.productId;
export const selectStudyId = (state: { clinicalContext: IClinicalContextState }) =>
  state.clinicalContext.context.studyId;
export const selectAnalysisId = (state: { clinicalContext: IClinicalContextState }) =>
  state.clinicalContext.context.analysisId;
export const selectIsContextReady = (state: { clinicalContext: IClinicalContextState }) =>
  Boolean(
    state.clinicalContext.context.productId &&
      state.clinicalContext.context.studyId &&
      state.clinicalContext.context.analysisId
  );
export const selectIsStudyReady = (state: { clinicalContext: IClinicalContextState }) =>
  Boolean(state.clinicalContext.context.productId && state.clinicalContext.context.studyId);
export const selectIsAnalysisReady = (state: { clinicalContext: IClinicalContextState }) =>
  Boolean(state.clinicalContext.context.analysisId);
export const selectRecentAccessList = (state: { clinicalContext: IClinicalContextState }) =>
  state.clinicalContext.recentAccessList;

// Middleware to persist state changes
export const clinicalContextMiddleware: Middleware = store => next => action => {
  const result = next(action);
  // Save to localStorage after any action
  if (
    typeof action === 'object' &&
    action !== null &&
    'type' in action &&
    (action.type as string).startsWith('clinicalContext/')
  ) {
    const state = store.getState() as { clinicalContext?: IClinicalContextState };
    if (state.clinicalContext) {
      saveState(state.clinicalContext);
    }
  }
  return result;
};
