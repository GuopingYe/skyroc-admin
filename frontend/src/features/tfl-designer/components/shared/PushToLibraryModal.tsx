/**
 * TFL Designer - Push to Library Modal
 *
 * Modal for pushing shells/templates to Global/TA Library via PR workflow.
 */
import { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Divider,
  Alert,
  Button,
} from 'antd';
import { SendOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

type TargetLevel = 'global' | 'ta';

interface Props {
  open: boolean;
  onClose: () => void;
  sourceType: 'analysis' | 'study' | 'ta';
  sourceId: number;
  sourceName: string;
  shellSchema: object;
}

export default function PushToLibraryModal({
  open,
  onClose,
  sourceType,
  sourceId,
  sourceName,
  shellSchema,
}: Props) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const targetLevel = Form.useWatch('targetLevel', form);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();

      // TODO: Call API POST /api/v1/shell-library/push-request
      console.log('Push request:', {
        sourceType,
        sourceId,
        targetLevel: values.targetLevel,
        targetScopeNodeId: values.targetScopeNodeId,
        prTitle: values.prTitle,
        prDescription: values.prDescription,
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
      title={
        <Space>
          <SendOutlined />
          <span>Push to Library</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={600}
      footer={
        <Space>
          <Text type="secondary">This will create a PR for review</Text>
          <span style={{ flex: 1 }} />
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            Submit PR
          </Button>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        message={`Push "${sourceName}" to ${targetLevel === 'global' ? 'Global' : 'TA'} Library`}
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Form.Item
          name="targetLevel"
          label="Target Level"
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { label: 'Global Library', value: 'global' },
              { label: 'TA Library', value: 'ta' },
            ]}
          />
        </Form.Item>

        {targetLevel === 'ta' && (
          <Form.Item
            name="targetScopeNodeId"
            label="Target TA"
            rules={[{ required: true, message: 'Select a TA' }]}
          >
            <Select
              placeholder="Select Therapeutic Area"
              options={[
                // TODO: Load from API
                { label: 'Oncology', value: 1 },
                { label: 'Cardiovascular', value: 2 },
                { label: 'CNS', value: 3 },
              ]}
            />
          </Form.Item>
        )}

        <Form.Item
          name="prTitle"
          label="PR Title"
          rules={[{ required: true, message: 'Enter a title' }]}
        >
          <Input placeholder="e.g., Add Demographics shell template" />
        </Form.Item>

        <Form.Item name="prDescription" label="Description">
          <TextArea rows={3} placeholder="Describe the changes and rationale..." />
        </Form.Item>
      </Form>

      <Divider orientation="left">Preview</Divider>
      <div style={{ padding: 12, background: '#fafafa', borderRadius: 4 }}>
        <Text code style={{ fontSize: 11 }}>
          {JSON.stringify(shellSchema, null, 2).slice(0, 500)}...
        </Text>
      </div>
    </Modal>
  );
}
