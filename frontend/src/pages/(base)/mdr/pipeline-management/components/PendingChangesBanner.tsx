/**
 * Pending Changes Banner
 *
 * Shows a banner at the top of the page when there are unsaved changes. Includes undo/redo buttons and save/discard
 * actions.
 */
import {
  CheckOutlined,
  CloseOutlined,
  RedoOutlined,
  SaveOutlined,
  UndoOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { Alert, Button, Space, Tooltip } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { ChangeRecord } from '../stores';

export interface PendingChangesBannerProps {
  canRedo: boolean;
  canUndo: boolean;
  isDirty: boolean;
  isSaving?: boolean;
  onDiscard: () => void;
  onRedo: () => void;
  onSave: () => void;
  onUndo: () => void;
  pendingChanges: Map<string, ChangeRecord>;
  pendingChangesCount: number;
}

export const PendingChangesBanner: React.FC<PendingChangesBannerProps> = ({
  canRedo,
  canUndo,
  isDirty,
  isSaving = false,
  onDiscard,
  onRedo,
  onSave,
  onUndo,
  pendingChanges,
  pendingChangesCount
}) => {
  const { t } = useTranslation();

  if (!isDirty) return null;

  // Count changes by type
  let creates = 0;
  let updates = 0;
  let deletes = 0;

  pendingChanges.forEach(change => {
    if (change.type === 'create') creates++;
    else if (change.type === 'update') updates++;
    else if (change.type === 'delete') deletes++;
  });

  const changeDescription = [
    creates > 0 && `${creates} create${creates > 1 ? 's' : ''}`,
    updates > 0 && `${updates} update${updates > 1 ? 's' : ''}`,
    deletes > 0 && `${deletes} delete${deletes > 1 ? 's' : ''}`
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Alert
      className="mb-12px"
      icon={<WarningOutlined />}
      type="warning"
      message={
        <div className="w-full flex items-center justify-between">
          <Space>
            <span>
              {t('page.mdr.pipelineManagement.pendingChanges.title', {
                count: pendingChangesCount,
                defaultValue: `You have ${pendingChangesCount} unsaved change${pendingChangesCount > 1 ? 's' : ''}`
              })}
            </span>
            <span className="text-sm text-gray-500">({changeDescription})</span>
          </Space>

          <Space size="small">
            {/* Undo/Redo buttons */}
            <Button.Group size="small">
              <Tooltip title={t('page.mdr.pipelineManagement.pendingChanges.undo', 'Undo (Ctrl+Z)')}>
                <Button
                  disabled={!canUndo}
                  icon={<UndoOutlined />}
                  onClick={onUndo}
                />
              </Tooltip>
              <Tooltip title={t('page.mdr.pipelineManagement.pendingChanges.redo', 'Redo (Ctrl+Y)')}>
                <Button
                  disabled={!canRedo}
                  icon={<RedoOutlined />}
                  onClick={onRedo}
                />
              </Tooltip>
            </Button.Group>

            {/* Divider */}
            <div className="mx-1 h-4 w-px bg-gray-300" />

            {/* Save and Discard buttons */}
            <Button
              icon={<CloseOutlined />}
              size="small"
              onClick={onDiscard}
            >
              {t('page.mdr.pipelineManagement.pendingChanges.discard', 'Discard')}
            </Button>
            <Button
              icon={<SaveOutlined />}
              loading={isSaving}
              size="small"
              type="primary"
              onClick={onSave}
            >
              {t('page.mdr.pipelineManagement.pendingChanges.save', 'Save')}
            </Button>
          </Space>
        </div>
      }
    />
  );
};

export default PendingChangesBanner;
