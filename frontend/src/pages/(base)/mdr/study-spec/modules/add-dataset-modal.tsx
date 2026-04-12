/**
 * AddDatasetModal - 添加数据集模态框
 *
 * 支持两种方式添加数据集：
 *
 * 1. 从 Global Library 选择（SDTM IG 标准域）
 * 2. 创建自定义 Domain（继承 SDTM Model 通用变量）
 */
import { BookOutlined, PlusOutlined, TableOutlined } from '@ant-design/icons';
import {
  Alert,
  Divider,
  Form,
  Input,
  List,
  Modal,
  Radio,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  message
} from 'antd';
import type { FormInstance, TabsProps } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSpecifications, useVersionDatasets } from '@/service/hooks';

const { Text, Title } = Typography;

// SDTM Model class types
const SDTM_CLASS_TYPES = [
  { description: '事件类 (AE, DS, CE, etc.)', label: 'Events', value: 'Events' },
  { description: '发现类 (VS, LB, EG, etc.)', label: 'Findings', value: 'Findings' },
  { description: '干预类 (EX, CM, SU, etc.)', label: 'Interventions', value: 'Interventions' },
  { description: '特殊目的类 (DM, SE, SV, etc.)', label: 'Special Purpose', value: 'Special Purpose' }
];

// SDTM Model general variable templates (simplified for preview)
const SDTM_MODEL_GENERAL_VARIABLES: Record<string, Array<{ core: string; label: string; name: string }>> = {
  Events: [
    { core: 'Req', label: 'Sequence Number', name: '--SEQ' },
    { core: 'Exp', label: 'Start Date/Time', name: '--STDTC' },
    { core: 'Exp', label: 'End Date/Time', name: '--ENDTC' },
    { core: 'Exp', label: 'Pre-Specified', name: '--PRESP' },
    { core: 'Exp', label: 'Occurrence', name: '--OCCUR' }
  ],
  Findings: [
    { core: 'Req', label: 'Sequence Number', name: '--SEQ' },
    { core: 'Perm', label: 'Group ID', name: '--GRPID' },
    { core: 'Perm', label: 'Reference ID', name: '--REFID' },
    { core: 'Perm', label: 'Position', name: '--POS' },
    { core: 'Exp', label: 'Original Result', name: '--ORRES' },
    { core: 'Req', label: 'Standardized Result (Char)', name: '--STRESC' }
  ],
  Interventions: [
    { core: 'Req', label: 'Sequence Number', name: '--SEQ' },
    { core: 'Exp', label: 'Treatment', name: '--TRT' },
    { core: 'Exp', label: 'Standardized Treatment', name: '--DECOD' },
    { core: 'Exp', label: 'Category', name: '--CAT' },
    { core: 'Perm', label: 'Subcategory', name: '--SCAT' },
    { core: 'Perm', label: 'Dose', name: '--DOSE' }
  ],
  'Special Purpose': []
};

interface AddDatasetModalProps {
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: { data: Record<string, unknown>; type: 'custom' | 'global_library' }) => Promise<void>;
  open: boolean;
  specId: number | null;
}

const AddDatasetModal: React.FC<AddDatasetModalProps> = ({ loading, onCancel, onSubmit, open, specId }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<'custom' | 'global_library'>('global_library');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Global Library state
  const [selectedSpecificationId, setSelectedSpecificationId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);

  // Custom Domain state
  const [customDomainName, setCustomDomainName] = useState('');
  const [customClassType, setCustomClassType] = useState('Events');

  // Fetch SDTM specifications from Global Library
  const { data: specificationsData, isLoading: specificationsLoading } = useSpecifications('SDTM');

  // Find SDTM IG specification (for standard domains)
  const sdtmIgSpec = useMemo(() => {
    if (!specificationsData) return null;
    return specificationsData.find(s => s.name.includes('SDTM IG') || s.spec_type === 'SDTM') || specificationsData[0];
  }, [specificationsData]);

  // Find SDTM Model specification (for general variables)
  const sdtmModelSpec = useMemo(() => {
    if (!specificationsData) return null;
    return specificationsData.find(s => s.name.includes('SDTM Model') || s.spec_type === 'SDTM');
  }, [specificationsData]);

  // Auto-select SDTM IG specification
  useEffect(() => {
    if (sdtmIgSpec && !selectedSpecificationId) {
      setSelectedSpecificationId(sdtmIgSpec.id);
    }
  }, [sdtmIgSpec, selectedSpecificationId]);

  // Fetch datasets from selected specification
  const { data: datasetsData, isLoading: datasetsLoading } = useVersionDatasets(selectedSpecificationId, {
    limit: 100
  });

  // Filter datasets by search text
  const filteredDatasets = useMemo(() => {
    if (!datasetsData?.items) return [];
    if (!searchText) return datasetsData.items;
    const keyword = searchText.toLowerCase();
    return datasetsData.items.filter(
      d => d.dataset_name.toLowerCase().includes(keyword) || (d.description?.toLowerCase().includes(keyword) ?? false)
    );
  }, [datasetsData, searchText]);

  // Selected dataset info
  const selectedDataset = useMemo(() => {
    if (!datasetsData?.items || !selectedDatasetId) return null;
    return datasetsData.items.find(d => d.id === selectedDatasetId);
  }, [datasetsData, selectedDatasetId]);

  // Custom domain variable preview
  const customVariablePreview = useMemo(() => {
    if (!customDomainName || !customClassType) return [];
    const templates = SDTM_MODEL_GENERAL_VARIABLES[customClassType] || [];
    return templates.map(v => ({
      core: v.core,
      key: v.name.replace('--', customDomainName),
      label: v.label,
      name: v.name.replace('--', customDomainName)
    }));
  }, [customDomainName, customClassType]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      // Note: form.resetFields() intentionally omitted here — the Form is inside the
      // custom tab which is lazily rendered (not mounted until first visited), so calling
      // resetFields before mount triggers the "not connected" warning.
      // State is fully reset via the setters below; the Form will use initialValues on mount.
      setSearchText('');
      setSelectedDatasetId(null);
      setCustomDomainName('');
      setCustomClassType('Events');
    }
  }, [open]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!specId) {
      message.error('No specification selected');
      return;
    }

    setSubmitLoading(true);
    try {
      if (activeTab === 'global_library') {
        if (!selectedDatasetId) {
          message.error(t('page.mdr.studySpec.addDataset.selectDataset'));
          return;
        }
        await onSubmit({
          data: { base_dataset_id: selectedDatasetId },
          type: 'global_library'
        });
      } else {
        const values = await form.validateFields();
        await onSubmit({
          data: {
            class_type: values.class_type,
            domain_label: values.domain_label,
            domain_name: values.domain_name,
            inherit_from_model: true
          },
          type: 'custom'
        });
      }
    } catch (error) {
      // Error handled in parent
    } finally {
      setSubmitLoading(false);
    }
  }, [specId, activeTab, selectedDatasetId, form, onSubmit, t]);

  // Tab items
  const tabItems: TabsProps['items'] = useMemo(
    () => [
      {
        children: (
          <div className="min-h-400px flex gap-12px">
            {/* Left: Dataset list */}
            <div className="w-1/2 border rounded-lg p-12px">
              <Input.Search
                allowClear
                className="mb-8px"
                placeholder={t('page.mdr.studySpec.addDataset.searchDataset')}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
              <Spin spinning={datasetsLoading}>
                <div className="max-h-320px overflow-auto">
                  <List
                    dataSource={filteredDatasets}
                    size="small"
                    renderItem={item => {
                      const isSelected = selectedDatasetId === item.id;
                      return (
                        <List.Item
                          className={`cursor-pointer px-8px rounded transition-colors ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}
                          onClick={() => setSelectedDatasetId(item.id)}
                        >
                          <div className="w-full flex items-center justify-between">
                            <Space>
                              <Tag color="blue">{item.dataset_name}</Tag>
                              <Text
                                ellipsis
                                className="text-12px"
                                style={{ maxWidth: 200 }}
                              >
                                {item.description || '-'}
                              </Text>
                            </Space>
                            <Tag color="purple">{item.class_type}</Tag>
                          </div>
                        </List.Item>
                      );
                    }}
                  />
                </div>
              </Spin>
            </div>

            {/* Right: Selected dataset info */}
            <div className="w-1/2 border rounded-lg p-12px">
              {selectedDataset ? (
                <div>
                  <Title level={5}>
                    <Tag color="blue">{selectedDataset.dataset_name}</Tag>
                  </Title>
                  <Text type="secondary">{selectedDataset.description}</Text>
                  <Divider className="my-8px" />
                  <Space
                    className="w-full"
                    direction="vertical"
                  >
                    <div>
                      <Text strong>Class: </Text>
                      <Tag color="purple">{selectedDataset.class_type}</Tag>
                    </div>
                    <div>
                      <Text strong>Variables: </Text>
                      <Tag>{selectedDataset.variable_count}</Tag>
                    </div>
                  </Space>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  {t('page.mdr.studySpec.addDataset.selectDatasetHint')}
                </div>
              )}
            </div>
          </div>
        ),
        key: 'global_library',
        label: (
          <Space>
            <BookOutlined />
            {t('page.mdr.studySpec.addDataset.fromGlobalLibrary')}
          </Space>
        )
      },
      {
        // forceRender keeps the Form mounted even when this tab is inactive,
        // so form.validateFields() and field state work correctly on submit.
        forceRender: true,
        children: (
          <div className="min-h-400px flex gap-12px">
            {/* Left: Form */}
            <div className="w-1/2">
              <Form
                form={form}
                initialValues={{ class_type: 'Events', inherit_from_model: true }}
                layout="vertical"
              >
                <Form.Item
                  label={t('page.mdr.studySpec.addDataset.domainName')}
                  name="domain_name"
                  rules={[
                    { message: t('page.mdr.studySpec.addDataset.domainNameRequired'), required: true },
                    { len: 2, message: t('page.mdr.studySpec.addDataset.domainNameFormat'), pattern: /^[A-Z]{2}$/ }
                  ]}
                >
                  <Input
                    maxLength={2}
                    placeholder="e.g., CE, FA, SV"
                    onChange={e => setCustomDomainName(e.target.value.toUpperCase())}
                  />
                </Form.Item>
                <Form.Item
                  label={t('page.mdr.studySpec.addDataset.domainLabel')}
                  name="domain_label"
                  rules={[{ message: t('page.mdr.studySpec.addDataset.domainLabelRequired'), required: true }]}
                >
                  <Input placeholder="e.g., Clinical Events, Findings About" />
                </Form.Item>
                <Form.Item
                  label={t('page.mdr.studySpec.addDataset.classType')}
                  name="class_type"
                  rules={[{ message: t('page.mdr.studySpec.addDataset.classTypeRequired'), required: true }]}
                >
                  <Select onChange={setCustomClassType}>
                    {SDTM_CLASS_TYPES.map(ct => (
                      <Select.Option
                        key={ct.value}
                        value={ct.value}
                      >
                        <Space>
                          <Tag color="blue">{ct.value}</Tag>
                          <Text type="secondary">{ct.description}</Text>
                        </Space>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Form>
            </div>

            {/* Right: Variable preview */}
            <div className="w-1/2 border rounded-lg p-12px">
              <Title level={5}>
                <TableOutlined className="mr-4px" />
                {t('page.mdr.studySpec.addDataset.variablePreview')}
              </Title>
              {customDomainName && customVariablePreview.length > 0 ? (
                <>
                  <Alert
                    showIcon
                    className="mb-8px"
                    message={t('page.mdr.studySpec.addDataset.autoReplaceHint', { domain: customDomainName })}
                    type="info"
                  />
                  <Table
                    dataSource={customVariablePreview}
                    pagination={false}
                    rowKey="key"
                    scroll={{ y: 250 }}
                    size="small"
                    columns={[
                      { dataIndex: 'name', title: 'Variable Name', width: 120 },
                      { dataIndex: 'label', ellipsis: true, title: 'Label' },
                      {
                        dataIndex: 'core',
                        render: (core: string) => (
                          <Tag color={core === 'Req' ? 'red' : core === 'Exp' ? 'orange' : 'default'}>{core}</Tag>
                        ),
                        title: 'Core',
                        width: 80
                      }
                    ]}
                  />
                </>
              ) : (
                <div className="h-200px flex items-center justify-center text-gray-400">
                  {t('page.mdr.studySpec.addDataset.enterDomainName')}
                </div>
              )}
            </div>
          </div>
        ),
        key: 'custom',
        label: (
          <Space>
            <PlusOutlined />
            {t('page.mdr.studySpec.addDataset.customDomain')}
          </Space>
        )
      }
    ],
    [
      t,
      datasetsLoading,
      filteredDatasets,
      selectedDatasetId,
      searchText,
      customDomainName,
      customClassType,
      customVariablePreview,
      form
    ]
  );

  return (
    <Modal
      confirmLoading={loading || submitLoading}
      maskClosable={false}
      okText={t('page.mdr.studySpec.addDataset.add')}
      open={open}
      width={800}
      title={
        <Space>
          <TableOutlined className="text-blue-500" />
          <Text strong>{t('page.mdr.studySpec.addDataset.title')}</Text>
        </Space>
      }
      onCancel={onCancel}
      onOk={handleSubmit}
    >
      <Tabs
        activeKey={activeTab}
        items={tabItems}
        onChange={key => setActiveTab(key as 'custom' | 'global_library')}
      />
    </Modal>
  );
};

export default AddDatasetModal;
