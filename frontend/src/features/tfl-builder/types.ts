/**
 * CDISC ARS (Analysis Results Standard) Type Definitions
 *
 * 基于 CDISC ARS 1.0 规范的 TypeScript 接口定义 用于 TFL Mock Shell 编辑器的底层数据模型
 *
 * @see https://www.cdisc.org/standards/foundational/analysis-results-standard
 */

// ==================== 基础枚举类型 ====================

/** TFL 输出类型 */
export type OutputType = 'Figure' | 'Listing' | 'Table';

/** 文本对齐方式 */
export type TextAlignment = 'center' | 'left' | 'right';

/** 显示区域类型 */
export type DisplaySectionType =
  | 'Body' // 标题
  | 'ColumnHeader' // 副标题
  | 'Footnote' // 列头/表头
  | 'Reference' // 行标签头（左侧第一列）
  | 'RowLabelHeader' // 主体数据区
  | 'Subtitle' // 脚注
  | 'Title'; // 参考文献

/** 数据类型 */
export type DataType = 'categorical' | 'date' | 'datetime' | 'numeric' | 'text';

/** 统计方法类型 (CDISC Controlled Terminology) */
export type MethodType =
  | 'ci' // Count
  | 'custom' // Mean
  | 'cv' // Standard Deviation
  | 'freq' // Standard Error
  | 'geoCV' // Median
  | 'geoMean' // Minimum
  | 'iqr' // Maximum
  | 'max' // Range (Min-Max)
  | 'mean' // 25th Percentile
  | 'median' // 75th Percentile
  | 'min' // Interquartile Range
  | 'missing' // Coefficient of Variation
  | 'n' // Geometric Mean
  | 'pct' // Geometric CV
  | 'pValue' // Sum
  | 'q1' // Percentage
  | 'q3' // Frequency
  | 'range' // Missing Count
  | 'sd' // P-value
  | 'se' // Confidence Interval
  | 'sum'; // Custom Method

/** 行类型 */
export type RowType =
  | 'blank' // 分组标题行
  | 'data' // 数据行
  | 'header' // 总计行
  | 'indent' // 小计行
  | 'subtotal' // 空行
  | 'total'; // 缩进行

/** 分组层级类型 */
export type GroupingLevel = 'column' | 'row';

// ==================== ARS 核心实体 ====================

/**
 * 分析分组 (Analysis Grouping)
 *
 * 定义治疗组和对照组，用于生成表头 例如: Placebo, Low Dose, High Dose
 */
export interface IAnalysisGrouping {
  /** 分组代码 (用于数据筛选) */
  code: string;
  /** 分组条件 (SAS/数据筛选逻辑) */
  condition?: string;
  /** 分组描述 */
  description?: string;
  /** 分组唯一标识 */
  id: string;
  /** 层级 (支持嵌套分组) */
  level: number;
  /** 分组名称 (显示在表头) */
  name: string;
  /** 显示顺序 */
  order: number;
  /** 父分组 ID (用于嵌套分组) */
  parentGroupId?: string;
  /** 样式配置 */
  style?: {
    backgroundColor?: string;
    color?: string;
    fontWeight?: 'bold' | 'normal';
  };
  /** 子分组 (嵌套结构) */
  subGroups?: IAnalysisGrouping[];
}

/**
 * 统计方法定义 (Method)
 *
 * 定义统计方法及其显示格式
 */
export interface IMethod {
  /** 组合方法 (如 Mean(SD)) */
  combinedMethods?: MethodType[];
  /** 小数位数 */
  decimalPlaces?: number;
  /** 方法描述 */
  description?: string;
  /** 方法唯一标识 */
  id: string;
  /** 方法名称 */
  name: string;
  /** 关联的操作 */
  operations?: IOperation[];
  /** 结果展示模式 (占位符格式) */
  resultPattern: string;
  /** 是否显示百分号 */
  showPercentSign?: boolean;
  /** 方法类型 */
  type: MethodType;
}

/**
 * 统计操作 (Operation)
 *
 * 定义具体的计算操作
 */
export interface IOperation {
  /** 操作 ID */
  id: string;
  /** 关联的方法 ID */
  methodId: string;
  /** 操作名称 */
  name: string;
  /** 参数配置 */
  params?: Record<string, unknown>;
  /** 结果变量名 */
  resultVariable?: string;
}

/**
 * 显示区块 (Display Section)
 *
 * TFL 的各个显示区域
 */
export interface IDisplaySection {
  /** 区块内容 */
  content: IDisplaySectionContent;
  /** 区块唯一标识 */
  id: string;
  /** 显示顺序 */
  order: number;
  /** 样式配置 */
  style?: IDisplayStyle;
  /** 区块类型 */
  type: DisplaySectionType;
}

/** 显示区块内容 (多态结构) */
export type IDisplaySectionContent =
  | ITextContent // 标题、脚注等文本
  | IColumnHeaderContent // 列头
  | IBodyContent; // 主体数据

/** 文本内容 */
export interface ITextContent {
  /** 对齐方式 */
  alignment: TextAlignment;
  /** 是否加粗 */
  bold?: boolean;
  /** 字体大小 */
  fontSize?: number;
  /** 缩进级别 */
  indentLevel?: number;
  /** 是否斜体 */
  italic?: boolean;
  /** 上标/下标 */
  subscript?: boolean;
  superscript?: boolean;
  /** 文本内容 */
  text: string;
  /** 是否下划线 */
  underline?: boolean;
}

/** 列头内容 */
export interface IColumnHeaderContent {
  /** 列头单元格 */
  cells: IColumnHeaderCell[];
  /** 是否跨列显示 */
  spanningHeaders?: ISpanningHeader[];
}

/** 列头单元格 */
export interface IColumnHeaderCell {
  /** 对齐方式 */
  alignment: TextAlignment;
  /** 跨列数 */
  colSpan?: number;
  /** 关联的分组 ID */
  groupingId: string;
  /** 单元格 ID */
  id: string;
  /** 跨行数 */
  rowSpan?: number;
  /** 显示文本 */
  text: string;
  /** 列宽 */
  width?: number;
}

/** 跨列头 (Spanning Header) */
export interface ISpanningHeader {
  /** 结束列索引 */
  endCol: number;
  /** 跨列头 ID */
  id: string;
  /** 层级 */
  level: number;
  /** 起始列索引 */
  startCol: number;
  /** 显示文本 */
  text: string;
}

/** 主体数据内容 */
export interface IBodyContent {
  /** 数据行 */
  rows: IBodyRow[];
}

/** 主体数据行 */
export interface IBodyRow {
  /** 关联的统计方法 */
  boundMethod?: IBoundMethod;
  /** 关联的数据变量 */
  boundVariable?: IBoundVariable;
  /** 单元格列表 */
  cells: IBodyCell[];
  /** 子行 (用于嵌套结构) */
  children?: IBodyRow[];
  /** 关联的分析分组 */
  groupingId?: string;
  /** 行 ID */
  id: string;
  /** 缩进级别 */
  indentLevel: number;
  /** 是否可拖拽 */
  isDraggable?: boolean;
  /** 是否展开 */
  isExpanded?: boolean;
  /** 行标签 (第一列文本) */
  label: string;
  /** 行类型 */
  rowType: RowType;
}

/** 主体数据单元格 */
export interface IBodyCell {
  /** 对齐方式 */
  alignment: TextAlignment;
  /** 单元格类型 */
  cellType: 'data' | 'empty' | 'placeholder';
  /** 小数位数 */
  decimalPlaces?: number;
  /** 关联的分组 ID (列) */
  groupingId: string;
  /** 单元格 ID */
  id: string;
  /** 关联的方法覆盖 */
  methodOverride?: string;
  /** 显示文本/占位符 */
  text: string;
}

/** 绑定变量 */
export interface IBoundVariable {
  /** 数据集 ID */
  datasetId: string;
  /** 数据集名 */
  datasetName: string;
  /** 变量 ID */
  variableId: string;
  /** 变量名 */
  variableName: string;
}

/** 绑定方法 */
export interface IBoundMethod {
  /** 显示格式覆盖 */
  displayFormat?: string;
  /** 方法 ID */
  methodId: string;
  /** 方法类型 */
  methodType: MethodType;
}

/** 显示样式 */
export interface IDisplayStyle {
  /** 背景色 */
  backgroundColor?: string;
  /** 边框样式 */
  borderStyle?: 'dashed' | 'none' | 'solid';
  /** 字体 */
  fontFamily?: string;
  /** 字号 */
  fontSize?: number;
  /** 对齐 */
  textAlign?: TextAlignment;
  /** 文字颜色 */
  textColor?: string;
  /** 垂直对齐 */
  verticalAlign?: 'bottom' | 'middle' | 'top';
}

// ==================== Display (展示) ====================

/**
 * 显示定义 (Display)
 *
 * 一个完整的 TFL 展示，包含所有显示区块
 */
export interface IDisplay {
  /** 显示区块列表 */
  displaySections: IDisplaySection[];
  /** 显示 ID */
  id: string;
  /** 元数据 */
  metadata: IDisplayMetadata;
  /** 显示名称 */
  name: string;
  /** 显示顺序 */
  order: number;
  /** 页面方向 */
  orientation?: 'landscape' | 'portrait';
  /** 页面大小 */
  pageSize?: 'a4' | 'legal' | 'letter';
  /** 显示类型 */
  type: OutputType;
}

/** 显示元数据 */
export interface IDisplayMetadata {
  /** 创建时间 */
  createdAt: string;
  /** 创建者 */
  createdBy: string;
  /** 审核时间 */
  reviewedAt?: string;
  /** 审核者 */
  reviewedBy?: string;
  /** 状态 */
  status: 'Approved' | 'Draft' | 'Final' | 'Review';
  /** 更新时间 */
  updatedAt: string;
  /** 更新者 */
  updatedBy: string;
  /** 版本号 */
  version: number;
}

// ==================== Output (输出) ====================

/**
 * 输出定义 (Output)
 *
 * 代表一个独立的 TFL 输出文件
 */
export interface IOutput {
  /** 分析数据集 */
  analysisDatasets?: string[];
  /** 关联的显示 */
  displayId: string;
  /** 输出 ID */
  id: string;
  /** 输出名称 */
  name: string;
  /** 显示顺序 */
  order: number;
  /** 输出编号 (如 14.1.1.2) */
  outputId: string;
  /** 程序文件名 */
  programName?: string;
  /** 分析目的描述 */
  purpose?: string;
  /** 输出类型 */
  type: OutputType;
}

// ==================== ARS 文档根结构 ====================

/**
 * ARS 文档 (Analysis Results Standard Document)
 *
 * 完整的 ARS JSON 文档结构
 */
export interface IARSDocument {
  /** 分析分组列表 */
  analysisGroupings: IAnalysisGrouping[];
  /** 分析标识 */
  analysisId: string;
  /** 显示列表 */
  displays: IDisplay[];
  /** 文档 ID */
  id: string;
  /** 元数据 */
  metadata: {
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
  };
  /** 方法列表 */
  methods: IMethod[];
  /** 输出列表 */
  outputs: IOutput[];
  /** 研究标识 */
  studyId: string;
  /** 文档版本 */
  version: string;
}

// ==================== 编辑器状态类型 ====================

/** 选中元素类型 */
export type SelectedElementType =
  | 'bodyCell' // 输出项
  | 'bodyRow' // 显示
  | 'columnHeader' // 标题
  | 'display' // 副标题
  | 'footnote' // 列头
  | 'none' // 跨列头
  | 'output' // 行标签头
  | 'rowLabelHeader' // 数据行
  | 'spanningHeader' // 数据单元格
  | 'subtitle' // 脚注
  | 'title'; // 未选中

/** 选中元素信息 */
export interface ISelectedElement {
  /** 列索引 (用于单元格) */
  colIndex?: number;
  /** 显示 ID */
  displayId?: string;
  /** 元素 ID */
  id: string | null;
  /** 父元素 ID */
  parentId?: string;
  /** 行索引 (用于数据行) */
  rowIndex?: number;
  /** 元素类型 */
  type: SelectedElementType;
}

/** 历史记录条目 */
export interface IHistoryEntry {
  /** 操作描述 */
  action: string;
  /** 状态快照 */
  snapshot: IARSDocument;
  /** 时间戳 */
  timestamp: number;
}

/** 编辑器 UI 状态 */
export interface IEditorUIState {
  /** 当前激活的显示 Tab */
  activeDisplayId: string | null;
  /** 是否预览模式 */
  isPreviewMode: boolean;
  /** 左侧面板 Tab */
  leftPanelTab: 'groupings' | 'methods' | 'outputs';
  /** 左侧面板宽度 */
  leftPanelWidth: number;
  /** 输出过滤类型 */
  outputFilter: 'all' | 'figures' | 'listings' | 'tables';
  /** 右侧面板宽度 */
  rightPanelWidth: number;
  /** 搜索关键字 */
  searchKeyword: string;
  /** 是否显示边界框 */
  showBoundingBoxes: boolean;
  /** 是否显示网格线 */
  showGridLines: boolean;
  /** 缩放级别 */
  zoomLevel: number;
}

/** 编辑器状态 */
export interface ITflBuilderState {
  /** ARS 文档 */
  document: IARSDocument | null;
  /** 拖拽状态 */
  dragState: {
    dragData: unknown;
    dragType: 'row' | 'column' | 'variable' | 'method' | null;
    isDragging: boolean;
  };
  /** 历史记录 */
  history: {
    future: IHistoryEntry[];
    past: IHistoryEntry[];
  };
  /** 当前选中元素 */
  selectedElement: ISelectedElement;
  /** UI 状态 */
  ui: IEditorUIState;
}

// ==================== 工厂函数 ====================

/** 创建默认分析分组 */
export const createDefaultAnalysisGrouping = (name: string, code: string, order: number): IAnalysisGrouping => ({
  code,
  id: `grouping-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  level: 1,
  name,
  order
});

/** 创建默认方法 */
export const createDefaultMethod = (type: MethodType, name: string, resultPattern: string): IMethod => ({
  decimalPlaces: type === 'n' ? 0 : 1,
  id: `method-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name,
  resultPattern,
  type
});

/** 创建默认数据行 */
export const createDefaultBodyRow = (label: string, groupings: IAnalysisGrouping[]): IBodyRow => ({
  cells: groupings.map(g => ({
    alignment: 'center' as const,
    cellType: 'placeholder' as const,
    groupingId: g.id,
    id: `cell-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: 'xx.x'
  })),
  id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  indentLevel: 0,
  isDraggable: true,
  isExpanded: true,
  label,
  rowType: 'data'
});

/** 创建默认显示 */
export const createDefaultDisplay = (name: string, type: OutputType): IDisplay => ({
  displaySections: [
    {
      content: {
        alignment: 'center',
        bold: true,
        fontSize: 12,
        text: name
      },
      id: `section-title-${Date.now()}`,
      order: 1,
      type: 'Title'
    },
    {
      content: {
        cells: []
      },
      id: `section-colheader-${Date.now()}`,
      order: 2,
      type: 'ColumnHeader'
    },
    {
      content: {
        rows: []
      },
      id: `section-body-${Date.now()}`,
      order: 3,
      type: 'Body'
    }
  ],
  id: `display-${Date.now()}`,
  metadata: {
    createdAt: new Date().toISOString(),
    createdBy: 'current-user',
    status: 'Draft',
    updatedAt: new Date().toISOString(),
    updatedBy: 'current-user',
    version: 1
  },
  name,
  order: 1,
  type
});

/** 创建默认输出 */
export const createDefaultOutput = (outputId: string, name: string, type: OutputType, displayId: string): IOutput => ({
  displayId,
  id: `output-${Date.now()}`,
  name,
  order: 1,
  outputId,
  type
});

/** 创建默认 ARS 文档 */
export const createDefaultARSDocument = (studyId: string, analysisId: string): IARSDocument => {
  const groupings = [
    createDefaultAnalysisGrouping('Placebo', "TRT01P='Placebo'", 1),
    createDefaultAnalysisGrouping('Low Dose', "TRT01P='Low Dose'", 2),
    createDefaultAnalysisGrouping('High Dose', "TRT01P='High Dose'", 3),
    createDefaultAnalysisGrouping('Total', '', 4)
  ];

  const display = createDefaultDisplay('Demographics Table', 'Table');
  // 添加列头
  const columnHeaderSection = display.displaySections.find(s => s.type === 'ColumnHeader');
  if (columnHeaderSection) {
    (columnHeaderSection.content as IColumnHeaderContent).cells = groupings.map(g => ({
      alignment: 'center' as const,
      groupingId: g.id,
      id: `colcell-${g.id}`,
      text: g.name
    }));
  }

  return {
    analysisGroupings: groupings,
    analysisId,
    displays: [display],
    id: `ars-${Date.now()}`,
    metadata: {
      createdAt: new Date().toISOString(),
      createdBy: 'current-user',
      updatedAt: new Date().toISOString(),
      updatedBy: 'current-user'
    },
    methods: [
      createDefaultMethod('n', 'n', 'xx'),
      createDefaultMethod('mean', 'Mean', 'xx.x'),
      createDefaultMethod('sd', 'SD', 'xx.x'),
      createDefaultMethod('median', 'Median', 'xx.x'),
      createDefaultMethod('range', 'Min, Max', 'xx.x, xx.x')
    ],
    outputs: [createDefaultOutput('14.1.1', 'Demographics Table', 'Table', display.id)],
    studyId,
    version: '1.0'
  };
};

// ==================== 预设方法库 ====================

/** 预设统计方法 */
export const PRESET_METHODS: IMethod[] = [
  { decimalPlaces: 0, id: 'method-n', name: 'n', resultPattern: 'xx', type: 'n' },
  { decimalPlaces: 1, id: 'method-mean', name: 'Mean', resultPattern: 'xx.x', type: 'mean' },
  { decimalPlaces: 1, id: 'method-sd', name: 'SD', resultPattern: 'xx.x', type: 'sd' },
  {
    combinedMethods: ['mean', 'sd'],
    decimalPlaces: 1,
    id: 'method-mean-sd',
    name: 'Mean (SD)',
    resultPattern: 'xx.x (xx.x)',
    type: 'mean'
  },
  { decimalPlaces: 1, id: 'method-median', name: 'Median', resultPattern: 'xx.x', type: 'median' },
  { decimalPlaces: 1, id: 'method-min', name: 'Min', resultPattern: 'xx.x', type: 'min' },
  { decimalPlaces: 1, id: 'method-max', name: 'Max', resultPattern: 'xx.x', type: 'max' },
  {
    combinedMethods: ['min', 'max'],
    decimalPlaces: 1,
    id: 'method-range',
    name: 'Min, Max',
    resultPattern: 'xx.x, xx.x',
    type: 'range'
  },
  { decimalPlaces: 1, id: 'method-pct', name: '%', resultPattern: 'xx.x', showPercentSign: true, type: 'pct' },
  {
    combinedMethods: ['n', 'pct'],
    decimalPlaces: 0,
    id: 'method-freq',
    name: 'n (%)',
    resultPattern: 'xx (xx.x%)',
    type: 'freq'
  },
  { decimalPlaces: 3, id: 'method-pvalue', name: 'P-value', resultPattern: 'x.xxx', type: 'pValue' },
  {
    decimalPlaces: 1,
    id: 'method-ci',
    name: '95% CI',
    resultPattern: '(xx.x, xx.x)',
    type: 'ci'
  }
];
