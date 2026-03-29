/**
 * DecimalSettingsTab - Per-shell decimal override editor
 *
 * Displays a table showing study-level defaults (read-only) alongside
 * shell-specific overrides (editable). Overrides are stored on the
 * TableShell.decimalOverride field and applied via tableStore.
 */
import { Card, InputNumber, Typography, Alert } from 'antd';
import { useStudyStore } from '../../stores';
import { useTableStore } from '../../stores';
import { DEFAULT_DECIMAL_RULES, STAT_TYPES, type DecimalConfig, type StatTypeKey } from '../../types';

const { Text } = Typography;

export default function DecimalSettingsTab() {
  const currentTable = useTableStore((s) => s.currentTable);
  const updateDecimalOverride = useTableStore((s) => s.updateDecimalOverride);
  const studyDefaults = useStudyStore((s) => s.studyDefaults);

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
        message="Defaults come from study-level config. Override here for this specific shell."
        type="info"
        showIcon
        style={{ marginBottom: 8, fontSize: 11 }}
      />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
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
                  size="small"
                  min={0}
                  max={10}
                  value={shellOverrides[key] ?? studyRules[key] ?? DEFAULT_DECIMAL_RULES[key]}
                  onChange={(v) => handleOverrideChange(key, v)}
                  style={{ width: 70 }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
