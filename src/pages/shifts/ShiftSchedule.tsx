/**
 * Shift Schedule — weekly calendar view showing shift assignments for the current user.
 * Allows navigating between weeks and shows assignments mapped to each day.
 * Requirements: 27.5
 */

import { useState, useMemo } from 'react';
import { useUser } from '@platform/auth-sdk';
import { useShiftAssignments } from '@/hooks/useShifts';
import { ShiftCard } from './components/ShiftCard';
import type { ShiftAssignment } from '@/types/shift';

/** Get the Monday of the week containing a given date. */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust so Monday = 0
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Format a date as YYYY-MM-DD. */
function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Get array of 7 dates starting from the given Monday. */
function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ShiftSchedule() {
  const user = useUser();
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekStartStr = toDateString(weekStart);

  // Fetch assignments for the current user overlapping this week
  const { data, isLoading, isError } = useShiftAssignments({
    employee: user?.id ?? '',
    date: weekStartStr,
    page_size: 50,
  });

  const assignments = data?.results ?? [];

  /** Check if an assignment is active on a specific date. */
  function isActiveOnDate(assignment: ShiftAssignment, date: Date): boolean {
    const dateStr = toDateString(date);
    return assignment.start_date <= dateStr && assignment.end_date >= dateStr;
  }

  /** Get assignments for a particular day. */
  function getAssignmentsForDay(date: Date): ShiftAssignment[] {
    return assignments.filter((a) => isActiveOnDate(a, date));
  }

  function navigateWeek(direction: -1 | 1) {
    setWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + direction * 7);
      return next;
    });
  }

  function goToCurrentWeek() {
    setWeekStart(getWeekStart(new Date()));
  }

  const weekEndStr = toDateString(weekDays[6]);
  const today = toDateString(new Date());

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">My Shift Schedule</h2>
          <p className="text-sm text-gray-500">
            {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
            {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek(-1)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            aria-label="Previous week"
          >
            ← Prev
          </button>
          <button
            onClick={goToCurrentWeek}
            className="rounded-md bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100"
          >
            Today
          </button>
          <button
            onClick={() => navigateWeek(1)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            aria-label="Next week"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Weekly Calendar Grid */}
      <div className="mt-6 overflow-x-auto">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-500 border-t-transparent" />
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            Failed to load shift schedule. Please try again later.
          </div>
        ) : (
          <div className="grid min-w-[640px] grid-cols-7 gap-1">
            {/* Day headers */}
            {weekDays.map((date, i) => {
              const dateStr = toDateString(date);
              const isToday = dateStr === today;
              return (
                <div
                  key={dateStr}
                  className={`rounded-t-lg border-b-2 px-2 py-2 text-center text-xs font-medium ${
                    isToday
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <div>{DAY_LABELS[i]}</div>
                  <div className={`text-lg font-semibold ${isToday ? 'text-primary-700' : 'text-gray-900'}`}>
                    {date.getDate()}
                  </div>
                </div>
              );
            })}

            {/* Shift cells */}
            {weekDays.map((date) => {
              const dateStr = toDateString(date);
              const dayAssignments = getAssignmentsForDay(date);
              const isToday = dateStr === today;

              return (
                <div
                  key={`cell-${dateStr}`}
                  className={`min-h-[100px] rounded-b-lg border p-1.5 ${
                    isToday ? 'border-primary-200 bg-primary-50/30' : 'border-gray-100 bg-white'
                  }`}
                >
                  {dayAssignments.length === 0 ? (
                    <p className="mt-6 text-center text-xs text-gray-400">No shift</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {dayAssignments.map((assignment) => (
                        <ShiftCard
                          key={assignment.id}
                          shiftType={assignment.shift_type}
                          compact
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shift legend */}
      {assignments.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-medium text-gray-700">Active Shifts This Week</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Deduplicate by shift type ID */}
            {Array.from(
              new Map(assignments.map((a) => [a.shift_type.id, a.shift_type])).values(),
            ).map((shiftType) => (
              <ShiftCard key={shiftType.id} shiftType={shiftType} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
