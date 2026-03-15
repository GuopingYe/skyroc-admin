/**
 * ResizableTitle - 可拖拽调整宽度的表头组件
 *
 * 基于 react-resizable 实现 Ant Design Table 列宽拖拽调整功能
 */
import type { TableComponents } from 'rc-table/lib/interface';
import React from 'react';
import type { ResizeCallbackData } from 'react-resizable';
import { Resizable } from 'react-resizable';

import 'react-resizable/css/styles.css';

interface ResizableTitleProps {
  onResize: (e: React.SyntheticEvent, data: ResizeCallbackData) => void;
  width: number;
  [key: string]: unknown;
}

/** 可调整宽度的表头单元格组件 */
const ResizableTitle: React.FC<ResizableTitleProps> = props => {
  const { onResize, width, ...restProps } = props;

  // 如果没有设置宽度，则不需要调整功能
  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <Resizable
      draggableOpts={{ enableUserSelectHack: false }}
      height={0}
      width={width}
      handle={
        <span
          className="react-resizable-handle"
          style={{
            bottom: 0,
            cursor: 'col-resize',
            height: '100%',
            position: 'absolute',
            right: -5,
            width: 10,
            zIndex: 1
          }}
          onClick={e => {
            // 阻止点击事件冒泡，防止触发排序
            e.stopPropagation();
          }}
        />
      }
      onResize={onResize}
    >
      <th {...restProps} />
    </Resizable>
  );
};

/**
 * 创建可调整宽度的表头组件
 *
 * @param handleResize 列宽调整回调函数
 */
export const createResizableComponents = (
  handleResize: (key: string) => (e: React.SyntheticEvent, data: ResizeCallbackData) => void
): TableComponents<any> => ({
  header: {
    cell: (props: any) => {
      const { width, ...restProps } = props;
      const key = props.dataIndex || props.key;

      // 对于 Action 列（fixed: 'right'）不启用拖拽
      if (props.fixed === 'right' || !width) {
        return <th {...restProps} />;
      }

      return (
        <ResizableTitle
          {...restProps}
          width={width}
          onResize={handleResize(key)}
        />
      );
    }
  }
});

export default ResizableTitle;
