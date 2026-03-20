/**
 * TFL Designer - Population Manager
 *
 * Manage analysis populations (Safety, FAS, PPS, MITT, etc.)
 * Connected to global studyStore for persistent state.
 */
import { useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined
} from '@ant-design/icons';
import type { PopulationSet } from '../../types';
import { useStudyStore } from '../../stores';

const { Text, Title } = Typography;

interface Props {
  readOnly?: boolean;
}

export default function PopulationManager({ readOnly = false }: Props) {
  const populations = useStudyStore(s => s.populationSets);
  const addPopulationSet = useStudyStore(s => s.addPopulationSet);
  const updatePopulationSet = useStudyStore(s => s.updatePopulationSet);
  const deletePopulationSet = useStudyStore(s => s.deletePopulationSet);
  const setDefaultPop = useStudyStore(s => s.setDefaultPopulation);

  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPopulation, setEditingPopulation] = useState<PopulationSet | null>(null);

  // Handle add population
  const handleAdd = () => {
    setEditingPopulation(null);
    form.resetFields();
    setModalVisible(true);
  };

  // Handle edit population
  const handleEdit = (population: PopulationSet) => {
    setEditingPopulation(population);
    form.setFieldsValue({
      name: population.name,
      description: population.description,
      dataset: population.dataset,
      filterExpression: population.filterExpression,
    });
    setModalVisible(true);
  };

  // Handle delete population
  const handleDelete = (id: string) => {
    const target = populations.find(p => p.id === id);
    const wasDefault = target?.isDefault;
    deletePopulationSet(id);
    if (wasDefault) {
      const remaining = populations.filter(p => p.id !== id);
      if (remaining.length > 0) {
        setDefaultPop(remaining[0].id);
      }
    }
    message.success('Population deleted');
  };

  // Handle form submit
  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (editingPopulation) {
        updatePopulationSet(editingPopulation.id, values);
        message.success('Population updated');
      } else {
        addPopulationSet({
          ...values,
        });
        message.success('Population added');
      }

      setModalVisible(false);
      form.resetFields();
      setEditingPopulation(null);
    });
  };

  // Handle set as default
  const handleSetDefault = (id: string) => {
    setDefaultPop(id);
    message.success('Default population updated');
  };

  // Table columns
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Dataset',
      dataIndex: 'dataset',
      key: 'dataset',
      width: 120,
    },
    {
      title: 'Filter Expression',
      dataIndex: 'filterExpression',
      key: 'filterExpression',
      ellipsis: true,
      render: (text: string) => (
        <code style={{ fontSize: 11, background: '#f5f5f5', padding: '2px 6px', borderRadius: 3 }}>
          {text || '-'}
        </code>
      ),
    },
    {
      title: 'Default',
      key: 'isDefault',
      width: 70,
      render: (_: unknown, record: PopulationSet) => (
        record.isDefault ? <Tag color="green">Default</Tag> : null
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: PopulationSet) => (
        <Space size="small">
          <Tooltip title="Set as Default">
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleSetDefault(record.id)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              disabled={readOnly}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this population?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            disabled={readOnly}
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={readOnly}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>Populations</Title>
          <Tag color="blue">{populations.length}</Tag>
        </Space>
      }
      size="small"
      extra={
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          disabled={readOnly}
        >
          Add Population
        </Button>
      }
    >
      <Table
        dataSource={populations}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        locale={{
          emptyText: (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No populations defined</Text>
              <div style={{ marginTop: 8 }}>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                  disabled={readOnly}
                >
                  Add First Population
                </Button>
              </div>
            </div>
          ),
        }}
      />

      {/* Add/Edit Modal */}
      <Modal
        title={editingPopulation ? 'Edit Population' : 'Add Population'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingPopulation(null);
        }}
        onOk={handleSubmit}
        width={600}
        okText={editingPopulation ? 'Update' : 'Add'}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            name: '',
            description: '',
            dataset: '',
            filterExpression: '',
          }}
        >
          <Form.Item
            name="name"
            label="Population Name"
            rules={[{ required: true, message: 'Please enter population name' }]}
          >
            <Input
              placeholder="e.g., Safety, FAS, PPS"
              showCount
              maxLength={50}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <Input.TextArea
              placeholder="Purpose and inclusion criteria"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            name="dataset"
            label="Reference Dataset"
            rules={[{ required: true, message: 'Please select dataset' }]}
          >
            <Select
              placeholder="Select dataset"
              options={[
                { value: 'ADSL', label: 'ADSL - Subject Level' },
                { value: 'ADES', label: 'ADES - ECG Subset' },
                { value: 'ADAE', label: 'ADAE - Adverse Events' },
                { value: 'ADLB', label: 'ADLB - Laboratory' },
                { value: 'ADVS', label: 'ADVS - Vital Signs' },
                { value: 'ADPC', label: 'ADPC - PK Parameters' },
                { value: 'ADRS', label: 'ADRS - Efficacy' },
                { value: 'ADCM', label: 'ADCM - Concomitant Meds' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="filterExpression"
            label="Filter Expression"
            tooltip="SQL/SAS filter expression (optional)"
          >
            <Input.TextArea
              placeholder="e.g., SAFFL='Y' AND AGE>=18"
              rows={2}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          {editingPopulation && (
            <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                ID: {editingPopulation.id}
              </Text>
            </div>
          )}
        </Form>
      </Modal>
    </Card>
  );
}
