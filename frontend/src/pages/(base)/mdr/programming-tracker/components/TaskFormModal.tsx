/**
 * TaskFormModal - 任务表单弹窗
 *
 * 支持创建和编辑不同类型的编程任务（SDTM/ADaM/TFL/Other）
 */
import { Avatar, Form, Input, Modal, Select, Space, Tag } from 'antd';
import type { ModalProps } from 'antd';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

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
import { TASK_CATEGORY_ORDER, adamDatasets, programmers, sdtmDomains, taskStatusConfig } from '../mockData';

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
      }
    }
  }, [open, operateType, editingTask, taskCategory, form]);

  // 处理提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
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

  // 分类特定字段
  const renderCategoryFields = useMemo(() => {
    const currentCategory = form.getFieldValue('category') || taskCategory;

    switch (currentCategory) {
      case 'SDTM':
        return (
          <>
            <Form.Item
              label={t('page.mdr.programmingTracker.cols.domain')}
              name="domain"
              rules={[{ message: t('page.mdr.programmingTracker.form.validateMsg.domainRequired'), required: true }]}
            >
              <Select
                showSearch
                optionFilterProp="children"
                placeholder={t('page.mdr.programmingTracker.form.domainPlaceholder')}
              >
                {sdtmDomains.map(d => (
                  <Select.Option
                    key={d.domain}
                    value={d.domain}
                  >
                    <Tag color="blue">{d.domain}</Tag> - {d.label}
                  </Select.Option>
                ))}
              </Select>
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
            <Form.Item
              label={t('page.mdr.programmingTracker.cols.dataset')}
              name="dataset"
              rules={[{ message: t('page.mdr.programmingTracker.form.validateMsg.datasetRequired'), required: true }]}
            >
              <Select
                showSearch
                optionFilterProp="children"
                placeholder={t('page.mdr.programmingTracker.form.datasetPlaceholder')}
              >
                {adamDatasets.map(d => (
                  <Select.Option
                    key={d.dataset}
                    value={d.dataset}
                  >
                    <Tag color="green">{d.dataset}</Tag> - {d.label}
                  </Select.Option>
                ))}
              </Select>
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskCategory, form.getFieldValue('category'), t]);

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
  const handleCategoryChange = () => {
    // 触发重新渲染分类字段
    form.validateFields(['category']);
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
