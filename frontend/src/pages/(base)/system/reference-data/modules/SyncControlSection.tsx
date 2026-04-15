import { useCallback, useState } from 'react';

import { Button, Card, Progress, Select, Space, Typography, message } from 'antd';

import { useAvailableVersions, useCancelSync, useTaskPolling, useTriggerSync } from '@/service/hooks/useCdiscSync';

import { CDISC_STANDARD_TYPES } from './standard-types';

interface SyncControlSectionProps {
  activeTaskId: string | null;
  onSyncStart: (taskId: string) => void;
}

/** All 10 types triggered by Sync All Latest. TIG uses 'all' because it has
 *  multiple independent products rather than sequential versions. */
const SYNC_ALL_TARGETS: Array<{ standard_type: string; version: string }> = [
  { standard_type: 'sdtm', version: 'latest' },
  { standard_type: 'sdtmig', version: 'latest' },
  { standard_type: 'adam', version: 'latest' },
  { standard_type: 'adamig', version: 'latest' },
  { standard_type: 'cdashig', version: 'latest' },
  { standard_type: 'sendig', version: 'latest' },
  { standard_type: 'ct', version: 'latest' },
  { standard_type: 'bc', version: 'latest' },
  { standard_type: 'qrs', version: 'latest' },
  { standard_type: 'tig', version: 'all' }
];

const SyncControlSection: React.FC<SyncControlSectionProps> = ({ activeTaskId, onSyncStart }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [standardType, setStandardType] = useState('sdtm');
  const [version, setVersion] = useState('latest');
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const triggerMutation = useTriggerSync();
  const cancelMutation = useCancelSync();
  const { data: taskProgress, isLoading: isTaskLoading } = useTaskPolling(activeTaskId);
  const { data: versionsData, isLoading: isVersionsLoading } = useAvailableVersions(standardType);

  const handleTypeChange = useCallback((type: string) => {
    setStandardType(type);
    setVersion('latest');
  }, []);

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

  const handleSyncAll = useCallback(async () => {
    setIsSyncingAll(true);
    try {
      const results = await Promise.allSettled(
        SYNC_ALL_TARGETS.map(({ standard_type, version: ver }) =>
          triggerMutation.mutateAsync({ standard_type, version: ver })
        )
      );
      const started = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed === 0) {
        messageApi.success(`${started} sync tasks started — check history for progress`);
      } else {
        messageApi.warning(`${started} started, ${failed} failed to trigger`);
      }
    } finally {
      setIsSyncingAll(false);
    }
  }, [triggerMutation, messageApi]);

  const handleCancel = useCallback(() => {
    if (!activeTaskId) return;
    cancelMutation.mutate(activeTaskId, {
      onSuccess: data => {
        if (data.success) messageApi.success(data.message);
        else messageApi.error(data.message);
      },
      onError: () => messageApi.error('Failed to cancel sync')
    });
  }, [activeTaskId, cancelMutation, messageApi]);

  const isTaskActive =
    taskProgress?.status === 'running' || taskProgress?.status === 'pending';

  const versionOptions = (versionsData?.versions ?? ['latest']).map(v => ({
    label: v,
    value: v
  }));

  return (
    <Card title="Sync Control">
      {contextHolder}
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap>
          <Select
            value={standardType}
            onChange={handleTypeChange}
            options={CDISC_STANDARD_TYPES.map(o => ({ label: o.label, value: o.value }))}
            style={{ width: 200 }}
            disabled={isTaskActive}
          />
          <Select
            value={version}
            onChange={setVersion}
            options={versionOptions}
            loading={isVersionsLoading}
            style={{ width: 180 }}
            disabled={isTaskActive || isVersionsLoading}
            placeholder="Select version"
          />
          <Button
            type="primary"
            loading={triggerMutation.isPending}
            onClick={handleSync}
            disabled={isTaskActive}
          >
            Sync Now
          </Button>
          <Button
            loading={isSyncingAll}
            onClick={handleSyncAll}
            disabled={isTaskActive || isSyncingAll}
          >
            Sync All Latest
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
