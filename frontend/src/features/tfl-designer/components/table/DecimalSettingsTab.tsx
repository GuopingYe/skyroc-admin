/**
 * DecimalSettingsTab - Per-shell decimal override editor
 *
 * Displays a table showing study-level defaults (read-only) alongside shell-specific overrides (editable). Overrides
 * are stored on the TableShell.decimalOverride field and applied via tableStore.
 */
import { Alert, Card, InputNumber, Typography } from 'antd';

import { useStudyStore, useTableStore } from '../../stores';
import { DEFAULT_DECIMAL_RULES, type DecimalConfig, STAT_TYPES, type StatTypeKey } from '../../types';

const { Text } = Typography;

export default function DecimalSettingsTab() {
  const currentTable = useTableStore(s => s.currentTable);
  const updateDecimalOverride = useTableStore(s => s.updateDecimalOverride);
  const studyDefaults = useStudyStore(s => s.studyDefaults);

  const shellOverrides = currentTable?.decimalOverride ?? {};
  const studyRules = studyDefaults?.decimalRules ?? DEFAULT_DECIMAL_RULES;

  const handleOverrideChange = (key: StatTypeKey, value: number | null) => {
    const updated = { ...shellOverrides, [key]: value ?? 0 };
    updateDecimalOverride(updated);
  };

  if (!currentTable) return null;

  return (
    <div style={{ padding: 8 }}>
      <Alert
        showIcon
        message="Defaults come from study-level config. Override here for this specific shell."
        style={{ fontSize: 11, marginBottom: 8 }}
        type="info"
      />
      <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ padding: '4px 8px', textAlign: 'left' }}>Statistic Type</th>
            <th style={{ padding: '4px 8px', textAlign: 'center' }}>Study Default</th>
            <th style={{ padding: '4px 8px', textAlign: 'center' }}>Shell Override</th>
          </tr>
        </thead>
        <tbody>
          {STAT_TYPES.map(({ key, label }) => (
            <tr key={key}>
              <td style={{ padding: '4px 8px' }}>{label}</td>
              <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                <Text type="secondary">{studyRules[key] ?? 0} decimals</Text>
              </td>
              <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                <InputNumber
                  max={10}
                  min={0}
                  size="small"
                  style={{ width: 70 }}
                  value={shellOverrides[key] ?? studyRules[key] ?? DEFAULT_DECIMAL_RULES[key]}
                  onChange={v => handleOverrideChange(key, v)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
