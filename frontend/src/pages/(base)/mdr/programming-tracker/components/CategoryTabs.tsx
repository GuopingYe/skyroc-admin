/**
 * CategoryTabs - 交付物分类切换组件
 *
 * 按顺序展示：SDTM -> ADaM -> TFL -> Other 修复：所有 Tab 显示正确的任务数量
 */
import {
  BarChartOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  PlusOutlined,
  SettingOutlined,
  TableOutlined
} from '@ant-design/icons';
import { Badge, Button, Space, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { TaskCategory } from '../mockData';
import { TASK_CATEGORY_ORDER } from '../mockData';

interface CategoryTabsProps {
  activeCategory: TaskCategory;
  canAddTask: boolean;
  /** 所有分类的任务数量统计 */
  categoryCounts: Record<TaskCategory, number>;
  onAddTask: () => void;
  onCategoryChange: (category: TaskCategory) => void;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({
  activeCategory,
  canAddTask,
  categoryCounts,
  onAddTask,
  onCategoryChange
}) => {
  const { t } = useTranslation();

  // 获取分类图标
  const getCategoryIcon = (category: TaskCategory) => {
    switch (category) {
      case 'SDTM':
        return <DatabaseOutlined />;
      case 'ADaM':
        return <TableOutlined />;
      case 'TFL':
        return <BarChartOutlined />;
      case 'Other':
        return <FileTextOutlined />;
      default:
        return <SettingOutlined />;
    }
  };

  // Tab 项配置 - 使用 categoryCounts 而不是从 tasks 计算
  const tabItems: TabsProps['items'] = useMemo(
    () =>
      TASK_CATEGORY_ORDER.map(category => ({
        key: category,
        label: (
          <Space size={4}>
            {getCategoryIcon(category)}
            <span>{t(`page.mdr.programmingTracker.category.${category.toLowerCase()}`)}</span>
            <Badge
              showZero
              count={categoryCounts[category] || 0}
              style={{ backgroundColor: '#1890ff' }}
            />
          </Space>
        )
      })),
    [categoryCounts, t]
  );

  return (
    <div className="flex items-center justify-between">
      <Tabs
        activeKey={activeCategory}
        items={tabItems}
        size="small"
        onChange={key => onCategoryChange(key as TaskCategory)}
      />

      {/* 新建按钮 */}
      <Button
        icon={<PlusOutlined />}
        type="primary"
        onClick={onAddTask}
      >
        {t('page.mdr.programmingTracker.addTask')}
      </Button>
    </div>
  );
};

export default CategoryTabs;
