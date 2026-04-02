import { useCallback, useEffect, useState } from 'react';

import { Checkbox, Form, Input, message, Button, Card, Tag } from 'antd';

import {
  useCdiscConfig,
  useTestCdiscConnection,
  useUpdateCdiscConfig
} from '@/service/hooks/useCdiscSync';

import { CDISC_STANDARD_TYPES } from './standard-types';

const ConfigSection: React.FC = () => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  const { data: config, isLoading } = useCdiscConfig();
  const updateConfigMutation = useUpdateCdiscConfig();
  const testConnectionMutation = useTestCdiscConnection();

  useEffect(() => {
    if (config) {
      form.setFieldsValue({
        api_base_url: config.api_base_url,
        api_key: config.api_key_masked,
        enabled_standard_types: config.enabled_standard_types
      });
    }
  }, [config, form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const payload: Api.CdiscSync.CdiscConfigUpdate = {
        api_base_url: values.api_base_url,
        enabled_standard_types: values.enabled_standard_types
      };
      // Only send api_key if user actually changed it (not the masked value)
      if (values.api_key && values.api_key !== config?.api_key_masked) {
        payload.api_key = values.api_key;
      }
      updateConfigMutation.mutate(payload, {
        onSuccess: () => {
          messageApi.success('Configuration saved successfully');
          setTestResult(null);
        },
        onError: () => messageApi.error('Failed to save configuration')
      });
    } catch {
      // form validation failed
    }
  }, [form, config, updateConfigMutation, messageApi]);

  const handleTestConnection = useCallback(() => {
    const payload: Api.CdiscSync.CdiscConfigUpdate = {};
    const apiBase = form.getFieldValue('api_base_url');
    const apiKey = form.getFieldValue('api_key');
    if (apiBase) payload.api_base_url = apiBase;
    if (apiKey && apiKey !== config?.api_key_masked) payload.api_key = apiKey;

    testConnectionMutation.mutate(payload, {
      onSuccess: data => {
        setTestResult(data);
        if (data.status === 'success') {
          messageApi.success(data.message);
        } else {
          messageApi.error(data.message);
        }
      },
      onError: () => {
        setTestResult({ status: 'error', message: 'Connection test failed' });
        messageApi.error('Connection test failed');
      }
    });
  }, [form, config, testConnectionMutation, messageApi]);

  return (
    <Card title="CDISC API Configuration" loading={isLoading}>
      {contextHolder}
      <Form form={form} layout="vertical">
        <Form.Item
          name="api_base_url"
          label="API Base URL"
          rules={[{ required: true, message: 'API Base URL is required' }]}
        >
          <Input placeholder="https://api.cdisc.org" />
        </Form.Item>
        <Form.Item
          name="api_key"
          label="API Key"
          rules={[{ required: true, message: 'API Key is required' }]}
        >
          <Input.Password placeholder="Enter API key to update" />
        </Form.Item>
        <Form.Item
          name="enabled_standard_types"
          label="Enabled Standard Types"
          rules={[{ required: true, message: 'Select at least one standard type' }]}
        >
          <Checkbox.Group options={CDISC_STANDARD_TYPES.map(t => ({ label: t.label, value: t.value }))} />
        </Form.Item>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
          {testResult && (
            <Tag color={testResult.status === 'success' ? 'green' : 'red'}>{testResult.message}</Tag>
          )}
          <Button
            loading={testConnectionMutation.isPending}
            onClick={handleTestConnection}
          >
            Test Connection
          </Button>
          <Button
            type="primary"
            loading={updateConfigMutation.isPending}
            onClick={handleSave}
          >
            Save Configuration
          </Button>
        </div>
      </Form>
    </Card>
  );
};

export default ConfigSection;
