/**
 * Undo/Redo Toolbar
 *
 * A compact toolbar with undo/redo buttons for the pipeline management page.
 * Can be placed in the page header or inline.
 */
import React from 'react';
import { Button, Space, Tooltip } from 'antd';
import { RedoOutlined, UndoOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

export interface UndoRedoToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  showLabels?: boolean;
  showShortcuts?: boolean;
}

export const UndoRedoToolbar: React.FC<UndoRedoToolbarProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  disabled = false,
  size = 'small',
  showLabels = false,
  showShortcuts = true
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
          icon={<UndoOutlined />}
          disabled={disabled || !canUndo}
          onClick={onUndo}
        >
          {showLabels && t('page.mdr.pipelineManagement.toolbar.undo', 'Undo')}
        </Button>
      </Tooltip>
      <Tooltip title={redoTitle}>
        <Button
          icon={<RedoOutlined />}
          disabled={disabled || !canRedo}
          onClick={onRedo}
        >
          {showLabels && t('page.mdr.pipelineManagement.toolbar.redo', 'Redo')}
        </Button>
      </Tooltip>
    </Button.Group>
  );
};

export default UndoRedoToolbar;