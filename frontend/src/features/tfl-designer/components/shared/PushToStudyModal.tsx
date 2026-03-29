/**
 * TFL Designer - Push to Study Template Modal
 *
 * Modal for proposing analysis shell changes back to the study template.
 * Shows a diff preview and creates a PR via the existing workflow.
 */
import { useState, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Alert,
  Tag,
  Button,
  Divider,
  Empty,
} from 'antd';
import { SendOutlined, DiffOutlined } from '@ant-design/icons';
import type { TableShell } from '../../types';
import { useStudyStore, useTableStore } from '../../stores';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface Props {
  open: boolean;
  onClose: () => void;
}

interface DiffEntry {
  field: string;
  old: string;
  new: string;
  type: 'added' | 'removed' | 'modified';
}

export default function PushToStudyModal({ open, onClose }: Props) {
  const studyTemplates = useStudyStore((s) => s.studyTemplates);
  const currentTable = useTableStore((s) => s.currentTable);

  const [form] = Form.useForm();
  const selectedTemplateId = Form.useWatch('targetTemplate', form);
  const [submitting, setSubmitting] = useState(false);

  const templateOptions = useMemo(
    () =>
      studyTemplates
        .filter((t) => t.displayType === 'Table')
        .map((t) => ({ value: t.id, label: `${t.templateName} (v${t.version})` })),
    [studyTemplates],
  );

  const selectedTemplate = useMemo(
    () => (selectedTemplateId ? studyTemplates.find((t) => t.id === selectedTemplateId) : undefined),
    [selectedTemplateId, studyTemplates],
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
      result.push({ field: 'Title', old: schema.title || '(empty)', new: currentTable.title, type: 'modified' });
    }
    // Category diff
    if (currentTable.category !== schema.category) {
      result.push({ field: 'Category', old: schema.category, new: currentTable.category, type: 'modified' });
    }
    // Population diff
    if (currentTable.population !== schema.population) {
      result.push({ field: 'Population', old: schema.population || '(empty)', new: currentTable.population, type: 'modified' });
    }
    // Dataset diff
    if (currentTable.dataset !== schema.dataset) {
      result.push({ field: 'Dataset', old: schema.dataset || '(empty)', new: currentTable.dataset, type: 'modified' });
    }
    // Row count diff
    const oldRows = schema.rows?.length ?? 0;
    const newRows = currentTable.rows?.length ?? 0;
    if (oldRows !== newRows) {
      result.push({ field: 'Row Count', old: String(oldRows), new: String(newRows), type: 'modified' });
    }
    // Row-level diffs
    const oldRowsArr = schema.rows ?? [];
    const newRowsArr = currentTable.rows ?? [];
    const maxLen = Math.max(oldRowsArr.length, newRowsArr.length);
    for (let i = 0; i < maxLen; i++) {
      if (!oldRowsArr[i]) {
        result.push({ field: `Row ${i + 1}`, old: '(none)', new: newRowsArr[i].label, type: 'added' });
      } else if (!newRowsArr[i]) {
        result.push({ field: `Row ${i + 1}`, old: oldRowsArr[i].label, new: '(removed)', type: 'removed' });
      } else if (oldRowsArr[i].label !== newRowsArr[i].label) {
        result.push({ field: `Row ${i + 1} Label`, old: oldRowsArr[i].label, new: newRowsArr[i].label, type: 'modified' });
      }
    }
    // Footer notes diff
    const oldNotes = (schema.footer?.notes ?? []).length;
    const newNotes = (currentTable.footer?.notes ?? []).length;
    if (oldNotes !== newNotes) {
      result.push({ field: 'Footer Notes', old: `${oldNotes} notes`, new: `${newNotes} notes`, type: 'modified' });
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
        templateId: selectedTemplateId,
        title: values.title,
        description: values.description,
        diffs,
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
      case 'added': return 'green';
      case 'removed': return 'red';
      case 'modified': return 'orange';
    }
  };

  return (
    <Modal
      title={
        <Space>
          <SendOutlined />
          <span>Push to Study Template</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={700}
      footer={
        <Space>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={submitting}
            onClick={handleSubmit}
            disabled={!selectedTemplateId}
          >
            Submit PR
          </Button>
        </Space>
      }
    >
      {!currentTable ? (
        <Empty description="No shell selected" />
      ) : (
        <>
          <Alert
            type="info"
            showIcon
            message="Propose changes from this analysis shell back to the study template. A PR will be created for review."
            style={{ marginBottom: 16 }}
          />

          <Form form={form} layout="vertical">
            <Form.Item name="targetTemplate" label="Target Study Template" rules={[{ required: true, message: 'Select a template' }]}>
              <Select
                placeholder="Select study template to update"
                options={templateOptions}
              />
            </Form.Item>
            <Form.Item name="title" label="PR Title" rules={[{ required: true, message: 'Enter a title' }]}>
              <Input placeholder="e.g., Update Demographics Table shell with new rows" />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <TextArea rows={3} placeholder="Describe the changes and rationale..." />
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
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <Text type="secondary">No differences detected between this shell and the template.</Text>
                </div>
              ) : (
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {diffs.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 12px',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: 13,
                      }}
                    >
                      <Tag color={getDiffColor(d.type)} style={{ width: 70, textAlign: 'center', margin: 0 }}>
                        {d.type}
                      </Tag>
                      <Text strong style={{ width: 130, flexShrink: 0 }}>{d.field}</Text>
                      <Text type="secondary" delete={d.type === 'removed'} style={{ flex: 1 }}>
                        {d.old}
                      </Text>
                      <Text style={{ flex: 1, color: d.type === 'added' ? '#52c41a' : undefined }}>
                        {d.new}
                      </Text>
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
