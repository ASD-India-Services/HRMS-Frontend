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
  pay_period: string;
  department: string;
  status: string;
  total_employees: number;
  total_gross: number;
  total_net: number;
  created_at: string;
  updated_at: string;
}

export const payrollEntryColumns: ColumnDef<PayrollEntry>[] = [
  {
    key: 'pay_period',
    header: 'Pay Period',
    sortable: true,
  },
  {
    key: 'department',
    header: 'Department',
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
    key: 'total_gross',
    header: 'Total Gross',
    sortable: true,
  },
  {
    key: 'total_net',
    header: 'Total Net',
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
      { value: 'submitted', label: 'Submitted' },
      { value: 'disbursed', label: 'Disbursed' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
];

export const payrollEntryFormFields: FieldSchema[] = [
  {
    name: 'pay_period',
    label: 'Pay Period',
    type: 'text',
    required: true,
    placeholder: 'e.g. 2024-01',
  },
  {
    name: 'department',
    label: 'Department',
    type: 'select',
    placeholder: 'Select department (optional for all)',
    optionsQuery: {
      queryKey: ['departments', 'options'],
      endpoint: '/api/v1/departments/',
    },
  },
  {
    name: 'salary_structure',
    label: 'Salary Structure',
    type: 'select',
    placeholder: 'Select salary structure',
    optionsQuery: {
      queryKey: ['salary-structures', 'options'],
      endpoint: PAYROLL.SALARY_STRUCTURES,
    },
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
