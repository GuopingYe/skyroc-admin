/**
 * DecimalDefaultsEditor - Study-wide decimal place defaults
 *
 * Allows users to configure default decimal places for each statistic type
 * at the study level. These defaults are inherited by all table shells unless
 * overridden per-shell via DecimalSettingsTab.
 */
import { Card, InputNumber, Typography } from 'antd';
import { useStudyStore } from '../../stores';
import { DEFAULT_DECIMAL_RULES, type DecimalConfig, type StatTypeKey } from '../../types';

const { Text } = Typography;

const STAT_TYPES: { key: StatTypeKey; label: string }[] = [
  { key: 'n', label: 'n (Count)' },
  { key: 'mean', label: 'Mean' },
  { key: 'sd', label: 'SD' },
  { key: 'percent', label: 'Percentage' },
  { key: 'median', label: 'Median' },
  { key: 'min', label: 'Min' },
  { key: 'max', label: 'Max' },
];

export default function DecimalDefaultsEditor() {
  const decimalRules = useStudyStore((s) => s.studyDefaults?.decimalRules) ?? DEFAULT_DECIMAL_RULES;
  const updateDecimalRules = useStudyStore((s) => s.updateDecimalRules);

  const handleChange = (key: StatTypeKey, value: number | null) => {
    updateDecimalRules({ ...decimalRules, [key]: value ?? 0 });
  };

  return (
    <Card title="Decimal Place Defaults" size="small">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STAT_TYPES.map(({ key, label }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text>{label}</Text>
            <InputNumber
              size="small"
              min={0}
              max={10}
              value={decimalRules[key] ?? DEFAULT_DECIMAL_RULES[key]}
              onChange={(v) => handleChange(key, v)}
              style={{ width: 80 }}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
