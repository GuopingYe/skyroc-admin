/**
 * Save Confirmation Modal
 *
 * Modal that shows a summary of pending changes and asks for confirmation before saving.
 */
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FileAddOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { Alert, Button, Collapse, List, Modal, Space, Spin, Tag, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { ChangeRecord } from '../stores';
import type { BatchSaveResponse, BatchSaveResult } from '../utils/batchSave';

const { Text } = Typography;

export interface SaveConfirmationModalProps {
  changesSummary: {
    milestones: { created: number; deleted: number; updated: number };
    nodes: { created: number; deleted: number; updated: number };
    studyConfigs: number;
    total: number;
  } | null;
  isSaving: boolean;
  lastSaveResult: BatchSaveResponse | null;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
  onDiscard: () => void;
  open: boolean;
  pendingChanges: Map<string, ChangeRecord>;
}

const ChangeTypeIcon: React.FC<{ type: 'create' | 'delete' | 'update' }> = ({ type }) => {
  switch (type) {
    case 'create':
      return <FileAddOutlined className="text-green-500" />;
    case 'update':
      return <EditOutlined className="text-blue-500" />;
    case 'delete':
      return <DeleteOutlined className="text-red-500" />;
  }
};

const ChangeTypeTag: React.FC<{ type: 'create' | 'delete' | 'update' }> = ({ type }) => {
  const { t } = useTranslation();

  const config = {
    create: { color: 'success', label: t('page.mdr.pipelineManagement.saveModal.create', 'Create') },
    delete: { color: 'error', label: t('page.mdr.pipelineManagement.saveModal.delete', 'Delete') },
    update: { color: 'processing', label: t('page.mdr.pipelineManagement.saveModal.update', 'Update') }
  };

  return <Tag color={config[type].color}>{config[type].label}</Tag>;
};

const EntityTypeTag: React.FC<{ entityType: 'milestone' | 'node' | 'studyConfig' }> = ({ entityType }) => {
  const { t } = useTranslation();

  const config = {
    milestone: { color: 'purple', label: t('page.mdr.pipelineManagement.saveModal.milestone', 'Milestone') },
    node: { color: 'blue', label: t('page.mdr.pipelineManagement.saveModal.node', 'Node') },
    studyConfig: { color: 'orange', label: t('page.mdr.pipelineManagement.saveModal.studyConfig', 'Study Config') }
  };

  return <Tag color={config[entityType].color}>{config[entityType].label}</Tag>;
};

export const SaveConfirmationModal: React.FC<SaveConfirmationModalProps> = ({
  changesSummary,
  isSaving,
  lastSaveResult,
  onClose,
  onConfirm,
  onDiscard,
  open,
  pendingChanges
}) => {
  const { t } = useTranslation();

  const handleConfirm = async () => {
    await onConfirm();
  };

  const changeList = Array.from(pendingChanges.values());

  // Render save result if available
  const renderSaveResult = () => {
    if (!lastSaveResult) return null;

    const { success, summary } = lastSaveResult;

    if (success) {
      return (
        <Alert
          showIcon
          className="mt-16px"
          type="success"
          message={t(
            'page.mdr.pipelineManagement.saveModal.successMessage',
            'All {{count}} changes saved successfully!',
            { count: summary.succeeded }
          )}
        />
      );
    }

    return (
      <Alert
        showIcon
        className="mt-16px"
        type="error"
        message={t(
          'page.mdr.pipelineManagement.saveModal.partialFailure',
          '{{failed}} of {{total}} changes failed to save',
          { failed: summary.failed, total: summary.total }
        )}
      />
    );
  };

  return (
    <Modal
      closable={!isSaving}
      maskClosable={!isSaving}
      open={open}
      width={600}
      footer={
        <div className="flex justify-between">
          <Button
            danger
            disabled={isSaving}
            onClick={onDiscard}
          >
            {t('page.mdr.pipelineManagement.saveModal.discardAll', 'Discard All Changes')}
          </Button>
          <Space>
            <Button
              disabled={isSaving}
              onClick={onClose}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              icon={isSaving ? <LoadingOutlined /> : <CheckCircleOutlined />}
              loading={isSaving}
              type="primary"
              onClick={handleConfirm}
            >
              {t('page.mdr.pipelineManagement.saveModal.confirmSave', 'Save Changes')}
            </Button>
          </Space>
        </div>
      }
      title={
        <Space>
          <ExclamationCircleOutlined className="text-orange-500" />
          {t('page.mdr.pipelineManagement.saveModal.title', 'Confirm Save Changes')}
        </Space>
      }
      onCancel={isSaving ? undefined : onClose}
    >
      {/* Summary */}
      {changesSummary && (
        <div className="mb-16px">
          <Text strong>
            {t('page.mdr.pipelineManagement.saveModal.summary', 'You are about to save {{count}} change(s):', {
              count: changesSummary.total
            })}
          </Text>

          <div className="grid grid-cols-2 mt-8px gap-8px">
            {/* Nodes summary */}
            {(changesSummary.nodes.created > 0 ||
              changesSummary.nodes.updated > 0 ||
              changesSummary.nodes.deleted > 0) && (
              <div className="rounded bg-gray-50 p-8px">
                <Text type="secondary">Nodes:</Text>
                <div className="mt-4px">
                  {changesSummary.nodes.created > 0 && <Tag color="success">{changesSummary.nodes.created} create</Tag>}
                  {changesSummary.nodes.updated > 0 && (
                    <Tag color="processing">{changesSummary.nodes.updated} update</Tag>
                  )}
                  {changesSummary.nodes.deleted > 0 && <Tag color="error">{changesSummary.nodes.deleted} delete</Tag>}
                </div>
              </div>
            )}

            {/* Milestones summary */}
            {(changesSummary.milestones.created > 0 ||
              changesSummary.milestones.updated > 0 ||
              changesSummary.milestones.deleted > 0) && (
              <div className="rounded bg-gray-50 p-8px">
                <Text type="secondary">Milestones:</Text>
                <div className="mt-4px">
                  {changesSummary.milestones.created > 0 && (
                    <Tag color="success">{changesSummary.milestones.created} create</Tag>
                  )}
                  {changesSummary.milestones.updated > 0 && (
                    <Tag color="processing">{changesSummary.milestones.updated} update</Tag>
                  )}
                  {changesSummary.milestones.deleted > 0 && (
                    <Tag color="error">{changesSummary.milestones.deleted} delete</Tag>
                  )}
                </div>
              </div>
            )}

            {/* Study config summary */}
            {changesSummary.studyConfigs > 0 && (
              <div className="rounded bg-gray-50 p-8px">
                <Text type="secondary">Study Configurations:</Text>
                <div className="mt-4px">
                  <Tag color="orange">{changesSummary.studyConfigs} update</Tag>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed changes list */}
      <Collapse
        ghost
        items={[
          {
            children: (
              <List
                dataSource={changeList}
                size="small"
                style={{ maxHeight: 200, overflow: 'auto' }}
                renderItem={change => (
                  <List.Item>
                    <Space>
                      <ChangeTypeIcon type={change.type} />
                      <ChangeTypeTag type={change.type} />
                      <EntityTypeTag entityType={change.entityType} />
                      <Text type="secondary">
                        {change.entityType === 'node' && ((change.newState || change.previousState) as any)?.title}
                        {change.entityType === 'milestone' && ((change.newState || change.previousState) as any)?.name}
                        {change.entityType === 'studyConfig' && `Study ${change.entityId}`}
                      </Text>
                    </Space>
                  </List.Item>
                )}
              />
            ),
            key: 'details',
            label: t('page.mdr.pipelineManagement.saveModal.viewDetails', 'View detailed changes')
          }
        ]}
      />

      {/* Save result */}
      {renderSaveResult()}
    </Modal>
  );
};

export default SaveConfirmationModal;
