/**
 * TFL Designer - Statistics Set Manager
 *
 * Manage study-wide Statistics Sets (reusable stat configurations for tables). Connected to global studyStore.
 */
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
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
import { useState } from 'react';

import { useStudyStore } from '../../stores';
import type { StatisticItem, StatisticsSet } from '../../types';
import { generateId } from '../../types';

const { Text, Title } = Typography;

const STAT_TYPE_OPTIONS = [
  { label: 'n (Count)', value: 'n' },
  { label: 'Mean', value: 'mean' },
  { label: 'SD', value: 'sd' },
  { label: 'Median', value: 'median' },
  { label: 'Min', value: 'min' },
  { label: 'Max', value: 'max' },
  { label: 'Range', value: 'range' },
  { label: 'n (%)', value: 'n_percent' },
  { label: 'Header Row', value: 'header' }
];

export default function StatisticsSetManager() {
  const statisticsSets = useStudyStore(s => s.statisticsSets);
  const addStatisticsSet = useStudyStore(s => s.addStatisticsSet);
  const updateStatisticsSet = useStudyStore(s => s.updateStatisticsSet);
  const deleteStatisticsSet = useStudyStore(s => s.deleteStatisticsSet);

  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSet, setEditingSet] = useState<StatisticsSet | null>(null);
  const [statItems, setStatItems] = useState<StatisticItem[]>([]);

  const handleAdd = () => {
    setEditingSet(null);
    setStatItems([{ format: 'XX', id: generateId('st'), label: 'n', type: 'n' }]);
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
    form.validateFields().then(values => {
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
    setStatItems(prev => [...prev, { format: 'XX', id: generateId('st'), label: 'n', type: 'n' }]);
  };

  const updateStatItem = (index: number, updates: Partial<StatisticItem>) => {
    setStatItems(prev => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const deleteStatItem = (index: number) => {
    setStatItems(prev => prev.filter((_, i) => i !== index));
  };

  const columns = [
    { dataIndex: 'name', key: 'name', title: 'Name', width: 200 },
    {
      key: 'stats',
      render: (_: unknown, record: StatisticsSet) => (
        <Space wrap>
          {record.stats.map(s => (
            <Tag
              color="blue"
              key={s.id}
            >
              {s.label}
            </Tag>
          ))}
        </Space>
      ),
      title: 'Statistics'
    },
    {
      key: 'actions',
      render: (_: unknown, record: StatisticsSet) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              icon={<EditOutlined />}
              size="small"
              type="text"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this statistics set?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="Delete">
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
                type="text"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
      title: 'Actions',
      width: 100
    }
  ];

  return (
    <Card
      size="small"
      extra={
        <Button
          icon={<PlusOutlined />}
          size="small"
          type="primary"
          onClick={handleAdd}
        >
          Add Statistics Set
        </Button>
      }
      title={
        <Space>
          <Title
            level={5}
            style={{ margin: 0 }}
          >
            Statistics Sets
          </Title>
          <Tag color="purple">{statisticsSets.length}</Tag>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={statisticsSets}
        pagination={false}
        rowKey="id"
        size="small"
        locale={{
          emptyText: (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No statistics sets defined</Text>
              <div style={{ marginTop: 8 }}>
                <Button
                  icon={<PlusOutlined />}
                  type="dashed"
                  onClick={handleAdd}
                >
                  Add First Statistics Set
                </Button>
              </div>
            </div>
          )
        }}
      />

      {/* Add/Edit Modal */}
      <Modal
        okText={editingSet ? 'Update' : 'Create'}
        open={modalVisible}
        title={editingSet ? 'Edit Statistics Set' : 'Add Statistics Set'}
        width={700}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingSet(null);
        }}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="Set Name"
            name="name"
            rules={[{ message: 'Please enter a name', required: true }]}
          >
            <Input placeholder="e.g., Demographics Stats, Safety Categorical Stats" />
          </Form.Item>
        </Form>

        <div style={{ marginBottom: 8 }}>
          <Text strong>Statistic Items</Text>
          <Button
            icon={<PlusOutlined />}
            size="small"
            style={{ marginLeft: 8 }}
            type="dashed"
            onClick={addStatItem}
          >
            Add
          </Button>
        </div>
        <Table
          dataSource={statItems}
          pagination={false}
          rowKey="id"
          size="small"
          columns={[
            {
              dataIndex: 'type',
              key: 'type',
              render: (val: string, _: StatisticItem, index: number) => (
                <Select
                  options={STAT_TYPE_OPTIONS}
                  size="small"
                  style={{ width: '100%' }}
                  value={val}
                  onChange={v => updateStatItem(index, { type: v as StatisticItem['type'] })}
                />
              ),
              title: 'Type',
              width: 150
            },
            {
              dataIndex: 'label',
              key: 'label',
              render: (val: string, _: StatisticItem, index: number) => (
                <Input
                  size="small"
                  value={val}
                  onChange={e => updateStatItem(index, { label: e.target.value })}
                />
              ),
              title: 'Label'
            },
            {
              dataIndex: 'format',
              key: 'format',
              render: (val: string, _: StatisticItem, index: number) => (
                <Input
                  placeholder="e.g., XX.X"
                  size="small"
                  value={val || ''}
                  onChange={e => updateStatItem(index, { format: e.target.value })}
                />
              ),
              title: 'Format',
              width: 150
            },
            {
              key: 'actions',
              render: (_: unknown, __: StatisticItem, index: number) => (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  type="text"
                  onClick={() => deleteStatItem(index)}
                />
              ),
              title: '',
              width: 40
            }
          ]}
        />
      </Modal>
    </Card>
  );
}
