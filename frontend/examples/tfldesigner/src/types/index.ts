/**
 * TFL Designer - TypeScript 类型定义
 */

// ============ Study 相关 ============

export interface Study {
  id: string;
  studyId: string;
  title: string;
  compound: string;
  phase: string;
  diseaseArea: string;
  therapeuticArea: string;
  createdAt: string;
  updatedAt: string;
}

// ============ Treatment Arm Set ============

export interface TreatmentArm {
  id: string;
  name: string;
  order: number;
  grouping?: string;
  N?: number | string;  // 样本量，可以是数字或占位符
}

export interface TreatmentArmSet {
  id: string;
  name: string;
  arms: TreatmentArm[];
}

// ============ Statistics Set ============

export interface StatisticsConfig {
  continuous: ContinuousStats[];
  categorical: CategoricalStats[];
  survival?: SurvivalStats[];
}

export interface ContinuousStats {
  type: 'n' | 'mean' | 'sd' | 'median' | 'min' | 'max' | 'range';
  label: string;
  format: string;  // e.g., "XX.XX"
}

export interface CategoricalStats {
  type: 'n' | 'percent' | 'n_percent';
  label: string;
  format: string;
}

export interface SurvivalStats {
  type: 'median' | 'ci' | 'hr' | 'pvalue';
  label: string;
  format: string;
}

// ============ Table 相关 ============

export type AnalysisCategory = 
  | 'Demographics'
  | 'Disposition'
  | 'Protocol_Deviations'
  | 'Adverse_Events'
  | 'Laboratory'
  | 'Vital_Signs'
  | 'Concomitant_Meds'
  | 'Efficacy'
  | 'Other'

// Table column type for Ant Design Table
export interface TableColumn {
  title: React.ReactNode | string;
  dataIndex?: string;
  key: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (text: unknown, record?: unknown, index?: number) => React.ReactNode;
  children?: TableColumn[];  // For nested columns
};

export interface TableShell {
  id: string;
  shellNumber: string;
  title: string;
  population: string;
  category: AnalysisCategory;
  dataset: string;  // ADSL, ADAE, ADLB, etc.
  
  // 列配置
  treatmentArmSetId: string;
  statisticsSetId: string;
  
  // 行结构
  rows: TableRow[];
  
  // 页脚
  footer: TableFooter;
}

export interface TableRow {
  id: string;
  label: string;
  level: number;  // 嵌套层级 0, 1, 2...
  indent?: number;
  variable?: string;  // 对应的数据变量
  analysisOfInterest?: string;
  children?: TableRow[];
  
  // 统计量配置
  stats?: RowStats[];
  
  // SOC/PT 支持 (不良事件表格)
  isSOC?: boolean;     // 是否为 SOC 行
  socCode?: string;    // MedDRA SOC 代码
  ptCode?: string;     // MedDRA PT 代码
  
  // 展开状态
  expanded?: boolean;
}

// ============ SOC/PT 嵌套数据结构 ============
// 用于不良事件表格的层级展示

/**
 * MedDRA 编码节点基类
 */
export interface MedDRANode {
  code: string;      // MedDRA 编码，如 "10017962"
  name: string;      // 标准名称
  shortName?: string; // 简称（可选）
}

/**
 * SOC (System Organ Class) - 系统器官分类
 * 最高层级分类
 */
export interface SOCNode extends MedDRANode {
  id: string;
  type: 'SOC';
  expanded?: boolean;     // UI 展开状态
  ptNodes: PTNode[];       // 包含的 PT 节点
  stats?: SOCStats;        // SOC 层级汇总统计
  sortOrder?: number;      // 排序权重
  isFiltered?: boolean;    // 筛选标记
}

/**
 * PT (Preferred Term) - 首选语
 * 中间层级分类
 */
export interface PTNode extends MedDRANode {
  id: string;
  type: 'PT';
  socId: string;           // 所属 SOC ID
  socCode: string;         // 所属 SOC Code
  expanded?: boolean;
  eventNodes: EventNode[]; // 具体事件
  stats?: PTStats;
  sortOrder?: number;
  isFiltered?: boolean;
}

/**
 * Event - 具体不良事件
 * 最细粒度的事件记录
 */
export interface EventNode extends MedDRANode {
  id: string;
  type: 'Event';
  ptId: string;            // 所属 PT ID
  ptCode: string;          // 所属 PT Code
  socCode: string;         // 所属 SOC Code
  
  // 事件详细信息
  verbatim?: string;       // 受试者原始描述
  severity?: 'Mild' | 'Moderate' | 'Severe';
  causality?: 'Related' | 'Not Related';
  outcome?: string;        // 结局: Recovered, Ongoing, Fatal, etc.
  actionTaken?: string;    // 采取的措施
  
  // 统计数据（按治疗组）
  stats?: EventStats;
  sortOrder?: number;
  isFiltered?: boolean;
}

/**
 * SOC 层级统计数据
 */
export interface SOCStats {
  subjectCount: Record<string, number>;     // 各组受试者数 { armId: count }
  subjectPercent?: Record<string, number>;  // 各组百分比
  eventCount?: Record<string, number>;      // 各组事件数
  totalSubjects?: number;                   // 总受试者数
}

/**
 * PT 层级统计数据
 */
export interface PTStats extends SOCStats {
  // 可继承 SOC 统计或添加 PT 特有统计
}

/**
 * Event 层级统计数据
 */
export interface EventStats {
  // 按 ARM 分组的统计
  byArm: Record<string, ArmEventStats>;
}

/**
 * 单个 ARM 的事件统计
 */
export interface ArmEventStats {
  n: number;              // 发生例数
  percent?: number;       // 百分比
  grade?: Record<string, number>;  // 按严重程度: { 'Mild': 5, 'Moderate': 3, 'Severe': 1 }
  causality?: Record<string, number>;  // 按因果关系
  outcome?: Record<string, number>;   // 按结局
}

/**
 * SOC/PT 数据树结构
 * 用于不良事件表格的整体数据
 */
export interface AEDataTree {
  studyId: string;
  population: string;      // 分析人群
  socNodes: SOCNode[];     // SOC 节点数组
  
  // 筛选和排序状态
  filters?: AETreeFilter;
  sortConfig?: AETreeSort;
}

/**
 * SOC/PT 树筛选配置
 */
export interface AETreeFilter {
  socCodes?: string[];     // 筛选特定 SOC
  ptCodes?: string[];      // 筛选特定 PT
  minSubjects?: number;    // 最小发生人数
  severity?: ('Mild' | 'Moderate' | 'Severe')[];
  causality?: ('Related' | 'Not Related')[];
}

/**
 * SOC/PT 树排序配置
 */
export interface AETreeSort {
  field: 'name' | 'subjectCount' | 'eventCount' | 'sortOrder';
  order: 'asc' | 'desc';
  scope: 'SOC' | 'PT' | 'Event';  // 排序作用范围
}

/**
 * SOC/PT 行配置（用于表格渲染）
 * 扩展基础 TableRow，添加 SOC/PT 特有字段
 */
export interface SOCPTRowConfig extends TableRow {
  // 层级标识
  nodeType: 'SOC' | 'PT' | 'Event';
  
  // MedDRA 信息
  code: string;
  meddraName: string;
  
  // 层级关系
  socId?: string;          // PT/Event 的所属 SOC
  ptId?: string;           // Event 的所属 PT
  
  // 展开控制
  isExpanded?: boolean;
  hasChildren?: boolean;
  
  // 筛选状态
  isFiltered?: boolean;
  
  // 行样式
  rowStyle?: 'header' | 'data' | 'summary';
  className?: string;
  
  // 数据引用
  dataRef?: SOCNode | PTNode | EventNode;
}

/**
 * SOC/PT 工具函数类型
 */
export interface SOCPTHelpers {
  // 扁平化树为行数组
  flattenTree: (tree: AEDataTree, expandedOnly?: boolean) => SOCPTRowConfig[];
  
  // 切换展开状态
  toggleExpand: (nodeId: string, nodeType: 'SOC' | 'PT') => void;
  
  // 全部展开/折叠
  expandAll: () => void;
  collapseAll: () => void;
  
  // 筛选
  filterTree: (filters: AETreeFilter) => AEDataTree;
  
  // 排序
  sortTree: (sortConfig: AETreeSort) => AEDataTree;
  
  // 查找
  findNode: (code: string, nodeType: 'SOC' | 'PT' | 'Event') => SOCNode | PTNode | EventNode | undefined;
  
  // 统计汇总
  aggregateStats: (node: SOCNode | PTNode) => SOCStats | PTStats;
}

export interface RowStats {
  type: string;
  decimals?: number;
  format?: string;
}

export interface TableFooter {
  source?: string;
  notes?: string[];
  abbreviations?: Record<string, string>;
}

// ============ Figure 相关 ============

export type ChartType = 
  | 'line'
  | 'scatter'
  | 'bar'
  | 'box'
  | 'violin'
  | 'heatmap'
  | 'waterfall'
  | 'km_curve';  // Kaplan-Meier

export interface FigureShell {
  id: string;
  figureNumber: string;
  title: string;
  population: string;
  
  chartType: ChartType;
  
  // X/Y 轴配置
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  
  // 数据系列
  series: ChartSeries[];
  
  // 图例
  legend?: LegendConfig;
  
  // 样式
  style?: FigureStyle;
}

export interface AxisConfig {
  label: string;
  type: 'continuous' | 'categorical' | 'date';
  range?: [number, number];
  tickFormat?: string;
  logScale?: boolean;
}

export interface ChartSeries {
  id: string;
  name: string;
  type?: string;  // 覆盖默认类型
  color?: string;
  marker?: MarkerConfig;
  line?: LineConfig;
}

export interface MarkerConfig {
  symbol?: string;
  size?: number;
  color?: string;
}

export interface LineConfig {
  width?: number;
  dash?: 'solid' | 'dash' | 'dot';
}

export interface LegendConfig {
  position: 'top' | 'bottom' | 'left' | 'right';
  orientation: 'horizontal' | 'vertical';
}

export interface FigureStyle {
  width?: number;
  height?: number;
  fontFamily?: string;
  fontSize?: number;
}

// ============ Listing 相关 ============

export interface ListingShell {
  id: string;
  listingNumber: string;
  title: string;
  population: string;
  dataset: string;
  
  columns: ListingColumn[];
  sortBy?: SortConfig[];
  filter?: FilterConfig[];
  
  // 分页
  pageSize?: number;
}

export interface ListingColumn {
  id: string;
  name: string;  // 变量名
  label: string;  // 显示标签
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: string;
  hidden?: boolean;
}

export interface SortConfig {
  columnId: string;
  order: 'asc' | 'desc';
  priority: number;
}

export interface FilterConfig {
  columnId: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'ge' | 'le' | 'contains' | 'in' | 'is_null' | 'not_null';
  value: string | string[];
}

// ============ Template 相关 ============

export interface Template {
  id: string;
  type: 'table' | 'figure' | 'listing';
  name: string;
  category: AnalysisCategory;
  description?: string;
  shell: TableShell | FigureShell | ListingShell;
  createdAt: string;
}

// ============ Export 相关 ============

export interface ExportConfig {
  format: 'word' | 'rtf' | 'pdf';
  includePageNumbers: boolean;
  includeHeaders: boolean;
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}