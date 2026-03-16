import { create } from 'zustand'
import type { Study, TreatmentArmSet, TreatmentArm } from '../types'

interface StudyState {
  studies: Study[]
  currentStudy: Study | null
  treatmentArmSets: TreatmentArmSet[]
  
  // Actions
  addStudy: (study: Study) => void
  updateStudy: (id: string, updates: Partial<Study>) => void
  deleteStudy: (id: string) => void
  setCurrentStudy: (study: Study | null) => void
  
  // Treatment Arm Set
  addTreatmentArmSet: (set: TreatmentArmSet) => void
  updateTreatmentArmSet: (id: string, updates: Partial<TreatmentArmSet>) => void
  deleteTreatmentArmSet: (id: string) => void
  addArmToSet: (setId: string, arm: TreatmentArm) => void
  updateArm: (setId: string, armId: string, updates: Partial<TreatmentArm>) => void
  deleteArm: (setId: string, armId: string) => void
}

// Mock initial data
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
    therapeuticArea: 'Alzheimer\'s Disease',
    createdAt: '2026-02-15',
    updatedAt: '2026-03-10',
  },
]

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
  },
  {
    id: 'tas2',
    name: 'Simple Two-Arm Study',
    arms: [
      { id: 'arm1', name: 'Placebo', order: 1, N: 100 },
      { id: 'arm2', name: 'Treatment', order: 2, N: 102 },
    ],
  },
]

export const useStudyStore = create<StudyState>((set) => ({
  studies: mockStudies,
  currentStudy: null,
  treatmentArmSets: mockTreatmentArmSets,
  
  addStudy: (study) => set((state) => ({
    studies: [...state.studies, study]
  })),
  
  updateStudy: (id, updates) => set((state) => ({
    studies: state.studies.map((s) => 
      s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : s
    )
  })),
  
  deleteStudy: (id) => set((state) => ({
    studies: state.studies.filter((s) => s.id !== id)
  })),
  
  setCurrentStudy: (study) => set({ currentStudy: study }),
  
  addTreatmentArmSet: (tas) => set((state) => ({
    treatmentArmSets: [...state.treatmentArmSets, tas]
  })),
  
  updateTreatmentArmSet: (id, updates) => set((state) => ({
    treatmentArmSets: state.treatmentArmSets.map((tas) =>
      tas.id === id ? { ...tas, ...updates } : tas
    )
  })),
  
  deleteTreatmentArmSet: (id) => set((state) => ({
    treatmentArmSets: state.treatmentArmSets.filter((tas) => tas.id !== id)
  })),
  
  addArmToSet: (setId, arm) => set((state) => ({
    treatmentArmSets: state.treatmentArmSets.map((tas) =>
      tas.id === setId ? { ...tas, arms: [...tas.arms, arm] } : tas
    )
  })),
  
  updateArm: (setId, armId, updates) => set((state) => ({
    treatmentArmSets: state.treatmentArmSets.map((tas) =>
      tas.id === setId
        ? {
            ...tas,
            arms: tas.arms.map((arm) =>
              arm.id === armId ? { ...arm, ...updates } : arm
            ),
          }
        : tas
    )
  })),
  
  deleteArm: (setId, armId) => set((state) => ({
    treatmentArmSets: state.treatmentArmSets.map((tas) =>
      tas.id === setId
        ? { ...tas, arms: tas.arms.filter((arm) => arm.id !== armId) }
        : tas
    )
  })),
}))