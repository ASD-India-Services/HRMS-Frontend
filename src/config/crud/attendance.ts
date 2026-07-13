/**
 * Attendance CRUD Module Configuration
 *
 * Declarative config for the Attendance module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1
 */

import { ATTENDANCE } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface AttendanceRecord {
  id: string;
  employee: string;
  date: string;
  check_in_time: string;
  check_out_time: string;
  working_hours: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export const attendanceColumns: ColumnDef<AttendanceRecord>[] = [
  { key: 'employee', header: 'Employee', sortable: true },
  { key: 'date', header: 'Date', sortable: true },
  { key: 'check_in_time', header: 'Check In', sortable: true },
  { key: 'check_out_time', header: 'Check Out', sortable: true },
  { key: 'working_hours', header: 'Working Hours', sortable: true },
  { key: 'status', header: 'Status', sortable: true },
];

export const attendanceFilters: FilterConfig[] = [
  { key: 'date', label: 'Date Range', type: 'date-range' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'present', label: 'Present' },
      { value: 'absent', label: 'Absent' },
      { value: 'half_day', label: 'Half Day' },
      { value: 'on_leave', label: 'On Leave' },
    ],
  },
];

export const attendanceFormFields: FieldSchema[] = [
  {
    name: 'employee',
    label: 'Employee',
    type: 'select',
    required: true,
    optionsQuery: { queryKey: ['employees', 'options'], endpoint: '/api/v1/employees/' },
  },
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'check_in_time', label: 'Check In Time', type: 'text', placeholder: 'HH:MM' },
  { name: 'check_out_time', label: 'Check Out Time', type: 'text', placeholder: 'HH:MM' },
];

export const attendanceEndpoints: CrudEndpoints = {
  list: ATTENDANCE.LIST,
  create: ATTENDANCE.LIST,
  detail: ATTENDANCE.DETAIL,
  update: ATTENDANCE.DETAIL,
  delete: ATTENDANCE.DETAIL,
};

export const attendanceAccess = {
  list: ['org_admin', 'hr_manager', 'department_head'],
  create: ['org_admin', 'hr_manager'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const attendanceCrudConfig = {
  id: 'attendance',
  title: 'Attendance',
  endpoints: attendanceEndpoints,
  columns: attendanceColumns,
  filters: attendanceFilters,
  formFields: attendanceFormFields,
  access: attendanceAccess,
  queryKey: 'attendance',
};
