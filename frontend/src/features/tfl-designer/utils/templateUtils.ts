// @ts-nocheck
/**
 * TFL Builder - Template Utilities
 *
 * Functions for importing, parsing, and applying templates
 * from JSON metadata exports and RTF files
 */

import type {
  IARSDocument,
  IDisplay,
  IOutput,
  IAnalysis,
  IGrouping,
  IMethod,
  Template,
  ITemplateShell,
  IBodyRow,
  IAxisConfig,
  IChartSeries,
  IListingColumn,
  ISortConfig,
  IFilterConfig,
  IStudyInfo,
  IPopulationDefinition,
  TableShell,
  TableRow,
  AnalysisCategory
} from '../types';

// ==================== JSON Import Types ====================

interface CommercialExport {
  about?: {
    generatedUsing?: string;
    version?: string;
    note?: string;
  };
  studyInfo?: {
    studyId: string;
    studyTitle: string;
    phase: string[];
    compoundUnderStudy: string;
    diseaseArea: string;
    therapeuticArea: string;
    description?: string;
  };
  name: string;
  id: string;
  mainListOfContents?: {
    name: string;
    label: string;
    contentsList: {
      listItems: LOPAListItem[];
    };
  };
  analyses?: IAnalysis[];
  methods?: IMethod[];
  outputs?: OutputData[];
  displayDocuments?: any[];
}

interface LOPAListItem {
  name: string;
  level: number;
  order: number;
  outputId?: string;
  analysisId?: string;
  sublist?: {
    listItems: LOPAListItem[];
  };
}

interface OutputData {
  name: string;
  id: string;
  version: number;
  fileSpecifications?: any[];
  displays?: DisplayData[];
  categoryIds?: string[];
  documentRefs?: any[];
  programmingCode?: any;
}

interface DisplayData {
  order: number;
  display: {
    name: string;
    id: string;
    version: number;
    displayTitle?: string;
    displaySections: DisplaySection[];
  };
}

interface DisplaySection {
  sectionType: string;
  orderedSubSections?: Array<{
    order: number;
    subSection: {
      id: string;
      text: string;
    };
  }>;
}

// ==================== Study Info Import ====================

/**
 * Extract study-level metadata from commercial JSON export
 */
export function importStudyMetadata(json: CommercialExport): IStudyInfo {
  return {
    studyId: json.studyInfo?.studyId || '',
    studyTitle: json.studyInfo?.studyTitle || '',
    phase: json.studyInfo?.phase || [],
    compoundUnderStudy: json.studyInfo?.compoundUnderStudy || '',
    diseaseArea: json.studyInfo?.diseaseArea || '',
    therapeuticArea: json.studyInfo?.therapeuticArea || '',
    description: json.studyInfo?.description,
    version: 1,
  };
}

/**
 * Extract population definitions from analysis sets
 */
export function importPopulations(json: CommercialExport): IPopulationDefinition[] {
  const populations: IPopulationDefinition[] = [];
  const categoryIds = new Set<string>();

  // Collect all category IDs from analyses
  json.analyses?.forEach(analysis => {
    analysis.categoryIds?.forEach(catId => categoryIds.add(catId));
  });

  // Create population definitions from category IDs
  const populationMap: Record<string, string> = {
    'ANSET_02': 'All Enrolled Population',
    'ANSET_03': 'Safety Population',
    'ANSET_04': 'Intent-To-Treat (ITT)',
    'ANSET_05': 'Full Analysis Set (FAS)',
    'ANSET_06': 'Per-Protocol Set (PPS)',
  };

  categoryIds.forEach(catId => {
    if (populationMap[catId]) {
      populations.push({
        id: catId,
        name: populationMap[catId],
        description: `Analysis population for ${catId}`,
        dataset: json.analyses?.[0]?.dataset || 'ADSL',
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        version: 1,
      });
    }
  });

  return populations;
}

// ==================== Table Template Import ====================

/**
 * Parse LOPA structure to extract output hierarchy
 */
function parseLOPAHierarchy(listItems: LOPAListItem[]): ITemplateCategory[] {
  const categories: ITemplateCategory[] = [];

  listItems.forEach(item => {
    if (item.outputId) {
      categories.push({
        name: item.name,
        outputId: item.outputId,
        analyses: item.sublist?.listItems || [],
      });
    }
  });

  return categories;
}

interface TemplateCategory {
  name: string;
  outputId: string;
  analyses: LOPAListItem[];
}

/**
 * Determine category from output name
 */
function determineCategoryFromName(name: string): AnalysisCategory {
  const lower = name.toLowerCase();

  if (lower.includes('demographic') || lower.includes('baseline')) {
    return 'Demographics';
  }
  if (lower.includes('disposition') || lower.includes('subject')) {
    return 'Disposition';
  }
  if (lower.includes('adverse') || lower.includes('ae')) {
    return 'Adverse_Events';
  }
  if (lower.includes('laboratory') || lower.includes('lab') || lower.includes('hematology') || lower.includes('chemistry')) {
    return 'Laboratory';
  }
  if (lower.includes('vital')) {
    return 'Vital_Signs';
  }
  if (lower.includes('ecg')) {
    return 'ECG';
  }
  if (lower.includes('pk') || lower.includes('pharmacokinetic') || lower.includes('concentration')) {
    return 'Pharmacokinetics';
  }
  if (lower.includes('efficacy')) {
    return 'Efficacy';
  }
  if (lower.includes('medication') || lower.includes('concomitant') || lower.includes('cm')) {
    return 'Concomitant_Meds';
  }
  if (lower.includes('protocol') && lower.includes('deviation')) {
    return 'Protocol_Deviations';
  }
  if (lower.includes('eligibility') || lower.includes('criteria')) {
    return 'Baseline';
  }
  if (lower.includes('treatment') || lower.includes('compliance') || lower.includes('exposure')) {
    return 'Treatment_Compliance';
  }

  return 'Other';
}

/**
 * Import table templates from commercial JSON export
 */
export async function importTableTemplatesFromJSON(
  json: CommercialExport
): Promise<Template[]> {
  const templates: ITemplate[] = [];

  if (!json.mainListOfContents || !json.outputs) {
    return templates;
  }

  const categories = parseLOPAHierarchy(json.mainListOfContents.contentsList.listItems);
  const outputsMap = new Map(json.outputs.map(o => [o.id, o]));

  for (const category of categories) {
    const output = outputsMap.get(category.outputId);
    if (!output) continue;

    const display = output.displays?.[0]?.display;
    if (!display) continue;

    const templateCategory = determineCategoryFromName(category.name);

    // Create template for each display
    const template: ITemplate = {
      id: `tpl_${templateCategory.toLowerCase()}_${category.outputId}`,
      type: 'table',
      name: category.name,
      category: templateCategory,
      description: `Imported from ${json.name} - ${category.name}`,
      shell: createTableShellFromDisplay(display, templateCategory, output),
      createdAt: new Date().toISOString(),
    };

    templates.push(template);
  }

  return templates;
}

/**
 * Create table shell structure from display data
 */
function createTableShellFromDisplay(
  display: DisplayData['display'],
  category: string,
  output: OutputData
): ITemplateShell {
  const shell: ITemplateShell = {
    id: display.id,
    shellNumber: 'Imported',
    title: display.displayTitle || display.name,
    population: 'Safety',
    category,
    dataset: 'ADSL',
    treatmentArmSetId: '',
    statisticsSetId: '',
    rows: [],
  };

  // Extract title sections
  const titleSection = display.displaySections.find(s => s.sectionType === 'Title');
  if (titleSection?.orderedSubSections) {
    shell.title = titleSection.orderedSubSections
      .slice(1) // Skip table number
      .map(s => s.subSection.text)
      .join(' - ');
  }

  // Extract footnote sections
  const footnoteSection = display.displaySections.find(s => s.sectionType === 'Footnote');
  if (footnoteSection?.orderedSubSections) {
    shell.footer = {
      source: '',
      notes: footnoteSection.orderedSubSections.map(s => s.subSection.text),
    };
  }

  // Extract abbreviations
  const abbrevSection = display.displaySections.find(s => s.sectionType === 'Abbreviations');
  if (abbrevSection?.orderedSubSections) {
    if (!shell.footer) shell.footer = { source: '', notes: [] };
    const abbrevText = abbrevSection.orderedSubSections[0]?.subSection.text || '';
    shell.footer.abbreviations = parseAbbreviations(abbrevText);
  }

  return shell;
}

/**
 * Parse abbreviations from text
 * Format: "Abbreviations: N=Number of subjects; SD=Standard Deviation"
 */
function parseAbbreviations(text: string): Record<string, string> {
  const abbreviations: Record<string, string> = {};

  // Extract text after "Abbreviations:" or similar
  const match = text.match(/(?:Abbreviations|ABBREVIATIONS):\s*(.*)/i);
  if (match) {
    const abbrevText = match[1];
    // Parse key=value pairs separated by semicolons
    abbrevText.split(/[;,]/).forEach(pair => {
      const [key, value] = pair.split('=').map(s => s.trim());
      if (key && value) {
        abbreviations[key] = value;
      }
    });
  }

  return abbreviations;
}

// ==================== Figure Template Import from RTF ====================

interface RTFFigureSpec {
  chartType: 'line' | 'scatter' | 'bar' | 'box' | 'violin' | 'waterfall' | 'km_curve' | 'forest';
  title?: string;
  xLabel?: string;
  yLabel?: string;
  xAxis?: IAxisConfig;
  yAxis?: IAxisConfig;
  series?: IChartSeries[];
  legend?: any;
}

/**
 * Extract figure specification from RTF content
 */
export function extractFigureFromRTF(rtfContent: string): RTFFigureSpec {
  const spec: RTFFigureSpec = {
    chartType: 'line',
  };

  // Detect chart type from content
  if (rtfContent.toLowerCase().includes('kaplan-meier') ||
      rtfContent.toLowerCase().includes('survival probability')) {
    spec.chartType = 'km_curve';
    spec.xLabel = 'Time (Days)';
    spec.yLabel = 'Survival Probability';
  } else if (rtfContent.toLowerCase().includes('concentration') &&
             rtfContent.toLowerCase().includes('time')) {
    spec.chartType = 'line';
    spec.xLabel = 'Time (h)';
    spec.yLabel = 'Concentration (ng/mL)';
  } else if (rtfContent.toLowerCase().includes('bar') ||
             rtfContent.toLowerCase().includes('response rate')) {
    spec.chartType = 'bar';
    spec.xLabel = 'Treatment';
    spec.yLabel = 'Response Rate (%)';
  } else if (rtfContent.toLowerCase().includes('forest') ||
             rtfContent.toLowerCase().includes('odds ratio') ||
             rtfContent.toLowerCase().includes('confidence interval')) {
    spec.chartType = 'forest';
    spec.xLabel = 'Odds Ratio';
    spec.yLabel = 'Study';
  }

  // Extract title from figure caption
  const titleMatch = rtfContent.match(/Figure\s+\d+(?:\.\d+)*\s*[:.]?\s*(.+?)(?:\n|$)/i);
  if (titleMatch) {
    spec.title = titleMatch[1].trim();
  }

  // Extract axis labels
  const xLabelMatch = rtfContent.match(/x[- ]axis[:\s]+(.+?)(?:\n|$)/i);
  if (xLabelMatch) {
    spec.xLabel = xLabelMatch[1].trim();
  }

  const yLabelMatch = rtfContent.match(/y[- ]axis[:\s]+(.+?)(?:\n|$)/i);
  if (yLabelMatch) {
    spec.yLabel = yLabelMatch[1].trim();
  }

  return spec;
}

/**
 * Create figure template from RTF specification
 */
export function createFigureTemplateFromRTF(
  rtfContent: string,
  category: string
): ITemplate {
  const spec = extractFigureFromRTF(rtfContent);

  return {
    id: `tpl_figure_${Date.now()}`,
    type: 'figure',
    name: spec.title || 'Imported Figure',
    category,
    description: `Figure template extracted from RTF`,
    shell: {
      chartType: spec.chartType,
      title: spec.title || '',
      xAxis: spec.xAxis || { label: spec.xLabel || '', type: 'continuous' },
      yAxis: spec.yAxis || { label: spec.yLabel || '', type: 'continuous' },
      series: spec.series || [],
      legend: spec.legend,
    } as any,
    createdAt: new Date().toISOString(),
  };
}

// ==================== Listing Template Import from RTF ====================

interface RTFListingSpec {
  columns: Omit<IListingColumn, 'id'>[];
  title?: string;
  sortRules?: ISortConfig[];
  filterRules?: IFilterConfig[];
}

/**
 * Extract listing specification from RTF content
 */
export function extractListingFromRTF(rtfContent: string): RTFListingSpec {
  const spec: RTFListingSpec = {
    columns: [],
  };

  // Extract title
  const titleMatch = rtfContent.match(/Listing\s+\d+(?:\.\d+)*\s*[:.]?\s*(.+?)(?:\n|$)/i);
  if (titleMatch) {
    spec.title = titleMatch[1].trim();
  }

  // Parse table structure from RTF
  // This is a simplified parser - real implementation would need full RTF parsing
  const tableMatch = rtfContent.match(/\\trowd.+?\\row/gs);
  if (tableMatch) {
    // Extract column headers from first row
    const headerRow = tableMatch[0];
    const cells = headerRow.match(/\\cellx\d+/g);
    if (cells) {
      // Calculate column widths
      const widths = cells.map(cell => parseInt(cell.replace('\\cellx', '')));
      for (let i = 0; i < widths.length; i++) {
        const width = i === 0 ? widths[i] : widths[i] - widths[i - 1];
        spec.columns.push({
          variable: `col_${i}`,
          label: `Column ${i + 1}`,
          width: Math.floor(width / 10), // Convert from twips to approximate pixels
          alignment: 'left' as const,
          dataType: 'string' as const,
          visible: true,
          sortOrder: i,
        });
      }
    }
  }

  // Detect common listing columns by name patterns
  const commonColumns = [
    { var: 'USUBJID', label: 'Subject ID' },
    { var: 'TRT01P', label: 'Treatment' },
    { var: 'DSREAS', label: 'Discontinuation Reason' },
    { var: 'AEBODSYS', label: 'Body System' },
    { var: 'AEDECOD', label: 'Preferred Term' },
    { var: 'AETOXGR', label: 'Severity' },
    { var: 'AEREL', label: 'Relationship' },
    { var: 'CMDECOD', label: 'Medication Name' },
    { var: 'CMINDC', label: 'Indication' },
  ];

  const rtfLower = rtfContent.toLowerCase();
  commonColumns.forEach((col, idx) => {
    if (rtfLower.includes(col.var.toLowerCase()) || rtfLower.includes(col.label.toLowerCase())) {
      if (spec.columns[idx]) {
        spec.columns[idx].variable = col.var;
        spec.columns[idx].label = col.label;
      }
    }
  });

  return spec;
}

/**
 * Create listing template from RTF specification
 */
export function createListingTemplateFromRTF(
  rtfContent: string,
  category: string
): ITemplate {
  const spec = extractListingFromRTF(rtfContent);

  return {
    id: `tpl_listing_${Date.now()}`,
    type: 'listing',
    name: spec.title || 'Imported Listing',
    category,
    description: `Listing template extracted from RTF`,
    shell: {
      title: spec.title || '',
      columns: spec.columns.map((col, i) => ({ ...col, id: `col_${i}` })),
      sortRules: spec.sortRules || [],
      filterRules: spec.filterRules || [],
      pageSize: 10,
    } as any,
    createdAt: new Date().toISOString(),
  };
}

// ==================== Template Application ====================

/**
 * Apply a table template to a display
 */
export function applyTableTemplate(
  displayId: string,
  document: IARSDocument,
  template: ITemplate
): IARSDocument {
  const shell = template.shell as ITemplateShell;

  // Create new display based on template
  const newDisplay: IDisplay = {
    id: displayId,
    name: template.name,
    label: template.name,
    displayTitle: shell.title,
    displayOrder: document.displays.length + 1,
    displayType: 'table',
    resultDisplayType: 'table',
    outputs: [],
    analysisId: '',
    outputId: '',
    displaySections: [
      {
        type: 'Title',
        content: {
          text: shell.title,
          orderedSubsections: [
            { id: `title_1`, text: shell.title, order: 1 },
          ],
        },
      },
      {
        type: 'Body',
        content: {
          rows: createBodyRowsFromTemplate(shell.rows),
        },
      },
    ],
  };

  return {
    ...document,
    displays: [...document.displays, newDisplay],
  };
}

/**
 * Create body rows from template row definitions
 */
function createBodyRowsFromTemplate(templateRows: any[]): IBodyRow[] {
  return templateRows.map(row => ({
    id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    label: row.label,
    indentLevel: row.level || 0,
    rowType: row.stats?.[0]?.type === 'header' ? 'header' : 'data',
    variable: row.variable,
    cells: [],
    isDraggable: true,
    isExpanded: true,
    boundMethod: row.stats?.[0] ? {
      methodId: '',
      methodType: row.stats[0].type,
      decimalPlaces: row.stats[0].type === 'n' || row.stats[0].type === 'n_percent' ? 0 : 1,
    } : undefined,
  }));
}

/**
 * Apply a figure template to a display
 */
export function applyFigureTemplate(
  displayId: string,
  document: IARSDocument,
  template: ITemplate
): IARSDocument {
  const shell = template.shell as any;

  const newDisplay: IDisplay = {
    id: displayId,
    name: template.name,
    label: template.name,
    displayTitle: shell.title,
    displayOrder: document.displays.length + 1,
    displayType: 'figure',
    resultDisplayType: 'figure',
    outputs: [],
    analysisId: '',
    outputId: '',
    displaySections: [
      {
        type: 'Title',
        content: {
          text: shell.title,
          orderedSubsections: [
            { id: `title_1`, text: shell.title, order: 1 },
          ],
        },
      },
      {
        type: 'Chart',
        content: {
          chartType: shell.chartType,
          xAxis: shell.xAxis,
          yAxis: shell.yAxis,
          series: shell.series || [],
          legend: shell.legend,
          style: {
            width: 800,
            height: 600,
          },
        },
      },
    ],
  };

  return {
    ...document,
    displays: [...document.displays, newDisplay],
  };
}

/**
 * Apply a listing template to a display
 */
export function applyListingTemplate(
  displayId: string,
  document: IARSDocument,
  template: ITemplate
): IARSDocument {
  const shell = template.shell as any;

  const newDisplay: IDisplay = {
    id: displayId,
    name: template.name,
    label: template.name,
    displayTitle: shell.title,
    displayOrder: document.displays.length + 1,
    displayType: 'listing',
    resultDisplayType: 'listing',
    outputs: [],
    analysisId: '',
    outputId: '',
    displaySections: [
      {
        type: 'Title',
        content: {
          text: shell.title,
          orderedSubsections: [
            { id: `title_1`, text: shell.title, order: 1 },
          ],
        },
      },
      {
        type: 'Listing',
        content: {
          columns: shell.columns || [],
          sortRules: shell.sortRules || [],
          filterRules: shell.filterRules || [],
          pageSize: shell.pageSize || 10,
        },
      },
    ],
  };

  return {
    ...document,
    displays: [...document.displays, newDisplay],
  };
}

/**
 * Apply any template to a display
 */
export function applyTemplate(
  displayId: string,
  document: IARSDocument,
  template: ITemplate
): IARSDocument {
  switch (template.type) {
    case 'table':
      return applyTableTemplate(displayId, document, template);
    case 'figure':
      return applyFigureTemplate(displayId, document, template);
    case 'listing':
      return applyListingTemplate(displayId, document, template);
    default:
      return document;
  }
}

// ==================== Import All Functions ====================

/**
 * Import all templates from a JSON export file
 */
export async function importAllTemplatesFromJSON(
  json: CommercialExport
): Promise<{ templates: ITemplate[]; studyInfo?: IStudyInfo; populations?: IPopulationDefinition[] }> {
  const templates = await importTableTemplatesFromJSON(json);
  const studyInfo = importStudyMetadata(json);
  const populations = importPopulations(json);

  return {
    templates,
    studyInfo,
    populations,
  };
}

/**
 * Batch import from multiple JSON files
 */
export async function importMultipleJSONFiles(
  files: File[]
): Promise<{ templates: ITemplate[]; studyInfo?: IStudyInfo; populations?: IPopulationDefinition[] }> {
  const allTemplates: ITemplate[] = [];
  let combinedStudyInfo: IStudyInfo | undefined;
  const allPopulations: IPopulationDefinition[] = [];

  for (const file of files) {
    try {
      const text = await file.text();
      const json = JSON.parse(text) as CommercialExport;
      const result = await importAllTemplatesFromJSON(json);

      allTemplates.push(...result.templates);
      if (!combinedStudyInfo && result.studyInfo) {
        combinedStudyInfo = result.studyInfo;
      }
      if (result.populations) {
        allPopulations.push(...result.populations);
      }
    } catch (error) {
      console.error(`Error importing ${file.name}:`, error);
    }
  }

  // Deduplicate populations
  const uniquePopulations = allPopulations.filter((pop, index, self) =>
    index === self.findIndex(p => p.id === pop.id)
  );

  return {
    templates: allTemplates,
    studyInfo: combinedStudyInfo,
    populations: uniquePopulations,
  };
}

// ==================== Enhanced ARS Import ====================

/**
 * Enhanced import function that properly converts CDISC ARS JSON to templates
 * Handles the complete export format with analyses, methods, and displays
 */
export function importARSJSONToTemplates(json: CommercialExport): Template[] {
  const templates: Template[] = [];
  const outputs = json.outputs || [];

  for (const output of outputs) {
    const display = output.displays?.[0]?.display;
    if (!display) continue;

    // Extract template metadata from display
    const template = convertDisplayToTemplate(display, output, json);
    if (template) {
      templates.push(template);
    }
  }

  return templates;
}

/**
 * Convert a CDISC ARS display to a Template object
 */
function convertDisplayToTemplate(
  display: DisplayData['display'],
  output: OutputData,
  json: CommercialExport
): Template | null {
  // Extract title info
  const titleSection = display.displaySections?.find(
    (s: DisplaySection) => s.sectionType === 'Title'
  );
  const footnoteSection = display.displaySections?.find(
    (s: DisplaySection) => s.sectionType === 'Footnote'
  );
  const abbrevSection = display.displaySections?.find(
    (s: DisplaySection) => s.sectionType === 'Abbreviations'
  );
  const rowLabelHeader = display.displaySections?.find(
    (s: DisplaySection) => s.sectionType === 'Rowlabel Header'
  );

  // Parse title components
  let shellNumber = '';
  let title = display.displayTitle || display.name;
  let population = 'Safety';

  if (titleSection?.orderedSubSections) {
    const texts = titleSection.orderedSubSections.map((s: any) => s.subSection.text);
    if (texts[0]) shellNumber = texts[0];
    if (texts[1]) title = texts[1];
    if (texts[2]) population = texts[2].replace(' Population', '').replace(' Population 2', '');
  }

  // Determine category from name
  const category = determineCategoryFromName(output.name);

  // Parse footnotes
  const footnotes: string[] = [];
  if (footnoteSection?.orderedSubSections) {
    footnoteSection.orderedSubSections.forEach((s: any) => {
      if (s.subSection.text) footnotes.push(s.subSection.text);
    });
  }

  // Parse abbreviations
  let abbreviations: Record<string, string> = {};
  if (abbrevSection?.orderedSubSections) {
    const abbrevText = abbrevSection.orderedSubSections[0]?.subSection.text || '';
    abbreviations = parseAbbreviations(abbrevText);
  }

  // Build table rows from analyses if available
  const rows = buildRowsFromAnalyses(json, output.id, rowLabelHeader);

  // Determine display type
  const displayType = determineDisplayType(display, json);

  // Create appropriate shell based on type
  let shell: TableShell | any;

  if (displayType === 'table') {
    shell = {
      id: display.id,
      shellNumber,
      title,
      population,
      category,
      dataset: 'ADSL',
      treatmentArmSetId: '',
      statisticsSetId: 'ss1',
      rows,
      footer: {
        source: 'ADSL',
        notes: footnotes,
        abbreviations,
      },
    };
  } else if (displayType === 'figure') {
    shell = {
      id: display.id,
      figureNumber: shellNumber,
      title,
      population,
      chartType: 'line' as const,
      xAxis: { label: '', type: 'continuous' as const },
      yAxis: { label: '', type: 'continuous' as const },
      series: [],
    };
  } else {
    // listing
    shell = {
      id: display.id,
      listingNumber: shellNumber,
      title,
      population,
      dataset: 'ADSL',
      columns: rows.map((row: TableRow, idx: number) => ({
        id: `col_${idx}`,
        name: row.label.replace(/[^\w]/g, '_').toLowerCase(),
        label: row.label,
        width: 120,
      })),
    };
  }

  // Generate unique ID to avoid collisions across multiple imports
  const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  return {
    id: `tpl_ref_${display.id}_${uniqueSuffix}`,
    type: displayType,
    name: output.name,
    category,
    description: `Imported from ${json.name || 'Reference Template'}`,
    shell,
    createdAt: new Date().toISOString().split('T')[0],
  };
}

/**
 * Build table rows from analyses in the JSON
 */
function buildRowsFromAnalyses(
  json: CommercialExport,
  outputId: string,
  rowLabelHeader?: DisplaySection
): TableRow[] {
  const rows: TableRow[] = [];

  // Add row label header if present
  if (rowLabelHeader?.orderedSubSections?.[0]) {
    const headerText = rowLabelHeader.orderedSubSections[0].subSection.text;
    rows.push({
      id: `row_header_${0}`,
      label: headerText,
      level: 0,
      stats: [{ type: 'header' }],
    });
  }

  // Find analyses linked to this output via LOPA
  const linkedAnalyses = findAnalysesForOutput(json, outputId);

  // Convert analyses to rows
  linkedAnalyses.forEach((analysis, idx) => {
    rows.push({
      id: `row_${analysis.id || idx}`,
      label: analysis.name || `Row ${idx + 1}`,
      level: 0,
      variable: analysis.variable,
      stats: [{ type: 'n_percent' }],
    });
  });

  // If no analyses found, create placeholder rows based on category
  if (rows.length === 0) {
    rows.push(
      { id: 'row_1', label: 'n', level: 0, stats: [{ type: 'n' }] },
      { id: 'row_2', label: '%', level: 0, stats: [{ type: 'percent' }] }
    );
  }

  return rows;
}

/**
 * Find analyses linked to an output via the LOPA structure
 */
function findAnalysesForOutput(json: CommercialExport, outputId: string): IAnalysis[] {
  const analyses: IAnalysis[] = [];
  const analysesMap = new Map((json.analyses || []).map((a: IAnalysis) => [a.id, a]));

  // Traverse LOPA to find linked analyses
  if (json.mainListOfContents?.contentsList?.listItems) {
    traverseLOPAForAnalyses(json.mainListOfContents.contentsList.listItems, outputId, analysesMap, analyses);
  }

  return analyses;
}

/**
 * Recursively traverse LOPA structure to find linked analyses
 */
function traverseLOPAForAnalyses(
  items: LOPAListItem[],
  outputId: string,
  analysesMap: Map<string, IAnalysis>,
  result: IAnalysis[]
): void {
  for (const item of items) {
    if (item.outputId === outputId && item.analysisId) {
      const analysis = analysesMap.get(item.analysisId);
      if (analysis) result.push(analysis);
    }
    if (item.sublist?.listItems) {
      traverseLOPAForAnalyses(item.sublist.listItems, outputId, analysesMap, result);
    }
  }
}

/**
 * Determine display type from display content
 */
function determineDisplayType(display: DisplayData['display'], json: CommercialExport): 'table' | 'figure' | 'listing' {
  const name = (display.name || '').toLowerCase();

  if (name.includes('figure') || name.includes('chart') || name.includes('plot')) {
    return 'figure';
  }
  if (name.includes('listing') || name.includes('data listing')) {
    return 'listing';
  }
  return 'table';
}

// Interface for TableRow (matching the Template types)
interface TableRow {
  id: string;
  label: string;
  level: number;
  variable?: string;
  stats?: Array<{ type: string; decimals?: number }>;
}
