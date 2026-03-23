/**
 * Save Confirmation Modal
 *
 * Modal that shows a summary of pending changes and asks for confirmation before saving.
 */
import React from 'react';
import { Alert, Button, Collapse, List, Modal, Space, Spin, Tag, Typography } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FileAddOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import type { ChangeRecord } from '../stores';
import type { BatchSaveResponse, BatchSaveResult } from '../utils/batchSave';

const { Text } = Typography;

export interface SaveConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
  onDiscard: () => void;
  isSaving: boolean;
  pendingChanges: Map<string, ChangeRecord>;
  changesSummary: {
    nodes: { created: number; updated: number; deleted: number };
    milestones: { created: number; updated: number; deleted: number };
    studyConfigs: number;
    total: number;
  } | null;
  lastSaveResult: BatchSaveResponse | null;
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
    update: { color: 'processing', label: t('page.mdr.pipelineManagement.saveModal.update', 'Update') },
    delete: { color: 'error', label: t('page.mdr.pipelineManagement.saveModal.delete', 'Delete') }
  };

  return <Tag color={config[type].color}>{config[type].label}</Tag>;
};

const EntityTypeTag: React.FC<{ entityType: 'milestone' | 'node' | 'studyConfig' }> = ({ entityType }) => {
  const { t } = useTranslation();

  const config = {
    node: { color: 'blue', label: t('page.mdr.pipelineManagement.saveModal.node', 'Node') },
    milestone: { color: 'purple', label: t('page.mdr.pipelineManagement.saveModal.milestone', 'Milestone') },
    studyConfig: { color: 'orange', label: t('page.mdr.pipelineManagement.saveModal.studyConfig', 'Study Config') }
  };

  return <Tag color={config[entityType].color}>{config[entityType].label}</Tag>;
};

export const SaveConfirmationModal: React.FC<SaveConfirmationModalProps> = ({
  open,
  onClose,
  onConfirm,
  onDiscard,
  isSaving,
  pendingChanges,
  changesSummary,
  lastSaveResult
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
          type="success"
          showIcon
          message={t(
            'page.mdr.pipelineManagement.saveModal.successMessage',
            'All {{count}} changes saved successfully!',
            { count: summary.succeeded }
          )}
          className="mt-16px"
        />
      );
    }

    return (
      <Alert
        type="error"
        showIcon
        message={t(
          'page.mdr.pipelineManagement.saveModal.partialFailure',
          '{{failed}} of {{total}} changes failed to save',
          { failed: summary.failed, total: summary.total }
        )}
        className="mt-16px"
      />
    );
  };

  return (
    <Modal
      open={open}
      title={
        <Space>
          <ExclamationCircleOutlined className="text-orange-500" />
          {t('page.mdr.pipelineManagement.saveModal.title', 'Confirm Save Changes')}
        </Space>
      }
      onCancel={isSaving ? undefined : onClose}
      footer={
        <div className="flex justify-between">
          <Button
            danger
            onClick={onDiscard}
            disabled={isSaving}
          >
            {t('page.mdr.pipelineManagement.saveModal.discardAll', 'Discard All Changes')}
          </Button>
          <Space>
            <Button onClick={onClose} disabled={isSaving}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="primary"
              onClick={handleConfirm}
              loading={isSaving}
              icon={isSaving ? <LoadingOutlined /> : <CheckCircleOutlined />}
            >
              {t('page.mdr.pipelineManagement.saveModal.confirmSave', 'Save Changes')}
            </Button>
          </Space>
        </div>
      }
      width={600}
      maskClosable={!isSaving}
      closable={!isSaving}
    >
      {/* Summary */}
      {changesSummary && (
        <div className="mb-16px">
          <Text strong>
            {t('page.mdr.pipelineManagement.saveModal.summary', 'You are about to save {{count}} change(s):', {
              count: changesSummary.total
            })}
          </Text>

          <div className="mt-8px grid grid-cols-2 gap-8px">
            {/* Nodes summary */}
            {(changesSummary.nodes.created > 0 ||
              changesSummary.nodes.updated > 0 ||
              changesSummary.nodes.deleted > 0) && (
              <div className="bg-gray-50 p-8px rounded">
                <Text type="secondary">Nodes:</Text>
                <div className="mt-4px">
                  {changesSummary.nodes.created > 0 && (
                    <Tag color="success">{changesSummary.nodes.created} create</Tag>
                  )}
                  {changesSummary.nodes.updated > 0 && (
                    <Tag color="processing">{changesSummary.nodes.updated} update</Tag>
                  )}
                  {changesSummary.nodes.deleted > 0 && (
                    <Tag color="error">{changesSummary.nodes.deleted} delete</Tag>
                  )}
                </div>
              </div>
            )}

            {/* Milestones summary */}
            {(changesSummary.milestones.created > 0 ||
              changesSummary.milestones.updated > 0 ||
              changesSummary.milestones.deleted > 0) && (
              <div className="bg-gray-50 p-8px rounded">
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
              <div className="bg-gray-50 p-8px rounded">
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
            key: 'details',
            label: t('page.mdr.pipelineManagement.saveModal.viewDetails', 'View detailed changes'),
            children: (
              <List
                size="small"
                dataSource={changeList}
                renderItem={(change) => (
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
                style={{ maxHeight: 200, overflow: 'auto' }}
              />
            )
          }
        ]}
      />

      {/* Save result */}
      {renderSaveResult()}
    </Modal>
  );
};

export default SaveConfirmationModal;