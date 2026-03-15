/**
 * GlobalContextSelector - 全局上下文选择器
 *
 * 三级联动选择器：Product -> Study -> Analysis 数据来源于统一的 clinicalDataStore 用于 MDR 业务模块的统一上下文切换
 */
import { AuditOutlined, ExperimentOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import { Select, Space, Tag, Typography } from 'antd';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  analysisStatusColorMap,
  getActiveProducts,
  getAnalysesByStudy,
  getAnalysisById,
  getProductById,
  getStudiesByProduct,
  getStudyById
} from '@/mock/clinicalDataStore';

import { useClinicalContext } from '../hooks';
import type { IClinicalAnalysis, IClinicalProduct, IClinicalStudy } from '../types';

const { Text } = Typography;

interface GlobalContextSelectorProps {
  /** 自定义类名 */
  className?: string;
  /** 是否显示紧凑模式 */
  compact?: boolean;
}

const GlobalContextSelector: React.FC<GlobalContextSelectorProps> = ({ className, compact = false }) => {
  const { t } = useTranslation();
  const { context, isAnalysisReady, isStudyReady, selectAnalysis, selectProduct, selectStudy } = useClinicalContext();

  // 从统一数据源获取 Products
  const products = useMemo(() => getActiveProducts(), []);

  // 可选的 Studies（基于选中的 Product）
  const availableStudies = useMemo(() => {
    return getStudiesByProduct(context.productId);
  }, [context.productId]);

  // 可选的 Analyses（基于选中的 Study）
  const availableAnalyses = useMemo(() => {
    return getAnalysesByStudy(context.studyId);
  }, [context.studyId]);

  // 当 Product 变化时，检查当前选中的 Study 是否还在可选列表中
  // 如果不在，自动清空 Study 和 Analysis（通过 selectProduct 已经处理）
  useEffect(() => {
    if (context.studyId && context.productId) {
      const studyStillValid = availableStudies.some(s => s.id === context.studyId);
      if (!studyStillValid) {
        // Study 不再有效，由 Redux slice 的 setProduct 已自动清空
      }
    }
  }, [context.productId, context.studyId, availableStudies]);

  // 当 Study 变化时，检查当前选中的 Analysis 是否还在可选列表中
  useEffect(() => {
    if (context.analysisId && context.studyId) {
      const analysisStillValid = availableAnalyses.some(a => a.id === context.analysisId);
      if (!analysisStillValid) {
        // Analysis 不再有效，由 Redux slice 的 setStudy 已自动清空
      }
    }
  }, [context.studyId, context.analysisId, availableAnalyses]);

  // 处理 Product 选择（切换 Product 时自动清空下游）
  const handleProductChange = useCallback(
    (productId: string | undefined) => {
      const product = productId ? getProductById(productId) : undefined;
      selectProduct(productId || null, product as IClinicalProduct | undefined);
    },
    [selectProduct]
  );

  // 处理 Study 选择（切换 Study 时自动清空 Analysis）
  const handleStudyChange = useCallback(
    (studyId: string | undefined) => {
      const study = studyId ? getStudyById(studyId) : undefined;
      selectStudy(studyId || null, study as IClinicalStudy | undefined);
    },
    [selectStudy]
  );

  // 处理 Analysis 选择
  const handleAnalysisChange = useCallback(
    (analysisId: string | undefined) => {
      const analysis = analysisId ? getAnalysisById(analysisId) : undefined;
      selectAnalysis(analysisId || null, analysis as IClinicalAnalysis | undefined);
    },
    [selectAnalysis]
  );

  // 获取当前选中项的完整对象（用于显示详情）
  const selectedProduct = useMemo(() => {
    return context.productId ? getProductById(context.productId) : null;
  }, [context.productId]);

  const selectedStudy = useMemo(() => {
    return context.studyId ? getStudyById(context.studyId) : null;
  }, [context.studyId]);

  const selectedAnalysis = useMemo(() => {
    return context.analysisId ? getAnalysisById(context.analysisId) : null;
  }, [context.analysisId]);

  return (
    <div
      className={`border-b border-blue-100 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 px-16px py-12px ${className || ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-16px">
          <Text
            className="text-12px"
            type="secondary"
          >
            {t('page.mdr.contextSelector.label')}:
          </Text>

          <Space
            wrap
            size={8}
          >
            {/* Product 选择 */}
            <div className="flex items-center gap-4px">
              <MedicineBoxOutlined className="text-blue-500" />
              <Select
                allowClear
                showSearch
                optionFilterProp="children"
                placeholder={t('page.mdr.contextSelector.selectProduct')}
                size="small"
                style={{ minWidth: compact ? 120 : 160 }}
                value={context.productId}
                onChange={handleProductChange}
              >
                {products.map(product => (
                  <Select.Option
                    key={product.id}
                    value={product.id}
                  >
                    <Space>
                      <span>{product.name}</span>
                      <Tag
                        className="m-0 text-10px"
                        color="blue"
                      >
                        {product.indication}
                      </Tag>
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </div>

            <span className="text-gray-300">→</span>

            {/* Study 选择 */}
            <div className="flex items-center gap-4px">
              <ExperimentOutlined className="text-orange-500" />
              <Select
                allowClear
                showSearch
                disabled={!context.productId}
                optionFilterProp="children"
                placeholder={t('page.mdr.contextSelector.selectStudy')}
                size="small"
                style={{ minWidth: compact ? 120 : 180 }}
                value={context.studyId}
                onChange={handleStudyChange}
              >
                {availableStudies.map(study => (
                  <Select.Option
                    key={study.id}
                    value={study.id}
                  >
                    <Space>
                      <span>{study.studyCode}</span>
                      <Tag
                        className="m-0 text-10px"
                        color="orange"
                      >
                        {study.phase}
                      </Tag>
                      <Tag
                        className="m-0 text-10px"
                        color={study.lifecycleStatus === 'Locked' ? 'red' : 'green'}
                      >
                        {study.lifecycleStatus}
                      </Tag>
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </div>

            <span className="text-gray-300">→</span>

            {/* Analysis 选择 */}
            <div className="flex items-center gap-4px">
              <AuditOutlined className="text-purple-500" />
              <Select
                allowClear
                showSearch
                disabled={!context.studyId}
                optionFilterProp="children"
                placeholder={t('page.mdr.contextSelector.selectAnalysis')}
                size="small"
                style={{ minWidth: compact ? 140 : 200 }}
                value={context.analysisId}
                onChange={handleAnalysisChange}
              >
                {availableAnalyses.map(analysis => (
                  <Select.Option
                    key={analysis.id}
                    value={analysis.id}
                  >
                    <Space>
                      <span>{analysis.name}</span>
                      <Tag
                        className="m-0 text-10px"
                        color={analysisStatusColorMap[analysis.status]}
                      >
                        {analysis.status}
                      </Tag>
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </div>
          </Space>
        </div>

        {/* 状态提示 */}
        <div className="flex items-center gap-8px">
          {isAnalysisReady ? (
            <Tag color="success">{t('page.mdr.contextSelector.contextReady')}</Tag>
          ) : isStudyReady ? (
            <Tag color="processing">
              {selectedStudy?.studyCode} - {t('page.mdr.contextSelector.selectAnalysisHint')}
            </Tag>
          ) : context.productId ? (
            <Tag color="warning">
              {selectedProduct?.name} - {t('page.mdr.contextSelector.selectStudyHint')}
            </Tag>
          ) : (
            <Text
              className="text-12px"
              type="secondary"
            >
              {t('page.mdr.contextSelector.selectRequired')}
            </Text>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalContextSelector;
