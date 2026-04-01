/**
 * TFL Designer - TypeScript Type Definitions
 *
 * Simplified types based on the POC implementation. Covers Study, TreatmentArm, Table, Figure, and Listing shells.
 */

// ==================== Utility ====================

/** Generate a unique ID with an optional prefix */
export const generateId = (prefix: string = 'id'): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// ==================== Study ====================

export interface Study {
  compound: string;
  createdAt: string;
  diseaseArea: string;
  id: string;
  phase: string;
  studyId: string;
  therapeuticArea: string;
  title: string;
  updatedAt: string;
}

// ==================== Treatment Arm ====================

export interface TreatmentArm {
  grouping?: string;
  id: string;
  // e.g. nested Cohort within a Treatment
  N?: number | string;
  name: string;
  order: number; // e.g. "Active" vs "Placebo"
  subGroup?: string;
}

export interface TreatmentArmSet {
  arms: TreatmentArm[];
  hasSubGroups?: boolean;
  /** Nested column header groups for table/listing preview */
  headers?: ColumnHeaderGroup[];
  id: string;
  name: string;
}

// ==================== Population Set ====================

export interface PopulationSet {
  dataset: string;
  // e.g. "Safety", "ITT", "PP"
  description?: string; // e.g. "ADSL"
  filterExpression?: string;
  id: string; // e.g. "SAFFL='Y'"
  isDefault?: boolean;
  name: string;
}

// ==================== Statistics Set ====================

export interface StatisticsSet {
  id: string;
  name: string; // e.g. "Demographics Stats", "Safety Stats"
  stats: StatisticItem[];
}

export interface StatisticItem {
  // Display label, e.g. "n", "Mean (SD)"
  format?: string;
  id: string;
  label: string;
  type: 'header' | 'max' | 'mean' | 'median' | 'min' | 'n' | 'n_percent' | 'range' | 'sd'; // e.g. "XX.X (X.XX)"
}

// ==================== Decimal Config ====================

export type StatTypeKey = 'max' | 'mean' | 'median' | 'min' | 'n' | 'percent' | 'range' | 'sd';

export interface DecimalConfig {
  max?: number;
  mean?: number;
  median?: number;
  min?: number;
  n?: number;
  percent?: number;
  range?: number;
  sd?: number;
}

export const DEFAULT_DECIMAL_RULES: DecimalConfig = {
  max: 1,
  mean: 2,
  median: 1,
  min: 1,
  n: 0,
  percent: 2,
  sd: 3
};

// ==================== Study Template ====================

export interface StudyTemplate {
  category: AnalysisCategory;
  createdBy?: string;
  decimalOverride?: DecimalConfig;
  displayType: 'Figure' | 'Listing' | 'Table';
  id: string | number;
  scopeNodeId: string | number;
  shellSchema: TableShell | FigureShell | ListingShell;
  sourceLevel?: ScopeLevel;
  statisticsSetId?: string | number;
  templateName: string;
  updatedAt?: string;
  version: number;
}

export interface StudyDefaults {
  decimalRules: DecimalConfig;
  defaultStatisticsSetId?: string | number;
  headerStyle?: HeaderFontStyle;
  id: string | number;
  scopeNodeId: string | number;
}

// ==================== Shell Library Types ====================

export type ScopeLevel = 'global' | 'product' | 'ta';

export interface VersionHistoryEntry {
  changedAt: string;
  changedBy: string;
  changeDescription?: string;
  snapshot?: TableShell | FigureShell | ListingShell;
  version: number;
}

export interface ShellLibraryTemplate {
  category: AnalysisCategory;
  createdAt: string;
  // Audit fields
  createdBy: string;
  deletedAt?: string;
  deletedBy?: string;
  description?: string;
  displayType: 'Figure' | 'Listing' | 'Table';
  id: number;
  // Soft delete
  isDeleted: boolean;
  scopeLevel: ScopeLevel;
  scopeNodeId: number;

  shellSchema: TableShell | FigureShell | ListingShell;
  statisticsSetId?: number;
  templateName: string;
  updatedAt: string;

  updatedBy?: string;
  version: number;
  versionHistory?: VersionHistoryEntry[];
}

// ==================== Column Header Set ====================

export interface ColumnHeaderGroup {
  align?: 'center' | 'left' | 'right';
  // Sample size — meaningful only for leaf nodes
  children?: ColumnHeaderGroup[];
  id: string;
  indentLevel?: number;
  label: string;
  N?: number | string;
  // Header text shown in preview
  variable?: string; // Data-binding variable (only for leaf groups)
  width?: number; // Nested sub-headers
}

export interface ColumnHeaderSet {
  // e.g. "SOC/PT Grouping", "Visit-Based"
  description?: string;
  headers: ColumnHeaderGroup[];
  id: string;
  name: string;
}

// ==================== Statistics ====================

export interface StatisticsConfig {
  categorical: CategoricalStats[];
  continuous: ContinuousStats[];
  survival?: SurvivalStats[];
}

export interface ContinuousStats {
  format: string;
  label: string;
  type: 'max' | 'mean' | 'median' | 'min' | 'n' | 'range' | 'sd';
}

export interface CategoricalStats {
  format: string;
  label: string;
  type: 'n' | 'n_percent' | 'percent';
}

export interface SurvivalStats {
  format: string;
  label: string;
  type: 'ci' | 'hr' | 'median' | 'pvalue';
}

// ==================== Analysis Category ====================

export type AnalysisCategory =
  | 'Adverse_Events'
  | 'Baseline'
  | 'Concomitant_Meds'
  | 'Demographics'
  | 'Disposition'
  | 'ECG'
  | 'ECG_Visits'
  | 'Efficacy'
  | 'Laboratory'
  | 'Laboratory_Visits'
  | 'Other'
  | 'Pharmacokinetics'
  | 'Protocol_Deviations'
  | 'Treatment_Compliance'
  | 'Vital_Signs'
  | 'Vital_Signs_Visits';

// ==================== Table ====================

/** Additional label columns that appear before data columns in table preview */
export interface LabelColumn {
  id: string;
  label: string; // e.g. "Row Label", "Analysis", "n"
  width?: number; // pixel width
}

export interface TableShell {
  // e.g. "AGE >= 18 AND SEX='M'" — filters analysis population
  analysisSubset?: string;
  category: AnalysisCategory;
  columnHeaderSetId?: string;
  dataset: string;
  decimalOverride?: DecimalConfig;
  footer: TableFooter;
  // study-level column header grouping (overrides arms)
  headerLayers?: TableHeaderLayer[];
  id: string;
  /** Label columns shown before data columns (default: single "Row Label" column) */
  labelColumns?: LabelColumn[];
  population: string; // e.g. "Post-Baseline" — label for sub-group
  programmingNotes?: string;
  rows: TableRow[];
  shellNumber: string;
  statisticsSetId: string;
  title: string;
  treatmentArmSetId: string;
  whereClause?: string; // Free-form notes for the programmer
}

export interface TableHeaderLayer {
  cells: TableHeaderCell[];
  id: string;
}

export interface TableHeaderCell {
  // Supports placeholders like $1, $2, ^
  colspan?: number;
  id: string;
  rowspan?: number;
  text: string;
}

export interface TableRow {
  // Source dataset variable mapped to this row
  analysisOfInterest?: string;
  // e.g. 'SOC', 'PT', 'Visit', 'Parameter'
  children?: TableRow[];
  expanded?: boolean;
  id: string;
  indent?: number;
  isParameter?: boolean; // Clinical specific properties
  isSOC?: boolean;
  isVisit?: boolean;
  label: string;
  level: number;
  parameterCode?: string;
  ptCode?: string;
  socCode?: string;
  stats?: RowStats[];
  // Visual indent in spaces/px
  variable?: string;
  visitCode?: string;
}

export interface RowStats {
  decimals?: number;
  format?: string;
  type: StatTypeKey | 'n_percent' | 'header' | string;
}

export interface TableFooter {
  abbreviations?: Record<string, string>;
  notes?: string[];
  source?: string;
}

// Ant Design Table column type for rendering
export interface TableColumn {
  align?: 'center' | 'left' | 'right';
  children?: TableColumn[];
  dataIndex?: string;
  key: string;
  render?: (text: unknown, record?: unknown, index?: number) => React.ReactNode;
  title: React.ReactNode | string;
  width?: string | number;
}

// ==================== Figure ====================

export type ChartType = 'bar' | 'box' | 'forest' | 'heatmap' | 'km_curve' | 'line' | 'scatter' | 'violin' | 'waterfall';

export interface FigureShell {
  chartType: ChartType;
  figureNumber: string;
  id: string;
  legend?: LegendConfig;
  population: string;
  programmingNotes?: string;
  series: ChartSeries[];
  style?: FigureStyle;
  title: string;
  xAxis: AxisConfig;
  yAxis: AxisConfig;
}

export interface AxisConfig {
  label: string;
  logScale?: boolean;
  range?: [number, number];
  tickFormat?: string;
  type: 'categorical' | 'continuous' | 'date';
}

export interface ChartSeries {
  color?: string;
  id: string;
  line?: LineConfig;
  marker?: MarkerConfig;
  name: string;
  type?: string;
}

export interface MarkerConfig {
  color?: string;
  size?: number;
  symbol?: string;
}

export interface LineConfig {
  dash?: 'dash' | 'dashdot' | 'dot' | 'solid';
  width?: number;
}

export interface LegendConfig {
  orientation: 'horizontal' | 'vertical';
  position: 'bottom' | 'left' | 'right' | 'top';
}

export interface FigureStyle {
  fontFamily?: string;
  fontSize?: number;
  height?: number;
  width?: number;
}

// ==================== Listing ====================

export interface ListingShell {
  // e.g. "AGE >= 18" — filters analysis population
  analysisSubset?: string;
  columnHeaderSetId?: string;
  columns: ListingColumn[];
  dataset: string;
  filter?: FilterConfig[];
  id: string;
  listingNumber: string;
  pageSize?: number;
  population: string;
  // e.g. "Safety Subjects with TEAE"
  programmingNotes?: string;
  // study-level grouped header configuration
  sortBy?: SortConfig[];
  title: string;
  whereClause?: string;
}

export interface ListingColumn {
  align?: 'center' | 'left' | 'right';
  // Nested column headers (grouped headers like tables)
  children?: ListingColumn[];
  colspan?: number;
  // Array of dataset columns to combine
  combineFormat?: string;
  format?: string;
  // Multi-line column headers (each line rendered on separate row)
  headerLines?: string[];
  hidden?: boolean;
  id: string; // e.g. "{0} / {1}" or "{0}\n  {1}"
  indentLevel?: number;
  label: string;
  name: string;
  // Support for combined/indented columns in listings
  sourceColumns?: string[];
  width?: number;
}

export interface SortConfig {
  columnId: string;
  order: 'asc' | 'desc';
  priority: number;
}

export interface FilterConfig {
  columnId: string;
  operator: 'contains' | 'eq' | 'ge' | 'gt' | 'in' | 'is_null' | 'le' | 'lt' | 'ne' | 'not_null';
  value: string | string[];
}

// ==================== Template ====================

export interface Template {
  category: AnalysisCategory;
  createdAt: string;
  description?: string;
  id: string;
  name: string;
  /** Scope level for library templates - global, ta, or product */
  scopeLevel?: ScopeLevel;
  shell: TableShell | FigureShell | ListingShell;
  type: 'figure' | 'listing' | 'table';
}

// ==================== Population ====================

export interface IPopulationDefinition {
  createdAt?: string;
  createdBy?: string;
  dataset?: string;
  description?: string;
  filterExpression?: string;
  id: string;
  isDefault?: boolean;
  name: string;
  version?: number;
}

// ==================== CDISC ARS Document ====================

export interface IStudyInfo {
  compoundUnderStudy: string;
  phase: string[];
  studyId: string;
  studyTitle: string;
  therapeuticArea: string;
}

export interface IHeaderStyle {
  logo?: string;
  protocolNumber?: string;
  sponsor?: string;
  subtitle?: string;
  title?: string;
}

/** Font-based table header styling (applied to preview) */
export interface HeaderFontStyle {
  alignment: 'center' | 'left' | 'right';
  columnHeaderBackground: string;
  columnHeaderFont: string;
  columnHeaderSize: number;
  description?: string;
  id: string;
  name: string;
  subtitleFont: string;
  subtitleSize: number;
  titleFont: string;
  titleSize: number;
}

export const DEFAULT_HEADER_FONT_STYLE: HeaderFontStyle = {
  alignment: 'center',
  columnHeaderBackground: '#f0f0f0',
  columnHeaderFont: 'Arial',
  columnHeaderSize: 10,
  description: 'Standard clinical trial table format',
  id: 'default',
  name: 'Default',
  subtitleFont: 'Arial',
  subtitleSize: 11,
  titleFont: 'Arial',
  titleSize: 12
};

export interface IDisplaySection {
  content: Record<string, unknown>;
  type: 'Body' | 'Figure' | 'Footnote' | 'Reference' | 'Title';
}

export interface IBodyCell {
  colspan?: number;
  isHeader?: boolean;
  rowspan?: number;
  value: string | number | null;
}

export interface IBodyRow {
  analysisOfInterest?: string;
  cells?: IBodyCell[];
  children?: IBodyRow[];
  expanded?: boolean;
  id: string;
  indent?: number;
  isSOC?: boolean;
  label: string;
  level: number;
  ptCode?: string;
  socCode?: string;
  stats?: Array<{ decimals?: number; format?: string; type: string }>;
  variable?: string;
}

export type RowType = 'data' | 'footnote' | 'header' | 'subtotal' | 'total';

export interface IDisplay {
  category?: AnalysisCategory;
  dataset?: string;
  displaySections: IDisplaySection[];
  displayTitle?: string;
  displayType?: 'figure' | 'listing' | 'table';
  id: string;
  name: string;
  population?: string;
  shellNumber?: string;
  type: 'Figure' | 'Listing' | 'Table';
}

export interface IOutput {
  createdAt?: string;
  displayId: string;
  format?: string;
  id: string;
  type: 'figure' | 'listing' | 'table';
}

export interface IARSDocument {
  analysisGroupings?: IAnalysisGrouping[];
  analysisId?: string;
  displays: IDisplay[];
  headerStyle?: IHeaderStyle;
  id?: string;
  methods?: unknown[];
  outputs: IOutput[];
  populations?: IPopulationDefinition[];
  studyId: string;
  studyInfo?: IStudyInfo;
}

export interface IAnalysisGrouping {
  arms: Array<{
    code?: string;
    groupId?: string;
    id: string;
    N?: number | string;
    name: string;
    order?: number;
  }>;
  code?: string;
  id: string;
  name: string;
  order?: number;
}

// ==================== Alias types for backward compatibility ====================
// Some components use I-prefixed names, some don't.
// These aliases ensure both naming conventions work.

/** @deprecated Use ListingColumn instead */
export type IListingColumn = ListingColumn;

/** @deprecated Use FilterConfig instead */
export type IFilterConfig = FilterConfig;

/** @deprecated Use SortConfig instead */
export type ISortConfig = SortConfig;

/** @deprecated Use Template instead */
export type ITemplate = Template;

/** @deprecated Use AxisConfig instead */
export type IAxisConfig = AxisConfig;

/** @deprecated Use ChartSeries instead */
export type IChartSeries = ChartSeries;

/** @deprecated Use FigureStyle instead */
export type IFigureStyle = FigureStyle;

/** @deprecated Use LegendConfig instead */
export type ILegendConfig = LegendConfig;

export type AxisType = AxisConfig['type'];
export type FilterOperator = FilterConfig['operator'];
export type SortOperator = SortConfig['order'];

// ==================== CDISC ARS Supporting Types ====================
// Used by template utils and import utils (@ts-nocheck files)

export interface IAnalysis {
  analysisId?: string;
  dataset?: string;
  description?: string;
  groupingRef?: string;
  id: string;
  methodRef?: string;
  name?: string;
  oid?: string;
  parameter?: string;
  purpose?: string;
  variable?: string;
}

export interface IGrouping {
  code?: string;
  description?: string;
  id: string;
  name?: string;
}

export interface IMethod {
  description?: string;
  id: string;
  name?: string;
  oid?: string;
  type?: string;
}

export interface ITemplateShell {
  category?: AnalysisCategory;
  description?: string;
  id: string;
  name: string;
  type: 'figure' | 'listing' | 'table';
}

// ==================== Export ====================

export interface ExportConfig {
  format: 'pdf' | 'rtf' | 'word';
  includeHeaders: boolean;
  includePageNumbers: boolean;
  margins: {
    bottom: number;
    left: number;
    right: number;
    top: number;
  };
  orientation: 'landscape' | 'portrait';
  pageSize: 'A4' | 'Letter';
}

// ==================== Shared Option Constants ====================

export const categoryOptions: { label: string; value: AnalysisCategory }[] = [
  { label: 'Demographics', value: 'Demographics' },
  { label: 'Baseline Characteristics', value: 'Baseline' },
  { label: 'Disposition', value: 'Disposition' },
  { label: 'Treatment Compliance', value: 'Treatment_Compliance' },
  { label: 'Protocol Deviations', value: 'Protocol_Deviations' },
  { label: 'Adverse Events', value: 'Adverse_Events' },
  { label: 'Laboratory', value: 'Laboratory' },
  { label: 'Laboratory by Visits', value: 'Laboratory_Visits' },
  { label: 'Vital Signs', value: 'Vital_Signs' },
  { label: 'Vital Signs by Visits', value: 'Vital_Signs_Visits' },
  { label: 'ECG', value: 'ECG' },
  { label: 'ECG by Visits', value: 'ECG_Visits' },
  { label: 'Concomitant Medications', value: 'Concomitant_Meds' },
  { label: 'Efficacy', value: 'Efficacy' },
  { label: 'Pharmacokinetics', value: 'Pharmacokinetics' },
  { label: 'Other', value: 'Other' }
];

export const datasetOptions: { label: string; value: string }[] = [
  { label: 'ADSL - Subject Level', value: 'ADSL' },
  { label: 'ADAE - Adverse Events', value: 'ADAE' },
  { label: 'ADLB - Laboratory', value: 'ADLB' },
  { label: 'ADVS - Vital Signs', value: 'ADVS' },
  { label: 'ADCM - Concomitant Meds', value: 'ADCM' },
  { label: 'ADEX - Exposure', value: 'ADEX' }
];

export const populationOptions: { label: string; value: string }[] = [
  { label: 'Safety Population', value: 'Safety' },
  { label: 'ITT (Intent-to-Treat)', value: 'ITT' },
  { label: 'PP (Per-Protocol)', value: 'PP' },
  { label: 'Efficacy Population', value: 'Efficacy' }
];

// ==================== Stat Types for Decimal Config ====================

export const STAT_TYPES: { key: StatTypeKey; label: string }[] = [
  { key: 'n', label: 'n (Count)' },
  { key: 'mean', label: 'Mean' },
  { key: 'sd', label: 'SD' },
  { key: 'median', label: 'Median' },
  { key: 'min', label: 'Min' },
  { key: 'max', label: 'Max' },
  { key: 'percent', label: 'Percentage' }
];

// ==================== Display Type Colors ====================

export const DISPLAY_TYPE_COLORS: Record<'Figure' | 'Listing' | 'Table', string> = {
  Figure: 'green',
  Listing: 'orange',
  Table: 'blue'
};

export const getDisplayTypeColor = (type: 'Figure' | 'Listing' | 'Table'): string => DISPLAY_TYPE_COLORS[type];

export const TEMPLATE_TYPE_TO_DISPLAY_TYPE: Record<'figure' | 'listing' | 'table', 'Figure' | 'Listing' | 'Table'> = {
  figure: 'Figure',
  listing: 'Listing',
  table: 'Table'
};

export const toDisplayType = (type: string): 'Figure' | 'Listing' | 'Table' =>
  TEMPLATE_TYPE_TO_DISPLAY_TYPE[type as 'figure' | 'listing' | 'table'] ?? 'Table';

// ==================== Scope Level Tag Props ====================

export const SCOPE_LEVEL_TAG_PROPS: Record<ScopeLevel | 'study', { color: string; label: string }> = {
  global: { color: 'geekblue', label: 'Global' },
  product: { color: 'default', label: 'Product' },
  ta: { color: 'purple', label: 'TA' },
  study: { color: 'green', label: 'Study' }
};

export const getScopeLevelTagProps = (level: ScopeLevel | 'study' | undefined): { color: string; label: string } =>
  SCOPE_LEVEL_TAG_PROPS[level ?? 'global'];
