/**
 * TFL Designer - Listing Store (Zustand + Immer)
 *
 * Manages listing shells with columns, sort, and filter configurations. Includes mock data for preview. Follows the POC
 * store pattern with immer middleware.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { FilterConfig, ListingColumn, ListingShell, SortConfig } from '../types';
import { generateId } from '../types';

// ==================== Extended Filter ====================

export interface ExtendedFilterConfig extends Omit<FilterConfig, 'operator'> {
  operator: 'contains' | 'eq' | 'ge' | 'gt' | 'in' | 'is_null' | 'le' | 'lt' | 'ne' | 'not_null';
}

// ==================== State Interface ====================

interface ListingState {
  addColumn: (column?: Partial<ListingColumn>) => void;
  // Filter operations
  addFilter: (filter?: Partial<ExtendedFilterConfig>) => void;
  // Add new listing (proper Zustand/Immer way)
  addListing: (listing: ListingShell) => void;

  addSort: (sort?: Partial<SortConfig>) => void;

  currentListing: ListingShell | null;
  deleteColumn: (columnId: string) => void;

  deleteFilter: (index: number) => void;

  // Delete listing
  deleteListing: (id: string) => void;

  deleteSort: (index: number) => void;

  isDirty: boolean;
  listings: ListingShell[];
  // Template operations
  loadFromTemplate: (template: ListingShell) => void;
  // State management
  markClean: () => void;
  moveColumn: (columnId: string, direction: 'down' | 'up') => void;
  reorderColumns: (fromIndex: number, toIndex: number) => void;

  reorderSort: (fromIndex: number, toIndex: number) => void;
  resetToDefault: () => void;
  saveAsTemplate: (listing: ListingShell, name: string) => void;
  // Selection & metadata
  setCurrentListing: (listing: ListingShell | null) => void;
  setDirty: (dirty: boolean) => void;

  // Batch update from server
  setListings: (listings: ListingShell[]) => void;
  updateColumn: (columnId: string, updates: Partial<ListingColumn>) => void;
  // Column operations
  updateColumns: (columns: ListingColumn[]) => void;

  updateFilter: (index: number, updates: Partial<ExtendedFilterConfig>) => void;
  updateMetadata: (updates: Partial<ListingShell>) => void;

  updateSort: (index: number, updates: Partial<SortConfig>) => void;
  // Sort operations
  updateSorts: (sorts: SortConfig[]) => void;
}

// ==================== Filter Operator Options ====================

export const filterOperatorOptions = [
  { label: 'equals (=)', value: 'eq' },
  { label: 'not equals (!=)', value: 'ne' },
  { label: 'greater than (>)', value: 'gt' },
  { label: 'less than (<)', value: 'lt' },
  { label: 'greater or equal (>=)', value: 'ge' },
  { label: 'less or equal (<=)', value: 'le' },
  { label: 'contains', value: 'contains' },
  { label: 'in list', value: 'in' },
  { label: 'is null/empty', value: 'is_null' },
  { label: 'is not null/empty', value: 'not_null' }
];

// ==================== Mock Listings ====================

const mockListings: ListingShell[] = [
  {
    columnHeaderSetId: 'chs4',
    columns: [
      { align: 'left', id: 'c1', label: 'Subject ID', name: 'SUBJID', width: 100 },
      { align: 'left', id: 'c2', label: 'Adverse Event', name: 'AETERM', width: 200 },
      { align: 'left', id: 'c3', label: 'Preferred Term', name: 'AEDECOD', width: 150 },
      { align: 'left', id: 'c4', label: 'System Organ Class', name: 'AEBODSYS', width: 180 },
      { align: 'center', id: 'c5', label: 'Start Date', name: 'AESTDTC', width: 100 },
      { align: 'center', id: 'c6', label: 'End Date', name: 'AEENDTC', width: 100 },
      { align: 'center', id: 'c7', label: 'Severity', name: 'AESEV', width: 80 },
      { align: 'center', id: 'c8', label: 'Relationship', name: 'AEREL', width: 100 }
    ],
    dataset: 'ADAE',
    filter: [],
    id: 'l1',
    listingNumber: 'Listing 16.1.1',
    pageSize: 20,
    population: 'Safety',
    sortBy: [
      { columnId: 'c1', order: 'asc', priority: 1 },
      { columnId: 'c5', order: 'asc', priority: 2 }
    ],
    title: 'Adverse Events Listing'
  },
  {
    columnHeaderSetId: 'chs5',
    columns: [
      { align: 'left', id: 'c1', label: 'Subject ID', name: 'SUBJID', width: 100 },
      { align: 'left', id: 'c2', label: 'Visit', name: 'VISIT', width: 120 },
      { align: 'left', id: 'c3', label: 'Lab Test', name: 'LBTEST', width: 150 },
      { align: 'right', id: 'c4', label: 'Result', name: 'LBSTRESN', width: 80 },
      { align: 'center', id: 'c5', label: 'Unit', name: 'LBSTRESU', width: 60 },
      { align: 'center', id: 'c6', label: 'Reference Range', name: 'LBNRIND', width: 100 }
    ],
    dataset: 'ADLB',
    filter: [],
    id: 'l2',
    listingNumber: 'Listing 16.2.1',
    pageSize: 30,
    population: 'Safety',
    sortBy: [
      { columnId: 'c1', order: 'asc', priority: 1 },
      { columnId: 'c2', order: 'asc', priority: 2 }
    ],
    title: 'Laboratory Results Listing'
  }
];

// ==================== Mock Preview Data ====================

export const mockPreviewData: Record<string, unknown[]> = {
  ADAE: [
    {
      AEBODSYS: 'Nervous system disorders',
      AEDECOD: 'Headache',
      AEENDTC: '2026-01-17',
      AEREL: 'Related',
      AESEV: 'Mild',
      AESTDTC: '2026-01-15',
      AETERM: 'Headache',
      SUBJID: '001-001'
    },
    {
      AEBODSYS: 'Gastrointestinal disorders',
      AEDECOD: 'Nausea',
      AEENDTC: '',
      AEREL: 'Not Related',
      AESEV: 'Moderate',
      AESTDTC: '2026-01-16',
      AETERM: 'Nausea',
      SUBJID: '001-001'
    },
    {
      AEBODSYS: 'Nervous system disorders',
      AEDECOD: 'Dizziness',
      AEENDTC: '2026-01-19',
      AEREL: 'Related',
      AESEV: 'Mild',
      AESTDTC: '2026-01-18',
      AETERM: 'Dizziness',
      SUBJID: '001-002'
    },
    {
      AEBODSYS: 'General disorders',
      AEDECOD: 'Fatigue',
      AEENDTC: '2026-01-22',
      AEREL: 'Related',
      AESEV: 'Moderate',
      AESTDTC: '2026-01-20',
      AETERM: 'Fatigue',
      SUBJID: '001-003'
    },
    {
      AEBODSYS: 'Gastrointestinal disorders',
      AEDECOD: 'Vomiting',
      AEENDTC: '',
      AEREL: 'Related',
      AESEV: 'Severe',
      AESTDTC: '2026-01-21',
      AETERM: 'Vomiting',
      SUBJID: '001-003'
    },
    {
      AEBODSYS: 'Skin disorders',
      AEDECOD: 'Rash',
      AEENDTC: '2026-01-28',
      AEREL: 'Not Related',
      AESEV: 'Mild',
      AESTDTC: '2026-01-25',
      AETERM: 'Rash',
      SUBJID: '002-001'
    },
    {
      AEBODSYS: 'Nervous system disorders',
      AEDECOD: 'Insomnia',
      AEENDTC: '',
      AEREL: 'Related',
      AESEV: 'Mild',
      AESTDTC: '2026-01-22',
      AETERM: 'Insomnia',
      SUBJID: '002-002'
    },
    {
      AEBODSYS: 'Respiratory disorders',
      AEDECOD: 'Cough',
      AEENDTC: '2026-01-25',
      AEREL: 'Not Related',
      AESEV: 'Mild',
      AESTDTC: '2026-01-23',
      AETERM: 'Cough',
      SUBJID: '002-003'
    },
    {
      AEBODSYS: 'Gastrointestinal disorders',
      AEDECOD: 'Diarrhea',
      AEENDTC: '2026-01-27',
      AEREL: 'Related',
      AESEV: 'Moderate',
      AESTDTC: '2026-01-26',
      AETERM: 'Diarrhea',
      SUBJID: '003-001'
    },
    {
      AEBODSYS: 'Musculoskeletal disorders',
      AEDECOD: 'Arthralgia',
      AEENDTC: '',
      AEREL: 'Not Related',
      AESEV: 'Mild',
      AESTDTC: '2026-01-28',
      AETERM: 'Arthralgia',
      SUBJID: '003-002'
    }
  ],
  ADCM: [
    { CMENDTC: '', CMINDC: 'Pain', CMPRFLX: 'Concomitant', CMSTDTC: '2025-12-01', CMTRT: 'Aspirin', SUBJID: '001-001' },
    {
      CMENDTC: '',
      CMINDC: 'Supplement',
      CMPRFLX: 'Concomitant',
      CMSTDTC: '2025-11-15',
      CMTRT: 'Vitamin D',
      SUBJID: '001-001'
    },
    {
      CMENDTC: '',
      CMINDC: 'Diabetes',
      CMPRFLX: 'Concomitant',
      CMSTDTC: '2024-06-01',
      CMTRT: 'Metformin',
      SUBJID: '001-002'
    }
  ],
  ADEX: [
    { EXDOSE: 10, EXDOSU: 'mg', EXENDTC: '2026-01-28', EXSTDTC: '2026-01-01', EXTRT: 'Study Drug', SUBJID: '001-001' },
    { EXDOSE: 0, EXDOSU: 'mg', EXENDTC: '2026-01-28', EXSTDTC: '2026-01-01', EXTRT: 'Placebo', SUBJID: '001-002' },
    { EXDOSE: 20, EXDOSU: 'mg', EXENDTC: '2026-01-28', EXSTDTC: '2026-01-01', EXTRT: 'Study Drug', SUBJID: '001-003' }
  ],
  ADLB: [
    { LBNRIND: 'Normal', LBSTRESN: 14.2, LBSTRESU: 'g/dL', LBTEST: 'Hemoglobin', SUBJID: '001-001', VISIT: 'Baseline' },
    { LBNRIND: 'Normal', LBSTRESN: 13.8, LBSTRESU: 'g/dL', LBTEST: 'Hemoglobin', SUBJID: '001-001', VISIT: 'Week 4' },
    { LBNRIND: 'Normal', LBSTRESN: 7.5, LBSTRESU: '10^9/L', LBTEST: 'WBC', SUBJID: '001-001', VISIT: 'Baseline' },
    { LBNRIND: 'Normal', LBSTRESN: 6.8, LBSTRESU: '10^9/L', LBTEST: 'WBC', SUBJID: '001-001', VISIT: 'Week 4' },
    { LBNRIND: 'Low', LBSTRESN: 12.5, LBSTRESU: 'g/dL', LBTEST: 'Hemoglobin', SUBJID: '001-002', VISIT: 'Baseline' },
    { LBNRIND: 'Low', LBSTRESN: 11.8, LBSTRESU: 'g/dL', LBTEST: 'Hemoglobin', SUBJID: '001-002', VISIT: 'Week 4' },
    { LBNRIND: 'Normal', LBSTRESN: 25, LBSTRESU: 'U/L', LBTEST: 'ALT', SUBJID: '002-001', VISIT: 'Baseline' },
    { LBNRIND: 'High', LBSTRESN: 42, LBSTRESU: 'U/L', LBTEST: 'ALT', SUBJID: '002-001', VISIT: 'Week 4' }
  ],
  ADSL: [
    {
      AGE: 45,
      ETHNIC: 'Not Hispanic',
      RACE: 'White',
      SEX: 'M',
      SUBJID: '001-001',
      TRT01P: 'Drug 10mg',
      TRTSDTC: '2026-01-01'
    },
    {
      AGE: 52,
      ETHNIC: 'Not Hispanic',
      RACE: 'White',
      SEX: 'F',
      SUBJID: '001-002',
      TRT01P: 'Placebo',
      TRTSDTC: '2026-01-01'
    },
    {
      AGE: 38,
      ETHNIC: 'Not Hispanic',
      RACE: 'Asian',
      SEX: 'M',
      SUBJID: '001-003',
      TRT01P: 'Drug 20mg',
      TRTSDTC: '2026-01-01'
    },
    {
      AGE: 61,
      ETHNIC: 'Hispanic',
      RACE: 'Black',
      SEX: 'F',
      SUBJID: '002-001',
      TRT01P: 'Drug 10mg',
      TRTSDTC: '2026-01-02'
    },
    {
      AGE: 44,
      ETHNIC: 'Not Hispanic',
      RACE: 'White',
      SEX: 'M',
      SUBJID: '002-002',
      TRT01P: 'Placebo',
      TRTSDTC: '2026-01-02'
    }
  ],
  ADVS: [
    { SUBJID: '001-001', VISIT: 'Baseline', VSSTRESN: 128, VSSTRESU: 'mmHg', VSTEST: 'Systolic BP' },
    { SUBJID: '001-001', VISIT: 'Week 4', VSSTRESN: 124, VSSTRESU: 'mmHg', VSTEST: 'Systolic BP' },
    { SUBJID: '001-001', VISIT: 'Baseline', VSSTRESN: 82, VSSTRESU: 'mmHg', VSTEST: 'Diastolic BP' },
    { SUBJID: '001-001', VISIT: 'Week 4', VSSTRESN: 78, VSSTRESU: 'mmHg', VSTEST: 'Diastolic BP' },
    { SUBJID: '001-002', VISIT: 'Baseline', VSSTRESN: 72, VSSTRESU: 'bpm', VSTEST: 'Heart Rate' },
    { SUBJID: '001-002', VISIT: 'Week 4', VSSTRESN: 68, VSSTRESU: 'bpm', VSTEST: 'Heart Rate' }
  ]
};

// ==================== Store ====================

export const useListingStore = create<ListingState>()(
  immer(set => ({
    addColumn: column =>
      set(state => {
        if (!state.currentListing) return;

        const newColumn: ListingColumn = {
          align: column?.align || 'left',
          format: column?.format,
          hidden: column?.hidden,
          id: generateId('col'),
          label: column?.label || 'New Column',
          name: column?.name || 'NEWVAR',
          width: column?.width || 100
        };

        state.currentListing.columns.push(newColumn);
        state.isDirty = true;
      }),
    addFilter: filter =>
      set(state => {
        if (!state.currentListing) return;

        if (!state.currentListing.filter) {
          state.currentListing.filter = [];
        }

        const newFilter: ExtendedFilterConfig = {
          columnId: filter?.columnId || state.currentListing.columns[0]?.id || '',
          operator: filter?.operator || 'eq',
          value: filter?.value || ''
        };

        state.currentListing.filter.push(newFilter as FilterConfig);
        state.isDirty = true;
      }),
    addListing: listing =>
      set(state => {
        state.listings.push(listing);
      }),

    addSort: sort =>
      set(state => {
        if (!state.currentListing) return;

        if (!state.currentListing.sortBy) {
          state.currentListing.sortBy = [];
        }

        const sortBy = state.currentListing.sortBy;
        const newSort: SortConfig = {
          columnId: sort?.columnId || state.currentListing.columns[0]?.id || '',
          order: sort?.order || 'asc',
          priority: sort?.priority ?? sortBy.length + 1
        };

        sortBy.push(newSort);
        state.isDirty = true;
      }),

    currentListing: null,

    deleteColumn: columnId =>
      set(state => {
        if (!state.currentListing) return;

        state.currentListing.columns = state.currentListing.columns.filter(c => c.id !== columnId);
        if (state.currentListing.sortBy) {
          state.currentListing.sortBy = state.currentListing.sortBy.filter(s => s.columnId !== columnId);
        }
        if (state.currentListing.filter) {
          state.currentListing.filter = state.currentListing.filter.filter(f => f.columnId !== columnId);
        }
        state.isDirty = true;
      }),

    deleteFilter: index =>
      set(state => {
        if (!state.currentListing?.filter) return;

        state.currentListing.filter.splice(index, 1);
        state.isDirty = true;
      }),

    deleteListing: id =>
      set(state => {
        state.listings = state.listings.filter(l => l.id !== id);
        if (state.currentListing?.id === id) {
          state.currentListing = null;
        }
      }),

    deleteSort: index =>
      set(state => {
        if (!state.currentListing?.sortBy) return;

        const sortBy = state.currentListing.sortBy;
        sortBy.splice(index, 1);

        // Re-prioritize remaining sorts
        sortBy.forEach((s, i) => {
          s.priority = i + 1;
        });
        state.isDirty = true;
      }),

    isDirty: false,

    listings: mockListings,

    loadFromTemplate: template =>
      set(state => {
        state.currentListing = {
          ...JSON.parse(JSON.stringify(template)),
          id: generateId('listing')
        };
        state.isDirty = true;
      }),

    markClean: () =>
      set(state => {
        state.isDirty = false;
      }),

    moveColumn: (columnId, direction) =>
      set(state => {
        if (!state.currentListing) return;

        const columns = state.currentListing.columns;
        const index = columns.findIndex(c => c.id === columnId);
        if (index < 0) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= columns.length) return;

        const temp = columns[index];
        columns[index] = columns[newIndex];
        columns[newIndex] = temp;
        state.isDirty = true;
      }),

    reorderColumns: (fromIndex, toIndex) =>
      set(state => {
        if (!state.currentListing) return;

        const columns = state.currentListing.columns;
        const [removed] = columns.splice(fromIndex, 1);
        columns.splice(toIndex, 0, removed);
        state.isDirty = true;
      }),

    reorderSort: (fromIndex, toIndex) =>
      set(state => {
        if (!state.currentListing?.sortBy) return;

        const sortBy = state.currentListing.sortBy;
        const [removed] = sortBy.splice(fromIndex, 1);
        sortBy.splice(toIndex, 0, removed);

        sortBy.forEach((s, i) => {
          s.priority = i + 1;
        });
        state.isDirty = true;
      }),

    resetToDefault: () =>
      set(state => {
        const original = mockListings.find(l => l.id === state.currentListing?.id);
        state.currentListing = original ? JSON.parse(JSON.stringify(original)) : null;
        state.isDirty = false;
      }),

    saveAsTemplate: (listing, name) =>
      set(state => {
        const newTemplate: ListingShell = {
          ...JSON.parse(JSON.stringify(listing)),
          id: `template_${Date.now()}`,
          listingNumber: name,
          title: name
        };

        state.listings.push(newTemplate);
      }),

    setCurrentListing: listing =>
      set(state => {
        state.currentListing = listing;
        state.isDirty = false;
      }),

    setDirty: dirty =>
      set(state => {
        state.isDirty = dirty;
      }),

    setListings: listings =>
      set(state => {
        state.listings = listings;
      }),

    updateColumn: (columnId, updates) =>
      set(state => {
        if (!state.currentListing) return;

        const col = state.currentListing.columns.find(c => c.id === columnId);
        if (col) {
          Object.assign(col, updates);
          state.isDirty = true;
        }
      }),

    updateColumns: columns =>
      set(state => {
        if (state.currentListing) {
          state.currentListing.columns = columns;
          state.isDirty = true;
        }
      }),

    updateFilter: (index, updates) =>
      set(state => {
        if (!state.currentListing?.filter) return;

        const filter = state.currentListing.filter;
        if (index < 0 || index >= filter.length) return;

        Object.assign(filter[index], updates);
        state.isDirty = true;
      }),

    updateMetadata: updates =>
      set(state => {
        if (state.currentListing) {
          Object.assign(state.currentListing, updates);
          state.isDirty = true;
        }
      }),

    updateSort: (index, updates) =>
      set(state => {
        if (!state.currentListing?.sortBy) return;

        const sortBy = state.currentListing.sortBy;
        if (index < 0 || index >= sortBy.length) return;

        Object.assign(sortBy[index], updates);
        state.isDirty = true;
      }),

    updateSorts: sortBy =>
      set(state => {
        if (state.currentListing) {
          state.currentListing.sortBy = sortBy;
          state.isDirty = true;
        }
      })
  }))
);
