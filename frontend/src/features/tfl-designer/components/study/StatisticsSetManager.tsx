/**
 * TFL Designer - Statistics Set Manager
 *
 * Manage study-wide Statistics Sets (reusable stat configurations for tables).
 * Connected to global studyStore.
 */
import { useState } from 'react';
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
  Tooltip,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { StatisticsSet, StatisticItem } from '../../types';
import { generateId } from '../../types';
import { useStudyStore } from '../../stores';

const { Text, Title } = Typography;

const STAT_TYPE_OPTIONS = [
  { value: 'n', label: 'n (Count)' },
  { value: 'mean', label: 'Mean' },
  { value: 'sd', label: 'SD' },
  { value: 'median', label: 'Median' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
  { value: 'range', label: 'Range' },
  { value: 'n_percent', label: 'n (%)' },
  { value: 'header', label: 'Header Row' },
];

export default function StatisticsSetManager() {
  const statisticsSets = useStudyStore((s) => s.statisticsSets);
  const addStatisticsSet = useStudyStore((s) => s.addStatisticsSet);
  const updateStatisticsSet = useStudyStore((s) => s.updateStatisticsSet);
  const deleteStatisticsSet = useStudyStore((s) => s.deleteStatisticsSet);

  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSet, setEditingSet] = useState<StatisticsSet | null>(null);
  const [statItems, setStatItems] = useState<StatisticItem[]>([]);

  const handleAdd = () => {
    setEditingSet(null);
    setStatItems([{ id: generateId('st'), type: 'n', label: 'n', format: 'XX' }]);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (ss: StatisticsSet) => {
    setEditingSet(ss);
    setStatItems([...ss.stats]);
    form.setFieldsValue({ name: ss.name });
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    deleteStatisticsSet(id);
    message.success('Statistics Set deleted');
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingSet) {
        updateStatisticsSet(editingSet.id, { name: values.name, stats: statItems });
        message.success('Statistics Set updated');
      } else {
        addStatisticsSet({ name: values.name, stats: statItems });
        message.success('Statistics Set created');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingSet(null);
    });
  };

  const addStatItem = () => {
    setStatItems((prev) => [...prev, { id: generateId('st'), type: 'n', label: 'n', format: 'XX' }]);
  };

  const updateStatItem = (index: number, updates: Partial<StatisticItem>) => {
    setStatItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const deleteStatItem = (index: number) => {
    setStatItems((prev) => prev.filter((_, i) => i !== index));
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 200 },
    {
      title: 'Statistics',
      key: 'stats',
      render: (_: unknown, record: StatisticsSet) => (
        <Space wrap>
          {record.stats.map((s) => (
            <Tag key={s.id} color="blue">
              {s.label}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: StatisticsSet) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm title="Delete this statistics set?" onConfirm={() => handleDelete(record.id)}>
            <Tooltip title="Delete">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
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
          <Title level={5} style={{ margin: 0 }}>Statistics Sets</Title>
          <Tag color="purple">{statisticsSets.length}</Tag>
        </Space>
      }
      size="small"
      extra={
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Statistics Set
        </Button>
      }
    >
      <Table
        dataSource={statisticsSets}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        locale={{
          emptyText: (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No statistics sets defined</Text>
              <div style={{ marginTop: 8 }}>
                <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd}>
                  Add First Statistics Set
                </Button>
              </div>
            </div>
          ),
        }}
      />

      {/* Add/Edit Modal */}
      <Modal
        title={editingSet ? 'Edit Statistics Set' : 'Add Statistics Set'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingSet(null);
        }}
        onOk={handleSubmit}
        width={700}
        okText={editingSet ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Set Name" rules={[{ required: true, message: 'Please enter a name' }]}>
            <Input placeholder="e.g., Demographics Stats, Safety Categorical Stats" />
          </Form.Item>
        </Form>

        <div style={{ marginBottom: 8 }}>
          <Text strong>Statistic Items</Text>
          <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addStatItem} style={{ marginLeft: 8 }}>
            Add
          </Button>
        </div>
        <Table
          dataSource={statItems}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
            {
              title: 'Type',
              dataIndex: 'type',
              key: 'type',
              width: 150,
              render: (val: string, _: StatisticItem, index: number) => (
                <Select
                  size="small"
                  value={val}
                  onChange={(v) => updateStatItem(index, { type: v as StatisticItem['type'] })}
                  options={STAT_TYPE_OPTIONS}
                  style={{ width: '100%' }}
                />
              ),
            },
            {
              title: 'Label',
              dataIndex: 'label',
              key: 'label',
              render: (val: string, _: StatisticItem, index: number) => (
                <Input size="small" value={val} onChange={(e) => updateStatItem(index, { label: e.target.value })} />
              ),
            },
            {
              title: 'Format',
              dataIndex: 'format',
              key: 'format',
              width: 150,
              render: (val: string, _: StatisticItem, index: number) => (
                <Input
                  size="small"
                  value={val || ''}
                  onChange={(e) => updateStatItem(index, { format: e.target.value })}
                  placeholder="e.g., XX.X"
                />
              ),
            },
            {
              title: '',
              key: 'actions',
              width: 40,
              render: (_: unknown, __: StatisticItem, index: number) => (
                <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => deleteStatItem(index)} />
              ),
            },
          ]}
        />
      </Modal>
    </Card>
  );
}
