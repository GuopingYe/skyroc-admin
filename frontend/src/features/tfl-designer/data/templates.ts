/** TFL Designer - 内置模板库 基于 TFL Designer 研究的 107 个模板 */

import type { Template } from '../types';

// ============ Demographics 模板 ============

export const demographicsTemplates: Template[] = [
  {
    category: 'Demographics',
    createdAt: '2026-03-14',
    description: 'FDA STF-IG Table 02 - Baseline Demographic and Clinical Characteristics',
    id: 'tpl_demo_1',
    name: 'Demographics and Baseline Characteristics',
    shell: {
      category: 'Demographics',
      dataset: 'ADSL',
      footer: {
        notes: [
          'N = Number of subjects in the analysis population',
          'SD = Standard Deviation',
          'n (%) = Number (percentage) of subjects'
        ],
        source: 'ADSL'
      },
      id: 'tpl_demo_1',
      population: 'Safety',
      rows: [
        { id: 'r1', label: 'Age (years)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r2', label: '  n', level: 1, stats: [{ type: 'n' }], variable: 'AGE' },
        { id: 'r3', label: '  Mean (SD)', level: 1, stats: [{ type: 'mean' }, { type: 'sd' }], variable: 'AGE' },
        { id: 'r4', label: '  Median', level: 1, stats: [{ type: 'median' }], variable: 'AGE' },
        { id: 'r5', label: '  Min, Max', level: 1, stats: [{ type: 'min' }, { type: 'max' }], variable: 'AGE' },
        { id: 'r6', label: 'Sex, n (%)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r7', label: '  Male', level: 1, stats: [{ type: 'n_percent' }], variable: 'SEX' },
        { id: 'r8', label: '  Female', level: 1, stats: [{ type: 'n_percent' }], variable: 'SEX' },
        { id: 'r9', label: 'Race, n (%)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r10', label: '  White', level: 1, stats: [{ type: 'n_percent' }], variable: 'RACE' },
        { id: 'r11', label: '  Black or African American', level: 1, stats: [{ type: 'n_percent' }], variable: 'RACE' },
        { id: 'r12', label: '  Asian', level: 1, stats: [{ type: 'n_percent' }], variable: 'RACE' },
        { id: 'r13', label: '  Other', level: 1, stats: [{ type: 'n_percent' }], variable: 'RACE' },
        { id: 'r14', label: 'Ethnicity, n (%)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r15', label: '  Hispanic or Latino', level: 1, stats: [{ type: 'n_percent' }], variable: 'ETHNIC' },
        { id: 'r16', label: '  Not Hispanic or Latino', level: 1, stats: [{ type: 'n_percent' }], variable: 'ETHNIC' }
      ],
      shellNumber: 'Table 14.1.1.5.1',
      statisticsSetId: 'ss1',
      title: 'Summary of Demographic and Baseline Characteristics',
      treatmentArmSetId: ''
    },
    type: 'table'
  }
];

// ============ Disposition 模板 ============

export const dispositionTemplates: Template[] = [
  {
    category: 'Disposition',
    createdAt: '2026-03-14',
    description: 'Summary of subject disposition and completion status',
    id: 'tpl_disp_1',
    name: 'Subject Disposition',
    shell: {
      category: 'Disposition',
      dataset: 'ADSL',
      footer: {
        notes: ['N = Number of subjects in the analysis population', 'n (%) = Number (percentage) of subjects'],
        source: 'ADSL'
      },
      id: 'tpl_disp_1',
      population: 'Safety',
      rows: [
        { id: 'r1', label: 'Screened', level: 0, stats: [{ type: 'n' }] },
        { id: 'r2', label: 'Enrolled', level: 0, stats: [{ type: 'n' }] },
        { id: 'r3', label: 'Safety Population', level: 0, stats: [{ type: 'n' }] },
        { id: 'r4', label: 'Completed Study', level: 0, stats: [{ type: 'n' }] },
        { id: 'r5', label: 'Discontinued, n (%)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r6', label: '  Adverse Event', level: 1, stats: [{ type: 'n_percent' }], variable: 'DSREAS' },
        { id: 'r7', label: '  Lack of Efficacy', level: 1, stats: [{ type: 'n_percent' }], variable: 'DSREAS' },
        { id: 'r8', label: '  Lost to Follow-up', level: 1, stats: [{ type: 'n_percent' }], variable: 'DSREAS' },
        { id: 'r9', label: '  Protocol Violation', level: 1, stats: [{ type: 'n_percent' }], variable: 'DSREAS' },
        { id: 'r10', label: '  Withdrawal by Subject', level: 1, stats: [{ type: 'n_percent' }], variable: 'DSREAS' },
        { id: 'r11', label: '  Other', level: 1, stats: [{ type: 'n_percent' }], variable: 'DSREAS' }
      ],
      shellNumber: 'Table 14.1.1.3',
      statisticsSetId: 'ss1',
      title: 'Summary of Subject Disposition',
      treatmentArmSetId: ''
    },
    type: 'table'
  }
];

// ============ Adverse Events 模板 (SOC/PT 嵌套) ============

export const adverseEventsTemplates: Template[] = [
  {
    category: 'Adverse_Events',
    createdAt: '2026-03-14',
    description: 'Treatment-Emergent Adverse Events by System Organ Class and Preferred Term',
    id: 'tpl_ae_1',
    name: 'TEAE by SOC and PT',
    shell: {
      category: 'Adverse_Events',
      dataset: 'ADAE',
      footer: {
        abbreviations: {
          PT: 'Preferred Term',
          SOC: 'System Organ Class',
          TEAE: 'Treatment-Emergent Adverse Event'
        },
        notes: [
          'SOC = System Organ Class',
          'PT = Preferred Term',
          'TEAE = Treatment-Emergent Adverse Event',
          'n (%) = Number (percentage) of subjects with at least one event'
        ],
        source: 'ADAE'
      },
      id: 'tpl_ae_1',
      population: 'Safety',
      rows: [
        {
          analysisOfInterest: 'SOC',
          id: 'r1',
          isSOC: true,
          label: 'Cardiac disorders',
          level: 0,
          socCode: '10007541',
          stats: [{ type: 'n_percent' }]
        },
        {
          id: 'r2',
          label: '  Atrial fibrillation',
          level: 1,
          ptCode: '10003406',
          stats: [{ type: 'n_percent' }],
          variable: 'PT'
        },
        {
          id: 'r3',
          label: '  Palpitations',
          level: 1,
          ptCode: '10033619',
          stats: [{ type: 'n_percent' }],
          variable: 'PT'
        },
        {
          analysisOfInterest: 'SOC',
          id: 'r4',
          isSOC: true,
          label: 'Gastrointestinal disorders',
          level: 0,
          socCode: '10017947',
          stats: [{ type: 'n_percent' }]
        },
        {
          id: 'r5',
          label: '  Nausea',
          level: 1,
          ptCode: '10028813',
          stats: [{ type: 'n_percent' }],
          variable: 'PT'
        },
        {
          id: 'r6',
          label: '  Vomiting',
          level: 1,
          ptCode: '10047700',
          stats: [{ type: 'n_percent' }],
          variable: 'PT'
        },
        {
          id: 'r7',
          label: '  Diarrhoea',
          level: 1,
          ptCode: '10012735',
          stats: [{ type: 'n_percent' }],
          variable: 'PT'
        }
      ],
      shellNumber: 'Table 14.3.1.2.1',
      statisticsSetId: 'ss1',
      title: 'Summary of Treatment-Emergent Adverse Events by SOC and PT',
      treatmentArmSetId: ''
    },
    type: 'table'
  },
  {
    category: 'Adverse_Events',
    createdAt: '2026-03-14',
    description: 'Treatment-Emergent Adverse Events by SOC, PT and Maximum Severity',
    id: 'tpl_ae_2',
    name: 'TEAE by SOC, PT and Severity',
    shell: {
      category: 'Adverse_Events',
      dataset: 'ADAE',
      footer: {
        notes: ['Severity graded according to CTCAE v5.0', 'n (%) = Number (percentage) of subjects'],
        source: 'ADAE'
      },
      id: 'tpl_ae_2',
      population: 'Safety',
      rows: [
        {
          analysisOfInterest: 'SOC',
          id: 'r1',
          isSOC: true,
          label: 'Cardiac disorders',
          level: 0,
          stats: [{ type: 'n_percent' }]
        },
        {
          id: 'r2',
          label: '  Atrial fibrillation',
          level: 1,
          stats: [{ type: 'n_percent' }],
          variable: 'PT'
        },
        {
          id: 'r3',
          label: '    Grade 1',
          level: 2,
          stats: [{ type: 'n_percent' }],
          variable: 'AESEV'
        },
        {
          id: 'r4',
          label: '    Grade 2',
          level: 2,
          stats: [{ type: 'n_percent' }],
          variable: 'AESEV'
        },
        {
          id: 'r5',
          label: '    Grade 3',
          level: 2,
          stats: [{ type: 'n_percent' }],
          variable: 'AESEV'
        }
      ],
      shellNumber: 'Table 14.3.1.3.1',
      statisticsSetId: 'ss1',
      title: 'Summary of TEAE by SOC, PT and Maximum Severity',
      treatmentArmSetId: ''
    },
    type: 'table'
  },
  {
    category: 'Adverse_Events',
    createdAt: '2026-03-14',
    description: 'Overview of Treatment-Emergent Adverse Events',
    id: 'tpl_ae_3',
    name: 'Overall Summary of TEAE',
    shell: {
      category: 'Adverse_Events',
      dataset: 'ADAE',
      footer: {
        notes: [
          'TEAE = Treatment-Emergent Adverse Event',
          'SAE = Serious Adverse Event',
          'n (%) = Number (percentage) of subjects'
        ],
        source: 'ADAE'
      },
      id: 'tpl_ae_3',
      population: 'Safety',
      rows: [
        {
          id: 'r1',
          label: 'Total number of subjects with at least one TEAE',
          level: 0,
          stats: [{ type: 'n_percent' }]
        },
        { id: 'r2', label: 'Total number of TEAEs', level: 0, stats: [{ type: 'n' }] },
        { id: 'r3', label: 'Number of subjects with:', level: 0, stats: [{ type: 'header' }] },
        { id: 'r4', label: '  At least one TE SAE', level: 1, stats: [{ type: 'n_percent' }] },
        { id: 'r5', label: '  TEAE related to study drug', level: 1, stats: [{ type: 'n_percent' }] },
        { id: 'r6', label: '  TEAE leading to death', level: 1, stats: [{ type: 'n_percent' }] },
        { id: 'r7', label: '  TEAE leading to discontinuation', level: 1, stats: [{ type: 'n_percent' }] },
        { id: 'r8', label: '  TEAE leading to dose reduction', level: 1, stats: [{ type: 'n_percent' }] },
        { id: 'r9', label: '  TEAE leading to dose interruption', level: 1, stats: [{ type: 'n_percent' }] }
      ],
      shellNumber: 'Table 14.3.1.1.1',
      statisticsSetId: 'ss1',
      title: 'Overall Summary of Treatment-Emergent Adverse Events',
      treatmentArmSetId: ''
    },
    type: 'table'
  }
];

// ============ Laboratory 模板 ============

export const laboratoryTemplates: Template[] = [
  {
    category: 'Laboratory',
    createdAt: '2026-03-14',
    description: 'Summary of Hematology Parameters by Scheduled Visits',
    id: 'tpl_lab_1',
    name: 'Hematology by Visit',
    shell: {
      category: 'Laboratory',
      dataset: 'ADLB',
      footer: {
        notes: ['SD = Standard Deviation', 'n = Number of subjects with non-missing values'],
        source: 'ADLB'
      },
      id: 'tpl_lab_1',
      population: 'Safety',
      rows: [
        {
          id: 'r1',
          label: 'Hemoglobin (g/L)',
          level: 0,
          stats: [{ type: 'header' }],
          variable: 'PARAM'
        },
        {
          id: 'r2',
          label: '  Screening',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r3',
          label: '  Baseline',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r4',
          label: '  Week 4',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r5',
          label: 'Hematocrit (%)',
          level: 0,
          stats: [{ type: 'header' }],
          variable: 'PARAM'
        },
        {
          id: 'r6',
          label: '  Screening',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r7',
          label: '  Baseline',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r8',
          label: '  Week 4',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        }
      ],
      shellNumber: 'Table 14.3.2.1',
      statisticsSetId: 'ss1',
      title: 'Summary of Hematology Parameters by Scheduled Visits',
      treatmentArmSetId: ''
    },
    type: 'table'
  }
];

// ============ Treatment Compliance 模板 ============

export const treatmentComplianceTemplates: Template[] = [
  {
    category: 'Treatment_Compliance',
    createdAt: '2026-03-14',
    description: 'FDA STF-IG - Summary of treatment compliance by treatment arm',
    id: 'tpl_tc_1',
    name: 'Treatment Compliance Summary',
    shell: {
      category: 'Treatment_Compliance',
      dataset: 'ADSL',
      footer: {
        notes: ['Compliance rate = (days on treatment / total planned days) x 100', 'SD = Standard Deviation'],
        source: 'ADSL'
      },
      id: 'tpl_tc_1',
      population: 'Safety',
      rows: [
        { id: 'r1', label: 'Duration of Exposure (days)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r2', label: '  n', level: 1, stats: [{ type: 'n' }], variable: 'EXDUR' },
        { id: 'r3', label: '  Mean (SD)', level: 1, stats: [{ type: 'mean' }, { type: 'sd' }], variable: 'EXDUR' },
        { id: 'r4', label: '  Median', level: 1, stats: [{ type: 'median' }], variable: 'EXDUR' },
        { id: 'r5', label: '  Min, Max', level: 1, stats: [{ type: 'min' }, { type: 'max' }], variable: 'EXDUR' },
        { id: 'r6', label: 'Compliance Rate (%)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r7', label: '  n', level: 1, stats: [{ type: 'n' }], variable: 'COMPLI' },
        { id: 'r8', label: '  Mean (SD)', level: 1, stats: [{ type: 'mean' }, { type: 'sd' }], variable: 'COMPLI' },
        { id: 'r9', label: '  Median', level: 1, stats: [{ type: 'median' }], variable: 'COMPLI' },
        { id: 'r10', label: 'Subjects with >= 80% Compliance, n (%)', level: 0, stats: [{ type: 'n_percent' }] },
        { id: 'r11', label: 'Subjects with >= 90% Compliance, n (%)', level: 0, stats: [{ type: 'n_percent' }] }
      ],
      shellNumber: 'Table 14.2.1',
      statisticsSetId: 'ss1',
      title: 'Summary of Treatment Compliance',
      treatmentArmSetId: ''
    },
    type: 'table'
  }
];

// ============ Vital Signs by Visits 模板 ============

export const vitalSignsVisitTemplates: Template[] = [
  {
    category: 'Vital_Signs_Visits',
    createdAt: '2026-03-14',
    description: 'Summary of Vital Signs (SBP, DBP, Pulse) by Scheduled Visits',
    id: 'tpl_vs_1',
    name: 'Vital Signs by Visit',
    shell: {
      category: 'Vital_Signs_Visits',
      dataset: 'ADVS',
      footer: {
        notes: [
          'SD = Standard Deviation',
          'Change from Baseline = Post-baseline value - Baseline value',
          'n = Number of subjects with non-missing values'
        ],
        source: 'ADVS'
      },
      id: 'tpl_vs_1',
      population: 'Safety',
      rows: [
        { id: 'r1', label: 'Systolic Blood Pressure (mmHg)', level: 0, stats: [{ type: 'header' }], variable: 'PARAM' },
        {
          id: 'r2',
          label: '  Screening',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r3',
          label: '  Baseline',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r4',
          label: '  Week 2',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r5',
          label: '  Week 4',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r6',
          label: '  Week 8',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r7',
          label: '  Week 12',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r8',
          label: '  End of Treatment',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        { id: 'r9', label: 'Change from Baseline', level: 0, stats: [{ type: 'header' }], variable: 'PARAM' },
        {
          id: 'r10',
          label: '  Week 2',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r11',
          label: '  Week 4',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r12',
          label: '  Week 12',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r13',
          label: 'Diastolic Blood Pressure (mmHg)',
          level: 0,
          stats: [{ type: 'header' }],
          variable: 'PARAM'
        },
        {
          id: 'r14',
          label: '  Screening',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r15',
          label: '  Baseline',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r16',
          label: '  Week 12',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        { id: 'r17', label: 'Pulse Rate (beats/min)', level: 0, stats: [{ type: 'header' }], variable: 'PARAM' },
        {
          id: 'r18',
          label: '  Screening',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r19',
          label: '  Baseline',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r20',
          label: '  Week 12',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        }
      ],
      shellNumber: 'Table 14.3.3.1',
      statisticsSetId: 'ss1',
      title: 'Summary of Vital Signs by Scheduled Visits',
      treatmentArmSetId: ''
    },
    type: 'table'
  }
];

// ============ ECG by Visits 模板 ============

export const ecgVisitTemplates: Template[] = [
  {
    category: 'ECG_Visits',
    createdAt: '2026-03-14',
    description: 'Summary of ECG Parameters (QTc, HR) by Scheduled Visits',
    id: 'tpl_ecg_1',
    name: 'ECG by Visit',
    shell: {
      category: 'ECG_Visits',
      dataset: 'ADECg',
      footer: {
        notes: [
          'QTcF = Fridericia-corrected QT interval',
          'SD = Standard Deviation',
          'Shift based on predefined normal ranges'
        ],
        source: 'ADECg'
      },
      id: 'tpl_ecg_1',
      population: 'Safety',
      rows: [
        { id: 'r1', label: 'QTcF (msec)', level: 0, stats: [{ type: 'header' }], variable: 'PARAM' },
        {
          id: 'r2',
          label: '  Screening',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r3',
          label: '  Baseline',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r4',
          label: '  Week 4',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r5',
          label: '  Week 8',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r6',
          label: '  Week 12',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r7',
          label: '  End of Treatment',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r8',
          label: 'Change from Baseline at Week 12',
          level: 0,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }]
        },
        { id: 'r9', label: 'Heart Rate (beats/min)', level: 0, stats: [{ type: 'header' }], variable: 'PARAM' },
        {
          id: 'r10',
          label: '  Screening',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r11',
          label: '  Baseline',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        {
          id: 'r12',
          label: '  Week 12',
          level: 1,
          stats: [{ type: 'n' }, { type: 'mean' }, { type: 'sd' }],
          variable: 'AVISIT'
        },
        { id: 'r13', label: 'Shift from Baseline, n (%)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r14', label: '  Low to Normal', level: 1, stats: [{ type: 'n_percent' }] },
        { id: 'r15', label: '  Normal to Low', level: 1, stats: [{ type: 'n_percent' }] },
        { id: 'r16', label: '  Normal to High', level: 1, stats: [{ type: 'n_percent' }] },
        { id: 'r17', label: '  High to Normal', level: 1, stats: [{ type: 'n_percent' }] }
      ],
      shellNumber: 'Table 14.3.4.1',
      statisticsSetId: 'ss1',
      title: 'Summary of ECG Parameters by Scheduled Visits',
      treatmentArmSetId: ''
    },
    type: 'table'
  }
];

// ============ Efficacy 模板 ============

export const efficacyTemplates: Template[] = [
  {
    category: 'Efficacy',
    createdAt: '2026-03-14',
    description: 'Summary of primary and key secondary efficacy endpoints with treatment comparison',
    id: 'tpl_eff_1',
    name: 'Primary Efficacy Endpoint',
    shell: {
      category: 'Efficacy',
      dataset: 'ADTTE',
      footer: {
        abbreviations: {
          CI: 'Confidence Interval',
          CR: 'Complete Response',
          DCR: 'Disease Control Rate',
          HR: 'Hazard Ratio',
          ORR: 'Objective Response Rate',
          OS: 'Overall Survival',
          PFS: 'Progression-Free Survival',
          PR: 'Partial Response',
          SD: 'Stable Disease'
        },
        notes: [
          'OS = Overall Survival',
          'PFS = Progression-Free Survival',
          'ORR = Objective Response Rate (CR + PR)',
          'DCR = Disease Control Rate (CR + PR + SD)',
          'CI = Confidence Interval',
          'HR = Hazard Ratio from Cox proportional hazards model'
        ],
        source: 'ADTTE'
      },
      id: 'tpl_eff_1',
      population: 'ITT',
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
        { id: 'r17', label: '  95% CI', level: 1, stats: [{ type: 'min' }, { type: 'max' }] }
      ],
      shellNumber: 'Table 14.4.1',
      statisticsSetId: 'ss1',
      title: 'Summary of Primary Efficacy Endpoint',
      treatmentArmSetId: ''
    },
    type: 'table'
  },
  {
    category: 'Efficacy',
    createdAt: '2026-03-14',
    description: 'Summary of best overall response per RECIST 1.1 criteria',
    id: 'tpl_eff_2',
    name: 'Tumor Response by Investigator Assessment',
    shell: {
      category: 'Efficacy',
      dataset: 'ADRS',
      footer: {
        notes: ['Response assessed per RECIST 1.1', 'ORR = CR + PR', 'DCR = CR + PR + SD'],
        source: 'ADRS'
      },
      id: 'tpl_eff_2',
      population: 'ITT',
      rows: [
        { id: 'r1', label: 'Best Overall Response, n (%)', level: 0, stats: [{ type: 'header' }] },
        { id: 'r2', label: '  Complete Response (CR)', level: 1, stats: [{ type: 'n_percent' }], variable: 'AVAL' },
        { id: 'r3', label: '  Partial Response (PR)', level: 1, stats: [{ type: 'n_percent' }], variable: 'AVAL' },
        { id: 'r4', label: '  Stable Disease (SD)', level: 1, stats: [{ type: 'n_percent' }], variable: 'AVAL' },
        { id: 'r5', label: '  Progressive Disease (PD)', level: 1, stats: [{ type: 'n_percent' }], variable: 'AVAL' },
        { id: 'r6', label: '  Non-Evaluable (NE)', level: 1, stats: [{ type: 'n_percent' }], variable: 'AVAL' },
        { id: 'r7', label: '  Missing', level: 1, stats: [{ type: 'n_percent' }], variable: 'AVAL' },
        { id: 'r8', label: 'Objective Response Rate (CR+PR), n (%)', level: 0, stats: [{ type: 'n_percent' }] },
        { id: 'r9', label: 'Disease Control Rate (CR+PR+SD), n (%)', level: 0, stats: [{ type: 'n_percent' }] }
      ],
      shellNumber: 'Table 14.4.2',
      statisticsSetId: 'ss1',
      title: 'Summary of Best Overall Tumor Response',
      treatmentArmSetId: ''
    },
    type: 'table'
  }
];

// ============ 所有模板导出 ============

export const allTemplates: Template[] = [
  ...demographicsTemplates,
  ...dispositionTemplates,
  ...adverseEventsTemplates,
  ...laboratoryTemplates,
  ...treatmentComplianceTemplates,
  ...vitalSignsVisitTemplates,
  ...ecgVisitTemplates,
  ...efficacyTemplates
];

// 按分类获取模板
export function getTemplatesByCategory(category: string): Template[] {
  return allTemplates.filter(t => t.category === category);
}

// 按类型获取模板
export function getTemplatesByType(type: 'figure' | 'listing' | 'table'): Template[] {
  return allTemplates.filter(t => t.type === type);
}

// 搜索模板
export function searchTemplates(query: string): Template[] {
  const lowerQuery = query.toLowerCase();
  return allTemplates.filter(
    t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description?.toLowerCase().includes(lowerQuery) ||
      t.category.toLowerCase().includes(lowerQuery)
  );
}
