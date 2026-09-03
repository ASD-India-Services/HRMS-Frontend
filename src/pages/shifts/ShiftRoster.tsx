/**
 * Shift Roster — manager view showing shift assignments for all team members.
 * Displays a grid of employees × days for the selected week.
 * Requirements: 27.5
 */

import { useState, useMemo } from 'react';
import { useShiftAssignments } from '@/hooks/useShifts';
import { ShiftCard } from './components/ShiftCard';
import type { ShiftAssignment } from '@/types/shift';

/** Get the Monday of the week containing a given date. */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
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

export function ShiftRoster() {
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [department, setDepartment] = useState<string>('');

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekStartStr = toDateString(weekStart);
  const weekEndStr = toDateString(weekDays[6]);

  // Fetch all team assignments for the selected week
  const { data, isLoading, isError, error } = useShiftAssignments({
    from_date: weekStartStr,
    to_date: weekEndStr,
    department: department || undefined,
    page_size: 200,
  });

  // A 403 means the user isn't permitted to view the team roster. The parent
  // page already hides this tab in that case, so just render nothing rather
  // than a scary "failed to load" error during any brief permission refresh.
  const isForbidden =
    (error as { response?: { status?: number } } | null)?.response?.status === 403;

  const assignments = data?.results ?? [];

  // Group assignments by employee
  const employeeMap = useMemo(() => {
    const map = new Map<string, { name: string; assignments: ShiftAssignment[] }>();
    for (const assignment of assignments) {
      const existing = map.get(assignment.employee);
      if (existing) {
        existing.assignments.push(assignment);
      } else {
        map.set(assignment.employee, {
          name: assignment.employee_name || 'Unknown',
          assignments: [assignment],
        });
      }
    }
    return map;
  }, [assignments]);

  const employees = Array.from(employeeMap.entries());

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

  /** Check if an assignment is active on a specific date. */
  function isActiveOnDate(assignment: ShiftAssignment, date: Date): boolean {
    const dateStr = toDateString(date);
    return assignment.start_date <= dateStr && assignment.end_date >= dateStr;
  }

  const today = toDateString(new Date());

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Team Roster</h2>
          <p className="text-sm text-gray-500">
            {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
            {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Filter by department..."
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
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

      {/* Roster Table */}
      <div className="mt-6 overflow-x-auto">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-500 border-t-transparent" />
          </div>
        ) : isForbidden ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            You don&apos;t have permission to view the team roster.
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            Failed to load roster data. Please try again later.
          </div>
        ) : employees.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            No shift assignments found for this period.
          </div>
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-600">
                  Employee
                </th>
                {weekDays.map((date, i) => {
                  const dateStr = toDateString(date);
                  const isToday = dateStr === today;
                  return (
                    <th
                      key={dateStr}
                      className={`border-b px-2 py-3 text-center text-xs font-medium ${
                        isToday
                          ? 'border-primary-300 bg-primary-50 text-primary-700'
                          : 'border-gray-200 bg-gray-50 text-gray-600'
                      }`}
                    >
                      <div>{DAY_LABELS[i]}</div>
                      <div className="text-sm font-semibold">{date.getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {employees.map(([employeeId, { name, assignments: empAssignments }]) => (
                <tr key={employeeId} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="sticky left-0 z-10 whitespace-nowrap border-r border-gray-100 bg-white px-4 py-2 text-sm font-medium text-gray-900">
                    {name}
                  </td>
                  {weekDays.map((date) => {
                    const dateStr = toDateString(date);
                    const dayAssignments = empAssignments.filter((a) =>
                      isActiveOnDate(a, date),
                    );
                    const isToday = dateStr === today;

                    return (
                      <td
                        key={`${employeeId}-${dateStr}`}
                        className={`px-1 py-1.5 text-center ${
                          isToday ? 'bg-primary-50/30' : ''
                        }`}
                      >
                        {dayAssignments.length === 0 ? (
                          <span className="text-xs text-gray-300">—</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {dayAssignments.map((a) => (
                              <ShiftCard
                                key={a.id}
                                shiftType={a.shift_type}
                                compact
                              />
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      {employees.length > 0 && (
        <p className="mt-4 text-xs text-gray-500">
          Showing {employees.length} employee{employees.length !== 1 ? 's' : ''} with shift assignments.
        </p>
      )}
    </div>
  );
}
