/**
 * TFL Designer - Study Shell Library
 *
 * Manage per-category shell templates at the study level.
 * Templates are cloned when creating analysis-level shells.
 */
import { useState, useMemo } from 'react';
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
  Segmented,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { StudyTemplate, AnalysisCategory } from '../../types';
import { generateId, categoryOptions } from '../../types';
import { useStudyStore } from '../../stores';

const { Text, Title } = Typography;

const DISPLAY_TYPE_OPTIONS = [
  { value: 'Table', label: 'Table' },
  { value: 'Figure', label: 'Figure' },
  { value: 'Listing', label: 'Listing' },
];

export default function StudyShellLibrary() {
  const studyTemplates = useStudyStore((s) => s.studyTemplates);
  const addStudyTemplate = useStudyStore((s) => s.addStudyTemplate);
  const updateStudyTemplate = useStudyStore((s) => s.updateStudyTemplate);
  const deleteStudyTemplate = useStudyStore((s) => s.deleteStudyTemplate);
  const statisticsSets = useStudyStore((s) => s.statisticsSets);

  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<StudyTemplate | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<StudyTemplate | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const statisticsSetOptions = useMemo(
    () => statisticsSets.map((ss) => ({ value: ss.id, label: ss.name })),
    [statisticsSets],
  );

  const categories = useMemo(() => {
    const cats = new Set(studyTemplates.map((t) => t.category));
    return ['All', ...Array.from(cats).sort()];
  }, [studyTemplates]);

  const filteredTemplates = useMemo(
    () => (categoryFilter === 'All' ? studyTemplates : studyTemplates.filter((t) => t.category === categoryFilter)),
    [studyTemplates, categoryFilter],
  );

  const handleAdd = () => {
    setEditingTemplate(null);
    form.resetFields();
    form.setFieldsValue({ displayType: 'Table', category: 'Demographics' });
    setModalVisible(true);
  };

  const handleEdit = (template: StudyTemplate) => {
    setEditingTemplate(template);
    form.setFieldsValue({
      category: template.category,
      templateName: template.templateName,
      displayType: template.displayType,
      statisticsSetId: template.statisticsSetId,
    });
    setModalVisible(true);
  };

  const handleDelete = (id: string | number) => {
    deleteStudyTemplate(id);
    message.success('Template deleted');
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingTemplate) {
        updateStudyTemplate(editingTemplate.id, {
          category: values.category,
          templateName: values.templateName,
          displayType: values.displayType,
          statisticsSetId: values.statisticsSetId,
        });
        message.success('Template updated');
      } else {
        const newTemplate: StudyTemplate = {
          id: generateId('tpl'),
          scopeNodeId: '',
          category: values.category,
          templateName: values.templateName,
          displayType: values.displayType,
          shellSchema: {
            id: generateId('table'),
            shellNumber: '',
            title: '',
            population: 'Safety',
            category: values.category,
            dataset: 'ADSL',
            treatmentArmSetId: '',
            statisticsSetId: '',
            rows: [],
            footer: { source: '', notes: [] },
          },
          statisticsSetId: values.statisticsSetId,
          version: 1,
        };
        addStudyTemplate(newTemplate);
        message.success('Template created');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingTemplate(null);
    });
  };

  const handlePreview = (template: StudyTemplate) => {
    setPreviewTemplate(template);
    setPreviewVisible(true);
  };

  const columns = [
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (val: AnalysisCategory) => (
        <Tag color="geekblue">{categoryOptions.find((c) => c.value === val)?.label ?? val}</Tag>
      ),
    },
    {
      title: 'Template Name',
      dataIndex: 'templateName',
      key: 'templateName',
      width: 220,
    },
    {
      title: 'Source',
      dataIndex: 'sourceLevel',
      key: 'source',
      width: 120,
      render: (level: string | undefined, record: StudyTemplate) => {
        if (!level) return <Text type="secondary">Scratch</Text>;
        const color = level === 'global' ? 'geekblue' : level === 'ta' ? 'purple' : 'green';
        return (
          <Tag color={color}>
            {level === 'global' ? 'Global' : level === 'ta' ? 'TA' : 'Study'}
          </Tag>
        );
      },
    },
    {
      title: 'Type',
      dataIndex: 'displayType',
      key: 'displayType',
      width: 90,
      render: (val: string) => (
        <Tag color={val === 'Table' ? 'blue' : val === 'Figure' ? 'green' : 'orange'}>{val}</Tag>
      ),
    },
    {
      title: 'Statistics Set',
      dataIndex: 'statisticsSetId',
      key: 'statisticsSetId',
      width: 160,
      render: (val: string | undefined) => {
        if (!val) return <Text type="secondary">-</Text>;
        const ss = statisticsSets.find((s) => s.id === val);
        return ss ? <Text>{ss.name}</Text> : <Text type="secondary">{val}</Text>;
      },
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 70,
      align: 'center' as const,
      render: (val: number) => <Tag>v{val}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: StudyTemplate) => (
        <Space size="small">
          <Tooltip title="Preview JSON">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handlePreview(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm title="Delete this template?" onConfirm={() => handleDelete(record.id)}>
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
          <Title level={5} style={{ margin: 0 }}>Study Shell Library</Title>
          <Tag color="purple">{studyTemplates.length}</Tag>
        </Space>
      }
      size="small"
      extra={
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Template
        </Button>
      }
    >
      {categories.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <Segmented
            size="small"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categories.map((c) => ({
              value: c,
              label: c === 'All' ? 'All' : categoryOptions.find((o) => o.value === c)?.label ?? c,
            }))}
          />
        </div>
      )}

      <Table
        dataSource={filteredTemplates}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        locale={{
          emptyText: (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No shell templates defined for this study</Text>
              <div style={{ marginTop: 8 }}>
                <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd}>
                  Add First Template
                </Button>
              </div>
            </div>
          ),
        }}
      />

      {/* Add/Edit Modal */}
      <Modal
        title={editingTemplate ? 'Edit Shell Template' : 'Add Shell Template'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingTemplate(null);
        }}
        onOk={handleSubmit}
        width={600}
        okText={editingTemplate ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Select a category' }]}>
            <Select options={categoryOptions} placeholder="Select category" />
          </Form.Item>
          <Form.Item name="templateName" label="Template Name" rules={[{ required: true, message: 'Enter a name' }]}>
            <Input placeholder="e.g., Standard Demographics Table" />
          </Form.Item>
          <Form.Item name="displayType" label="Display Type" rules={[{ required: true }]}>
            <Select options={DISPLAY_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="statisticsSetId" label="Statistics Set">
            <Select options={statisticsSetOptions} allowClear placeholder="Select statistics set (optional)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* JSON Preview Modal */}
      <Modal
        title={previewTemplate ? `Preview: ${previewTemplate.templateName}` : 'Preview'}
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false);
          setPreviewTemplate(null);
        }}
        footer={null}
        width={700}
      >
        {previewTemplate && (
          <Input.TextArea
            value={JSON.stringify(previewTemplate.shellSchema, null, 2)}
            readOnly
            autoSize={{ minRows: 10, maxRows: 25 }}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        )}
      </Modal>
    </Card>
  );
}
