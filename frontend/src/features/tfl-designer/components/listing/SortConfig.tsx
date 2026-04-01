/**
 * TFL Builder - Sort Configuration
 *
 * Multi-field sorting configuration for listings
 */
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Divider, Select, Space, Tag, Typography, message } from 'antd';
import { useMemo } from 'react';

import type { SortConfig, SortOperator } from '../../types';

const { Text } = Typography;

interface Props {
  columns: Array<{ id: string; label: string; name: string }>;
  disabled?: boolean;
  displayId: string;
  onAdd: () => void;
  onDelete: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onUpdate: (index: number, updates: Partial<SortConfig>) => void;
  sortRules: SortConfig[];
}

export default function SortConfig({
  columns,
  disabled = false,
  displayId,
  onAdd,
  onDelete,
  onReorder,
  onUpdate,
  sortRules
}: Props) {
  const sortedRules = useMemo(() => {
    return [...sortRules].sort((a, b) => a.priority - b.priority);
  }, [sortRules]);

  // Handle add rule
  const handleAddRule = () => {
    onAdd();
  };

  // Handle update rule
  const handleUpdateRule = (index: number, field: keyof SortConfig, value: unknown) => {
    onUpdate(index, { [field]: value } as any);
  };

  // Handle delete rule
  const handleDeleteRule = (index: number) => {
    if (sortRules.length <= 1) {
      message.warning('At least one sort rule must remain');
      return;
    }
    onDelete(index);
  };

  // Handle reorder (swap adjacent)
  const handleMoveUp = (index: number) => {
    if (index > 0) {
      onReorder(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < sortedRules.length - 1) {
      onReorder(index, index + 1);
    }
  };

  // Handle move to top/bottom
  const handleMoveToTop = (index: number) => {
    onReorder(index, 0);
  };

  const handleMoveToBottom = (index: number) => {
    onReorder(index, sortedRules.length - 1);
  };

  return (
    <Card
      size="small"
      title="Sort Configuration"
    >
      <Space
        direction="vertical"
        size="small"
        style={{ width: '100%' }}
      >
        {sortedRules.map((rule, index) => (
          <div
            key={`sort-${index}`}
            style={{
              alignItems: 'center',
              backgroundColor: '#fafafa',
              border: '1px solid #e8e8e8',
              borderRadius: 4,
              display: 'flex',
              marginBottom: 12,
              padding: '12px'
            }}
          >
            <div style={{ flex: 1, marginRight: 12 }}>
              <Tag
                color="blue"
                style={{ fontSize: 11 }}
              >
                Priority {rule.priority}
              </Tag>
            </div>

            <div style={{ flex: 3, marginRight: 12 }}>
              <Select
                disabled={disabled}
                options={columns.map(c => ({ label: c.label || c.name, value: c.id }))}
                placeholder="Select column"
                style={{ fontSize: 12, width: '100%' }}
                value={rule.columnId}
                onChange={value => handleUpdateRule(index, 'columnId', value)}
              />
            </div>

            <div style={{ flex: 3, marginRight: 12 }}>
              <Select
                disabled={disabled}
                style={{ fontSize: 12 }}
                value={rule.order}
                onChange={value => handleUpdateRule(index, 'order', value as SortOperator)}
              >
                <Select.Option value="asc">Ascending &#8593;</Select.Option>
                <Select.Option value="desc">Descending &#8595;</Select.Option>
              </Select>
            </div>

            <Space>
              <Button
                disabled={disabled || index === 0}
                icon={<ArrowUpOutlined />}
                size="small"
                onClick={() => handleMoveUp(index)}
              />
              <Button
                disabled={disabled || index === sortedRules.length - 1}
                icon={<ArrowDownOutlined />}
                size="small"
                onClick={() => handleMoveDown(index)}
              />
              <Button
                disabled={disabled}
                icon={<ArrowUpOutlined />}
                size="small"
                title="Move to top"
                onClick={() => handleMoveToTop(index)}
              />
              <Button
                disabled={disabled || index === sortedRules.length - 1}
                icon={<ArrowDownOutlined />}
                size="small"
                title="Move to bottom"
                onClick={() => handleMoveToBottom(index)}
              />
              <Button
                danger
                disabled={disabled}
                icon={<DeleteOutlined />}
                size="small"
                type="text"
                onClick={() => handleDeleteRule(index)}
              />
            </Space>
          </div>
        ))}

        <Divider />

        <Button
          block
          disabled={disabled}
          icon={<PlusOutlined />}
          type="dashed"
          onClick={handleAddRule}
        >
          Add Sort Rule
        </Button>
      </Space>
    </Card>
  );
}
