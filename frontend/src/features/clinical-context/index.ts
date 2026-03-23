// Slice
export {
  addRecentAccess,
  clearContext,
  clearRecentAccess,
  clinicalContextMiddleware,
  clinicalContextSlice,
  getAnalysisId,
  getContext,
  getProductId,
  getRecentAccessList,
  getStudyId,
  isContextReady,
  setAnalysis,
  setContext,
  setProduct,
  setStudy
} from './clinicalContextSlice';
// Components
export { default as GlobalContextSelector } from './components/GlobalContextSelector';

// Hooks
export {
  useAnalysisScopeNodeId,
  useClinicalContext,
  useClinicalContextState,
  useRecentAccess,
  useStudyScopeNodeId,
  useStudyStandardConfig
} from './hooks';

/**
 * Clinical Context Module - 全局临床上下文模块
 *
 * 提供 Product -> Study -> Analysis 三级联动的全局状态管理
 */

// Types
export type {
  IClinicalAnalysis,
  IClinicalContext,
  IClinicalContextState,
  IClinicalProduct,
  IClinicalStudy,
  IRecentContextAccess
} from './types';

export { MDR_CONTEXT_ROUTES } from './types';
