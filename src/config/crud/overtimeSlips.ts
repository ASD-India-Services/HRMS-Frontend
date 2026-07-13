/**
 * Overtime Slips CRUD Module Configuration
 *
 * Declarative config for the Overtime Slips module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1
 */

import { OVERTIME } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface OvertimeSlip {
  id: string;
  employee: string;
  date: string;
  hours: number;
  reason: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const overtimeSlipColumns: ColumnDef<OvertimeSlip>[] = [
  { key: 'employee', header: 'Employee', sortable: true },
  { key: 'date', header: 'Date', sortable: true },
  { key: 'hours', header: 'Hours', sortable: true },
  { key: 'reason', header: 'Reason', sortable: false },
  { key: 'status', header: 'Status', sortable: true },
];

export const overtimeSlipFilters: FilterConfig[] = [
  { key: 'search', label: 'Search slips...', type: 'search', debounceMs: 300 },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'draft', label: 'Draft' },
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
    ],
  },
];

export const overtimeSlipFormFields: FieldSchema[] = [
  {
    name: 'employee',
    label: 'Employee',
    type: 'select',
    required: true,
    optionsQuery: { queryKey: ['employees', 'options'], endpoint: '/api/v1/employees/' },
  },
  { name: 'date', label: 'Date', type: 'date', required: true },
  {
    name: 'hours',
    label: 'Hours',
    type: 'number',
    required: true,
    validation: [{ type: 'min', value: 0.5, message: 'Minimum 0.5 hours' }],
  },
  { name: 'reason', label: 'Reason', type: 'textarea', required: true },
];

export const overtimeSlipEndpoints: CrudEndpoints = {
  list: OVERTIME.SLIPS,
  create: OVERTIME.SLIPS,
  detail: OVERTIME.SLIP_DETAIL,
  update: OVERTIME.SLIP_DETAIL,
  delete: OVERTIME.SLIP_DETAIL,
};

export const overtimeSlipAccess = {
  list: ['org_admin', 'hr_manager', 'department_head'],
  create: ['org_admin', 'hr_manager', 'employee'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const overtimeSlipsCrudConfig = {
  id: 'overtime-slips',
  title: 'Overtime Slips',
  endpoints: overtimeSlipEndpoints,
  columns: overtimeSlipColumns,
  filters: overtimeSlipFilters,
  formFields: overtimeSlipFormFields,
  access: overtimeSlipAccess,
  queryKey: 'overtime-slips',
};
