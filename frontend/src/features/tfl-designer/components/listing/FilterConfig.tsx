/**
 * TFL Builder - Filter Configuration
 *
 * Multi-field filter conditions for listings
 */
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Divider, Form, Input, Select, Space, Tag, Typography, message } from 'antd';
import { useState } from 'react';

import { filterOperatorOptions } from '../../stores';
import type { FilterConfig, FilterOperator } from '../../types';

const { Text } = Typography;
const { Option } = Select;

interface Props {
  columns: Array<{ id: string; label: string; name: string }>;
  disabled?: boolean;
  displayId: string;
  filters: FilterConfig[];
  onAdd: () => void;
  onDelete: (index: number) => void;
  onUpdate: (index: number, updates: Partial<FilterConfig>) => void;
}

export default function FilterConfig({
  columns,
  disabled = false,
  displayId,
  filters,
  onAdd,
  onDelete,
  onUpdate
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
      return (
        <Input
          disabled
          placeholder="No value needed for this operator"
        />
      );
    }

    if (filter.operator === 'in') {
      return (
        <Select
          disabled={disabled}
          mode="multiple"
          options={Array.isArray(filter.value) ? filter.value.map(v => ({ label: v, value: v })) : []}
          placeholder="Select values"
        />
      );
    }

    return (
      <Input
        disabled={disabled}
        placeholder="Enter value"
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
        key={`filter-${index}`}
        size="small"
        style={{
          border: isEditing ? '2px solid #1890ff' : undefined,
          marginBottom: 12
        }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            columnId: filter.columnId,
            operator: filter.operator,
            value: filter.value
          }}
          onValuesChange={changedValues => {
            if (changedValues.operator) {
              onUpdate(index, { operator: changedValues.operator });
            }
          }}
        >
          {/* Header */}
          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
            <Text strong>Filter #{index + 1}</Text>
            <Space>
              <Button
                disabled={disabled}
                icon={<EditOutlined />}
                size="small"
                type="text"
                onClick={() => {
                  setEditingIndex(index);
                  form.setFieldsValue({
                    columnId: filter.columnId,
                    operator: filter.operator,
                    value: filter.value
                  });
                }}
              />
              <Button
                danger
                disabled={disabled}
                icon={<DeleteOutlined />}
                size="small"
                type="text"
                onClick={() => handleDeleteFilter(index)}
              />
            </Space>
          </Space>

          {/* Form Fields */}
          <Form.Item
            label="Column"
            name="columnId"
          >
            <Select
              disabled={disabled}
              options={columns.map(c => ({ label: c.label || c.name, value: c.id }))}
              placeholder="Select column"
              style={{ width: '100%' }}
              onChange={() => onUpdate(index, { columnId: form.getFieldValue('columnId') })}
            />
          </Form.Item>

          <Form.Item
            label="Operator"
            name="operator"
          >
            <Select
              disabled={disabled}
              placeholder="Select operator"
              style={{ width: '100%' }}
              options={filterOperatorOptions.map(op => (
                <Option
                  key={op.value}
                  title={op.label}
                  value={op.value}
                >
                  <Text strong>{op.label}</Text>
                </Option>
              ))}
              onChange={() => onUpdate(index, { operator: form.getFieldValue('operator') })}
            />
            {getOperatorDescription(filter.operator) && (
              <Text
                style={{ color: '#999', fontSize: 11, marginTop: 4 }}
                type="secondary"
              >
                {getOperatorDescription(filter.operator)}
              </Text>
            )}
          </Form.Item>

          <Form.Item
            label="Value"
            name="value"
          >
            {getValueInput(filter)}
          </Form.Item>

          {isEditing && (
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <Button
                size="small"
                type="primary"
                onClick={handleUpdateFilter}
              >
                Save
              </Button>
              <Button
                size="small"
                onClick={() => setEditingIndex(null)}
              >
                Cancel
              </Button>
            </div>
          )}
        </Form>
      </Card>
    );
  };

  return (
    <Card
      size="small"
      title="Filter Configuration"
    >
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button
            block
            disabled={disabled}
            icon={<PlusOutlined />}
            type="dashed"
            onClick={handleAddFilter}
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
            color: '#999',
            padding: '40px',
            textAlign: 'center'
          }}
        >
          <Text type="secondary">No filter rules defined</Text>
          <div style={{ marginTop: 8 }}>
            <Button
              disabled={disabled}
              icon={<PlusOutlined />}
              type="dashed"
              onClick={handleAddFilter}
            >
              Add First Filter
            </Button>
          </div>
        </div>
      ) : (
        <div>{filters.map((filter, index) => renderFilterCard(filter, index))}</div>
      )}
    </Card>
  );
}
