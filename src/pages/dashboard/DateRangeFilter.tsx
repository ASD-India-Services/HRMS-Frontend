/**
 * Date Range Filter
 *
 * Simple date range picker with "from" and "to" date inputs.
 * Defaults to the last 30 days. Emits onChange when dates change.
 *
 * Requirements: 1.6
 */

import { useCallback } from 'react';
import { Input } from '@/components/ui/Input';

export interface DateRange {
  from: string;
  to: string;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function getDefaultDateRange(): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const handleFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...value, from: e.target.value });
    },
    [value, onChange],
  );

  const handleToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...value, to: e.target.value });
    },
    [value, onChange],
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-ink-secondary">
        <span>From</span>
        <Input
          type="date"
          value={value.from}
          onChange={handleFromChange}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-secondary">
        <span>To</span>
        <Input
          type="date"
          value={value.to}
          onChange={handleToChange}
        />
      </label>
    </div>
  );
}
