/**
 * Shift Card — displays shift name, time range, and type indicator.
 * Requirements: 27.5
 */

import type { ShiftType } from '@/types/shift';
import { formatTime } from '@/utils/formatters';

interface ShiftCardProps {
  shiftType: ShiftType;
  /** Optional compact mode for calendar cell display */
  compact?: boolean;
}

export function ShiftCard({ shiftType, compact = false }: ShiftCardProps) {
  const name = shiftType?.name ?? 'Unknown Shift';
  const start_time = shiftType?.start_time;
  const end_time = shiftType?.end_time;
  const is_night_shift = shiftType?.is_night_shift ?? false;

  if (compact) {
    return (
      <div
        className={`rounded-md px-2 py-1 text-xs font-medium ${
          is_night_shift
            ? 'bg-secondary-lighter text-secondary-dark'
            : 'bg-success-lighter text-success-dark'
        }`}
        title={`${name}: ${formatTime(start_time)} – ${formatTime(end_time)}`}
      >
        <span className="block truncate">{name}</span>
        <span className="text-[10px] opacity-75">
          {formatTime(start_time)} – {formatTime(end_time)}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-card bg-surface-paper p-4 shadow-card">
      <div className="flex items-center gap-2">
        <div
          className={`h-3 w-3 rounded-full ${
            is_night_shift ? 'bg-secondary-main' : 'bg-success-main'
          }`}
          aria-hidden="true"
        />
        <h4 className="text-sm font-semibold text-ink-primary">{name}</h4>
        {is_night_shift && (
          <span className="ml-auto rounded-full bg-secondary-lighter px-2 py-0.5 text-xs font-medium text-secondary-dark">
            Night
          </span>
        )}
      </div>

      <div className="mt-2 text-sm text-ink-secondary">
        <p>
          {formatTime(start_time)} – {formatTime(end_time)}
        </p>
      </div>
    </div>
  );
}
