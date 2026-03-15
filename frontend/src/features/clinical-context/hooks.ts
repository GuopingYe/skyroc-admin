/**
 * Clinical Context Hooks - 全局临床上下文便捷 Hooks
 *
 * 提供对 clinicalContextSlice 的便捷访问
 */
import { useCallback } from 'react';

import {
  addRecentAccess,
  clearContext,
  clearRecentAccess,
  selectAnalysisId,
  selectClinicalContext,
  selectIsAnalysisReady,
  selectIsContextReady,
  selectIsStudyReady,
  selectProductId,
  selectRecentAccessList,
  selectStudyId,
  setAnalysis,
  setContext,
  setProduct,
  setStudy
} from './clinicalContextSlice';
import type {
  IClinicalAnalysis,
  IClinicalContext,
  IClinicalProduct,
  IClinicalStudy,
  IRecentContextAccess
} from './types';

/**
 * 使用临床上下文 - 主 Hook
 *
 * 提供完整的上下文状态和操作方法
 */
export function useClinicalContext() {
  const dispatch = useAppDispatch();

  const context = useAppSelector(selectClinicalContext);
  const productId = useAppSelector(selectProductId);
  const studyId = useAppSelector(selectStudyId);
  const analysisId = useAppSelector(selectAnalysisId);
  const recentAccessList = useAppSelector(selectRecentAccessList);
  const contextReady = useAppSelector(selectIsContextReady);
  const studyReady = useAppSelector(selectIsStudyReady);
  const analysisReady = useAppSelector(selectIsAnalysisReady);

  // 选择 Product（清空下游）
  const selectProduct = useCallback(
    (productId: string | null, product?: IClinicalProduct) => {
      dispatch(setProduct({ product, productId }));
    },
    [dispatch]
  );

  // 选择 Study（清空 Analysis）
  const selectStudy = useCallback(
    (studyId: string | null, study?: IClinicalStudy) => {
      dispatch(setStudy({ study, studyId }));
    },
    [dispatch]
  );

  // 选择 Analysis
  const selectAnalysis = useCallback(
    (analysisId: string | null, analysis?: IClinicalAnalysis) => {
      dispatch(setAnalysis({ analysis, analysisId }));
    },
    [dispatch]
  );

  // 批量设置上下文
  const updateContext = useCallback(
    (newContext: IClinicalContext) => {
      dispatch(setContext(newContext));
    },
    [dispatch]
  );

  // 清空上下文
  const resetContext = useCallback(() => {
    dispatch(clearContext());
  }, [dispatch]);

  // 添加最近访问
  const addRecent = useCallback(
    (access: Omit<IRecentContextAccess, 'accessedAt'>) => {
      dispatch(addRecentAccess(access));
    },
    [dispatch]
  );

  // 清空最近访问
  const clearRecent = useCallback(() => {
    dispatch(clearRecentAccess());
  }, [dispatch]);

  return {
    addRecent,
    analysisId,
    clearRecent,
    // 状态
    context,
    isAnalysisReady: analysisReady,
    isReady: contextReady,
    isStudyReady: studyReady,
    productId,

    recentAccessList,
    resetContext,
    selectAnalysis,
    // 操作方法
    selectProduct,
    selectStudy,
    studyId,
    updateContext
  };
}

/** 仅获取上下文状态（只读） */
export function useClinicalContextState() {
  const context = useAppSelector(selectClinicalContext);
  const isReady = useAppSelector(selectIsContextReady);
  const isStudyReady = useAppSelector(selectIsStudyReady);
  const isAnalysisReady = useAppSelector(selectIsAnalysisReady);

  return {
    analysis: context.analysis,
    analysisId: context.analysisId,
    context,
    isAnalysisReady,
    isReady,
    isStudyReady,
    product: context.product,
    productId: context.productId,
    study: context.study,
    studyId: context.studyId
  };
}

/** 仅获取最近访问列表 */
export function useRecentAccess() {
  const dispatch = useAppDispatch();
  const recentAccessList = useAppSelector(selectRecentAccessList);

  const addRecent = useCallback(
    (access: Omit<IRecentContextAccess, 'accessedAt'>) => {
      dispatch(addRecentAccess(access));
    },
    [dispatch]
  );

  const clearRecent = useCallback(() => {
    dispatch(clearRecentAccess());
  }, [dispatch]);

  return {
    addRecent,
    clearRecent,
    recentAccessList
  };
}
