/**
 * SaveChangesModal
 *
 * Shows a grouped diff of pending domain changes (added / modified / deleted)
 * before committing to the backend. Calls onConfirm after the user approves.
 */
import { CheckCircleOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Alert, Button, Descriptions, Modal, Space, Tag, Typography } from 'antd';
import React from 'react';

import type { DomainDiff, DomainDraft } from '../store/domainDraftStore';

const { Text } = Typography;

const FIELD_LABELS: Partial<Record<keyof DomainDraft, string>> = {
  class_type: 'Class Type',
  comments: 'Comments',
  domain_label: 'Domain Label',
  domain_name: 'Domain Name',
  key_variables: 'Key Variables',
  sort_variables: 'Sort Variables',
  structure: 'Structure',
};

const DIFF_FIELDS: (keyof DomainDraft)[] = [
  'domain_name',
  'domain_label',
  'class_type',
  'structure',
  'key_variables',
  'sort_variables',
  'comments',
];

function formatValue(val: unknown): string {
  if (val === undefined || val === null || val === '') return '(empty)';
  if (Array.isArray(val)) return val.length === 0 ? '(none)' : val.join(', ');
  return String(val);
}

interface SaveChangesModalProps {
  confirmLoading?: boolean;
  diff: DomainDiff;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
}

export const SaveChangesModal: React.FC<SaveChangesModalProps> = ({
  confirmLoading,
  diff,
  onCancel,
  onConfirm,
  open,
}) => {
  const totalChanges = diff.added.length + diff.modified.length + diff.deleted.length;

  return (
    <Modal
      footer={
        <Space>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            disabled={totalChanges === 0}
            loading={confirmLoading}
            onClick={onConfirm}
            type="primary"
          >
            Confirm Save
          </Button>
        </Space>
      }
      onCancel={onCancel}
      open={open}
      title="Save Changes"
      width={600}
    >
      <Text type="secondary">Review the following changes before saving:</Text>

      {/* Added */}
      {diff.added.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <Text strong>Added ({diff.added.length})</Text>
          </Space>
          {diff.added.map(d => (
            <div key={d.id} style={{ marginLeft: 24, marginTop: 4 }}>
              <Text>
                <Tag color="green">{d.domain_name}</Tag>
                {d.domain_label} <Text type="secondary">[{d.class_type}]</Text>
              </Text>
            </div>
          ))}
        </div>
      )}

      {/* Modified */}
      {diff.modified.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Space>
            <EditOutlined style={{ color: '#1677ff' }} />
            <Text strong>Modified ({diff.modified.length})</Text>
          </Space>
          {diff.modified.map(({ after, before }) => (
            <div key={after.id} style={{ marginLeft: 24, marginTop: 8 }}>
              <Text strong>{after.domain_name}</Text> — {after.domain_label}
              <Descriptions column={1} size="small" style={{ marginTop: 4 }}>
                {DIFF_FIELDS.filter(field => {
                  const bVal = formatValue(before[field]);
                  const aVal = formatValue(after[field]);
                  return bVal !== aVal;
                }).map(field => (
                  <Descriptions.Item key={field} label={FIELD_LABELS[field] ?? field}>
                    <Text delete type="danger">{formatValue(before[field])}</Text>
                    {' → '}
                    <Text type="success">{formatValue(after[field])}</Text>
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </div>
          ))}
        </div>
      )}

      {/* Deleted */}
      {diff.deleted.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Space>
            <DeleteOutlined style={{ color: '#ff4d4f' }} />
            <Text strong>Deleted ({diff.deleted.length})</Text>
          </Space>
          {diff.deleted.map(d => (
            <div key={d.id} style={{ marginLeft: 24, marginTop: 4 }}>
              <Text delete type="danger">
                <Tag color="red">{d.domain_name}</Tag>
                {d.domain_label} <Text type="secondary">[{d.class_type}]</Text>
              </Text>
            </div>
          ))}
        </div>
      )}

      {totalChanges === 0 && (
        <Alert message="No pending changes." style={{ marginTop: 16 }} type="info" />
      )}

      <Alert
        message="This action cannot be undone after confirming."
        showIcon
        style={{ marginTop: 16 }}
        type="warning"
      />
    </Modal>
  );
};
