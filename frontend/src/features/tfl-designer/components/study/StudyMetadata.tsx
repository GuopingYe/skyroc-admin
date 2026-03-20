/**
 * TFL Designer - Study Metadata Panel
 *
 * Edit study-level metadata: study ID, title, phase, compound, etc.
 * Uses Zustand useStudyStore for study CRUD operations.
 */
import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Divider,
  Button,
  message
} from 'antd';
import {
  SaveOutlined,
  UndoOutlined
} from '@ant-design/icons';
import { useStudyStore } from '../../stores';
import type { Study } from '../../types';

const { Text, Title } = Typography;

interface Props {
  readOnly?: boolean;
}

export default function StudyMetadata({ readOnly = false }: Props) {
  const { currentStudy, updateStudy, addStudy, studies, setCurrentStudy } = useStudyStore();

  const [form] = Form.useForm();
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when currentStudy changes
  useEffect(() => {
    if (currentStudy) {
      form.setFieldsValue({
        studyId: currentStudy.studyId || '',
        title: currentStudy.title || '',
        phase: currentStudy.phase || '',
        compound: currentStudy.compound || '',
        diseaseArea: currentStudy.diseaseArea || '',
        therapeuticArea: currentStudy.therapeuticArea || '',
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
          studyId: values.studyId,
          title: values.title,
          phase: values.phase,
          compound: values.compound,
          diseaseArea: values.diseaseArea,
          therapeuticArea: values.therapeuticArea,
        });
        message.success('Study metadata updated successfully');
      } else {
        // Create a new study if none is selected
        const newStudy: Omit<Study, 'id'> = {
          studyId: values.studyId,
          title: values.title,
          phase: values.phase,
          compound: values.compound,
          diseaseArea: values.diseaseArea,
          therapeuticArea: values.therapeuticArea,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addStudy(newStudy);
        // Auto-select the newly created study
        const created = studies.find(
          s => s.studyId === values.studyId && s.title === values.title
        );
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
        studyId: currentStudy.studyId || '',
        title: currentStudy.title || '',
        phase: currentStudy.phase || '',
        compound: currentStudy.compound || '',
        diseaseArea: currentStudy.diseaseArea || '',
        therapeuticArea: currentStudy.therapeuticArea || '',
      });
    } else {
      form.resetFields();
    }
    setHasChanges(false);
  };

  return (
    <Card
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>Study Metadata</Title>
        </Space>
      }
      size="small"
      extra={
        <Space>
          {hasChanges && (
            <>
              <Button
                size="small"
                icon={<UndoOutlined />}
                onClick={handleReset}
              >
                Reset
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
              >
                Save
              </Button>
            </>
          )}
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={() => setHasChanges(true)}
      >
        {/* Basic Study Information */}
        <Title level={5} style={{ fontSize: 12, color: '#1890ff' }}>
          Basic Information
        </Title>

        <Form.Item
          name="studyId"
          label="Study ID"
          rules={[{ required: true, message: 'Please enter study ID' }]}
        >
          <Input
            placeholder="e.g., STUDY-2024-001"
            disabled={readOnly}
            style={{ maxWidth: 300 }}
          />
        </Form.Item>

        <Form.Item
          name="title"
          label="Study Title"
          rules={[{ required: true, message: 'Please enter study title' }]}
        >
          <Input.TextArea
            placeholder="Full study title"
            disabled={readOnly}
            rows={2}
          />
        </Form.Item>

        <Form.Item
          name="phase"
          label="Study Phase"
        >
          <Select
            placeholder="Select study phase"
            disabled={readOnly}
            style={{ width: '100%' }}
            allowClear
            options={[
              { value: 'Phase I', label: 'Phase I' },
              { value: 'Phase I/II', label: 'Phase I/II' },
              { value: 'Phase II', label: 'Phase II' },
              { value: 'Phase II/III', label: 'Phase II/III' },
              { value: 'Phase III', label: 'Phase III' },
              { value: 'Phase IV', label: 'Phase IV' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="compound"
          label="Compound Under Study"
          rules={[{ required: true, message: 'Please enter compound name' }]}
        >
          <Input
            placeholder="e.g., TestCompound"
            disabled={readOnly}
            style={{ maxWidth: 300 }}
          />
        </Form.Item>

        <Form.Item
          name="diseaseArea"
          label="Disease Area"
        >
          <Input
            placeholder="e.g., Oncology, Cardiology"
            disabled={readOnly}
          />
        </Form.Item>

        <Form.Item
          name="therapeuticArea"
          label="Therapeutic Area"
        >
          <Input
            placeholder="e.g., Oncology, Immunology"
            disabled={readOnly}
          />
        </Form.Item>

        <Divider />

        {/* Timestamps */}
        <Title level={5} style={{ fontSize: 12, color: '#1890ff' }}>
          Timestamps
        </Title>

        <Space direction="vertical" size={4}>
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
