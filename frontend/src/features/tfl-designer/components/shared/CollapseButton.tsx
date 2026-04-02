import { LeftOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import React from 'react';

interface CollapseButtonProps {
  tooltip?: string;
  onCollapse: () => void;
}

/** Minimal collapse icon (20px) with opacity-based hover transition. */
const CollapseButton: React.FC<CollapseButtonProps> = ({ tooltip = 'Collapse', onCollapse }) => (
  <Tooltip title={tooltip}>
    <div
      className="flex items-center justify-center rounded cursor-pointer opacity-30 hover:opacity-70 transition-opacity"
      style={{ width: 20, height: 20 }}
      onClick={onCollapse}
    >
      <LeftOutlined style={{ fontSize: 10 }} />
    </div>
  </Tooltip>
);

export default CollapseButton;
