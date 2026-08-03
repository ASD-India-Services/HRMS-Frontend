/**
 * Payroll Entries CRUD Module Configuration
 *
 * Declarative config for the Payroll Entries module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1, 9.1
 */

import { PAYROLL } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface PayrollEntry {
  id: string;
  month: number;
  year: number;
  status: string;
  created_by: string;
  total_employees: number;
  total_amount: number;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const payrollEntryColumns: ColumnDef<PayrollEntry>[] = [
  {
    key: 'month',
    header: 'Month',
    sortable: true,
  },
  {
    key: 'year',
    header: 'Year',
    sortable: true,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
  },
  {
    key: 'total_employees',
    header: 'Total Employees',
    sortable: true,
  },
  {
    key: 'total_amount',
    header: 'Total Amount',
    sortable: true,
  },
];

export const payrollEntryFilters: FilterConfig[] = [
  {
    key: 'search',
    label: 'Search payroll entries...',
    type: 'search',
    debounceMs: 300,
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'draft', label: 'Draft' },
      { value: 'processing', label: 'Processing' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
];

export const payrollEntryFormFields: FieldSchema[] = [
  {
    name: 'month',
    label: 'Month',
    type: 'select',
    required: true,
    placeholder: 'Select month',
    options: [
      { value: '1', label: 'January' },
      { value: '2', label: 'February' },
      { value: '3', label: 'March' },
      { value: '4', label: 'April' },
      { value: '5', label: 'May' },
      { value: '6', label: 'June' },
      { value: '7', label: 'July' },
      { value: '8', label: 'August' },
      { value: '9', label: 'September' },
      { value: '10', label: 'October' },
      { value: '11', label: 'November' },
      { value: '12', label: 'December' },
    ],
    validation: [
      { type: 'required', message: 'Month is required' },
    ],
  },
  {
    name: 'year',
    label: 'Year',
    type: 'number',
    required: true,
    placeholder: 'e.g. 2025',
    validation: [
      { type: 'required', message: 'Year is required' },
    ],
  },
  {
    name: 'created_by',
    label: 'Created By',
    type: 'select',
    required: true,
    placeholder: 'Select',
    optionsQuery: {
      queryKey: ['payroll-managers'],
      endpoint: '/api/v1/employees-with-permission/?permission=payroll.create',
    },
    validation: [
      { type: 'required', message: 'Created by is required' },
    ],
  },
];

export const payrollEntryEndpoints: CrudEndpoints = {
  list: PAYROLL.PAYROLL_ENTRIES,
  create: PAYROLL.PAYROLL_ENTRIES,
  detail: PAYROLL.PAYROLL_ENTRY_DETAIL,
  update: PAYROLL.PAYROLL_ENTRY_DETAIL,
  delete: PAYROLL.PAYROLL_ENTRY_DETAIL,
};

export const payrollEntryAccess = {
  list: ['org_admin', 'hr_manager'],
  create: ['org_admin', 'hr_manager'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const payrollEntriesCrudConfig = {
  id: 'payroll-entries',
  title: 'Payroll Entries',
  endpoints: payrollEntryEndpoints,
  columns: payrollEntryColumns,
  filters: payrollEntryFilters,
  formFields: payrollEntryFormFields,
  access: payrollEntryAccess,
  queryKey: 'payroll-entries',
};
