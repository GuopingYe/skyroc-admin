/**
 * TFL Designer - Study Shell Library
 *
 * Manage per-category shell templates at the study level. Templates are cloned when creating analysis-level shells.
 */
import { CopyOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { useStudyStore, useTemplateStore } from '../../stores';
import type { AnalysisCategory, ScopeLevel, StudyTemplate, Template } from '../../types';
import { categoryOptions, generateId, getDisplayTypeColor, getScopeLevelTagProps, toDisplayType } from '../../types';

const { Text, Title } = Typography;

const DISPLAY_TYPE_OPTIONS = [
  { label: 'Table', value: 'Table' },
  { label: 'Figure', value: 'Figure' },
  { label: 'Listing', value: 'Listing' }
];

export default function StudyShellLibrary() {
  const studyTemplates = useStudyStore(s => s.studyTemplates);
  const addStudyTemplate = useStudyStore(s => s.addStudyTemplate);
  const updateStudyTemplate = useStudyStore(s => s.updateStudyTemplate);
  const deleteStudyTemplate = useStudyStore(s => s.deleteStudyTemplate);
  const statisticsSets = useStudyStore(s => s.statisticsSets);
  const libraryTemplates = useTemplateStore(s => s.templates);
  const initTemplates = useTemplateStore(s => s.initTemplates);

  useEffect(() => {
    initTemplates();
  }, [initTemplates]);

  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<StudyTemplate | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<StudyTemplate | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [libraryPickerVisible, setLibraryPickerVisible] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<'global' | 'ta'>('global');
  const [librarySearch, setLibrarySearch] = useState('');

  const statisticsSetOptions = useMemo(
    () => statisticsSets.map(ss => ({ label: ss.name, value: ss.id })),
    [statisticsSets]
  );

  const categories = useMemo(() => {
    const cats = new Set(studyTemplates.map(t => t.category));
    return ['All', ...Array.from(cats).sort()];
  }, [studyTemplates]);

  const filteredTemplates = useMemo(
    () => (categoryFilter === 'All' ? studyTemplates : studyTemplates.filter(t => t.category === categoryFilter)),
    [studyTemplates, categoryFilter]
  );

  const handleAdd = () => {
    setEditingTemplate(null);
    form.resetFields();
    form.setFieldsValue({ category: 'Demographics', displayType: 'Table' });
    setModalVisible(true);
  };

  const handleEdit = (template: StudyTemplate) => {
    setEditingTemplate(template);
    form.setFieldsValue({
      category: template.category,
      displayType: template.displayType,
      statisticsSetId: template.statisticsSetId,
      templateName: template.templateName
    });
    setModalVisible(true);
  };

  const handleDelete = (id: string | number) => {
    deleteStudyTemplate(id);
    message.success('Template deleted');
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (editingTemplate) {
        updateStudyTemplate(editingTemplate.id, {
          category: values.category,
          displayType: values.displayType,
          statisticsSetId: values.statisticsSetId,
          templateName: values.templateName
        });
        message.success('Template updated');
      } else {
        const newTemplate: StudyTemplate = {
          category: values.category,
          displayType: values.displayType,
          id: generateId('tpl'),
          scopeNodeId: '',
          shellSchema: {
            category: values.category,
            dataset: 'ADSL',
            footer: { notes: [], source: '' },
            id: generateId('table'),
            population: 'Safety',
            rows: [],
            shellNumber: '',
            statisticsSetId: '',
            title: '',
            treatmentArmSetId: ''
          },
          statisticsSetId: values.statisticsSetId,
          templateName: values.templateName,
          version: 1
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

  const libraryFilteredTemplates = useMemo(() => {
    let result = libraryTemplates.filter(t => (t.scopeLevel ?? 'global') === libraryFilter);
    if (librarySearch.trim()) {
      const q = librarySearch.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q));
    }
    return result;
  }, [libraryTemplates, libraryFilter, librarySearch]);

  const handleCopyFromLibrary = (libTemplate: Template) => {
    const scopeLevel = (libTemplate.scopeLevel ?? 'global') as ScopeLevel;
    const newTemplate: StudyTemplate = {
      category: libTemplate.category,
      displayType: toDisplayType(libTemplate.type),
      id: generateId('tpl'),
      scopeNodeId: '',
      shellSchema: structuredClone(libTemplate.shell),
      sourceLevel: scopeLevel,
      templateName: `${libTemplate.name} (from ${scopeLevel})`,
      version: 1
    };
    addStudyTemplate(newTemplate);
    setLibraryPickerVisible(false);
    message.success(`Copied "${libTemplate.name}" from ${scopeLevel} library`);
  };

  const columns = [
    {
      dataIndex: 'category',
      key: 'category',
      render: (val: AnalysisCategory) => (
        <Tag color="geekblue">{categoryOptions.find(c => c.value === val)?.label ?? val}</Tag>
      ),
      title: 'Category',
      width: 140
    },
    {
      dataIndex: 'templateName',
      key: 'templateName',
      title: 'Template Name',
      width: 220
    },
    {
      dataIndex: 'sourceLevel',
      key: 'source',
      render: (level: string | undefined) => {
        if (!level) return <Text type="secondary">Scratch</Text>;
        const props = getScopeLevelTagProps(level as ScopeLevel | 'study');
        return <Tag color={props.color}>{props.label}</Tag>;
      },
      title: 'Source',
      width: 120
    },
    {
      dataIndex: 'displayType',
      key: 'displayType',
      render: (val: string) => (
        <Tag color={getDisplayTypeColor(val as 'Figure' | 'Listing' | 'Table')}>{val}</Tag>
      ),
      title: 'Type',
      width: 90
    },
    {
      dataIndex: 'statisticsSetId',
      key: 'statisticsSetId',
      render: (val: string | undefined) => {
        if (!val) return <Text type="secondary">-</Text>;
        const ss = statisticsSets.find(s => s.id === val);
        return ss ? <Text>{ss.name}</Text> : <Text type="secondary">{val}</Text>;
      },
      title: 'Statistics Set',
      width: 160
    },
    {
      align: 'center' as const,
      dataIndex: 'version',
      key: 'version',
      render: (val: number) => <Tag>v{val}</Tag>,
      title: 'Version',
      width: 70
    },
    {
      key: 'actions',
      render: (_: unknown, record: StudyTemplate) => (
        <Space size="small">
          <Tooltip title="Preview JSON">
            <Button
              icon={<EyeOutlined />}
              size="small"
              type="text"
              onClick={() => handlePreview(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              icon={<EditOutlined />}
              size="small"
              type="text"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this template?"
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
      width: 120
    }
  ];

  return (
    <Card
      size="small"
      extra={
        <Space>
          <Button
            icon={<CopyOutlined />}
            size="small"
            onClick={() => {
              setLibraryFilter('global');
              setLibrarySearch('');
              setLibraryPickerVisible(true);
            }}
          >
            Copy from Library
          </Button>
          <Button
            icon={<PlusOutlined />}
            size="small"
            type="primary"
            onClick={handleAdd}
          >
            Add Template
          </Button>
        </Space>
      }
      title={
        <Space>
          <Title
            level={5}
            style={{ margin: 0 }}
          >
            Study Shell Library
          </Title>
          <Tag color="purple">{studyTemplates.length}</Tag>
        </Space>
      }
    >
      {categories.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <Segmented
            size="small"
            value={categoryFilter}
            options={categories.map(c => ({
              label: c === 'All' ? 'All' : (categoryOptions.find(o => o.value === c)?.label ?? c),
              value: c
            }))}
            onChange={setCategoryFilter}
          />
        </div>
      )}

      <Table
        columns={columns}
        dataSource={filteredTemplates}
        pagination={false}
        rowKey="id"
        size="small"
        locale={{
          emptyText: (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Text type="secondary">No shell templates defined for this study</Text>
              <div style={{ marginTop: 8 }}>
                <Button
                  icon={<PlusOutlined />}
                  type="dashed"
                  onClick={handleAdd}
                >
                  Add First Template
                </Button>
              </div>
            </div>
          )
        }}
      />

      <Modal
        okText={editingTemplate ? 'Update' : 'Create'}
        open={modalVisible}
        title={editingTemplate ? 'Edit Shell Template' : 'Add Shell Template'}
        width={600}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingTemplate(null);
        }}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="Category"
            name="category"
            rules={[{ message: 'Select a category', required: true }]}
          >
            <Select
              options={categoryOptions}
              placeholder="Select category"
            />
          </Form.Item>
          <Form.Item
            label="Template Name"
            name="templateName"
            rules={[{ message: 'Enter a name', required: true }]}
          >
            <Input placeholder="e.g., Standard Demographics Table" />
          </Form.Item>
          <Form.Item
            label="Display Type"
            name="displayType"
            rules={[{ required: true }]}
          >
            <Select options={DISPLAY_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item
            label="Statistics Set"
            name="statisticsSetId"
          >
            <Select
              allowClear
              options={statisticsSetOptions}
              placeholder="Select statistics set (optional)"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        footer={null}
        open={previewVisible}
        title={previewTemplate ? `Preview: ${previewTemplate.templateName}` : 'Preview'}
        width={700}
        onCancel={() => {
          setPreviewVisible(false);
          setPreviewTemplate(null);
        }}
      >
        {previewTemplate && (
          <Input.TextArea
            readOnly
            autoSize={{ maxRows: 25, minRows: 10 }}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
            value={JSON.stringify(previewTemplate.shellSchema, null, 2)}
          />
        )}
      </Modal>

      <Modal
        footer={null}
        open={libraryPickerVisible}
        title="Copy Template from Library"
        width={700}
        onCancel={() => setLibraryPickerVisible(false)}
      >
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <Select
            size="small"
            style={{ width: 150 }}
            value={libraryFilter}
            options={[
              { label: 'Global Library', value: 'global' },
              { label: 'TA Library', value: 'ta' }
            ]}
            onChange={setLibraryFilter}
          />
          <Input.Search
            allowClear
            placeholder="Search templates..."
            size="small"
            style={{ flex: 1 }}
            value={librarySearch}
            onChange={e => setLibrarySearch(e.target.value)}
          />
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {libraryFilteredTemplates.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <Text type="secondary">
                No {libraryFilter} templates available. Add templates in the Template Library page first.
              </Text>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
              {libraryFilteredTemplates.map(tpl => {
                const scopeTag = getScopeLevelTagProps(tpl.scopeLevel as ScopeLevel | undefined);
                const displayType = toDisplayType(tpl.type);
                return (
                <Card
                  hoverable
                  key={tpl.id}
                  size="small"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleCopyFromLibrary(tpl)}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ fontSize: 13 }}>{tpl.name}</Text>
                      <Tag color={getDisplayTypeColor(displayType)}>
                        {displayType}
                      </Tag>
                    </div>
                    <div>
                      <Tag color={scopeTag.color}>
                        {scopeTag.label}
                      </Tag>
                      <Tag style={{ fontSize: 11 }}>
                        {categoryOptions.find(c => c.value === tpl.category)?.label ?? tpl.category}
                      </Tag>
                    </div>
                  </Space>
                </Card>
              );
              })}
            </div>
          )}
        </div>
      </Modal>
    </Card>
  );
}
