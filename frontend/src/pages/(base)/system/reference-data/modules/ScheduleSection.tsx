import { useCallback, useEffect } from 'react';

import { Button, Card, Form, InputNumber, Radio, Select, Switch, message } from 'antd';

import { useCdiscConfig, useUpdateSchedule } from '@/service/hooks/useCdiscSync';

const DAY_OF_WEEK_OPTIONS = [
  { label: 'Monday', value: 0 },
  { label: 'Tuesday', value: 1 },
  { label: 'Wednesday', value: 2 },
  { label: 'Thursday', value: 3 },
  { label: 'Friday', value: 4 },
  { label: 'Saturday', value: 5 },
  { label: 'Sunday', value: 6 }
] as const;

const ScheduleSection: React.FC = () => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const { data: config, isLoading } = useCdiscConfig();
  const updateScheduleMutation = useUpdateSchedule();

  const scheduleType = Form.useWatch('type', form);

  useEffect(() => {
    if (config?.sync_schedule) {
      form.setFieldsValue({
        type: config.sync_schedule.type,
        day_of_week: config.sync_schedule.day_of_week ?? 0,
        day_of_month: config.sync_schedule.day_of_month ?? 1,
        interval_hours: config.sync_schedule.interval_hours ?? 24,
        sync_enabled: config.sync_enabled
      });
    }
  }, [config, form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const payload: Api.CdiscSync.ScheduleUpdate = {
        type: values.type,
        sync_enabled: values.sync_enabled
      };
      if (values.type === 'weekly') {
        payload.day_of_week = values.day_of_week;
      }
      if (values.type === 'monthly') {
        payload.day_of_month = values.day_of_month;
      }
      if (values.type === 'custom') {
        payload.interval_hours = values.interval_hours;
      }
      updateScheduleMutation.mutate(payload, {
        onSuccess: () => messageApi.success('Schedule updated successfully'),
        onError: () => messageApi.error('Failed to update schedule')
      });
    } catch {
      // form validation failed
    }
  }, [form, updateScheduleMutation, messageApi]);

  return (
    <Card title="Sync Schedule" loading={isLoading}>
      {contextHolder}
      <Form form={form} layout="vertical">
        <Form.Item name="type" label="Frequency">
          <Radio.Group>
            <Radio.Button value="daily">Daily</Radio.Button>
            <Radio.Button value="weekly">Weekly</Radio.Button>
            <Radio.Button value="monthly">Monthly</Radio.Button>
            <Radio.Button value="custom">Custom</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {scheduleType === 'weekly' && (
          <Form.Item name="day_of_week" label="Day of Week">
            <Select options={DAY_OF_WEEK_OPTIONS.map(d => ({ label: d.label, value: d.value }))} style={{ width: 200 }} />
          </Form.Item>
        )}

        {scheduleType === 'monthly' && (
          <Form.Item name="day_of_month" label="Day of Month">
            <InputNumber min={1} max={31} style={{ width: 200 }} />
          </Form.Item>
        )}

        {scheduleType === 'custom' && (
          <Form.Item name="interval_hours" label="Interval (hours)">
            <InputNumber min={1} max={720} style={{ width: 200 }} />
          </Form.Item>
        )}

        <Form.Item name="sync_enabled" label="Auto Sync Enabled" valuePropName="checked">
          <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="primary"
            loading={updateScheduleMutation.isPending}
            onClick={handleSave}
          >
            Save Schedule
          </Button>
        </div>
      </Form>
    </Card>
  );
};

export default ScheduleSection;
