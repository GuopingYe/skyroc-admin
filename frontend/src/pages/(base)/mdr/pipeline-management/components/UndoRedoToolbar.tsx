/**
 * Undo/Redo Toolbar
 *
 * A compact toolbar with undo/redo buttons for the pipeline management page. Can be placed in the page header or
 * inline.
 */
import { RedoOutlined, UndoOutlined } from '@ant-design/icons';
import { Button, Space, Tooltip } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

export interface UndoRedoToolbarProps {
  canRedo: boolean;
  canUndo: boolean;
  disabled?: boolean;
  onRedo: () => void;
  onUndo: () => void;
  showLabels?: boolean;
  showShortcuts?: boolean;
  size?: 'large' | 'middle' | 'small';
}

export const UndoRedoToolbar: React.FC<UndoRedoToolbarProps> = ({
  canRedo,
  canUndo,
  disabled = false,
  onRedo,
  onUndo,
  showLabels = false,
  showShortcuts = true,
  size = 'small'
}) => {
  const { t } = useTranslation();

  const undoTitle = showShortcuts
    ? t('page.mdr.pipelineManagement.toolbar.undoWithShortcut', 'Undo (Ctrl+Z)')
    : t('page.mdr.pipelineManagement.toolbar.undo', 'Undo');

  const redoTitle = showShortcuts
    ? t('page.mdr.pipelineManagement.toolbar.redoWithShortcut', 'Redo (Ctrl+Y)')
    : t('page.mdr.pipelineManagement.toolbar.redo', 'Redo');

  return (
    <Button.Group size={size}>
      <Tooltip title={undoTitle}>
        <Button
          disabled={disabled || !canUndo}
          icon={<UndoOutlined />}
          onClick={onUndo}
        >
          {showLabels && t('page.mdr.pipelineManagement.toolbar.undo', 'Undo')}
        </Button>
      </Tooltip>
      <Tooltip title={redoTitle}>
        <Button
          disabled={disabled || !canRedo}
          icon={<RedoOutlined />}
          onClick={onRedo}
        >
          {showLabels && t('page.mdr.pipelineManagement.toolbar.redo', 'Redo')}
        </Button>
      </Tooltip>
    </Button.Group>
  );
};

export default UndoRedoToolbar;
