import { Select } from 'antd'

interface AnalysisOption {
  id: number
  name: string
  specStatus?: string
}

interface Props {
  analyses: AnalysisOption[]
  /** null = study level; number = analysis scope node id */
  selectedAnalysisId: number | null
  onChange: (analysisId: number | null) => void
}

/**
 * Dropdown to switch the Study Spec page view between:
 * - Study level (full edit mode)
 * - A specific analysis (override view)
 */
export function ScopeSwitcher({ analyses, selectedAnalysisId, onChange }: Props) {
  const options = [
    { label: 'Study Level', value: '__study__' },
    ...analyses.map((a) => ({
      label: a.name,
      value: String(a.id),
    })),
  ]

  return (
    <Select
      style={{ minWidth: 220 }}
      value={selectedAnalysisId === null ? '__study__' : String(selectedAnalysisId)}
      options={options}
      onChange={(val) => onChange(val === '__study__' ? null : Number(val))}
      placeholder="Viewing as..."
    />
  )
}
