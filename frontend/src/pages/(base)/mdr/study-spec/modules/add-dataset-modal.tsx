/**
 * AddDatasetModal - 添加数据集模态框
 *
 * 支持两种方式添加数据集：
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
  { label: 'Events', value: 'Events', description: '事件类 (AE, DS, CE, etc.)' },
  { label: 'Findings', value: 'Findings', description: '发现类 (VS, LB, EG, etc.)' },
  { label: 'Interventions', value: 'Interventions', description: '干预类 (EX, CM, SU, etc.)' },
  { label: 'Special Purpose', value: 'Special Purpose', description: '特殊目的类 (DM, SE, SV, etc.)' }
];

// SDTM Model general variable templates (simplified for preview)
const SDTM_MODEL_GENERAL_VARIABLES: Record<string, Array<{ name: string; label: string; core: string }>> = {
  Events: [
    { name: '--SEQ', label: 'Sequence Number', core: 'Req' },
    { name: '--STDTC', label: 'Start Date/Time', core: 'Exp' },
    { name: '--ENDTC', label: 'End Date/Time', core: 'Exp' },
    { name: '--PRESP', label: 'Pre-Specified', core: 'Exp' },
    { name: '--OCCUR', label: 'Occurrence', core: 'Exp' }
  ],
  Findings: [
    { name: '--SEQ', label: 'Sequence Number', core: 'Req' },
    { name: '--GRPID', label: 'Group ID', core: 'Perm' },
    { name: '--REFID', label: 'Reference ID', core: 'Perm' },
    { name: '--POS', label: 'Position', core: 'Perm' },
    { name: '--ORRES', label: 'Original Result', core: 'Exp' },
    { name: '--STRESC', label: 'Standardized Result (Char)', core: 'Req' }
  ],
  Interventions: [
    { name: '--SEQ', label: 'Sequence Number', core: 'Req' },
    { name: '--TRT', label: 'Treatment', core: 'Exp' },
    { name: '--DECOD', label: 'Standardized Treatment', core: 'Exp' },
    { name: '--CAT', label: 'Category', core: 'Exp' },
    { name: '--SCAT', label: 'Subcategory', core: 'Perm' },
    { name: '--DOSE', label: 'Dose', core: 'Perm' }
  ],
  'Special Purpose': []
};

interface AddDatasetModalProps {
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: { type: 'global_library' | 'custom'; data: Record<string, unknown> }) => Promise<void>;
  open: boolean;
  specId: number | null;
}

const AddDatasetModal: React.FC<AddDatasetModalProps> = ({
  loading,
  onCancel,
  onSubmit,
  open,
  specId
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<'global_library' | 'custom'>('global_library');
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
  const { data: datasetsData, isLoading: datasetsLoading } = useVersionDatasets(
    selectedSpecificationId,
    { limit: 100 }
  );

  // Filter datasets by search text
  const filteredDatasets = useMemo(() => {
    if (!datasetsData?.items) return [];
    if (!searchText) return datasetsData.items;
    const keyword = searchText.toLowerCase();
    return datasetsData.items.filter(
      d => d.dataset_name.toLowerCase().includes(keyword) ||
           (d.description?.toLowerCase().includes(keyword) ?? false)
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
      key: v.name.replace('--', customDomainName),
      name: v.name.replace('--', customDomainName),
      label: v.label,
      core: v.core
    }));
  }, [customDomainName, customClassType]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      form.resetFields();
      setSearchText('');
      setSelectedDatasetId(null);
      setCustomDomainName('');
      setCustomClassType('Events');
    }
  }, [open, form]);

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
          type: 'global_library',
          data: { base_dataset_id: selectedDatasetId }
        });
      } else {
        const values = await form.validateFields();
        await onSubmit({
          type: 'custom',
          data: {
            domain_name: values.domain_name,
            domain_label: values.domain_label,
            class_type: values.class_type,
            inherit_from_model: true
          }
        });
      }
    } catch (error) {
      // Error handled in parent
    } finally {
      setSubmitLoading(false);
    }
  }, [specId, activeTab, selectedDatasetId, form, onSubmit, t]);

  // Tab items
  const tabItems: TabsProps['items'] = useMemo(() => [
    {
      key: 'global_library',
      label: (
        <Space>
          <BookOutlined />
          {t('page.mdr.studySpec.addDataset.fromGlobalLibrary')}
        </Space>
      ),
      children: (
        <div className="flex gap-12px min-h-400px">
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
                              className="text-12px"
                              ellipsis
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
                <Space direction="vertical" className="w-full">
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
              <div className="flex items-center justify-center h-full text-gray-400">
                {t('page.mdr.studySpec.addDataset.selectDatasetHint')}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'custom',
      label: (
        <Space>
          <PlusOutlined />
          {t('page.mdr.studySpec.addDataset.customDomain')}
        </Space>
      ),
      children: (
        <div className="flex gap-12px min-h-400px">
          {/* Left: Form */}
          <div className="w-1/2">
            <Form
              form={form}
              layout="vertical"
              initialValues={{ class_type: 'Events', inherit_from_model: true }}
            >
              <Form.Item
                label={t('page.mdr.studySpec.addDataset.domainName')}
                name="domain_name"
                rules={[
                  { message: t('page.mdr.studySpec.addDataset.domainNameRequired'), required: true },
                  { pattern: /^[A-Z]{2}$/, message: t('page.mdr.studySpec.addDataset.domainNameFormat'), len: 2 }
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
                    <Select.Option key={ct.value} value={ct.value}>
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
                  className="mb-8px"
                  message={t('page.mdr.studySpec.addDataset.autoReplaceHint', { domain: customDomainName })}
                  showIcon
                  type="info"
                />
                <Table
                  columns={[
                    { dataIndex: 'name', title: 'Variable Name', width: 120 },
                    { dataIndex: 'label', ellipsis: true, title: 'Label' },
                    {
                      dataIndex: 'core',
                      render: (core: string) => (
                        <Tag color={core === 'Req' ? 'red' : core === 'Exp' ? 'orange' : 'default'}>
                          {core}
                        </Tag>
                      ),
                      title: 'Core',
                      width: 80
                    }
                  ]}
                  dataSource={customVariablePreview}
                  pagination={false}
                  rowKey="key"
                  scroll={{ y: 250 }}
                  size="small"
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-200px text-gray-400">
                {t('page.mdr.studySpec.addDataset.enterDomainName')}
              </div>
            )}
          </div>
        </div>
      )
    }
  ], [t, datasetsLoading, filteredDatasets, selectedDatasetId, searchText, customDomainName, customClassType, customVariablePreview, form]);

  return (
    <Modal
      confirmLoading={loading || submitLoading}
      maskClosable={false}
      okText={t('page.mdr.studySpec.addDataset.add')}
      open={open}
      title={
        <Space>
          <TableOutlined className="text-blue-500" />
          <Text strong>{t('page.mdr.studySpec.addDataset.title')}</Text>
        </Space>
      }
      width={800}
      onCancel={onCancel}
      onOk={handleSubmit}
    >
      <Tabs
        activeKey={activeTab}
        items={tabItems}
        onChange={key => setActiveTab(key as 'global_library' | 'custom')}
      />
    </Modal>
  );
};

export default AddDatasetModal;