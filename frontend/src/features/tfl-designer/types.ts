/**
 * TFL Designer - TypeScript Type Definitions
 *
 * Simplified types based on the POC implementation.
 * Covers Study, TreatmentArm, Table, Figure, and Listing shells.
 */

// ==================== Utility ====================

/** Generate a unique ID with an optional prefix */
export const generateId = (prefix: string = 'id'): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// ==================== Study ====================

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

// ==================== Treatment Arm ====================

export interface TreatmentArm {
  id: string;
  name: string;
  order: number;
  grouping?: string; // e.g. "Active" vs "Placebo"
  subGroup?: string; // e.g. nested Cohort within a Treatment
  N?: number | string;
}

export interface TreatmentArmSet {
  id: string;
  name: string;
  arms: TreatmentArm[];
  hasSubGroups?: boolean;
  /** Nested column header groups for table/listing preview */
  headers?: ColumnHeaderGroup[];
}

// ==================== Population Set ====================

export interface PopulationSet {
  id: string;
  name: string;          // e.g. "Safety", "ITT", "PP"
  description?: string;
  dataset: string;       // e.g. "ADSL"
  filterExpression?: string; // e.g. "SAFFL='Y'"
  isDefault?: boolean;
}

// ==================== Statistics Set ====================

export interface StatisticsSet {
  id: string;
  name: string;          // e.g. "Demographics Stats", "Safety Stats"
  stats: StatisticItem[];
}

export interface StatisticItem {
  id: string;
  type: 'n' | 'mean' | 'sd' | 'median' | 'min' | 'max' | 'range' | 'n_percent' | 'header';
  label: string;         // Display label, e.g. "n", "Mean (SD)"
  format?: string;       // e.g. "XX.X (X.XX)"
}

// ==================== Decimal Config ====================

export type StatTypeKey = 'n' | 'mean' | 'sd' | 'median' | 'min' | 'max' | 'percent' | 'range';

export interface DecimalConfig {
  n?: number;
  mean?: number;
  sd?: number;
  median?: number;
  min?: number;
  max?: number;
  percent?: number;
  range?: number;
}

export const DEFAULT_DECIMAL_RULES: DecimalConfig = {
  n: 0,
  mean: 2,
  sd: 3,
  median: 1,
  min: 1,
  max: 1,
  percent: 2,
};

// ==================== Study Template ====================

export interface StudyTemplate {
  id: string | number;
  scopeNodeId: string | number;
  category: AnalysisCategory;
  templateName: string;
  displayType: 'Table' | 'Figure' | 'Listing';
  shellSchema: TableShell | FigureShell | ListingShell;
  statisticsSetId?: string | number;
  decimalOverride?: DecimalConfig;
  version: number;
  createdBy?: string;
  updatedAt?: string;
}

export interface StudyDefaults {
  id: string | number;
  scopeNodeId: string | number;
  defaultStatisticsSetId?: string | number;
  decimalRules: DecimalConfig;
  headerStyle?: HeaderFontStyle;
}

// ==================== Column Header Set ====================

export interface ColumnHeaderGroup {
  id: string;
  label: string;           // Header text shown in preview
  variable?: string;       // Data-binding variable (only for leaf groups)
  width?: number;
  align?: 'left' | 'center' | 'right';
  indentLevel?: number;
  N?: number | string;     // Sample size — meaningful only for leaf nodes
  children?: ColumnHeaderGroup[];  // Nested sub-headers
}

export interface ColumnHeaderSet {
  id: string;
  name: string;            // e.g. "SOC/PT Grouping", "Visit-Based"
  description?: string;
  headers: ColumnHeaderGroup[];
}

// ==================== Statistics ====================

export interface StatisticsConfig {
  continuous: ContinuousStats[];
  categorical: CategoricalStats[];
  survival?: SurvivalStats[];
}

export interface ContinuousStats {
  type: 'n' | 'mean' | 'sd' | 'median' | 'min' | 'max' | 'range';
  label: string;
  format: string;
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

// ==================== Analysis Category ====================

export type AnalysisCategory =
  | 'Demographics'
  | 'Baseline'
  | 'Disposition'
  | 'Treatment_Compliance'
  | 'Protocol_Deviations'
  | 'Adverse_Events'
  | 'Laboratory'
  | 'Laboratory_Visits'
  | 'Vital_Signs'
  | 'Vital_Signs_Visits'
  | 'ECG'
  | 'ECG_Visits'
  | 'Concomitant_Meds'
  | 'Efficacy'
  | 'Pharmacokinetics'
  | 'Other';

// ==================== Table ====================

/** Additional label columns that appear before data columns in table preview */
export interface LabelColumn {
  id: string;
  label: string;       // e.g. "Row Label", "Analysis", "n"
  width?: number;      // pixel width
}

export interface TableShell {
  id: string;
  shellNumber: string;
  title: string;
  population: string;
  category: AnalysisCategory;
  dataset: string;
  treatmentArmSetId: string;
  statisticsSetId: string;
  decimalOverride?: DecimalConfig;
  columnHeaderSetId?: string; // study-level column header grouping (overrides arms)
  headerLayers?: TableHeaderLayer[];
  rows: TableRow[];
  footer: TableFooter;
  /** Label columns shown before data columns (default: single "Row Label" column) */
  labelColumns?: LabelColumn[];
  whereClause?: string;       // e.g. "AGE >= 18 AND SEX='M'" — filters analysis population
  analysisSubset?: string;    // e.g. "Post-Baseline" — label for sub-group
  programmingNotes?: string;  // Free-form notes for the programmer
}

export interface TableHeaderLayer {
  id: string;
  cells: TableHeaderCell[];
}

export interface TableHeaderCell {
  id: string;
  text: string; // Supports placeholders like $1, $2, ^
  colspan?: number;
  rowspan?: number;
}

export interface TableRow {
  id: string;
  label: string;
  level: number;
  indent?: number; // Visual indent in spaces/px
  variable?: string; // Source dataset variable mapped to this row
  analysisOfInterest?: string; // e.g. 'SOC', 'PT', 'Visit', 'Parameter'
  children?: TableRow[];
  stats?: RowStats[];
  // Clinical specific properties
  isSOC?: boolean;
  socCode?: string;
  ptCode?: string;
  isVisit?: boolean;
  visitCode?: string;
  isParameter?: boolean;
  parameterCode?: string;
  expanded?: boolean;
}

export interface RowStats {
  type: StatTypeKey | 'n_percent' | 'header' | string;
  decimals?: number;
  format?: string;
}

export interface TableFooter {
  source?: string;
  notes?: string[];
  abbreviations?: Record<string, string>;
}

// Ant Design Table column type for rendering
export interface TableColumn {
  title: React.ReactNode | string;
  dataIndex?: string;
  key: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (text: unknown, record?: unknown, index?: number) => React.ReactNode;
  children?: TableColumn[];
}

// ==================== Figure ====================

export type ChartType =
  | 'line'
  | 'scatter'
  | 'bar'
  | 'box'
  | 'violin'
  | 'heatmap'
  | 'waterfall'
  | 'km_curve'
  | 'forest';

export interface FigureShell {
  id: string;
  figureNumber: string;
  title: string;
  population: string;
  chartType: ChartType;
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  series: ChartSeries[];
  legend?: LegendConfig;
  style?: FigureStyle;
  programmingNotes?: string;
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
  type?: string;
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
  dash?: 'solid' | 'dash' | 'dot' | 'dashdot';
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

// ==================== Listing ====================

export interface ListingShell {
  id: string;
  listingNumber: string;
  title: string;
  population: string;
  dataset: string;
  columns: ListingColumn[];
  columnHeaderSetId?: string; // study-level grouped header configuration
  sortBy?: SortConfig[];
  filter?: FilterConfig[];
  pageSize?: number;
  whereClause?: string;       // e.g. "AGE >= 18" — filters analysis population
  analysisSubset?: string;    // e.g. "Safety Subjects with TEAE"
  programmingNotes?: string;
}

export interface ListingColumn {
  id: string;
  name: string;
  label: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: string;
  hidden?: boolean;
  // Support for combined/indented columns in listings
  sourceColumns?: string[]; // Array of dataset columns to combine
  combineFormat?: string; // e.g. "{0} / {1}" or "{0}\n  {1}"
  indentLevel?: number;
  // Multi-line column headers (each line rendered on separate row)
  headerLines?: string[];
  // Nested column headers (grouped headers like tables)
  children?: ListingColumn[];
  colspan?: number;
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

// ==================== Template ====================

export interface Template {
  id: string;
  type: 'table' | 'figure' | 'listing';
  name: string;
  category: AnalysisCategory;
  description?: string;
  shell: TableShell | FigureShell | ListingShell;
  createdAt: string;
}

// ==================== Population ====================

export interface IPopulationDefinition {
  id: string;
  name: string;
  description?: string;
  dataset?: string;
  filterExpression?: string;
  version?: number;
  createdAt?: string;
  createdBy?: string;
  isDefault?: boolean;
}

// ==================== CDISC ARS Document ====================

export interface IStudyInfo {
  studyId: string;
  studyTitle: string;
  phase: string[];
  compoundUnderStudy: string;
  therapeuticArea: string;
}

export interface IHeaderStyle {
  title?: string;
  subtitle?: string;
  logo?: string;
  sponsor?: string;
  protocolNumber?: string;
}

/** Font-based table header styling (applied to preview) */
export interface HeaderFontStyle {
  id: string;
  name: string;
  description?: string;
  titleFont: string;
  titleSize: number;
  subtitleFont: string;
  subtitleSize: number;
  columnHeaderFont: string;
  columnHeaderSize: number;
  columnHeaderBackground: string;
  alignment: 'left' | 'center' | 'right';
}

export const DEFAULT_HEADER_FONT_STYLE: HeaderFontStyle = {
  id: 'default',
  name: 'Default',
  description: 'Standard clinical trial table format',
  titleFont: 'Arial',
  titleSize: 12,
  subtitleFont: 'Arial',
  subtitleSize: 11,
  columnHeaderFont: 'Arial',
  columnHeaderSize: 10,
  columnHeaderBackground: '#f0f0f0',
  alignment: 'center',
};

export interface IDisplaySection {
  type: 'Title' | 'Body' | 'Figure' | 'Footnote' | 'Reference';
  content: Record<string, unknown>;
}

export interface IBodyCell {
  value: string | number | null;
  colspan?: number;
  rowspan?: number;
  isHeader?: boolean;
}

export interface IBodyRow {
  id: string;
  label: string;
  level: number;
  indent?: number;
  variable?: string;
  analysisOfInterest?: string;
  children?: IBodyRow[];
  stats?: Array<{ type: string; decimals?: number; format?: string }>;
  isSOC?: boolean;
  socCode?: string;
  ptCode?: string;
  expanded?: boolean;
  cells?: IBodyCell[];
}

export type RowType = 'header' | 'data' | 'subtotal' | 'total' | 'footnote';

export interface IDisplay {
  id: string;
  name: string;
  type: 'Table' | 'Figure' | 'Listing';
  displayType?: 'table' | 'figure' | 'listing';
  displayTitle?: string;
  displaySections: IDisplaySection[];
  shellNumber?: string;
  population?: string;
  dataset?: string;
  category?: AnalysisCategory;
}

export interface IOutput {
  id: string;
  displayId: string;
  type: 'table' | 'figure' | 'listing';
  format?: string;
  createdAt?: string;
}

export interface IARSDocument {
  id?: string;
  studyId: string;
  studyInfo?: IStudyInfo;
  analysisId?: string;
  headerStyle?: IHeaderStyle;
  displays: IDisplay[];
  outputs: IOutput[];
  analysisGroupings?: IAnalysisGrouping[];
  methods?: unknown[];
  populations?: IPopulationDefinition[];
}

export interface IAnalysisGrouping {
  id: string;
  name: string;
  code?: string;
  order?: number;
  arms: Array<{
    id: string;
    name: string;
    code?: string;
    order?: number;
    N?: number | string;
    groupId?: string;
  }>;
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
  id: string;
  analysisId?: string;
  name?: string;
  description?: string;
  oid?: string;
  dataset?: string;
  variable?: string;
  methodRef?: string;
  groupingRef?: string;
  parameter?: string;
  purpose?: string;
}

export interface IGrouping {
  id: string;
  name?: string;
  description?: string;
  code?: string;
}

export interface IMethod {
  id: string;
  name?: string;
  description?: string;
  type?: string;
  oid?: string;
}

export interface ITemplateShell {
  id: string;
  type: 'table' | 'figure' | 'listing';
  name: string;
  category?: AnalysisCategory;
  description?: string;
}

// ==================== Export ====================

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

// ==================== Shared Option Constants ====================

export const categoryOptions: { value: AnalysisCategory; label: string }[] = [
  { value: 'Demographics', label: 'Demographics' },
  { value: 'Baseline', label: 'Baseline Characteristics' },
  { value: 'Disposition', label: 'Disposition' },
  { value: 'Treatment_Compliance', label: 'Treatment Compliance' },
  { value: 'Protocol_Deviations', label: 'Protocol Deviations' },
  { value: 'Adverse_Events', label: 'Adverse Events' },
  { value: 'Laboratory', label: 'Laboratory' },
  { value: 'Laboratory_Visits', label: 'Laboratory by Visits' },
  { value: 'Vital_Signs', label: 'Vital Signs' },
  { value: 'Vital_Signs_Visits', label: 'Vital Signs by Visits' },
  { value: 'ECG', label: 'ECG' },
  { value: 'ECG_Visits', label: 'ECG by Visits' },
  { value: 'Concomitant_Meds', label: 'Concomitant Medications' },
  { value: 'Efficacy', label: 'Efficacy' },
  { value: 'Pharmacokinetics', label: 'Pharmacokinetics' },
  { value: 'Other', label: 'Other' },
];

export const datasetOptions: { value: string; label: string }[] = [
  { value: 'ADSL', label: 'ADSL - Subject Level' },
  { value: 'ADAE', label: 'ADAE - Adverse Events' },
  { value: 'ADLB', label: 'ADLB - Laboratory' },
  { value: 'ADVS', label: 'ADVS - Vital Signs' },
  { value: 'ADCM', label: 'ADCM - Concomitant Meds' },
  { value: 'ADEX', label: 'ADEX - Exposure' },
];

export const populationOptions: { value: string; label: string }[] = [
  { value: 'Safety', label: 'Safety Population' },
  { value: 'ITT', label: 'ITT (Intent-to-Treat)' },
  { value: 'PP', label: 'PP (Per-Protocol)' },
  { value: 'Efficacy', label: 'Efficacy Population' },
];

// ==================== Stat Types for Decimal Config ====================

export const STAT_TYPES: { key: StatTypeKey; label: string }[] = [
  { key: 'n', label: 'n (Count)' },
  { key: 'mean', label: 'Mean' },
  { key: 'sd', label: 'SD' },
  { key: 'median', label: 'Median' },
  { key: 'min', label: 'Min' },
  { key: 'max', label: 'Max' },
  { key: 'percent', label: 'Percentage' },
];

// ==================== Display Type Colors ====================

export const DISPLAY_TYPE_COLORS: Record<'Table' | 'Figure' | 'Listing', string> = {
  Table: 'blue',
  Figure: 'green',
  Listing: 'orange',
};

export const getDisplayTypeColor = (type: 'Table' | 'Figure' | 'Listing'): string =>
  DISPLAY_TYPE_COLORS[type];
