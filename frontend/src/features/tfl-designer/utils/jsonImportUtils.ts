// frontend/src/features/tfl-designer/utils/jsonImportUtils.ts

/**
 * JSON Import Utilities
 *
 * Parse Clymb Clinical ARS format JSON into shell templates.
 */
import type { AnalysisCategory, TableShell } from '../types';
import { generateId } from '../types';

// ARS JSON format interfaces
interface ARSAbout {
  version: string;
}

interface ARSStudyInfo {
  studyId: string;
  therapeuticArea?: string;
}

interface ARSResult {
  formattedValue?: string;
  rawValue?: string;
}

interface ARSAnalysis {
  dataset: string;
  id: string;
  name: string;
  results: ARSResult[];
  variable: string;
}

interface ARSDisplaySection {
  orderedSubSections?: Array<{
    subSection: { text: string };
  }>;
  sectionType: string;
}

interface ARSDisplay {
  displaySections: ARSDisplaySection[];
  displayTitle: string;
  id: string;
  name: string;
}

interface ARSOutput {
  displays: Array<{ display: ARSDisplay }>;
  id: string;
  name: string;
}

interface ARSExportJSON {
  about: ARSAbout;
  analyses: ARSAnalysis[];
  outputs: ARSOutput[];
  studyInfo: ARSStudyInfo;
}

/** Parse ARS JSON to TableShell templates */
export function parseARSJSONToShells(json: ARSExportJSON): Partial<TableShell>[] {
  const shells: Partial<TableShell>[] = [];

  for (const output of json.outputs || []) {
    for (const displayItem of output.displays || []) {
      const display = displayItem.display;
      const sections = display.displaySections || [];

      const titleSection = sections.find(s => s.sectionType === 'Title');
      const footnoteSection = sections.find(s => s.sectionType === 'Footnote');

      const shellNumber = titleSection?.orderedSubSections?.[0]?.subSection?.text || '';
      const title = titleSection?.orderedSubSections?.[1]?.subSection?.text || display.displayTitle;

      const footerNotes = footnoteSection?.orderedSubSections?.map(s => s.subSection.text) || [];

      const shell: Partial<TableShell> = {
        category: inferCategory(display.name),
        dataset: 'ADSL',
        footer: {
          notes: footerNotes,
          source: 'ADSL'
        },
        id: generateId('table'),
        population: 'Safety',
        rows: [],
        shellNumber,
        title
      };

      shells.push(shell);
    }
  }

  return shells;
}

/** Infer category from template name */
function inferCategory(name: string): AnalysisCategory {
  const lowerName = name.toLowerCase();

  if (lowerName.includes('demograph') || lowerName.includes('age') || lowerName.includes('sex')) {
    return 'Demographics';
  }
  if (lowerName.includes('adverse') || lowerName.includes('ae ') || lowerName.includes(' sae')) {
    return 'Adverse_Events';
  }
  if (lowerName.includes('efficacy') || lowerName.includes('primary')) {
    return 'Efficacy';
  }
  if (lowerName.includes('laboratory') || lowerName.includes('lab ')) {
    return 'Laboratory';
  }
  if (lowerName.includes('vital') || lowerName.includes('sign')) {
    return 'Vital_Signs';
  }
  if (lowerName.includes('concomitant') || lowerName.includes('medication')) {
    return 'Concomitant_Meds';
  }

  return 'Other';
}

/** Validate ARS JSON structure */
export function validateARSJSON(json: unknown): json is ARSExportJSON {
  if (!json || typeof json !== 'object') return false;

  const obj = json as Record<string, unknown>;

  // Check required fields
  if (!obj.about || typeof obj.about !== 'object') return false;
  if (!Array.isArray(obj.outputs)) return false;

  return true;
}

export type { ARSAnalysis, ARSExportJSON, ARSOutput };
