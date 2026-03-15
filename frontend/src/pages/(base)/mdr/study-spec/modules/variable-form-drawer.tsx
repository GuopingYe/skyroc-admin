/**
 * Variable Form Drawer - 变量表单抽屉
 *
 * 支持创建和编辑 Study Spec 变量
 */
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Drawer, Form, Input, Popconfirm, Select, Space, Tag, Typography, message } from 'antd';
import type { DrawerProps } from 'antd';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { SpecVariable, StandardType, VariableOrigin } from '../mockData';
import { originConfig } from '../mockData';

const { Text } = Typography;
const { TextArea } = Input;

interface VariableFormDrawerProps {
  datasetKey: string;
  editingVariable: SpecVariable | null;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  open: boolean;
  operateType: 'add' | 'edit';
  standard: StandardType;
}

const VariableFormDrawer: React.FC<VariableFormDrawerProps> = ({
  datasetKey,
  editingVariable,
  loading,
  onCancel,
  onSubmit,
  open,
  operateType,
  standard
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      if (operateType === 'edit' && editingVariable) {
        form.setFieldsValue({
          comment: editingVariable.comment,
          implementationNotes: editingVariable.implementationNotes,
          mappedSourceField: editingVariable.mappedSourceField,
          origin: editingVariable.origin,
          sourceDerivation: editingVariable.sourceDerivation
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, operateType, editingVariable, form]);

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  // Origin options
  const originOptions = useMemo(
    () =>
      Object.entries(originConfig).map(([key, config]) => ({
        label: (
          <Space>
            <Tag color={config.color}>{config.label}</Tag>
            <Text
              className="text-12px"
              type="secondary"
            >
              {config.description}
            </Text>
          </Space>
        ),
        value: key
      })),
    []
  );

  const drawerTitle =
    operateType === 'add' ? t('page.mdr.studySpec.addVariable') : t('page.mdr.studySpec.editDrawer.title');

  const drawerProps: DrawerProps = {
    onClose: onCancel,
    open,
    placement: 'right',
    title: (
      <Space>
        <Text strong>{drawerTitle}</Text>
        {editingVariable && <Tag color="blue">{editingVariable.name}</Tag>}
      </Space>
    ),
    width: 640
  };

  return (
    <Drawer
      {...drawerProps}
      footer={
        <div className="flex justify-end gap-8px">
          <Button onClick={onCancel}>{t('page.mdr.studySpec.editDrawer.cancel')}</Button>
          <Button
            loading={loading}
            type="primary"
            onClick={handleSubmit}
          >
            {operateType === 'add' ? t('common.add') : t('page.mdr.studySpec.editDrawer.save')}
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
      >
        {/* For add mode, show variable name and label fields */}
        {operateType === 'add' && (
          <>
            <Form.Item
              label={t('page.mdr.studySpec.cols.variableName')}
              name="name"
              rules={[{ message: t('page.mdr.studySpec.form.validateMsg.variableNameRequired'), required: true }]}
            >
              <Input placeholder="e.g., AETERM, AESTDY" />
            </Form.Item>
            <Form.Item
              label={t('page.mdr.studySpec.cols.label')}
              name="label"
              rules={[{ message: t('page.mdr.studySpec.form.validateMsg.labelRequired'), required: true }]}
            >
              <Input placeholder="Variable Label" />
            </Form.Item>
            <Form.Item
              label={t('page.mdr.studySpec.cols.dataType')}
              name="dataType"
              rules={[{ message: t('page.mdr.studySpec.form.validateMsg.dataTypeRequired'), required: true }]}
            >
              <Select placeholder="Select data type">
                <Select.Option value="Char">
                  <Tag color="default">Char</Tag>
                </Select.Option>
                <Select.Option value="Num">
                  <Tag color="orange">Num</Tag>
                </Select.Option>
                <Select.Option value="Date">
                  <Tag color="purple">Date</Tag>
                </Select.Option>
                <Select.Option value="DateTime">
                  <Tag color="cyan">DateTime</Tag>
                </Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              label={t('page.mdr.studySpec.cols.length')}
              name="length"
              rules={[{ message: t('page.mdr.studySpec.form.validateMsg.lengthRequired'), required: true }]}
            >
              <Input
                placeholder="e.g., 200"
                type="number"
              />
            </Form.Item>
            <Form.Item
              label={t('page.mdr.studySpec.cols.core')}
              name="core"
              rules={[{ message: t('page.mdr.studySpec.form.validateMsg.coreRequired'), required: true }]}
            >
              <Select placeholder="Select core">
                <Select.Option value="Req">
                  <Tag color="red">Req</Tag>
                </Select.Option>
                <Select.Option value="Exp">
                  <Tag color="orange">Exp</Tag>
                </Select.Option>
                <Select.Option value="Perm">
                  <Tag color="default">Perm</Tag>
                </Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              label={t('page.mdr.studySpec.cols.role')}
              name="role"
              rules={[{ message: t('page.mdr.studySpec.form.validateMsg.roleRequired'), required: true }]}
            >
              <Input placeholder="e.g., Topic, Identifier, Result Qualifier" />
            </Form.Item>
          </>
        )}

        <Form.Item
          label={t('page.mdr.studySpec.cols.origin')}
          name="origin"
        >
          <Select
            optionLabelProp="label"
            options={originOptions}
            placeholder="Select origin"
          />
        </Form.Item>
        <Form.Item
          label={t('page.mdr.studySpec.editDrawer.sourceField')}
          name="mappedSourceField"
        >
          <Input placeholder={t('page.mdr.studySpec.editDrawer.sourceFieldPlaceholder')} />
        </Form.Item>
        <Form.Item
          label={t('page.mdr.studySpec.cols.sourceDerivation')}
          name="sourceDerivation"
        >
          <TextArea
            placeholder={t('page.mdr.studySpec.editDrawer.derivationPlaceholder')}
            rows={3}
          />
        </Form.Item>
        <Form.Item
          label={t('page.mdr.studySpec.cols.comment')}
          name="comment"
        >
          <TextArea
            placeholder={t('page.mdr.studySpec.editDrawer.commentPlaceholder')}
            rows={2}
          />
        </Form.Item>
        <Form.Item
          name="implementationNotes"
          label={
            <Space>
              {t('page.mdr.studySpec.cols.implementationNotes')}
              <Tag color="purple">{t('page.mdr.studySpec.editDrawer.aiPrompt')}</Tag>
            </Space>
          }
        >
          <TextArea
            placeholder={t('page.mdr.studySpec.editDrawer.implementationNotesPlaceholder')}
            rows={4}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default VariableFormDrawer;
