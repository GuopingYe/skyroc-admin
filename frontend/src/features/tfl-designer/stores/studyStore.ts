/**
 * TFL Designer - Study Store (Zustand + Immer)
 *
 * Manages studies list and treatment arm sets.
 * Follows the POC store pattern with immer middleware.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Study, TreatmentArmSet, TreatmentArm, PopulationSet, StatisticsSet, ColumnHeaderSet, ColumnHeaderGroup, HeaderFontStyle } from '../types';
import { generateId, DEFAULT_HEADER_FONT_STYLE } from '../types';

// ==================== State Interface ====================

interface StudyState {
  studies: Study[];
  currentStudy: Study | null;
  treatmentArmSets: TreatmentArmSet[];
  populationSets: PopulationSet[];
  statisticsSets: StatisticsSet[];
  columnHeaderSets: ColumnHeaderSet[];
  headerFontStyle: HeaderFontStyle;

  // Column Header Set CRUD

  // Study CRUD
  addStudy: (study: Omit<Study, 'id'>) => void;
  updateStudy: (id: string, updates: Partial<Study>) => void;
  deleteStudy: (id: string) => void;
  setCurrentStudy: (study: Study | null) => void;

  // Treatment Arm Set CRUD
  addTreatmentArmSet: (set: Omit<TreatmentArmSet, 'id'>) => void;
  updateTreatmentArmSet: (id: string, updates: Partial<TreatmentArmSet>) => void;
  deleteTreatmentArmSet: (id: string) => void;

  // Arm CRUD within a set
  addArmToSet: (setId: string, arm: Omit<TreatmentArm, 'id'>) => void;
  updateArm: (setId: string, armId: string, updates: Partial<TreatmentArm>) => void;
  deleteArm: (setId: string, armId: string) => void;

  // Population Set CRUD
  addPopulationSet: (pop: Omit<PopulationSet, 'id'>) => void;
  updatePopulationSet: (id: string, updates: Partial<PopulationSet>) => void;
  deletePopulationSet: (id: string) => void;
  setDefaultPopulation: (id: string) => void;

  // Statistics Set CRUD
  addStatisticsSet: (ss: Omit<StatisticsSet, 'id'>) => void;
  updateStatisticsSet: (id: string, updates: Partial<StatisticsSet>) => void;
  deleteStatisticsSet: (id: string) => void;

  // Header Font Style
  setHeaderFontStyle: (style: HeaderFontStyle) => void;

  // Column Header Set CRUD
  addColumnHeaderSet: (chs: Omit<ColumnHeaderSet, 'id'>) => void;
  updateColumnHeaderSet: (id: string, updates: Partial<ColumnHeaderSet>) => void;
  deleteColumnHeaderSet: (id: string) => void;
  addHeaderGroup: (setId: string, group: Omit<ColumnHeaderGroup, 'id'>) => void;
  updateHeaderGroup: (setId: string, groupId: string, updates: Partial<ColumnHeaderGroup>) => void;
  deleteHeaderGroup: (setId: string, groupId: string) => void;
  addChildGroup: (setId: string, parentId: string, group: Omit<ColumnHeaderGroup, 'id'>) => void;
}

// ==================== Mock Data ====================

const mockStudies: Study[] = [
  {
    id: 's1',
    studyId: 'STUDY-001',
    title: 'Phase 3 Study of Drug X in Oncology',
    compound: 'Drug X',
    phase: 'Phase 3',
    diseaseArea: 'Oncology',
    therapeuticArea: 'Solid Tumors',
    createdAt: '2026-03-01',
    updatedAt: '2026-03-13',
  },
  {
    id: 's2',
    studyId: 'STUDY-002',
    title: 'Phase 2 Study of Drug Y in Neurology',
    compound: 'Drug Y',
    phase: 'Phase 2',
    diseaseArea: 'Neurology',
    therapeuticArea: "Alzheimer's Disease",
    createdAt: '2026-02-15',
    updatedAt: '2026-03-10',
  },
];

const mockTreatmentArmSets: TreatmentArmSet[] = [
  {
    id: 'tas1',
    name: 'Study ABC-001 Treatment Arms (with grouping)',
    arms: [
      { id: 'arm1', name: 'Placebo', order: 1, N: 50 },
      { id: 'arm2', name: 'Drug X 10mg', order: 2, grouping: 'Active', N: 52 },
      { id: 'arm3', name: 'Drug X 20mg', order: 3, grouping: 'Active', N: 48 },
      { id: 'arm4', name: 'Drug X 40mg', order: 4, grouping: 'Active', N: 47 },
    ],
    headers: [
      {
        id: 'hg60', label: 'Active', children: [
          { id: 'hg60a', label: 'Drug X 10mg', variable: 'ARM_DRUG10', width: 120, align: 'center', N: 52 },
          { id: 'hg60b', label: 'Drug X 20mg', variable: 'ARM_DRUG20', width: 120, align: 'center', N: 48 },
          { id: 'hg60c', label: 'Drug X 40mg', variable: 'ARM_DRUG40', width: 120, align: 'center', N: 47 },
        ],
      },
      { id: 'hg61', label: 'Placebo', variable: 'ARM_PBO', width: 120, align: 'center', N: 50 },
      { id: 'hg62', label: 'Total (N)', variable: 'TOTAL_N', width: 100, align: 'center', N: 197 },
    ],
  },
  {
    id: 'tas2',
    name: 'Simple Two-Arm Study',
    arms: [
      { id: 'arm1', name: 'Placebo', order: 1, N: 100 },
      { id: 'arm2', name: 'Treatment', order: 2, N: 102 },
    ],
    headers: [
      { id: 'hg20', label: 'Placebo', variable: 'ARM_PBO', width: 140, align: 'center', N: 100 },
      { id: 'hg21', label: 'Treatment', variable: 'ARM_TRT', width: 140, align: 'center', N: 102 },
      { id: 'hg22', label: 'Total (N)', variable: 'TOTAL_N', width: 120, align: 'center', N: 202 },
    ],
  },
  {
    id: 'tas3',
    name: 'Phase 1/2 Study (nested headers)',
    arms: [
      { id: 'arm1', name: 'Placebo', order: 1, N: 80 },
      { id: 'arm2', name: 'Trt A', order: 2, N: 85 },
      { id: 'arm3', name: 'Trt B', order: 3, N: 82 },
    ],
    headers: [
      {
        id: 'hg70', label: 'Trt A', children: [
          { id: 'hg70a', label: 'Phase 1', variable: 'TRTA_PH1', width: 120, align: 'center', N: 40 },
          { id: 'hg70b', label: 'Phase 2', variable: 'TRTA_PH2', width: 120, align: 'center', N: 45 },
        ],
      },
      {
        id: 'hg71', label: 'Trt B', children: [
          { id: 'hg71a', label: 'Phase 1', variable: 'TRTB_PH1', width: 120, align: 'center', N: 38 },
          { id: 'hg71b', label: 'Phase 2', variable: 'TRTB_PH2', width: 120, align: 'center', N: 44 },
        ],
      },
      { id: 'hg72', label: 'Total', variable: 'TOTAL', width: 120, align: 'center', N: 167 },
    ],
  },
];

const mockPopulationSets: PopulationSet[] = [
  { id: 'pop1', name: 'Safety', description: 'All randomized subjects who received at least one dose', dataset: 'ADSL', filterExpression: "SAFFL='Y'", isDefault: true },
  { id: 'pop2', name: 'ITT', description: 'All randomized subjects', dataset: 'ADSL', filterExpression: "ITTFL='Y'" },
  { id: 'pop3', name: 'PP', description: 'All subjects who completed study without major protocol deviations', dataset: 'ADSL', filterExpression: "PPROTFL='Y'" },
  { id: 'pop4', name: 'Efficacy', description: 'All subjects in the efficacy population', dataset: 'ADSL', filterExpression: "EFFFL='Y'" },
];

const mockStatisticsSets: StatisticsSet[] = [
  {
    id: 'ss1',
    name: 'Demographics Stats',
    stats: [
      { id: 'st1', type: 'n', label: 'n', format: 'XX' },
      { id: 'st2', type: 'mean', label: 'Mean (SD)', format: 'XX.X (X.XX)' },
      { id: 'st3', type: 'median', label: 'Median', format: 'XX.X' },
      { id: 'st4', type: 'min', label: 'Min, Max', format: 'XX.X, XX.X' },
    ],
  },
  {
    id: 'ss2',
    name: 'Safety Categorical Stats',
    stats: [
      { id: 'st5', type: 'n_percent', label: 'n (%)', format: 'XX (XX.X%)' },
    ],
  },
];

const mockColumnHeaderSets: ColumnHeaderSet[] = [
  {
    id: 'chs1',
    name: 'SOC / PT Grouping',
    description: 'Adverse Events grouped by System Organ Class and Preferred Term',
    headers: [
      {
        id: 'hg1',
        label: 'SOC',
        variable: 'AEBODSYS',
        width: 180,
        children: [
          { id: 'hg1a', label: 'System Organ Class', variable: 'AEBODSYS', width: 180 },
          { id: 'hg1b', label: 'Preferred Term', variable: 'AEDECOD', width: 160, indentLevel: 1 },
        ],
      },
      { id: 'hg2', label: 'Subject ID', variable: 'USUBJID', width: 120 },
      { id: 'hg3', label: 'Age', variable: 'AGE', width: 80, align: 'center' },
      { id: 'hg4', label: 'Sex', variable: 'SEX', width: 80, align: 'center' },
      { id: 'hg5', label: 'Start Date', variable: 'AESTDTC', width: 120 },
      { id: 'hg6', label: 'End Date', variable: 'AEENDTC', width: 120 },
      { id: 'hg7', label: 'Severity', variable: 'AESEV', width: 80, align: 'center' },
      { id: 'hg8', label: 'Related?', variable: 'AEREL', width: 80, align: 'center' },
    ],
  },
  {
    id: 'chs2',
    name: 'Visit-Based',
    description: 'Lab and VS parameters by scheduled visit',
    headers: [
      {
        id: 'hg10',
        label: 'Visit Info',
        children: [
          { id: 'hg10a', label: 'Visit', variable: 'AVISIT', width: 120 },
          { id: 'hg10b', label: 'Visit Date', variable: 'AVSITDT', width: 110 },
        ],
      },
      { id: 'hg11', label: 'Subject ID', variable: 'USUBJID', width: 120 },
      { id: 'hg12', label: 'Parameter', variable: 'PARAM', width: 160 },
      { id: 'hg13', label: 'Result', variable: 'AVAL', width: 100, align: 'center' },
      { id: 'hg14', label: 'Unit', variable: 'AVALU', width: 60, align: 'center' },
      { id: 'hg15', label: 'Change from Baseline', variable: 'CHG', width: 120, align: 'center' },
    ],
  },
  {
    id: 'chs3',
    name: 'Flat Demographics',
    description: 'Simple flat columns for demographics listings',
    headers: [
      { id: 'hg20', label: 'Subject ID', variable: 'USUBJID', width: 120 },
      { id: 'hg21', label: 'Site', variable: 'SITEID', width: 80, align: 'center' },
      { id: 'hg22', label: 'Age', variable: 'AGE', width: 80, align: 'center' },
      { id: 'hg23', label: 'Sex', variable: 'SEX', width: 80, align: 'center' },
      { id: 'hg24', label: 'Race', variable: 'RACE', width: 140 },
      { id: 'hg25', label: 'Ethnicity', variable: 'ETHNIC', width: 120 },
      { id: 'hg26', label: 'Country', variable: 'COUNTRY', width: 120 },
    ],
  },
  {
    id: 'chs4',
    name: 'AE by Treatment Arm',
    description: 'Adverse Events listing with columns grouped by treatment arm (matches first Arm Set)',
    headers: [
      { id: 'hg30', label: 'Subject ID', variable: 'USUBJID', width: 120 },
      { id: 'hg31', label: 'SOC', variable: 'AEBODSYS', width: 180 },
      { id: 'hg32', label: 'Preferred Term', variable: 'AEDECOD', width: 160 },
      {
        id: 'hg33',
        label: 'Active Treatment',
        children: [
          { id: 'hg33a', label: 'Drug X 10mg', variable: 'ARM_DRUG10', width: 120, align: 'center' },
          { id: 'hg33b', label: 'Drug X 20mg', variable: 'ARM_DRUG20', width: 120, align: 'center' },
          { id: 'hg33c', label: 'Drug X 40mg', variable: 'ARM_DRUG40', width: 120, align: 'center' },
        ],
      },
      { id: 'hg34', label: 'Placebo', variable: 'ARM_PLACEBO', width: 120, align: 'center' },
      { id: 'hg35', label: 'Start Date', variable: 'AESTDTC', width: 110 },
      { id: 'hg36', label: 'Severity', variable: 'AESEV', width: 80, align: 'center' },
      { id: 'hg37', label: 'Action Taken', variable: 'AEACN', width: 100 },
    ],
  },
  {
    id: 'chs5',
    name: 'Lab by Visit & Arm',
    description: 'Lab results with visit columns nested under each treatment arm',
    headers: [
      { id: 'hg40', label: 'Subject ID', variable: 'USUBJID', width: 120 },
      { id: 'hg41', label: 'Parameter', variable: 'PARAM', width: 160 },
      {
        id: 'hg42',
        label: 'Placebo',
        children: [
          { id: 'hg42a', label: 'Screening', variable: 'P_ARM1_SCR', width: 90, align: 'center' },
          { id: 'hg42b', label: 'Baseline', variable: 'P_ARM1_BL', width: 90, align: 'center' },
          { id: 'hg42c', label: 'Week 4', variable: 'P_ARM1_W4', width: 90, align: 'center' },
          { id: 'hg42d', label: 'Week 12', variable: 'P_ARM1_W12', width: 90, align: 'center' },
        ],
      },
      {
        id: 'hg43',
        label: 'Drug X 10mg',
        children: [
          { id: 'hg43a', label: 'Screening', variable: 'P_ARM2_SCR', width: 90, align: 'center' },
          { id: 'hg43b', label: 'Baseline', variable: 'P_ARM2_BL', width: 90, align: 'center' },
          { id: 'hg43c', label: 'Week 4', variable: 'P_ARM2_W4', width: 90, align: 'center' },
          { id: 'hg43d', label: 'Week 12', variable: 'P_ARM2_W12', width: 90, align: 'center' },
        ],
      },
      {
        id: 'hg44',
        label: 'Drug X 20mg',
        children: [
          { id: 'hg44a', label: 'Screening', variable: 'P_ARM3_SCR', width: 90, align: 'center' },
          { id: 'hg44b', label: 'Baseline', variable: 'P_ARM3_BL', width: 90, align: 'center' },
          { id: 'hg44c', label: 'Week 4', variable: 'P_ARM3_W4', width: 90, align: 'center' },
          { id: 'hg44d', label: 'Week 12', variable: 'P_ARM3_W12', width: 90, align: 'center' },
        ],
      },
    ],
  },
  {
    id: 'chs6',
    name: 'Table: Trt A (Phase 1/2) + Trt B + Total',
    description: 'Table column headers with treatment arms split by phase plus a Total column',
    headers: [
      {
        id: 'hg50',
        label: 'Trt A',
        children: [
          { id: 'hg50a', label: 'Phase 1', variable: 'TRTA_PH1', width: 120, align: 'center' },
          { id: 'hg50b', label: 'Phase 2', variable: 'TRTA_PH2', width: 120, align: 'center' },
        ],
      },
      {
        id: 'hg51',
        label: 'Trt B',
        children: [
          { id: 'hg51a', label: 'Phase 1', variable: 'TRTB_PH1', width: 120, align: 'center' },
          { id: 'hg51b', label: 'Phase 2', variable: 'TRTB_PH2', width: 120, align: 'center' },
        ],
      },
      { id: 'hg52', label: 'Total', variable: 'TOTAL', width: 120, align: 'center' },
    ],
  },
  {
    id: 'chs7',
    name: 'Table: Arm Group (Active / Placebo) + Total',
    description: 'Table columns grouped by treatment grouping then individual arm, with Total',
    headers: [
      {
        id: 'hg60',
        label: 'Active',
        children: [
          { id: 'hg60a', label: 'Drug X 10mg', variable: 'ARM_DRUG10', width: 120, align: 'center' },
          { id: 'hg60b', label: 'Drug X 20mg', variable: 'ARM_DRUG20', width: 120, align: 'center' },
          { id: 'hg60c', label: 'Drug X 40mg', variable: 'ARM_DRUG40', width: 120, align: 'center' },
        ],
      },
      { id: 'hg61', label: 'Placebo', variable: 'ARM_PBO', width: 120, align: 'center' },
      { id: 'hg62', label: 'Total (N)', variable: 'TOTAL_N', width: 100, align: 'center' },
    ],
  },
];

// ==================== Store ====================

export const useStudyStore = create<StudyState>()(
  immer((set) => ({
    studies: mockStudies,
    currentStudy: null,
    treatmentArmSets: mockTreatmentArmSets,
    populationSets: mockPopulationSets,
    statisticsSets: mockStatisticsSets,
    columnHeaderSets: mockColumnHeaderSets,
    headerFontStyle: DEFAULT_HEADER_FONT_STYLE,

    // Study CRUD
    addStudy: (study) =>
      set((state) => {
        state.studies.push({ ...study, id: generateId('study') });
      }),

    updateStudy: (id, updates) =>
      set((state) => {
        const index = state.studies.findIndex((s) => s.id === id);
        if (index !== -1) {
          Object.assign(state.studies[index], updates, {
            updatedAt: new Date().toISOString().split('T')[0],
          });
        }
      }),

    deleteStudy: (id) =>
      set((state) => {
        state.studies = state.studies.filter((s) => s.id !== id);
      }),

    setCurrentStudy: (study) =>
      set((state) => {
        state.currentStudy = study;
      }),

    // Treatment Arm Set CRUD
    addTreatmentArmSet: (tasData) =>
      set((state) => {
        state.treatmentArmSets.push({ ...tasData, id: generateId('tas') });
      }),

    updateTreatmentArmSet: (id, updates) =>
      set((state) => {
        const index = state.treatmentArmSets.findIndex((tas) => tas.id === id);
        if (index !== -1) {
          Object.assign(state.treatmentArmSets[index], updates);
        }
      }),

    deleteTreatmentArmSet: (id) =>
      set((state) => {
        state.treatmentArmSets = state.treatmentArmSets.filter((tas) => tas.id !== id);
      }),

    // Arm CRUD
    addArmToSet: (setId, arm) =>
      set((state) => {
        const tas = state.treatmentArmSets.find((s) => s.id === setId);
        if (tas) {
          tas.arms.push({ ...arm, id: generateId('arm') });
        }
      }),

    updateArm: (setId, armId, updates) =>
      set((state) => {
        const tas = state.treatmentArmSets.find((s) => s.id === setId);
        if (tas) {
          const arm = tas.arms.find((a) => a.id === armId);
          if (arm) {
            Object.assign(arm, updates);
          }
        }
      }),

    deleteArm: (setId, armId) =>
      set((state) => {
        const tas = state.treatmentArmSets.find((s) => s.id === setId);
        if (tas) {
          tas.arms = tas.arms.filter((a) => a.id !== armId);
        }
      }),

    // Population Set CRUD
    addPopulationSet: (pop) =>
      set((state) => {
        state.populationSets.push({ ...pop, id: generateId('pop') });
      }),

    updatePopulationSet: (id, updates) =>
      set((state) => {
        const index = state.populationSets.findIndex((p) => p.id === id);
        if (index !== -1) {
          Object.assign(state.populationSets[index], updates);
        }
      }),

    deletePopulationSet: (id) =>
      set((state) => {
        state.populationSets = state.populationSets.filter((p) => p.id !== id);
      }),

    setDefaultPopulation: (id) =>
      set((state) => {
        state.populationSets.forEach((p) => {
          p.isDefault = p.id === id;
        });
      }),

    // Statistics Set CRUD
    addStatisticsSet: (ss) =>
      set((state) => {
        state.statisticsSets.push({ ...ss, id: generateId('ss') });
      }),

    updateStatisticsSet: (id, updates) =>
      set((state) => {
        const index = state.statisticsSets.findIndex((s) => s.id === id);
        if (index !== -1) {
          Object.assign(state.statisticsSets[index], updates);
        }
      }),

    deleteStatisticsSet: (id) =>
      set((state) => {
        state.statisticsSets = state.statisticsSets.filter((s) => s.id !== id);
      }),

    setHeaderFontStyle: (style) =>
      set((state) => {
        state.headerFontStyle = style;
      }),

    // Column Header Set CRUD
    addColumnHeaderSet: (chs) =>
      set((state) => {
        state.columnHeaderSets.push({ ...chs, id: generateId('chs') });
      }),

    updateColumnHeaderSet: (id, updates) =>
      set((state) => {
        const index = state.columnHeaderSets.findIndex((s) => s.id === id);
        if (index !== -1) {
          Object.assign(state.columnHeaderSets[index], updates);
        }
      }),

    deleteColumnHeaderSet: (id) =>
      set((state) => {
        state.columnHeaderSets = state.columnHeaderSets.filter((s) => s.id !== id);
      }),

    addHeaderGroup: (setId, group) =>
      set((state) => {
        const chs = state.columnHeaderSets.find((s) => s.id === setId);
        if (chs) {
          chs.headers.push({ ...group, id: generateId('hg') });
        }
      }),

    // Recursive helper to update a group by id anywhere in the tree
    updateHeaderGroup: (setId, groupId, updates) =>
      set((state) => {
        const chs = state.columnHeaderSets.find((s) => s.id === setId);
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

    deleteHeaderGroup: (setId, groupId) =>
      set((state) => {
        const chs = state.columnHeaderSets.find((s) => s.id === setId);
        if (!chs) return;
        const deleteFromTree = (groups: ColumnHeaderGroup[]): ColumnHeaderGroup[] => {
          return groups
            .filter((g) => g.id !== groupId)
            .map((g) => (g.children?.length ? { ...g, children: deleteFromTree(g.children) } : g));
        };
        chs.headers = deleteFromTree(chs.headers);
      }),

    addChildGroup: (setId, parentId, group) =>
      set((state) => {
        const chs = state.columnHeaderSets.find((s) => s.id === setId);
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
  }))
);
