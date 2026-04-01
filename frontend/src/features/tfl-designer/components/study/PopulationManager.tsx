/**
 * TFL Designer - Population Manager
 *
 * Manage analysis populations (Safety, FAS, PPS, MITT, etc.) Connected to global studyStore for persistent state.
 */
import { CheckOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message
} from 'antd';
import { useCallback, useState } from 'react';

import { useStudyStore } from '../../stores';
import type { PopulationSet } from '../../types';

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
      dataset: population.dataset,
      description: population.description,
      filterExpression: population.filterExpression,
      name: population.name
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
          ...values
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
      dataIndex: 'name',
      key: 'name',
      title: 'Name',
      width: 150
    },
    {
      dataIndex: 'description',
      ellipsis: true,
      key: 'description',
      title: 'Description'
    },
    {
      dataIndex: 'dataset',
      key: 'dataset',
      title: 'Dataset',
      width: 120
    },
    {
      dataIndex: 'filterExpression',
      ellipsis: true,
      key: 'filterExpression',
      render: (text: string) => (
        <code style={{ background: '#f5f5f5', borderRadius: 3, fontSize: 11, padding: '2px 6px' }}>{text || '-'}</code>
      ),
      title: 'Filter Expression'
    },
    {
      key: 'isDefault',
      render: (_: unknown, record: PopulationSet) => (record.isDefault ? <Tag color="green">Default</Tag> : null),
      title: 'Default',
      width: 70
    },
    {
      key: 'actions',
      render: (_: unknown, record: PopulationSet) => (
        <Space size="small">
          <Tooltip title="Set as Default">
            <Button
              icon={<CheckOutlined />}
              size="small"
              type="text"
              onClick={() => handleSetDefault(record.id)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              disabled={readOnly}
              icon={<EditOutlined />}
              size="small"
              type="text"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            cancelText="Cancel"
            description="This action cannot be undone."
            disabled={readOnly}
            okText="Delete"
            title="Are you sure you want to delete this population?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="Delete">
              <Button
                danger
                disabled={readOnly}
                icon={<DeleteOutlined />}
                size="small"
                type="text"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
      title: 'Actions',
      width: 120
    }
  ];

  return (
    <Card
      size="small"
      extra={
        <Button
          disabled={readOnly}
          icon={<PlusOutlined />}
          size="small"
          type="primary"
          onClick={handleAdd}
        >
          Add Population
        </Button>
      }
      title={
        <Space>
          <Title
            level={5}
            style={{ margin: 0 }}
          >
            Populations
          </Title>
          <Tag color="blue">{populations.length}</Tag>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={populations}
        pagination={false}
        rowKey="id"
        size="small"
        locale={{
          emptyText: (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No populations defined</Text>
              <div style={{ marginTop: 8 }}>
                <Button
                  disabled={readOnly}
                  icon={<PlusOutlined />}
                  type="dashed"
                  onClick={handleAdd}
                >
                  Add First Population
                </Button>
              </div>
            </div>
          )
        }}
      />

      {/* Add/Edit Modal */}
      <Modal
        okText={editingPopulation ? 'Update' : 'Add'}
        open={modalVisible}
        title={editingPopulation ? 'Edit Population' : 'Add Population'}
        width={600}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingPopulation(null);
        }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            dataset: '',
            description: '',
            filterExpression: '',
            name: ''
          }}
        >
          <Form.Item
            label="Population Name"
            name="name"
            rules={[{ message: 'Please enter population name', required: true }]}
          >
            <Input
              showCount
              maxLength={50}
              placeholder="e.g., Safety, FAS, PPS"
            />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ message: 'Please enter description', required: true }]}
          >
            <Input.TextArea
              placeholder="Purpose and inclusion criteria"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            label="Reference Dataset"
            name="dataset"
            rules={[{ message: 'Please select dataset', required: true }]}
          >
            <Select
              placeholder="Select dataset"
              options={[
                { label: 'ADSL - Subject Level', value: 'ADSL' },
                { label: 'ADES - ECG Subset', value: 'ADES' },
                { label: 'ADAE - Adverse Events', value: 'ADAE' },
                { label: 'ADLB - Laboratory', value: 'ADLB' },
                { label: 'ADVS - Vital Signs', value: 'ADVS' },
                { label: 'ADPC - PK Parameters', value: 'ADPC' },
                { label: 'ADRS - Efficacy', value: 'ADRS' },
                { label: 'ADCM - Concomitant Meds', value: 'ADCM' }
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Filter Expression"
            name="filterExpression"
            tooltip="SQL/SAS filter expression (optional)"
          >
            <Input.TextArea
              placeholder="e.g., SAFFL='Y' AND AGE>=18"
              rows={2}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          {editingPopulation && (
            <div style={{ background: '#f5f5f5', borderRadius: 4, padding: '8px 12px' }}>
              <Text
                style={{ fontSize: 11 }}
                type="secondary"
              >
                ID: {editingPopulation.id}
              </Text>
            </div>
          )}
        </Form>
      </Modal>
    </Card>
  );
}
