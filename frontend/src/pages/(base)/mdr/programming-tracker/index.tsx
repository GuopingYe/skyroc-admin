/**
 * Programming Tracker - 编程任务跟踪器
 *
 * 基于 Product/Study/Analysis 层级的多类型任务管理（SDTM/ADaM/TFL/Other） 使用全局临床上下文 (useClinicalContext) 进行作用域管理 连接后端 API 进行数据持久化
 */
import { Alert, Card, Col, Row, Spin, Typography, message } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useClinicalContext } from '@/features/clinical-context';
import { useUserPermissions } from '@/hooks/business/useUserPermissions';
import { createTrackerTask, deleteTrackerTask, updateTrackerTask } from '@/service/api/mdr';
import { type FrontendTrackerTask, transformToFrontendCreateParams } from '@/service/transforms/tracker';

import { CategoryTabs, TaskFormModal, TrackerTable } from './components';
import { useTrackerState } from './hooks';
import { useTrackerTasks } from './hooks/useTrackerTasks';
import type { IProgrammingTask, TaskCategory } from './mockData';
import { TASK_CATEGORY_ORDER } from './mockData';

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

  // 获取数据库主键 ID (scopeNodeId) 用于 API 调用
  // 后端需要整数 ID，而不是字符串 ID
  const analysisDbId = context.analysis?.scopeNodeId;

  // 使用本地状态管理页面特有状态（仅 activeCategory）
  const { activeCategory, setActiveCategory } = useTrackerState();

  // 使用 useTrackerTasks hook 获取真实数据
  // 使用 scopeNodeId (数据库主键) 而不是字符串 analysisId
  const {
    categoryCounts: allCategoryCounts,
    error: tasksError,
    loading: tasksLoading,
    refresh: refreshTasks,
    tasks: currentTasks
  } = useTrackerTasks(analysisDbId ? String(analysisDbId) : null, activeCategory);

  // Modal 状态
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [operateType, setOperateType] = useState<'add' | 'edit'>('add');
  const [editingTask, setEditingTask] = useState<IProgrammingTask | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // 统计数据 - 从任务列表计算
  const stats = useMemo(() => {
    const result = {
      inProgress: 0,
      notStarted: 0,
      qcPass: 0,
      readyForQC: 0,
      signedOff: 0,
      total: currentTasks.length
    };

    currentTasks.forEach(task => {
      switch (task.status) {
        case 'Signed Off':
          result.signedOff++;
          break;
        case 'QC Pass':
          result.qcPass++;
          break;
        case 'Ready for QC':
          result.readyForQC++;
          break;
        case 'In Progress':
          result.inProgress++;
          break;
        case 'Not Started':
          result.notStarted++;
          break;
      }
    });

    return result;
  }, [currentTasks]);

  // 当上下文完整时，添加到最近访问
  useEffect(() => {
    if (isReady && productId && studyId && analysisId) {
      addRecent({
        analysisId,
        analysisName: `Analysis ${analysisId}`, // TODO: 从上下文获取真实名称
        productId,
        productName: `Product ${productId}`,
        studyId,
        studyName: `Study ${studyId}`
      });
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
        if (operateType === 'add') {
          // 创建新任务 - 使用数据库主键 ID
          const createParams = transformToFrontendCreateParams(
            {
              category: activeCategory as TaskCategory,
              ...values
            } as Partial<FrontendTrackerTask>,
            analysisDbId!, // 使用数据库主键
            userInfo?.userName || 'system'
          );
          await createTrackerTask(createParams as Parameters<typeof createTrackerTask>[0]);
          message.success(t('page.mdr.programmingTracker.createModal.success'));
        } else {
          // 更新任务
          await updateTrackerTask(editingTask?.id || '', {
            ...values,
            updated_by: userInfo?.userName || 'system'
          });
          message.success(t('page.mdr.programmingTracker.editModal.success'));
        }

        closeFormModal();
        refreshTasks(); // 刷新任务列表
      } catch (error) {
        console.error('Submit failed:', error);
        message.error(t('common.operationFailed'));
      } finally {
        setSubmitLoading(false);
      }
    },
    [operateType, editingTask, analysisDbId, activeCategory, t, closeFormModal, refreshTasks, userInfo]
  );

  // 处理删除
  const handleDelete = useCallback(
    async (taskId: string) => {
      try {
        await deleteTrackerTask(taskId);
        message.success(t('page.mdr.programmingTracker.deleteSuccess'));
        refreshTasks(); // 刷新任务列表
      } catch (error) {
        console.error('Delete failed:', error);
        message.error(t('common.operationFailed'));
      }
    },
    [t, refreshTasks]
  );

  // 上下文名称显示
  const contextDisplay = useMemo(() => {
    if (!productId || !studyId || !analysisId) return null;
    return `Product ${productId} / Study ${studyId} / Analysis ${analysisId}`;
  }, [productId, studyId, analysisId]);

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
                <span className="text-12px text-gray-500">{contextDisplay}</span>
              </div>
            }
          >
            {tasksError && (
              <Alert
                showIcon
                className="mb-12px"
                message={tasksError}
                type="error"
              />
            )}
            <TrackerTable
              activeCategory={activeCategory}
              canEdit={isLead}
              loading={tasksLoading}
              tasks={currentTasks as unknown as IProgrammingTask[]}
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
