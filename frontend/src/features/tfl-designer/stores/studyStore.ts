/**
 * TFL Designer - Study Store (Zustand + Immer)
 *
 * Manages studies list and treatment arm sets. Follows the POC store pattern with immer middleware.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type {
  ColumnHeaderGroup,
  ColumnHeaderSet,
  DecimalConfig,
  HeaderFontStyle,
  PopulationSet,
  StatisticsSet,
  Study,
  StudyDefaults,
  StudyTemplate,
  TreatmentArm,
  TreatmentArmSet
} from '../types';
import { generateId } from '../types';

// ==================== State Interface ====================

interface StudyState {
  // Arm CRUD within a set
  addArmToSet: (setId: string, arm: Omit<TreatmentArm, 'id'>) => void;
  addChildGroup: (setId: string, parentId: string, group: Omit<ColumnHeaderGroup, 'id'>) => void;
  // Column Header Set CRUD
  addColumnHeaderSet: (chs: Omit<ColumnHeaderSet, 'id'>) => void;
  addHeaderGroup: (setId: string, group: Omit<ColumnHeaderGroup, 'id'>) => void;
  // Population Set CRUD
  addPopulationSet: (pop: Omit<PopulationSet, 'id'>) => void;
  // Statistics Set CRUD
  addStatisticsSet: (ss: Omit<StatisticsSet, 'id'>) => void;

  // Column Header Set CRUD

  // Study CRUD
  addStudy: (study: Omit<Study, 'id'>) => void;
  addStudyTemplate: (template: StudyTemplate) => void;

  // Treatment Arm Set CRUD
  addTreatmentArmSet: (set: Omit<TreatmentArmSet, 'id'>) => void;
  columnHeaderSets: ColumnHeaderSet[];
  currentStudy: Study | null;
  deleteArm: (setId: string, armId: string) => void;

  deleteColumnHeaderSet: (id: string) => void;
  deleteHeaderGroup: (setId: string, groupId: string) => void;
  deletePopulationSet: (id: string) => void;

  deleteStatisticsSet: (id: string) => void;
  deleteStudy: (id: string) => void;
  deleteStudyTemplate: (id: string | number) => void;
  deleteTreatmentArmSet: (id: string) => void;

  populationSets: PopulationSet[];
  setCurrentStudy: (study: Study | null) => void;
  setDefaultPopulation: (id: string) => void;

  // Study Defaults
  setStudyDefaults: (defaults: StudyDefaults) => void;
  // Study Template CRUD
  setStudyTemplates: (templates: StudyTemplate[]) => void;
  statisticsSets: StatisticsSet[];

  studies: Study[];
  studyDefaults: StudyDefaults | null;
  // Study Templates + Defaults
  studyTemplates: StudyTemplate[];
  treatmentArmSets: TreatmentArmSet[];

  updateArm: (setId: string, armId: string, updates: Partial<TreatmentArm>) => void;
  updateColumnHeaderSet: (id: string, updates: Partial<ColumnHeaderSet>) => void;
  updateDecimalRules: (rules: DecimalConfig) => void;

  updateHeaderGroup: (setId: string, groupId: string, updates: Partial<ColumnHeaderGroup>) => void;
  updateHeaderStyle: (style: HeaderFontStyle) => void;
  updatePopulationSet: (id: string, updates: Partial<PopulationSet>) => void;
  updateStatisticsSet: (id: string, updates: Partial<StatisticsSet>) => void;
  updateStudy: (id: string, updates: Partial<Study>) => void;
  updateStudyTemplate: (id: string | number, updates: Partial<StudyTemplate>) => void;
  updateTreatmentArmSet: (id: string, updates: Partial<TreatmentArmSet>) => void;
}

// ==================== Mock Data ====================

const mockStudies: Study[] = [
  {
    compound: 'Drug X',
    createdAt: '2026-03-01',
    diseaseArea: 'Oncology',
    id: 's1',
    phase: 'Phase 3',
    studyId: 'STUDY-001',
    therapeuticArea: 'Solid Tumors',
    title: 'Phase 3 Study of Drug X in Oncology',
    updatedAt: '2026-03-13'
  },
  {
    compound: 'Drug Y',
    createdAt: '2026-02-15',
    diseaseArea: 'Neurology',
    id: 's2',
    phase: 'Phase 2',
    studyId: 'STUDY-002',
    therapeuticArea: "Alzheimer's Disease",
    title: 'Phase 2 Study of Drug Y in Neurology',
    updatedAt: '2026-03-10'
  }
];

const mockTreatmentArmSets: TreatmentArmSet[] = [
  {
    arms: [
      { id: 'arm1', N: 50, name: 'Placebo', order: 1 },
      { grouping: 'Active', id: 'arm2', N: 52, name: 'Drug X 10mg', order: 2 },
      { grouping: 'Active', id: 'arm3', N: 48, name: 'Drug X 20mg', order: 3 },
      { grouping: 'Active', id: 'arm4', N: 47, name: 'Drug X 40mg', order: 4 }
    ],
    headers: [
      {
        children: [
          { align: 'center', id: 'hg60a', label: 'Drug X 10mg', N: 52, variable: 'ARM_DRUG10', width: 120 },
          { align: 'center', id: 'hg60b', label: 'Drug X 20mg', N: 48, variable: 'ARM_DRUG20', width: 120 },
          { align: 'center', id: 'hg60c', label: 'Drug X 40mg', N: 47, variable: 'ARM_DRUG40', width: 120 }
        ],
        id: 'hg60',
        label: 'Active'
      },
      { align: 'center', id: 'hg61', label: 'Placebo', N: 50, variable: 'ARM_PBO', width: 120 },
      { align: 'center', id: 'hg62', label: 'Total (N)', N: 197, variable: 'TOTAL_N', width: 100 }
    ],
    id: 'tas1',
    name: 'Study ABC-001 Treatment Arms (with grouping)'
  },
  {
    arms: [
      { id: 'arm1', N: 100, name: 'Placebo', order: 1 },
      { id: 'arm2', N: 102, name: 'Treatment', order: 2 }
    ],
    headers: [
      { align: 'center', id: 'hg20', label: 'Placebo', N: 100, variable: 'ARM_PBO', width: 140 },
      { align: 'center', id: 'hg21', label: 'Treatment', N: 102, variable: 'ARM_TRT', width: 140 },
      { align: 'center', id: 'hg22', label: 'Total (N)', N: 202, variable: 'TOTAL_N', width: 120 }
    ],
    id: 'tas2',
    name: 'Simple Two-Arm Study'
  },
  {
    arms: [
      { id: 'arm1', N: 80, name: 'Placebo', order: 1 },
      { id: 'arm2', N: 85, name: 'Trt A', order: 2 },
      { id: 'arm3', N: 82, name: 'Trt B', order: 3 }
    ],
    headers: [
      {
        children: [
          { align: 'center', id: 'hg70a', label: 'Phase 1', N: 40, variable: 'TRTA_PH1', width: 120 },
          { align: 'center', id: 'hg70b', label: 'Phase 2', N: 45, variable: 'TRTA_PH2', width: 120 }
        ],
        id: 'hg70',
        label: 'Trt A'
      },
      {
        children: [
          { align: 'center', id: 'hg71a', label: 'Phase 1', N: 38, variable: 'TRTB_PH1', width: 120 },
          { align: 'center', id: 'hg71b', label: 'Phase 2', N: 44, variable: 'TRTB_PH2', width: 120 }
        ],
        id: 'hg71',
        label: 'Trt B'
      },
      { align: 'center', id: 'hg72', label: 'Total', N: 167, variable: 'TOTAL', width: 120 }
    ],
    id: 'tas3',
    name: 'Phase 1/2 Study (nested headers)'
  }
];

const mockPopulationSets: PopulationSet[] = [
  {
    dataset: 'ADSL',
    description: 'All randomized subjects who received at least one dose',
    filterExpression: "SAFFL='Y'",
    id: 'pop1',
    isDefault: true,
    name: 'Safety'
  },
  { dataset: 'ADSL', description: 'All randomized subjects', filterExpression: "ITTFL='Y'", id: 'pop2', name: 'ITT' },
  {
    dataset: 'ADSL',
    description: 'All subjects who completed study without major protocol deviations',
    filterExpression: "PPROTFL='Y'",
    id: 'pop3',
    name: 'PP'
  },
  {
    dataset: 'ADSL',
    description: 'All subjects in the efficacy population',
    filterExpression: "EFFFL='Y'",
    id: 'pop4',
    name: 'Efficacy'
  }
];

const mockStatisticsSets: StatisticsSet[] = [
  {
    id: 'ss1',
    name: 'Demographics Stats',
    stats: [
      { format: 'XX', id: 'st1', label: 'n', type: 'n' },
      { format: 'XX.X (X.XX)', id: 'st2', label: 'Mean (SD)', type: 'mean' },
      { format: 'XX.X', id: 'st3', label: 'Median', type: 'median' },
      { format: 'XX.X, XX.X', id: 'st4', label: 'Min, Max', type: 'min' }
    ]
  },
  {
    id: 'ss2',
    name: 'Safety Categorical Stats',
    stats: [{ format: 'XX (XX.X%)', id: 'st5', label: 'n (%)', type: 'n_percent' }]
  }
];

const mockColumnHeaderSets: ColumnHeaderSet[] = [
  {
    description: 'Adverse Events grouped by System Organ Class and Preferred Term',
    headers: [
      {
        children: [
          { id: 'hg1a', label: 'System Organ Class', variable: 'AEBODSYS', width: 180 },
          { id: 'hg1b', indentLevel: 1, label: 'Preferred Term', variable: 'AEDECOD', width: 160 }
        ],
        id: 'hg1',
        label: 'SOC',
        variable: 'AEBODSYS',
        width: 180
      },
      { id: 'hg2', label: 'Subject ID', variable: 'USUBJID', width: 120 },
      { align: 'center', id: 'hg3', label: 'Age', variable: 'AGE', width: 80 },
      { align: 'center', id: 'hg4', label: 'Sex', variable: 'SEX', width: 80 },
      { id: 'hg5', label: 'Start Date', variable: 'AESTDTC', width: 120 },
      { id: 'hg6', label: 'End Date', variable: 'AEENDTC', width: 120 },
      { align: 'center', id: 'hg7', label: 'Severity', variable: 'AESEV', width: 80 },
      { align: 'center', id: 'hg8', label: 'Related?', variable: 'AEREL', width: 80 }
    ],
    id: 'chs1',
    name: 'SOC / PT Grouping'
  },
  {
    description: 'Lab and VS parameters by scheduled visit',
    headers: [
      {
        children: [
          { id: 'hg10a', label: 'Visit', variable: 'AVISIT', width: 120 },
          { id: 'hg10b', label: 'Visit Date', variable: 'AVSITDT', width: 110 }
        ],
        id: 'hg10',
        label: 'Visit Info'
      },
      { id: 'hg11', label: 'Subject ID', variable: 'USUBJID', width: 120 },
      { id: 'hg12', label: 'Parameter', variable: 'PARAM', width: 160 },
      { align: 'center', id: 'hg13', label: 'Result', variable: 'AVAL', width: 100 },
      { align: 'center', id: 'hg14', label: 'Unit', variable: 'AVALU', width: 60 },
      { align: 'center', id: 'hg15', label: 'Change from Baseline', variable: 'CHG', width: 120 }
    ],
    id: 'chs2',
    name: 'Visit-Based'
  },
  {
    description: 'Simple flat columns for demographics listings',
    headers: [
      { id: 'hg20', label: 'Subject ID', variable: 'USUBJID', width: 120 },
      { align: 'center', id: 'hg21', label: 'Site', variable: 'SITEID', width: 80 },
      { align: 'center', id: 'hg22', label: 'Age', variable: 'AGE', width: 80 },
      { align: 'center', id: 'hg23', label: 'Sex', variable: 'SEX', width: 80 },
      { id: 'hg24', label: 'Race', variable: 'RACE', width: 140 },
      { id: 'hg25', label: 'Ethnicity', variable: 'ETHNIC', width: 120 },
      { id: 'hg26', label: 'Country', variable: 'COUNTRY', width: 120 }
    ],
    id: 'chs3',
    name: 'Flat Demographics'
  },
  {
    description: 'Adverse Events listing with columns grouped by treatment arm (matches first Arm Set)',
    headers: [
      { id: 'hg30', label: 'Subject ID', variable: 'USUBJID', width: 120 },
      { id: 'hg31', label: 'SOC', variable: 'AEBODSYS', width: 180 },
      { id: 'hg32', label: 'Preferred Term', variable: 'AEDECOD', width: 160 },
      {
        children: [
          { align: 'center', id: 'hg33a', label: 'Drug X 10mg', variable: 'ARM_DRUG10', width: 120 },
          { align: 'center', id: 'hg33b', label: 'Drug X 20mg', variable: 'ARM_DRUG20', width: 120 },
          { align: 'center', id: 'hg33c', label: 'Drug X 40mg', variable: 'ARM_DRUG40', width: 120 }
        ],
        id: 'hg33',
        label: 'Active Treatment'
      },
      { align: 'center', id: 'hg34', label: 'Placebo', variable: 'ARM_PLACEBO', width: 120 },
      { id: 'hg35', label: 'Start Date', variable: 'AESTDTC', width: 110 },
      { align: 'center', id: 'hg36', label: 'Severity', variable: 'AESEV', width: 80 },
      { id: 'hg37', label: 'Action Taken', variable: 'AEACN', width: 100 }
    ],
    id: 'chs4',
    name: 'AE by Treatment Arm'
  },
  {
    description: 'Lab results with visit columns nested under each treatment arm',
    headers: [
      { id: 'hg40', label: 'Subject ID', variable: 'USUBJID', width: 120 },
      { id: 'hg41', label: 'Parameter', variable: 'PARAM', width: 160 },
      {
        children: [
          { align: 'center', id: 'hg42a', label: 'Screening', variable: 'P_ARM1_SCR', width: 90 },
          { align: 'center', id: 'hg42b', label: 'Baseline', variable: 'P_ARM1_BL', width: 90 },
          { align: 'center', id: 'hg42c', label: 'Week 4', variable: 'P_ARM1_W4', width: 90 },
          { align: 'center', id: 'hg42d', label: 'Week 12', variable: 'P_ARM1_W12', width: 90 }
        ],
        id: 'hg42',
        label: 'Placebo'
      },
      {
        children: [
          { align: 'center', id: 'hg43a', label: 'Screening', variable: 'P_ARM2_SCR', width: 90 },
          { align: 'center', id: 'hg43b', label: 'Baseline', variable: 'P_ARM2_BL', width: 90 },
          { align: 'center', id: 'hg43c', label: 'Week 4', variable: 'P_ARM2_W4', width: 90 },
          { align: 'center', id: 'hg43d', label: 'Week 12', variable: 'P_ARM2_W12', width: 90 }
        ],
        id: 'hg43',
        label: 'Drug X 10mg'
      },
      {
        children: [
          { align: 'center', id: 'hg44a', label: 'Screening', variable: 'P_ARM3_SCR', width: 90 },
          { align: 'center', id: 'hg44b', label: 'Baseline', variable: 'P_ARM3_BL', width: 90 },
          { align: 'center', id: 'hg44c', label: 'Week 4', variable: 'P_ARM3_W4', width: 90 },
          { align: 'center', id: 'hg44d', label: 'Week 12', variable: 'P_ARM3_W12', width: 90 }
        ],
        id: 'hg44',
        label: 'Drug X 20mg'
      }
    ],
    id: 'chs5',
    name: 'Lab by Visit & Arm'
  },
  {
    description: 'Table column headers with treatment arms split by phase plus a Total column',
    headers: [
      {
        children: [
          { align: 'center', id: 'hg50a', label: 'Phase 1', variable: 'TRTA_PH1', width: 120 },
          { align: 'center', id: 'hg50b', label: 'Phase 2', variable: 'TRTA_PH2', width: 120 }
        ],
        id: 'hg50',
        label: 'Trt A'
      },
      {
        children: [
          { align: 'center', id: 'hg51a', label: 'Phase 1', variable: 'TRTB_PH1', width: 120 },
          { align: 'center', id: 'hg51b', label: 'Phase 2', variable: 'TRTB_PH2', width: 120 }
        ],
        id: 'hg51',
        label: 'Trt B'
      },
      { align: 'center', id: 'hg52', label: 'Total', variable: 'TOTAL', width: 120 }
    ],
    id: 'chs6',
    name: 'Table: Trt A (Phase 1/2) + Trt B + Total'
  },
  {
    description: 'Table columns grouped by treatment grouping then individual arm, with Total',
    headers: [
      {
        children: [
          { align: 'center', id: 'hg60a', label: 'Drug X 10mg', variable: 'ARM_DRUG10', width: 120 },
          { align: 'center', id: 'hg60b', label: 'Drug X 20mg', variable: 'ARM_DRUG20', width: 120 },
          { align: 'center', id: 'hg60c', label: 'Drug X 40mg', variable: 'ARM_DRUG40', width: 120 }
        ],
        id: 'hg60',
        label: 'Active'
      },
      { align: 'center', id: 'hg61', label: 'Placebo', variable: 'ARM_PBO', width: 120 },
      { align: 'center', id: 'hg62', label: 'Total (N)', variable: 'TOTAL_N', width: 100 }
    ],
    id: 'chs7',
    name: 'Table: Arm Group (Active / Placebo) + Total'
  }
];

// ==================== Store ====================

export const useStudyStore = create<StudyState>()(
  immer(set => ({
    // Arm CRUD
    addArmToSet: (setId, arm) =>
      set(state => {
        const tas = state.treatmentArmSets.find(s => s.id === setId);
        if (tas) {
          tas.arms.push({ ...arm, id: generateId('arm') });
        }
      }),
    addChildGroup: (setId, parentId, group) =>
      set(state => {
        const chs = state.columnHeaderSets.find(s => s.id === setId);
        if (!chs) return;
        const addToTree = (groups: ColumnHeaderGroup[]): boolean => {
          for (const g of groups) {
            if (g.id === parentId) {
              if (!g.children) g.children = [];
              g.children.push({ ...group, id: generateId('hg') });
              return true;
            }
            if (g.children?.length && addToTree(g.children)) return true;
          }
          return false;
        };
        addToTree(chs.headers);
      }),
    // Column Header Set CRUD
    addColumnHeaderSet: chs =>
      set(state => {
        state.columnHeaderSets.push({ ...chs, id: generateId('chs') });
      }),
    addHeaderGroup: (setId, group) =>
      set(state => {
        const chs = state.columnHeaderSets.find(s => s.id === setId);
        if (chs) {
          chs.headers.push({ ...group, id: generateId('hg') });
        }
      }),
    // Population Set CRUD
    addPopulationSet: pop =>
      set(state => {
        state.populationSets.push({ ...pop, id: generateId('pop') });
      }),
    // Statistics Set CRUD
    addStatisticsSet: ss =>
      set(state => {
        state.statisticsSets.push({ ...ss, id: generateId('ss') });
      }),
    // Study CRUD
    addStudy: study =>
      set(state => {
        state.studies.push({ ...study, id: generateId('study') });
      }),
    addStudyTemplate: template =>
      set(state => {
        state.studyTemplates.push(template);
      }),

    // Treatment Arm Set CRUD
    addTreatmentArmSet: tasData =>
      set(state => {
        state.treatmentArmSets.push({ ...tasData, id: generateId('tas') });
      }),

    columnHeaderSets: mockColumnHeaderSets,

    currentStudy: null,

    deleteArm: (setId, armId) =>
      set(state => {
        const tas = state.treatmentArmSets.find(s => s.id === setId);
        if (tas) {
          tas.arms = tas.arms.filter(a => a.id !== armId);
        }
      }),

    deleteColumnHeaderSet: id =>
      set(state => {
        state.columnHeaderSets = state.columnHeaderSets.filter(s => s.id !== id);
      }),

    deleteHeaderGroup: (setId, groupId) =>
      set(state => {
        const chs = state.columnHeaderSets.find(s => s.id === setId);
        if (!chs) return;
        const deleteFromTree = (groups: ColumnHeaderGroup[]): ColumnHeaderGroup[] => {
          return groups
            .filter(g => g.id !== groupId)
            .map(g => (g.children?.length ? { ...g, children: deleteFromTree(g.children) } : g));
        };
        chs.headers = deleteFromTree(chs.headers);
      }),

    deletePopulationSet: id =>
      set(state => {
        state.populationSets = state.populationSets.filter(p => p.id !== id);
      }),

    deleteStatisticsSet: id =>
      set(state => {
        state.statisticsSets = state.statisticsSets.filter(s => s.id !== id);
      }),

    deleteStudy: id =>
      set(state => {
        state.studies = state.studies.filter(s => s.id !== id);
      }),

    deleteStudyTemplate: id =>
      set(state => {
        state.studyTemplates = state.studyTemplates.filter(t => t.id !== id);
      }),

    deleteTreatmentArmSet: id =>
      set(state => {
        state.treatmentArmSets = state.treatmentArmSets.filter(tas => tas.id !== id);
      }),

    populationSets: mockPopulationSets,

    setCurrentStudy: study =>
      set(state => {
        state.currentStudy = study;
      }),

    setDefaultPopulation: id =>
      set(state => {
        state.populationSets.forEach(p => {
          p.isDefault = p.id === id;
        });
      }),

    // Study Defaults
    setStudyDefaults: defaults =>
      set(state => {
        state.studyDefaults = defaults;
      }),

    // Study Template CRUD
    setStudyTemplates: templates =>
      set(state => {
        state.studyTemplates = templates;
      }),

    statisticsSets: mockStatisticsSets,

    studies: mockStudies,

    studyDefaults: null,

    studyTemplates: [],

    treatmentArmSets: mockTreatmentArmSets,

    updateArm: (setId, armId, updates) =>
      set(state => {
        const tas = state.treatmentArmSets.find(s => s.id === setId);
        if (tas) {
          const arm = tas.arms.find(a => a.id === armId);
          if (arm) {
            Object.assign(arm, updates);
          }
        }
      }),

    updateColumnHeaderSet: (id, updates) =>
      set(state => {
        const index = state.columnHeaderSets.findIndex(s => s.id === id);
        if (index !== -1) {
          Object.assign(state.columnHeaderSets[index], updates);
        }
      }),

    updateDecimalRules: rules =>
      set(state => {
        // Auto-initialize studyDefaults if not present
        if (!state.studyDefaults) {
          state.studyDefaults = {
            decimalRules: rules,
            id: generateId('sd'),
            scopeNodeId: ''
          };
        } else {
          state.studyDefaults.decimalRules = rules;
        }
      }),

    // Recursive helper to update a group by id anywhere in the tree
    updateHeaderGroup: (setId, groupId, updates) =>
      set(state => {
        const chs = state.columnHeaderSets.find(s => s.id === setId);
        if (!chs) return;
        const updateInTree = (groups: ColumnHeaderGroup[]): boolean => {
          for (const g of groups) {
            if (g.id === groupId) {
              Object.assign(g, updates);
              return true;
            }
            if (g.children?.length && updateInTree(g.children)) return true;
          }
          return false;
        };
        updateInTree(chs.headers);
      }),

    updateHeaderStyle: style =>
      set(state => {
        // Auto-initialize studyDefaults if not present
        if (!state.studyDefaults) {
          state.studyDefaults = {
            decimalRules: {},
            headerStyle: style,
            id: generateId('sd'),
            scopeNodeId: ''
          };
        } else {
          state.studyDefaults.headerStyle = style;
        }
      }),

    updatePopulationSet: (id, updates) =>
      set(state => {
        const index = state.populationSets.findIndex(p => p.id === id);
        if (index !== -1) {
          Object.assign(state.populationSets[index], updates);
        }
      }),

    updateStatisticsSet: (id, updates) =>
      set(state => {
        const index = state.statisticsSets.findIndex(s => s.id === id);
        if (index !== -1) {
          Object.assign(state.statisticsSets[index], updates);
        }
      }),

    updateStudy: (id, updates) =>
      set(state => {
        const index = state.studies.findIndex(s => s.id === id);
        if (index !== -1) {
          Object.assign(state.studies[index], updates, {
            updatedAt: new Date().toISOString().split('T')[0]
          });
        }
      }),

    updateStudyTemplate: (id, updates) =>
      set(state => {
        const index = state.studyTemplates.findIndex(t => t.id === id);
        if (index !== -1) {
          Object.assign(state.studyTemplates[index], updates);
        }
      }),

    updateTreatmentArmSet: (id, updates) =>
      set(state => {
        const index = state.treatmentArmSets.findIndex(tas => tas.id === id);
        if (index !== -1) {
          Object.assign(state.treatmentArmSets[index], updates);
        }
      })
  }))
);
