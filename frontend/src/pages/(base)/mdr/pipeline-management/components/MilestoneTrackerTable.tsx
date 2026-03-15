/** MilestoneTrackerTable - 项目里程碑跟踪表格 */
import { Button, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { createMilestone, deleteMilestone, updateMilestone } from '../milestoneData';
import type { IProjectMilestone, MilestoneStatus, PresetMilestoneType } from '../types';
import {
  milestoneStatusConfig,
  presetMilestoneConfig,
  presetMilestoneOptions
} from '../types';

interface MilestoneTrackerTableProps {
  analysisId?: string;
  canEdit: boolean;
  milestones: IProjectMilestone[];
  onRefresh: () => void;
  studyId: string;
}

const MilestoneTrackerTable: React.FC<MilestoneTrackerTableProps> = ({
  analysisId,
  canEdit,
  milestones,
  onRefresh,
  studyId
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<IProjectMilestone | null>(null);
  const [loading, setLoading] = useState(false);

  // 打开创建 Modal
  const handleCreate = useCallback(() => {
    setEditingMilestone(null);
    form.resetFields();
    form.setFieldsValue({
      level: analysisId ? 'Analysis' : 'Study',
      presetType: 'CUSTOM'
    });
    setModalOpen(true);
  }, [form, analysisId]);

  // 打开编辑 Modal
  const handleEdit = useCallback(
    (record: IProjectMilestone) => {
      setEditingMilestone(record);
      form.setFieldsValue({
        ...record,
        actualDate: record.actualDate ? dayjs(record.actualDate) : null,
      plannedDate: record.plannedDate ? dayjs(record.plannedDate) : null
      });
      setModalOpen(true);
    },
    [form]
  );

  // 提交表单
  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const milestoneData = {
        actualDate: values.actualDate?.format('YYYY-MM-DD') || null,
        analysisId: values.level === 'Analysis' ? analysisId : undefined,
        assignee: values.assignee,
        comment: values.comment,
        level: values.level as 'Study' | 'Analysis',
        name: values.name || presetMilestoneConfig[values.presetType as PresetMilestoneType].label,
        plannedDate: values.plannedDate?.format('YYYY-MM-DD') || null,
        presetType: values.presetType as PresetMilestoneType,
        status: values.status as MilestoneStatus,
        studyId
      };

      if (editingMilestone) {
        updateMilestone(editingMilestone.id, milestoneData);
      } else {
        createMilestone(milestoneData as Omit<IProjectMilestone, 'createdAt' | 'id' | 'updatedAt'>);
      }

      setModalOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Form validation failed:', error);
    } finally {
      setLoading(false);
    }
  }, [form, editingMilestone, studyId, analysisId, onRefresh]);

  // 删除里程碑
  const handleDelete = useCallback(
    (id: string) => {
      deleteMilestone(id);
      onRefresh();
    },
    [onRefresh]
  );

  // 表格列定义
  const columns: ColumnsType<IProjectMilestone> = useMemo(
    () => [
      {
        dataIndex: 'name',
      key: 'name',
      render: (text: string, record) => (
        <Space>
          <div className={`${record.level === 'Study' ? 'i-mdi-folder-outline text-orange-500' : 'i-mdi-chart-timeline-variant text-purple-500'}`} />
          <span>{text}</span>
        </Space>
      ),
      title: t('page.mdr.pipelineManagement.milestone.cols.name'),
      width: 200
      },
      {
        title: t('page.mdr.pipelineManagement.milestone.cols.level'),
        dataIndex: 'level',
        key: 'level',
        width: 80,
        render: (level: string) => <Tag color={level === 'Study' ? 'orange' : 'purple'}>{level}</Tag>
      },
      {
        dataIndex: 'plannedDate',
      key: 'plannedDate',
      render: (date: string) => date || '-',
      title: t('page.mdr.pipelineManagement.milestone.cols.plannedDate'),
      width: 110
      },
      {
        title: t('page.mdr.pipelineManagement.milestone.cols.actualDate'),
        dataIndex: 'actualDate',
        key: 'actualDate',
        width: 110,
        render: (date: string) => date || '-'
      },
      {
        dataIndex: 'status',
      key: 'status',
      render: (status: MilestoneStatus) => (
        <Tag color={milestoneStatusConfig[status].color}>
          {t(`page.mdr.pipelineManagement.milestone.status.${status}`)}
        </Tag>
      ),
      title: t('page.mdr.pipelineManagement.milestone.cols.status'),
      width: 100
      },
      {
        dataIndex: 'assignee',
      ellipsis: true,
      key: 'assignee',
      render: (text: string) => text || '-',
      title: t('page.mdr.pipelineManagement.milestone.cols.assignee'),
      width: 120
      },
      {
        dataIndex: 'comment',
        ellipsis: true,
        key: 'comment',
        render: (text: string) => text ? (
          <Tooltip title={text}>
            <span className="text-gray-500">{text}</span>
          </Tooltip>
        ) : '-',
        title: t('page.mdr.pipelineManagement.milestone.cols.comment')
      },
      {
        fixed: 'right',
      key: 'action',
      render: (_: unknown, record: IProjectMilestone) => (
        <Space size={4}>
          <Button
            size="small"
            type="link"
            disabled={!canEdit}
            onClick={() => handleEdit(record)}
          >
            {t('page.mdr.pipelineManagement.milestone.edit')}
          </Button>
          <Popconfirm
            title={t('page.mdr.pipelineManagement.milestone.deleteConfirm')}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              danger
              size="small"
              type="link"
              disabled={!canEdit}
            >
              {t('page.mdr.pipelineManagement.milestone.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
      title: t('page.mdr.pipelineManagement.milestone.cols.action'),
      width: 100
      }
    ],
    [t, canEdit, handleEdit, handleDelete]
  );

  return (
    <div className="flex flex-col gap-12px">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="text-14px text-gray-500">
          {t('page.mdr.pipelineManagement.milestone.totalCount', { count: milestones.length })}
        </div>
        <Button
          disabled={!canEdit}
          icon={<div className="i-mdi-plus" />}
          type="primary"
          onClick={handleCreate}
        >
          {t('page.mdr.pipelineManagement.milestone.add')}
        </Button>
      </div>

      {/* 表格 */}
      <Table
        columns={columns}
        dataSource={milestones}
        pagination={false}
        rowKey="id"
        scroll={{ x: 1000 }}
        size="small"
      />

      {/* 编辑 Modal */}
      <Modal
        confirmLoading={loading}
        open={modalOpen}
        title={editingMilestone
          ? t('page.mdr.pipelineManagement.milestone.editModal.title')
          : t('page.mdr.pipelineManagement.milestone.createModal.title')
        }
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label={t('page.mdr.pipelineManagement.milestone.cols.presetType')}
            name="presetType"
            rules={[{ required: true }]}
          >
            <Select
              options={presetMilestoneOptions.map(opt => ({
                label: opt.label,
                value: opt.value
              }))}
              onChange={(value: PresetMilestoneType) => {
                const config = presetMilestoneConfig[value];
                form.setFieldsValue({
                  level: config.level,
                  name: config.label
                });
              }}
            />
          </Form.Item>

          <Form.Item
            label={t('page.mdr.pipelineManagement.milestone.cols.name')}
            name="name"
          >
            <Input />
          </Form.Item>

          <Form.Item
            label={t('page.mdr.pipelineManagement.milestone.cols.level')}
            name="level"
          >
            <Select
              disabled
              options={[
                { label: 'Study', value: 'Study' },
                { label: 'Analysis', value: 'Analysis' }
              ]}
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-16px">
            <Form.Item
              label={t('page.mdr.pipelineManagement.milestone.cols.plannedDate')}
              name="plannedDate"
            >
              <DatePicker className="w-full" />
            </Form.Item>

            <Form.Item
              label={t('page.mdr.pipelineManagement.milestone.cols.actualDate')}
              name="actualDate"
            >
              <DatePicker className="w-full" />
            </Form.Item>
          </div>

          <Form.Item
            label={t('page.mdr.pipelineManagement.milestone.cols.status')}
            name="status"
            rules={[{ required: true }]}
          >
            <Select>
              {Object.entries(milestoneStatusConfig).map(([key, config]) => (
                <Select.Option
                  key={key}
                  value={key}
                >
                  <Tag
                    color={config.color}
                    className="mr-0"
                  >
                    {t(`page.mdr.pipelineManagement.milestone.status.${key}`)}
                  </Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={t('page.mdr.pipelineManagement.milestone.cols.assignee')}
            name="assignee"
          >
            <Input />
          </Form.Item>

          <Form.Item
            label={t('page.mdr.pipelineManagement.milestone.cols.comment')}
            name="comment"
          >
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MilestoneTrackerTable;
