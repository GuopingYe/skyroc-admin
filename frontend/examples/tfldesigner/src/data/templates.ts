/**
 * TFL Designer - 内置模板库
 * 基于 TFL Designer 研究的 107 个模板
 */

import type { Template } from '../types'

// ============ Demographics 模板 ============

export const demographicsTemplates: Template[] = [
  {
    id: 'tpl_demo_1',
    type: 'table',
    name: 'Demographics and Baseline Characteristics',
    category: 'Demographics',
    description: 'FDA STF-IG Table 02 - Baseline Demographic and Clinical Characteristics',
    shell: {
      id: 'tpl_demo_1',
      shellNumber: 'Table 14.1.1.5.1',
      title: 'Summary of Demographic and Baseline Characteristics',
      population: 'Safety',
      category: 'Demographics',
      dataset: 'ADSL',
      treatmentArmSetId: '',
      statisticsSetId: 'ss1',
      rows: [
        { id: 'r1', label: 'Age (years)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r2', label: '  n', level: 1, variable: 'AGE', stats: [{ type: 'n' }] },
        { id: 'r3', label: '  Mean (SD)', level: 1, variable: 'AGE', stats: [{ type: 'mean' }, { type: 'sd' }] },
        { id: 'r4', label: '  Median', level: 1, variable: 'AGE', stats: [{ type: 'median' }] },
        { id: 'r5', label: '  Min, Max', level: 1, variable: 'AGE', stats: [{ type: 'min' }, { type: 'max' }] },
        { id: 'r6', label: 'Sex, n (%)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r7', label: '  Male', level: 1, variable: 'SEX', stats: [{ type: 'n_percent' }] },
        { id: 'r8', label: '  Female', level: 1, variable: 'SEX', stats: [{ type: 'n_percent' }] },
        { id: 'r9', label: 'Race, n (%)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r10', label: '  White', level: 1, variable: 'RACE', stats: [{ type: 'n_percent' }] },
        { id: 'r11', label: '  Black or African American', level: 1, variable: 'RACE', stats: [{ type: 'n_percent' }] },
        { id: 'r12', label: '  Asian', level: 1, variable: 'RACE', stats: [{ type: 'n_percent' }] },
        { id: 'r13', label: '  Other', level: 1, variable: 'RACE', stats: [{ type: 'n_percent' }] },
        { id: 'r14', label: 'Ethnicity, n (%)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r15', label: '  Hispanic or Latino', level: 1, variable: 'ETHNIC', stats: [{ type: 'n_percent' }] },
        { id: 'r16', label: '  Not Hispanic or Latino', level: 1, variable: 'ETHNIC', stats: [{ type: 'n_percent' }] },
      ],
      footer: {
        source: 'ADSL',
        notes: [
          'N = Number of subjects in the analysis population',
          'SD = Standard Deviation',
          'n (%) = Number (percentage) of subjects',
        ],
      },
    },
    createdAt: '2026-03-14',
  },
]

// ============ Disposition 模板 ============

export const dispositionTemplates: Template[] = [
  {
    id: 'tpl_disp_1',
    type: 'table',
    name: 'Subject Disposition',
    category: 'Disposition',
    description: 'Summary of subject disposition and completion status',
    shell: {
      id: 'tpl_disp_1',
      shellNumber: 'Table 14.1.1.3',
      title: 'Summary of Subject Disposition',
      population: 'Safety',
      category: 'Disposition',
      dataset: 'ADSL',
      treatmentArmSetId: '',
      statisticsSetId: 'ss1',
      rows: [
        { id: 'r1', label: 'Screened', level: 0, stats: [{ type: 'n' }] },
        { id: 'r2', label: 'Enrolled', level: 0, stats: [{ type: 'n' }] },
        { id: 'r3', label: 'Safety Population', level: 0, stats: [{ type: 'n' }] },
        { id: 'r4', label: 'Completed Study', level: 0, stats: [{ type: 'n' }] },
        { id: 'r5', label: 'Discontinued, n (%)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r6', label: '  Adverse Event', level: 1, variable: 'DSREAS', stats: [{ type: 'n_percent' }] },
        { id: 'r7', label: '  Lack of Efficacy', level: 1, variable: 'DSREAS', stats: [{ type: 'n_percent' }] },
        { id: 'r8', label: '  Lost to Follow-up', level: 1, variable: 'DSREAS', stats: [{ type: 'n_percent' }] },
        { id: 'r9', label: '  Protocol Violation', level: 1, variable: 'DSREAS', stats: [{ type: 'n_percent' }] },
        { id: 'r10', label: '  Withdrawal by Subject', level: 1, variable: 'DSREAS', stats: [{ type: 'n_percent' }] },
        { id: 'r11', label: '  Other', level: 1, variable: 'DSREAS', stats: [{ type: 'n_percent' }] },
      ],
      footer: {
        source: 'ADSL',
        notes: [
          'N = Number of subjects in the analysis population',
          'n (%) = Number (percentage) of subjects',
        ],
      },
    },
    createdAt: '2026-03-14',
  },
]

// ============ Adverse Events 模板 (SOC/PT 嵌套) ============

export const adverseEventsTemplates: Template[] = [
  {
    id: 'tpl_ae_1',
    type: 'table',
    name: 'TEAE by SOC and PT',
    category: 'Adverse_Events',
    description: 'Treatment-Emergent Adverse Events by System Organ Class and Preferred Term',
    shell: {
      id: 'tpl_ae_1',
      shellNumber: 'Table 14.3.1.2.1',
      title: 'Summary of Treatment-Emergent Adverse Events by SOC and PT',
      population: 'Safety',
      category: 'Adverse_Events',
      dataset: 'ADAE',
      treatmentArmSetId: '',
      statisticsSetId: 'ss1',
      rows: [
        { 
          id: 'r1', 
          label: 'Cardiac disorders', 
          level: 0, 
          stats: [{ type: 'n_percent' }],
          analysisOfInterest: 'SOC',
          isSOC: true,
          socCode: '10007541',
        },
        { 
          id: 'r2', 
          label: '  Atrial fibrillation', 
          level: 1, 
          variable: 'PT',
          ptCode: '10003406',
          stats: [{ type: 'n_percent' }] 
        },
        { 
          id: 'r3', 
          label: '  Palpitations', 
          level: 1, 
          variable: 'PT',
          ptCode: '10033619',
          stats: [{ type: 'n_percent' }] 
        },
        { 
          id: 'r4', 
          label: 'Gastrointestinal disorders', 
          level: 0, 
          stats: [{ type: 'n_percent' }],
          analysisOfInterest: 'SOC',
          isSOC: true,
          socCode: '10017947',
        },
        { 
          id: 'r5', 
          label: '  Nausea', 
          level: 1, 
          variable: 'PT',
          ptCode: '10028813',
          stats: [{ type: 'n_percent' }] 
        },
        { 
          id: 'r6', 
          label: '  Vomiting', 
          level: 1, 
          variable: 'PT',
          ptCode: '10047700',
          stats: [{ type: 'n_percent' }] 
        },
        { 
          id: 'r7', 
          label: '  Diarrhoea', 
          level: 1, 
          variable: 'PT',
          ptCode: '10012735',
          stats: [{ type: 'n_percent' }] 
        },
      ],
      footer: {
        source: 'ADAE',
        notes: [
          'SOC = System Organ Class',
          'PT = Preferred Term',
          'TEAE = Treatment-Emergent Adverse Event',
          'n (%) = Number (percentage) of subjects with at least one event',
        ],
        abbreviations: {
          'SOC': 'System Organ Class',
          'PT': 'Preferred Term',
          'TEAE': 'Treatment-Emergent Adverse Event',
        },
      },
    },
    createdAt: '2026-03-14',
  },
  {
    id: 'tpl_ae_2',
    type: 'table',
    name: 'TEAE by SOC, PT and Severity',
    category: 'Adverse_Events',
    description: 'Treatment-Emergent Adverse Events by SOC, PT and Maximum Severity',
    shell: {
      id: 'tpl_ae_2',
      shellNumber: 'Table 14.3.1.3.1',
      title: 'Summary of TEAE by SOC, PT and Maximum Severity',
      population: 'Safety',
      category: 'Adverse_Events',
      dataset: 'ADAE',
      treatmentArmSetId: '',
      statisticsSetId: 'ss1',
      rows: [
        { 
          id: 'r1', 
          label: 'Cardiac disorders', 
          level: 0, 
          stats: [{ type: 'n_percent' }],
          analysisOfInterest: 'SOC',
          isSOC: true,
        },
        { 
          id: 'r2', 
          label: '  Atrial fibrillation', 
          level: 1, 
          variable: 'PT',
          stats: [{ type: 'n_percent' }] 
        },
        { 
          id: 'r3', 
          label: '    Grade 1', 
          level: 2, 
          variable: 'AESEV',
          stats: [{ type: 'n_percent' }] 
        },
        { 
          id: 'r4', 
          label: '    Grade 2', 
          level: 2, 
          variable: 'AESEV',
          stats: [{ type: 'n_percent' }] 
        },
        { 
          id: 'r5', 
          label: '    Grade 3', 
          level: 2, 
          variable: 'AESEV',
          stats: [{ type: 'n_percent' }] 
        },
      ],
      footer: {
        source: 'ADAE',
        notes: [
          'Severity graded according to CTCAE v5.0',
          'n (%) = Number (percentage) of subjects',
        ],
      },
    },
    createdAt: '2026-03-14',
  },
  {
    id: 'tpl_ae_3',
    type: 'table',
    name: 'Overall Summary of TEAE',
    category: 'Adverse_Events',
    description: 'Overview of Treatment-Emergent Adverse Events',
    shell: {
      id: 'tpl_ae_3',
      shellNumber: 'Table 14.3.1.1.1',
      title: 'Overall Summary of Treatment-Emergent Adverse Events',
      population: 'Safety',
      category: 'Adverse_Events',
      dataset: 'ADAE',
      treatmentArmSetId: '',
      statisticsSetId: 'ss1',
      rows: [
        { id: 'r1', label: 'Total number of subjects with at least one TEAE', level: 0, stats: [{ type: 'n_percent' }] },
        { id: 'r2', label: 'Total number of TEAEs', level: 0, stats: [{ type: 'n' }] },
        { id: 'r3', label: 'Number of subjects with:', level: 0, stats: [{ type: 'header' }] },
        { id: 'r4', label: '  At least one TE SAE', level: 1, stats: [{ type: 'n_percent' }] },
        { id: 'r5', label: '  TEAE related to study drug', level: 1, stats: [{ type: 'n_percent' }] },
        { id: 'r6', label: '  TEAE leading to death', level: 1, stats: [{ type: 'n_percent' }] },
        { id: 'r7', label: '  TEAE leading to discontinuation', level: 1, stats: [{ type: 'n_percent' }] },
        { id: 'r8', label: '  TEAE leading to dose reduction', level: 1, stats: [{ type: 'n_percent' }] },
        { id: 'r9', label: '  TEAE leading to dose interruption', level: 1, stats: [{ type: 'n_percent' }] },
      ],
      footer: {
        source: 'ADAE',
        notes: [
          'TEAE = Treatment-Emergent Adverse Event',
          'SAE = Serious Adverse Event',
          'n (%) = Number (percentage) of subjects',
        ],
      },
    },
    createdAt: '2026-03-14',
  },
]

// ============ Laboratory 模板 ============

export const laboratoryTemplates: Template[] = [
  {
    id: 'tpl_lab_1',
    type: 'table',
    name: 'Hematology by Visit',
    category: 'Laboratory',
    description: 'Summary of Hematology Parameters by Scheduled Visits',
    shell: {
      id: 'tpl_lab_1',
      shellNumber: 'Table 14.3.2.1',
      title: 'Summary of Hematology Parameters by Scheduled Visits',
      population: 'Safety',
      category: 'Laboratory',
      dataset: 'ADLB',
      treatmentArmSetId: '',
      statisticsSetId: 'ss1',
      rows: [
        { 
          id: 'r1', 
          label: 'Hemoglobin (g/L)', 
          level: 0, 
          variable: 'PARAM',
          stats: [{ type: 'header' }] 
        },
        { 
          id: 'r2', 
          label: '  Screening', 
          level: 1, 
          variable: 'AVISIT',
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] 
        },
        { 
          id: 'r3', 
          label: '  Baseline', 
          level: 1, 
          variable: 'AVISIT',
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] 
        },
        { 
          id: 'r4', 
          label: '  Week 4', 
          level: 1, 
          variable: 'AVISIT',
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] 
        },
        { 
          id: 'r5', 
          label: 'Hematocrit (%)', 
          level: 0, 
          variable: 'PARAM',
          stats: [{ type: 'header' }] 
        },
        { 
          id: 'r6', 
          label: '  Screening', 
          level: 1, 
          variable: 'AVISIT',
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] 
        },
        { 
          id: 'r7', 
          label: '  Baseline', 
          level: 1, 
          variable: 'AVISIT',
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] 
        },
        { 
          id: 'r8', 
          label: '  Week 4', 
          level: 1, 
          variable: 'AVISIT',
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] 
        },
      ],
      footer: {
        source: 'ADLB',
        notes: [
          'SD = Standard Deviation',
          'n = Number of subjects with non-missing values',
        ],
      },
    },
    createdAt: '2026-03-14',
  },
]

// ============ 所有模板导出 ============

export const allTemplates: Template[] = [
  ...demographicsTemplates,
  ...dispositionTemplates,
  ...adverseEventsTemplates,
  ...laboratoryTemplates,
]

// 按分类获取模板
export function getTemplatesByCategory(category: string): Template[] {
  return allTemplates.filter(t => t.category === category)
}

// 按类型获取模板
export function getTemplatesByType(type: 'table' | 'figure' | 'listing'): Template[] {
  return allTemplates.filter(t => t.type === type)
}

// 搜索模板
export function searchTemplates(query: string): Template[] {
  const lowerQuery = query.toLowerCase()
  return allTemplates.filter(t => 
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description?.toLowerCase().includes(lowerQuery) ||
    t.category.toLowerCase().includes(lowerQuery)
  )
}