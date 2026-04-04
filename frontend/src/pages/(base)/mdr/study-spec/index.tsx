/**
 * Study Spec - 项目规范 数据规范定义页面
 *
 * 架构说明：
 *
 * - Study Spec 是所有目标变量的"源头"
 * - 左树右表布局：Datasets -> Variables
 * - Origin 属性用不同颜色 Tag 标识
 * - 支持行拖拽排序调整变量顺序
 * - 使用全局临床上下文 (useClinicalContext) 进行作用域管理
 * - 通过 scopeNodeId 关联到后端 ScopeNode 进行数据过滤
 * - Draft store (command pattern) enables undo/redo and staged saves
 */
import {
  BookOutlined,
  DeleteOutlined,
  DragOutlined,
  EditOutlined,
  LoadingOutlined,
  PlusOutlined,
  RedoOutlined,
  RollbackOutlined,
  SearchOutlined,
  TableOutlined,
  UndoOutlined,
  UploadOutlined
} from '@ant-design/icons';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Input,
  List,
  Popconfirm,
  Segmented,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useClinicalContext, useStudyScopeNodeId } from '@/features/clinical-context';
import { addDatasetFromGlobalLibrary, createCustomDataset, deleteDataset, patchDataset } from '@/service/api';
import { useStudyDatasets, useStudySpecs, useStudyVariables } from '@/service/hooks';

import type { SpecVariable, StandardType, VariableOrigin } from './mockData';
import { originConfig } from './mockData';
import { AddDatasetModal, VariableFormDrawer } from './modules';
import { DomainPickerWizard } from './components/DomainPickerWizard';
import { DomainEditDrawer } from './components/DomainEditDrawer';
import { PushUpstreamModal } from './components/PushUpstreamModal';
import { SaveChangesModal } from './components/SaveChangesModal';
import { ScopeSwitcher } from './components/ScopeSwitcher';
import { useInitializeSpec } from '@/service/hooks/useStudySpec';
import {
  type DomainDraft,
  type DraftStatus,
  computeDiff,
  datasetToDomainDraft,
  getDomainDraftStore,
  hasPendingChanges,
  pendingChangeCount,
} from './store/domainDraftStore';

const { Text, Title } = Typography;

/** API origin_type to frontend display origin mapping */
const ORIGIN_TYPE_MAP: Record<string, VariableOrigin> = {
  CDISC: 'Assigned',
  Sponsor_Standard: 'Derived',
  Study_Custom: 'Protocol',
  TA_Standard: 'Assigned'
};

/** Status-based border/style for domain list items */
const statusStyle = (status: DraftStatus): React.CSSProperties => ({
  borderLeft:
    status === 'added'
      ? '3px solid #52c41a'
      : status === 'modified'
        ? '3px solid #1677ff'
        : status === 'deleted'
          ? '3px solid #ff4d4f'
          : '3px solid transparent',
  opacity: status === 'deleted' ? 0.6 : 1,
  textDecoration: status === 'deleted' ? 'line-through' : 'none',
  padding: '4px 8px',
});

/** 可拖拽行组件 */
interface SortableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string;
}

const SortableRow: React.FC<SortableRowProps> = props => {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: props['data-row-key']
  });

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(transform && { ...transform, y: transform.y }),
    transition,
    ...(isDragging ? { background: '#fafafa', position: 'relative', zIndex: 9999 } : {})
  };

  return (
    <tr
      {...props}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      {props.children}
    </tr>
  );
};

// 路由 handle 导出
export const handle = {
  i18nKey: 'route.(base)_mdr_study-spec',
  icon: 'mdi:file-document-outline',
  order: 1,
  title: 'Study Spec'
};

const StudySpec: React.FC = () => {
  const { t } = useTranslation();

  // 使用全局临床上下文
  const { isStudyReady } = useClinicalContext();
  const scopeNodeId = useStudyScopeNodeId();

  // 标准类型切换 (SDTM / ADaM)
  const [selectedStandard, setSelectedStandard] = useState<StandardType>('SDTM');

  // 选中的 Dataset ID
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);

  // 左侧搜索
  const [searchText, setSearchText] = useState('');

  // 各 Dataset 的变量列表状态（用于拖拽排序）
  const [variableStates, setVariableStates] = useState<Record<string, SpecVariable[]>>({});

  // 溯源 Drawer 状态
  const [traceDrawerOpen, setTraceDrawerOpen] = useState(false);
  const [traceVariable, setTraceVariable] = useState<SpecVariable | null>(null);

  // 表单 Drawer 状态
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [operateType, setOperateType] = useState<'add' | 'edit'>('add');
  const [editingVariable, setEditingVariable] = useState<SpecVariable | null>(null);

  // Loading 状态
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  // Add Dataset Modal 状态
  const [addDatasetModalOpen, setAddDatasetModalOpen] = useState(false);
  const [addDatasetLoading, setAddDatasetLoading] = useState(false);

  // Analysis scope switcher state
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);

  // Domain picker wizard state
  const [domainPickerOpen, setDomainPickerOpen] = useState(false);

  // Push upstream modal state
  const [pushUpstreamOpen, setPushUpstreamOpen] = useState(false);

  // Query Client for cache invalidation
  const queryClient = useQueryClient();

  // Initialize spec mutation
  const initializeSpec = useInitializeSpec();

  // ==================== API Hooks ====================

  // 获取 Study Spec 列表（按 scopeNodeId 过滤）
  const {
    data: specsData,
    error: specsError,
    isLoading: specsLoading
  } = useStudySpecs(scopeNodeId ? { scope_node_id: scopeNodeId } : undefined);

  // Debug: log any errors
  useEffect(() => {
    if (specsError) {
      // eslint-disable-next-line no-console
      console.error('[Study Spec] API Error:', specsError);
    }
  }, [specsError]);

  // 根据 standard 类型筛选当前 spec
  const currentSpec = useMemo(() => {
    if (!specsData?.items) return null;
    return specsData.items.find(s => s.spec_type === selectedStandard) || specsData.items[0] || null;
  }, [specsData, selectedStandard]);

  // 获取数据集列表
  const { data: datasetsData, isLoading: datasetsLoading } = useStudyDatasets(currentSpec?.id ?? null);

  // 获取变量列表
  const { data: variablesData } = useStudyVariables(selectedDatasetId);

  // ---- Draft store (command pattern, persisted to localStorage) ----
  const specIdStr = currentSpec ? String(currentSpec.id) : null;
  const draftStore = specIdStr ? getDomainDraftStore(specIdStr) : null;

  // Force re-render when draft store changes
  const [, setDraftVersion] = React.useState(0);
  React.useEffect(() => {
    if (!draftStore) return;
    return draftStore.subscribe(() => setDraftVersion(v => v + 1));
  }, [draftStore]);

  const draftCurrent = draftStore?.getState().current ?? [];
  const draftPast = draftStore?.getState().past ?? [];
  const draftFuture = draftStore?.getState().future ?? [];
  const isDirty = hasPendingChanges(draftCurrent);
  const changeCount = pendingChangeCount(draftCurrent);

  // Edit drawer state
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<DomainDraft | null>(null);
  const [editingDatasetId, setEditingDatasetId] = useState<number | null>(null);

  // Save modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // 当 spec 变化时，重置到第一个 Dataset，同时初始化 draft store baseline
  useEffect(() => {
    if (datasetsData?.items?.length && datasetsData.items.length > 0) {
      setSelectedDatasetId(datasetsData.items[0].id);
      if (draftStore) {
        const drafts = datasetsData.items.map(datasetToDomainDraft);
        draftStore.getState().initBaseline(drafts);
      }
    } else {
      setSelectedDatasetId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSpec?.id, datasetsData?.items]);

  // 转换数据集数据为前端格式 (now DomainDraft[])
  const filteredDatasets = useMemo((): DomainDraft[] => {
    // Use draft-aware list when available, fall back to API data
    const source: DomainDraft[] =
      draftCurrent.length > 0
        ? draftCurrent
        : (datasetsData?.items ?? []).map(datasetToDomainDraft);
    if (!searchText) return source;
    const kw = searchText.toLowerCase();
    return source.filter(
      d => d.domain_name.toLowerCase().includes(kw) || d.domain_label.toLowerCase().includes(kw)
    );
  }, [draftCurrent, datasetsData?.items, searchText]);

  // 转换变量数据为前端格式
  const currentVariables = useMemo((): SpecVariable[] => {
    const stateKey = String(selectedDatasetId);
    if (variableStates[stateKey]) {
      return variableStates[stateKey];
    }
    if (!variablesData?.items) return [];
    return variablesData.items.map(v => ({
      codelist: v.codelist_name ?? undefined,
      comment: v.description || '',
      core: v.core,
      dataType: v.data_type === 'Char' ? 'Char' : v.data_type === 'Num' ? 'Num' : 'DateTime',
      globalLibraryRef: v.base_id ? String(v.base_id) : undefined,
      implementationNotes: '',
      key: String(v.id),
      label: v.variable_label || '',
      length: v.length || 0,
      name: v.variable_name,
      order: v.sort_order,
      origin: ORIGIN_TYPE_MAP[v.origin_type] || 'Assigned',
      role: v.role || '',
      sourceDerivation: ''
    }));
  }, [variablesData, selectedDatasetId, variableStates]);

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1 // 需要移动 1px 才触发拖拽
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // 处理拖拽结束
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const stateKey = String(selectedDatasetId);
        setVariableStates(prev => {
          const currentList = prev[stateKey] || currentVariables;
          const oldIndex = currentList.findIndex(item => item.key === active.id);
          const newIndex = currentList.findIndex(item => item.key === over.id);

          if (oldIndex === -1 || newIndex === -1) return prev;

          const newList = arrayMove(currentList, oldIndex, newIndex).map((item, index) => ({
            ...item,
            order: index + 1
          }));

          return {
            ...prev,
            [stateKey]: newList
          };
        });

        message.success(t('page.mdr.studySpec.sortSuccess'));
      }
    },
    [selectedDatasetId, currentVariables, t]
  );

  // 打开新增变量 Drawer
  const openAddDrawer = useCallback(() => {
    setOperateType('add');
    setEditingVariable(null);
    setFormDrawerOpen(true);
  }, []);

  // 打开编辑变量 Drawer
  const openEditDrawer = useCallback((variable: SpecVariable) => {
    setOperateType('edit');
    setEditingVariable(variable);
    setFormDrawerOpen(true);
  }, []);

  // 关闭表单 Drawer
  const closeFormDrawer = useCallback(() => {
    setFormDrawerOpen(false);
    setEditingVariable(null);
  }, []);

  // 处理提交（新增/编辑）
  const handleSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      setSubmitLoading(true);
      try {
        // TODO: 调用真实的 API
        await new Promise<void>(resolve => {
          setTimeout(resolve, 500);
        });

        if (operateType === 'add') {
          // eslint-disable-next-line no-console
          console.log('Create variable:', { datasetId: selectedDatasetId, standard: selectedStandard, ...values });
          message.success(t('page.mdr.studySpec.addSuccess'));
        } else {
          // eslint-disable-next-line no-console
          console.log('Edit variable:', { id: editingVariable?.key, ...values });
          message.success(t('page.mdr.studySpec.editDrawer.saveSuccess'));
        }

        closeFormDrawer();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Submit failed:', error);
        message.error(t('common.operationFailed'));
      } finally {
        setSubmitLoading(false);
      }
    },
    [operateType, editingVariable, selectedDatasetId, selectedStandard, t, closeFormDrawer]
  );

  // 处理删除变量
  const handleDelete = useCallback(
    async (variableId: number) => {
      setDeleteLoading(variableId);
      try {
        // TODO: 调用真实的 API
        await new Promise<void>(resolve => {
          setTimeout(resolve, 300);
        });
        // eslint-disable-next-line no-console
        console.log('Delete variable:', variableId);
        message.success(t('page.mdr.studySpec.deleteSuccess'));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Delete failed:', error);
        message.error(t('common.operationFailed'));
      } finally {
        setDeleteLoading(null);
      }
    },
    [t]
  );

  // 处理添加 Dataset
  const handleAddDataset = useCallback(
    async (values: { data: Record<string, unknown>; type: 'custom' | 'global_library' }) => {
      if (!currentSpec?.id) {
        message.error('No specification selected');
        return;
      }

      setAddDatasetLoading(true);
      try {
        let newDataset: Api.StudySpec.StudyDatasetListItem | null = null;

        if (values.type === 'global_library') {
          const result = await addDatasetFromGlobalLibrary(currentSpec.id, {
            base_dataset_id: values.data.base_dataset_id as number
          });
          message.success(result.message || t('page.mdr.studySpec.addDataset.success'));
          // result may carry the new dataset; shape depends on API
          newDataset = (result as any).dataset ?? null;
        } else {
          const result = await createCustomDataset(currentSpec.id, {
            class_type: values.data.class_type as string,
            domain_label: values.data.domain_label as string,
            domain_name: values.data.domain_name as string,
            inherit_from_model: values.data.inherit_from_model as boolean
          });
          message.success(result.message || t('page.mdr.studySpec.addDataset.success'));
          newDataset = (result as any).dataset ?? null;
        }

        // Sync into draft store if we have the returned dataset
        if (draftStore && newDataset) {
          const draft: DomainDraft = {
            _status: 'added',
            class_type: newDataset.class_type,
            comments: '',
            domain_label: newDataset.description ?? '',
            domain_name: newDataset.dataset_name,
            id: String(newDataset.id),
            key_variables: [],
            origin: newDataset.base_id ? 'global_library' : 'custom',
            sort_variables: [],
            structure: '',
          };
          draftStore.getState().dispatch({ payload: draft, type: 'ADD_DOMAIN' });
        }

        // 刷新数据集列表
        queryClient.invalidateQueries({
          queryKey: ['studySpec', 'datasets', currentSpec.id]
        });

        setAddDatasetModalOpen(false);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Add dataset failed:', error);
        message.error(t('common.operationFailed'));
      } finally {
        setAddDatasetLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentSpec?.id, draftStore, queryClient, t]
  );

  // Save sequence handler
  const handleConfirmSave = async () => {
    if (!currentSpec || !draftStore) return;
    const { baseline, current } = draftStore.getState();
    const diff = computeDiff(baseline, current);
    setSaveLoading(true);

    try {
      // NOTE: diff.added domains are NOT processed here because AddDatasetModal calls
      // the backend API immediately when a domain is added (createCustomDataset /
      // addDatasetFromGlobalLibrary). The ADD_DOMAIN dispatch that follows only records
      // the real backend ID into the draft store for display tracking (green border, undo).
      // By save time, added domains are already persisted — commitSave() below simply
      // transitions their _status from 'added' to 'unchanged'.

      // Process EDITED domains
      for (const { after } of diff.modified) {
        await patchDataset(currentSpec.id, Number(after.id), {
          class_type: after.class_type,
          comments: after.comments,
          domain_label: after.domain_label,
          domain_name: after.domain_name,
          key_variables: after.key_variables,
          sort_variables: after.sort_variables,
          structure: after.structure,
        });
      }

      // Process DELETED domains (skip temp IDs that were never persisted)
      for (const domain of diff.deleted) {
        if (domain.id.startsWith('new-')) continue;
        await deleteDataset(currentSpec.id, Number(domain.id));
      }

      draftStore.getState().commitSave();
      queryClient.invalidateQueries({ queryKey: ['studySpec'] });
      message.success('Changes saved successfully');
      setSaveModalOpen(false);
    } catch {
      message.error('Save failed. Your draft has been preserved — please retry.');
    } finally {
      setSaveLoading(false);
    }
  };

  // 当前 Dataset 信息 (从 API 数据中获取用于右侧详情)
  const currentDatasetInfo = useMemo(() => {
    if (!datasetsData?.items || !selectedDatasetId) return null;
    const dataset = datasetsData.items.find(d => d.id === selectedDatasetId);
    if (!dataset) return null;
    return {
      class: dataset.class_type,
      key: String(dataset.id),
      keys: [],
      label: dataset.description || '',
      name: dataset.dataset_name,
      structure: ''
    };
  }, [datasetsData, selectedDatasetId]);

  // Origin 统计
  const originStats = useMemo(() => {
    const stats: Record<VariableOrigin, number> = { Assigned: 0, CRF: 0, Derived: 0, Protocol: 0 };
    currentVariables.forEach(v => {
      stats[v.origin]++;
    });
    return stats;
  }, [currentVariables]);

  // 动态表格列
  const columns: ColumnsType<SpecVariable> = useMemo(
    () => [
      {
        className: 'drag-handle-cell',
        key: 'dragHandle',
        render: () => <DragOutlined className="cursor-grab text-gray-400 hover:text-blue-500" />,
        title: '',
        width: 40
      },
      {
        dataIndex: 'name',
        fixed: 'left',
        key: 'name',
        render: (text: string, record: SpecVariable) => (
          <Space size={4}>
            <Text code>{text}</Text>
            {record.globalLibraryRef && (
              <Tooltip title={t('page.mdr.studySpec.traceGlobalLibrary')}>
                <BookOutlined
                  className="cursor-pointer text-blue-500 hover:text-blue-600"
                  onClick={e => {
                    e.stopPropagation();
                    setTraceVariable(record);
                    setTraceDrawerOpen(true);
                  }}
                />
              </Tooltip>
            )}
          </Space>
        ),
        title: t('page.mdr.studySpec.cols.variableName'),
        width: 120
      },
      {
        dataIndex: 'label',
        ellipsis: true,
        key: 'label',
        title: t('page.mdr.studySpec.cols.label'),
        width: 200
      },
      {
        dataIndex: 'dataType',
        key: 'dataType',
        render: (text: string) => (
          <Tag color={text === 'Num' ? 'orange' : text === 'DateTime' ? 'purple' : 'default'}>{text}</Tag>
        ),
        title: t('page.mdr.studySpec.cols.dataType'),
        width: 80
      },
      {
        align: 'center',
        dataIndex: 'length',
        key: 'length',
        title: t('page.mdr.studySpec.cols.length'),
        width: 60
      },
      {
        dataIndex: 'origin',
        key: 'origin',
        render: (origin: VariableOrigin) => {
          const config = originConfig[origin];
          return (
            <Tooltip title={config.description}>
              <Tag color={config.color}>{config.label}</Tag>
            </Tooltip>
          );
        },
        title: t('page.mdr.studySpec.cols.origin'),
        width: 90
      },
      {
        dataIndex: 'role',
        ellipsis: true,
        key: 'role',
        title: t('page.mdr.studySpec.cols.role'),
        width: 120
      },
      {
        align: 'center',
        dataIndex: 'core',
        key: 'core',
        render: (core: string) => (
          <Tag color={core === 'Req' ? 'red' : core === 'Exp' ? 'orange' : 'default'}>{core}</Tag>
        ),
        title: t('page.mdr.studySpec.cols.core'),
        width: 60
      },
      {
        dataIndex: 'codelist',
        key: 'codelist',
        render: (text?: string) => (text ? <Tag color="cyan">{text}</Tag> : <span className="text-gray-300">-</span>),
        title: t('page.mdr.studySpec.cols.codelist'),
        width: 100
      },
      {
        dataIndex: 'sourceDerivation',
        ellipsis: true,
        key: 'sourceDerivation',
        render: (text?: string) =>
          text ? (
            <Tooltip title={text}>
              <span className="text-gray-600">{text}</span>
            </Tooltip>
          ) : (
            <span className="text-gray-300">-</span>
          ),
        title: t('page.mdr.studySpec.cols.sourceDerivation'),
        width: 150
      },
      {
        dataIndex: 'implementationNotes',
        ellipsis: true,
        key: 'implementationNotes',
        render: (text?: string) =>
          text ? (
            <Tooltip title={text}>
              <span className="text-gray-600">{text}</span>
            </Tooltip>
          ) : (
            <span className="text-gray-300">-</span>
          ),
        title: t('page.mdr.studySpec.cols.implementationNotes'),
        width: 150
      },
      {
        dataIndex: 'comment',
        ellipsis: true,
        key: 'comment',
        render: (text?: string) =>
          text ? (
            <Tooltip title={text}>
              <span className="text-gray-600">{text}</span>
            </Tooltip>
          ) : (
            <span className="text-gray-300">-</span>
          ),
        title: t('page.mdr.studySpec.cols.comment'),
        width: 150
      },
      {
        fixed: 'right',
        key: 'action',
        render: (_: unknown, record: SpecVariable) => (
          <Space size={0}>
            <Button
              icon={<EditOutlined />}
              size="small"
              type="link"
              onClick={() => openEditDrawer(record)}
            >
              {t('page.mdr.studySpec.edit')}
            </Button>
            <Popconfirm
              cancelText={t('page.mdr.programmingTracker.popconfirm.cancel')}
              okButtonProps={{ loading: deleteLoading === Number(record.key) }}
              okText={t('page.mdr.programmingTracker.popconfirm.confirm')}
              title={t('page.mdr.studySpec.confirmDelete')}
              onConfirm={() => handleDelete(Number(record.key))}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={deleteLoading === Number(record.key)}
                size="small"
                type="link"
              >
                {t('page.mdr.studySpec.delete')}
              </Button>
            </Popconfirm>
          </Space>
        ),
        title: t('page.mdr.studySpec.cols.action'),
        width: 120
      }
    ],
    [t, openEditDrawer, handleDelete, deleteLoading]
  );

  return (
    <div className="h-full flex flex-col gap-12px overflow-hidden">
      {/* 未选择 Study 上下文时的提示 */}
      {!isStudyReady && (
        <div className="border border-yellow-100 rounded-lg bg-yellow-50 px-16px py-12px text-center text-gray-500">
          <div className="text-14px">{t('page.mdr.studySpec.scopeContext.selectHint')}</div>
        </div>
      )}

      {/* 顶部标题栏 */}
      <Card
        className="card-wrapper"
        size="small"
        variant="borderless"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-12px">
            <TableOutlined className="text-20px text-blue-600" />
            <Title
              className="m-0"
              level={4}
            >
              {t('page.mdr.studySpec.title')}
            </Title>
            {/* 标准类型切换器 */}
            <Segmented
              size="small"
              value={selectedStandard}
              options={[
                { label: 'SDTM Spec', value: 'SDTM' },
                { label: 'ADaM Spec', value: 'ADaM' }
              ]}
              onChange={value => setSelectedStandard(value as StandardType)}
            />
            {/* Analysis scope switcher */}
            <ScopeSwitcher
              analyses={[]}
              selectedAnalysisId={selectedAnalysisId}
              onChange={setSelectedAnalysisId}
            />
          </div>
          <div className="flex items-center gap-16px">
            {/* Push Upstream button */}
            {currentSpec && (
              <Button
                icon={<UploadOutlined />}
                size="small"
                onClick={() => setPushUpstreamOpen(true)}
              >
                Push Upstream
              </Button>
            )}
            {/* Origin 图例 */}
            <Space size={4}>
              {Object.entries(originConfig).map(([key, config]) => (
                <Tooltip
                  key={key}
                  title={config.description}
                >
                  <Tag color={config.color}>{config.label}</Tag>
                </Tooltip>
              ))}
            </Space>
          </div>
        </div>
      </Card>

      {/* 主展示区: 左右布局 */}
      <div className="min-h-0 flex flex-1 gap-12px overflow-hidden">
        {/* 左侧导航 */}
        <Card
          className="w-280px flex flex-col flex-shrink-0 overflow-hidden card-wrapper"
          size="small"
          variant="borderless"
        >
          <div className="mb-8px flex gap-8px">
            <Input
              allowClear
              className="flex-1"
              placeholder={t('page.mdr.studySpec.searchDataset')}
              prefix={<SearchOutlined className="text-gray-400" />}
              size="small"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
            {/* Initialize Spec trigger — shown when study is ready but no spec exists yet */}
            {scopeNodeId && !currentSpec && !specsLoading && (
              <Button
                icon={<PlusOutlined />}
                size="small"
                type="dashed"
                onClick={() => setDomainPickerOpen(true)}
              >
                Initialize Spec
              </Button>
            )}
          </div>

          {/* Undo / Redo / Add / Save toolbar */}
          <Space style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <Tooltip title="Undo">
                <Button
                  disabled={draftPast.length === 0}
                  icon={<UndoOutlined />}
                  onClick={() => draftStore?.getState().undo()}
                  size="small"
                />
              </Tooltip>
              <Tooltip title="Redo">
                <Button
                  disabled={draftFuture.length === 0}
                  icon={<RedoOutlined />}
                  onClick={() => draftStore?.getState().redo()}
                  size="small"
                />
              </Tooltip>
            </Space>
            <Space>
              <Button
                icon={<PlusOutlined />}
                onClick={() => setAddDatasetModalOpen(true)}
                size="small"
                title={t('page.mdr.studySpec.addDataset.title')}
                type="primary"
              >
                Add Domain
              </Button>
              <Badge count={changeCount} size="small">
                <Button
                  disabled={!isDirty}
                  onClick={() => setSaveModalOpen(true)}
                  size="small"
                  type="primary"
                >
                  Save Changes
                </Button>
              </Badge>
            </Space>
          </Space>

          <div className="flex-1 overflow-auto">
            <Text
              strong
              className="mb-8px block text-14px"
            >
              {t('page.mdr.studySpec.datasets')}
            </Text>
            {datasetsLoading ? (
              <div className="flex justify-center py-24px">
                <Spin indicator={<LoadingOutlined spin />} />
              </div>
            ) : filteredDatasets.length === 0 ? (
              <Empty
                className="py-24px"
                description={t('page.mdr.studySpec.noDatasets')}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                dataSource={filteredDatasets}
                size="small"
                renderItem={domain => {
                  const domainNumId = Number(domain.id);
                  const isSelected = selectedDatasetId === domainNumId;
                  const isDeleted = domain._status === 'deleted';

                  return (
                    <List.Item
                      className={`cursor-pointer rounded transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      style={statusStyle(domain._status)}
                      onClick={() => {
                        if (isDeleted) return;
                        setSelectedDatasetId(domainNumId);
                      }}
                    >
                      <div className="w-full flex items-center justify-between">
                        <Space>
                          <Tag color="blue">{domain.domain_name}</Tag>
                          <span className="text-13px">{domain.domain_label}</span>
                        </Space>
                        <Space size={2}>
                          {!isDeleted ? (
                            <>
                              <Tooltip title="Edit domain">
                                <Button
                                  icon={<EditOutlined />}
                                  size="small"
                                  type="text"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setEditingDomain(domain);
                                    setEditingDatasetId(domainNumId);
                                    setEditDrawerOpen(true);
                                  }}
                                />
                              </Tooltip>
                              <Tooltip title="Delete domain">
                                <Button
                                  danger
                                  icon={<DeleteOutlined />}
                                  size="small"
                                  type="text"
                                  onClick={e => {
                                    e.stopPropagation();
                                    draftStore?.getState().dispatch({
                                      payload: { id: domain.id, snapshot: domain },
                                      type: 'DELETE_DOMAIN',
                                    });
                                  }}
                                />
                              </Tooltip>
                            </>
                          ) : (
                            <Tooltip title="Restore domain">
                              <Button
                                icon={<RollbackOutlined />}
                                size="small"
                                type="text"
                                onClick={e => {
                                  e.stopPropagation();
                                  draftStore?.getState().dispatch({
                                    payload: { id: domain.id, snapshot: domain },
                                    type: 'RESTORE_DOMAIN',
                                  });
                                }}
                              />
                            </Tooltip>
                          )}
                        </Space>
                      </div>
                    </List.Item>
                  );
                }}
              />
            )}
          </div>
        </Card>

        {/* 右侧详情表格 */}
        <DndContext
          collisionDetection={closestCenter}
          sensors={sensors}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={currentVariables.map(v => v.key)}
            strategy={verticalListSortingStrategy}
          >
            <Card
              className="min-w-0 flex flex-col flex-1 overflow-hidden card-wrapper"
              size="small"
              variant="borderless"
              extra={
                <Space size={8}>
                  <Button
                    icon={<PlusOutlined />}
                    size="small"
                    type="primary"
                    onClick={openAddDrawer}
                  >
                    {t('page.mdr.studySpec.addVariable')}
                  </Button>
                  <Text
                    className="text-12px"
                    type="secondary"
                  >
                    {t('page.mdr.studySpec.totalVars', { count: currentVariables.length })}
                  </Text>
                  <Text type="secondary">|</Text>
                  <Text
                    className="text-12px"
                    type="secondary"
                  >
                    <Tag
                      className="m-0 text-10px"
                      color="green"
                    >
                      CRF: {originStats.CRF}
                    </Tag>
                    <Tag
                      className="m-0 ml-4px text-10px"
                      color="orange"
                    >
                      Derived: {originStats.Derived}
                    </Tag>
                    <Tag
                      className="m-0 ml-4px text-10px"
                      color="blue"
                    >
                      Assigned: {originStats.Assigned}
                    </Tag>
                  </Text>
                </Space>
              }
              title={
                <Space>
                  <Text
                    strong
                    className="text-14px"
                  >
                    {t('page.mdr.studySpec.variables')}
                  </Text>
                  {currentDatasetInfo && (
                    <>
                      <Tag color="blue">{currentDatasetInfo.name}</Tag>
                      <Text
                        className="text-12px"
                        type="secondary"
                      >
                        {currentDatasetInfo.label}
                      </Text>
                    </>
                  )}
                </Space>
              }
            >
              {/* Dataset 信息描述 */}
              {currentDatasetInfo && (
                <div className="mb-12px rounded-lg bg-gray-50 p-12px">
                  <Descriptions
                    column={4}
                    size="small"
                  >
                    <Descriptions.Item label={t('page.mdr.studySpec.class')}>
                      {currentDatasetInfo.class}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('page.mdr.studySpec.structure')}>
                      {currentDatasetInfo.structure}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('page.mdr.studySpec.keys')}>
                      <Space size={2}>
                        {currentDatasetInfo.keys.map(k => (
                          <Tag
                            className="m-0 text-10px"
                            color="blue"
                            key={k}
                          >
                            {k}
                          </Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              )}

              <Table
                className="flex-1 overflow-hidden"
                columns={columns}
                dataSource={currentVariables}
                rowKey="key"
                scroll={{ x: 'max-content', y: 'calc(100vh - 380px)' }}
                size="small"
                components={{
                  body: {
                    row: SortableRow
                  }
                }}
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showTotal: total => t('page.mdr.studySpec.totalRows', { count: total })
                }}
              />
            </Card>
          </SortableContext>
        </DndContext>
      </div>

      {/* 溯源 Drawer - Global Library 定义 */}
      <Drawer
        open={traceDrawerOpen}
        placement="right"
        width={480}
        title={
          <Space>
            <Text strong>{t('page.mdr.studySpec.traceDrawer.title')}</Text>
            {traceVariable && <Tag color="blue">{traceVariable.name}</Tag>}
          </Space>
        }
        onClose={() => {
          setTraceDrawerOpen(false);
          setTraceVariable(null);
        }}
      >
        {traceVariable && (
          <div className="flex flex-col gap-16px">
            <div className="border border-blue-100 rounded-lg bg-blue-50 p-12px">
              <Text
                className="text-12px"
                type="secondary"
              >
                {t('page.mdr.studySpec.traceDrawer.hint')}
              </Text>
            </div>
            <Descriptions
              bordered
              column={2}
              labelStyle={{ fontWeight: 500, width: 100 }}
              size="small"
            >
              <Descriptions.Item
                label={t('page.mdr.studySpec.cols.variableName')}
                span={2}
              >
                <Tag color="blue">{traceVariable.name}</Tag>
              </Descriptions.Item>
              <Descriptions.Item
                label={t('page.mdr.studySpec.cols.label')}
                span={2}
              >
                {traceVariable.label}
              </Descriptions.Item>
              <Descriptions.Item label={t('page.mdr.studySpec.cols.dataType')}>
                {traceVariable.dataType}
              </Descriptions.Item>
              <Descriptions.Item label={t('page.mdr.studySpec.cols.length')}>{traceVariable.length}</Descriptions.Item>
              <Descriptions.Item label={t('page.mdr.studySpec.cols.origin')}>
                <Tag color={originConfig[traceVariable.origin].color}>{traceVariable.origin}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('page.mdr.studySpec.cols.core')}>
                <Tag color={traceVariable.core === 'Req' ? 'red' : traceVariable.core === 'Exp' ? 'orange' : 'default'}>
                  {traceVariable.core}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item
                label={t('page.mdr.studySpec.cols.role')}
                span={2}
              >
                {traceVariable.role}
              </Descriptions.Item>
              {traceVariable.codelist && (
                <Descriptions.Item
                  label={t('page.mdr.studySpec.cols.codelist')}
                  span={2}
                >
                  <Tag color="cyan">{traceVariable.codelist}</Tag>
                </Descriptions.Item>
              )}
              {traceVariable.comment && (
                <Descriptions.Item
                  label={t('page.mdr.studySpec.cols.comment')}
                  span={2}
                >
                  {traceVariable.comment}
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Drawer>

      {/* 变量表单 Drawer (新增/编辑) */}
      <VariableFormDrawer
        datasetKey={String(selectedDatasetId ?? '')}
        editingVariable={editingVariable}
        loading={submitLoading}
        open={formDrawerOpen}
        operateType={operateType}
        standard={selectedStandard}
        onCancel={closeFormDrawer}
        onSubmit={handleSubmit}
      />

      {/* 添加 Dataset Modal */}
      <AddDatasetModal
        loading={addDatasetLoading}
        open={addDatasetModalOpen}
        specId={currentSpec?.id ?? null}
        onCancel={() => setAddDatasetModalOpen(false)}
        onSubmit={handleAddDataset}
      />

      {/* Domain Picker Wizard */}
      {scopeNodeId && (
        <DomainPickerWizard
          open={domainPickerOpen}
          scopeNodeId={scopeNodeId}
          onConfirm={async (datasetIds) => {
            try {
              await initializeSpec.mutateAsync({
                scope_node_id: scopeNodeId,
                spec_type: selectedStandard,
                selected_dataset_ids: datasetIds,
              });
              setDomainPickerOpen(false);
            } catch (err: unknown) {
              const detail = (err as any)?.response?.data?.detail || (err as any)?.message || 'Failed to initialize spec';
              message.error(detail);
            }
          }}
          onCancel={() => setDomainPickerOpen(false)}
        />
      )}

      {/* Push Upstream Modal */}
      {currentSpec && (
        <PushUpstreamModal
          open={pushUpstreamOpen}
          specId={currentSpec.id}
          parentLabel="Parent Spec"
          onClose={() => setPushUpstreamOpen(false)}
          onSuccess={() => {
            setPushUpstreamOpen(false);
          }}
        />
      )}

      {/* Domain Edit Drawer */}
      {draftStore && editingDomain && (
        <DomainEditDrawer
          datasetId={editingDatasetId}
          domain={editingDomain}
          onClose={() => {
            setEditDrawerOpen(false);
            setEditingDomain(null);
          }}
          open={editDrawerOpen}
          store={draftStore.getState()}
        />
      )}

      {/* Save Changes Modal */}
      {draftStore && (
        <SaveChangesModal
          confirmLoading={saveLoading}
          diff={computeDiff(draftStore.getState().baseline, draftStore.getState().current)}
          onCancel={() => setSaveModalOpen(false)}
          onConfirm={handleConfirmSave}
          open={saveModalOpen}
        />
      )}
    </div>
  );
};

export default StudySpec;
