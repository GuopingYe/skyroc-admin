/**
 * GlobalContextSelector - 全局上下文选择器
 *
 * 三级联动选择器：Product -> Study -> Analysis
 * 数据来源于后端 API（pipeline endpoints），与 pipeline management 保持同步
 */
import { AuditOutlined, ExperimentOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import { Select, Space, Spin, Tag, Typography } from 'antd';
import type { DefaultOptionType } from 'antd/es/select';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getPipelineAnalyses, getPipelineProducts, getPipelineStudies } from '@/service/api/mdr';

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

  // 数据源状态
  const [products, setProducts] = useState<any[]>([]);
  const [studies, setStudies] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载 products
  const fetchProducts = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    getPipelineProducts()
      .then(data => {
        if (!cancelled && data) setProducts(data as any[]);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 加载 studies
  const fetchStudies = useCallback(() => {
    if (!context.productId) {
      setStudies([]);
      return;
    }
    let cancelled = false;
    getPipelineStudies(context.productId)
      .then(data => {
        if (!cancelled && data) setStudies(data as any[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [context.productId]);

  // 加载 analyses
  const fetchAnalyses = useCallback(() => {
    if (!context.studyId) {
      setAnalyses([]);
      return;
    }
    let cancelled = false;
    getPipelineAnalyses(context.studyId)
      .then(data => {
        if (!cancelled && data) setAnalyses(data as any[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [context.studyId]);

  useEffect(() => {
    return fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    return fetchStudies();
  }, [fetchStudies]);

  useEffect(() => {
    return fetchAnalyses();
  }, [fetchAnalyses]);

  // 下拉展开时刷新对应列表（捕获新增后未切换上下文的情况）
  const handleDropdownVisibleChange = useCallback(
    (visible: boolean, type: 'product' | 'study' | 'analysis') => {
      if (visible) {
        if (type === 'product') fetchProducts();
        else if (type === 'study') fetchStudies();
        else fetchAnalyses();
      }
    },
    [fetchProducts, fetchStudies, fetchAnalyses]
  );

  // 处理 Product 选择（切换 Product 时自动清空下游）
  const handleProductChange = useCallback(
    (productId: string | undefined) => {
      if (productId) {
        const node = products.find(p => String(p.id) === productId);
        selectProduct(productId, {
          id: productId,
          name: node?.name || node?.code || productId
        } as IClinicalProduct);
      } else {
        selectProduct(null);
      }
    },
    [products, selectProduct]
  );

  // 处理 Study 选择（切换 Study 时自动清空 Analysis）
  const handleStudyChange = useCallback(
    (studyId: string | undefined) => {
      if (studyId) {
        const node = studies.find(s => String(s.id) === studyId);
        selectStudy(studyId, {
          id: studyId,
          name: node?.name || node?.study_code || node?.code || studyId,
          phase: node?.phase || '',
          status: node?.status || 'Active'
        } as IClinicalStudy);
      } else {
        selectStudy(null);
      }
    },
    [studies, selectStudy]
  );

  // 处理 Analysis 选择
  const handleAnalysisChange = useCallback(
    (analysisId: string | undefined) => {
      if (analysisId) {
        const node = analyses.find(a => String(a.id) === analysisId);
        selectAnalysis(analysisId, {
          id: analysisId,
          name: node?.name || node?.code || analysisId,
          status: (node?.lifecycleStatus || 'Active') as IClinicalAnalysis['status']
        } as IClinicalAnalysis);
      } else {
        selectAnalysis(null);
      }
    },
    [analyses, selectAnalysis]
  );

  // 构建 options（纯字符串 label，避免 JSX 渲染问题）
  const productOptions = useMemo<DefaultOptionType[]>(
    () =>
      products.map(p => {
        const name = p.name || p.code || p.id || '';
        return {
          label: p.indication ? `${name} (${p.indication})` : name,
          value: String(p.id)
        };
      }),
    [products]
  );

  const studyOptions = useMemo<DefaultOptionType[]>(
    () =>
      studies.map(s => {
        const name = s.name || s.study_code || s.code || s.id || '';
        const meta = [s.phase, s.lifecycleStatus || s.status].filter(Boolean).join(' \u00b7 ');
        return {
          label: meta ? `${name} \u2014 ${meta}` : name,
          value: String(s.id)
        };
      }),
    [studies]
  );

  const analysisOptions = useMemo<DefaultOptionType[]>(
    () =>
      analyses.map(a => {
        const name = a.name || a.code || a.id || '';
        return {
          label: a.status ? `${name} \u2014 ${a.status}` : name,
          value: String(a.id)
        };
      }),
    [analyses]
  );

  // 选中态只显示纯 name
  const productLabelRender = useCallback(
    (option: DefaultOptionType) => {
      const node = products.find(p => String(p.id) === option.value);
      return node?.name || node?.code || String(option.value);
    },
    [products]
  );

  const studyLabelRender = useCallback(
    (option: DefaultOptionType) => {
      const node = studies.find(s => String(s.id) === option.value);
      return node?.name || node?.study_code || node?.code || String(option.value);
    },
    [studies]
  );

  const analysisLabelRender = useCallback(
    (option: DefaultOptionType) => {
      const node = analyses.find(a => String(a.id) === option.value);
      return node?.name || node?.code || String(option.value);
    },
    [analyses]
  );

  return (
    <div
      className={`global-context-selector border-b border-blue-100 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 px-16px py-12px ${className || ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-16px">
          <Text
            className="text-12px"
            type="secondary"
          >
            {t('page.mdr.contextSelector.label')}:
          </Text>

          <Spin
            size="small"
            spinning={loading}
          >
            <Space
              wrap
              size={8}
            >
              {/* Product 选择 */}
              <div className="flex items-center gap-4px">
                <MedicineBoxOutlined className="text-blue-500" />
                <Select
                  labelRender={productLabelRender}
                  onDropdownVisibleChange={(v) => handleDropdownVisibleChange(v, 'product')}
                  options={productOptions}
                  placeholder={t('page.mdr.contextSelector.selectProduct')}
                  popupMatchSelectWidth={false}
                  showSearch
                  size="small"
                  value={context.productId}
                  onChange={handleProductChange}
                />
              </div>

              <span className="text-gray-300">&rarr;</span>

              {/* Study 选择 */}
              <div className="flex items-center gap-4px">
                <ExperimentOutlined className="text-orange-500" />
                <Select
                  disabled={!context.productId}
                  labelRender={studyLabelRender}
                  onDropdownVisibleChange={(v) => handleDropdownVisibleChange(v, 'study')}
                  options={studyOptions}
                  placeholder={t('page.mdr.contextSelector.selectStudy')}
                  popupMatchSelectWidth={false}
                  showSearch
                  size="small"
                  value={context.studyId}
                  onChange={handleStudyChange}
                />
              </div>

              <span className="text-gray-300">&rarr;</span>

              {/* Analysis 选择 */}
              <div className="flex items-center gap-4px">
                <AuditOutlined className="text-purple-500" />
                <Select
                  disabled={!context.studyId}
                  labelRender={analysisLabelRender}
                  onDropdownVisibleChange={(v) => handleDropdownVisibleChange(v, 'analysis')}
                  options={analysisOptions}
                  placeholder={t('page.mdr.contextSelector.selectAnalysis')}
                  popupMatchSelectWidth={false}
                  showSearch
                  size="small"
                  value={context.analysisId}
                  onChange={handleAnalysisChange}
                />
              </div>
            </Space>
          </Spin>
        </div>

        {/* 状态提示 */}
        <div className="flex items-center gap-8px">
          {isAnalysisReady ? (
            <Tag color="success">{t('page.mdr.contextSelector.contextReady')}</Tag>
          ) : isStudyReady ? (
            <Tag color="processing">
              {context.study?.name} - {t('page.mdr.contextSelector.selectAnalysisHint')}
            </Tag>
          ) : context.productId ? (
            <Tag color="warning">
              {context.product?.name} - {t('page.mdr.contextSelector.selectStudyHint')}
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
