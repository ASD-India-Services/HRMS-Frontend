/**
 * Shift Card — displays shift name, time range, and type indicator.
 * Requirements: 27.5
 */

import type { ShiftType } from '@/types/shift';

interface ShiftCardProps {
  shiftType: ShiftType;
  /** Optional compact mode for calendar cell display */
  compact?: boolean;
}

/**
 * Format a time string (HH:MM:SS) to a human-readable format (h:mm AM/PM).
 */
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function ShiftCard({ shiftType, compact = false }: ShiftCardProps) {
  const { name, start_time, end_time, is_night_shift } = shiftType;

  if (compact) {
    return (
      <div
        className={`rounded-md px-2 py-1 text-xs font-medium ${
          is_night_shift
            ? 'bg-indigo-50 text-indigo-700'
            : 'bg-emerald-50 text-emerald-700'
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
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div
          className={`h-3 w-3 rounded-full ${
            is_night_shift ? 'bg-indigo-500' : 'bg-emerald-500'
          }`}
          aria-hidden="true"
        />
        <h4 className="text-sm font-semibold text-gray-900">{name}</h4>
        {is_night_shift && (
          <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
            Night
          </span>
        )}
      </div>

      <div className="mt-2 text-sm text-gray-600">
        <p>
          {formatTime(start_time)} – {formatTime(end_time)}
        </p>
      </div>
    </div>
  );
}
