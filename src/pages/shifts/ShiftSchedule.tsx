/**
 * Shift Schedule — weekly calendar view showing the current user's shift assignments.
 * Allows navigating between weeks and shows assignments mapped to each day.
 * Requirements: 27.5
 */

import { useState, useMemo } from 'react';
import { useShiftAssignments } from '@/hooks/useShifts';
import { ShiftCard } from './components/ShiftCard';
import type { ShiftAssignment } from '@/types/shift';
import { Card } from '@/components/ui/Card';
import { WeekNavigator } from './components/WeekNavigator';
import { formatDate } from '@/utils/formatters';

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
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekStartStr = toDateString(weekStart);
  const weekEndStr = toDateString(weekDays[6]);

  // Fetch assignments for the current user overlapping this week
  const { data, isLoading, isError, error } = useShiftAssignments({
    mine: 'true',
    from_date: weekStartStr,
    to_date: weekEndStr,
    page_size: 50,
  });

  // A 403 means the user isn't permitted to view their own schedule. The parent
  // page already hides this tab in that case, so render a quiet message rather
  // than a scary "failed to load" error during any brief permission refresh.
  const isForbidden =
    (error as { response?: { status?: number } } | null)?.response?.status === 403;

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

  const today = toDateString(new Date());

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-primary">My Shift Schedule</h2>
          <p className="text-sm text-ink-secondary">
            {formatDate(weekStart)} – {formatDate(weekDays[6])}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <WeekNavigator
            onPrevious={() => navigateWeek(-1)}
            onToday={goToCurrentWeek}
            onNext={() => navigateWeek(1)}
          />
        </div>
      </div>

      {/* Weekly Calendar Grid */}
      <div className="mt-6 overflow-x-auto">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-main border-t-transparent" />
          </div>
        ) : isForbidden ? (
          <Card className="p-8 text-center text-sm text-ink-secondary">
            You don&apos;t have permission to view your shift schedule.
          </Card>
        ) : isError ? (
          <div className="rounded-card bg-error-lighter p-4 text-center text-sm text-error-dark">
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
                      ? 'border-primary-main bg-primary-lighter text-primary-dark'
                      : 'border-divider text-ink-secondary'
                  }`}
                >
                  <div>{DAY_LABELS[i]}</div>
                  <div className={`text-lg font-semibold ${isToday ? 'text-primary-dark' : 'text-ink-primary'}`}>
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
                  className={`min-h-[100px] rounded-b-lg p-1.5 ${
                    isToday ? 'bg-primary-lighter/30' : 'bg-surface-neutral'
                  }`}
                >
                  {dayAssignments.length === 0 ? (
                    <p className="mt-6 text-center text-xs text-ink-disabled">No shift</p>
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
        <Card className="mt-6 p-6">
          <h3 className="text-lg font-semibold text-ink-primary">Active Shifts This Week</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Deduplicate by shift type ID */}
            {Array.from(
              new Map(assignments.map((a) => [a.shift_type.id, a.shift_type])).values(),
            ).map((shiftType) => (
              <ShiftCard key={shiftType.id} shiftType={shiftType} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
