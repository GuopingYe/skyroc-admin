// @ts-nocheck - ARS import interfaces have type mismatches
/* TFL Builder - Import Utilities
 *
 * Functions for importing metadata from:
 *
 * - Commercial system JSON exports (LOPA structure)
 * - RTF files (for Figure/Listing specifications)
 *//**
 * TFL Builder - Import Utilities
 *
 * Functions for importing metadata from:
 *
 * - Commercial system JSON exports (LOPA structure)
 * - RTF files (for Figure/Listing specifications)
 */

import type {
  IARSDocument,
  IAnalysis,
  IDisplay,
  IGrouping,
  IMethod,
  IOutput,
  IPopulationDefinition,
  IStudyInfo,
  Template
} from '../types';

import { importAllTemplatesFromJSON, importPopulations, importStudyMetadata } from './templateUtils';

// ==================== JSON Import ====================

/** Import complete ARS document from commercial JSON export */
export async function importARSFromJSON(jsonFile: File): Promise<IARSDocument> {
  const text = await jsonFile.text();
  const jsonData = JSON.parse(text) as any;

  // Extract study info
  const studyInfo = importStudyMetadata(jsonData);

  // Extract populations
  const populations = importPopulations(jsonData);

  // Extract templates (from table structure)
  const { templates } = await importAllTemplatesFromJSON(jsonData);

  // Create outputs from LOPA structure
  const outputs: IOutput[] = extractOutputsFromLOPA(jsonData);

  // Create displays from outputs
  const displays: IDisplay[] = extractDisplaysFromOutputs(jsonData, outputs);

  // Extract groupings
  const groupings: IGrouping[] = extractGroupingsFromJSON(jsonData);

  // Extract methods
  const methods: IMethod[] = extractMethodsFromJSON(jsonData);

  return {
    analysis: {
      id: generateId('AN_'),
      name: studyInfo.studyTitle,
      objective: ''
    },
    canRedo: false,
    canUndo: false,
    displays,
    globalParameters: [],
    groupings,
    headerStyle: {
      alignment: 'center',
      columnHeaderBackground: '#f0f0f0',
      columnHeaderFont: 'Arial',
      columnHeaderSize: 10,
      id: 'default',
      name: 'Default',
      subtitleFont: 'Arial',
      subtitleSize: 11,
      titleFont: 'Arial',
      titleSize: 12
    },
    history: [],
    id: generateId('ARS_'),
    methods,
    outputs,
    populations,
    studyInfo
  };
}

/** Extract outputs from LOPA structure */
function extractOutputsFromLOPA(jsonData: any): IOutput[] {
  const outputs: IOutput[] = [];

  if (!jsonData.mainListOfContents || !jsonData.mainListOfContents.contentsList) {
    return outputs;
  }

  const listItems = jsonData.mainListOfContents.contentsList.listItems || [];
  const outputsData = jsonData.outputs || [];

  listItems.forEach((item: any) => {
    if (item.outputId) {
      const outputData = outputsData.find((o: any) => o.id === item.outputId);
      if (outputData) {
        outputs.push({
          analysisId: extractAnalysisIdFromLOPA(item),
          displayId: outputData.displays?.[0]?.display?.id || '',
          id: item.outputId,
          label: item.name,
          name: item.name,
          outputOrder: item.order,
          outputType: determineOutputTypeFromName(item.name)
        });
      }
    }
  });

  return outputs;
}

/** Extract displays from output data */
function extractDisplaysFromOutputs(jsonData: any, outputs: IOutput[]): IDisplay[] {
  const displays: IDisplay[] = [];
  const outputsData = jsonData.outputs || [];

  outputsData.forEach((outputData: any) => {
    if (outputData.displays) {
      outputData.displays.forEach((displayWrapper: any) => {
        const display = displayWrapper.display;
        if (display) {
          displays.push({
            analysisId: '',
            displayOrder: displayWrapper.order || 0,
            displaySections: extractDisplaySections(display),
            displayTitle: display.displayTitle,
            displayType: determineDisplayTypeFromName(display.name),
            id: display.id,
            label: display.name,
            name: display.name,
            outputId: outputData.id,
            outputs: [outputData.id],
            resultDisplayType: determineDisplayTypeFromName(display.name)
          });
        }
      });
    }
  });

  return displays;
}

/** Extract display sections from display data */
function extractDisplaySections(display: any): any[] {
  const sections: any[] = [];

  if (display.displaySections) {
    display.displaySections.forEach((section: any) => {
      const sectionData: any = {
        content: {},
        type: section.sectionType
      };

      switch (section.sectionType) {
        case 'Title':
          sectionData.content = {
            orderedSubsections: extractOrderedSubsections(section),
            text: extractTitleText(section)
          };
          break;

        case 'Abbreviations':
          sectionData.content = {
            orderedSubsections: extractOrderedSubsections(section),
            text: extractAbbreviationsText(section)
          };
          break;

        case 'Footnote':
          sectionData.content = {
            orderedSubsections: extractOrderedSubsections(section),
            text: ''
          };
          break;

        case 'Footer':
          sectionData.content = {
            notes: [],
            source: ''
          };
          break;

        case 'Body':
          sectionData.content = {
            rows: extractBodyRows(display)
          };
          break;

        case 'Chart':
          sectionData.content = {
            chartType: 'line',
            series: [],
            xAxis: { label: '', type: 'continuous' },
            yAxis: { label: '', type: 'continuous' }
          };
          break;

        case 'Listing':
          sectionData.content = {
            columns: [],
            filterRules: [],
            pageSize: 10,
            sortRules: []
          };
          break;

        default:
          sectionData.content = {};
      }

      sections.push(sectionData);
    });
  }

  return sections;
}

/** Extract title text from title section */
function extractTitleText(section: any): string {
  if (!section.orderedSubsections || section.orderedSubsections.length === 0) {
    return '';
  }

  // Return the first subsection that's not just a table number
  const subsections = section.orderedSubsections;
  if (subsections.length > 1) {
    return subsections
      .slice(1)
      .map((s: any) => s.text)
      .join(' - ');
  }

  return subsections[0]?.text || '';
}

/** Extract ordered subsections from section */
function extractOrderedSubsections(section: any): any[] {
  if (!section.orderedSubsections) {
    return [];
  }

  return section.orderedSubsections.map((sub: any, index: number) => ({
    id: sub.id || generateId('sub_'),
    order: index + 1,
    text: sub.text || ''
  }));
}

/** Extract abbreviations text */
function extractAbbreviationsText(section: any): string {
  if (!section.orderedSubsections || section.orderedSubsections.length === 0) {
    return '';
  }

  return section.orderedSubsections[0]?.text || '';
}

/** Extract body rows from display (simplified) */
function extractBodyRows(display: any): any[] {
  const rows: any[] = [];

  // In the actual JSON, body rows may be in different places
  // This is a simplified implementation
  // Real implementation would parse the row structure from the analysis or display sections

  return rows;
}

/** Extract groupings from JSON */
function extractGroupingsFromJSON(jsonData: any): IGrouping[] {
  const groupings: IGrouping[] = [];

  if (jsonData.groupings) {
    jsonData.groupings.forEach((grouping: any) => {
      groupings.push({
        analysisId: '',
        groupingOrder: 0,
        id: grouping.id,
        isCollapsed: false,
        label: grouping.name,
        name: grouping.name,
        variables: []
      });
    });
  }

  // Default groupings if none exist
  if (groupings.length === 0) {
    groupings.push(
      {
        analysisId: '',
        groupingOrder: 1,
        id: 'grp_treatment',
        isCollapsed: false,
        label: 'Treatment',
        name: 'Treatment',
        variables: ['TRT01P']
      },
      {
        analysisId: '',
        groupingOrder: 2,
        id: 'grp_visit',
        isCollapsed: false,
        label: 'Visit',
        name: 'Visit',
        variables: ['AVISIT']
      }
    );
  }

  return groupings;
}

/** Extract methods from JSON */
function extractMethodsFromJSON(jsonData: any): IMethod[] {
  const methods: IMethod[] = [];

  if (jsonData.methods) {
    jsonData.methods.forEach((method: any) => {
      methods.push({
        analysisId: '',
        id: method.id,
        label: method.name,
        methodOrder: 0,
        name: method.name,
        parameters: {}
      });
    });
  }

  // Default methods if none exist
  if (methods.length === 0) {
    const defaultMethods = ['n', 'mean', 'sd', 'median', 'min', 'max', 'n_percent', 'geometric_mean'];
    defaultMethods.forEach((method, index) => {
      methods.push({
        analysisId: '',
        id: `mth_${method}`,
        label: method.toUpperCase(),
        methodOrder: index + 1,
        name: method,
        parameters: {}
      });
    });
  }

  return methods;
}

/** Extract analysis ID from LOPA item (recursively) */
function extractAnalysisIdFromLOPA(item: any): string {
  if (item.analysisId) {
    return item.analysisId;
  }

  if (item.sublist && item.sublist.listItems) {
    for (const subItem of item.sublist.listItems) {
      const id = extractAnalysisIdFromLOPA(subItem);
      if (id) {
        return id;
      }
    }
  }

  return '';
}

/** Determine output type from name */
function determineOutputTypeFromName(name: string): string {
  const lower = name.toLowerCase();

  if (lower.includes('figure') || lower.includes('plot') || lower.includes('curve')) {
    return 'figure';
  }
  if (lower.includes('listing') || lower.includes('list')) {
    return 'listing';
  }

  return 'table';
}

/** Determine display type from name */
function determineDisplayTypeFromName(name: string): 'figure' | 'listing' | 'table' {
  const lower = name.toLowerCase();

  if (lower.includes('figure') || lower.includes('plot') || lower.includes('curve')) {
    return 'figure';
  }
  if (lower.includes('listing') || lower.includes('list')) {
    return 'listing';
  }

  return 'table';
}

// ==================== Batch JSON Import ====================

/** Import multiple JSON files and merge */
export async function importMultipleJSONFiles(files: File[]): Promise<{
  document: IARSDocument;
  errors: Array<{ error: string; file: string }>;
  importedFiles: string[];
}> {
  const importedFiles: string[] = [];
  const errors: Array<{ error: string; file: string }> = [];

  let combinedDocument: IARSDocument | null = null;

  for (const file of files) {
    try {
      const document = await importARSFromJSON(file);
      importedFiles.push(file.name);

      if (combinedDocument === null) {
        combinedDocument = document;
      } else {
        // Merge documents - add displays, outputs, etc.
        combinedDocument = {
          ...combinedDocument,
          displays: [...(combinedDocument.displays || []), ...(document.displays || [])],
          outputs: [...(combinedDocument.outputs || []), ...(document.outputs || [])]
        };
      }
    } catch (error) {
      errors.push({
        error: error instanceof Error ? error.message : 'Unknown error',
        file: file.name
      });
    }
  }

  return {
    document: combinedDocument || createEmptyDocument(),
    errors,
    importedFiles
  };
}

// ==================== RTF Import for Figures ====================

/** Parse RTF file to extract figure specifications */
export function importFigureFromRTF(rtfFile: File): Promise<{
  figureType: string;
  series?: any[];
  title: string;
  xAxis?: any;
  yAxis?: any;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const content = e.target?.result as string;
        const spec = parseRTFFigure(content);
        resolve(spec);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsText(rtfFile);
  });
}

/** Parse RTF content for figure specifications */
function parseRTFFigure(content: string): any {
  let chartType = 'line';
  let title = '';
  let xAxis = { label: '', type: 'continuous' };
  let yAxis = { label: '', type: 'continuous' };
  let series: any[] = [];

  const lower = content.toLowerCase();

  // Detect chart type
  if (lower.includes('kaplan-meier') || lower.includes('survival probability')) {
    chartType = 'km_curve';
    xAxis = { label: 'Time (Days)', type: 'continuous' };
    yAxis = { label: 'Survival Probability', type: 'continuous' };
  } else if (lower.includes('concentration') && lower.includes('time')) {
    chartType = 'line';
    xAxis = { label: 'Time (h)', type: 'continuous' };
    yAxis = { label: 'Concentration (ng/mL)', logScale: true, type: 'continuous' };
  } else if (lower.includes('bar') || lower.includes('response rate')) {
    chartType = 'bar';
    xAxis = { label: 'Treatment', type: 'categorical' };
    yAxis = { label: 'Response Rate (%)', type: 'continuous' };
  } else if (lower.includes('forest') || lower.includes('odds ratio')) {
    chartType = 'forest';
    xAxis = { label: 'Odds Ratio (log scale)', logScale: true, type: 'continuous' };
    yAxis = { label: 'Study', type: 'categorical' };
  }

  // Extract title
  const titleMatch = content.match(/Figure\s+\d+(?:\.\d+)*\s*[:.]?\s*(.+?)(?:\par|\n|$)/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // Extract axis labels
  const xLabelMatch = content.match(/x[-\s]?axis[:\s]+(.+?)(?:\par|\n|$)/i);
  if (xLabelMatch) {
    xAxis.label = xLabelMatch[1].trim();
  }

  const yLabelMatch = content.match(/y[-\s]?axis[:\s]+(.+?)(?:\par|\n|$)/i);
  if (yLabelMatch) {
    yAxis.label = yLabelMatch[1].trim();
  }

  // Extract series information from legend
  const legendMatch = content.match(/legend[:\s]+(.+?)(?:\par|\n|\sectd)/i);
  if (legendMatch) {
    const legendText = legendMatch[1];
    const seriesNames = legendText
      .split(/[,;]/)
      .map(s => s.trim())
      .filter(s => s);
    const colors = ['#1890ff', '#52c41a', '#fa8c16', '#cf1322', '#722ed1'];

    series = seriesNames.map((name, i) => ({
      color: colors[i % colors.length],
      id: generateId('ser_'),
      label: name,
      visible: true
    }));
  }

  return {
    figureType: chartType,
    series,
    title,
    xAxis,
    yAxis
  };
}

// ==================== RTF Import for Listings ====================

/** Parse RTF file to extract listing specifications */
export function importListingFromRTF(rtfFile: File): Promise<{
  columns: any[];
  filterRules?: any[];
  sortRules?: any[];
  title: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const content = e.target?.result as string;
        const spec = parseRTFListing(content);
        resolve(spec);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsText(rtfFile);
  });
}

/** Parse RTF content for listing specifications */
function parseRTFListing(content: string): any {
  const columns: any[] = [];
  let title = '';

  // Extract title
  const titleMatch = content.match(/Listing\s+\d+(?:\.\d+)*\s*[:.]?\s*(.+?)(?:\par|\n|$)/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // Parse table structure from RTF
  // Look for \trowd ... \row patterns
  const tableRows = content.match(/\trowd.+?\row/gs);

  if (tableRows && tableRows.length > 0) {
    // Extract column widths from first row
    const firstRow = tableRows[0];
    const cellxMatches = firstRow.match(/\cellx\d+/g);

    if (cellxMatches) {
      let previousWidth = 0;
      cellxMatches.forEach((match, index) => {
        const cellx = Number.parseInt(match.replace('\cellx', ''));
        const width = cellx - previousWidth;
        previousWidth = cellx;

        columns.push({
          alignment: 'left',
          dataType: 'string',
          id: generateId('col_'),
          label: `Column ${index + 1}`,
          sortOrder: index,
          variable: `col_${index}`,
          visible: true,
          width: Math.floor(width / 10)
        });
      });
    }

    // Try to map column names from header row content
    const headerRowContent = tableRows[0];
    const commonMappings = [
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

    commonMappings.forEach(mapping => {
      const content = content.toLowerCase();
      const index = columns.findIndex(
        c =>
          content.includes(mapping.var.toLowerCase()) ||
          headerRowContent.toLowerCase().includes(mapping.label.toLowerCase())
      );
      if (index >= 0) {
        columns[index].variable = mapping.var;
        columns[index].label = mapping.label;
      }
    });
  }

  return {
    columns,
    filterRules: [],
    sortRules: [],
    title
  };
}

// ==================== Utility Functions ====================

/** Generate unique ID */
function generateId(prefix: string): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** Create empty ARS document structure */
function createEmptyDocument(): IARSDocument {
  return {
    analysis: {
      id: '',
      name: '',
      objective: ''
    },
    canRedo: false,
    canUndo: false,
    displays: [],
    globalParameters: [],
    groupings: [],
    headerStyle: {
      alignment: 'center',
      columnHeaderBackground: '#f0f0f0',
      columnHeaderFont: 'Arial',
      columnHeaderSize: 10,
      id: 'default',
      name: 'Default',
      subtitleFont: 'Arial',
      subtitleSize: 11,
      titleFont: 'Arial',
      titleSize: 12
    },
    history: [],
    id: generateId('ARS_'),
    methods: [],
    outputs: [],
    populations: [],
    studyInfo: {
      compoundUnderStudy: '',
      diseaseArea: '',
      phase: [],
      studyId: '',
      studyTitle: '',
      therapeuticArea: ''
    }
  };
}

/** Validate JSON file format */
export function validateCommercialJSON(content: string): { errors: string[]; valid: boolean } {
  const errors: string[] = [];

  try {
    const json = JSON.parse(content);

    // Check required fields
    if (!json.studyInfo) {
      errors.push('Missing studyInfo section');
    }

    if (!json.mainListOfContents) {
      errors.push('Missing mainListOfContents section');
    }

    if (!json.outputs) {
      errors.push('Missing outputs section');
    }

    if (!json.analyses) {
      errors.push('Missing analyses section');
    }

    return {
      errors,
      valid: errors.length === 0
    };
  } catch (error) {
    return {
      errors: ['Invalid JSON format'],
      valid: false
    };
  }
}

/** Get import summary from JSON file */
export async function getImportSummary(jsonFile: File): Promise<{
  category: string;
  displayCount: number;
  outputCount: number;
  studyInfo?: IStudyInfo;
}> {
  const text = await jsonFile.text();
  const json = JSON.parse(text) as any;

  const studyInfo = importStudyMetadata(json);
  const outputCount = json.mainListOfContents?.contentsList?.listItems?.length || 0;
  const displayCount = json.outputs?.reduce((sum: number, o: any) => sum + (o.displays?.length || 0), 0) || 0;

  // Determine category from study info or outputs
  let category = 'General';
  if (studyInfo.therapeuticArea) {
    category = studyInfo.therapeuticArea;
  }

  return {
    category,
    displayCount,
    outputCount,
    studyInfo
  };
}
