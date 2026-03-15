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
 */
import {
  BookOutlined,
  DeleteOutlined,
  DragOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  TableOutlined
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
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  List,
  Popconfirm,
  Segmented,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useClinicalContext } from '@/features/clinical-context';

import type { SpecDataset, SpecVariable, StandardType, VariableOrigin } from './mockData';
import { getDatasetsByStandard, getVariablesByDomain, originConfig } from './mockData';
import { VariableFormDrawer } from './modules';

const { Text, Title } = Typography;

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
  const { context, isReady } = useClinicalContext();

  // 标准类型切换 (SDTM / ADaM)
  const [selectedStandard, setSelectedStandard] = useState<StandardType>('SDTM');

  // 左侧选中的 Dataset
  const [selectedDataset, setSelectedDataset] = useState<string>('DM');

  // 当标准类型切换时，重置到第一个 Dataset
  useEffect(() => {
    const datasets = getDatasetsByStandard(selectedStandard);
    if (datasets.length > 0) {
      setSelectedDataset(datasets[0].key);
    }
  }, [selectedStandard]);

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
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // 过滤后的 Datasets
  const filteredDatasets = useMemo(() => {
    const datasets = getDatasetsByStandard(selectedStandard);
    if (!searchText) return datasets;
    const keyword = searchText.toLowerCase();
    return datasets.filter(d => d.name.toLowerCase().includes(keyword) || d.label.toLowerCase().includes(keyword));
  }, [searchText, selectedStandard]);

  // 当前 Dataset 的变量列表
  const currentVariables = useMemo(() => {
    // 优先使用用户拖拽后的状态
    const stateKey = `${selectedStandard}-${selectedDataset}`;
    if (variableStates[stateKey]) {
      return variableStates[stateKey];
    }
    return getVariablesByDomain(selectedDataset, selectedStandard);
  }, [selectedStandard, selectedDataset, variableStates]);

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
        const stateKey = `${selectedStandard}-${selectedDataset}`;
        setVariableStates(prev => {
          const currentList = prev[stateKey] || getVariablesByDomain(selectedDataset, selectedStandard);
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
    [selectedStandard, selectedDataset, t]
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
        // 模拟 API 调用
        await new Promise<void>(resolve => {
          setTimeout(resolve, 500);
        });

        if (operateType === 'add') {
          // eslint-disable-next-line no-console
          console.log('Create variable:', { datasetKey: selectedDataset, standard: selectedStandard, ...values });
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
    [operateType, editingVariable, selectedDataset, selectedStandard, t, closeFormDrawer]
  );

  // 处理删除
  const handleDelete = useCallback(
    async (variableKey: string) => {
      setDeleteLoading(variableKey);
      try {
        // 模拟 API 调用
        await new Promise<void>(resolve => {
          setTimeout(resolve, 300);
        });
        // eslint-disable-next-line no-console
        console.log('Delete variable:', variableKey);
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

  // 当前 Dataset 信息
  const currentDatasetInfo = useMemo(() => {
    const datasets = getDatasetsByStandard(selectedStandard);
    return datasets.find(d => d.key === selectedDataset);
  }, [selectedStandard, selectedDataset]);

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
              okButtonProps={{ loading: deleteLoading === record.key }}
              okText={t('page.mdr.programmingTracker.popconfirm.confirm')}
              title={t('page.mdr.studySpec.confirmDelete')}
              onConfirm={() => handleDelete(record.key)}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={deleteLoading === record.key}
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
      {/* 未选择完整上下文时的提示 */}
      {!isReady && (
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
          </div>
          <div className="flex items-center gap-16px">
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
          <div className="mb-8px">
            <Input
              allowClear
              placeholder={t('page.mdr.studySpec.searchDataset')}
              prefix={<SearchOutlined className="text-gray-400" />}
              size="small"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-auto">
            <Text
              strong
              className="mb-8px block text-14px"
            >
              {t('page.mdr.studySpec.datasets')}
            </Text>
            <List
              dataSource={filteredDatasets}
              size="small"
              renderItem={(item: SpecDataset) => {
                const isSelected = selectedDataset === item.key;
                const variables = getVariablesByDomain(item.key, selectedStandard);
                const crfCount = variables.filter(v => v.origin === 'CRF').length;
                const derivedCount = variables.filter(v => v.origin === 'Derived').length;

                return (
                  <List.Item
                    className={`cursor-pointer px-8px rounded transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    onClick={() => setSelectedDataset(item.key)}
                  >
                    <div className="w-full flex items-center justify-between">
                      <Space>
                        <Tag color="blue">{item.name}</Tag>
                        <span className="text-13px">{item.label}</span>
                      </Space>
                      <Space size={2}>
                        {crfCount > 0 && (
                          <Tag
                            className="m-0 text-10px"
                            color="green"
                          >
                            CRF:{crfCount}
                          </Tag>
                        )}
                        {derivedCount > 0 && (
                          <Tag
                            className="m-0 text-10px"
                            color="orange"
                          >
                            D:{derivedCount}
                          </Tag>
                        )}
                      </Space>
                    </div>
                  </List.Item>
                );
              }}
            />
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
        datasetKey={selectedDataset}
        editingVariable={editingVariable}
        loading={submitLoading}
        open={formDrawerOpen}
        operateType={operateType}
        standard={selectedStandard}
        onCancel={closeFormDrawer}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default StudySpec;
