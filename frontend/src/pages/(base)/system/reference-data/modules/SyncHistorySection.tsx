import { useCallback, useMemo, useState } from 'react';

import { Button, Card, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { useRetrySync, useSyncLogs } from '@/service/hooks/useCdiscSync';

const STATUS_COLOR_MAP: Record<string, string> = {
  completed: 'green',
  failed: 'red',
  interrupted: 'orange',
  running: 'blue',
  pending: 'default'
};

const STANDARD_TYPE_OPTIONS = [
  { label: 'All Types', value: '' },
  { label: 'SDTM', value: 'SDTM' },
  { label: 'SDTMIG', value: 'SDTMIG' },
  { label: 'ADaM', value: 'ADaM' },
  { label: 'ADaMIG', value: 'ADaMIG' },
  { label: 'CDASHIG', value: 'CDASHIG' },
  { label: 'SENDIG', value: 'SENDIG' },
  { label: 'TIG', value: 'TIG' },
  { label: 'QRS', value: 'QRS' },
  { label: 'CT', value: 'CT' },
  { label: 'BC', value: 'BC' },
  { label: 'Integrated', value: 'Integrated' }
] as const;

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Interrupted', value: 'interrupted' },
  { label: 'Running', value: 'running' },
  { label: 'Pending', value: 'pending' }
] as const;

interface SyncHistorySectionProps {
  onRetry: (taskId: string) => void;
}

const SyncHistorySection: React.FC<SyncHistorySectionProps> = ({ onRetry }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [pagination, setPagination] = useState({ offset: 0, limit: 20 });

  const { data, isLoading } = useSyncLogs({
    status: statusFilter || undefined,
    standard_type: typeFilter || undefined,
    offset: pagination.offset,
    limit: pagination.limit
  });

  const retryMutation = useRetrySync();

  const handleRetry = useCallback(
    (taskId: string) => {
      retryMutation.mutate(taskId, {
        onSuccess: resp => {
          messageApi.success(resp.message);
          onRetry(resp.task_id);
        },
        onError: () => messageApi.error('Failed to retry sync')
      });
    },
    [retryMutation, onRetry, messageApi]
  );

  const columns: ColumnsType<Api.CdiscSync.SyncLogItem> = useMemo(
    () => [
      {
        title: 'Standard Type',
        dataIndex: 'standard_type',
        width: 140
      },
      {
        title: 'Version',
        dataIndex: 'version',
        width: 100
      },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 120,
        render: (status: string) => (
          <Tag color={STATUS_COLOR_MAP[status] ?? 'default'}>{status.toUpperCase()}</Tag>
        )
      },
      {
        title: 'Triggered By',
        dataIndex: 'triggered_by',
        width: 140,
        render: (val: string | null) => val ?? '-'
      },
      {
        title: 'Started At',
        dataIndex: 'started_at',
        width: 180,
        render: (val: string | null) => (val ? dayjs(val).format('YYYY-MM-DD HH:mm:ss') : '-')
      },
      {
        title: 'Duration',
        width: 120,
        render: (_: unknown, record: Api.CdiscSync.SyncLogItem) => {
          if (!record.started_at || !record.completed_at) return '-';
          const ms = dayjs(record.completed_at).diff(dayjs(record.started_at));
          if (ms < 60000) return `${Math.round(ms / 1000)}s`;
          return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
        }
      },
      {
        title: 'Actions',
        width: 100,
        render: (_: unknown, record: Api.CdiscSync.SyncLogItem) =>
          record.status === 'failed' || record.status === 'interrupted' ? (
            <Button
              type="link"
              size="small"
              loading={retryMutation.isPending}
              onClick={() => handleRetry(record.task_id)}
            >
              Retry
            </Button>
          ) : null
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [retryMutation.isPending]
  );

  return (
    <Card title="Sync History">
      {contextHolder}
      <Space style={{ marginBottom: 16 }}>
        <Select
          value={statusFilter}
          onChange={val => {
            setStatusFilter(val);
            setPagination(prev => ({ ...prev, offset: 0 }));
          }}
          options={STATUS_OPTIONS.map(s => ({ label: s.label, value: s.value }))}
          style={{ width: 160 }}
        />
        <Select
          value={typeFilter}
          onChange={val => {
            setTypeFilter(val);
            setPagination(prev => ({ ...prev, offset: 0 }));
          }}
          options={STANDARD_TYPE_OPTIONS.map(t => ({ label: t.label, value: t.value }))}
          style={{ width: 160 }}
        />
      </Space>
      <Table<Api.CdiscSync.SyncLogItem>
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isLoading}
        rowKey="task_id"
        expandable={{
          expandedRowRender: record => (
            <Space direction="vertical" style={{ width: '100%' }}>
              {record.result_summary && (
                <div>
                  <Typography.Text strong>Result Summary:</Typography.Text>
                  <pre style={{ fontSize: 12, marginTop: 4, maxHeight: 200, overflow: 'auto' }}>
                    {JSON.stringify(record.result_summary, null, 2)}
                  </pre>
                </div>
              )}
              {record.error_message && (
                <div>
                  <Typography.Text strong type="danger">
                    Error:
                  </Typography.Text>{' '}
                  <Typography.Text type="danger">{record.error_message}</Typography.Text>
                </div>
              )}
            </Space>
          )
        }}
        pagination={{
          total: data?.total ?? 0,
          pageSize: pagination.limit,
          current: Math.floor(pagination.offset / pagination.limit) + 1,
          showSizeChanger: true,
          onChange: (page, pageSize) => {
            setPagination({ offset: (page - 1) * pageSize, limit: pageSize });
          }
        }}
        scroll={{ x: 'max-content' }}
        size="small"
      />
    </Card>
  );
};

export default SyncHistorySection;
