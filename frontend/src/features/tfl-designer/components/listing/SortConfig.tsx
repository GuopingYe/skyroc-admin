/**
 * TFL Builder - Sort Configuration
 *
 * Multi-field sorting configuration for listings
 */
import { useMemo } from 'react';
import {
  Card,
  Button,
  Space,
  Select,
  Typography,
  Tag,
  Divider,
  message
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import type { SortConfig, SortOperator } from '../../types';

const { Text } = Typography;

interface Props {
  displayId: string;
  sortRules: SortConfig[];
  columns: Array<{ id: string; name: string; label: string }>;
  onAdd: () => void;
  onUpdate: (index: number, updates: Partial<SortConfig>) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDelete: (index: number) => void;
  disabled?: boolean;
}

export default function SortConfig({
  displayId,
  sortRules,
  columns,
  onAdd,
  onUpdate,
  onReorder,
  onDelete,
  disabled = false
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
    <Card title="Sort Configuration" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {sortedRules.map((rule, index) => (
          <div
            key={`sort-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 12,
              padding: '12px',
              backgroundColor: '#fafafa',
              border: '1px solid #e8e8e8',
              borderRadius: 4,
            }}
          >
            <div style={{ flex: 1, marginRight: 12 }}>
              <Tag color="blue" style={{ fontSize: 11 }}>
                Priority {rule.priority}
              </Tag>
            </div>

            <div style={{ flex: 3, marginRight: 12 }}>
              <Select
                placeholder="Select column"
                value={rule.columnId}
                disabled={disabled}
                onChange={value => handleUpdateRule(index, 'columnId', value)}
                style={{ width: '100%', fontSize: 12 }}
                options={columns.map(c => ({ value: c.id, label: c.label || c.name }))}
              />
            </div>

            <div style={{ flex: 3, marginRight: 12 }}>
              <Select
                value={rule.order}
                disabled={disabled}
                onChange={value => handleUpdateRule(index, 'order', value as SortOperator)}
                style={{ fontSize: 12 }}
              >
                <Select.Option value="asc">Ascending &#8593;</Select.Option>
                <Select.Option value="desc">Descending &#8595;</Select.Option>
              </Select>
            </div>

            <Space>
              <Button
                size="small"
                icon={<ArrowUpOutlined />}
                disabled={disabled || index === 0}
                onClick={() => handleMoveUp(index)}
              />
              <Button
                size="small"
                icon={<ArrowDownOutlined />}
                disabled={disabled || index === sortedRules.length - 1}
                onClick={() => handleMoveDown(index)}
              />
              <Button
                size="small"
                icon={<ArrowUpOutlined />}
                disabled={disabled}
                onClick={() => handleMoveToTop(index)}
                title="Move to top"
              />
              <Button
                size="small"
                icon={<ArrowDownOutlined />}
                disabled={disabled || index === sortedRules.length - 1}
                onClick={() => handleMoveToBottom(index)}
                title="Move to bottom"
              />
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                disabled={disabled}
                onClick={() => handleDeleteRule(index)}
              />
            </Space>
          </div>
        ))}

        <Divider />

        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddRule}
          disabled={disabled}
          block
        >
          Add Sort Rule
        </Button>
      </Space>
    </Card>
  );
}
