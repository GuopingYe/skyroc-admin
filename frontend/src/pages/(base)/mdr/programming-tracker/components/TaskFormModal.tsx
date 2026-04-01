/**
 * TaskFormModal - 任务表单弹窗
 *
 * 支持创建和编辑不同类型的编程任务（SDTM/ADaM/TFL/Other）
 *
 * 域下拉列表特性:
 *
 * 1. 从 Global Library 继承标准域（基于 Study 配置的标准版本）
 * 2. 支持 "Customized Domain" 自定义域输入
 */
import { Avatar, Divider, Form, Input, Modal, Select, Space, Spin, Tag } from 'antd';
import type { ModalProps } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStudyStandardConfig } from '@/features/clinical-context';
import { useSpecifications, useVersionDatasets } from '@/service/hooks';

import type {
  IADaMTask,
  IOtherTask,
  IPerson,
  IProgrammingTask,
  ISDTMTask,
  ITFLTask,
  TaskCategory,
  TaskStatus
} from '../mockData';
import { TASK_CATEGORY_ORDER, programmers, taskStatusConfig } from '../mockData';

const { TextArea } = Input;

interface TaskFormModalProps {
  editingTask: IProgrammingTask | null;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  open: boolean;
  operateType: 'add' | 'edit';
  taskCategory: TaskCategory;
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({
  editingTask,
  loading,
  onCancel,
  onSubmit,
  open,
  operateType,
  taskCategory
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  // Use state to track category to avoid calling form.getFieldValue() before form is connected
  const [currentCategory, setCurrentCategory] = useState<TaskCategory>(taskCategory);

  // ==================== Global Library Domain Fetching ====================
  // Get study's standard version configuration
  const studyConfig = useStudyStandardConfig();

  // Fetch specifications from Global Library
  const { data: sdtmSpecifications } = useSpecifications('SDTM');
  const { data: adamSpecifications } = useSpecifications('ADaM');

  // Find specification IDs that match study's configured versions
  const sdtmSpecId = useMemo(() => {
    if (!sdtmSpecifications) return null;
    const version = studyConfig?.sdtmIgVersion;
    if (version) {
      const spec = sdtmSpecifications.find(
        s => s.standard_version === version || s.version === version || s.name.includes(version)
      );
      if (spec) return spec.id;
    }
    // Fallback to first specification
    return sdtmSpecifications[0]?.id ?? null;
  }, [sdtmSpecifications, studyConfig?.sdtmIgVersion]);

  const adamSpecId = useMemo(() => {
    if (!adamSpecifications) return null;
    const version = studyConfig?.adamIgVersion;
    if (version) {
      const spec = adamSpecifications.find(
        s => s.standard_version === version || s.version === version || s.name.includes(version)
      );
      if (spec) return spec.id;
    }
    // Fallback to first specification
    return adamSpecifications[0]?.id ?? null;
  }, [adamSpecifications, studyConfig?.adamIgVersion]);

  // Fetch datasets from the selected specification
  const { data: sdtmDatasetsData, isLoading: sdtmDatasetsLoading } = useVersionDatasets(sdtmSpecId, { limit: 100 });
  const { data: adamDatasetsData, isLoading: adamDatasetsLoading } = useVersionDatasets(adamSpecId, { limit: 100 });

  // Custom domain input state
  const [customDomain, setCustomDomain] = useState('');
  const [customDataset, setCustomDataset] = useState('');

  // Build SDTM domain options with "Customized Domain" option
  const sdtmDomainOptions = useMemo(() => {
    const options: Array<{ domain: string; isCustom?: boolean; label: string }> = [
      { domain: '__CUSTOM__', isCustom: true, label: t('page.mdr.programmingTracker.form.customizedDomain') }
    ];
    if (sdtmDatasetsData?.items) {
      sdtmDatasetsData.items.forEach(d => {
        options.push({ domain: d.dataset_name, label: d.description || d.dataset_name });
      });
    }
    return options;
  }, [sdtmDatasetsData, t]);

  // Build ADaM dataset options with "Customized Domain" option
  const adamDatasetOptions = useMemo(() => {
    const options: Array<{ dataset: string; isCustom?: boolean; label: string }> = [
      { dataset: '__CUSTOM__', isCustom: true, label: t('page.mdr.programmingTracker.form.customizedDataset') }
    ];
    if (adamDatasetsData?.items) {
      adamDatasetsData.items.forEach(d => {
        options.push({ dataset: d.dataset_name, label: d.description || d.dataset_name });
      });
    }
    return options;
  }, [adamDatasetsData, t]);

  // Modal 打开时初始化表单
  useEffect(() => {
    if (open) {
      if (operateType === 'edit' && editingTask) {
        // 编辑模式：填充现有数据
        const baseValues = {
          category: editingTask.category,
          primaryProgrammer: editingTask.primaryProgrammer.id,
          qcProgrammer: editingTask.qcProgrammer.id,
          status: editingTask.status
        };
        // Update currentCategory state when editing
        setCurrentCategory(editingTask.category);

        if (editingTask.category === 'SDTM') {
          const sdtmTask = editingTask as ISDTMTask;
          form.setFieldsValue({
            ...baseValues,
            datasetLabel: sdtmTask.datasetLabel,
            domain: sdtmTask.domain,
            sdrSource: sdtmTask.sdrSource
          });
        } else if (editingTask.category === 'ADaM') {
          const adamTask = editingTask as IADaMTask;
          form.setFieldsValue({
            ...baseValues,
            analysisPopulation: adamTask.analysisPopulation,
            dataset: adamTask.dataset,
            label: adamTask.label
          });
        } else if (editingTask.category === 'TFL') {
          const tflTask = editingTask as ITFLTask;
          form.setFieldsValue({
            ...baseValues,
            outputId: tflTask.outputId,
            population: tflTask.population,
            title: tflTask.title,
            type: tflTask.type
          });
        } else {
          const otherTask = editingTask as IOtherTask;
          form.setFieldsValue({
            ...baseValues,
            description: otherTask.description,
            taskCategory: otherTask.taskCategory,
            taskName: otherTask.taskName
          });
        }
      } else {
        // 新增模式：设置默认分类
        form.resetFields();
        form.setFieldsValue({ category: taskCategory });
        setCurrentCategory(taskCategory);
      }
    }
  }, [open, operateType, editingTask, taskCategory, form]);

  // 处理提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Handle custom domain/dataset substitution
      const processedValues = { ...values };
      if (values.domain === '__CUSTOM__' && values.customDomainName) {
        processedValues.domain = values.customDomainName;
        delete processedValues.customDomainName;
      }
      if (values.dataset === '__CUSTOM__' && values.customDatasetName) {
        processedValues.dataset = values.customDatasetName;
        delete processedValues.customDatasetName;
      }

      await onSubmit(processedValues);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Form validation failed:', error);
    }
  };

  // 公共表单字段
  const renderCommonFields = () => (
    <>
      <Form.Item
        label={t('page.mdr.programmingTracker.cols.primaryProgrammer')}
        name="primaryProgrammer"
        rules={[
          { message: t('page.mdr.programmingTracker.form.validateMsg.primaryProgrammerRequired'), required: true }
        ]}
      >
        <Select
          showSearch
          optionFilterProp="children"
          placeholder={t('page.mdr.programmingTracker.form.primaryProgrammerPlaceholder')}
        >
          {programmers.map((p: IPerson) => (
            <Select.Option
              key={p.id}
              value={p.id}
            >
              <Space>
                <Avatar
                  size="small"
                  style={{ backgroundColor: '#1890ff' }}
                >
                  {p.avatar}
                </Avatar>
                {p.name}
              </Space>
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item
        label={t('page.mdr.programmingTracker.cols.qcProgrammer')}
        name="qcProgrammer"
        rules={[{ message: t('page.mdr.programmingTracker.form.validateMsg.qcProgrammerRequired'), required: true }]}
      >
        <Select
          showSearch
          optionFilterProp="children"
          placeholder={t('page.mdr.programmingTracker.form.qcProgrammerPlaceholder')}
        >
          {programmers.map((p: IPerson) => (
            <Select.Option
              key={p.id}
              value={p.id}
            >
              <Space>
                <Avatar
                  size="small"
                  style={{ backgroundColor: '#52c41a' }}
                >
                  {p.avatar}
                </Avatar>
                {p.name}
              </Space>
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item
        label={t('page.mdr.programmingTracker.cols.status')}
        name="status"
        rules={[{ message: t('page.mdr.programmingTracker.form.validateMsg.statusRequired'), required: true }]}
      >
        <Select placeholder={t('page.mdr.programmingTracker.form.statusPlaceholder')}>
          {Object.keys(taskStatusConfig).map(status => (
            <Select.Option
              key={status}
              value={status}
            >
              <Tag color={taskStatusConfig[status as TaskStatus].color}>
                {taskStatusConfig[status as TaskStatus].label}
              </Tag>
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
    </>
  );

  // 分类特定字段 - use currentCategory state instead of form.getFieldValue()
  const renderCategoryFields = useMemo(() => {
    switch (currentCategory) {
      case 'SDTM':
        return (
          <>
            <Spin spinning={sdtmDatasetsLoading}>
              <Form.Item
                label={t('page.mdr.programmingTracker.cols.domain')}
                name="domain"
                rules={[{ message: t('page.mdr.programmingTracker.form.validateMsg.domainRequired'), required: true }]}
              >
                <Select
                  showSearch
                  optionFilterProp="children"
                  placeholder={t('page.mdr.programmingTracker.form.domainPlaceholder')}
                  onChange={() => setCustomDomain('')}
                >
                  {sdtmDomainOptions.map(d => (
                    <Select.Option
                      key={d.domain}
                      value={d.domain}
                    >
                      {d.isCustom ? (
                        <Tag color="gold">{d.label}</Tag>
                      ) : (
                        <>
                          <Tag color="blue">{d.domain}</Tag> - {d.label}
                        </>
                      )}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Spin>
            {/* Custom Domain Input - shows when __CUSTOM__ is selected */}
            <Form.Item
              noStyle
              shouldUpdate
            >
              {({ getFieldValue }) => {
                const domainValue = getFieldValue('domain');
                return domainValue === '__CUSTOM__' ? (
                  <Form.Item
                    label={t('page.mdr.programmingTracker.form.customDomainName')}
                    name="customDomainName"
                    rules={[
                      {
                        message: t('page.mdr.programmingTracker.form.validateMsg.customDomainRequired'),
                        required: true
                      },
                      {
                        message: t('page.mdr.programmingTracker.form.validateMsg.domainNameFormat'),
                        pattern: /^[A-Z]{2}$/
                      }
                    ]}
                  >
                    <Input
                      maxLength={2}
                      placeholder="e.g., CE, FA, SV"
                      onChange={e => setCustomDomain(e.target.value.toUpperCase())}
                    />
                  </Form.Item>
                ) : null;
              }}
            </Form.Item>
            <Form.Item
              label={t('page.mdr.programmingTracker.cols.datasetLabel')}
              name="datasetLabel"
              rules={[
                { message: t('page.mdr.programmingTracker.form.validateMsg.datasetLabelRequired'), required: true }
              ]}
            >
              <Input placeholder={t('page.mdr.programmingTracker.form.datasetLabelPlaceholder')} />
            </Form.Item>
            <Form.Item
              label={t('page.mdr.programmingTracker.cols.sdrSource')}
              name="sdrSource"
              rules={[{ message: t('page.mdr.programmingTracker.form.validateMsg.sdrSourceRequired'), required: true }]}
            >
              <Input placeholder={t('page.mdr.programmingTracker.form.sdrSourcePlaceholder')} />
            </Form.Item>
            {renderCommonFields()}
          </>
        );

      case 'ADaM':
        return (
          <>
            <Spin spinning={adamDatasetsLoading}>
              <Form.Item
                label={t('page.mdr.programmingTracker.cols.dataset')}
                name="dataset"
                rules={[{ message: t('page.mdr.programmingTracker.form.validateMsg.datasetRequired'), required: true }]}
              >
                <Select
                  showSearch
                  optionFilterProp="children"
                  placeholder={t('page.mdr.programmingTracker.form.datasetPlaceholder')}
                  onChange={() => setCustomDataset('')}
                >
                  {adamDatasetOptions.map(d => (
                    <Select.Option
                      key={d.dataset}
                      value={d.dataset}
                    >
                      {d.isCustom ? (
                        <Tag color="gold">{d.label}</Tag>
                      ) : (
                        <>
                          <Tag color="green">{d.dataset}</Tag> - {d.label}
                        </>
                      )}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Spin>
            {/* Custom Dataset Input - shows when __CUSTOM__ is selected */}
            <Form.Item
              noStyle
              shouldUpdate
            >
              {({ getFieldValue }) => {
                const datasetValue = getFieldValue('dataset');
                return datasetValue === '__CUSTOM__' ? (
                  <Form.Item
                    label={t('page.mdr.programmingTracker.form.customDatasetName')}
                    name="customDatasetName"
                    rules={[
                      {
                        message: t('page.mdr.programmingTracker.form.validateMsg.customDatasetRequired'),
                        required: true
                      },
                      {
                        message: t('page.mdr.programmingTracker.form.validateMsg.datasetNameFormat'),
                        pattern: /^AD[A-Z]{1,3}$/
                      }
                    ]}
                  >
                    <Input
                      placeholder="e.g., ADSL, ADAE, ADLB"
                      onChange={e => setCustomDataset(e.target.value.toUpperCase())}
                    />
                  </Form.Item>
                ) : null;
              }}
            </Form.Item>
            <Form.Item
              label={t('page.mdr.programmingTracker.cols.label')}
              name="label"
              rules={[{ message: t('page.mdr.programmingTracker.form.validateMsg.labelRequired'), required: true }]}
            >
              <Input placeholder={t('page.mdr.programmingTracker.form.labelPlaceholder')} />
            </Form.Item>
            <Form.Item
              label={t('page.mdr.programmingTracker.cols.analysisPopulation')}
              name="analysisPopulation"
              rules={[
                { message: t('page.mdr.programmingTracker.form.validateMsg.populationRequired'), required: true }
              ]}
            >
              <Select placeholder={t('page.mdr.programmingTracker.form.populationPlaceholder')}>
                <Select.Option value="ITT">ITT</Select.Option>
                <Select.Option value="Safety">Safety</Select.Option>
                <Select.Option value="PP">PP</Select.Option>
                <Select.Option value="Efficacy">Efficacy</Select.Option>
              </Select>
            </Form.Item>
            {renderCommonFields()}
          </>
        );

      case 'TFL':
        return (
          <>
            <Form.Item
              label={t('page.mdr.programmingTracker.cols.outputId')}
              name="outputId"
              rules={[{ message: t('page.mdr.programmingTracker.form.validateMsg.outputIdRequired'), required: true }]}
            >
              <Input placeholder={t('page.mdr.programmingTracker.form.outputIdPlaceholder')} />
            </Form.Item>
            <Form.Item
              label={t('page.mdr.programmingTracker.cols.title')}
              name="title"
              rules={[{ message: t('page.mdr.programmingTracker.form.validateMsg.titleRequired'), required: true }]}
            >
              <Input placeholder={t('page.mdr.programmingTracker.form.titlePlaceholder')} />
            </Form.Item>
            <Form.Item
              label={t('page.mdr.programmingTracker.cols.type')}
              name="type"
              rules={[{ message: t('page.mdr.programmingTracker.form.validateMsg.typeRequired'), required: true }]}
            >
              <Select placeholder={t('page.mdr.programmingTracker.form.typePlaceholder')}>
                <Select.Option value="Table">
                  <Tag color="blue">Table</Tag>
                </Select.Option>
                <Select.Option value="Figure">
                  <Tag color="green">Figure</Tag>
                </Select.Option>
                <Select.Option value="Listing">
                  <Tag color="orange">Listing</Tag>
                </Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              label={t('page.mdr.programmingTracker.cols.population')}
              name="population"
              rules={[
                { message: t('page.mdr.programmingTracker.form.validateMsg.populationRequired'), required: true }
              ]}
            >
              <Select placeholder={t('page.mdr.programmingTracker.form.populationPlaceholder')}>
                <Select.Option value="ITT">ITT</Select.Option>
                <Select.Option value="Safety">Safety</Select.Option>
                <Select.Option value="PP">PP</Select.Option>
                <Select.Option value="Efficacy">Efficacy</Select.Option>
              </Select>
            </Form.Item>
            {renderCommonFields()}
          </>
        );

      case 'Other':
        return (
          <>
            <Form.Item
              label={t('page.mdr.programmingTracker.cols.taskName')}
              name="taskName"
              rules={[{ message: t('page.mdr.programmingTracker.form.validateMsg.taskNameRequired'), required: true }]}
            >
              <Input placeholder={t('page.mdr.programmingTracker.form.taskNamePlaceholder')} />
            </Form.Item>
            <Form.Item
              label={t('page.mdr.programmingTracker.cols.description')}
              name="description"
            >
              <TextArea
                placeholder={t('page.mdr.programmingTracker.form.descriptionPlaceholder')}
                rows={3}
              />
            </Form.Item>
            <Form.Item
              label={t('page.mdr.programmingTracker.cols.taskCategory')}
              name="taskCategory"
              rules={[
                { message: t('page.mdr.programmingTracker.form.validateMsg.taskCategoryRequired'), required: true }
              ]}
            >
              <Select placeholder={t('page.mdr.programmingTracker.form.taskCategoryPlaceholder')}>
                <Select.Option value="Documentation">Documentation</Select.Option>
                <Select.Option value="Regulatory">Regulatory</Select.Option>
                <Select.Option value="Analysis">Analysis</Select.Option>
                <Select.Option value="Other">Other</Select.Option>
              </Select>
            </Form.Item>
            {renderCommonFields()}
          </>
        );

      default:
        return renderCommonFields();
    }
  }, [currentCategory, t]);

  const modalTitle =
    operateType === 'add'
      ? t('page.mdr.programmingTracker.createModal.title')
      : t('page.mdr.programmingTracker.editModal.title');

  const modalProps: ModalProps = {
    cancelText: t('common.cancel'),
    confirmLoading: loading,
    okText: operateType === 'add' ? t('common.add') : t('common.save'),
    onCancel,
    onOk: handleSubmit,
    open,
    title: modalTitle,
    width: 600
  };

  // 监听分类变化，动态显示字段
  const handleCategoryChange = (value: TaskCategory) => {
    // Update state to trigger re-render of category fields
    setCurrentCategory(value);
  };

  return (
    <Modal {...modalProps}>
      <Form
        className="mt-16px"
        form={form}
        layout="vertical"
      >
        {/* 分类选择 - 新增时可修改，编辑时不可修改 */}
        <Form.Item
          label={t('page.mdr.programmingTracker.cols.taskCategory')}
          name="category"
          rules={[{ message: t('page.mdr.programmingTracker.form.validateMsg.taskCategoryRequired'), required: true }]}
        >
          <Select
            disabled={operateType === 'edit'}
            placeholder={t('page.mdr.programmingTracker.form.taskCategoryPlaceholder')}
            onChange={handleCategoryChange}
          >
            {TASK_CATEGORY_ORDER.map(cat => (
              <Select.Option
                key={cat}
                value={cat}
              >
                {t(`page.mdr.programmingTracker.category.${cat.toLowerCase()}`)}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* 分类特定字段 */}
        {renderCategoryFields}
      </Form>
    </Modal>
  );
};

export default TaskFormModal;
