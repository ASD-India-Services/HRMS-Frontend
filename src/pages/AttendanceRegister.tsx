/**
 * Attendance Register Page
 *
 * Shows ALL employees (scoped by role) with their attendance for a selected date.
 * Employees who haven't checked in are shown as "Absent".
 *
 * Permission: attendance.manage (HR Manager / Org Admin only)
 */

import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import type { ColumnDef, FilterConfig } from '@/types/datatable';

const ENDPOINT = '/api/v1/attendance/register/';

const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'attendance-register',
  endpoints: {
    list: ENDPOINT,
    create: ENDPOINT,
    detail: (id) => `${ENDPOINT}${id}/`,
    update: (id) => `${ENDPOINT}${id}/`,
    delete: (id) => `${ENDPOINT}${id}/`,
  },
});

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    present: 'bg-success-lighter text-success-dark',
    absent: 'bg-error-lighter text-error-dark',
    half_day: 'bg-warning-lighter text-warning-dark',
    on_leave: 'bg-primary-lighter text-primary-dark',
    holiday: 'bg-secondary-lighter text-secondary-dark',
  };
  const labels: Record<string, string> = {
    present: 'Present',
    absent: 'Absent',
    half_day: 'Half Day',
    on_leave: 'On Leave',
    holiday: 'Holiday',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || 'bg-surface-neutral text-ink-primary'}`}>
      {labels[status] || status}
    </span>
  );
};

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'employee_name', header: 'Employee', sortable: true },
  { key: 'employee_code', header: 'Code', sortable: true, render: (v: unknown) => (v ? String(v) : '—') },
  { key: 'department', header: 'Department', sortable: true },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (v: unknown) => statusBadge(v as string),
  },
  { key: 'check_in', header: 'Check In', sortable: true, render: (v: unknown) => (v ? String(v).slice(0, 5) : '—') },
  { key: 'check_out', header: 'Check Out', sortable: true, render: (v: unknown) => (v ? String(v).slice(0, 5) : '—') },
  {
    key: 'working_hours',
    header: 'Hours',
    sortable: true,
    render: (v: unknown) => {
      const hrs = Number(v);
      return hrs > 0 ? `${hrs.toFixed(1)}h` : '—';
    },
  },
  { key: 'shift_name', header: 'Shift', sortable: false, render: (v: unknown) => (v ? String(v) : '—') },
  {
    key: 'is_late',
    header: 'Late',
    sortable: true,
    render: (v: unknown) => (v ? <span className="text-error-main font-medium text-xs">Late</span> : ''),
  },
];

const today = new Date().toISOString().split('T')[0];

const filters: FilterConfig[] = [
  { key: 'search', label: 'Search employee...', type: 'search', debounceMs: 300 },
  { key: 'date', label: 'Date', type: 'date' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All Statuses' },
      { value: 'present', label: 'Present' },
      { value: 'absent', label: 'Absent' },
      { value: 'half_day', label: 'Half Day' },
      { value: 'on_leave', label: 'On Leave' },
      { value: 'holiday', label: 'Holiday' },
    ],
  },
];

export default function AttendanceRegister() {
  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } =
    useFilterSync({ filters, defaultValues: { date: today } });

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, page_size: pageSize };
    Object.entries(filterValues).forEach(([k, v]) => {
      if (v) p[k] = v;
    });
    // Always include date (default to today)
    if (!p.date) p.date = today;
    return p;
  }, [filterValues, page, pageSize]);

  const queryResult = crud.useList(params);

  // Summary stats
  const results = queryResult.data?.results as Record<string, unknown>[] | undefined;
  const totalEmployees = queryResult.data?.count ?? 0;
  const presentCount = results?.filter((r) => r.status === 'present').length ?? 0;
  const absentCount = results?.filter((r) => r.status === 'absent').length ?? 0;
  const halfDayCount = results?.filter((r) => r.status === 'half_day').length ?? 0;
  const onLeaveCount = results?.filter((r) => r.status === 'on_leave').length ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-primary">Attendance Register</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Daily attendance record for all employees. Employees without check-in are shown as absent.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-divider bg-surface-paper p-3 shadow-sm">
          <p className="text-xs font-medium text-ink-secondary">Total</p>
          <p className="mt-1 text-xl font-bold text-ink-primary">{totalEmployees}</p>
        </div>
        <div className="rounded-lg border border-success-light bg-success-lighter p-3 shadow-sm">
          <p className="text-xs font-medium text-success-main">Present</p>
          <p className="mt-1 text-xl font-bold text-success-dark">{presentCount}</p>
        </div>
        <div className="rounded-lg border border-error-light bg-error-lighter p-3 shadow-sm">
          <p className="text-xs font-medium text-error-main">Absent</p>
          <p className="mt-1 text-xl font-bold text-error-dark">{absentCount}</p>
        </div>
        <div className="rounded-lg border border-warning-light bg-warning-lighter p-3 shadow-sm">
          <p className="text-xs font-medium text-warning-main">Half Day / Leave</p>
          <p className="mt-1 text-xl font-bold text-warning-dark">{halfDayCount + onLeaveCount}</p>
        </div>
      </div>

      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columns} />
      {queryResult.data && queryResult.data.count > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={queryResult.data.count}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}
