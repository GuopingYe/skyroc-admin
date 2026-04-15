import { useCallback, useState } from 'react';

import { Button, Card, Progress, Select, Space, Typography, message } from 'antd';

import { useAvailableVersions, useCancelSync, useCdiscConfig, useTaskPolling, useTriggerSync } from '@/service/hooks/useCdiscSync';

import { CDISC_STANDARD_TYPES } from './standard-types';

interface SyncControlSectionProps {
  activeTaskId: string | null;
  onSyncStart: (taskId: string) => void;
}


const SyncControlSection: React.FC<SyncControlSectionProps> = ({ activeTaskId, onSyncStart }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [standardType, setStandardType] = useState('sdtm');
  const [version, setVersion] = useState('latest');
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const triggerMutation = useTriggerSync();
  const cancelMutation = useCancelSync();
  const { data: taskProgress, isLoading: isTaskLoading } = useTaskPolling(activeTaskId);
  const { data: versionsData, isLoading: isVersionsLoading, isError: isVersionsError } = useAvailableVersions(standardType);
  const { data: cdiscConfig } = useCdiscConfig();

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
    const syncAllTargets = (cdiscConfig?.enabled_standard_types ?? []).map(type => ({
      standard_type: type,
      version: type === 'tig' ? 'all' : 'latest'
    }));
    try {
      const results = await Promise.allSettled(
        syncAllTargets.map(({ standard_type, version: ver }) =>
          triggerMutation.mutateAsync({ standard_type, version: ver })
        )
      );
      const started = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const firstFulfilled = results.find(
        (r): r is PromiseFulfilledResult<Api.CdiscSync.SyncTriggerResponse> => r.status === 'fulfilled'
      );
      if (firstFulfilled) {
        onSyncStart(firstFulfilled.value.task_id);
      }
      if (failed === 0) {
        messageApi.success(`${started} sync tasks started — check history for progress`);
      } else {
        messageApi.warning(`${started} started, ${failed} failed to trigger`);
      }
    } finally {
      setIsSyncingAll(false);
    }
  }, [cdiscConfig?.enabled_standard_types, triggerMutation, messageApi, onSyncStart]);

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

  const versionOptions = (versionsData?.versions ?? []).map(v => ({
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
            disabled={isTaskActive || isVersionsLoading || isVersionsError}
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
