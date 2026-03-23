/**
 * Pending Changes Banner
 *
 * Shows a banner at the top of the page when there are unsaved changes.
 * Includes undo/redo buttons and save/discard actions.
 */
import React from 'react';
import { Alert, Button, Space, Tooltip } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  RedoOutlined,
  SaveOutlined,
  UndoOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import type { ChangeRecord } from '../stores';

export interface PendingChangesBannerProps {
  isDirty: boolean;
  pendingChangesCount: number;
  pendingChanges: Map<string, ChangeRecord>;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onDiscard: () => void;
  isSaving?: boolean;
}

export const PendingChangesBanner: React.FC<PendingChangesBannerProps> = ({
  isDirty,
  pendingChangesCount,
  pendingChanges,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onDiscard,
  isSaving = false
}) => {
  const { t } = useTranslation();

  if (!isDirty) return null;

  // Count changes by type
  let creates = 0;
  let updates = 0;
  let deletes = 0;

  pendingChanges.forEach((change) => {
    if (change.type === 'create') creates++;
    else if (change.type === 'update') updates++;
    else if (change.type === 'delete') deletes++;
  });

  const changeDescription = [
    creates > 0 && `${creates} create${creates > 1 ? 's' : ''}`,
    updates > 0 && `${updates} update${updates > 1 ? 's' : ''}`,
    deletes > 0 && `${deletes} delete${deletes > 1 ? 's' : ''}`
  ].filter(Boolean).join(', ');

  return (
    <Alert
      type="warning"
      icon={<WarningOutlined />}
      message={
        <div className="flex items-center justify-between w-full">
          <Space>
            <span>
              {t('page.mdr.pipelineManagement.pendingChanges.title', {
                count: pendingChangesCount,
                defaultValue: `You have ${pendingChangesCount} unsaved change${pendingChangesCount > 1 ? 's' : ''}`
              })}
            </span>
            <span className="text-gray-500 text-sm">
              ({changeDescription})
            </span>
          </Space>

          <Space size="small">
            {/* Undo/Redo buttons */}
            <Button.Group size="small">
              <Tooltip title={t('page.mdr.pipelineManagement.pendingChanges.undo', 'Undo (Ctrl+Z)')}>
                <Button
                  icon={<UndoOutlined />}
                  disabled={!canUndo}
                  onClick={onUndo}
                />
              </Tooltip>
              <Tooltip title={t('page.mdr.pipelineManagement.pendingChanges.redo', 'Redo (Ctrl+Y)')}>
                <Button
                  icon={<RedoOutlined />}
                  disabled={!canRedo}
                  onClick={onRedo}
                />
              </Tooltip>
            </Button.Group>

            {/* Divider */}
            <div className="h-4 w-px bg-gray-300 mx-1" />

            {/* Save and Discard buttons */}
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={onDiscard}
            >
              {t('page.mdr.pipelineManagement.pendingChanges.discard', 'Discard')}
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              loading={isSaving}
              onClick={onSave}
            >
              {t('page.mdr.pipelineManagement.pendingChanges.save', 'Save')}
            </Button>
          </Space>
        </div>
      }
      className="mb-12px"
    />
  );
};

export default PendingChangesBanner;