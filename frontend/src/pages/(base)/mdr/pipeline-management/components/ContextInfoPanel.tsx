/**
 * ContextInfoPanel - 上下文信息面板
 *
 * 显示当前选中的 Product/Study/Analysis 详细信息
 */
import { Card, Descriptions, Space, Tag } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface ContextInfoPanelProps {
  analysisId: string | null;
  analysisName?: string;
  productId: string | null;
  productName?: string;
  studyId: string | null;
  studyName?: string;
}

const ContextInfoPanel: React.FC<ContextInfoPanelProps> = ({
  analysisId,
  analysisName,
  productId,
  productName,
  studyId,
  studyName
}) => {
  const { t } = useTranslation();

  if (!productId && !studyId && !analysisId) {
    return null;
  }

  return (
    <Card
      className="card-wrapper from-blue-50 to-purple-50 bg-gradient-to-r"
      size="small"
      variant="borderless"
    >
      <div className="flex items-center gap-16px">
        <div className="flex items-center gap-8px">
          <div className="i-mdi-folder-network text-20px text-blue-600" />
          <span className="text-gray-600 font-medium">{t('page.mdr.pipelineManagement.context.scope')}:</span>
        </div>

        <Space size={4}>
          {productId && (
            <Tag
              className="px-8px py-2px text-13px"
              color="blue"
            >
              <div className="i-mdi-cube-outline mr-4px inline-block" />
              {productName || productId}
            </Tag>
          )}
          {studyId && (
            <>
              <div className="i-mdi-chevron-right text-gray-400" />
              <Tag
                className="px-8px py-2px text-13px"
                color="orange"
              >
                <div className="i-mdi-folder-outline mr-4px inline-block" />
                {studyName || studyId}
              </Tag>
            </>
          )}
          {analysisId && (
            <>
              <div className="i-mdi-chevron-right text-gray-400" />
              <Tag
                className="px-8px py-2px text-13px"
                color="purple"
              >
                <div className="i-mdi-chart-timeline-variant mr-4px inline-block" />
                {analysisName || analysisId}
              </Tag>
            </>
          )}
        </Space>
      </div>
    </Card>
  );
};

export default ContextInfoPanel;
