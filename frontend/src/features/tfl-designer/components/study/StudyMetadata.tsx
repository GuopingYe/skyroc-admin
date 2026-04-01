/**
 * TFL Designer - Study Metadata Panel
 *
 * Edit study-level metadata: study ID, title, phase, compound, etc. Uses Zustand useStudyStore for study CRUD
 * operations.
 */
import { SaveOutlined, UndoOutlined } from '@ant-design/icons';
import { Button, Card, Divider, Form, Input, Select, Space, Typography, message } from 'antd';
import { useEffect, useState } from 'react';

import { useStudyStore } from '../../stores';
import type { Study } from '../../types';

const { Text, Title } = Typography;

interface Props {
  readOnly?: boolean;
}

export default function StudyMetadata({ readOnly = false }: Props) {
  const { addStudy, currentStudy, setCurrentStudy, studies, updateStudy } = useStudyStore();

  const [form] = Form.useForm();
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when currentStudy changes
  useEffect(() => {
    if (currentStudy) {
      form.setFieldsValue({
        compound: currentStudy.compound || '',
        diseaseArea: currentStudy.diseaseArea || '',
        phase: currentStudy.phase || '',
        studyId: currentStudy.studyId || '',
        therapeuticArea: currentStudy.therapeuticArea || '',
        title: currentStudy.title || ''
      });
      setHasChanges(false);
    } else {
      form.resetFields();
    }
  }, [currentStudy, form]);

  // Handle save
  const handleSave = () => {
    form.validateFields().then(values => {
      if (currentStudy) {
        // Update existing study
        updateStudy(currentStudy.id, {
          compound: values.compound,
          diseaseArea: values.diseaseArea,
          phase: values.phase,
          studyId: values.studyId,
          therapeuticArea: values.therapeuticArea,
          title: values.title
        });
        message.success('Study metadata updated successfully');
      } else {
        // Create a new study if none is selected
        const newStudy: Omit<Study, 'id'> = {
          compound: values.compound,
          createdAt: new Date().toISOString(),
          diseaseArea: values.diseaseArea,
          phase: values.phase,
          studyId: values.studyId,
          therapeuticArea: values.therapeuticArea,
          title: values.title,
          updatedAt: new Date().toISOString()
        };
        addStudy(newStudy);
        // Auto-select the newly created study
        const created = studies.find(s => s.studyId === values.studyId && s.title === values.title);
        if (created) {
          setCurrentStudy(created);
        }
        message.success('Study created successfully');
      }
      setHasChanges(false);
    });
  };

  // Handle reset
  const handleReset = () => {
    if (currentStudy) {
      form.setFieldsValue({
        compound: currentStudy.compound || '',
        diseaseArea: currentStudy.diseaseArea || '',
        phase: currentStudy.phase || '',
        studyId: currentStudy.studyId || '',
        therapeuticArea: currentStudy.therapeuticArea || '',
        title: currentStudy.title || ''
      });
    } else {
      form.resetFields();
    }
    setHasChanges(false);
  };

  return (
    <Card
      size="small"
      extra={
        <Space>
          {hasChanges && (
            <>
              <Button
                icon={<UndoOutlined />}
                size="small"
                onClick={handleReset}
              >
                Reset
              </Button>
              <Button
                icon={<SaveOutlined />}
                size="small"
                type="primary"
                onClick={handleSave}
              >
                Save
              </Button>
            </>
          )}
        </Space>
      }
      title={
        <Space>
          <Title
            level={5}
            style={{ margin: 0 }}
          >
            Study Metadata
          </Title>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={() => setHasChanges(true)}
      >
        {/* Basic Study Information */}
        <Title
          level={5}
          style={{ color: '#1890ff', fontSize: 12 }}
        >
          Basic Information
        </Title>

        <Form.Item
          label="Study ID"
          name="studyId"
          rules={[{ message: 'Please enter study ID', required: true }]}
        >
          <Input
            disabled={readOnly}
            placeholder="e.g., STUDY-2024-001"
            style={{ maxWidth: 300 }}
          />
        </Form.Item>

        <Form.Item
          label="Study Title"
          name="title"
          rules={[{ message: 'Please enter study title', required: true }]}
        >
          <Input.TextArea
            disabled={readOnly}
            placeholder="Full study title"
            rows={2}
          />
        </Form.Item>

        <Form.Item
          label="Study Phase"
          name="phase"
        >
          <Select
            allowClear
            disabled={readOnly}
            placeholder="Select study phase"
            style={{ width: '100%' }}
            options={[
              { label: 'Phase I', value: 'Phase I' },
              { label: 'Phase I/II', value: 'Phase I/II' },
              { label: 'Phase II', value: 'Phase II' },
              { label: 'Phase II/III', value: 'Phase II/III' },
              { label: 'Phase III', value: 'Phase III' },
              { label: 'Phase IV', value: 'Phase IV' }
            ]}
          />
        </Form.Item>

        <Form.Item
          label="Compound Under Study"
          name="compound"
          rules={[{ message: 'Please enter compound name', required: true }]}
        >
          <Input
            disabled={readOnly}
            placeholder="e.g., TestCompound"
            style={{ maxWidth: 300 }}
          />
        </Form.Item>

        <Form.Item
          label="Disease Area"
          name="diseaseArea"
        >
          <Input
            disabled={readOnly}
            placeholder="e.g., Oncology, Cardiology"
          />
        </Form.Item>

        <Form.Item
          label="Therapeutic Area"
          name="therapeuticArea"
        >
          <Input
            disabled={readOnly}
            placeholder="e.g., Oncology, Immunology"
          />
        </Form.Item>

        <Divider />

        {/* Timestamps */}
        <Title
          level={5}
          style={{ color: '#1890ff', fontSize: 12 }}
        >
          Timestamps
        </Title>

        <Space
          direction="vertical"
          size={4}
        >
          <Space>
            <Text type="secondary">Created:</Text>
            <Text strong>{currentStudy?.createdAt || '-'}</Text>
          </Space>
          <Space>
            <Text type="secondary">Last Updated:</Text>
            <Text strong>{currentStudy?.updatedAt || '-'}</Text>
          </Space>
        </Space>
      </Form>
    </Card>
  );
}
