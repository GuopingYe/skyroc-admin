/**
 * TFL Designer - Column Source Editor (Compact)
 *
 * Simple selector to pick which arm set or study header set drives the table columns. No inline tree editing here —
 * that belongs in Study Settings. The TablePreview on the right renders the selected columns live.
 */
import { Select, Space, Tag } from 'antd';
import { useMemo } from 'react';

import { useStudyStore, useTableStore } from '../../stores';
import type { ColumnHeaderGroup } from '../../types';
import { countLeaves } from '../../utils/treeUtils';

export default function ColumnSourceEditor() {
  const currentTable = useTableStore(s => s.currentTable);
  const updateMetadata = useTableStore(s => s.updateMetadata);
  const treatmentArmSets = useStudyStore(s => s.treatmentArmSets);

  if (!currentTable) return null;

  const sourceOptions = useMemo(() => {
    const opts: Array<{ label: React.ReactNode; value: string }> = [];

    treatmentArmSets.forEach(tas => {
      const headers: ColumnHeaderGroup[] = tas.headers?.length
        ? tas.headers
        : tas.arms.map(a => ({ id: a.id, label: a.name, N: a.N }));
      const cols = countLeaves(headers);
      opts.push({
        label: (
          <Space size={6}>
            <span>{tas.name}</span>
            <Tag
              color="blue"
              style={{ fontSize: 10, lineHeight: '16px' }}
            >
              {cols} cols
            </Tag>
          </Space>
        ),
        value: `armset:${tas.id}`
      });
    });

    return opts;
  }, [treatmentArmSets]);

  const handleChange = (value: string) => {
    if (value.startsWith('armset:')) {
      const armSetId = value.slice(7);
      updateMetadata({ columnHeaderSetId: undefined, headerLayers: [], treatmentArmSetId: armSetId });
    }
  };

  // Compute display value to match current state
  const displayValue = useMemo(() => {
    if (currentTable.treatmentArmSetId) return `armset:${currentTable.treatmentArmSetId}`;
    return undefined;
  }, [currentTable.treatmentArmSetId]);

  return (
    <div className="flex flex-col gap-8px">
      <Select
        className="w-full"
        options={sourceOptions}
        placeholder="Select column source..."
        popupMatchSelectWidth={false}
        size="small"
        value={displayValue}
        onChange={handleChange}
      />
      <span className="text-11px text-gray-400">
        Edit in Study Settings (sidebar &gt; Study Settings &gt; Table Headers)
      </span>
    </div>
  );
}
