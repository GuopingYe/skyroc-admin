/** ExecutionJobsTable - 执行作业列表 (Enhanced with progress bars, environment tags, error display) */
import { Card, Progress, Space, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { IExecutionJobDisplay } from '../milestoneData';

interface ExecutionJobsTableProps {
  jobs: IExecutionJobDisplay[];
}

const ExecutionJobsTable: React.FC<ExecutionJobsTableProps> = ({ jobs }) => {
  const { t } = useTranslation();

  const statusConfig: Record<string, { color: string }> = {
    Cancelled: { color: 'default' },
    Failed: { color: 'error' },
    Queued: { color: 'warning' },
    Running: { color: 'processing' },
    Success: { color: 'success' }
  };

  const typeConfig: Record<string, { color: string; icon: string }> = {
    ADaM: { color: 'green', icon: 'i-mdi-chart-box-outline' },
    'Data Import': { color: 'cyan', icon: 'i-mdi-database-import-outline' },
    'Define.xml': { color: 'geekblue', icon: 'i-mdi-code-xml' },
    QC: { color: 'orange', icon: 'i-mdi-check-circle-outline' },
    SDTM: { color: 'blue', icon: 'i-mdi-database-outline' },
    TFL: { color: 'purple', icon: 'i-mdi-file-chart-outline' }
  };

  const envConfig: Record<string, { color: string }> = {
    Development: { color: 'blue' },
    Production: { color: 'red' },
    UAT: { color: 'orange' }
  };

  const columns: ColumnsType<IExecutionJobDisplay> = useMemo(
    () => [
      {
        title: t('page.mdr.pipelineManagement.jobs.cols.name'),
        dataIndex: 'name',
        key: 'name',
        render: (text: string, record) => (
          <Space>
            <div className={typeConfig[record.type]?.icon || 'i-mdi-play-circle-outline'} />
            <span>{text}</span>
          </Space>
        )
      },
      {
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => (
          <Tag color={typeConfig[type]?.color}>{type}</Tag>
        ),
        title: t('page.mdr.pipelineManagement.jobs.cols.type'),
        width: 100
      },
      {
        dataIndex: 'status',
        key: 'status',
        render: (status: string, record) => (
          <Space direction="vertical" size={2} className="w-full">
            <Tag color={statusConfig[status]?.color}>
              {status === 'Running' && <div className="i-mdi-loading animate-spin mr-4px" />}
              {t(`page.mdr.pipelineManagement.jobs.status.${status}`)}
            </Tag>
            {(status === 'Running' || (status === 'Failed' && record.progress > 0)) && (
              <Progress
                percent={record.progress}
                size="small"
                status={status === 'Failed' ? 'exception' : 'active'}
                strokeWidth={4}
              />
            )}
          </Space>
        ),
        title: t('page.mdr.pipelineManagement.jobs.cols.status'),
        width: 140
      },
      {
        dataIndex: 'environment',
        key: 'environment',
        render: (env: string) => (
          <Tag color={envConfig[env]?.color || 'default'}>{env}</Tag>
        ),
        title: 'Environment',
        width: 110
      },
      {
        dataIndex: 'startTime',
        key: 'startTime',
        render: (time: string) => new Date(time).toLocaleString(),
        title: t('page.mdr.pipelineManagement.jobs.cols.startTime'),
        width: 160
      },
      {
        title: t('page.mdr.pipelineManagement.jobs.cols.duration'),
        dataIndex: 'duration',
        key: 'duration',
        width: 100,
        render: (duration: string) => duration || '-'
      },
      {
        dataIndex: 'triggeredBy',
        key: 'triggeredBy',
        title: t('page.mdr.pipelineManagement.jobs.cols.triggeredBy'),
        width: 150,
        ellipsis: true
      },
      {
        key: 'error',
        render: (_: unknown, record) => {
          if (!record.error) return null;
          return (
            <Tooltip title={record.error} color="red">
              <Tag color="error" className="cursor-pointer">
                <div className="i-mdi-alert-circle-outline mr-4px inline-block" />
                Error
              </Tag>
            </Tooltip>
          );
        },
        title: 'Details',
        width: 100
      }
    ],
    [t]
  );

  return (
    <Card
      className="card-wrapper"
      size="small"
      title={
        <div className="flex items-center gap-8px">
          <div className="i-mdi-play-circle-outline text-green-500" />
          <span>{t('page.mdr.pipelineManagement.jobs.title')}</span>
          <Tag className="ml-8px" color="blue">{jobs.length} jobs</Tag>
        </div>
      }
    >
      <Table
        columns={columns}
        dataSource={jobs}
        pagination={false}
        rowKey="id"
        size="small"
      />
    </Card>
  );
};

export default ExecutionJobsTable;
