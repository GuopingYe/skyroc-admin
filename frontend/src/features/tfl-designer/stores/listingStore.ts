/**
 * TFL Designer - Listing Store (Zustand + Immer)
 *
 * Manages listing shells with columns, sort, and filter configurations.
 * Includes mock data for preview. Follows the POC store pattern with immer middleware.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ListingShell, ListingColumn, SortConfig, FilterConfig } from '../types';
import { generateId } from '../types';

// ==================== Extended Filter ====================

export interface ExtendedFilterConfig extends Omit<FilterConfig, 'operator'> {
  operator:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'lt'
    | 'ge'
    | 'le'
    | 'contains'
    | 'in'
    | 'is_null'
    | 'not_null';
}

// ==================== State Interface ====================

interface ListingState {
  listings: ListingShell[];
  currentListing: ListingShell | null;
  isDirty: boolean;

  // Selection & metadata
  setCurrentListing: (listing: ListingShell | null) => void;

  // Batch update from server
  setListings: (listings: ListingShell[]) => void;
  setDirty: (dirty: boolean) => void;

  // Add new listing (proper Zustand/Immer way)
  addListing: (listing: ListingShell) => void;

  // Delete listing
  deleteListing: (id: string) => void;

  updateMetadata: (updates: Partial<ListingShell>) => void;

  // Column operations
  updateColumns: (columns: ListingColumn[]) => void;
  addColumn: (column?: Partial<ListingColumn>) => void;
  updateColumn: (columnId: string, updates: Partial<ListingColumn>) => void;
  deleteColumn: (columnId: string) => void;
  moveColumn: (columnId: string, direction: 'up' | 'down') => void;
  reorderColumns: (fromIndex: number, toIndex: number) => void;

  // Sort operations
  updateSorts: (sorts: SortConfig[]) => void;
  addSort: (sort?: Partial<SortConfig>) => void;
  updateSort: (index: number, updates: Partial<SortConfig>) => void;
  deleteSort: (index: number) => void;
  reorderSort: (fromIndex: number, toIndex: number) => void;

  // Filter operations
  addFilter: (filter?: Partial<ExtendedFilterConfig>) => void;
  updateFilter: (index: number, updates: Partial<ExtendedFilterConfig>) => void;
  deleteFilter: (index: number) => void;

  // State management
  markClean: () => void;
  resetToDefault: () => void;

  // Template operations
  loadFromTemplate: (template: ListingShell) => void;
  saveAsTemplate: (listing: ListingShell, name: string) => void;
}

// ==================== Filter Operator Options ====================

export const filterOperatorOptions = [
  { value: 'eq', label: 'equals (=)' },
  { value: 'ne', label: 'not equals (!=)' },
  { value: 'gt', label: 'greater than (>)' },
  { value: 'lt', label: 'less than (<)' },
  { value: 'ge', label: 'greater or equal (>=)' },
  { value: 'le', label: 'less or equal (<=)' },
  { value: 'contains', label: 'contains' },
  { value: 'in', label: 'in list' },
  { value: 'is_null', label: 'is null/empty' },
  { value: 'not_null', label: 'is not null/empty' },
];

// ==================== Mock Listings ====================

const mockListings: ListingShell[] = [
  {
    id: 'l1',
    listingNumber: 'Listing 16.1.1',
    title: 'Adverse Events Listing',
    population: 'Safety',
    dataset: 'ADAE',
    columns: [
      { id: 'c1', name: 'SUBJID', label: 'Subject ID', width: 100, align: 'left' },
      { id: 'c2', name: 'AETERM', label: 'Adverse Event', width: 200, align: 'left' },
      { id: 'c3', name: 'AEDECOD', label: 'Preferred Term', width: 150, align: 'left' },
      { id: 'c4', name: 'AEBODSYS', label: 'System Organ Class', width: 180, align: 'left' },
      { id: 'c5', name: 'AESTDTC', label: 'Start Date', width: 100, align: 'center' },
      { id: 'c6', name: 'AEENDTC', label: 'End Date', width: 100, align: 'center' },
      { id: 'c7', name: 'AESEV', label: 'Severity', width: 80, align: 'center' },
      { id: 'c8', name: 'AEREL', label: 'Relationship', width: 100, align: 'center' },
    ],
    sortBy: [
      { columnId: 'c1', order: 'asc', priority: 1 },
      { columnId: 'c5', order: 'asc', priority: 2 },
    ],
    filter: [],
    pageSize: 20,
    columnHeaderSetId: 'chs4',
  },
  {
    id: 'l2',
    listingNumber: 'Listing 16.2.1',
    title: 'Laboratory Results Listing',
    population: 'Safety',
    dataset: 'ADLB',
    columns: [
      { id: 'c1', name: 'SUBJID', label: 'Subject ID', width: 100, align: 'left' },
      { id: 'c2', name: 'VISIT', label: 'Visit', width: 120, align: 'left' },
      { id: 'c3', name: 'LBTEST', label: 'Lab Test', width: 150, align: 'left' },
      { id: 'c4', name: 'LBSTRESN', label: 'Result', width: 80, align: 'right' },
      { id: 'c5', name: 'LBSTRESU', label: 'Unit', width: 60, align: 'center' },
      { id: 'c6', name: 'LBNRIND', label: 'Reference Range', width: 100, align: 'center' },
    ],
    sortBy: [
      { columnId: 'c1', order: 'asc', priority: 1 },
      { columnId: 'c2', order: 'asc', priority: 2 },
    ],
    filter: [],
    pageSize: 30,
    columnHeaderSetId: 'chs5',
  },
];

// ==================== Mock Preview Data ====================

export const mockPreviewData: Record<string, unknown[]> = {
  ADAE: [
    { SUBJID: '001-001', AETERM: 'Headache', AEDECOD: 'Headache', AEBODSYS: 'Nervous system disorders', AESTDTC: '2026-01-15', AEENDTC: '2026-01-17', AESEV: 'Mild', AEREL: 'Related' },
    { SUBJID: '001-001', AETERM: 'Nausea', AEDECOD: 'Nausea', AEBODSYS: 'Gastrointestinal disorders', AESTDTC: '2026-01-16', AEENDTC: '', AESEV: 'Moderate', AEREL: 'Not Related' },
    { SUBJID: '001-002', AETERM: 'Dizziness', AEDECOD: 'Dizziness', AEBODSYS: 'Nervous system disorders', AESTDTC: '2026-01-18', AEENDTC: '2026-01-19', AESEV: 'Mild', AEREL: 'Related' },
    { SUBJID: '001-003', AETERM: 'Fatigue', AEDECOD: 'Fatigue', AEBODSYS: 'General disorders', AESTDTC: '2026-01-20', AEENDTC: '2026-01-22', AESEV: 'Moderate', AEREL: 'Related' },
    { SUBJID: '001-003', AETERM: 'Vomiting', AEDECOD: 'Vomiting', AEBODSYS: 'Gastrointestinal disorders', AESTDTC: '2026-01-21', AEENDTC: '', AESEV: 'Severe', AEREL: 'Related' },
    { SUBJID: '002-001', AETERM: 'Rash', AEDECOD: 'Rash', AEBODSYS: 'Skin disorders', AESTDTC: '2026-01-25', AEENDTC: '2026-01-28', AESEV: 'Mild', AEREL: 'Not Related' },
    { SUBJID: '002-002', AETERM: 'Insomnia', AEDECOD: 'Insomnia', AEBODSYS: 'Nervous system disorders', AESTDTC: '2026-01-22', AEENDTC: '', AESEV: 'Mild', AEREL: 'Related' },
    { SUBJID: '002-003', AETERM: 'Cough', AEDECOD: 'Cough', AEBODSYS: 'Respiratory disorders', AESTDTC: '2026-01-23', AEENDTC: '2026-01-25', AESEV: 'Mild', AEREL: 'Not Related' },
    { SUBJID: '003-001', AETERM: 'Diarrhea', AEDECOD: 'Diarrhea', AEBODSYS: 'Gastrointestinal disorders', AESTDTC: '2026-01-26', AEENDTC: '2026-01-27', AESEV: 'Moderate', AEREL: 'Related' },
    { SUBJID: '003-002', AETERM: 'Arthralgia', AEDECOD: 'Arthralgia', AEBODSYS: 'Musculoskeletal disorders', AESTDTC: '2026-01-28', AEENDTC: '', AESEV: 'Mild', AEREL: 'Not Related' },
  ],
  ADLB: [
    { SUBJID: '001-001', VISIT: 'Baseline', LBTEST: 'Hemoglobin', LBSTRESN: 14.2, LBSTRESU: 'g/dL', LBNRIND: 'Normal' },
    { SUBJID: '001-001', VISIT: 'Week 4', LBTEST: 'Hemoglobin', LBSTRESN: 13.8, LBSTRESU: 'g/dL', LBNRIND: 'Normal' },
    { SUBJID: '001-001', VISIT: 'Baseline', LBTEST: 'WBC', LBSTRESN: 7.5, LBSTRESU: '10^9/L', LBNRIND: 'Normal' },
    { SUBJID: '001-001', VISIT: 'Week 4', LBTEST: 'WBC', LBSTRESN: 6.8, LBSTRESU: '10^9/L', LBNRIND: 'Normal' },
    { SUBJID: '001-002', VISIT: 'Baseline', LBTEST: 'Hemoglobin', LBSTRESN: 12.5, LBSTRESU: 'g/dL', LBNRIND: 'Low' },
    { SUBJID: '001-002', VISIT: 'Week 4', LBTEST: 'Hemoglobin', LBSTRESN: 11.8, LBSTRESU: 'g/dL', LBNRIND: 'Low' },
    { SUBJID: '002-001', VISIT: 'Baseline', LBTEST: 'ALT', LBSTRESN: 25, LBSTRESU: 'U/L', LBNRIND: 'Normal' },
    { SUBJID: '002-001', VISIT: 'Week 4', LBTEST: 'ALT', LBSTRESN: 42, LBSTRESU: 'U/L', LBNRIND: 'High' },
  ],
  ADSL: [
    { SUBJID: '001-001', AGE: 45, SEX: 'M', RACE: 'White', ETHNIC: 'Not Hispanic', TRT01P: 'Drug 10mg', TRTSDTC: '2026-01-01' },
    { SUBJID: '001-002', AGE: 52, SEX: 'F', RACE: 'White', ETHNIC: 'Not Hispanic', TRT01P: 'Placebo', TRTSDTC: '2026-01-01' },
    { SUBJID: '001-003', AGE: 38, SEX: 'M', RACE: 'Asian', ETHNIC: 'Not Hispanic', TRT01P: 'Drug 20mg', TRTSDTC: '2026-01-01' },
    { SUBJID: '002-001', AGE: 61, SEX: 'F', RACE: 'Black', ETHNIC: 'Hispanic', TRT01P: 'Drug 10mg', TRTSDTC: '2026-01-02' },
    { SUBJID: '002-002', AGE: 44, SEX: 'M', RACE: 'White', ETHNIC: 'Not Hispanic', TRT01P: 'Placebo', TRTSDTC: '2026-01-02' },
  ],
  ADVS: [
    { SUBJID: '001-001', VISIT: 'Baseline', VSTEST: 'Systolic BP', VSSTRESN: 128, VSSTRESU: 'mmHg' },
    { SUBJID: '001-001', VISIT: 'Week 4', VSTEST: 'Systolic BP', VSSTRESN: 124, VSSTRESU: 'mmHg' },
    { SUBJID: '001-001', VISIT: 'Baseline', VSTEST: 'Diastolic BP', VSSTRESN: 82, VSSTRESU: 'mmHg' },
    { SUBJID: '001-001', VISIT: 'Week 4', VSTEST: 'Diastolic BP', VSSTRESN: 78, VSSTRESU: 'mmHg' },
    { SUBJID: '001-002', VISIT: 'Baseline', VSTEST: 'Heart Rate', VSSTRESN: 72, VSSTRESU: 'bpm' },
    { SUBJID: '001-002', VISIT: 'Week 4', VSTEST: 'Heart Rate', VSSTRESN: 68, VSSTRESU: 'bpm' },
  ],
  ADCM: [
    { SUBJID: '001-001', CMTRT: 'Aspirin', CMINDC: 'Pain', CMSTDTC: '2025-12-01', CMENDTC: '', CMPRFLX: 'Concomitant' },
    { SUBJID: '001-001', CMTRT: 'Vitamin D', CMINDC: 'Supplement', CMSTDTC: '2025-11-15', CMENDTC: '', CMPRFLX: 'Concomitant' },
    { SUBJID: '001-002', CMTRT: 'Metformin', CMINDC: 'Diabetes', CMSTDTC: '2024-06-01', CMENDTC: '', CMPRFLX: 'Concomitant' },
  ],
  ADEX: [
    { SUBJID: '001-001', EXTRT: 'Study Drug', EXDOSE: 10, EXDOSU: 'mg', EXSTDTC: '2026-01-01', EXENDTC: '2026-01-28' },
    { SUBJID: '001-002', EXTRT: 'Placebo', EXDOSE: 0, EXDOSU: 'mg', EXSTDTC: '2026-01-01', EXENDTC: '2026-01-28' },
    { SUBJID: '001-003', EXTRT: 'Study Drug', EXDOSE: 20, EXDOSU: 'mg', EXSTDTC: '2026-01-01', EXENDTC: '2026-01-28' },
  ],
};

// ==================== Store ====================

export const useListingStore = create<ListingState>()(
  immer((set) => ({
    listings: mockListings,
    currentListing: null,
    isDirty: false,

    setCurrentListing: (listing) =>
      set((state) => {
        state.currentListing = listing;
        state.isDirty = false;
      }),

    setListings: (listings) =>
      set((state) => {
        state.listings = listings;
      }),

    setDirty: (dirty) =>
      set((state) => {
        state.isDirty = dirty;
      }),

    addListing: (listing) =>
      set((state) => {
        state.listings.push(listing);
      }),

    deleteListing: (id) =>
      set((state) => {
        state.listings = state.listings.filter((l) => l.id !== id);
        if (state.currentListing?.id === id) {
          state.currentListing = null;
        }
      }),

    updateMetadata: (updates) =>
      set((state) => {
        if (state.currentListing) {
          Object.assign(state.currentListing, updates);
          state.isDirty = true;
        }
      }),

    updateColumns: (columns) =>
      set((state) => {
        if (state.currentListing) {
          state.currentListing.columns = columns;
          state.isDirty = true;
        }
      }),

    addColumn: (column) =>
      set((state) => {
        if (!state.currentListing) return;

        const newColumn: ListingColumn = {
          id: generateId('col'),
          name: column?.name || 'NEWVAR',
          label: column?.label || 'New Column',
          width: column?.width || 100,
          align: column?.align || 'left',
          hidden: column?.hidden,
          format: column?.format,
        };

        state.currentListing.columns.push(newColumn);
        state.isDirty = true;
      }),

    updateColumn: (columnId, updates) =>
      set((state) => {
        if (!state.currentListing) return;

        const col = state.currentListing.columns.find((c) => c.id === columnId);
        if (col) {
          Object.assign(col, updates);
          state.isDirty = true;
        }
      }),

    deleteColumn: (columnId) =>
      set((state) => {
        if (!state.currentListing) return;

        state.currentListing.columns = state.currentListing.columns.filter((c) => c.id !== columnId);
        if (state.currentListing.sortBy) {
          state.currentListing.sortBy = state.currentListing.sortBy.filter((s) => s.columnId !== columnId);
        }
        if (state.currentListing.filter) {
          state.currentListing.filter = state.currentListing.filter.filter((f) => f.columnId !== columnId);
        }
        state.isDirty = true;
      }),

    moveColumn: (columnId, direction) =>
      set((state) => {
        if (!state.currentListing) return;

        const columns = state.currentListing.columns;
        const index = columns.findIndex((c) => c.id === columnId);
        if (index < 0) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= columns.length) return;

        const temp = columns[index];
        columns[index] = columns[newIndex];
        columns[newIndex] = temp;
        state.isDirty = true;
      }),

    reorderColumns: (fromIndex, toIndex) =>
      set((state) => {
        if (!state.currentListing) return;

        const columns = state.currentListing.columns;
        const [removed] = columns.splice(fromIndex, 1);
        columns.splice(toIndex, 0, removed);
        state.isDirty = true;
      }),

    updateSorts: (sortBy) =>
      set((state) => {
        if (state.currentListing) {
          state.currentListing.sortBy = sortBy;
          state.isDirty = true;
        }
      }),

    addSort: (sort) =>
      set((state) => {
        if (!state.currentListing) return;

        if (!state.currentListing.sortBy) {
          state.currentListing.sortBy = [];
        }

        const sortBy = state.currentListing.sortBy;
        const newSort: SortConfig = {
          columnId: sort?.columnId || state.currentListing.columns[0]?.id || '',
          order: sort?.order || 'asc',
          priority: sort?.priority ?? sortBy.length + 1,
        };

        sortBy.push(newSort);
        state.isDirty = true;
      }),

    updateSort: (index, updates) =>
      set((state) => {
        if (!state.currentListing?.sortBy) return;

        const sortBy = state.currentListing.sortBy;
        if (index < 0 || index >= sortBy.length) return;

        Object.assign(sortBy[index], updates);
        state.isDirty = true;
      }),

    deleteSort: (index) =>
      set((state) => {
        if (!state.currentListing?.sortBy) return;

        const sortBy = state.currentListing.sortBy;
        sortBy.splice(index, 1);

        // Re-prioritize remaining sorts
        sortBy.forEach((s, i) => {
          s.priority = i + 1;
        });
        state.isDirty = true;
      }),

    reorderSort: (fromIndex, toIndex) =>
      set((state) => {
        if (!state.currentListing?.sortBy) return;

        const sortBy = state.currentListing.sortBy;
        const [removed] = sortBy.splice(fromIndex, 1);
        sortBy.splice(toIndex, 0, removed);

        sortBy.forEach((s, i) => {
          s.priority = i + 1;
        });
        state.isDirty = true;
      }),

    addFilter: (filter) =>
      set((state) => {
        if (!state.currentListing) return;

        if (!state.currentListing.filter) {
          state.currentListing.filter = [];
        }

        const newFilter: ExtendedFilterConfig = {
          columnId: filter?.columnId || state.currentListing.columns[0]?.id || '',
          operator: filter?.operator || 'eq',
          value: filter?.value || '',
        };

        state.currentListing.filter.push(newFilter as FilterConfig);
        state.isDirty = true;
      }),

    updateFilter: (index, updates) =>
      set((state) => {
        if (!state.currentListing?.filter) return;

        const filter = state.currentListing.filter;
        if (index < 0 || index >= filter.length) return;

        Object.assign(filter[index], updates);
        state.isDirty = true;
      }),

    deleteFilter: (index) =>
      set((state) => {
        if (!state.currentListing?.filter) return;

        state.currentListing.filter.splice(index, 1);
        state.isDirty = true;
      }),

    markClean: () =>
      set((state) => {
        state.isDirty = false;
      }),

    resetToDefault: () =>
      set((state) => {
        const original = mockListings.find((l) => l.id === state.currentListing?.id);
        state.currentListing = original ? JSON.parse(JSON.stringify(original)) : null;
        state.isDirty = false;
      }),

    loadFromTemplate: (template) =>
      set((state) => {
        state.currentListing = {
          ...JSON.parse(JSON.stringify(template)),
          id: generateId('listing'),
        };
        state.isDirty = true;
      }),

    saveAsTemplate: (listing, name) =>
      set((state) => {
        const newTemplate: ListingShell = {
          ...JSON.parse(JSON.stringify(listing)),
          id: `template_${Date.now()}`,
          listingNumber: name,
          title: name,
        };

        state.listings.push(newTemplate);
      }),
  }))
);
