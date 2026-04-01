/**
 * TFL Designer - Push to Library Modal
 *
 * Modal for pushing shells/templates to Global/TA Library via PR workflow.
 */
import { SendOutlined } from '@ant-design/icons';
import { Alert, Button, Divider, Form, Input, Modal, Select, Space, Typography } from 'antd';
import { useState } from 'react';

const { Text } = Typography;
const { TextArea } = Input;

type TargetLevel = 'global' | 'ta';

interface Props {
  onClose: () => void;
  open: boolean;
  shellSchema: object;
  sourceId: number;
  sourceName: string;
  sourceType: 'analysis' | 'study' | 'ta';
}

export default function PushToLibraryModal({ onClose, open, shellSchema, sourceId, sourceName, sourceType }: Props) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const targetLevel = Form.useWatch('targetLevel', form);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();

      // TODO: Call API POST /api/v1/shell-library/push-request
      console.log('Push request:', {
        prDescription: values.prDescription,
        prTitle: values.prTitle,
        sourceId,
        sourceType,
        targetLevel: values.targetLevel,
        targetScopeNodeId: values.targetScopeNodeId
      });

      window.$message?.success('Push request submitted for review');
      form.resetFields();
      onClose();
    } catch {
      // Form validation error
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      open={open}
      width={600}
      footer={
        <Space>
          <Text type="secondary">This will create a PR for review</Text>
          <span style={{ flex: 1 }} />
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            loading={submitting}
            type="primary"
            onClick={handleSubmit}
          >
            Submit PR
          </Button>
        </Space>
      }
      title={
        <Space>
          <SendOutlined />
          <span>Push to Library</span>
        </Space>
      }
      onCancel={handleClose}
    >
      <Alert
        showIcon
        message={`Push "${sourceName}" to ${targetLevel === 'global' ? 'Global' : 'TA'} Library`}
        style={{ marginBottom: 16 }}
        type="info"
      />

      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          label="Target Level"
          name="targetLevel"
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { label: 'Global Library', value: 'global' },
              { label: 'TA Library', value: 'ta' }
            ]}
          />
        </Form.Item>

        {targetLevel === 'ta' && (
          <Form.Item
            label="Target TA"
            name="targetScopeNodeId"
            rules={[{ message: 'Select a TA', required: true }]}
          >
            <Select
              placeholder="Select Therapeutic Area"
              options={[
                // TODO: Load from API
                { label: 'Oncology', value: 1 },
                { label: 'Cardiovascular', value: 2 },
                { label: 'CNS', value: 3 }
              ]}
            />
          </Form.Item>
        )}

        <Form.Item
          label="PR Title"
          name="prTitle"
          rules={[{ message: 'Enter a title', required: true }]}
        >
          <Input placeholder="e.g., Add Demographics shell template" />
        </Form.Item>

        <Form.Item
          label="Description"
          name="prDescription"
        >
          <TextArea
            placeholder="Describe the changes and rationale..."
            rows={3}
          />
        </Form.Item>
      </Form>

      <Divider orientation="left">Preview</Divider>
      <div style={{ background: '#fafafa', borderRadius: 4, padding: 12 }}>
        <Text
          code
          style={{ fontSize: 11 }}
        >
          {JSON.stringify(shellSchema, null, 2).slice(0, 500)}...
        </Text>
      </div>
    </Modal>
  );
}
