/**
 * Global Library - CDISC 标准库 (Schema-Driven UI 终极版)
 *
 * 架构特点：
 *
 * 1. Schema-Driven: 后端动态下发表格列定义，前端无硬编码
 * 2. 多态渲染: 根据 renderType 安全渲染各种数据类型
 * 3. 严格命名: 使用标准名称字典，杜绝正则替换
 * 4. 数据驱动: 只显示数据库中存在的标准类型
 */
import { DatabaseOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Card,
  Empty,
  Input,
  Pagination,
  Radio,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import type { RadioChangeEvent, TabsProps } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Resizable } from 'react-resizable';

import { useDatasetVariables, useGlobalLibraryTree, useTableSchema, useVersionDatasets } from '@/service/hooks';

import CodelistViewer from './components/CodelistViewer';

const { Search } = Input;
const { Text } = Typography;
const { Option } = Select;

// 可调整列宽的表头组件
interface ResizableTitleProps {
  onResize: (e: React.SyntheticEvent, data: { size: { width: number } }) => void;
  width: number;
  [key: string]: unknown;
}

const ResizableTitle: React.FC<ResizableTitleProps> = props => {
  const { onResize, width, ...restProps } = props;

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <Resizable
      draggableOpts={{ enableUserSelectHack: false }}
      height={0}
      width={width}
      handle={
        <span
          className="react-resizable-handle"
          style={{
            bottom: 0,
            cursor: 'col-resize',
            height: '100%',
            position: 'absolute',
            right: -5,
            width: 10,
            zIndex: 1
          }}
          onClick={e => e.stopPropagation()}
        />
      }
      onResize={onResize}
    >
      <th {...restProps} />
    </Resizable>
  );
};

// 路由 handle 导出
export const handle = {
  i18nKey: 'route.(base)_mdr_global-library',
  icon: 'mdi:book-open-page-variant',
  order: 0,
  title: 'Global Library'
};

// ============================================================
// Step 1: 严格的标准名称字典 (严禁使用正则替换!)
// ============================================================

/** 标准类型显示名称字典 key 来自后端 Tree API 的 node.key */
const STANDARD_DISPLAY_NAMES: Record<string, string> = {
  adam: 'ADaM Model',
  adamig: 'ADaMIG',
  cdash: 'CDASH',
  cdashig: 'CDASHIG',
  ct: 'Controlled Terminology',
  qrs: 'QRS',
  sdtm: 'SDTM Model',
  sdtmig: 'SDTMIG',
  sendig: 'SENDIG',
  tig: 'Targeted Implementation Guide (TIG)'
};

/** 标准类型颜色映射 */
const STANDARD_TYPE_COLORS: Record<string, string> = {
  adam: 'green',
  adamig: 'green',
  cdash: 'orange',
  cdashig: 'orange',
  ct: 'cyan',
  qrs: 'magenta',
  sdtm: 'blue',
  sdtmig: 'blue',
  sendig: 'purple',
  tig: 'gold'
};

// Core 颜色映射
const CORE_COLOR_MAP: Record<string, string> = {
  Exp: 'orange',
  Perm: 'blue',
  Req: 'red'
};

// 数据类型颜色映射
const DATA_TYPE_COLORS: Record<string, string> = {
  Char: 'default',
  Date: 'green',
  DateTime: 'purple',
  Num: 'blue',
  Time: 'magenta'
};

// Dataset Class 颜色映射
// 注意: 数据库存储值使用下划线格式 (如 SPECIAL_PURPOSE)
const CLASS_COLOR_MAP: Record<string, string> = {
  // === Associated Persons (相关人员) ===
  ASSOCIATED_PERSONS: 'magenta',
  EVENTS: 'red',
  // === Observation Classes (观测类) ===
  FINDINGS: 'blue',
  FINDINGS_ABOUT: 'purple',
  // === General Observations (抽象基类) ===
  GENERAL_OBSERVATIONS: 'geekblue',
  INTERVENTIONS: 'green',
  // === QRS (量表库) ===
  QRS: 'magenta',
  RELATIONSHIP: 'orange',
  // === Special Classes (特殊类) ===
  SPECIAL_PURPOSE: 'cyan',
  TRIAL_DESIGN: 'gold'
};

// Class 显示名称到 Class Type 的映射（用于 implements 跳转）
const CLASS_LABEL_TO_TYPE: Record<string, string> = {
  'Associated Persons': 'ASSOCIATED_PERSONS',
  Events: 'EVENTS',
  Findings: 'FINDINGS',
  'Findings About': 'FINDINGS_ABOUT',
  'General Observations': 'GENERAL_OBSERVATIONS',
  Interventions: 'INTERVENTIONS',
  Relationship: 'RELATIONSHIP',
  'Special Purpose': 'SPECIAL_PURPOSE',
  'Trial Design': 'TRIAL_DESIGN'
};

// 特殊领域关键字（在版本选择时排序靠后）
const SPECIAL_DOMAIN_KEYWORDS = ['md', 'genetox', 'dart', 'ap', 'var'];

// ============================================================
// ADaMIG 标准类型分组配置
// ============================================================

/** ADaMIG 标准类型配置 从版本名称中提取标准类型前缀进行分组 */
const ADAMIG_STANDARD_TYPES: Record<string, { color: string; label: string; order: number }> = {
  adae: { color: 'red', label: 'ADaM ADAE', order: 5 },
  adamig: { color: 'green', label: 'ADaMIG', order: 1 },
  md: { color: 'cyan', label: 'ADaM MD', order: 6 },
  nca: { color: 'magenta', label: 'ADaM NCA', order: 7 },
  occds: { color: 'blue', label: 'ADaM OCCDS', order: 3 },
  poppk: { color: 'orange', label: 'ADaM POPPK', order: 4 },
  tte: { color: 'purple', label: 'ADaM BDS for TTE', order: 2 }
};

/**
 * 从 ADaMIG 版本名称中提取标准类型
 *
 * 版本格式分析：
 *
 * - "vadamig.1.3" -> ADaMIG 标准 IG (v 前缀后直接是 adamig)
 * - "vadam.tte.1.0" -> ADaM BDS for TTE (vadam.{type}.{version})
 * - "vadam.2.1" -> ADaMIG v2.1 (vadam.{version}，旧格式)
 * - "v1.4" -> ADaMIG v1.4 (纯版本号)
 */
function getAdamigStandardType(versionLabel: string): string {
  const lowerLabel = versionLabel.toLowerCase();

  // 按优先级匹配各标准类型
  // 1. 匹配 vadam.{type}.{version} 格式 (如 vadam.tte.1.0)
  const adamTypeMatch = lowerLabel.match(/vadam\.([a-z]+)\.(\d+)/);
  if (adamTypeMatch) {
    const type = adamTypeMatch[1];
    if (ADAMIG_STANDARD_TYPES[type]) {
      return type;
    }
  }

  // 2. 匹配 vadamig.{version} 格式 (如 vadamig.1.3)
  if (/vadamig\.\d/.test(lowerLabel)) {
    return 'adamig';
  }

  // 3. 匹配 vadam.{version} 格式 (如 vadam.2.1) - 旧格式，归类为 ADaMIG
  if (/vadam\.\d+\.\d+/.test(lowerLabel)) {
    return 'adamig';
  }

  // 4. 纯版本号格式 (如 v1.4) - 默认归类为 ADaMIG
  return 'adamig';
}

/**
 * 格式化 ADaMIG 版本号显示
 *
 * 示例:
 *
 * - "CDISC ADAMIG vadamig.1.3 Specification" -> "v1.3"
 * - "CDISC ADAMIG vadam.tte.1.0 Specification" -> "v1.0"
 * - "CDISC ADAMIG vadam.2.1 Specification" -> "v2.1"
 * - "CDISC ADAMIG v1.4 Specification" -> "v1.4"
 */
function formatAdamigVersionNumber(fullName: string): string {
  if (!fullName) return '';

  const lowerName = fullName.toLowerCase();

  // 匹配 vadam.{type}.{version} 格式
  const adamTypeMatch = lowerName.match(/vadam\.[a-z]+\.(\d+(?:\.\d+)*)/);
  if (adamTypeMatch) {
    return `v${adamTypeMatch[1]}`;
  }

  // 匹配 vadamig.{version} 格式
  const adamigMatch = lowerName.match(/vadamig\.(\d+(?:\.\d+)*)/);
  if (adamigMatch) {
    return `v${adamigMatch[1]}`;
  }

  // 匹配 vadam.{version} 格式
  const adamMatch = lowerName.match(/vadam\.(\d+(?:\.\d+)*)/);
  if (adamMatch) {
    return `v${adamMatch[1]}`;
  }

  // 匹配纯版本号格式
  const pureMatch = fullName.match(/v(\d+(?:\.\d+)*)/i);
  if (pureMatch) {
    return `v${pureMatch[1]}`;
  }

  return fullName;
}

// ============================================================
// 版本名称格式化
// ============================================================

/**
 * 从完整版本名称中提取版本号
 *
 * 示例:
 *
 * - "CDISC SDTMIG v3.4 Specification" -> "v3.4"
 * - "CDISC SDTMIG vmd.1.1 Specification" -> "MD v1.1"
 * - "CDISC ADAM vadamig.1.3 Specification" -> "ADaMIG v1.3"
 */
function formatVersionNumber(fullName: string): string {
  if (!fullName) return '';

  // 匹配版本号: v + 可选前缀 + 数字
  const match = fullName.match(/v([a-z]*)\.?(\d+(?:[.\-]\d+)*)/i);
  if (!match) return '';

  const prefix = match[1]?.toLowerCase() || '';
  const versionNum = match[2];

  // 特殊领域前缀映射
  const prefixMap: Record<string, string> = {
    adae: 'ADAE',
    adamig: 'ADaMIG',
    ap: 'AP',
    dart: 'DART',
    genetox: 'Genetox',
    md: 'MD',
    nca: 'NCA',
    occds: 'OCCDS',
    poppk: 'POPPK',
    tte: 'TTE',
    var: 'VAR'
  };

  if (prefix && prefixMap[prefix]) {
    return `${prefixMap[prefix]} v${versionNum}`;
  }

  return `v${versionNum}`;
}

/**
 * 格式化版本名称
 *
 * 示例:
 *
 * - "CDISC SDTMIG v3.4 Specification" -> "SDTMIG v3.4"
 * - "CDISC SDTM v2.0 Specification" -> "SDTM Model v2.0"
 * - "CDISC QRS vlatest - HAMA1 Specification" -> "QRS (HAMA1)"
 */
function formatVersionName(fullName: string, standardKey: string): string {
  if (!fullName) return '';

  // 获取标准类型显示名称
  const standardName = STANDARD_DISPLAY_NAMES[standardKey] || standardKey.toUpperCase();

  // QRS 特殊格式
  if (standardKey === 'qrs') {
    const qrsMatch = fullName.match(/QRS.*?-\s*([A-Z0-9]+)/i);
    if (qrsMatch) {
      return `QRS (${qrsMatch[1]})`;
    }
    return 'QRS';
  }

  // ADaM Model 特殊处理：显示关联的 IG 版本
  if (standardKey === 'adam' && fullName.toLowerCase().includes('adamig')) {
    const igMatch = fullName.match(/vadamig\.(\d+(?:\.\d+)*)/i);
    if (igMatch) {
      return `ADaM Model (ADaMIG v${igMatch[1]})`;
    }
  }

  // 普通格式: 标准类型 + 版本号
  const versionNum = formatVersionNumber(fullName);
  return `${standardName} ${versionNum}`;
}

/** 获取标准类型颜色 */
function getStandardTypeColor(key: string): string {
  return STANDARD_TYPE_COLORS[key.toLowerCase()] || 'default';
}

/** 提取版本号用于排序 返回 [major, minor, patch] 元组 */
function parseVersionNumber(name: string): [number, number, number] {
  // 特殊处理 ADaMIG 版本格式: vadamig.1.3 -> [1, 3, 0]
  const adamigMatch = name.match(/vadamig\.(\d+)\.?(\d+)?\.?(\d+)?/i);
  if (adamigMatch) {
    const major = Number.parseInt(adamigMatch[1] || '0', 10);
    const minor = Number.parseInt(adamigMatch[2] || '0', 10);
    const patch = Number.parseInt(adamigMatch[3] || '0', 10);
    return [major, minor, patch];
  }

  // 特殊处理 ADaM 子类型版本格式: vadam.{type}.1.0 -> [1, 0, 0]
  const adamTypeMatch = name.match(/vadam\.[a-z]+\.(\d+)\.?(\d+)?\.?(\d+)?/i);
  if (adamTypeMatch) {
    const major = Number.parseInt(adamTypeMatch[1] || '0', 10);
    const minor = Number.parseInt(adamTypeMatch[2] || '0', 10);
    const patch = Number.parseInt(adamTypeMatch[3] || '0', 10);
    return [major, minor, patch];
  }

  // 通用版本格式
  const match = name.match(/v([a-z]*\.?)(\d+)[.\-]?(\d+)?[.\-]?(\d+)?/i);
  if (match) {
    // 如果有前缀 (如 md.1.1)，排序靠后
    const hasPrefix = match[1] && match[1].length > 0;
    const major = Number.parseInt(match[2] || '0', 10);
    const minor = Number.parseInt(match[3] || '0', 10);
    const patch = Number.parseInt(match[4] || '0', 10);

    // 有前缀的版本排序靠后 (加 1000)
    const prefixOffset = hasPrefix ? 1000 : 0;
    return [major + prefixOffset, minor, patch];
  }
  return [0, 0, 0];
}

/** 检查是否为特殊领域版本 */
function isSpecialDomain(name: string): boolean {
  const lowerName = name.toLowerCase();
  return SPECIAL_DOMAIN_KEYWORDS.some(keyword => lowerName.includes(keyword));
}

// ============================================================
// 智能默认版本选择
// ============================================================

function selectDefaultVersion(
  versions: Array<{ key: string; label: string; specId: number; specType?: string }>
): number | null {
  if (!versions || versions.length === 0) return null;

  // 过滤掉特殊领域版本，优先选择常规版本
  const regularVersions = versions.filter(v => !isSpecialDomain(v.label));

  if (regularVersions.length === 0) {
    return versions[0].specId;
  }

  // 按版本号降序排序，选择最高版本
  const sorted = [...regularVersions].sort((a, b) => {
    const verA = parseVersionNumber(a.label);
    const verB = parseVersionNumber(b.label);
    // 降序排序
    if (verA[0] !== verB[0]) return verB[0] - verA[0];
    if (verA[1] !== verB[1]) return verB[1] - verA[1];
    return verB[2] - verA[2];
  });

  return sorted[0].specId;
}

// ============================================================
// Step 2: 动态表格渲染引擎
// ============================================================

/** 安全渲染工厂 根据后端下发的 renderType 进行安全渲染 */
function safeRender(value: unknown, renderType: string, record: Api.GlobalLibrary.VariableListItem): React.ReactNode {
  switch (renderType) {
    case 'ordinal':
      const ord = value as number | null;
      return ord ?? '-';

    case 'tag':
      if (value === null || value === undefined) return '-';
      const strVal = String(value);
      const color = getColorForTag(strVal, record);
      return <Tag color={color}>{strVal}</Tag>;

    case 'array':
      if (!value || !Array.isArray(value) || value.length === 0) return '-';
      return (
        <Space
          wrap
          size={2}
        >
          {(value as string[]).slice(0, 3).map((item, idx) => (
            <Tag
              className="text-11px"
              color="geekblue"
              key={idx}
            >
              {item}
            </Tag>
          ))}
          {value.length > 3 && (
            <Tooltip title={(value as string[]).slice(3).join(', ')}>
              <Tag
                className="text-11px"
                color="default"
              >
                +{value.length - 3}
              </Tag>
            </Tooltip>
          )}
        </Space>
      );

    case 'role':
      if (!value) return '-';
      const roleStr = String(value);
      const roleColor = getRoleColor(roleStr);
      return <Tag color={roleColor}>{roleStr}</Tag>;

    case 'longtext':
      // 长文本渲染，自动换行显示完整内容
      if (value === null || value === undefined) return '-';
      const longText = String(value);
      return (
        <div
          className="whitespace-normal break-words text-12px text-gray-600 leading-tight"
          style={{ maxWidth: 300 }}
        >
          {longText}
        </div>
      );

    case 'implements':
      // SDTM IG 专用：显示实现的 SDTM Model 变量链接
      if (!value || typeof value !== 'object') return '-';
      const impl = value as { class?: string; title?: string; variable?: string };
      if (!impl.class && !impl.variable) return '-';
      return (
        <Tooltip title={impl.title || impl.variable}>
          <div className="text-12px">
            <Tag
              className="text-10px"
              color="geekblue"
            >
              {impl.class}
            </Tag>
            <Text
              className="text-11px"
              type="secondary"
            >
              {impl.variable}
            </Text>
          </div>
        </Tooltip>
      );

    case 'text':
    default:
      if (value === null || value === undefined) return '-';
      const text = String(value);
      return (
        <Tooltip title={text}>
          <Text
            ellipsis
            className="text-12px"
            style={{ maxWidth: 250 }}
            type="secondary"
          >
            {text}
          </Text>
        </Tooltip>
      );
  }
}

function getColorForTag(value: string, _record: Api.GlobalLibrary.VariableListItem): string {
  if (DATA_TYPE_COLORS[value]) return DATA_TYPE_COLORS[value];
  if (CORE_COLOR_MAP[value]) return CORE_COLOR_MAP[value];
  return 'blue';
}

function getRoleColor(role: string): string {
  const roleColors: Record<string, string> = {
    Identifier: 'red',
    Qualifier: 'blue',
    Rule: 'cyan',
    Timing: 'purple',
    Topic: 'orange'
  };
  return roleColors[role] || 'default';
}

/** 将后端 Schema 转换为 Ant Design Columns */
function schemaToColumns(
  schema: Api.GlobalLibrary.TableSchema | null,
  locale: string
): ColumnsType<Api.GlobalLibrary.VariableListItem> {
  if (!schema) return [];

  return schema.columns.map(col => ({
    align: col.align,
    dataIndex: col.dataIndex,
    ellipsis: col.renderType === 'text',
    fixed: col.fixed,
    key: col.dataIndex,
    render: (value: unknown, record: Api.GlobalLibrary.VariableListItem) => safeRender(value, col.renderType, record),
    title: locale === 'zh' ? col.title.zh || col.title.en : col.title.en,
    width: col.width
  }));
}

// ============================================================
// 主组件
// ============================================================

const GlobalLibrary: React.FC = () => {
  const { i18n, t } = useTranslation();
  const locale = i18n.language.startsWith('zh') ? 'zh' : 'en';

  // ========== API Hooks ==========
  const { data: treeData, error: treeError, isLoading: treeLoading, refetch: refetchTree } = useGlobalLibraryTree();

  // ========== 状态管理 ==========
  const [selectedStandardKey, setSelectedStandardKey] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [selectedCtScopeNodeId, setSelectedCtScopeNodeId] = useState<number | null>(null); // CT专用
  const [variableSearchText, setVariableSearchText] = useState('');
  const [coreFilter, setCoreFilter] = useState<'Req' | 'Perm' | 'Exp' | undefined>(undefined);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  // 列宽状态 (支持可调整列宽)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  // ADaM IG Variable Set 选择
  const [selectedVarSet, setSelectedVarSet] = useState<string | null>(null);

  // ========== 从树数据解析选项 ==========
  // 过滤掉没有数据的标准类型 (ADaM Model 没有实际 datasets)
  const standardTypeOptions = useMemo(() => {
    if (!treeData || !Array.isArray(treeData) || treeData.length === 0) return [];
    return treeData
      .filter(node => node.key !== 'adam') // ADaM Model 没有数据，隐藏
      .map(node => ({
        children: node.children || [],
        key: node.key,
        label: node.title,
        nodeType: node.node_type
      }));
  }, [treeData]);

  const selectedStandardNode = useMemo(() => {
    if (!selectedStandardKey || !standardTypeOptions.length) return null;
    return standardTypeOptions.find(opt => opt.key === selectedStandardKey) || null;
  }, [selectedStandardKey, standardTypeOptions]);

  // 判断是否为 CT 类型
  const isCtType = selectedStandardKey === 'ct';

  // CT 类型配置（包含颜色和显示名称）
  const CT_TYPE_CONFIG: Record<string, { color: string; label: string; order: number }> = {
    adamct: { color: 'green', label: 'ADaM CT', order: 2 },
    cdashct: { color: 'orange', label: 'CDASH CT', order: 4 },
    coact: { color: 'pink', label: 'COA CT', order: 12 },
    ddfct: { color: 'geekblue', label: 'DDF CT', order: 7 },
    define: { color: 'gold', label: 'Define-XML CT', order: 8 },
    glossaryct: { color: 'lime', label: 'Glossary CT', order: 9 },
    mrctct: { color: 'red', label: 'MRCT CT', order: 11 },
    protocolct: { color: 'cyan', label: 'Protocol CT', order: 5 },
    qrsct: { color: 'magenta', label: 'QRS CT', order: 6 },
    qs: { color: 'blue', label: 'QS CT', order: 13 },
    sdtmct: { color: 'blue', label: 'SDTM CT', order: 1 },
    sendct: { color: 'purple', label: 'SEND CT', order: 3 },
    tmfct: { color: 'volcano', label: 'TMF CT', order: 10 }
  };

  // CT 类型选择状态（默认 SDTM CT）
  const [selectedCtType, setSelectedCtType] = useState<string>('sdtmct');

  // 所有 CT 版本选项 (使用 scope_node_id)，并提取 CT 类型
  const allCtVersionOptions = useMemo(() => {
    if (!isCtType || !selectedStandardNode?.children) return [];
    return selectedStandardNode.children
      .filter(child => child.node_type === 'ct_version')
      .map(child => {
        const title = child.title || '';
        // 从 title 中提取 CT 类型，如 "SDTM CT 2025-09-26" -> "sdtmct"
        let ctType = 'sdtmct'; // 默认值
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('adam ct')) ctType = 'adamct';
        else if (lowerTitle.includes('send ct')) ctType = 'sendct';
        else if (lowerTitle.includes('cdash ct')) ctType = 'cdashct';
        else if (lowerTitle.includes('protocol ct')) ctType = 'protocolct';
        else if (lowerTitle.includes('qrs ct')) ctType = 'qrsct';
        else if (lowerTitle.includes('ddf ct')) ctType = 'ddfct';
        else if (lowerTitle.includes('define')) ctType = 'define';
        else if (lowerTitle.includes('glossary ct')) ctType = 'glossaryct';
        else if (lowerTitle.includes('tmf ct')) ctType = 'tmfct';
        else if (lowerTitle.includes('mrct ct')) ctType = 'mrctct';
        else if (lowerTitle.includes('coa ct')) ctType = 'coact';
        else if (lowerTitle.includes('qs ct') || lowerTitle.includes('qs-ftct')) ctType = 'qs';
        else if (lowerTitle.includes('sdtm ct')) ctType = 'sdtmct';

        return {
          ctType,
          key: child.key,
          label: child.title,
          scopeNodeId: Number.parseInt(child.value || '0', 10)
        };
      });
  }, [isCtType, selectedStandardNode]);

  // 动态生成可用的 CT 类型选项（基于数据库中实际存在的 CT 类型）
  const availableCtTypes = useMemo(() => {
    const typeSet = new Set(allCtVersionOptions.map(opt => opt.ctType));
    const types = Array.from(typeSet)
      .map(ctType => ({
        color: CT_TYPE_CONFIG[ctType]?.color || 'default',
        count: allCtVersionOptions.filter(opt => opt.ctType === ctType).length,
        key: ctType,
        label: CT_TYPE_CONFIG[ctType]?.label || ctType.toUpperCase(),
        order: CT_TYPE_CONFIG[ctType]?.order || 99
      }))
      .sort((a, b) => a.order - b.order);
    return types;
  }, [allCtVersionOptions]);

  // 根据选中的 CT 类型过滤版本选项，并按日期降序排序（最新版本在前）
  const ctVersionOptions = useMemo(() => {
    const filtered = allCtVersionOptions.filter(opt => opt.ctType === selectedCtType);
    // 按版本日期降序排序，确保最新版本在前
    return filtered.sort((a, b) => {
      // 从 label 中提取日期，如 "SDTM CT 2025-09-26" -> "2025-09-26"
      const dateA = a.label.replace(/.*?CT\s*/i, '').replace(/\s*\(.*\)/, '');
      const dateB = b.label.replace(/.*?CT\s*/i, '').replace(/\s*\(.*\)/, '');
      return dateB.localeCompare(dateA); // 降序，最新在前
    });
  }, [allCtVersionOptions, selectedCtType]);

  // CT 类型变更处理
  const handleCtTypeChange = useCallback((ctType: string) => {
    setSelectedCtType(ctType);
    setSelectedCtScopeNodeId(null); // 重置版本选择
  }, []);

  // 获取 SDTM Model 的版本选项（用于 implements 跳转）
  const sdtmModelVersionOptions = useMemo(() => {
    const sdtmNode = standardTypeOptions.find(opt => opt.key === 'sdtm');
    if (!sdtmNode?.children) return [];
    return sdtmNode.children
      .filter(child => child.spec_id)
      .map(child => ({
        key: child.key,
        label: child.title,
        specId: child.spec_id!,
        specType: child.spec_type
      }));
  }, [standardTypeOptions]);

  // 非 CT 版本选项 (使用 spec_id)
  const versionOptions = useMemo(() => {
    if (isCtType || !selectedStandardNode?.children) return [];
    return selectedStandardNode.children
      .filter(child => child.spec_id)
      .map(child => ({
        key: child.key,
        label: child.title,
        specId: child.spec_id!,
        specType: child.spec_type
      }));
  }, [isCtType, selectedStandardNode]);

  // ADaMIG 标准类型分组
  const isAdamigType = selectedStandardKey === 'adamig';

  const adamigStandardTypeOptions = useMemo(() => {
    if (!isAdamigType || !versionOptions.length) return [];

    // 按标准类型分组
    const grouped = new Map<string, typeof versionOptions>();
    versionOptions.forEach(v => {
      const standardType = getAdamigStandardType(v.label);
      if (!grouped.has(standardType)) {
        grouped.set(standardType, []);
      }
      grouped.get(standardType)!.push(v);
    });

    // 转换为数组并处理
    return Array.from(grouped.entries())
      .map(([type, versions]) => {
        // 去重：如果版本号相同，只保留 spec_id 最大的那个
        const versionMap = new Map<string, (typeof versions)[0]>();
        versions.forEach(v => {
          const verNum = formatAdamigVersionNumber(v.label);
          const existing = versionMap.get(verNum);
          // 如果没有相同版本号，或者当前版本的 spec_id 更大，则保留
          if (!existing || v.specId > existing.specId) {
            versionMap.set(verNum, v);
          }
        });

        const uniqueVersions = Array.from(versionMap.values()).sort((a, b) => {
          // 按版本号降序排序
          const verA = parseVersionNumber(a.label);
          const verB = parseVersionNumber(b.label);
          if (verA[0] !== verB[0]) return verB[0] - verA[0];
          if (verA[1] !== verB[1]) return verB[1] - verA[1];
          return verB[2] - verA[2];
        });

        return {
          config: ADAMIG_STANDARD_TYPES[type] || { color: 'default', label: type.toUpperCase(), order: 99 },
          type,
          versions: uniqueVersions
        };
      })
      .sort((a, b) => a.config.order - b.config.order);
  }, [isAdamigType, versionOptions]);

  // ADaMIG 当前选中的标准类型
  const [selectedAdamigStandardType, setSelectedAdamigStandardType] = useState<string | null>(null);

  // ADaMIG 当前标准类型下的版本选项
  const adamigCurrentVersions = useMemo(() => {
    if (!selectedAdamigStandardType || !adamigStandardTypeOptions.length) return [];
    const group = adamigStandardTypeOptions.find(g => g.type === selectedAdamigStandardType);
    return group?.versions || [];
  }, [selectedAdamigStandardType, adamigStandardTypeOptions]);

  // ADaMIG 自动选择第一个标准类型
  useEffect(() => {
    if (isAdamigType && adamigStandardTypeOptions.length > 0 && !selectedAdamigStandardType) {
      setSelectedAdamigStandardType(adamigStandardTypeOptions[0].type);
    }
  }, [isAdamigType, adamigStandardTypeOptions, selectedAdamigStandardType]);

  // ADaMIG 自动选择第一个版本（当标准类型或版本列表变化时）
  useEffect(() => {
    if (isAdamigType && adamigCurrentVersions.length > 0) {
      // 检查当前选中的版本是否在当前版本列表中
      const isInCurrentList = adamigCurrentVersions.some(v => v.specId === selectedVersionId);
      if (!selectedVersionId || !isInCurrentList) {
        setSelectedVersionId(adamigCurrentVersions[0].specId);
      }
    }
  }, [isAdamigType, adamigCurrentVersions, selectedVersionId]);

  // 重置 ADaMIG 标准类型选择当切换标准类型时
  useEffect(() => {
    if (!isAdamigType) {
      setSelectedAdamigStandardType(null);
    }
  }, [isAdamigType]);

  // ========== Schema-Driven ==========
  const { data: tableSchema } = useTableSchema(selectedStandardKey);

  // 处理列宽调整
  const handleResize = useCallback((dataIndex: string) => {
    return (_e: React.SyntheticEvent, data: { size: { width: number } }) => {
      setColumnWidths(prev => ({
        ...prev,
        [dataIndex]: data.size.width
      }));
    };
  }, []);

  // 重置列宽当标准类型变化时
  useEffect(() => {
    setColumnWidths({});
  }, [selectedStandardKey]);

  // 处理 implements 列点击跳转到 SDTM Model
  const handleImplementsClick = useCallback(
    (impl: { class?: string; title?: string; variable?: string } | null) => {
      if (!impl?.class) return;

      // 获取 Class Type
      const classType = CLASS_LABEL_TO_TYPE[impl.class];
      if (!classType) return;

      // 获取 SDTM Model 的默认版本
      const sdtmVersionId = selectDefaultVersion(sdtmModelVersionOptions);
      if (!sdtmVersionId) return;

      // 切换到 SDTM Model tab
      setSelectedStandardKey('sdtm');
      setSelectedVersionId(sdtmVersionId);
      setSelectedClassType(classType);
      setSelectedDatasetId(null);
      setVariableSearchText('');
      setCoreFilter(undefined);
      setPagination({ current: 1, pageSize: 20 });
    },
    [sdtmModelVersionOptions]
  );

  const variableColumns = useMemo(() => {
    if (!tableSchema) return [];

    return tableSchema.columns.map(col => {
      const width = columnWidths[col.dataIndex] || col.width || 100;
      return {
        align: col.align,
        dataIndex: col.dataIndex,
        ellipsis: col.renderType === 'text',
        fixed: col.fixed,
        key: col.dataIndex,
        onHeaderCell: () =>
          ({
            onResize: handleResize(col.dataIndex),
            width
          }) as unknown as React.HTMLAttributes<HTMLElement>,
        render: (value: unknown, record: Api.GlobalLibrary.VariableListItem) => {
          // 特殊处理 implements 类型，添加点击跳转功能
          if (col.renderType === 'implements' && value && typeof value === 'object') {
            const impl = value as { class?: string; title?: string; variable?: string };
            if (!impl.class && !impl.variable) return '-';
            return (
              <Tooltip title={`${impl.title || impl.variable} - 点击跳转到 SDTM Model`}>
                <div
                  className="cursor-pointer text-12px transition-colors hover:text-primary"
                  onClick={() => handleImplementsClick(impl)}
                >
                  <Tag
                    className="text-10px"
                    color="geekblue"
                  >
                    {impl.class}
                  </Tag>
                  <Text
                    className="text-11px"
                    type="secondary"
                  >
                    {impl.variable}
                  </Text>
                </div>
              </Tooltip>
            );
          }
          return safeRender(value, col.renderType, record);
        },
        title: locale === 'zh' ? col.title.zh || col.title.en : col.title.en,
        width
      };
    });
  }, [tableSchema, locale, columnWidths, handleResize, handleImplementsClick]);

  // ========== 自动选择逻辑 ==========
  useEffect(() => {
    if (treeData && !treeLoading && standardTypeOptions.length > 0 && !selectedStandardKey) {
      setSelectedStandardKey(standardTypeOptions[0].key);
    }
  }, [treeData, treeLoading, standardTypeOptions, selectedStandardKey]);

  // CT 版本自动选择 - 当 CT 类型或版本选项变化时选择第一个版本
  useEffect(() => {
    if (isCtType && ctVersionOptions.length > 0) {
      // 选择第一个版本（已经按 CT 类型过滤，且是最新版本）
      const currentSelected = ctVersionOptions.find(opt => opt.scopeNodeId === selectedCtScopeNodeId);
      if (!currentSelected) {
        setSelectedCtScopeNodeId(ctVersionOptions[0].scopeNodeId);
      }
    }
  }, [isCtType, ctVersionOptions, selectedCtScopeNodeId]);

  // 非 CT 版本自动选择
  useEffect(() => {
    if (!isCtType && versionOptions.length > 0 && !selectedVersionId) {
      const defaultVersionId = selectDefaultVersion(versionOptions);
      if (defaultVersionId) {
        setSelectedVersionId(defaultVersionId);
        setSelectedDatasetId(null);
      }
    }
  }, [isCtType, versionOptions, selectedVersionId, selectedStandardKey]);

  // ========== API 数据加载 ==========
  const { data: datasetsData, isLoading: datasetsLoading } = useVersionDatasets(selectedVersionId, { limit: 500 });

  const datasetOptions = useMemo(() => {
    if (!datasetsData?.items) return [];
    return datasetsData.items.map(ds => ({
      classType: ds.class_type,
      description: ds.description ?? undefined,
      id: ds.id,
      name: ds.dataset_name,
      variableCount: ds.variable_count ?? 0
    }));
  }, [datasetsData]);

  // SDTM Model / SDTM IG 按 Class Type 分组
  const getClassGroups = useCallback((datasets: typeof datasetOptions) => {
    if (!datasets.length) return [];

    // SDTM IG 和 SDTM Model 共用相同的 Class 配置
    const classConfig: Record<string, { color: string; label: string; order: number }> = {
      // === Associated Persons (相关人员) ===
      ASSOCIATED_PERSONS: { color: 'magenta', label: 'Associated Persons', order: 9 },

      EVENTS: { color: 'red', label: 'Events', order: 3 },
      // === Observation Classes (观测类) ===
      FINDINGS: { color: 'blue', label: 'Findings', order: 2 },
      FINDINGS_ABOUT: { color: 'purple', label: 'Findings About', order: 5 },
      // === General Observations (抽象基类) ===
      GENERAL_OBSERVATIONS: { color: 'geekblue', label: 'General Observations', order: 1 },

      INTERVENTIONS: { color: 'green', label: 'Interventions', order: 4 },
      RELATIONSHIP: { color: 'orange', label: 'Relationship', order: 8 },
      // === Special Classes (特殊类) ===
      SPECIAL_PURPOSE: { color: 'cyan', label: 'Special Purpose', order: 6 },

      TRIAL_DESIGN: { color: 'gold', label: 'Trial Design', order: 7 }
    };

    // 按 classType 分组
    const grouped = new Map<string, typeof datasetOptions>();
    datasets.forEach(ds => {
      if (!grouped.has(ds.classType)) {
        grouped.set(ds.classType, []);
      }
      grouped.get(ds.classType)!.push(ds);
    });

    // 按预定义顺序排列，并筛选掉没有变量的 dataset
    return Array.from(grouped.entries())
      .map(([classType, classDatasets]) => ({
        classType,
        config: classConfig[classType] || { color: 'default', label: classType, order: 99 },
        datasets: classDatasets.filter(ds => ds.variableCount > 0),
        totalVariables: classDatasets.reduce((sum, ds) => sum + ds.variableCount, 0)
      }))
      .filter(group => group.datasets.length > 0) // 只显示有数据的 Class
      .sort((a, b) => a.config.order - b.config.order);
  }, []);

  // SDTM Model Class Groups
  const sdtmClassGroups = useMemo(() => {
    if (selectedStandardKey !== 'sdtm' || !datasetOptions.length) return [];
    return getClassGroups(datasetOptions);
  }, [selectedStandardKey, datasetOptions, getClassGroups]);

  // SDTM IG Class Groups
  const sdtmigClassGroups = useMemo(() => {
    if (selectedStandardKey !== 'sdtmig' || !datasetOptions.length) return [];
    return getClassGroups(datasetOptions);
  }, [selectedStandardKey, datasetOptions, getClassGroups]);

  // SDTM Model / SDTM IG 当前选中的 Class
  const [selectedClassType, setSelectedClassType] = useState<string | null>(null);

  // SDTM Model 当前 Class 下的 datasets
  const sdtmCurrentDatasets = useMemo(() => {
    if (selectedStandardKey !== 'sdtm' || !selectedClassType) return [];
    const group = sdtmClassGroups.find(g => g.classType === selectedClassType);
    return group?.datasets || [];
  }, [selectedStandardKey, selectedClassType, sdtmClassGroups]);

  // SDTM IG 当前 Class 下的 datasets
  const sdtmigCurrentDatasets = useMemo(() => {
    if (selectedStandardKey !== 'sdtmig' || !selectedClassType) return [];
    const group = sdtmigClassGroups.find(g => g.classType === selectedClassType);
    return group?.datasets || [];
  }, [selectedStandardKey, selectedClassType, sdtmigClassGroups]);

  // 判断当前标准是否使用分级展示 (SDTM Model 或 SDTM IG)
  const useClassHierarchy = selectedStandardKey === 'sdtm' || selectedStandardKey === 'sdtmig';

  // 获取当前标准对应的 Class Groups
  const currentClassGroups = useMemo(() => {
    if (selectedStandardKey === 'sdtm') return sdtmClassGroups;
    if (selectedStandardKey === 'sdtmig') return sdtmigClassGroups;
    return [];
  }, [selectedStandardKey, sdtmClassGroups, sdtmigClassGroups]);

  // 获取当前标准对应的当前 Datasets
  const currentClassDatasets = useMemo(() => {
    if (selectedStandardKey === 'sdtm') return sdtmCurrentDatasets;
    if (selectedStandardKey === 'sdtmig') return sdtmigCurrentDatasets;
    return [];
  }, [selectedStandardKey, sdtmCurrentDatasets, sdtmigCurrentDatasets]);

  // SDTM Model / SDTM IG 自动选择第一个 Class
  useEffect(() => {
    if (useClassHierarchy && currentClassGroups.length > 0 && !selectedClassType) {
      setSelectedClassType(currentClassGroups[0].classType);
    }
  }, [useClassHierarchy, currentClassGroups, selectedClassType]);

  // SDTM Model / SDTM IG 自动选择第一个 dataset
  useEffect(() => {
    if (useClassHierarchy && currentClassDatasets.length > 0) {
      // 检查当前选中的 dataset 是否在当前 Class 的 datasets 中
      const isInCurrentClass = currentClassDatasets.some(ds => ds.id === selectedDatasetId);
      if (!selectedDatasetId || !isInCurrentClass) {
        setSelectedDatasetId(currentClassDatasets[0].id);
      }
    }
  }, [useClassHierarchy, currentClassDatasets, selectedDatasetId]);

  // 非 SDTM Model/IG 过滤掉 0 变量的数据集
  const filteredDatasetOptions = useMemo(() => {
    // SDTM Model / SDTM IG: 使用分级展示，不需要在这里过滤
    if (useClassHierarchy) {
      return datasetOptions;
    }
    return datasetOptions.filter(ds => ds.variableCount > 0);
  }, [useClassHierarchy, datasetOptions]);

  useEffect(() => {
    // 分级展示的标准由各自的 useEffect 处理
    if (useClassHierarchy) return;
    if (filteredDatasetOptions.length > 0 && !selectedDatasetId) {
      setSelectedDatasetId(filteredDatasetOptions[0].id);
    }
  }, [filteredDatasetOptions, selectedDatasetId, useClassHierarchy]);

  // ADaMIG 需要获取所有变量来计算 Variable Sets（使用更大的 limit）
  const variablesLimit = isAdamigType ? 500 : pagination.pageSize;

  const {
    data: variablesData,
    error: variablesError,
    isLoading: variablesLoading
  } = useDatasetVariables(selectedDatasetId, {
    core: coreFilter,
    limit: variablesLimit,
    offset: isAdamigType ? 0 : (pagination.current - 1) * pagination.pageSize,
    search: variableSearchText || undefined
  });

  // ADaMIG Variable Set 选项 (从 variablesData 中提取唯一的 var_set)
  const varSetOptions = useMemo(() => {
    if (!isAdamigType || !variablesData?.items) return [];
    const varSets = new Set<string>();
    variablesData.items.forEach(v => {
      if (v.var_set) {
        varSets.add(v.var_set);
      }
    });
    // 如果没有 var_set，返回空数组（不需要选择）
    if (varSets.size === 0) return [];
    // 返回排序后的 var_set 选项
    return Array.from(varSets).sort();
  }, [isAdamigType, variablesData]);

  // ADaMIG 默认选择第一个 Variable Set
  useEffect(() => {
    if (isAdamigType && varSetOptions.length > 0 && !selectedVarSet) {
      setSelectedVarSet(varSetOptions[0]);
    }
  }, [isAdamigType, varSetOptions, selectedVarSet]);

  // 根据 Variable Set 过滤后的变量列表
  const filteredVariables = useMemo(() => {
    if (!isAdamigType || !variablesData?.items) return variablesData?.items || [];
    // 如果没有 var_set 选项，直接返回全部
    if (varSetOptions.length === 0) return variablesData.items;
    // 按选中的 var_set 过滤
    return variablesData.items.filter(v => v.var_set === selectedVarSet);
  }, [isAdamigType, variablesData, varSetOptions, selectedVarSet]);

  // ========== 事件处理 ==========
  const handleStandardTypeChange = useCallback((key: string) => {
    setSelectedStandardKey(key);
    setSelectedVersionId(null);
    setSelectedDatasetId(null);
    setSelectedCtScopeNodeId(null); // 重置 CT 选择
    setSelectedCtType('sdtmct'); // 重置 CT 类型为默认的 SDTM CT
    setSelectedClassType(null); // 重置 Class 选择
    setVariableSearchText('');
    setCoreFilter(undefined);
    setPagination({ current: 1, pageSize: 20 });
  }, []);

  const handleVersionChange = useCallback(
    (key: string) => {
      const selected = versionOptions.find(opt => opt.key === key);
      if (selected?.specId) {
        setSelectedVersionId(selected.specId);
        setSelectedDatasetId(null);
        setSelectedClassType(null); // 重置 Class 选择
        setVariableSearchText('');
        setCoreFilter(undefined);
        setPagination({ current: 1, pageSize: 20 });
      }
    },
    [versionOptions]
  );

  // CT 版本切换
  const handleCtVersionChange = useCallback(
    (key: string) => {
      const selected = ctVersionOptions.find(opt => opt.key === key);
      if (selected?.scopeNodeId) {
        setSelectedCtScopeNodeId(selected.scopeNodeId);
      }
    },
    [ctVersionOptions]
  );

  const handleDatasetChange = useCallback((datasetId: number) => {
    setSelectedDatasetId(datasetId);
    setVariableSearchText('');
    setCoreFilter(undefined);
    setPagination({ current: 1, pageSize: 20 });
    setSelectedVarSet(null); // 重置 Variable Set 选择
  }, []);

  const handleTableChange = useCallback((paginationConfig: TablePaginationConfig) => {
    setPagination({
      current: paginationConfig.current || 1,
      pageSize: paginationConfig.pageSize || 20
    });
  }, []);

  // ========== Tabs 配置 ==========
  const tabItems: TabsProps['items'] = useMemo(() => {
    if (!standardTypeOptions.length) return [];
    return standardTypeOptions.map(standard => ({
      key: standard.key,
      label: (
        <span className={selectedStandardKey === standard.key ? 'font-medium' : ''}>
          {STANDARD_DISPLAY_NAMES[standard.key] || standard.key.toUpperCase()}
        </span>
      )
    }));
  }, [standardTypeOptions, selectedStandardKey]);

  const selectedDatasetInfo = useMemo(() => {
    if (!selectedDatasetId || !filteredDatasetOptions.length) return null;
    return filteredDatasetOptions.find(opt => opt.id === selectedDatasetId) || null;
  }, [selectedDatasetId, filteredDatasetOptions]);

  // ========== 渲染 ==========
  return (
    <div className="h-full flex flex-col gap-12px overflow-hidden">
      {treeError && (
        <Card
          className="flex-shrink-0"
          size="small"
          variant="borderless"
        >
          <Empty
            description="无法连接到后端服务，请检查服务是否在端口 8080 运行"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      )}

      {/* 顶部控制栏 */}
      <Card
        className="flex-shrink-0"
        size="small"
        variant="borderless"
      >
        <div className="flex items-center justify-between gap-16px">
          {standardTypeOptions.length > 0 && (
            <Tabs
              activeKey={selectedStandardKey || undefined}
              className="global-library-tabs"
              items={tabItems}
              size="small"
              onChange={handleStandardTypeChange}
            />
          )}

          {treeLoading && <span className="text-gray-400">{t('page.mdr.globalLibrary.loading')}</span>}

          <Space size={12}>
            {/* CT 版本选择器 - 两级筛选 */}
            {isCtType ? (
              <>
                {/* 第一级: CT 类型选择 */}
                <Select
                  className="w-140px"
                  size="small"
                  value={selectedCtType}
                  onChange={handleCtTypeChange}
                >
                  {availableCtTypes.map(opt => (
                    <Option
                      key={opt.key}
                      value={opt.key}
                    >
                      <Tag
                        className="text-10px"
                        color={opt.color}
                      >
                        {opt.label}
                      </Tag>
                      <Text
                        className="ml-4px text-10px"
                        type="secondary"
                      >
                        ({opt.count})
                      </Text>
                    </Option>
                  ))}
                </Select>
                {/* 第二级: 版本选择 */}
                <Select
                  showSearch
                  className="w-200px"
                  disabled={!selectedStandardKey || ctVersionOptions.length === 0}
                  placeholder={locale === 'zh' ? '选择版本' : 'Select Version'}
                  size="small"
                  value={
                    selectedCtScopeNodeId
                      ? ctVersionOptions.find(opt => opt.scopeNodeId === selectedCtScopeNodeId)?.key
                      : undefined
                  }
                  onChange={handleCtVersionChange}
                >
                  {ctVersionOptions.map(opt => {
                    // 提取版本日期部分，如 "SDTM CT 2025-09-26" -> "2025-09-26"
                    const versionDate = opt.label.replace(/.*?CT\s*/i, '').replace(/\s*\(.*\)/, '');
                    return (
                      <Option
                        key={opt.key}
                        value={opt.key}
                      >
                        <span>{versionDate}</span>
                      </Option>
                    );
                  })}
                </Select>
              </>
            ) : isAdamigType ? (
              /* ADaMIG: 只显示提示文字，标准类型和版本在下方标签栏选择 */
              <Text
                className="text-12px"
                type="secondary"
              >
                {selectedAdamigStandardType
                  ? `${ADAMIG_STANDARD_TYPES[selectedAdamigStandardType]?.label || selectedAdamigStandardType} - ${adamigCurrentVersions.find(v => v.specId === selectedVersionId) ? formatAdamigVersionNumber(adamigCurrentVersions.find(v => v.specId === selectedVersionId)!.label) : '选择版本'}`
                  : '请选择标准类型和版本'}
              </Text>
            ) : (
              /* 其他标准类型: 普通版本选择器 */
              <Select
                showSearch
                className="w-280px"
                disabled={!selectedStandardKey || versionOptions.length === 0}
                placeholder={t('page.mdr.globalLibrary.selectVersion')}
                size="small"
                value={
                  selectedVersionId ? versionOptions.find(opt => opt.specId === selectedVersionId)?.key : undefined
                }
                onChange={handleVersionChange}
              >
                {versionOptions.map(opt => (
                  <Option
                    key={opt.key}
                    value={opt.key}
                  >
                    <Space size={4}>
                      <Tag
                        className="text-10px"
                        color={getStandardTypeColor(selectedStandardKey || '')}
                      >
                        {STANDARD_DISPLAY_NAMES[selectedStandardKey || ''] || selectedStandardKey?.toUpperCase()}
                      </Tag>
                      <span className={isSpecialDomain(opt.label) ? 'text-gray-500' : ''}>
                        {formatVersionName(opt.label, selectedStandardKey || '')}
                      </span>
                    </Space>
                  </Option>
                ))}
              </Select>
            )}
            <ReloadOutlined
              className="cursor-pointer text-16px text-gray-400 hover:text-primary"
              onClick={() => refetchTree()}
            />
          </Space>
        </div>
      </Card>

      {/* ========== CT 多态渲染: CodelistViewer ========== */}
      {isCtType && selectedCtScopeNodeId && (
        <Card
          className="min-h-0 flex-1 overflow-hidden"
          size="small"
          variant="borderless"
          style={{ display: 'flex', flexDirection: 'column' }}
          styles={{ body: { display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', padding: 0 } }}
        >
          <CodelistViewer scopeNodeId={selectedCtScopeNodeId} />
        </Card>
      )}

      {/* ========== ADaMIG 渲染: 标签式标准类型选择 ========== */}
      {isAdamigType && selectedVersionId && (
        <>
          {/* 第一层: 标准类型标签 */}
          {adamigStandardTypeOptions.length > 0 && (
            <Card
              className="flex-shrink-0"
              size="small"
              variant="borderless"
            >
              <div className="mb-8px flex items-center gap-12px">
                <Text
                  strong
                  className="whitespace-nowrap text-13px"
                >
                  Standards:
                </Text>
                <div className="flex-1 overflow-x-auto">
                  <Radio.Group
                    buttonStyle="solid"
                    optionType="button"
                    size="small"
                    value={selectedAdamigStandardType}
                    onChange={e => {
                      setSelectedAdamigStandardType(e.target.value);
                      setSelectedVersionId(null);
                      setSelectedDatasetId(null);
                    }}
                  >
                    {adamigStandardTypeOptions.map(opt => (
                      <Radio.Button
                        key={opt.type}
                        value={opt.type}
                      >
                        <Tag
                          className="text-11px"
                          color={opt.config.color}
                        >
                          {opt.config.label}
                        </Tag>
                        <Text
                          className="ml-4px text-10px"
                          type="secondary"
                        >
                          ({opt.versions.length})
                        </Text>
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </div>
              </div>

              {/* 第二层: 版本选择 */}
              {adamigCurrentVersions.length > 0 && (
                <div className="flex items-center gap-12px">
                  <Text
                    className="whitespace-nowrap text-12px"
                    type="secondary"
                  >
                    Versions:
                  </Text>
                  <div className="flex-1 overflow-x-auto">
                    <Radio.Group
                      buttonStyle="solid"
                      optionType="button"
                      size="small"
                      value={selectedVersionId}
                      onChange={e => {
                        const selected = adamigCurrentVersions.find(opt => opt.specId === e.target.value);
                        if (selected) {
                          setSelectedVersionId(selected.specId);
                          setSelectedDatasetId(null);
                        }
                      }}
                    >
                      {adamigCurrentVersions.map(opt => (
                        <Radio.Button
                          key={opt.specId}
                          value={opt.specId}
                        >
                          <Text className="text-12px">{formatAdamigVersionNumber(opt.label)}</Text>
                        </Radio.Button>
                      ))}
                    </Radio.Group>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Dataset 选择器 + Variable Set 选择器（ADaMIG专用，同一行） */}
          <Card
            className="flex-shrink-0"
            size="small"
            variant="borderless"
          >
            <div className="flex flex-col gap-8px">
              {/* 第一行：Dataset 选择器 */}
              <div className="flex items-center gap-12px">
                <Text
                  strong
                  className="whitespace-nowrap text-13px"
                >
                  <DatabaseOutlined className="mr-4px" />
                  {t('page.mdr.globalLibrary.datasets')}:
                </Text>

                {datasetsLoading ? (
                  <Skeleton.Input
                    active
                    size="small"
                    style={{ width: 400 }}
                  />
                ) : filteredDatasetOptions.length > 0 ? (
                  <div className="flex-1 overflow-x-auto">
                    <Radio.Group
                      buttonStyle="solid"
                      optionType="button"
                      size="small"
                      value={selectedDatasetId}
                      onChange={(e: RadioChangeEvent) => handleDatasetChange(e.target.value)}
                    >
                      {filteredDatasetOptions.map(opt => (
                        <Radio.Button
                          key={opt.id}
                          value={opt.id}
                        >
                          <Tooltip
                            title={`${opt.description || ''} (${opt.classType})${opt.variableCount ? ` - ${opt.variableCount} vars` : ''}`}
                          >
                            <Text className="text-12px">{opt.name}</Text>
                          </Tooltip>
                        </Radio.Button>
                      ))}
                    </Radio.Group>
                  </div>
                ) : (
                  <Text type="secondary">该版本下暂无数据集</Text>
                )}

                {filteredDatasetOptions.length > 0 && !varSetOptions.length && (
                  <Tag
                    className="flex-shrink-0"
                    color="green"
                  >
                    {filteredDatasetOptions.length} Datasets
                  </Tag>
                )}
              </div>

              {/* 第二行：Variable Set 选择器（ADaMIG v1.3+ 专用） */}
              {varSetOptions.length > 0 && (
                <div className="flex items-center gap-12px">
                  <Text
                    className="whitespace-nowrap text-12px"
                    type="secondary"
                  >
                    Variable Sets:
                  </Text>
                  <div className="flex-1 overflow-x-auto">
                    <Radio.Group
                      buttonStyle="solid"
                      optionType="button"
                      size="small"
                      value={selectedVarSet}
                      onChange={e => setSelectedVarSet(e.target.value)}
                    >
                      {varSetOptions.map(vs => (
                        <Radio.Button
                          key={vs}
                          value={vs}
                        >
                          <Text className="text-11px">{vs}</Text>
                        </Radio.Button>
                      ))}
                    </Radio.Group>
                  </div>
                  <Tag
                    className="flex-shrink-0"
                    color="purple"
                  >
                    {varSetOptions.length} Sets
                  </Tag>
                </div>
              )}
            </div>
          </Card>

          {/* Variables 表格 */}
          <Card
            className="min-h-0 flex flex-col flex-1 overflow-hidden"
            size="small"
            variant="borderless"
            extra={
              selectedDatasetId && (
                <Space size={8}>
                  <Select
                    allowClear
                    className="w-80px"
                    placeholder="Core"
                    size="small"
                    value={coreFilter}
                    onChange={setCoreFilter}
                  >
                    <Option value="Req">
                      <Tag color="red">Req</Tag>
                    </Option>
                    <Option value="Perm">
                      <Tag color="blue">Perm</Tag>
                    </Option>
                    <Option value="Exp">
                      <Tag color="orange">Exp</Tag>
                    </Option>
                  </Select>
                  <Search
                    allowClear
                    className="w-180px"
                    placeholder={t('page.mdr.globalLibrary.searchPlaceholder')}
                    size="small"
                    value={variableSearchText}
                    onChange={e => {
                      setVariableSearchText(e.target.value);
                      setPagination(prev => ({ ...prev, current: 1 }));
                    }}
                  />
                </Space>
              )
            }
            title={
              <Space>
                <Text
                  strong
                  className="text-14px"
                >
                  {t('page.mdr.globalLibrary.variables')}
                </Text>
                {selectedDatasetInfo && (
                  <>
                    <Tag color="green">{selectedDatasetInfo.name}</Tag>
                    <Text
                      className="text-12px"
                      type="secondary"
                    >
                      {selectedDatasetInfo.description}
                    </Text>
                  </>
                )}
                {variablesData && (
                  <Tag color="blue">
                    {selectedVarSet && varSetOptions.length > 0
                      ? `${filteredVariables.length} / ${variablesData.total} Variables`
                      : `${variablesData.total} Variables`}
                  </Tag>
                )}
              </Space>
            }
          >
            {!selectedDatasetId ? (
              <div className="h-full flex-center">
                <Empty
                  description="请从上方选择一个 Dataset"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            ) : variablesLoading ? (
              <Skeleton
                active
                paragraph={{ rows: 10 }}
              />
            ) : variablesError ? (
              <Empty
                description={t('page.mdr.globalLibrary.loadError')}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : variablesData?.items && variablesData.items.length > 0 ? (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-auto">
                  <Table
                    bordered
                    columns={variableColumns}
                    dataSource={filteredVariables}
                    pagination={false}
                    rowKey="id"
                    scroll={{ x: 1800 }}
                    size="small"
                    components={{
                      header: {
                        cell: ResizableTitle
                      }
                    }}
                    onChange={handleTableChange}
                  />
                </div>
                <div className="flex-shrink-0 pt-16px">
                  <Space size="middle">
                    <Pagination
                      showQuickJumper
                      showSizeChanger
                      current={pagination.current}
                      pageSize={pagination.pageSize}
                      pageSizeOptions={['10', '20', '50', '100']}
                      showTotal={total => t('page.mdr.globalLibrary.total', { count: total })}
                      total={filteredVariables.length}
                      onChange={(page, pageSize) => {
                        setPagination({ current: page, pageSize });
                      }}
                    />
                  </Space>
                </div>
              </div>
            ) : (
              <Empty
                description={t('page.mdr.globalLibrary.noData')}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </>
      )}

      {/* ========== 非 CT / 非 ADaMIG 渲染: DatasetVariableViewer ========== */}
      {!isCtType && !isAdamigType && selectedVersionId && (
        <>
          {/* SDTM Model / SDTM IG: 两层横向标签 */}
          {useClassHierarchy && currentClassGroups.length > 0 && (
            <Card
              className="flex-shrink-0"
              size="small"
              variant="borderless"
            >
              {/* 第一层: Classes */}
              <div className="mb-8px flex items-center gap-12px">
                <Text
                  strong
                  className="whitespace-nowrap text-13px"
                >
                  Classes:
                </Text>
                <div className="flex-1 overflow-x-auto">
                  <Radio.Group
                    buttonStyle="solid"
                    optionType="button"
                    size="small"
                    value={selectedClassType}
                    onChange={e => {
                      setSelectedClassType(e.target.value);
                      setSelectedDatasetId(null);
                    }}
                  >
                    {currentClassGroups.map(group => (
                      <Radio.Button
                        key={group.classType}
                        value={group.classType}
                      >
                        <Tag
                          className="text-11px"
                          color={group.config.color}
                        >
                          {group.config.label}
                        </Tag>
                        <Text
                          className="ml-4px text-10px"
                          type="secondary"
                        >
                          ({group.datasets.length})
                        </Text>
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </div>
              </div>

              {/* 第二层: Datasets (如果该 Class 有多个 dataset) */}
              {currentClassDatasets.length > 1 && (
                <div className="flex items-center gap-12px">
                  <Text
                    className="whitespace-nowrap text-12px"
                    type="secondary"
                  >
                    Datasets:
                  </Text>
                  <div className="flex-1 overflow-x-auto">
                    <Radio.Group
                      buttonStyle="solid"
                      optionType="button"
                      size="small"
                      value={selectedDatasetId}
                      onChange={(e: RadioChangeEvent) => handleDatasetChange(e.target.value)}
                    >
                      {currentClassDatasets.map(opt => (
                        <Radio.Button
                          key={opt.id}
                          value={opt.id}
                        >
                          <Tooltip title={`${opt.description || ''} - ${opt.variableCount} vars`}>
                            <Text className="text-12px">{opt.name}</Text>
                            <Text
                              className="ml-4px text-10px"
                              type="secondary"
                            >
                              ({opt.variableCount})
                            </Text>
                          </Tooltip>
                        </Radio.Button>
                      ))}
                    </Radio.Group>
                  </div>
                </div>
              )}

              {/* 如果只有一个 dataset，直接显示名称 */}
              {currentClassDatasets.length === 1 && (
                <div className="flex items-center gap-12px">
                  <Text
                    className="whitespace-nowrap text-12px"
                    type="secondary"
                  >
                    Dataset:
                  </Text>
                  <Tag color="blue">{currentClassDatasets[0].name}</Tag>
                  <Text
                    className="text-11px"
                    type="secondary"
                  >
                    {currentClassDatasets[0].description}
                  </Text>
                  <Text
                    className="text-10px"
                    type="secondary"
                  >
                    ({currentClassDatasets[0].variableCount} vars)
                  </Text>
                </div>
              )}
            </Card>
          )}

          {/* 非 SDTM Model/IG: 普通 Dataset 选择器 */}
          {!useClassHierarchy && selectedStandardKey !== 'sdtm' && (
            <Card
              className="flex-shrink-0"
              size="small"
              variant="borderless"
            >
              <div className="flex items-center gap-12px">
                <Text
                  strong
                  className="whitespace-nowrap text-13px"
                >
                  <DatabaseOutlined className="mr-4px" />
                  {t('page.mdr.globalLibrary.datasets')}:
                </Text>

                {datasetsLoading ? (
                  <Skeleton.Input
                    active
                    size="small"
                    style={{ width: 400 }}
                  />
                ) : filteredDatasetOptions.length > 0 ? (
                  <div className="flex-1 overflow-x-auto">
                    <Radio.Group
                      buttonStyle="solid"
                      optionType="button"
                      size="small"
                      value={selectedDatasetId}
                      onChange={(e: RadioChangeEvent) => handleDatasetChange(e.target.value)}
                    >
                      {filteredDatasetOptions.map(opt => (
                        <Radio.Button
                          key={opt.id}
                          value={opt.id}
                        >
                          <Tooltip
                            title={`${opt.description || ''} (${opt.classType})${opt.variableCount ? ` - ${opt.variableCount} vars` : ''}`}
                          >
                            <Text className="text-12px">{opt.name}</Text>
                          </Tooltip>
                        </Radio.Button>
                      ))}
                    </Radio.Group>
                  </div>
                ) : (
                  <Text type="secondary">该版本下暂无数据集</Text>
                )}

                {filteredDatasetOptions.length > 0 && (
                  <Tag
                    className="flex-shrink-0"
                    color="blue"
                  >
                    {filteredDatasetOptions.length} Datasets
                  </Tag>
                )}
              </div>
            </Card>
          )}

          {/* Variables 表格 */}
          <Card
            className="min-h-0 flex flex-col flex-1 overflow-hidden"
            size="small"
            variant="borderless"
            extra={
              selectedDatasetId && (
                <Space size={8}>
                  <Select
                    allowClear
                    className="w-80px"
                    placeholder="Core"
                    size="small"
                    value={coreFilter}
                    onChange={setCoreFilter}
                  >
                    <Option value="Req">
                      <Tag color="red">Req</Tag>
                    </Option>
                    <Option value="Perm">
                      <Tag color="blue">Perm</Tag>
                    </Option>
                    <Option value="Exp">
                      <Tag color="orange">Exp</Tag>
                    </Option>
                  </Select>
                  <Search
                    allowClear
                    className="w-180px"
                    placeholder={t('page.mdr.globalLibrary.searchPlaceholder')}
                    size="small"
                    value={variableSearchText}
                    onChange={e => {
                      setVariableSearchText(e.target.value);
                      setPagination(prev => ({ ...prev, current: 1 }));
                    }}
                  />
                </Space>
              )
            }
            title={
              <Space>
                <Text
                  strong
                  className="text-14px"
                >
                  {t('page.mdr.globalLibrary.variables')}
                </Text>
                {selectedDatasetInfo && (
                  <>
                    <Tag color={CLASS_COLOR_MAP[selectedDatasetInfo.classType] || 'default'}>
                      {selectedDatasetInfo.name}
                    </Tag>
                    <Text
                      className="text-12px"
                      type="secondary"
                    >
                      {selectedDatasetInfo.description}
                    </Text>
                  </>
                )}
                {variablesData && <Tag color="green">{variablesData.total} Variables</Tag>}
              </Space>
            }
          >
            {!selectedDatasetId ? (
              <div className="h-full flex-center">
                <Empty
                  description="请从上方选择一个 Dataset"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            ) : variablesLoading ? (
              <Skeleton
                active
                paragraph={{ rows: 10 }}
              />
            ) : variablesError ? (
              <Empty
                description={t('page.mdr.globalLibrary.loadError')}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : variablesData?.items && variablesData.items.length > 0 ? (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-auto">
                  <Table
                    bordered
                    className={selectedStandardKey === 'sdtm' ? 'sdtm-model-table' : ''}
                    columns={variableColumns}
                    dataSource={variablesData.items}
                    pagination={false}
                    rowKey="id"
                    scroll={{ x: 1800 }}
                    size="small"
                    components={{
                      header: {
                        cell: ResizableTitle
                      }
                    }}
                    onChange={handleTableChange}
                  />
                </div>
                <div className="flex-shrink-0 pt-16px">
                  <Space size="middle">
                    <Pagination
                      showQuickJumper
                      showSizeChanger
                      current={pagination.current}
                      pageSize={pagination.pageSize}
                      pageSizeOptions={['10', '20', '50', '100']}
                      showTotal={total => t('page.mdr.globalLibrary.total', { count: total })}
                      total={variablesData.total}
                      onChange={(page, pageSize) => {
                        setPagination({ current: page, pageSize });
                      }}
                    />
                  </Space>
                </div>
              </div>
            ) : (
              <Empty
                description={t('page.mdr.globalLibrary.noData')}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </>
      )}

      {/* 未选择版本时的提示 */}
      {!isCtType && !selectedVersionId && !treeLoading && standardTypeOptions.length > 0 && (
        <Card
          className="flex-1"
          size="small"
          variant="borderless"
        >
          <div className="h-full flex-center">
            <Empty
              description="请选择一个版本"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        </Card>
      )}
    </div>
  );
};

export default GlobalLibrary;
