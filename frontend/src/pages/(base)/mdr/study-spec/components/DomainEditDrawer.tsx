/**
 * DomainEditDrawer
 *
 * Right-side drawer for editing a domain's core fields (custom only) and
 * extended info (all domains). Dispatches an EDIT_DOMAIN command to the
 * draft store on Apply — does NOT call the backend directly.
 */
import { Button, Drawer, Form, Input, Select, Space } from 'antd';
import React, { useEffect } from 'react';

import { useStudyVariables } from '@/service/hooks';
import type { DomainDraft, DomainDraftStore } from '../store/domainDraftStore';

const CLASS_TYPE_OPTIONS = [
  { label: 'Events', value: 'Events' },
  { label: 'Findings', value: 'Findings' },
  { label: 'Interventions', value: 'Interventions' },
  { label: 'Special Purpose', value: 'Special Purpose' },
  { label: 'Relationship', value: 'Relationship' },
  { label: 'Study Reference', value: 'Study Reference' },
];

interface DomainEditDrawerProps {
  datasetId: number | null;  // numeric ID to fetch variable list
  domain: DomainDraft | null;
  onClose: () => void;
  open: boolean;
  store: DomainDraftStore;
}

export const DomainEditDrawer: React.FC<DomainEditDrawerProps> = ({
  datasetId,
  domain,
  onClose,
  open,
  store,
}) => {
  const [form] = Form.useForm();
  const isCustom = domain?.origin === 'custom';

  // Fetch variable list for key/sort variable selectors
  const { data: variablesData } = useStudyVariables(open ? datasetId : null);
  const variableOptions = (variablesData?.items ?? []).map(v => ({
    label: v.variable_name,
    value: v.variable_name,
  }));

  // Populate form when drawer opens
  useEffect(() => {
    if (open && domain) {
      form.setFieldsValue({
        class_type: domain.class_type,
        comments: domain.comments,
        domain_label: domain.domain_label,
        domain_name: domain.domain_name,
        key_variables: domain.key_variables,
        sort_variables: domain.sort_variables,
        structure: domain.structure,
      });
    }
  }, [open, domain, form]);

  const handleApply = () => {
    form.validateFields().then(values => {
      if (!domain) return;

      const after: DomainDraft = {
        ...domain,
        class_type: isCustom ? (values.class_type ?? domain.class_type) : domain.class_type,
        comments: values.comments ?? '',
        domain_label: values.domain_label ?? '',
        domain_name: isCustom
          ? (values.domain_name ?? domain.domain_name).toUpperCase()
          : domain.domain_name,
        key_variables: values.key_variables ?? [],
        sort_variables: values.sort_variables ?? [],
        structure: values.structure ?? '',
        _status: domain._status === 'added' ? 'added' : 'modified',
      };

      store.dispatch({
        payload: { after, before: domain, id: domain.id },
        type: 'EDIT_DOMAIN',
      });
      onClose();
    });
  };

  return (
    <Drawer
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply} type="primary">Apply</Button>
        </Space>
      }
      onClose={onClose}
      open={open}
      title={`Edit Domain: ${domain?.domain_name ?? ''}`}
      width={500}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Domain Name"
          name="domain_name"
          rules={isCustom ? [
            { max: 8, message: 'Max 8 characters (CDISC standard)' },
            { message: 'Required', required: true },
          ] : []}
        >
          <Input
            disabled={!isCustom}
            placeholder="e.g. AE, MYDOM"
            style={{ textTransform: 'uppercase' }}
          />
        </Form.Item>

        <Form.Item label="Domain Label" name="domain_label">
          <Input placeholder="e.g. Adverse Events" />
        </Form.Item>

        <Form.Item label="Class Type" name="class_type">
          <Select disabled={!isCustom} options={CLASS_TYPE_OPTIONS} />
        </Form.Item>

        <Form.Item
          label="Structure"
          name="structure"
          style={{ marginTop: 16 }}
          tooltip="Describe the dataset structure, e.g. 'One record per subject per adverse event'"
        >
          <Input.TextArea
            autoSize={{ maxRows: 4, minRows: 2 }}
            placeholder="One record per subject per ..."
          />
        </Form.Item>

        <Form.Item
          label="Key Variables"
          name="key_variables"
          tooltip="Variables that uniquely identify a record"
        >
          <Select
            mode="multiple"
            options={variableOptions}
            placeholder="Select key variables"
          />
        </Form.Item>

        <Form.Item
          label="Sort Variables"
          name="sort_variables"
          tooltip="Variables used for dataset sorting"
        >
          <Select
            mode="multiple"
            options={variableOptions}
            placeholder="Select sort variables"
          />
        </Form.Item>

        <Form.Item label="Comments" name="comments">
          <Input.TextArea
            autoSize={{ maxRows: 6, minRows: 3 }}
            placeholder="Additional notes about this dataset"
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};
