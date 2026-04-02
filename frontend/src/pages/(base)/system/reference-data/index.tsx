import { useCallback, useMemo, useState } from 'react';

import { DeleteOutlined, EditOutlined, PlusOutlined, RedoOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Result,
  Space,
  Switch,
  Table,
  Tabs,
  Tag
} from 'antd';

import { usePermissionCheck } from '@/service/hooks/useRBAC';
import {
  useCreateReferenceItem,
  useDeactivateReferenceItem,
  useReferenceItems,
  useRestoreReferenceItem,
  useUpdateReferenceItem
} from '@/service/hooks/useReferenceData';

import CdiscLibraryTab from './modules/CdiscLibraryTab';

const CATEGORIES = [
  { key: 'POPULATION', label: 'Population' },
  { key: 'SDTM_DOMAIN', label: 'SDTM Domain' },
  { key: 'ADAM_DATASET', label: 'ADaM Dataset' },
  { key: 'STUDY_PHASE', label: 'Study Phase' },
  { key: 'STAT_TYPE', label: 'Statistic Type' },
  { key: 'DISPLAY_TYPE', label: 'Display Type' },
  { key: 'ANALYSIS_CATEGORY', label: 'Analysis Category' },
  { key: 'THERAPEUTIC_AREA', label: 'Therapeutic Area' },
  { key: 'REGULATORY_AGENCY', label: 'Regulatory Agency' },
  { key: 'CONTROL_TYPE', label: 'Control Type' },
  { key: 'BLINDING_STATUS', label: 'Blinding Status' },
  { key: 'STUDY_DESIGN', label: 'Study Design' }
] as const;

export const handle = {
  i18nKey: 'route.(base)_system_reference-data',
  icon: 'mdi:database-cog',
  order: 3,
  title: 'Reference Data'
};

const ReferenceDataPage: React.FC = () => {
  const [mainTab, setMainTab] = useState('reference-data');
  const [activeCategory, setActiveCategory] = useState('POPULATION');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Api.ReferenceData.ReferenceDataItem | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const { isSuperuser } = usePermissionCheck();

  const { data: items = [], isLoading } = useReferenceItems(
    activeCategory,
    showDeleted ? { is_deleted: true } : undefined
  );
  const createMutation = useCreateReferenceItem(activeCategory);
  const updateMutation = useUpdateReferenceItem(activeCategory);
  const deactivateMutation = useDeactivateReferenceItem(activeCategory);
  const restoreMutation = useRestoreReferenceItem(activeCategory);

  const columns: ColumnsType<Api.ReferenceData.ReferenceDataItem> = useMemo(
    () => [
      {
        title: 'Code',
        dataIndex: 'code',
        width: 120,
        sorter: (a, b) => a.code.localeCompare(b.code)
      },
      {
        title: 'Label',
        dataIndex: 'label',
        width: 200
      },
      {
        title: 'Description',
        dataIndex: 'description',
        width: 250,
        ellipsis: true
      },
      {
        title: 'Sort Order',
        dataIndex: 'sort_order',
        width: 100,
        sorter: (a, b) => a.sort_order - b.sort_order
      },
      {
        title: 'Status',
        dataIndex: 'is_active',
        width: 80,
        render: (val: boolean, record) =>
          record.is_deleted ? (
            <Tag color="red">Deleted</Tag>
          ) : val ? (
            <Tag color="green">Active</Tag>
          ) : (
            <Tag color="orange">Inactive</Tag>
          )
      },
      ...(isSuperuser
        ? [
            {
              title: 'Actions',
              width: 180,
              render: (_: unknown, record: Api.ReferenceData.ReferenceDataItem) => (
                <Space>
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditingItem(record);
                      form.setFieldsValue(record);
                      setModalOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  {record.is_deleted ? (
                    <Button
                      type="link"
                      size="small"
                      icon={<RedoOutlined />}
                      loading={restoreMutation.isPending}
                      onClick={() => {
                        restoreMutation.mutate(record.code, {
                          onSuccess: () => messageApi.success('Item restored'),
                          onError: () => messageApi.error('Restore failed')
                        });
                      }}
                    >
                      Restore
                    </Button>
                  ) : (
                    <Popconfirm
                      title="Deactivate this item?"
                      onConfirm={() => {
                        deactivateMutation.mutate(record.code, {
                          onSuccess: () => messageApi.success('Item deactivated'),
                          onError: () => messageApi.error('Deactivate failed')
                        });
                      }}
                    >
                      <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                        Deactivate
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              )
            }
          ]
        : [])
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSuperuser]
  );

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingItem) {
        updateMutation.mutate(
          { code: editingItem.code, data: values },
          {
            onSuccess: () => {
              messageApi.success('Updated');
              setModalOpen(false);
              form.resetFields();
              setEditingItem(null);
            },
            onError: () => messageApi.error('Update failed')
          }
        );
      } else {
        createMutation.mutate(values, {
          onSuccess: () => {
            messageApi.success('Created');
            setModalOpen(false);
            form.resetFields();
          },
          onError: () => messageApi.error('Create failed')
        });
      }
    } catch {
      // form validation failed
    }
  }, [editingItem, form, createMutation, updateMutation, messageApi]);

  const referenceDataTab = (
    <>
      <Tabs
        activeKey={activeCategory}
        onChange={key => {
          setActiveCategory(key);
          setShowDeleted(false);
        }}
        items={CATEGORIES.map(cat => ({
          key: cat.key,
          label: cat.label
        }))}
      />

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          {isSuperuser && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingItem(null);
                form.resetFields();
                setModalOpen(true);
              }}
            >
              Add Item
            </Button>
          )}
          <Switch
            checkedChildren="Show Deleted"
            unCheckedChildren="Hide Deleted"
            checked={showDeleted}
            onChange={setShowDeleted}
          />
        </Space>
      </div>

      <Table<Api.ReferenceData.ReferenceDataItem>
        columns={columns}
        dataSource={items}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 20, showSizeChanger: true }}
        scroll={{ x: 'max-content', y: 'calc(100vh - 400px)' }}
        size="small"
      />

      <Modal
        title={editingItem ? 'Edit Reference Data' : 'Add Reference Data'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
          setEditingItem(null);
        }}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Code" rules={[{ required: true, max: 64 }]}>
            <Input disabled={!!editingItem} placeholder="e.g., ITT, DM, ADSL" />
          </Form.Item>
          <Form.Item name="label" label="Label" rules={[{ required: true, max: 256 }]}>
            <Input placeholder="e.g., Intent-to-Treat" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="sort_order" label="Sort Order" initialValue={0}>
            <InputNumber min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );

  return (
    <Card>
      {contextHolder}
      <Tabs
        activeKey={mainTab}
        onChange={setMainTab}
        items={[
          {
            key: 'reference-data',
            label: 'Reference Data',
            children: referenceDataTab
          },
          {
            key: 'cdisc-library',
            label: 'CDISC Library',
            children: isSuperuser ? (
              <CdiscLibraryTab />
            ) : (
              <Result status="403" title="403" subTitle="You do not have permission to access CDISC Library settings." />
            )
          }
        ]}
      />
    </Card>
  );
};

export default ReferenceDataPage;
