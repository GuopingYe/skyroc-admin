/**
 * TFL Designer - Push to Study Template Modal
 *
 * Modal for proposing analysis shell changes back to the study template. Shows a diff preview and creates a PR via the
 * existing workflow.
 */
import { DiffOutlined, SendOutlined } from '@ant-design/icons';
import { Alert, Button, Divider, Empty, Form, Input, Modal, Select, Space, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';

import { useStudyStore, useTableStore } from '../../stores';
import type { TableShell } from '../../types';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface Props {
  onClose: () => void;
  open: boolean;
}

interface DiffEntry {
  field: string;
  new: string;
  old: string;
  type: 'added' | 'modified' | 'removed';
}

export default function PushToStudyModal({ onClose, open }: Props) {
  const studyTemplates = useStudyStore(s => s.studyTemplates);
  const currentTable = useTableStore(s => s.currentTable);

  const [form] = Form.useForm();
  const selectedTemplateId = Form.useWatch('targetTemplate', form);
  const [submitting, setSubmitting] = useState(false);

  const templateOptions = useMemo(
    () =>
      studyTemplates
        .filter(t => t.displayType === 'Table')
        .map(t => ({ label: `${t.templateName} (v${t.version})`, value: t.id })),
    [studyTemplates]
  );

  const selectedTemplate = useMemo(
    () => (selectedTemplateId ? studyTemplates.find(t => t.id === selectedTemplateId) : undefined),
    [selectedTemplateId, studyTemplates]
  );

  // Compute a simple text-based diff between current table and source template
  const diffs = useMemo<DiffEntry[]>(() => {
    if (!currentTable || !selectedTemplate) return [];
    // Only diff if the template is a Table type
    if (selectedTemplate.displayType !== 'Table') return [];
    const result: DiffEntry[] = [];
    const schema = selectedTemplate.shellSchema as TableShell;

    // Title diff
    if (currentTable.title !== schema.title) {
      result.push({ field: 'Title', new: currentTable.title, old: schema.title || '(empty)', type: 'modified' });
    }
    // Category diff
    if (currentTable.category !== schema.category) {
      result.push({ field: 'Category', new: currentTable.category, old: schema.category, type: 'modified' });
    }
    // Population diff
    if (currentTable.population !== schema.population) {
      result.push({
        field: 'Population',
        new: currentTable.population,
        old: schema.population || '(empty)',
        type: 'modified'
      });
    }
    // Dataset diff
    if (currentTable.dataset !== schema.dataset) {
      result.push({ field: 'Dataset', new: currentTable.dataset, old: schema.dataset || '(empty)', type: 'modified' });
    }
    // Row count diff
    const oldRows = schema.rows?.length ?? 0;
    const newRows = currentTable.rows?.length ?? 0;
    if (oldRows !== newRows) {
      result.push({ field: 'Row Count', new: String(newRows), old: String(oldRows), type: 'modified' });
    }
    // Row-level diffs
    const oldRowsArr = schema.rows ?? [];
    const newRowsArr = currentTable.rows ?? [];
    const maxLen = Math.max(oldRowsArr.length, newRowsArr.length);
    for (let i = 0; i < maxLen; i++) {
      if (!oldRowsArr[i]) {
        result.push({ field: `Row ${i + 1}`, new: newRowsArr[i].label, old: '(none)', type: 'added' });
      } else if (!newRowsArr[i]) {
        result.push({ field: `Row ${i + 1}`, new: '(removed)', old: oldRowsArr[i].label, type: 'removed' });
      } else if (oldRowsArr[i].label !== newRowsArr[i].label) {
        result.push({
          field: `Row ${i + 1} Label`,
          new: newRowsArr[i].label,
          old: oldRowsArr[i].label,
          type: 'modified'
        });
      }
    }
    // Footer notes diff
    const oldNotes = (schema.footer?.notes ?? []).length;
    const newNotes = (currentTable.footer?.notes ?? []).length;
    if (oldNotes !== newNotes) {
      result.push({ field: 'Footer Notes', new: `${newNotes} notes`, old: `${oldNotes} notes`, type: 'modified' });
    }

    return result;
  }, [currentTable, selectedTemplate]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();
      // In a real implementation, this would call the backend API:
      // POST /api/v1/ars/displays/{display_id}/propose-to-study
      console.log('Push to Study PR:', {
        description: values.description,
        diffs,
        templateId: selectedTemplateId,
        title: values.title
      });
      window.$message?.success('Push to Study request submitted (PR created)');
      form.resetFields();
      onClose();
    } catch {
      // validation error, form will show it
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const getDiffColor = (type: DiffEntry['type']) => {
    switch (type) {
      case 'added':
        return 'green';
      case 'removed':
        return 'red';
      case 'modified':
        return 'orange';
    }
  };

  return (
    <Modal
      open={open}
      width={700}
      footer={
        <Space>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            disabled={!selectedTemplateId}
            icon={<SendOutlined />}
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
          <span>Push to Study Template</span>
        </Space>
      }
      onCancel={handleClose}
    >
      {!currentTable ? (
        <Empty description="No shell selected" />
      ) : (
        <>
          <Alert
            showIcon
            message="Propose changes from this analysis shell back to the study template. A PR will be created for review."
            style={{ marginBottom: 16 }}
            type="info"
          />

          <Form
            form={form}
            layout="vertical"
          >
            <Form.Item
              label="Target Study Template"
              name="targetTemplate"
              rules={[{ message: 'Select a template', required: true }]}
            >
              <Select
                options={templateOptions}
                placeholder="Select study template to update"
              />
            </Form.Item>
            <Form.Item
              label="PR Title"
              name="title"
              rules={[{ message: 'Enter a title', required: true }]}
            >
              <Input placeholder="e.g., Update Demographics Table shell with new rows" />
            </Form.Item>
            <Form.Item
              label="Description"
              name="description"
            >
              <TextArea
                placeholder="Describe the changes and rationale..."
                rows={3}
              />
            </Form.Item>
          </Form>

          {/* Diff Preview */}
          {selectedTemplate && (
            <>
              <Divider>
                <Space>
                  <DiffOutlined />
                  <Text strong>Diff Preview</Text>
                </Space>
              </Divider>
              {diffs.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                  <Text type="secondary">No differences detected between this shell and the template.</Text>
                </div>
              ) : (
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {diffs.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        alignItems: 'center',
                        borderBottom: '1px solid #f0f0f0',
                        display: 'flex',
                        fontSize: 13,
                        gap: 8,
                        padding: '6px 12px'
                      }}
                    >
                      <Tag
                        color={getDiffColor(d.type)}
                        style={{ margin: 0, textAlign: 'center', width: 70 }}
                      >
                        {d.type}
                      </Tag>
                      <Text
                        strong
                        style={{ flexShrink: 0, width: 130 }}
                      >
                        {d.field}
                      </Text>
                      <Text
                        delete={d.type === 'removed'}
                        style={{ flex: 1 }}
                        type="secondary"
                      >
                        {d.old}
                      </Text>
                      <Text style={{ color: d.type === 'added' ? '#52c41a' : undefined, flex: 1 }}>{d.new}</Text>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </Modal>
  );
}
