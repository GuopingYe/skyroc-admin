/**
 * DecimalDefaultsEditor - Study-wide decimal place defaults
 *
 * Allows users to configure default decimal places for each statistic type at the study level. These defaults are
 * inherited by all table shells unless overridden per-shell via DecimalSettingsTab.
 */
import { Card, InputNumber, Typography } from 'antd';

import { useStudyStore } from '../../stores';
import { DEFAULT_DECIMAL_RULES, type DecimalConfig, STAT_TYPES, type StatTypeKey } from '../../types';

const { Text } = Typography;

export default function DecimalDefaultsEditor() {
  const decimalRules = useStudyStore(s => s.studyDefaults?.decimalRules) ?? DEFAULT_DECIMAL_RULES;
  const updateDecimalRules = useStudyStore(s => s.updateDecimalRules);

  const handleChange = (key: StatTypeKey, value: number | null) => {
    updateDecimalRules({ ...decimalRules, [key]: value ?? 0 });
  };

  return (
    <Card
      size="small"
      title="Decimal Place Defaults"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STAT_TYPES.map(({ key, label }) => (
          <div
            key={key}
            style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}
          >
            <Text>{label}</Text>
            <InputNumber
              max={10}
              min={0}
              size="small"
              style={{ width: 80 }}
              value={decimalRules[key] ?? DEFAULT_DECIMAL_RULES[key]}
              onChange={v => handleChange(key, v)}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
