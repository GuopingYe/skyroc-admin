/**
 * Pipeline Management - 研发管线与项目空间管理
 *
 * 四重标签页架构：
 *
 * - Tab 1: Portfolio Admin (管线与层级管理)
 * - Tab 2: Study Configuration (研究配置)
 * - Tab 3: Project Timelines (项目计划与里程碑)
 * - Tab 4: Execution Jobs (跑批执行日志)
 */
import {
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FundOutlined,
  LockOutlined,
  MinusSquareOutlined,
  PlusOutlined,
  PlusSquareOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined
} from '@ant-design/icons';
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Result,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Tree,
  Typography,
  message
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useClinicalContext } from '@/features/clinical-context';
import {
  archivePipelineNode,
  createPipelineMilestone,
  createPipelineNode,
  deletePipelineMilestone,
  getAvailableVersions,
  getPipelineExecutionJobs,
  getPipelineMilestones,
  getPipelineTree,
  updatePipelineMilestone,
  updatePipelineStudyConfig
} from '@/service/api/mdr';

import { ExecutionJobsTable, MilestoneTimeline, MilestoneTrackerTable } from './components';
import { getMilestoneStats } from './milestoneData';
import {
  type AnalysisNode,
  type NodeLifecycleStatus,
  type NodeType,
  type PipelineNode,
  type StudyNode,
  findNodeById,
  getAllowedChildType,
  getChildNodes,
  lifecycleConfig,
  nodeTypeConfig,
  statusConfig,
  studyPhases
} from './mockData';
import type { IProjectMilestone } from './types';

const { Text } = Typography;

// ⚠️ 开发模式：临时绕过 RBAC 权限检查
// TODO: 生产环境需要恢复基于角色的权限控制
const BYPASS_RBAC = true;

const PipelineManagement: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // 🔓 开发模式：绕过权限检查
  const canManage = Boolean(BYPASS_RBAC);

  // 从全局 Store 获取上下文状态
  const {
    analysisId,
    context,
    isAnalysisReady,
    isStudyReady,
    productId,
    selectAnalysis,
    selectProduct,
    selectStudy,
    studyId
  } = useClinicalContext();

  // 本地状态
  const [treeData, setTreeData] = useState<PipelineNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [treeSearchQuery, setTreeSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<PipelineNode | null>(null);
  const [activeTab, setActiveTab] = useState<string>('portfolio');
  const [isEditing, setIsEditing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createNodeType, setCreateNodeType] = useState<NodeType | null>(null);
  const [createForm] = Form.useForm();
  const [milestones, setMilestones] = useState<IProjectMilestone[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [executionJobs, setExecutionJobs] = useState<any[]>([]);
  const [executionJobsLoading, setExecutionJobsLoading] = useState(false);

  // Fetch pipeline tree from API
  const fetchTree = useCallback(async () => {
    setTreeLoading(true);
    setTreeError(null);
    try {
      const data = await getPipelineTree();
      if (data) {
        setTreeData(data as PipelineNode[]);
      }
    } catch (err) {
      console.error('Failed to load pipeline tree:', err);
      setTreeError('Failed to load pipeline tree');
    } finally {
      setTreeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // 当全局 context 变化时，自动选中对应的树节点
  useEffect(() => {
    if (studyId) {
      const node = findNodeById(treeData, studyId);
      if (node) {
        setSelectedNodeId(studyId);
        setSelectedNode(node);
        if (node) form.setFieldsValue(node);
      }
    }
  }, [studyId, treeData, form]);

  // Fetch milestones from API when study/analysis changes
  const fetchMilestones = useCallback(async () => {
    if (!studyId) {
      setMilestones([]);
      return;
    }
    setMilestonesLoading(true);
    try {
      const data = await getPipelineMilestones(studyId, analysisId || undefined);
      if (data) {
        // Map snake_case from API to camelCase for frontend types
        const mapped = (data as any[]).map((m: any) => ({
          actualDate: m.actual_date,
          analysisId: m.analysis_id,
          assignee: m.assignee,
          comment: m.comment,
          createdAt: m.created_at,
          id: m.id,
          level: m.level,
          name: m.name,
          plannedDate: m.planned_date,
          presetType: m.preset_type,
          status: m.status,
          studyId: m.study_id,
          updatedAt: m.updated_at
        }));
        setMilestones(mapped);
      }
    } catch (err) {
      console.error('Failed to load milestones:', err);
    } finally {
      setMilestonesLoading(false);
    }
  }, [studyId, analysisId]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  // 里程碑统计
  const milestoneStats = useMemo(() => getMilestoneStats(milestones), [milestones]);

  // Fetch execution jobs from API when analysis changes
  const fetchExecutionJobs = useCallback(async () => {
    if (!analysisId) {
      setExecutionJobs([]);
      return;
    }
    setExecutionJobsLoading(true);
    try {
      const data = await getPipelineExecutionJobs(analysisId);
      if (data) {
        setExecutionJobs(data as any[]);
      }
    } catch (err) {
      console.error('Failed to load execution jobs:', err);
    } finally {
      setExecutionJobsLoading(false);
    }
  }, [analysisId]);

  useEffect(() => {
    fetchExecutionJobs();
  }, [fetchExecutionJobs]);

  // 树节点转换
  const treeDataNodes = useMemo(() => convertToTreeData(treeData), [treeData]);

  const handleSelect = useCallback(
    (selectedKeys: React.Key[]) => {
      if (selectedKeys.length > 0) {
        const nodeId = selectedKeys[0] as string;
        const node = findNodeById(treeData, nodeId);
        setSelectedNodeId(nodeId);
        setSelectedNode(node);
        setIsEditing(false);
        if (node) form.setFieldsValue(node);

        // 同步更新全局上下文（带名称对象）
        if (node) {
          if (node.nodeType === 'STUDY') {
            // 找到父节点 (Compound/Product)
            const parent = findParentNode(treeData, nodeId);
            if (parent) {
              selectProduct(parent.id, { id: parent.id, name: parent.title });
            }
            selectStudy(nodeId, {
              id: node.id,
              name: node.title,
              phase: (node as StudyNode).phase || '',
              status: node.status
            });
          } else if (node.nodeType === 'ANALYSIS') {
            // 找到父 Study 节点
            const parentStudy = findParentNode(treeData, nodeId);
            if (parentStudy) {
              selectStudy(parentStudy.id, {
                id: parentStudy.id,
                name: parentStudy.title,
                phase: (parentStudy as StudyNode).phase || '',
                status: parentStudy.status
              });
              // 找到祖父 Product 节点
              const grandParent = findParentNode(treeData, parentStudy.id);
              if (grandParent) {
                selectProduct(grandParent.id, { id: grandParent.id, name: grandParent.title });
              }
            }
            selectAnalysis(nodeId, {
              id: node.id,
              name: node.title,
              status: (node.lifecycleStatus as 'Active' | 'Archived' | 'Completed' | 'Planned') || 'Active'
            });
          }
        }
      }
    },
    [treeData, form, selectProduct, selectStudy, selectAnalysis]
  );

  const handleArchive = useCallback(
    async (nodeId: string) => {
      const node = findNodeById(treeData, nodeId);
      const newStatus = node?.status === 'Active' ? 'Archived' : 'Active';
      try {
        await archivePipelineNode(nodeId, newStatus as 'Active' | 'Archived');
        // Refresh tree from API to get consistent state
        await fetchTree();
        messageApi.success(t('page.mdr.pipelineManagement.archiveSuccess'));
      } catch (err) {
        messageApi.error('Failed to archive node');
      }
    },
    [treeData, messageApi, t, fetchTree]
  );

  const handleOpenCreate = useCallback(
    (childType: NodeType) => {
      setCreateModalVisible(true);
      setCreateNodeType(childType);
      createForm.resetFields();
    },
    [createForm]
  );

  const handleCreateNode = useCallback(async () => {
    try {
      const values = await createForm.validateFields();
      const newTitle = values.title?.trim();

      // 检查同级节点是否有重名
      const siblingNodes = selectedNodeId
        ? getChildNodes(treeData, selectedNodeId)
        : treeData; // 如果没有选中节点，检查根级别

      const duplicateNode = siblingNodes.find(
        node => node.title.toLowerCase() === newTitle.toLowerCase() && node.status !== 'Archived'
      );

      if (duplicateNode) {
        messageApi.error(
          t('page.mdr.pipelineManagement.createModal.duplicateNameError', {
            name: newTitle,
            defaultValue: `A node with name "${newTitle}" already exists at this level. Please use a different name.`
          })
        );
        return;
      }

      await createPipelineNode({
        title: newTitle,
        node_type: createNodeType!,
        parent_id: selectedNodeId || undefined,
        phase: values.phase,
        protocol_title: values.protocolTitle,
        description: values.description
      });
      // Refresh tree from API
      await fetchTree();
      messageApi.success(t('page.mdr.pipelineManagement.createSuccess'));
      setCreateModalVisible(false);
    } catch (err: any) {
      console.error('Create node failed:', err);
      const errorMsg = err?.response?.data?.detail || err?.message || 'Failed to create node';
      messageApi.error(errorMsg);
    }
  }, [createForm, createNodeType, selectedNodeId, messageApi, t, fetchTree, treeData]);

  // 子节点表格列
  const childColumns: ColumnsType<PipelineNode> = useMemo(
    () => [
      {
        dataIndex: 'title',
        key: 'title',
        render: (text: string, record: PipelineNode) => (
          <Space>
            {getNodeIcon(record.nodeType)}
            <span className={record.status === 'Archived' ? 'line-through text-gray-400' : ''}>{text}</span>
          </Space>
        ),
        title: t('page.mdr.pipelineManagement.cols.title')
      },
      {
        dataIndex: 'nodeType',
        key: 'nodeType',
        render: (type: NodeType) => <Tag color={nodeTypeConfig[type].color}>{nodeTypeConfig[type].label}</Tag>,
        title: t('page.mdr.pipelineManagement.cols.nodeType'),
        width: 120
      },
      {
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => <Tag color={statusConfig[status as keyof typeof statusConfig].color}>{status}</Tag>,
        title: t('page.mdr.pipelineManagement.cols.status'),
        width: 100
      },
      { dataIndex: 'createdAt', key: 'createdAt', title: t('page.mdr.pipelineManagement.cols.createdAt'), width: 120 },
      {
        key: 'action',
        render: (_: unknown, record: PipelineNode) => (
          <Space size={4}>
            <Button
              size="small"
              type="link"
              onClick={() => {
                setSelectedNodeId(record.id);
                setSelectedNode(record);
                form.setFieldsValue(record);
              }}
            >
              {t('page.mdr.pipelineManagement.view')}
            </Button>
            {canManage && (
              <Popconfirm
                title={t('page.mdr.pipelineManagement.archiveConfirm')}
                onConfirm={() => handleArchive(record.id)}
              >
                <Button
                  danger
                  size="small"
                  type="link"
                >
                  {t('page.mdr.pipelineManagement.archive')}
                </Button>
              </Popconfirm>
            )}
          </Space>
        ),
        title: t('page.mdr.pipelineManagement.cols.action'),
        width: 120
      }
    ],
    [t, handleArchive, form, canManage]
  );

  const childNodes = useMemo(
    () => (selectedNodeId ? getChildNodes(treeData, selectedNodeId) : []),
    [treeData, selectedNodeId]
  );

  const allowedChildType = selectedNode ? getAllowedChildType(selectedNode.nodeType) : null;

  // Tab items - 每个 Tab 的上下文依赖不同
  // Tab 1: 无依赖，直接展示全量数据
  // Tab 2: 仅依赖 Study 级别 (isStudyReady)
  // Tab 3: 向下兼容，有 Study 即可展示，有 Analysis 则追加数据
  // Tab 4: 强依赖 Analysis 级别 (isAnalysisReady)
  const tabItems = useMemo(
    () => [
      {
        children: (
          <PortfolioAdminTab
            allowedChildType={allowedChildType}
            canManage={canManage}
            childColumns={childColumns}
            childNodes={childNodes}
            form={form}
            isEditing={isEditing}
            messageApi={messageApi}
            navigate={navigate}
            selectedNode={selectedNode}
            selectedNodeId={selectedNodeId}
            setIsEditing={setIsEditing}
            treeData={treeData}
            treeDataNodes={treeDataNodes}
            treeError={treeError}
            treeLoading={treeLoading}
            treeSearchQuery={treeSearchQuery}
            onArchive={handleArchive}
            onOpenCreate={handleOpenCreate}
            onRetryLoadTree={fetchTree}
            onSelect={handleSelect}
            onTreeSearchChange={setTreeSearchQuery}
          />
        ),
        key: 'portfolio',
        label: (
          <span className="flex items-center gap-4px">
            <ApartmentOutlined />
            {t('page.mdr.pipelineManagement.tabs.portfolio')}
          </span>
        )
      },
      {
        children: (
          <StudyConfigTab
            isEditing={isEditing}
            isStudyReady={isStudyReady}
            messageApi={messageApi}
            selectedNode={selectedNode as StudyNode}
            setIsEditing={setIsEditing}
            studyId={studyId}
          />
        ),
        disabled: !studyId,
        key: 'studyConfig',
        label: (
          <span className="flex items-center gap-4px">
            <SettingOutlined />
            {t('page.mdr.pipelineManagement.tabs.studyConfig')}
          </span>
        )
      },
      {
        children: (
          <ProjectTimelinesTab
            analysisId={analysisId}
            canManage={canManage}
            hasAnalysis={Boolean(analysisId)}
            isStudyReady={isStudyReady}
            milestones={milestones}
            milestonesLoading={milestonesLoading}
            milestoneStats={milestoneStats}
            studyId={studyId}
            onRefresh={fetchMilestones}
          />
        ),
        disabled: !studyId,
        key: 'timelines',
        label: (
          <span className="flex items-center gap-4px">
            <FundOutlined />
            {t('page.mdr.pipelineManagement.tabs.timelines')}
          </span>
        )
      },
      {
        children: (
          <ExecutionJobsTab
            analysisId={analysisId}
            executionJobs={executionJobs}
            executionJobsLoading={executionJobsLoading}
            isAnalysisReady={isAnalysisReady}
          />
        ),
        disabled: !analysisId,
        key: 'jobs',
        label: (
          <span className="flex items-center gap-4px">
            <ExperimentOutlined />
            {t('page.mdr.pipelineManagement.tabs.jobs')}
          </span>
        )
      }
    ],
    [
      t,
      treeData,
      treeDataNodes,
      selectedNodeId,
      selectedNode,
      isEditing,
      canManage,
      childColumns,
      childNodes,
      allowedChildType,
      form,
      handleSelect,
      handleArchive,
      handleOpenCreate,
      navigate,
      messageApi,
      studyId,
      analysisId,
      isStudyReady,
      isAnalysisReady,
      milestones,
      milestoneStats,
      executionJobs,
      fetchMilestones
    ]
  );

  return (
    <div className="h-full flex flex-col gap-12px overflow-hidden">
      {contextHolder}

      {/* 主内容区 - Tabs */}
      <Card
        className="flex-1 overflow-hidden card-wrapper"
        size="small"
        variant="borderless"
      >
        <Tabs
          activeKey={activeTab}
          className="h-full overflow-hidden"
          items={tabItems}
          size="small"
          onChange={setActiveTab}
        />
      </Card>

      {/* 创建节点 Modal */}
      <Modal
        open={createModalVisible}
        title={t('page.mdr.pipelineManagement.createModal.title', {
          type: createNodeType ? nodeTypeConfig[createNodeType].label : ''
        })}
        onCancel={() => setCreateModalVisible(false)}
        onOk={handleCreateNode}
      >
        <Form
          form={createForm}
          layout="vertical"
        >
          <Form.Item
            label={t('page.mdr.pipelineManagement.cols.title')}
            name="title"
            rules={[{ required: true }]}
          >
            <Input placeholder={t('page.mdr.pipelineManagement.createModal.titlePlaceholder')} />
          </Form.Item>
          {createNodeType === 'STUDY' && (
            <>
              <Form.Item
                label={t('page.mdr.pipelineManagement.studyConfig.protocolTitle')}
                name="protocolTitle"
              >
                <Input />
              </Form.Item>
              <Form.Item
                label={t('page.mdr.pipelineManagement.studyConfig.phase')}
                name="phase"
              >
                <Select options={studyPhases} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

// ==================== 子组件 ====================

/** Portfolio Admin Tab */
interface PortfolioAdminTabProps {
  allowedChildType: NodeType | null;
  canManage: boolean;
  childColumns: ColumnsType<PipelineNode>;
  childNodes: PipelineNode[];
  form: ReturnType<typeof Form.useForm>[0];
  isEditing: boolean;
  messageApi: ReturnType<typeof message.useMessage>[0];
  navigate: ReturnType<typeof useNavigate>;
  onArchive: (id: string) => void;
  onOpenCreate: (type: NodeType) => void;
  onRetryLoadTree: () => void;
  onSelect: (keys: React.Key[]) => void;
  onTreeSearchChange: (query: string) => void;
  selectedNode: PipelineNode | null;
  selectedNodeId: string | null;
  setIsEditing: (v: boolean) => void;
  treeData: PipelineNode[];
  treeDataNodes: DataNode[];
  treeError: string | null;
  treeLoading: boolean;
  treeSearchQuery: string;
}

const PortfolioAdminTab: React.FC<PortfolioAdminTabProps> = ({
  allowedChildType,
  canManage,
  childColumns,
  childNodes,
  form,
  isEditing,
  messageApi,
  navigate,
  onArchive,
  onOpenCreate,
  onSelect,
  selectedNode,
  selectedNodeId,
  setIsEditing,
  treeDataNodes,
  treeLoading,
  treeError,
  treeSearchQuery,
  onTreeSearchChange,
  onRetryLoadTree
}) => {
  const { t } = useTranslation();
  // 收集所有可展开节点的 key（仅包含有子节点的节点）
  const getExpandableNodeKeys = useCallback((nodes: DataNode[]): React.Key[] => {
    const keys: React.Key[] = [];
    const traverse = (nodeList: DataNode[]) => {
      nodeList.forEach(node => {
        // 只有有子节点的节点才能被展开
        if (node.children && node.children.length > 0) {
          keys.push(node.key);
          traverse(node.children);
        }
      });
    };
    traverse(nodes);
    return keys;
  }, []);

  // 树节点展开状态
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const expandableNodeKeys = useMemo(() => getExpandableNodeKeys(treeDataNodes), [treeDataNodes, getExpandableNodeKeys]);

  // 动态计算 allExpanded 状态（基于可展开节点）
  const allExpanded = useMemo(() => {
    if (expandableNodeKeys.length === 0) return false;
    return expandableNodeKeys.every(key => expandedKeys.includes(key));
  }, [expandedKeys, expandableNodeKeys]);

  // 标记是否已完成初始化展开（用于区分初始化和用户主动收缩）
  const [hasInitializedExpand, setHasInitializedExpand] = useState(false);

  // 当树数据变化时，初始化展开状态（仅首次加载时执行）
  useEffect(() => {
    if (treeDataNodes.length > 0 && !hasInitializedExpand) {
      const allKeys = getExpandableNodeKeys(treeDataNodes);
      setExpandedKeys(allKeys);
      setHasInitializedExpand(true);
    }
  }, [treeDataNodes, getExpandableNodeKeys, hasInitializedExpand]);

  // 当树数据完全重新加载时，重置初始化标志
  useEffect(() => {
    if (treeDataNodes.length === 0) {
      setHasInitializedExpand(false);
    }
  }, [treeDataNodes.length]);

  // 一键展开
  const handleExpandAll = useCallback(() => {
    setExpandedKeys(expandableNodeKeys);
  }, [expandableNodeKeys]);

  // 一键收缩
  const handleCollapseAll = useCallback(() => {
    setExpandedKeys([]);
  }, []);

  // 切换展开/收缩
  const handleToggleExpand = useCallback(() => {
    if (allExpanded) {
      handleCollapseAll();
    } else {
      handleExpandAll();
    }
  }, [allExpanded, handleExpandAll, handleCollapseAll]);



  // Filter tree nodes by search query
  const filteredTreeNodes = useMemo(() => {
    if (!treeSearchQuery) return treeDataNodes;
    const query = treeSearchQuery.toLowerCase();
    const filterNodes = (nodes: DataNode[]): DataNode[] => {
      return nodes
        .map(node => {
          const titleStr = typeof node.title === 'string' ? node.title : '';
          const childMatches = node.children ? filterNodes(node.children) : [];
          // Check if the node key contains the query (study code, TA name, etc)
          const keyMatch = String(node.key).toLowerCase().includes(query);
          if (childMatches.length > 0 || keyMatch) {
            return { ...node, children: childMatches.length > 0 ? childMatches : node.children };
          }
          return null;
        })
        .filter(Boolean) as DataNode[];
    };
    return filterNodes(treeDataNodes);
  }, [treeDataNodes, treeSearchQuery]);

  if (treeError) {
    return (
      <div className="h-full flex-center">
        <Result
          status="error"
          title="Failed to Load Pipeline"
          subTitle={treeError}
          extra={<Button type="primary" icon={<ReloadOutlined />} onClick={onRetryLoadTree}>Retry</Button>}
        />
      </div>
    );
  }

  if (!selectedNode) {
    return (
      <div className="h-full flex gap-16px overflow-hidden">
        {/* Left tree still shows even when no node selected */}
        <Card
          className="w-320px flex flex-col flex-shrink-0 overflow-hidden card-wrapper"
          size="small"
          title={
            <Space>
              <ApartmentOutlined className="text-blue-500" />
              <span className="font-medium">{t('page.mdr.pipelineManagement.tree.title')}</span>
            </Space>
          }
        >
          <Input
            allowClear
            className="mb-8px"
            placeholder="Search nodes..."
            prefix={<SearchOutlined className="text-gray-400" />}
            size="small"
            value={treeSearchQuery}
            onChange={e => onTreeSearchChange(e.target.value)}
          />
          {/* 展开/收缩 + 创建按钮 */}
          <div className="mb-12px flex gap-8px">
            <Tooltip title={allExpanded ? t('page.mdr.pipelineManagement.tree.collapseAll') : t('page.mdr.pipelineManagement.tree.expandAll')}>
              <Button
                icon={allExpanded ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
                size="small"
                onClick={handleToggleExpand}
              />
            </Tooltip>
            {canManage && (
              <Button
                className="flex-1"
                icon={<PlusOutlined />}
                type="dashed"
                onClick={() => onOpenCreate('TA')}
              >
                {t('page.mdr.pipelineManagement.createTA')}
              </Button>
            )}
          </div>
          <Spin spinning={treeLoading}>
            <div className="flex-1 overflow-y-auto">
              <Tree
                showIcon
                expandedKeys={expandedKeys}
                onExpand={setExpandedKeys}
                className="bg-transparent"
                selectedKeys={selectedNodeId ? [selectedNodeId] : []}
                treeData={filteredTreeNodes}
                onSelect={onSelect}
              />
            </div>
          </Spin>
        </Card>
        <div className="flex-1 flex-center">
          <Empty description={t('page.mdr.pipelineManagement.selectNodeHint')} />
        </div>
      </div>
    );
  }

  const nodeType = selectedNode.nodeType;
  const isLocked = selectedNode.lifecycleStatus === 'Locked';
  const lifecycleInfo = lifecycleConfig[selectedNode.lifecycleStatus];

  return (
    <div className="h-full flex gap-16px overflow-hidden">
      {/* 左侧树形导航 */}
      <Card
        className="w-320px flex flex-col flex-shrink-0 overflow-hidden card-wrapper"
        size="small"
        title={
          <Space>
            <ApartmentOutlined className="text-blue-500" />
            <span className="font-medium">{t('page.mdr.pipelineManagement.tree.title')}</span>
          </Space>
        }
      >
        <Input
          allowClear
          className="mb-8px"
          placeholder="Search nodes..."
          prefix={<SearchOutlined className="text-gray-400" />}
          size="small"
          value={treeSearchQuery}
          onChange={e => onTreeSearchChange(e.target.value)}
        />
        {/* 展开/收缩 + 创建按钮 */}
        <div className="mb-12px flex gap-8px">
          <Tooltip title={allExpanded ? t('page.mdr.pipelineManagement.tree.collapseAll') : t('page.mdr.pipelineManagement.tree.expandAll')}>
            <Button
              icon={allExpanded ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
              size="small"
              onClick={handleToggleExpand}
            />
          </Tooltip>
          {canManage && (
            <Button
              className="flex-1"
              icon={<PlusOutlined />}
              type="dashed"
              onClick={() => onOpenCreate('TA')}
            >
              {t('page.mdr.pipelineManagement.createTA')}
            </Button>
          )}
        </div>
        <Spin spinning={treeLoading}>
          <div className="flex-1 overflow-y-auto">
            <Tree
              showIcon
              expandedKeys={expandedKeys}
              onExpand={setExpandedKeys}
              className="bg-transparent"
              selectedKeys={selectedNodeId ? [selectedNodeId] : []}
              treeData={filteredTreeNodes}
              onSelect={onSelect}
            />
          </div>
        </Spin>
      </Card>

      {/* 右侧详情区 */}
      <Card
        className="flex-1 overflow-auto card-wrapper"
        size="small"
      >
        {/* Locked 状态警告 */}
        {isLocked && (
          <div className="mb-16px flex items-center gap-8px border border-red-200 rounded-lg bg-red-50 px-12px py-8px">
            <LockOutlined className="text-16px text-red-500" />
            <span className="text-13px text-red-600">{t('page.mdr.pipelineManagement.lockedWarning')}</span>
          </div>
        )}

        {/* 节点详情卡片 */}
        <Card
          className="mb-16px card-wrapper"
          size="small"
          extra={
            <Space>
              <Button
                disabled={isLocked}
                icon={<EditOutlined />}
                size="small"
                type="text"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? t('page.mdr.pipelineManagement.cancelEdit') : t('page.mdr.pipelineManagement.edit')}
              </Button>
              {canManage && (
                <Popconfirm
                  disabled={isLocked}
                  title={t('page.mdr.pipelineManagement.archiveConfirm')}
                  onConfirm={() => onArchive(selectedNode.id)}
                >
                  <Button
                    danger
                    disabled={isLocked}
                    icon={<DeleteOutlined />}
                    size="small"
                    type="text"
                  >
                    {t('page.mdr.pipelineManagement.archive')}
                  </Button>
                </Popconfirm>
              )}
            </Space>
          }
          title={
            <Space>
              {getNodeIcon(nodeType)}
              <span className="font-medium">{selectedNode.title}</span>
              <Tag color={nodeTypeConfig[nodeType].color}>{nodeTypeConfig[nodeType].label}</Tag>
              <Tag color={statusConfig[selectedNode.status].color}>{selectedNode.status}</Tag>
              <Tooltip title={lifecycleInfo.description}>
                <Tag
                  color={lifecycleInfo.color}
                  icon={isLocked ? <LockOutlined /> : undefined}
                >
                  {lifecycleInfo.label}
                </Tag>
              </Tooltip>
            </Space>
          }
        >
          {isEditing ? (
            <Form
              form={form}
              layout="vertical"
            >
              <Form.Item
                label={t('page.mdr.pipelineManagement.cols.title')}
                name="title"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <div className="flex justify-end">
                <Button
                  disabled={isLocked}
                  type="primary"
                  onClick={() => {
                    messageApi.success(t('page.mdr.pipelineManagement.saveSuccess'));
                    setIsEditing(false);
                  }}
                >
                  {t('page.mdr.pipelineManagement.save')}
                </Button>
              </div>
            </Form>
          ) : (
            <Descriptions
              column={2}
              size="small"
            >
              <Descriptions.Item label={t('page.mdr.pipelineManagement.cols.id')}>{selectedNode.id}</Descriptions.Item>
              <Descriptions.Item label={t('page.mdr.pipelineManagement.cols.status')}>
                <Tag color={statusConfig[selectedNode.status].color}>{selectedNode.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('page.mdr.pipelineManagement.lifecycleStatus')}>
                <Tooltip title={lifecycleInfo.description}>
                  <Tag color={lifecycleInfo.color}>{lifecycleInfo.label}</Tag>
                </Tooltip>
              </Descriptions.Item>
              <Descriptions.Item label={t('page.mdr.pipelineManagement.cols.createdAt')}>
                {selectedNode.createdAt}
              </Descriptions.Item>
              <Descriptions.Item label={t('page.mdr.pipelineManagement.cols.updatedAt')}>
                {selectedNode.updatedAt}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Card>

        {/* Study 配置 */}
        {nodeType === 'STUDY' && (
          <StudyConfigCard
            form={form}
            isEditing={isEditing}
            isLocked={isLocked}
            messageApi={messageApi}
            studyNode={selectedNode as StudyNode}
          />
        )}

        {/* Analysis 配置 */}
        {nodeType === 'ANALYSIS' && (
          <Card
            className="mb-16px card-wrapper"
            size="small"
            title={
              <Space>
                <FundOutlined className="text-purple-500" />
                <span className="font-medium">{t('page.mdr.pipelineManagement.analysisConfig.title')}</span>
              </Space>
            }
          >
            <Descriptions
              column={2}
              size="small"
            >
              <Descriptions.Item
                label={t('page.mdr.pipelineManagement.analysisConfig.description')}
                span={2}
              >
                {(selectedNode as AnalysisNode).description || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('page.mdr.pipelineManagement.analysisConfig.lockedAt')}>
                {(selectedNode as AnalysisNode).lockedAt || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('page.mdr.pipelineManagement.analysisConfig.lockedBy')}>
                {(selectedNode as AnalysisNode).lockedBy || '-'}
              </Descriptions.Item>
            </Descriptions>
            <Divider />
            <div className="flex justify-center">
              <Tooltip
                title={
                  selectedNode.status === 'Archived' ? t('page.mdr.pipelineManagement.analysisConfig.archivedHint') : ''
                }
              >
                <Button
                  disabled={selectedNode.status === 'Archived'}
                  size="large"
                  type="primary"
                  onClick={() => {
                    navigate('/mdr/mapping-studio');
                    messageApi.info(t('page.mdr.pipelineManagement.analysisConfig.navigateToMapping'));
                  }}
                >
                  {t('page.mdr.pipelineManagement.analysisConfig.goToMapping')}
                </Button>
              </Tooltip>
            </div>
          </Card>
        )}

        {/* 子节点列表 */}
        {allowedChildType && (
          <Card
            className="card-wrapper"
            size="small"
            extra={
              <Button
                icon={<PlusOutlined />}
                size="small"
                type="primary"
                onClick={() => onOpenCreate(allowedChildType)}
              >
                {t('page.mdr.pipelineManagement.createChild', { type: nodeTypeConfig[allowedChildType].label })}
              </Button>
            }
            title={
              <Space>
                <span className="font-medium">{t('page.mdr.pipelineManagement.children.title')}</span>
                <Tag color="blue">{childNodes.length}</Tag>
              </Space>
            }
          >
            <Table
              columns={childColumns}
              dataSource={childNodes}
              pagination={false}
              rowKey="id"
              scroll={{ y: 300 }}
              size="small"
            />
          </Card>
        )}
      </Card>
    </div>
  );
};

/** Study Config Card */
interface StudyConfigCardProps {
  form: ReturnType<typeof Form.useForm>[0];
  isEditing: boolean;
  isLocked: boolean;
  messageApi: ReturnType<typeof message.useMessage>[0];
  studyNode: StudyNode;
}

const StudyConfigCard: React.FC<StudyConfigCardProps> = ({ form, isEditing, isLocked, messageApi, studyNode }) => {
  const { t } = useTranslation();
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [versionOptions, setVersionOptions] = useState<{
    adamIgVersions: { label: string; value: string }[];
    adamModelVersions: { label: string; value: string }[];
    meddraVersions: { label: string; value: string }[];
    sdtmIgVersions: { label: string; value: string }[];
    sdtmModelVersions: { label: string; value: string }[];
    studyPhases: { label: string; value: string }[];
    whodrugVersions: { label: string; value: string }[];
  } | null>(null);

  useEffect(() => {
    getAvailableVersions().then((res: any) => {
      if (res?.data) {
        setVersionOptions(res.data);
      }
    }).finally(() => {
      setVersionsLoading(false);
    });
  }, []);

  return (
    <Card
      className="mb-16px card-wrapper"
      size="small"
      title={
        <Space>
          <SettingOutlined className="text-blue-500" />
          <span className="font-medium">{t('page.mdr.pipelineManagement.studyConfig.title')}</span>
        </Space>
      }
    >
      <Spin spinning={versionsLoading}>
        <Form
          form={form}
          layout="vertical"
        >
          <div className="grid grid-cols-2 gap-16px">
            <Form.Item
              label={t('page.mdr.pipelineManagement.studyConfig.protocolTitle')}
              name="protocolTitle"
            >
              <Input disabled={!isEditing} />
            </Form.Item>
            <Form.Item
              label={t('page.mdr.pipelineManagement.studyConfig.phase')}
              name="phase"
            >
              <Select
                disabled={!isEditing}
                options={versionOptions?.studyPhases || []}
              />
            </Form.Item>
          </div>
          <Divider className="my-12px">{t('page.mdr.pipelineManagement.studyConfig.cdiscStandards')}</Divider>
          <div className="grid grid-cols-2 gap-16px">
            <Form.Item
              label="SDTM Model"
              name={['config', 'sdtmModelVersion']}
            >
              <Select
                disabled={!isEditing}
                options={versionOptions?.sdtmModelVersions || []}
              />
            </Form.Item>
            <Form.Item
              label="SDTM IG"
              name={['config', 'sdtmIgVersion']}
            >
              <Select
                disabled={!isEditing}
                options={versionOptions?.sdtmIgVersions || []}
              />
            </Form.Item>
            <Form.Item
              label="ADaM Model"
              name={['config', 'adamModelVersion']}
            >
              <Select
                disabled={!isEditing}
                options={versionOptions?.adamModelVersions || []}
              />
            </Form.Item>
            <Form.Item
              label="ADaM IG"
              name={['config', 'adamIgVersion']}
            >
              <Select
                disabled={!isEditing}
                options={versionOptions?.adamIgVersions || []}
              />
            </Form.Item>
          </div>
          <Divider className="my-12px">{t('page.mdr.pipelineManagement.studyConfig.dictionaries')}</Divider>
          <div className="grid grid-cols-2 gap-16px">
            <Form.Item
              label="MedDRA"
              name={['config', 'meddraVersion']}
            >
              <Select
                disabled={!isEditing}
                options={versionOptions?.meddraVersions || []}
              />
            </Form.Item>
            <Form.Item
              label="WHODrug"
              name={['config', 'whodrugVersion']}
            >
              <Select
                disabled={!isEditing}
                options={versionOptions?.whodrugVersions || []}
              />
            </Form.Item>
          </div>
        </Form>
      </Spin>
    </Card>
  );
};

/** Study Configuration Tab - 仅依赖 Study 级别 */
interface StudyConfigTabProps {
  isEditing: boolean;
  isStudyReady: boolean;
  messageApi: ReturnType<typeof message.useMessage>[0];
  selectedNode: StudyNode | null;
  setIsEditing: (v: boolean) => void;
  studyId: string | null;
}

const StudyConfigTab: React.FC<StudyConfigTabProps> = ({
  isEditing,
  isStudyReady,
  messageApi,
  selectedNode,
  setIsEditing,
  studyId
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [versionOptions, setVersionOptions] = useState<{
    adamIgVersions: { label: string; value: string }[];
    adamModelVersions: { label: string; value: string }[];
    meddraVersions: { label: string; value: string }[];
    sdtmIgVersions: { label: string; value: string }[];
    sdtmModelVersions: { label: string; value: string }[];
    studyPhases: { label: string; value: string }[];
    whodrugVersions: { label: string; value: string }[];
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch available versions from API
  useEffect(() => {
    getAvailableVersions().then((res: any) => {
      if (res?.data) {
        setVersionOptions(res.data);
      }
    }).catch(() => {
      messageApi.error(t('page.mdr.pipelineManagement.studyConfig.loadVersionsFailed'));
    }).finally(() => {
      setVersionsLoading(false);
    });
  }, [messageApi, t]);

  // Sync form values when selectedNode changes
  useEffect(() => {
    if (selectedNode) {
      form.setFieldsValue(selectedNode);
    }
  }, [selectedNode, form]);

  const handleSave = async () => {
    if (!studyId) return;
    try {
      setSaving(true);
      const values = form.getFieldsValue();
      const config = values.config || {};
      await updatePipelineStudyConfig(studyId, {
        adam_ig_version: config.adamIgVersion,
        adam_model_version: config.adamModelVersion,
        meddra_version: config.meddraVersion,
        phase: values.phase,
        protocol_title: values.protocolTitle,
        sdtm_ig_version: config.sdtmIgVersion,
        sdtm_model_version: config.sdtmModelVersion,
        whodrug_version: config.whodrugVersion
      });
      messageApi.success(t('page.mdr.pipelineManagement.saveSuccess'));
      setIsEditing(false);
    } catch {
      messageApi.error(t('page.mdr.pipelineManagement.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // 仅需要 Study 级别的上下文
  if (!isStudyReady || !studyId) {
    return (
      <div className="h-full flex-center">
        <Empty
          description={t('page.mdr.pipelineManagement.context.selectStudyHint')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Text type="secondary">{t('page.mdr.pipelineManagement.context.selectStudyForConfig')}</Text>
        </Empty>
      </div>
    );
  }

  if (!selectedNode) {
    return (
      <div className="h-full flex-center">
        <Empty description={t('page.mdr.pipelineManagement.selectNodeHint')} />
      </div>
    );
  }

  const isLocked = selectedNode.lifecycleStatus === 'Locked';

  return (
    <div className="h-full overflow-auto">
      <Card
        className="card-wrapper"
        size="small"
        extra={
          <Button
            icon={<EditOutlined />}
            type={isEditing ? 'default' : 'primary'}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? t('page.mdr.pipelineManagement.cancelEdit') : t('page.mdr.pipelineManagement.edit')}
          </Button>
        }
        title={
          <Space>
            <SettingOutlined className="text-blue-500" />
            <span className="font-medium">{t('page.mdr.pipelineManagement.studyConfig.title')}</span>
          </Space>
        }
      >
        <Spin spinning={versionsLoading}>
          <Form
            form={form}
            layout="vertical"
          >
            {/* 基本信息 */}
            <div className="mb-12px text-14px text-gray-600 font-medium">
              {t('page.mdr.pipelineManagement.studyConfig.basicInfo')}
            </div>
            <div className="grid grid-cols-2 gap-16px">
              <Form.Item
                label={t('page.mdr.pipelineManagement.studyConfig.protocolTitle')}
                name="protocolTitle"
              >
                <Input disabled={!isEditing} />
              </Form.Item>
              <Form.Item
                label={t('page.mdr.pipelineManagement.studyConfig.phase')}
                name="phase"
              >
                <Select
                  disabled={!isEditing}
                  options={versionOptions?.studyPhases || []}
                />
              </Form.Item>
            </div>

            <Divider />

            {/* CDISC 标准版本 */}
            <div className="mb-12px text-14px text-gray-600 font-medium">
              {t('page.mdr.pipelineManagement.studyConfig.cdiscStandards')}
            </div>
            <div className="grid grid-cols-2 gap-16px">
              <Form.Item
                label="SDTM Model"
                name={['config', 'sdtmModelVersion']}
              >
                <Select
                  disabled={!isEditing}
                  options={versionOptions?.sdtmModelVersions || []}
                />
              </Form.Item>
              <Form.Item
                label="SDTM IG"
                name={['config', 'sdtmIgVersion']}
              >
                <Select
                  disabled={!isEditing}
                  options={versionOptions?.sdtmIgVersions || []}
                />
              </Form.Item>
              <Form.Item
                label="ADaM Model"
                name={['config', 'adamModelVersion']}
              >
                <Select
                  disabled={!isEditing}
                  options={versionOptions?.adamModelVersions || []}
                />
              </Form.Item>
              <Form.Item
                label="ADaM IG"
                name={['config', 'adamIgVersion']}
              >
                <Select
                  disabled={!isEditing}
                  options={versionOptions?.adamIgVersions || []}
                />
              </Form.Item>
            </div>

            <Divider />

            {/* 医学字典版本 */}
            <div className="mb-12px text-14px text-gray-600 font-medium">
              {t('page.mdr.pipelineManagement.studyConfig.dictionaries')}
            </div>
            <div className="grid grid-cols-2 gap-16px">
              <Form.Item
                label="MedDRA"
                name={['config', 'meddraVersion']}
              >
                <Select
                  disabled={!isEditing}
                  options={versionOptions?.meddraVersions || []}
                />
              </Form.Item>
              <Form.Item
                label="WHODrug"
                name={['config', 'whodrugVersion']}
              >
                <Select
                  disabled={!isEditing}
                  options={versionOptions?.whodrugVersions || []}
                />
              </Form.Item>
            </div>

            {isEditing && (
              <div className="mt-16px flex justify-end">
                <Button
                  loading={saving}
                  type="primary"
                  onClick={handleSave}
                >
                  {t('page.mdr.pipelineManagement.save')}
                </Button>
              </div>
            )}
          </Form>
        </Spin>
      </Card>
    </div>
  );
};

/** Project Timelines Tab - 向下兼容，有 Study 即可展示 */
interface ProjectTimelinesTabProps {
  analysisId: string | null;
  canManage: boolean;
  hasAnalysis: boolean;
  isStudyReady: boolean;
  milestones: IProjectMilestone[];
  milestonesLoading: boolean;
  milestoneStats: ReturnType<typeof getMilestoneStats>;
  onRefresh: () => void;
  studyId: string | null;
}

const ProjectTimelinesTab: React.FC<ProjectTimelinesTabProps> = ({
  analysisId,
  canManage,
  hasAnalysis,
  isStudyReady,
  milestones,
  milestonesLoading,
  milestoneStats,
  onRefresh,
  studyId
}) => {
  const { t } = useTranslation();

  // 仅需要 Study 级别的上下文
  if (!isStudyReady || !studyId) {
    return (
      <div className="h-full flex-center">
        <Empty
          description={t('page.mdr.pipelineManagement.context.selectStudyHint')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Text type="secondary">{t('page.mdr.pipelineManagement.context.selectStudyForTimeline')}</Text>
        </Empty>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {/* 分析级别提示 */}
      {hasAnalysis && (
        <div className="mb-12px border border-purple-200 rounded-lg bg-purple-50 px-12px py-8px">
          <Text type="secondary">
            <Tag
              className="mr-8px"
              color="purple"
            >
              {analysisId}
            </Tag>
            {t('page.mdr.pipelineManagement.milestone.showingAnalysisLevel')}
          </Text>
        </div>
      )}
      {!hasAnalysis && (
        <div className="mb-12px border border-blue-200 rounded-lg bg-blue-50 px-12px py-8px">
          <Text type="secondary">{t('page.mdr.pipelineManagement.milestone.showingStudyLevel')}</Text>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-6 mb-16px gap-12px">
        <Card
          className="card-wrapper text-center"
          size="small"
        >
          <div className="text-24px text-blue-600 font-bold">{milestoneStats.total}</div>
          <div className="text-12px text-gray-500">{t('page.mdr.pipelineManagement.milestone.stats.total')}</div>
        </Card>
        <Card
          className="card-wrapper text-center"
          size="small"
        >
          <div className="text-24px text-green-600 font-bold">{milestoneStats.Completed}</div>
          <div className="text-12px text-gray-500">{t('page.mdr.pipelineManagement.milestone.stats.completed')}</div>
        </Card>
        <Card
          className="card-wrapper text-center"
          size="small"
        >
          <div className="text-24px text-green-500 font-bold">{milestoneStats.OnTrack}</div>
          <div className="text-12px text-gray-500">{t('page.mdr.pipelineManagement.milestone.stats.onTrack')}</div>
        </Card>
        <Card
          className="card-wrapper text-center"
          size="small"
        >
          <div className="text-24px text-orange-600 font-bold">{milestoneStats.AtRisk}</div>
          <div className="text-12px text-gray-500">{t('page.mdr.pipelineManagement.milestone.stats.atRisk')}</div>
        </Card>
        <Card
          className="card-wrapper text-center"
          size="small"
        >
          <div className="text-24px text-red-600 font-bold">{milestoneStats.Delayed}</div>
          <div className="text-12px text-gray-500">{t('page.mdr.pipelineManagement.milestone.stats.delayed')}</div>
        </Card>
        <Card
          className="card-wrapper text-center"
          size="small"
        >
          <div className="text-24px text-gray-500 font-bold">{milestoneStats.Pending}</div>
          <div className="text-12px text-gray-500">{t('page.mdr.pipelineManagement.milestone.stats.pending')}</div>
        </Card>
      </div>

      {/* 时间轴视图 */}
      <MilestoneTimeline milestones={milestones} />

      {/* 里程碑表格 */}
      <Card
        className="mt-16px card-wrapper"
        size="small"
        title={
          <div className="flex items-center gap-8px">
            <div className="i-mdi-calendar-check text-blue-500" />
            <span>{t('page.mdr.pipelineManagement.milestone.tableTitle')}</span>
          </div>
        }
      >
        <MilestoneTrackerTable
          analysisId={analysisId || undefined}
          canEdit={canManage}
          milestones={milestones}
          studyId={studyId!}
          onRefresh={onRefresh}
        />
      </Card>
    </div>
  );
};

/** Execution Jobs Tab - 强依赖 Analysis 级别 */
interface ExecutionJobsTabProps {
  analysisId: string | null;
  executionJobs: any[];
  executionJobsLoading: boolean;
  isAnalysisReady: boolean;
}

const ExecutionJobsTab: React.FC<ExecutionJobsTabProps> = ({ analysisId, executionJobs, executionJobsLoading, isAnalysisReady }) => {
  const { t } = useTranslation();

  // 强依赖 Analysis 级别
  if (!isAnalysisReady || !analysisId) {
    return (
      <div className="h-full flex-center">
        <Empty
          description={t('page.mdr.pipelineManagement.context.selectAnalysisHint')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Text type="secondary">{t('page.mdr.pipelineManagement.context.selectAnalysisForJobs')}</Text>
        </Empty>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <Spin spinning={executionJobsLoading}>
        <ExecutionJobsTable jobs={executionJobs} />
      </Spin>
    </div>
  );
};

// ==================== 辅助函数 ====================

const getNodeIcon = (nodeType: NodeType) => {
  const icons: Record<NodeType, React.ReactNode> = {
    ANALYSIS: <FundOutlined className="text-purple-500" />,
    COMPOUND: <ExperimentOutlined className="text-green-500" />,
    STUDY: <FileTextOutlined className="text-orange-500" />,
    TA: <ApartmentOutlined className="text-blue-500" />
  };
  return icons[nodeType];
};

const convertToTreeData = (nodes: PipelineNode[]): DataNode[] => {
  return nodes.map(node => ({
    children: node.children ? convertToTreeData(node.children) : undefined,
    icon: getNodeIcon(node.nodeType),
    key: node.id,
    title: (
      <Space size={4}>
        <span className={node.status === 'Archived' ? 'line-through text-gray-400' : ''}>{node.title}</span>
        {node.status === 'Archived' && (
          <Tag
            className="m-0 text-10px"
            color="default"
          >
            Archived
          </Tag>
        )}
      </Space>
    )
  }));
};

const findParentNode = (nodes: PipelineNode[], childId: string): PipelineNode | null => {
  for (const node of nodes) {
    if (node.children?.some(child => child.id === childId)) {
      return node;
    }
    if (node.children) {
      const found = findParentNode(node.children, childId);
      if (found) return found;
    }
  }
  return null;
};

export const handle = {
  i18nKey: 'route.(base)_mdr_pipeline-management',
  icon: 'mdi:family-tree',
  order: 2,
  title: 'Pipeline Management'
};

export default PipelineManagement;
