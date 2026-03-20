/**
 * TFL Builder - Filter Configuration
 *
 * Multi-field filter conditions for listings
 */
import { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Typography,
  Divider,
  message
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined
} from '@ant-design/icons';
import type { FilterConfig, FilterOperator } from '../../types';
import { filterOperatorOptions } from '../../stores';

const { Text } = Typography;
const { Option } = Select;

interface Props {
  displayId: string;
  filters: FilterConfig[];
  columns: Array<{ id: string; name: string; label: string }>;
  onAdd: () => void;
  onUpdate: (index: number, updates: Partial<FilterConfig>) => void;
  onDelete: (index: number) => void;
  disabled?: boolean;
}

export default function FilterConfig({
  displayId,
  filters,
  columns,
  onAdd,
  onUpdate,
  onDelete,
  disabled = false
}: Props) {
  const [form] = Form.useForm();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Get operator description from store options
  const getOperatorDescription = (operator: FilterOperator) => {
    const op = filterOperatorOptions.find(o => o.value === operator);
    return op?.label || '';
  };

  // Get input component based on operator
  const getValueInput = (filter: FilterConfig) => {
    if (filter.operator === 'is_null' || filter.operator === 'not_null') {
      return <Input disabled placeholder="No value needed for this operator" />;
    }

    if (filter.operator === 'in') {
      return (
        <Select
          mode="multiple"
          placeholder="Select values"
          disabled={disabled}
          options={Array.isArray(filter.value) ? filter.value.map(v => ({ label: v, value: v })) : []}
        />
      );
    }

    return (
      <Input
        placeholder="Enter value"
        disabled={disabled}
      />
    );
  };

  // Handle add filter
  const handleAddFilter = () => {
    onAdd();
    message.success('Filter added');
  };

  // Handle update filter
  const handleUpdateFilter = () => {
    if (editingIndex === null) return;

    form.validateFields().then(values => {
      onUpdate(editingIndex, values);
      setEditingIndex(null);
      form.resetFields();
      message.success('Filter updated');
    });
  };

  // Handle delete filter
  const handleDeleteFilter = (index: number) => {
    if (filters.length <= 1) {
      message.warning('At least one filter must remain');
      return;
    }
    onDelete(index);
    message.success('Filter deleted');
  };

  // Filter cards
  const renderFilterCard = (filter: FilterConfig, index: number) => {
    const isEditing = editingIndex === index;

    return (
      <Card
        size="small"
        key={`filter-${index}`}
        style={{
          marginBottom: 12,
          border: isEditing ? '2px solid #1890ff' : undefined,
        }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            operator: filter.operator,
            value: filter.value,
            columnId: filter.columnId,
          }}
          onValuesChange={(changedValues) => {
            if (changedValues.operator) {
              onUpdate(index, { operator: changedValues.operator });
            }
          }}
        >
          {/* Header */}
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text strong>Filter #{index + 1}</Text>
            <Space>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                disabled={disabled}
                onClick={() => {
                  setEditingIndex(index);
                  form.setFieldsValue({
                    operator: filter.operator,
                    value: filter.value,
                    columnId: filter.columnId,
                  });
                }}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={disabled}
                onClick={() => handleDeleteFilter(index)}
              />
            </Space>
          </Space>

          {/* Form Fields */}
          <Form.Item name="columnId" label="Column">
            <Select
              placeholder="Select column"
              disabled={disabled}
              style={{ width: '100%' }}
              onChange={() => onUpdate(index, { columnId: form.getFieldValue('columnId') })}
              options={columns.map(c => ({ value: c.id, label: c.label || c.name }))}
            />
          </Form.Item>

          <Form.Item name="operator" label="Operator">
            <Select
              placeholder="Select operator"
              disabled={disabled}
              style={{ width: '100%' }}
              onChange={() => onUpdate(index, { operator: form.getFieldValue('operator') })}
              options={filterOperatorOptions.map(op => (
                <Option
                  key={op.value}
                  value={op.value}
                  title={op.label}
                >
                  <Text strong>{op.label}</Text>
                </Option>
              ))}
            />
            {getOperatorDescription(filter.operator) && (
              <Text
                type="secondary"
                style={{ fontSize: 11, color: '#999', marginTop: 4 }}
              >
                {getOperatorDescription(filter.operator)}
              </Text>
            )}
          </Form.Item>

          <Form.Item name="value" label="Value">
            {getValueInput(filter)}
          </Form.Item>

          {isEditing && (
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <Button type="primary" size="small" onClick={handleUpdateFilter}>
                Save
              </Button>
              <Button size="small" onClick={() => setEditingIndex(null)}>
                Cancel
              </Button>
            </div>
          )}
        </Form>
      </Card>
    );
  };

  return (
    <Card title="Filter Configuration" size="small">
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddFilter}
            disabled={disabled}
            block
          >
            Add Filter Rule
          </Button>
          <Text type="secondary">
            {filters.length} filter{filters.length !== 1 ? 's' : ''} rule{filters.length !== 1 ? 's' : ''} defined
          </Text>
        </Space>
      </div>

      {filters.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
            color: '#999',
          }}
        >
          <Text type="secondary">No filter rules defined</Text>
          <div style={{ marginTop: 8 }}>
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddFilter}
              disabled={disabled}
            >
              Add First Filter
            </Button>
          </div>
        </div>
      ) : (
        <div>
          {filters.map((filter, index) => renderFilterCard(filter, index))}
        </div>
      )}
    </Card>
  );
}
