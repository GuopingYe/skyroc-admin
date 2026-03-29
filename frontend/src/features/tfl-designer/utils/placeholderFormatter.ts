import type { DecimalConfig, StatTypeKey, RowStats } from '../types';

/**
 * Resolve decimal places for a stat type using the 3-level chain:
 * 1. Row-level override (highest priority)
 * 2. Shell-level defaults
 * 3. Study-level defaults (fallback)
 */
export function resolveDecimals(
  statType: StatTypeKey,
  rowDecimals: number | undefined,
  shellDefaults: DecimalConfig | undefined,
  studyDefaults: DecimalConfig | undefined,
  globalDefaults: DecimalConfig,
): number {
  if (rowDecimals !== undefined) return rowDecimals;
  if (shellDefaults?.[statType] !== undefined) return shellDefaults[statType]!;
  if (studyDefaults?.[statType] !== undefined) return studyDefaults[statType]!;
  return globalDefaults[statType] ?? 2;
}

/**
 * Build a decimal config map from row stats + shell + study defaults.
 */
export function buildDecimalsMap(
  stats: RowStats[],
  shellDefaults: DecimalConfig | undefined,
  studyDefaults: DecimalConfig | undefined,
  globalDefaults: DecimalConfig,
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of stats) {
    // For combined stats like n_percent, use 'percent' key
    const lookupKey: StatTypeKey = s.type === 'n_percent' ? 'percent' : (s.type as StatTypeKey);
    map[lookupKey] = resolveDecimals(lookupKey, s.decimals, shellDefaults, studyDefaults, globalDefaults);
  }
  return map;
}

/**
 * Generate placeholder string from stat types and resolved decimals.
 * Returns null for header rows (no data cells).
 */
export function formatPlaceholder(
  statTypes: string[],
  decimalsMap: Record<string, number>,
): string | null {
  if (statTypes.length === 0) return null;
  if (statTypes.includes('header')) return null;

  // n -> "XX"
  if (statTypes.length === 1 && statTypes[0] === 'n') return 'XX';

  // n_percent -> "XX (XX.XX)"
  if (statTypes.length === 1 && statTypes[0] === 'n_percent') {
    const pct = decimalsMap.percent ?? 2;
    return `XX (XX.${'X'.repeat(pct)})`;
  }

  // mean + sd -> "XX.XX (XX.XXX)"
  if (statTypes.includes('mean') && statTypes.includes('sd')) {
    const meanD = decimalsMap.mean ?? 2;
    const sdD = decimalsMap.sd ?? 3;
    return `XX.${'X'.repeat(meanD)} (XX.${'X'.repeat(sdD)})`;
  }

  // mean alone -> "XX.XX"
  if (statTypes.includes('mean')) {
    const d = decimalsMap.mean ?? 2;
    return `XX.${'X'.repeat(d)}`;
  }

  // median -> "XX.XX"
  if (statTypes.includes('median')) {
    const d = decimalsMap.median ?? 2;
    return `XX.${'X'.repeat(d)}`;
  }

  // min + max -> "XX.XX, XX.XX"
  if (statTypes.includes('min') && statTypes.includes('max')) {
    const d = decimalsMap.min ?? 1;
    return `XX.${'X'.repeat(d)}, XX.${'X'.repeat(d)}`;
  }

  // range -> "XX.XX"
  if (statTypes.includes('range')) {
    const d = decimalsMap.range ?? 1;
    return `XX.${'X'.repeat(d)}`;
  }

  // fallback
  return 'XX.XX';
}
