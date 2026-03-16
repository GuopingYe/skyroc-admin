import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Table,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tabs,
  Typography,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  FolderOutlined,
  TableOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { useStudyStore } from '../stores/studyStore'
import { useTableStore } from '../stores/tableStore'
import type { Study } from '../types'

const { Text } = Typography

const phaseColors: Record<string, string> = {
  'Phase I': 'cyan',
  'Phase II': 'green',
  'Phase III': 'blue',
  'Phase IV': 'purple',
}

export default function StudyList() {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStudy, setEditingStudy] = useState<Study | null>(null)
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState('studies')

  const { studies, addStudy, updateStudy, deleteStudy } = useStudyStore()
  const { tables } = useTableStore()

  const handleCreateStudy = () => {
    form.validateFields().then((values) => {
      const newStudy: Study = {
        id: `s_${Date.now()}`,
        ...values,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
      }
      addStudy(newStudy)
      message.success('Study created successfully')
      setIsModalOpen(false)
      form.resetFields()
    })
  }

  const handleUpdateStudy = () => {
    if (!editingStudy) return
    
    form.validateFields().then((values) => {
      updateStudy(editingStudy.id, values)
      message.success('Study updated successfully')
      setEditingStudy(null)
      form.resetFields()
    })
  }

  const handleDeleteStudy = (id: string) => {
    deleteStudy(id)
    message.success('Study deleted')
  }

  const studyColumns = [
    {
      title: 'Study ID',
      dataIndex: 'studyId',
      key: 'studyId',
      width: 120,
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Compound',
      dataIndex: 'compound',
      key: 'compound',
      width: 100,
    },
    {
      title: 'Phase',
      dataIndex: 'phase',
      key: 'phase',
      width: 100,
      render: (text: string) => <Tag color={phaseColors[text] || 'default'}>{text}</Tag>,
    },
    {
      title: 'Disease Area',
      dataIndex: 'diseaseArea',
      key: 'diseaseArea',
      width: 120,
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 100,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: Study) => (
        <Space>
          <Button type="link" size="small" onClick={() => navigate(`/studies/${record.id}`)}>
            Open
          </Button>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingStudy(record)
              form.setFieldsValue(record)
            }}
          />
          <Popconfirm
            title="Delete this study?"
            onConfirm={() => handleDeleteStudy(record.id)}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const tableColumns = [
    {
      title: 'Shell Number',
      dataIndex: 'shellNumber',
      key: 'shellNumber',
      width: 120,
      render: (text: string) => <Tag>{text}</Tag>,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (text: string) => text?.replace('_', ' '),
    },
    {
      title: 'Population',
      dataIndex: 'population',
      key: 'population',
      width: 100,
    },
    {
      title: 'Dataset',
      dataIndex: 'dataset',
      key: 'dataset',
      width: 80,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: { id: string }) => (
        <Button type="link" onClick={() => navigate(`/tables/${record.id}`)}>
          Edit
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'studies',
            label: (
              <span>
                <FolderOutlined style={{ marginRight: 8 }} />
                Studies ({studies.length})
              </span>
            ),
            children: (
              <Card>
                <div style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsModalOpen(true)}
                  >
                    New Study
                  </Button>
                </div>
                
                <Table
                  dataSource={studies}
                  columns={studyColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: 'tables',
            label: (
              <span>
                <TableOutlined style={{ marginRight: 8 }} />
                Tables ({tables.length})
              </span>
            ),
            children: (
              <Card>
                <Table
                  dataSource={tables}
                  columns={tableColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: 'figures',
            label: (
              <span>
                <BarChartOutlined style={{ marginRight: 8 }} />
                Figures (0)
              </span>
            ),
            children: (
              <Card>
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Text type="secondary">No figures yet. Coming in Phase 3.</Text>
                </div>
              </Card>
            ),
          },
          {
            key: 'listings',
            label: (
              <span>
                <UnorderedListOutlined style={{ marginRight: 8 }} />
                Listings (0)
              </span>
            ),
            children: (
              <Card>
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Text type="secondary">No listings yet. Coming in Phase 4.</Text>
                </div>
              </Card>
            ),
          },
        ]}
      />

      {/* Create Study Modal */}
      <Modal
        title="Create New Study"
        open={isModalOpen}
        onOk={handleCreateStudy}
        onCancel={() => {
          setIsModalOpen(false)
          form.resetFields()
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="studyId"
            label="Study ID"
            rules={[{ required: true, message: 'Please enter Study ID' }]}
          >
            <Input placeholder="e.g., STUDY-001" />
          </Form.Item>
          <Form.Item
            name="title"
            label="Study Title"
            rules={[{ required: true, message: 'Please enter study title' }]}
          >
            <Input placeholder="e.g., Phase III Clinical Trial for Drug X" />
          </Form.Item>
          <Form.Item name="compound" label="Compound">
            <Input placeholder="e.g., Drug X" />
          </Form.Item>
          <Form.Item name="phase" label="Phase">
            <Select placeholder="Select phase">
              <Select.Option value="Phase I">Phase I</Select.Option>
              <Select.Option value="Phase II">Phase II</Select.Option>
              <Select.Option value="Phase III">Phase III</Select.Option>
              <Select.Option value="Phase IV">Phase IV</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="diseaseArea" label="Disease Area">
            <Select placeholder="Select disease area">
              <Select.Option value="Oncology">Oncology</Select.Option>
              <Select.Option value="Neurology">Neurology</Select.Option>
              <Select.Option value="Cardiology">Cardiology</Select.Option>
              <Select.Option value="Immunology">Immunology</Select.Option>
              <Select.Option value="Respiratory">Respiratory</Select.Option>
              <Select.Option value="Gastroenterology">Gastroenterology</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="therapeuticArea" label="Therapeutic Area">
            <Input placeholder="e.g., Solid Tumors" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Study Modal */}
      <Modal
        title="Edit Study"
        open={!!editingStudy}
        onOk={handleUpdateStudy}
        onCancel={() => {
          setEditingStudy(null)
          form.resetFields()
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="studyId"
            label="Study ID"
            rules={[{ required: true, message: 'Please enter Study ID' }]}
          >
            <Input placeholder="e.g., STUDY-001" />
          </Form.Item>
          <Form.Item
            name="title"
            label="Study Title"
            rules={[{ required: true, message: 'Please enter study title' }]}
          >
            <Input placeholder="e.g., Phase III Clinical Trial for Drug X" />
          </Form.Item>
          <Form.Item name="compound" label="Compound">
            <Input placeholder="e.g., Drug X" />
          </Form.Item>
          <Form.Item name="phase" label="Phase">
            <Select placeholder="Select phase">
              <Select.Option value="Phase I">Phase I</Select.Option>
              <Select.Option value="Phase II">Phase II</Select.Option>
              <Select.Option value="Phase III">Phase III</Select.Option>
              <Select.Option value="Phase IV">Phase IV</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="diseaseArea" label="Disease Area">
            <Select placeholder="Select disease area">
              <Select.Option value="Oncology">Oncology</Select.Option>
              <Select.Option value="Neurology">Neurology</Select.Option>
              <Select.Option value="Cardiology">Cardiology</Select.Option>
              <Select.Option value="Immunology">Immunology</Select.Option>
              <Select.Option value="Respiratory">Respiratory</Select.Option>
              <Select.Option value="Gastroenterology">Gastroenterology</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="therapeuticArea" label="Therapeutic Area">
            <Input placeholder="e.g., Solid Tumors" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}