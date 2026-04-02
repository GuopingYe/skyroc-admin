import { useCallback, useState } from 'react';

import { Button, Card, Input, Progress, Select, Space, Typography, message } from 'antd';

import { useCancelSync, useTaskPolling, useTriggerSync } from '@/service/hooks/useCdiscSync';

import { CDISC_STANDARD_TYPES } from './standard-types';

interface SyncControlSectionProps {
  activeTaskId: string | null;
  onSyncStart: (taskId: string) => void;
}

const SyncControlSection: React.FC<SyncControlSectionProps> = ({ activeTaskId, onSyncStart }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [standardType, setStandardType] = useState('SDTM');
  const [version, setVersion] = useState('latest');

  const triggerMutation = useTriggerSync();
  const cancelMutation = useCancelSync();
  const { data: taskProgress, isLoading: isTaskLoading } = useTaskPolling(activeTaskId);

  const handleSync = useCallback(() => {
    triggerMutation.mutate(
      { standard_type: standardType, version },
      {
        onSuccess: data => {
          messageApi.success(data.message);
          onSyncStart(data.task_id);
        },
        onError: () => messageApi.error('Failed to trigger sync')
      }
    );
  }, [standardType, version, triggerMutation, onSyncStart, messageApi]);

  const handleCancel = useCallback(() => {
    if (!activeTaskId) return;
    cancelMutation.mutate(activeTaskId, {
      onSuccess: data => {
        if (data.success) {
          messageApi.success(data.message);
        } else {
          messageApi.error(data.message);
        }
      },
      onError: () => messageApi.error('Failed to cancel sync')
    });
  }, [activeTaskId, cancelMutation, messageApi]);

  const isTaskActive =
    taskProgress?.status === 'running' || taskProgress?.status === 'pending';

  return (
    <Card title="Sync Control">
      {contextHolder}
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap>
          <Select
            value={standardType}
            onChange={setStandardType}
            options={CDISC_STANDARD_TYPES.map(o => ({ label: o.label, value: o.value }))}
            style={{ width: 200 }}
            disabled={isTaskActive}
          />
          <Input
            value={version}
            onChange={e => setVersion(e.target.value)}
            placeholder="Version"
            style={{ width: 150 }}
            disabled={isTaskActive}
          />
          <Button
            type="primary"
            loading={triggerMutation.isPending}
            onClick={handleSync}
            disabled={isTaskActive}
          >
            Sync Now
          </Button>
        </Space>

        {isTaskActive && (
          <Card
            type="inner"
            title="Active Task"
            size="small"
            loading={isTaskLoading}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Typography.Text strong>Standard: </Typography.Text>
                <Typography.Text>{taskProgress?.standard_type}</Typography.Text>
                <Typography.Text strong style={{ marginLeft: 16 }}>Version: </Typography.Text>
                <Typography.Text>{taskProgress?.version}</Typography.Text>
              </div>
              <Progress
                percent={taskProgress?.progress?.percentage ?? 0}
                status={taskProgress?.status === 'pending' ? 'active' : undefined}
              />
              <div>
                <Typography.Text type="secondary">
                  Status: {taskProgress?.status ?? 'unknown'}
                </Typography.Text>
              </div>
              <Button
                danger
                loading={cancelMutation.isPending}
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </Space>
          </Card>
        )}
      </Space>
    </Card>
  );
};

export default SyncControlSection;
