/**
 * Shift Types CRUD Module Configuration
 *
 * Declarative config for the Shift Types module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1
 */

import { SHIFTS } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface ShiftType {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_night_shift: boolean;
  grace_period_minutes: number;
  created_at: string;
  updated_at: string;
}

export const shiftTypeColumns: ColumnDef<ShiftType>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'start_time', header: 'Start Time', sortable: true },
  { key: 'end_time', header: 'End Time', sortable: true },
  {
    key: 'is_night_shift',
    header: 'Night Shift',
    sortable: true,
    render: (value: unknown) => (value ? 'Yes' : 'No'),
  },
  { key: 'grace_period_minutes', header: 'Grace Period (min)', sortable: true },
];

export const shiftTypeFilters: FilterConfig[] = [
  { key: 'search', label: 'Search shift types...', type: 'search', debounceMs: 300 },
];

export const shiftTypeFormFields: FieldSchema[] = [
  {
    name: 'name',
    label: 'Shift Name',
    type: 'text',
    required: true,
    validation: [{ type: 'required', message: 'Shift name is required' }],
  },
  { name: 'start_time', label: 'Start Time', type: 'text', required: true, placeholder: 'HH:MM' },
  { name: 'end_time', label: 'End Time', type: 'text', required: true, placeholder: 'HH:MM' },
  { name: 'is_night_shift', label: 'Night Shift', type: 'toggle' },
  { name: 'grace_period_minutes', label: 'Grace Period (minutes)', type: 'number', placeholder: '15' },
];

export const shiftTypeEndpoints: CrudEndpoints = {
  list: SHIFTS.TYPES,
  create: SHIFTS.TYPES,
  detail: SHIFTS.TYPE_DETAIL,
  update: SHIFTS.TYPE_DETAIL,
  delete: SHIFTS.TYPE_DETAIL,
};

export const shiftTypeAccess = {
  list: ['org_admin', 'hr_manager'],
  create: ['org_admin', 'hr_manager'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const shiftTypesCrudConfig = {
  id: 'shift-types',
  title: 'Shift Types',
  endpoints: shiftTypeEndpoints,
  columns: shiftTypeColumns,
  filters: shiftTypeFilters,
  formFields: shiftTypeFormFields,
  access: shiftTypeAccess,
  queryKey: 'shift-types',
};
