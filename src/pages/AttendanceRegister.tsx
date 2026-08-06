/**
 * Attendance Register Page
 *
 * HR/Admin-only view showing all employee attendance records in a table.
 * Supports filtering by date range, employee name search, and status.
 *
 * Permission: attendance.manage (HR Manager / Org Admin only)
 */

import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import type { ColumnDef, FilterConfig } from '@/types/datatable';

const ENDPOINT = '/api/v1/attendance/';

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
    present: 'bg-green-100 text-green-800',
    absent: 'bg-red-100 text-red-800',
    half_day: 'bg-yellow-100 text-yellow-800',
    on_leave: 'bg-blue-100 text-blue-800',
    holiday: 'bg-purple-100 text-purple-800',
  };
  const labels: Record<string, string> = {
    present: 'Present',
    absent: 'Absent',
    half_day: 'Half Day',
    on_leave: 'On Leave',
    holiday: 'Holiday',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {labels[status] || status}
    </span>
  );
};

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'employee_name', header: 'Employee', sortable: true },
  { key: 'attendance_date', header: 'Date', sortable: true },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (v: unknown) => statusBadge(v as string),
  },
  { key: 'check_in', header: 'Check In', sortable: true, render: (v: unknown) => (v ? String(v) : '—') },
  { key: 'check_out', header: 'Check Out', sortable: true, render: (v: unknown) => (v ? String(v) : '—') },
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
    render: (v: unknown) => (v ? <span className="text-red-600 font-medium text-xs">Late</span> : '—'),
  },
];

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
    useFilterSync({ filters });

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, page_size: pageSize };
    Object.entries(filterValues).forEach(([k, v]) => {
      if (v) p[k] = v;
    });
    return p;
  }, [filterValues, page, pageSize]);

  const queryResult = crud.useList(params);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Register</h1>
        <p className="mt-1 text-sm text-gray-600">
          Browse all employee attendance records. Filter by date, status, or search by name.
        </p>
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
