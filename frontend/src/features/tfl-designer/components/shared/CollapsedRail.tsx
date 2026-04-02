import { RightOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import React from 'react';

interface CollapsedRailProps {
  tooltip: string;
  onExpand: () => void;
}

/** Thin accent rail (12px) with hover-to-reveal glass-morphism expand pill. */
const CollapsedRail: React.FC<CollapsedRailProps> = ({ tooltip, onExpand }) => (
  <div
    className="group relative flex flex-col flex-shrink-0 items-center cursor-pointer"
    style={{ width: 12 }}
    onClick={onExpand}
  >
    <div className="absolute inset-y-0 left-0 w-[2px] bg-blue-400/40 transition-all group-hover:bg-blue-400/70 group-hover:w-[3px]" />
    <Tooltip title={tooltip} placement="right">
      <div className="absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 22,
            height: 22,
            background: 'rgba(24,144,255,0.08)',
            border: '1px solid rgba(24,144,255,0.2)'
          }}
        >
          <RightOutlined style={{ fontSize: 9, color: '#1890ff' }} />
        </div>
      </div>
    </Tooltip>
  </div>
);

export default CollapsedRail;
