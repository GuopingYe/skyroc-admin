// @ts-nocheck
/**
 * TFL Builder - Template Utilities
 *
 * Functions for importing, parsing, and applying templates from JSON metadata exports and RTF files
 */

import type {
  AnalysisCategory,
  IARSDocument,
  IAnalysis,
  IAxisConfig,
  IBodyRow,
  IChartSeries,
  IDisplay,
  IFilterConfig,
  IGrouping,
  IListingColumn,
  IMethod,
  IOutput,
  IPopulationDefinition,
  ISortConfig,
  IStudyInfo,
  ITemplateShell,
  TableRow,
  TableShell,
  Template
} from '../types';

// ==================== JSON Import Types ====================

interface CommercialExport {
  about?: {
    generatedUsing?: string;
    note?: string;
    version?: string;
  };
  analyses?: IAnalysis[];
  displayDocuments?: any[];
  id: string;
  mainListOfContents?: {
    contentsList: {
      listItems: LOPAListItem[];
    };
    label: string;
    name: string;
  };
  methods?: IMethod[];
  name: string;
  outputs?: OutputData[];
  studyInfo?: {
    compoundUnderStudy: string;
    description?: string;
    diseaseArea: string;
    phase: string[];
    studyId: string;
    studyTitle: string;
    therapeuticArea: string;
  };
}

interface LOPAListItem {
  analysisId?: string;
  level: number;
  name: string;
  order: number;
  outputId?: string;
  sublist?: {
    listItems: LOPAListItem[];
  };
}

interface OutputData {
  categoryIds?: string[];
  displays?: DisplayData[];
  documentRefs?: any[];
  fileSpecifications?: any[];
  id: string;
  name: string;
  programmingCode?: any;
  version: number;
}

interface DisplayData {
  display: {
    displaySections: DisplaySection[];
    displayTitle?: string;
    id: string;
    name: string;
    version: number;
  };
  order: number;
}

interface DisplaySection {
  orderedSubSections?: Array<{
    order: number;
    subSection: {
      id: string;
      text: string;
    };
  }>;
  sectionType: string;
}

// ==================== Study Info Import ====================

/** Extract study-level metadata from commercial JSON export */
export function importStudyMetadata(json: CommercialExport): IStudyInfo {
  return {
    compoundUnderStudy: json.studyInfo?.compoundUnderStudy || '',
    description: json.studyInfo?.description,
    diseaseArea: json.studyInfo?.diseaseArea || '',
    phase: json.studyInfo?.phase || [],
    studyId: json.studyInfo?.studyId || '',
    studyTitle: json.studyInfo?.studyTitle || '',
    therapeuticArea: json.studyInfo?.therapeuticArea || '',
    version: 1
  };
}

/** Extract population definitions from analysis sets */
export function importPopulations(json: CommercialExport): IPopulationDefinition[] {
  const populations: IPopulationDefinition[] = [];
  const categoryIds = new Set<string>();

  // Collect all category IDs from analyses
  json.analyses?.forEach(analysis => {
    analysis.categoryIds?.forEach(catId => categoryIds.add(catId));
  });

  // Create population definitions from category IDs
  const populationMap: Record<string, string> = {
    ANSET_02: 'All Enrolled Population',
    ANSET_03: 'Safety Population',
    ANSET_04: 'Intent-To-Treat (ITT)',
    ANSET_05: 'Full Analysis Set (FAS)',
    ANSET_06: 'Per-Protocol Set (PPS)'
  };

  categoryIds.forEach(catId => {
    if (populationMap[catId]) {
      populations.push({
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        dataset: json.analyses?.[0]?.dataset || 'ADSL',
        description: `Analysis population for ${catId}`,
        id: catId,
        name: populationMap[catId],
        version: 1
      });
    }
  });

  return populations;
}

// ==================== Table Template Import ====================

/** Parse LOPA structure to extract output hierarchy */
function parseLOPAHierarchy(listItems: LOPAListItem[]): ITemplateCategory[] {
  const categories: ITemplateCategory[] = [];

  listItems.forEach(item => {
    if (item.outputId) {
      categories.push({
        analyses: item.sublist?.listItems || [],
        name: item.name,
        outputId: item.outputId
      });
    }
  });

  return categories;
}

interface TemplateCategory {
  analyses: LOPAListItem[];
  name: string;
  outputId: string;
}

/** Determine category from output name */
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
  if (
    lower.includes('laboratory') ||
    lower.includes('lab') ||
    lower.includes('hematology') ||
    lower.includes('chemistry')
  ) {
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

/** Import table templates from commercial JSON export */
export async function importTableTemplatesFromJSON(json: CommercialExport): Promise<Template[]> {
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
      category: templateCategory,
      createdAt: new Date().toISOString(),
      description: `Imported from ${json.name} - ${category.name}`,
      id: `tpl_${templateCategory.toLowerCase()}_${category.outputId}`,
      name: category.name,
      shell: createTableShellFromDisplay(display, templateCategory, output),
      type: 'table'
    };

    templates.push(template);
  }

  return templates;
}

/** Create table shell structure from display data */
function createTableShellFromDisplay(
  display: DisplayData['display'],
  category: string,
  output: OutputData
): ITemplateShell {
  const shell: ITemplateShell = {
    category,
    dataset: 'ADSL',
    id: display.id,
    population: 'Safety',
    rows: [],
    shellNumber: 'Imported',
    statisticsSetId: '',
    title: display.displayTitle || display.name,
    treatmentArmSetId: ''
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
      notes: footnoteSection.orderedSubSections.map(s => s.subSection.text),
      source: ''
    };
  }

  // Extract abbreviations
  const abbrevSection = display.displaySections.find(s => s.sectionType === 'Abbreviations');
  if (abbrevSection?.orderedSubSections) {
    if (!shell.footer) shell.footer = { notes: [], source: '' };
    const abbrevText = abbrevSection.orderedSubSections[0]?.subSection.text || '';
    shell.footer.abbreviations = parseAbbreviations(abbrevText);
  }

  return shell;
}

/** Parse abbreviations from text Format: "Abbreviations: N=Number of subjects; SD=Standard Deviation" */
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
  chartType: 'bar' | 'box' | 'forest' | 'km_curve' | 'line' | 'scatter' | 'violin' | 'waterfall';
  legend?: any;
  series?: IChartSeries[];
  title?: string;
  xAxis?: IAxisConfig;
  xLabel?: string;
  yAxis?: IAxisConfig;
  yLabel?: string;
}

/** Extract figure specification from RTF content */
export function extractFigureFromRTF(rtfContent: string): RTFFigureSpec {
  const spec: RTFFigureSpec = {
    chartType: 'line'
  };

  // Detect chart type from content
  if (rtfContent.toLowerCase().includes('kaplan-meier') || rtfContent.toLowerCase().includes('survival probability')) {
    spec.chartType = 'km_curve';
    spec.xLabel = 'Time (Days)';
    spec.yLabel = 'Survival Probability';
  } else if (rtfContent.toLowerCase().includes('concentration') && rtfContent.toLowerCase().includes('time')) {
    spec.chartType = 'line';
    spec.xLabel = 'Time (h)';
    spec.yLabel = 'Concentration (ng/mL)';
  } else if (rtfContent.toLowerCase().includes('bar') || rtfContent.toLowerCase().includes('response rate')) {
    spec.chartType = 'bar';
    spec.xLabel = 'Treatment';
    spec.yLabel = 'Response Rate (%)';
  } else if (
    rtfContent.toLowerCase().includes('forest') ||
    rtfContent.toLowerCase().includes('odds ratio') ||
    rtfContent.toLowerCase().includes('confidence interval')
  ) {
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

/** Create figure template from RTF specification */
export function createFigureTemplateFromRTF(rtfContent: string, category: string): ITemplate {
  const spec = extractFigureFromRTF(rtfContent);

  return {
    category,
    createdAt: new Date().toISOString(),
    description: `Figure template extracted from RTF`,
    id: `tpl_figure_${Date.now()}`,
    name: spec.title || 'Imported Figure',
    shell: {
      chartType: spec.chartType,
      legend: spec.legend,
      series: spec.series || [],
      title: spec.title || '',
      xAxis: spec.xAxis || { label: spec.xLabel || '', type: 'continuous' },
      yAxis: spec.yAxis || { label: spec.yLabel || '', type: 'continuous' }
    } as any,
    type: 'figure'
  };
}

// ==================== Listing Template Import from RTF ====================

interface RTFListingSpec {
  columns: Omit<IListingColumn, 'id'>[];
  filterRules?: IFilterConfig[];
  sortRules?: ISortConfig[];
  title?: string;
}

/** Extract listing specification from RTF content */
export function extractListingFromRTF(rtfContent: string): RTFListingSpec {
  const spec: RTFListingSpec = {
    columns: []
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
      const widths = cells.map(cell => Number.parseInt(cell.replace('\\cellx', '')));
      for (let i = 0; i < widths.length; i++) {
        const width = i === 0 ? widths[i] : widths[i] - widths[i - 1];
        spec.columns.push({
          // Convert from twips to approximate pixels
          alignment: 'left' as const,
          dataType: 'string' as const,
          label: `Column ${i + 1}`,
          sortOrder: i,
          variable: `col_${i}`,
          visible: true,
          width: Math.floor(width / 10)
        });
      }
    }
  }

  // Detect common listing columns by name patterns
  const commonColumns = [
    { label: 'Subject ID', var: 'USUBJID' },
    { label: 'Treatment', var: 'TRT01P' },
    { label: 'Discontinuation Reason', var: 'DSREAS' },
    { label: 'Body System', var: 'AEBODSYS' },
    { label: 'Preferred Term', var: 'AEDECOD' },
    { label: 'Severity', var: 'AETOXGR' },
    { label: 'Relationship', var: 'AEREL' },
    { label: 'Medication Name', var: 'CMDECOD' },
    { label: 'Indication', var: 'CMINDC' }
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

/** Create listing template from RTF specification */
export function createListingTemplateFromRTF(rtfContent: string, category: string): ITemplate {
  const spec = extractListingFromRTF(rtfContent);

  return {
    category,
    createdAt: new Date().toISOString(),
    description: `Listing template extracted from RTF`,
    id: `tpl_listing_${Date.now()}`,
    name: spec.title || 'Imported Listing',
    shell: {
      columns: spec.columns.map((col, i) => ({ ...col, id: `col_${i}` })),
      filterRules: spec.filterRules || [],
      pageSize: 10,
      sortRules: spec.sortRules || [],
      title: spec.title || ''
    } as any,
    type: 'listing'
  };
}

// ==================== Template Application ====================

/** Apply a table template to a display */
export function applyTableTemplate(displayId: string, document: IARSDocument, template: ITemplate): IARSDocument {
  const shell = template.shell as ITemplateShell;

  // Create new display based on template
  const newDisplay: IDisplay = {
    analysisId: '',
    displayOrder: document.displays.length + 1,
    displaySections: [
      {
        content: {
          orderedSubsections: [{ id: `title_1`, order: 1, text: shell.title }],
          text: shell.title
        },
        type: 'Title'
      },
      {
        content: {
          rows: createBodyRowsFromTemplate(shell.rows)
        },
        type: 'Body'
      }
    ],
    displayTitle: shell.title,
    displayType: 'table',
    id: displayId,
    label: template.name,
    name: template.name,
    outputId: '',
    outputs: [],
    resultDisplayType: 'table'
  };

  return {
    ...document,
    displays: [...document.displays, newDisplay]
  };
}

/** Create body rows from template row definitions */
function createBodyRowsFromTemplate(templateRows: any[]): IBodyRow[] {
  return templateRows.map(row => ({
    boundMethod: row.stats?.[0]
      ? {
          decimalPlaces: row.stats[0].type === 'n' || row.stats[0].type === 'n_percent' ? 0 : 1,
          methodId: '',
          methodType: row.stats[0].type
        }
      : undefined,
    cells: [],
    id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    indentLevel: row.level || 0,
    isDraggable: true,
    isExpanded: true,
    label: row.label,
    rowType: row.stats?.[0]?.type === 'header' ? 'header' : 'data',
    variable: row.variable
  }));
}

/** Apply a figure template to a display */
export function applyFigureTemplate(displayId: string, document: IARSDocument, template: ITemplate): IARSDocument {
  const shell = template.shell as any;

  const newDisplay: IDisplay = {
    analysisId: '',
    displayOrder: document.displays.length + 1,
    displaySections: [
      {
        content: {
          orderedSubsections: [{ id: `title_1`, order: 1, text: shell.title }],
          text: shell.title
        },
        type: 'Title'
      },
      {
        content: {
          chartType: shell.chartType,
          legend: shell.legend,
          series: shell.series || [],
          style: {
            height: 600,
            width: 800
          },
          xAxis: shell.xAxis,
          yAxis: shell.yAxis
        },
        type: 'Chart'
      }
    ],
    displayTitle: shell.title,
    displayType: 'figure',
    id: displayId,
    label: template.name,
    name: template.name,
    outputId: '',
    outputs: [],
    resultDisplayType: 'figure'
  };

  return {
    ...document,
    displays: [...document.displays, newDisplay]
  };
}

/** Apply a listing template to a display */
export function applyListingTemplate(displayId: string, document: IARSDocument, template: ITemplate): IARSDocument {
  const shell = template.shell as any;

  const newDisplay: IDisplay = {
    analysisId: '',
    displayOrder: document.displays.length + 1,
    displaySections: [
      {
        content: {
          orderedSubsections: [{ id: `title_1`, order: 1, text: shell.title }],
          text: shell.title
        },
        type: 'Title'
      },
      {
        content: {
          columns: shell.columns || [],
          filterRules: shell.filterRules || [],
          pageSize: shell.pageSize || 10,
          sortRules: shell.sortRules || []
        },
        type: 'Listing'
      }
    ],
    displayTitle: shell.title,
    displayType: 'listing',
    id: displayId,
    label: template.name,
    name: template.name,
    outputId: '',
    outputs: [],
    resultDisplayType: 'listing'
  };

  return {
    ...document,
    displays: [...document.displays, newDisplay]
  };
}

/** Apply any template to a display */
export function applyTemplate(displayId: string, document: IARSDocument, template: ITemplate): IARSDocument {
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

/** Import all templates from a JSON export file */
export async function importAllTemplatesFromJSON(
  json: CommercialExport
): Promise<{ populations?: IPopulationDefinition[]; studyInfo?: IStudyInfo; templates: ITemplate[] }> {
  const templates = await importTableTemplatesFromJSON(json);
  const studyInfo = importStudyMetadata(json);
  const populations = importPopulations(json);

  return {
    populations,
    studyInfo,
    templates
  };
}

/** Batch import from multiple JSON files */
export async function importMultipleJSONFiles(
  files: File[]
): Promise<{ populations?: IPopulationDefinition[]; studyInfo?: IStudyInfo; templates: ITemplate[] }> {
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
  const uniquePopulations = allPopulations.filter((pop, index, self) => index === self.findIndex(p => p.id === pop.id));

  return {
    populations: uniquePopulations,
    studyInfo: combinedStudyInfo,
    templates: allTemplates
  };
}

// ==================== Enhanced ARS Import ====================

/**
 * Enhanced import function that properly converts CDISC ARS JSON to templates Handles the complete export format with
 * analyses, methods, and displays
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

/** Convert a CDISC ARS display to a Template object */
function convertDisplayToTemplate(
  display: DisplayData['display'],
  output: OutputData,
  json: CommercialExport
): Template | null {
  // Extract title info
  const titleSection = display.displaySections?.find((s: DisplaySection) => s.sectionType === 'Title');
  const footnoteSection = display.displaySections?.find((s: DisplaySection) => s.sectionType === 'Footnote');
  const abbrevSection = display.displaySections?.find((s: DisplaySection) => s.sectionType === 'Abbreviations');
  const rowLabelHeader = display.displaySections?.find((s: DisplaySection) => s.sectionType === 'Rowlabel Header');

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
      category,
      dataset: 'ADSL',
      footer: {
        abbreviations,
        notes: footnotes,
        source: 'ADSL'
      },
      id: display.id,
      population,
      rows,
      shellNumber,
      statisticsSetId: 'ss1',
      title,
      treatmentArmSetId: ''
    };
  } else if (displayType === 'figure') {
    shell = {
      chartType: 'line' as const,
      figureNumber: shellNumber,
      id: display.id,
      population,
      series: [],
      title,
      xAxis: { label: '', type: 'continuous' as const },
      yAxis: { label: '', type: 'continuous' as const }
    };
  } else {
    // listing
    shell = {
      columns: rows.map((row: TableRow, idx: number) => ({
        id: `col_${idx}`,
        label: row.label,
        name: row.label.replace(/[^\w]/g, '_').toLowerCase(),
        width: 120
      })),
      dataset: 'ADSL',
      id: display.id,
      listingNumber: shellNumber,
      population,
      title
    };
  }

  // Generate unique ID to avoid collisions across multiple imports
  const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  return {
    category,
    createdAt: new Date().toISOString().split('T')[0],
    description: `Imported from ${json.name || 'Reference Template'}`,
    id: `tpl_ref_${display.id}_${uniqueSuffix}`,
    name: output.name,
    shell,
    type: displayType
  };
}

/** Build table rows from analyses in the JSON */
function buildRowsFromAnalyses(json: CommercialExport, outputId: string, rowLabelHeader?: DisplaySection): TableRow[] {
  const rows: TableRow[] = [];

  // Add row label header if present
  if (rowLabelHeader?.orderedSubSections?.[0]) {
    const headerText = rowLabelHeader.orderedSubSections[0].subSection.text;
    rows.push({
      id: `row_header_${0}`,
      label: headerText,
      level: 0,
      stats: [{ type: 'header' }]
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
      stats: [{ type: 'n_percent' }],
      variable: analysis.variable
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

/** Find analyses linked to an output via the LOPA structure */
function findAnalysesForOutput(json: CommercialExport, outputId: string): IAnalysis[] {
  const analyses: IAnalysis[] = [];
  const analysesMap = new Map((json.analyses || []).map((a: IAnalysis) => [a.id, a]));

  // Traverse LOPA to find linked analyses
  if (json.mainListOfContents?.contentsList?.listItems) {
    traverseLOPAForAnalyses(json.mainListOfContents.contentsList.listItems, outputId, analysesMap, analyses);
  }

  return analyses;
}

/** Recursively traverse LOPA structure to find linked analyses */
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

/** Determine display type from display content */
function determineDisplayType(display: DisplayData['display'], json: CommercialExport): 'figure' | 'listing' | 'table' {
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
  stats?: Array<{ decimals?: number; type: string }>;
  variable?: string;
}
