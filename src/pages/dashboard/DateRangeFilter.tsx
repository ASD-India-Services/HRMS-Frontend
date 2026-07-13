/**
 * Date Range Filter
 *
 * Simple date range picker with "from" and "to" date inputs.
 * Defaults to the last 30 days. Emits onChange when dates change.
 *
 * Requirements: 1.6
 */

import { useCallback } from 'react';

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
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <span>From</span>
        <input
          type="date"
          value={value.from}
          onChange={handleFromChange}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <span>To</span>
        <input
          type="date"
          value={value.to}
          onChange={handleToChange}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </label>
    </div>
  );
}
