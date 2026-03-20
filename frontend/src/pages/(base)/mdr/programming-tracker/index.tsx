/**
 * Programming Tracker - 编程任务跟踪器
 *
 * 基于 Product/Study/Analysis 层级的多类型任务管理（SDTM/ADaM/TFL/Other） 使用全局临床上下文 (useClinicalContext) 进行作用域管理
 */
import { Card, Col, Row, Typography, message } from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useClinicalContext } from '@/features/clinical-context';
import { useUserPermissions } from '@/hooks/business/useUserPermissions';

import { CategoryTabs, TaskFormModal, TrackerTable } from './components';
import { useTrackerState } from './hooks';
import type { IProgrammingTask, TaskCategory } from './mockData';
import {
  TASK_CATEGORY_ORDER,
  getAnalysisById,
  getProductById,
  getStudyById,
  getTaskStats,
  getTasksByCategory
} from './mockData';

const { Title } = Typography;

// 路由 handle 导出
export const handle = {
  i18nKey: 'route.(base)_mdr_programming-tracker',
  icon: 'mdi:list-status',
  order: 3,
  title: 'Programming Tracker'
};

const ProgrammingTracker: React.FC = () => {
  const { t } = useTranslation();
  const { hasRole, isSuperAdmin, userInfo } = useUserPermissions();

  // 权限检查 - Lead 角色或任何已登录用户可以编辑
  // 开发阶段暂时允许所有已登录用户编辑
  const isLead = isSuperAdmin || hasRole('Study Lead' as never) || Boolean(userInfo);

  // 使用全局临床上下文
  const { addRecent, analysisId, context, isReady, productId, studyId } = useClinicalContext();

  // 使用本地状态管理页面特有状态（仅 activeCategory）
  const { activeCategory, setActiveCategory } = useTrackerState();

  // Modal 状态
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [operateType, setOperateType] = useState<'add' | 'edit'>('add');
  const [editingTask, setEditingTask] = useState<IProgrammingTask | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // 获取所有分类的任务数量（修复 Tab Badge 问题）
  const allCategoryCounts = useMemo(() => {
    const counts: Record<TaskCategory, number> = {
      ADaM: 0,
      Other: 0,
      SDTM: 0,
      TFL: 0
    };

    if (!isReady) return counts;

    // 遍历所有分类获取任务数量
    TASK_CATEGORY_ORDER.forEach(category => {
      const tasks = getTasksByCategory(category, analysisId!);
      counts[category] = tasks.length;
    });

    return counts;
  }, [isReady, analysisId]);

  // 当前分类的任务列表
  const currentTasks = useMemo(() => {
    if (!isReady || !analysisId) return [];
    return getTasksByCategory(activeCategory, analysisId);
  }, [activeCategory, isReady, analysisId]);

  // 统计数据
  const stats = useMemo(() => getTaskStats(currentTasks), [currentTasks]);

  // 当上下文完整时，添加到最近访问
  useEffect(() => {
    if (isReady && productId && studyId && analysisId) {
      const product = getProductById(productId);
      const study = getStudyById(studyId);
      const analysis = getAnalysisById(analysisId);

      if (product && study && analysis) {
        addRecent({
          analysisId,
          analysisName: analysis.name,
          productId,
          productName: product.name,
          studyId,
          studyName: study.name
        });
      }
    }
  }, [productId, studyId, analysisId, isReady, addRecent]);

  // 打开创建 Modal
  const openCreateModal = useCallback(() => {
    setOperateType('add');
    setEditingTask(null);
    setFormModalOpen(true);
  }, []);

  // 打开编辑 Modal
  const openEditModal = useCallback((task: IProgrammingTask) => {
    setOperateType('edit');
    setEditingTask(task);
    setFormModalOpen(true);
  }, []);

  // 关闭 Modal
  const closeFormModal = useCallback(() => {
    setFormModalOpen(false);
    setEditingTask(null);
  }, []);

  // 处理提交
  const handleSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      setSubmitLoading(true);
      try {
        // 模拟 API 调用
        await new Promise<void>(resolve => {
          setTimeout(resolve, 500);
        });

        if (operateType === 'add') {
          // eslint-disable-next-line no-console
          console.log('Create task:', {
            analysisId: context.analysisId,
            ...values
          });
          message.success(t('page.mdr.programmingTracker.createModal.success'));
        } else {
          // eslint-disable-next-line no-console
          console.log('Edit task:', { id: editingTask?.id, ...values });
          message.success(t('page.mdr.programmingTracker.editModal.success'));
        }

        closeFormModal();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Submit failed:', error);
        message.error(t('common.operationFailed'));
      } finally {
        setSubmitLoading(false);
      }
    },
    [operateType, editingTask, analysisId, t, closeFormModal]
  );

  // 处理删除
  const handleDelete = useCallback(
    async (taskId: string) => {
      try {
        // 模拟 API 调用
        await new Promise<void>(resolve => {
          setTimeout(resolve, 300);
        });
        // eslint-disable-next-line no-console
        console.log('Delete task:', taskId);
        message.success(t('page.mdr.programmingTracker.deleteSuccess'));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Delete failed:', error);
        message.error(t('common.operationFailed'));
      }
    },
    [t]
  );

  return (
    <div className="h-full flex flex-col gap-12px overflow-hidden">
      {/* 主体内容 - 只有选择完整上下文后才显示 */}
      {isReady ? (
        <>
          {/* 分类切换 Tabs */}
          <CategoryTabs
            activeCategory={activeCategory}
            canAddTask={isLead}
            categoryCounts={allCategoryCounts}
            onAddTask={openCreateModal}
            onCategoryChange={setActiveCategory}
          />

          {/* 统计看板 */}
          <Row gutter={16}>
            <Col span={4}>
              <Card
                className="card-wrapper text-center"
                size="small"
              >
                <div className="text-24px text-blue-600 font-bold">{stats.total}</div>
                <div className="text-12px text-gray-500">{t('page.mdr.programmingTracker.stats.total')}</div>
              </Card>
            </Col>
            <Col span={4}>
              <Card
                className="card-wrapper text-center"
                size="small"
              >
                <div className="text-24px text-green-600 font-bold">{stats.signedOff + stats.qcPass}</div>
                <div className="text-12px text-gray-500">{t('page.mdr.programmingTracker.stats.completed')}</div>
              </Card>
            </Col>
            <Col span={4}>
              <Card
                className="card-wrapper text-center"
                size="small"
              >
                <div className="text-24px text-orange-600 font-bold">{stats.readyForQC}</div>
                <div className="text-12px text-gray-500">{t('page.mdr.programmingTracker.stats.inQC')}</div>
              </Card>
            </Col>
            <Col span={4}>
              <Card
                className="card-wrapper text-center"
                size="small"
              >
                <div className="text-24px text-purple-600 font-bold">{stats.signedOff}</div>
                <div className="text-12px text-gray-500">{t('page.mdr.programmingTracker.stats.signedOff')}</div>
              </Card>
            </Col>
            <Col span={4}>
              <Card
                className="card-wrapper text-center"
                size="small"
              >
                <div className="text-24px text-gray-600 font-bold">{stats.inProgress}</div>
                <div className="text-12px text-gray-500">{t('page.mdr.programmingTracker.stats.inProgress')}</div>
              </Card>
            </Col>
            <Col span={4}>
              <Card
                className="card-wrapper text-center"
                size="small"
              >
                <div className="text-default-600 text-24px font-bold">{stats.notStarted}</div>
                <div className="text-12px text-gray-500">{t('page.mdr.programmingTracker.stats.notStarted')}</div>
              </Card>
            </Col>
          </Row>

          {/* 任务表格 */}
          <Card
            className="flex flex-col flex-1 overflow-hidden card-wrapper"
            size="small"
            variant="borderless"
            title={
              <div className="flex items-center gap-8px">
                <Title
                  className="m-0"
                  level={4}
                >
                  {t('page.mdr.programmingTracker.title')}
                </Title>
                <span className="text-12px text-gray-500">
                  {getProductById(productId!)?.name} / {getStudyById(studyId!)?.name} /{' '}
                  {getAnalysisById(analysisId!)?.name}
                </span>
              </div>
            }
          >
            <TrackerTable
              activeCategory={activeCategory}
              canEdit={isLead}
              loading={false}
              tasks={currentTasks}
              onDelete={handleDelete}
              onEdit={openEditModal}
            />
          </Card>
        </>
      ) : (
        /* 未选择完整上下文时的提示 */
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="mb-16px text-48px">📋</div>
            <div className="text-16px">{t('page.mdr.programmingTracker.context.selectRequired')}</div>
            <div className="mt-8px text-12px">{t('page.mdr.programmingTracker.context.selectHint')}</div>
          </div>
        </div>
      )}

      {/* 任务表单 Modal */}
      <TaskFormModal
        editingTask={editingTask}
        loading={submitLoading}
        open={formModalOpen}
        operateType={operateType}
        taskCategory={activeCategory}
        onCancel={closeFormModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default ProgrammingTracker;
