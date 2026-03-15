/**
 * TrackerTable - 编程任务表格组件
 *
 * 展示当前分类下的所有编程任务，支持编辑、删除 支持通过拖拽表头边缘调整列宽（使用 react-resizable）
 */
import {
  AuditOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  MinusCircleOutlined,
  SafetyCertificateOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { Avatar, Button, Popconfirm, Space, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ResizeCallbackData } from 'react-resizable';

import type { IProgrammingTask, ITFLTask, TFLOutputType, TaskCategory, TaskStatus } from '../mockData';
import { taskStatusConfig, tflTypeConfig } from '../mockData';

import { createResizableComponents } from './ResizableTitle';

interface TrackerTableProps {
  activeCategory: TaskCategory;
  canEdit: boolean;
  loading?: boolean;
  onDelete: (taskId: string) => Promise<void>;
  onEdit: (task: IProgrammingTask) => void;
  tasks: IProgrammingTask[];
}

/** 最小列宽 */
const MIN_COLUMN_WIDTH = 60;

/** 默认列宽配置 */
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  'adam-analysisPopulation': 140,
  // ADaM
  'adam-dataset': 100,
  'adam-label': 250,
  'adam-programmers': 140,
  'adam-status': 130,
  'other-description': 300,
  'other-programmers': 140,
  'other-status': 130,
  'other-taskCategory': 120,
  // Other
  'other-taskName': 200,
  'sdtm-datasetLabel': 200,
  // SDTM
  'sdtm-domain': 80,
  'sdtm-programmers': 140,
  'sdtm-sdrSource': 120,
  'sdtm-status': 130,
  // TFL
  'tfl-outputId': 100,
  'tfl-population': 100,
  'tfl-programmers': 140,
  'tfl-status': 130,
  'tfl-title': 300,
  'tfl-type': 90
};

const TrackerTable: React.FC<TrackerTableProps> = ({ activeCategory, canEdit, loading, onDelete, onEdit, tasks }) => {
  const { t } = useTranslation();

  // 列宽状态 - 支持拖拽调整
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS);

  // 处理列宽调整
  const handleResize = useCallback(
    (key: string) =>
      (_e: React.SyntheticEvent, { size }: ResizeCallbackData) => {
        setColumnWidths(prev => ({
          ...prev,
          [key]: Math.max(MIN_COLUMN_WIDTH, size.width)
        }));
      },
    []
  );

  // 创建可调整宽度的表头组件
  const resizableComponents = useMemo(() => createResizableComponents(handleResize), [handleResize]);

  // 获取列宽
  const getWidth = (key: string): number => {
    return columnWidths[key] || DEFAULT_COLUMN_WIDTHS[key] || 100;
  };

  // 状态图标
  const getStatusIcon = (status: TaskStatus) => {
    const icons: Record<TaskStatus, React.ReactNode> = {
      'In Progress': <SyncOutlined spin />,
      'Not Started': <MinusCircleOutlined />,
      'QC Pass': <CheckCircleOutlined />,
      'Ready for QC': <AuditOutlined />,
      'Signed Off': <SafetyCertificateOutlined />
    };
    return icons[status];
  };

  // TFL 类型图标
  const getTypeIcon = (type: TFLOutputType) => {
    const icons: Record<TFLOutputType, React.ReactNode> = {
      Figure: <span>F</span>,
      Listing: <span>L</span>,
      Table: <span>T</span>
    };
    return icons[type];
  };

  // 公共列配置 - 包含程序员、状态和操作列
  const getCommonColumns = useCallback(
    (category: TaskCategory): ColumnsType<IProgrammingTask> => [
      {
        key: `${category}-programmers`,
        render: (_: unknown, record: IProgrammingTask) => (
          <Space size={4}>
            <Tooltip
              title={`${t('page.mdr.programmingTracker.cols.primaryProgrammer')}: ${record.primaryProgrammer.name}`}
            >
              <Avatar
                size="small"
                style={{ backgroundColor: '#1890ff' }}
              >
                {record.primaryProgrammer.avatar}
              </Avatar>
            </Tooltip>
            <Tooltip title={`${t('page.mdr.programmingTracker.cols.qcProgrammer')}: ${record.qcProgrammer.name}`}>
              <Avatar
                size="small"
                style={{ backgroundColor: '#52c41a' }}
              >
                {record.qcProgrammer.avatar}
              </Avatar>
            </Tooltip>
          </Space>
        ),
        title: t('page.mdr.programmingTracker.cols.programmers'),
        width: getWidth(`${category}-programmers`)
      },
      {
        dataIndex: 'status',
        key: `${category}-status`,
        render: (status: TaskStatus) => (
          <Tag
            color={taskStatusConfig[status].color}
            icon={getStatusIcon(status)}
          >
            {taskStatusConfig[status].label}
          </Tag>
        ),
        title: t('page.mdr.programmingTracker.cols.status'),
        width: getWidth(`${category}-status`)
      },
      {
        fixed: 'right',
        key: 'action',
        render: (_: unknown, record: IProgrammingTask) => (
          <Space>
            {canEdit && (
              <>
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  type="link"
                  onClick={() => onEdit(record)}
                >
                  {t('page.mdr.programmingTracker.edit')}
                </Button>
                <Popconfirm
                  cancelText={t('page.mdr.programmingTracker.popconfirm.cancel')}
                  okText={t('page.mdr.programmingTracker.popconfirm.confirm')}
                  title={t('page.mdr.programmingTracker.deleteConfirm')}
                  onConfirm={() => onDelete(record.id)}
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    type="link"
                  >
                    {t('page.mdr.programmingTracker.delete')}
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        ),
        title: t('page.mdr.programmingTracker.cols.action'),
        width: canEdit ? 150 : 80
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canEdit, onEdit, onDelete, t, columnWidths]
  );

  // SDTM 表格列
  const sdtmColumns: ColumnsType<IProgrammingTask> = useMemo(
    () => [
      {
        dataIndex: 'domain',
        fixed: 'left',
        key: 'sdtm-domain',
        render: (text: string) => <Tag color="blue">{text}</Tag>,
        title: t('page.mdr.programmingTracker.cols.domain'),
        width: getWidth('sdtm-domain')
      },
      {
        dataIndex: 'datasetLabel',
        ellipsis: true,
        key: 'sdtm-datasetLabel',
        render: (text: string) => (
          <Tooltip title={text}>
            <span>{text}</span>
          </Tooltip>
        ),
        title: t('page.mdr.programmingTracker.cols.datasetLabel'),
        width: getWidth('sdtm-datasetLabel')
      },
      {
        dataIndex: 'sdrSource',
        key: 'sdtm-sdrSource',
        render: (text: string) => <Tag>{text}</Tag>,
        title: t('page.mdr.programmingTracker.cols.sdrSource'),
        width: getWidth('sdtm-sdrSource')
      },
      ...getCommonColumns('SDTM')
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, getCommonColumns, columnWidths]
  );

  // ADaM 表格列
  const adamColumns: ColumnsType<IProgrammingTask> = useMemo(
    () => [
      {
        dataIndex: 'dataset',
        fixed: 'left',
        key: 'adam-dataset',
        render: (text: string) => <Tag color="green">{text}</Tag>,
        title: t('page.mdr.programmingTracker.cols.dataset'),
        width: getWidth('adam-dataset')
      },
      {
        dataIndex: 'label',
        ellipsis: true,
        key: 'adam-label',
        render: (text: string) => (
          <Tooltip title={text}>
            <span>{text}</span>
          </Tooltip>
        ),
        title: t('page.mdr.programmingTracker.cols.label'),
        width: getWidth('adam-label')
      },
      {
        dataIndex: 'analysisPopulation',
        key: 'adam-analysisPopulation',
        render: (text: string) => <Tag color="purple">{text}</Tag>,
        title: t('page.mdr.programmingTracker.cols.analysisPopulation'),
        width: getWidth('adam-analysisPopulation')
      },
      ...getCommonColumns('ADaM')
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, getCommonColumns, columnWidths]
  );

  // TFL 表格列
  const tflColumns: ColumnsType<IProgrammingTask> = useMemo(
    () => [
      {
        dataIndex: 'outputId',
        fixed: 'left',
        key: 'tfl-outputId',
        render: (text: string, record: IProgrammingTask) => {
          const tflTask = record as ITFLTask;
          return (
            <Space size={4}>
              <Tag color={tflTypeConfig[tflTask.type].color}>{getTypeIcon(tflTask.type)}</Tag>
              <span className="font-medium font-mono">{text}</span>
            </Space>
          );
        },
        title: t('page.mdr.programmingTracker.cols.outputId'),
        width: getWidth('tfl-outputId')
      },
      {
        dataIndex: 'title',
        ellipsis: true,
        key: 'tfl-title',
        render: (text: string) => (
          <Tooltip title={text}>
            <span>{text}</span>
          </Tooltip>
        ),
        title: t('page.mdr.programmingTracker.cols.title'),
        width: getWidth('tfl-title')
      },
      {
        dataIndex: 'type',
        key: 'tfl-type',
        render: (type: TFLOutputType) => <Tag color={tflTypeConfig[type].color}>{tflTypeConfig[type].label}</Tag>,
        title: t('page.mdr.programmingTracker.cols.type'),
        width: getWidth('tfl-type')
      },
      {
        dataIndex: 'population',
        key: 'tfl-population',
        render: (text: string) => <Tag color="blue">{text}</Tag>,
        title: t('page.mdr.programmingTracker.cols.population'),
        width: getWidth('tfl-population')
      },
      ...getCommonColumns('TFL')
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, getCommonColumns, columnWidths]
  );

  // Other 表格列
  const otherColumns: ColumnsType<IProgrammingTask> = useMemo(
    () => [
      {
        dataIndex: 'taskName',
        ellipsis: true,
        fixed: 'left',
        key: 'other-taskName',
        render: (text: string) => (
          <Tooltip title={text}>
            <span className="font-medium">{text}</span>
          </Tooltip>
        ),
        title: t('page.mdr.programmingTracker.cols.taskName'),
        width: getWidth('other-taskName')
      },
      {
        dataIndex: 'description',
        ellipsis: true,
        key: 'other-description',
        render: (text: string) => (
          <Tooltip title={text}>
            <span>{text}</span>
          </Tooltip>
        ),
        title: t('page.mdr.programmingTracker.cols.description'),
        width: getWidth('other-description')
      },
      {
        dataIndex: 'taskCategory',
        key: 'other-taskCategory',
        render: (text: string) => <Tag color="purple">{text}</Tag>,
        title: t('page.mdr.programmingTracker.cols.taskCategory'),
        width: getWidth('other-taskCategory')
      },
      ...getCommonColumns('Other')
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, getCommonColumns, columnWidths]
  );

  // 根据任务分类获取列配置
  const columns = useMemo(() => {
    switch (activeCategory) {
      case 'SDTM':
        return sdtmColumns;
      case 'ADaM':
        return adamColumns;
      case 'TFL':
        return tflColumns;
      case 'Other':
        return otherColumns;
      default:
        return getCommonColumns('SDTM');
    }
  }, [activeCategory, sdtmColumns, adamColumns, tflColumns, otherColumns, getCommonColumns]);

  return (
    <Table
      bordered
      columns={columns}
      components={resizableComponents}
      dataSource={tasks}
      loading={loading}
      rowKey="id"
      scroll={{ x: 'max-content', y: 'calc(100vh - 400px)' }}
      size="small"
      pagination={{
        pageSize: 15,
        showSizeChanger: true,
        showTotal: total => t('page.mdr.programmingTracker.totalTasks', { count: total })
      }}
    />
  );
};

export default TrackerTable;
