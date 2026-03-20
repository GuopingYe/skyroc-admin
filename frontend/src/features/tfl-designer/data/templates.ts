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

// ============ Treatment Compliance 模板 ============

export const treatmentComplianceTemplates: Template[] = [
  {
    id: 'tpl_tc_1',
    type: 'table',
    name: 'Treatment Compliance Summary',
    category: 'Treatment_Compliance',
    description: 'FDA STF-IG - Summary of treatment compliance by treatment arm',
    shell: {
      id: 'tpl_tc_1',
      shellNumber: 'Table 14.2.1',
      title: 'Summary of Treatment Compliance',
      population: 'Safety',
      category: 'Treatment_Compliance',
      dataset: 'ADSL',
      treatmentArmSetId: '',
      statisticsSetId: 'ss1',
      rows: [
        { id: 'r1', label: 'Duration of Exposure (days)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r2', label: '  n', level: 1, variable: 'EXDUR', stats: [{ type: 'n' }] },
        { id: 'r3', label: '  Mean (SD)', level: 1, variable: 'EXDUR', stats: [{ type: 'mean' }, { type: 'sd' }] },
        { id: 'r4', label: '  Median', level: 1, variable: 'EXDUR', stats: [{ type: 'median' }] },
        { id: 'r5', label: '  Min, Max', level: 1, variable: 'EXDUR', stats: [{ type: 'min' }, { type: 'max' }] },
        { id: 'r6', label: 'Compliance Rate (%)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r7', label: '  n', level: 1, variable: 'COMPLI', stats: [{ type: 'n' }] },
        { id: 'r8', label: '  Mean (SD)', level: 1, variable: 'COMPLI', stats: [{ type: 'mean' }, { type: 'sd' }] },
        { id: 'r9', label: '  Median', level: 1, variable: 'COMPLI', stats: [{ type: 'median' }] },
        { id: 'r10', label: 'Subjects with >= 80% Compliance, n (%)', level: 0, stats: [{ type: 'n_percent' }] },
        { id: 'r11', label: 'Subjects with >= 90% Compliance, n (%)', level: 0, stats: [{ type: 'n_percent' }] },
      ],
      footer: {
        source: 'ADSL',
        notes: [
          'Compliance rate = (days on treatment / total planned days) x 100',
          'SD = Standard Deviation',
        ],
      },
    },
    createdAt: '2026-03-14',
  },
]

// ============ Vital Signs by Visits 模板 ============

export const vitalSignsVisitTemplates: Template[] = [
  {
    id: 'tpl_vs_1',
    type: 'table',
    name: 'Vital Signs by Visit',
    category: 'Vital_Signs_Visits',
    description: 'Summary of Vital Signs (SBP, DBP, Pulse) by Scheduled Visits',
    shell: {
      id: 'tpl_vs_1',
      shellNumber: 'Table 14.3.3.1',
      title: 'Summary of Vital Signs by Scheduled Visits',
      population: 'Safety',
      category: 'Vital_Signs_Visits',
      dataset: 'ADVS',
      treatmentArmSetId: '',
      statisticsSetId: 'ss1',
      rows: [
        { id: 'r1', label: 'Systolic Blood Pressure (mmHg)', level: 0, variable: 'PARAM', stats: [{ type: 'header' }] },
        { id: 'r2', label: '  Screening', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r3', label: '  Baseline', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r4', label: '  Week 2', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r5', label: '  Week 4', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r6', label: '  Week 8', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r7', label: '  Week 12', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r8', label: '  End of Treatment', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r9', label: 'Change from Baseline', level: 0, variable: 'PARAM', stats: [{ type: 'header' }] },
        { id: 'r10', label: '  Week 2', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r11', label: '  Week 4', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r12', label: '  Week 12', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r13', label: 'Diastolic Blood Pressure (mmHg)', level: 0, variable: 'PARAM', stats: [{ type: 'header' }] },
        { id: 'r14', label: '  Screening', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r15', label: '  Baseline', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r16', label: '  Week 12', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r17', label: 'Pulse Rate (beats/min)', level: 0, variable: 'PARAM', stats: [{ type: 'header' }] },
        { id: 'r18', label: '  Screening', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r19', label: '  Baseline', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r20', label: '  Week 12', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
      ],
      footer: {
        source: 'ADVS',
        notes: [
          'SD = Standard Deviation',
          'Change from Baseline = Post-baseline value - Baseline value',
          'n = Number of subjects with non-missing values',
        ],
      },
    },
    createdAt: '2026-03-14',
  },
]

// ============ ECG by Visits 模板 ============

export const ecgVisitTemplates: Template[] = [
  {
    id: 'tpl_ecg_1',
    type: 'table',
    name: 'ECG by Visit',
    category: 'ECG_Visits',
    description: 'Summary of ECG Parameters (QTc, HR) by Scheduled Visits',
    shell: {
      id: 'tpl_ecg_1',
      shellNumber: 'Table 14.3.4.1',
      title: 'Summary of ECG Parameters by Scheduled Visits',
      population: 'Safety',
      category: 'ECG_Visits',
      dataset: 'ADECg',
      treatmentArmSetId: '',
      statisticsSetId: 'ss1',
      rows: [
        { id: 'r1', label: 'QTcF (msec)', level: 0, variable: 'PARAM', stats: [{ type: 'header' }] },
        { id: 'r2', label: '  Screening', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r3', label: '  Baseline', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r4', label: '  Week 4', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r5', label: '  Week 8', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r6', label: '  Week 12', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r7', label: '  End of Treatment', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r8', label: 'Change from Baseline at Week 12', level: 0, stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r9', label: 'Heart Rate (beats/min)', level: 0, variable: 'PARAM', stats: [{ type: 'header' }] },
        { id: 'r10', label: '  Screening', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r11', label: '  Baseline', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r12', label: '  Week 12', level: 1, variable: 'AVISIT', stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }] },
        { id: 'r13', label: 'Shift from Baseline, n (%)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r14', label: '  Low to Normal', level: 1, stats: [{ type: 'n_percent' }] },
        { id: 'r15', label: '  Normal to Low', level: 1, stats: [{ type: 'n_percent' }] },
        { id: 'r16', label: '  Normal to High', level: 1, stats: [{ type: 'n_percent' }] },
        { id: 'r17', label: '  High to Normal', level: 1, stats: [{ type: 'n_percent' }] },
      ],
      footer: {
        source: 'ADECg',
        notes: [
          'QTcF = Fridericia-corrected QT interval',
          'SD = Standard Deviation',
          'Shift based on predefined normal ranges',
        ],
      },
    },
    createdAt: '2026-03-14',
  },
]

// ============ Efficacy 模板 ============

export const efficacyTemplates: Template[] = [
  {
    id: 'tpl_eff_1',
    type: 'table',
    name: 'Primary Efficacy Endpoint',
    category: 'Efficacy',
    description: 'Summary of primary and key secondary efficacy endpoints with treatment comparison',
    shell: {
      id: 'tpl_eff_1',
      shellNumber: 'Table 14.4.1',
      title: 'Summary of Primary Efficacy Endpoint',
      population: 'ITT',
      category: 'Efficacy',
      dataset: 'ADTTE',
      treatmentArmSetId: '',
      statisticsSetId: 'ss1',
      rows: [
        { id: 'r1', label: 'Primary Endpoint: Overall Survival', level: 0, stats: [{ type: 'header' }] },
        { id: 'r2', label: '  Number of events / Total N', level: 1, stats: [{ type: 'n' }] },
        { id: 'r3', label: '  Median OS (months)', level: 1, stats: [{ type: 'median' }] },
        { id: 'r4', label: '  95% CI', level: 1, stats: [{ type: 'min' }, { type: 'max' }] },
        { id: 'r5', label: '  Hazard Ratio (95% CI)', level: 1, stats: [{ type: 'mean' }] },
        { id: 'r6', label: '  p-value (log-rank)', level: 1, stats: [{ type: 'n' }] },
        { id: 'r7', label: 'Secondary Endpoint: PFS', level: 0, stats: [{ type: 'header' }] },
        { id: 'r8', label: '  Number of events / Total N', level: 1, stats: [{ type: 'n' }] },
        { id: 'r9', label: '  Median PFS (months)', level: 1, stats: [{ type: 'median' }] },
        { id: 'r10', label: '  95% CI', level: 1, stats: [{ type: 'min' }, { type: 'max' }] },
        { id: 'r11', label: '  Hazard Ratio (95% CI)', level: 1, stats: [{ type: 'mean' }] },
        { id: 'r12', label: 'Objective Response Rate (ORR)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r13', label: '  ORR, n (%)', level: 1, stats: [{ type: 'n_percent' }] },
        { id: 'r14', label: '  95% CI', level: 1, stats: [{ type: 'min' }, { type: 'max' }] },
        { id: 'r15', label: 'Disease Control Rate (DCR)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r16', label: '  DCR, n (%)', level: 1, stats: [{ type: 'n_percent' }] },
        { id: 'r17', label: '  95% CI', level: 1, stats: [{ type: 'min' }, { type: 'max' }] },
      ],
      footer: {
        source: 'ADTTE',
        notes: [
          'OS = Overall Survival',
          'PFS = Progression-Free Survival',
          'ORR = Objective Response Rate (CR + PR)',
          'DCR = Disease Control Rate (CR + PR + SD)',
          'CI = Confidence Interval',
          'HR = Hazard Ratio from Cox proportional hazards model',
        ],
        abbreviations: {
          'OS': 'Overall Survival',
          'PFS': 'Progression-Free Survival',
          'ORR': 'Objective Response Rate',
          'DCR': 'Disease Control Rate',
          'CI': 'Confidence Interval',
          'HR': 'Hazard Ratio',
          'CR': 'Complete Response',
          'PR': 'Partial Response',
          'SD': 'Stable Disease',
        },
      },
    },
    createdAt: '2026-03-14',
  },
  {
    id: 'tpl_eff_2',
    type: 'table',
    name: 'Tumor Response by Investigator Assessment',
    category: 'Efficacy',
    description: 'Summary of best overall response per RECIST 1.1 criteria',
    shell: {
      id: 'tpl_eff_2',
      shellNumber: 'Table 14.4.2',
      title: 'Summary of Best Overall Tumor Response',
      population: 'ITT',
      category: 'Efficacy',
      dataset: 'ADRS',
      treatmentArmSetId: '',
      statisticsSetId: 'ss1',
      rows: [
        { id: 'r1', label: 'Best Overall Response, n (%)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r2', label: '  Complete Response (CR)', level: 1, variable: 'AVAL', stats: [{ type: 'n_percent' }] },
        { id: 'r3', label: '  Partial Response (PR)', level: 1, variable: 'AVAL', stats: [{ type: 'n_percent' }] },
        { id: 'r4', label: '  Stable Disease (SD)', level: 1, variable: 'AVAL', stats: [{ type: 'n_percent' }] },
        { id: 'r5', label: '  Progressive Disease (PD)', level: 1, variable: 'AVAL', stats: [{ type: 'n_percent' }] },
        { id: 'r6', label: '  Non-Evaluable (NE)', level: 1, variable: 'AVAL', stats: [{ type: 'n_percent' }] },
        { id: 'r7', label: '  Missing', level: 1, variable: 'AVAL', stats: [{ type: 'n_percent' }] },
        { id: 'r8', label: 'Objective Response Rate (CR+PR), n (%)', level: 0, stats: [{ type: 'n_percent' }] },
        { id: 'r9', label: 'Disease Control Rate (CR+PR+SD), n (%)', level: 0, stats: [{ type: 'n_percent' }] },
      ],
      footer: {
        source: 'ADRS',
        notes: [
          'Response assessed per RECIST 1.1',
          'ORR = CR + PR',
          'DCR = CR + PR + SD',
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
  ...treatmentComplianceTemplates,
  ...vitalSignsVisitTemplates,
  ...ecgVisitTemplates,
  ...efficacyTemplates,
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