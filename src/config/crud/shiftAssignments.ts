/**
 * Shift Assignments CRUD Module Configuration
 *
 * Declarative config for the Shift Assignments module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1
 */

import { SHIFTS } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface ShiftAssignment {
  id: string;
  employee: string;
  shift_type: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export const shiftAssignmentColumns: ColumnDef<ShiftAssignment>[] = [
  { key: 'employee', header: 'Employee', sortable: true },
  { key: 'shift_type', header: 'Shift Type', sortable: true },
  { key: 'start_date', header: 'Start Date', sortable: true },
  { key: 'end_date', header: 'End Date', sortable: true },
];

export const shiftAssignmentFilters: FilterConfig[] = [
  { key: 'search', label: 'Search assignments...', type: 'search', debounceMs: 300 },
];

export const shiftAssignmentFormFields: FieldSchema[] = [
  {
    name: 'employee',
    label: 'Employee',
    type: 'select',
    required: true,
    optionsQuery: { queryKey: ['employees', 'options'], endpoint: '/api/v1/employees/' },
  },
  {
    name: 'shift_type',
    label: 'Shift Type',
    type: 'select',
    required: true,
    optionsQuery: { queryKey: ['shift-types', 'options'], endpoint: '/api/v1/shifts/types/' },
  },
  { name: 'start_date', label: 'Start Date', type: 'date', required: true },
  { name: 'end_date', label: 'End Date', type: 'date' },
];

export const shiftAssignmentEndpoints: CrudEndpoints = {
  list: SHIFTS.ASSIGNMENTS,
  create: SHIFTS.ASSIGNMENTS,
  detail: SHIFTS.ASSIGNMENT_DETAIL,
  update: SHIFTS.ASSIGNMENT_DETAIL,
  delete: SHIFTS.ASSIGNMENT_DETAIL,
};

export const shiftAssignmentAccess = {
  list: ['org_admin', 'hr_manager'],
  create: ['org_admin', 'hr_manager'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const shiftAssignmentsCrudConfig = {
  id: 'shift-assignments',
  title: 'Shift Assignments',
  endpoints: shiftAssignmentEndpoints,
  columns: shiftAssignmentColumns,
  filters: shiftAssignmentFilters,
  formFields: shiftAssignmentFormFields,
  access: shiftAssignmentAccess,
  queryKey: 'shift-assignments',
};
