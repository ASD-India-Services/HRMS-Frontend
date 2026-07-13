/**
 * Salary Slips CRUD Module Configuration
 *
 * Declarative config for the Salary Slips module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1, 9.1
 */

import { PAYROLL } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface SalarySlip {
  id: string;
  employee_name: string;
  pay_period: string;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export const salarySlipColumns: ColumnDef<SalarySlip>[] = [
  {
    key: 'employee_name',
    header: 'Employee',
    sortable: true,
  },
  {
    key: 'pay_period',
    header: 'Pay Period',
    sortable: true,
  },
  {
    key: 'gross_pay',
    header: 'Gross Pay',
    sortable: true,
  },
  {
    key: 'total_deductions',
    header: 'Deductions',
    sortable: true,
  },
  {
    key: 'net_pay',
    header: 'Net Pay',
    sortable: true,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
  },
];

export const salarySlipFilters: FilterConfig[] = [
  {
    key: 'search',
    label: 'Search salary slips...',
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
      { value: 'paid', label: 'Paid' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  {
    key: 'pay_period',
    label: 'Pay Period',
    type: 'select',
    options: [
      { value: '', label: 'All Periods' },
    ],
  },
];

export const salarySlipFormFields: FieldSchema[] = [
  {
    name: 'employee',
    label: 'Employee',
    type: 'select',
    required: true,
    placeholder: 'Select employee',
    optionsQuery: {
      queryKey: ['employees', 'options'],
      endpoint: '/api/v1/employees/',
    },
  },
  {
    name: 'pay_period',
    label: 'Pay Period',
    type: 'text',
    required: true,
    placeholder: 'e.g. 2024-01',
  },
  {
    name: 'salary_structure',
    label: 'Salary Structure',
    type: 'select',
    required: true,
    placeholder: 'Select salary structure',
    optionsQuery: {
      queryKey: ['salary-structures', 'options'],
      endpoint: PAYROLL.SALARY_STRUCTURES,
    },
  },
];

export const salarySlipEndpoints: CrudEndpoints = {
  list: PAYROLL.SALARY_SLIPS,
  create: PAYROLL.SALARY_SLIPS,
  detail: PAYROLL.SALARY_SLIP_DETAIL,
  update: PAYROLL.SALARY_SLIP_DETAIL,
  delete: PAYROLL.SALARY_SLIP_DETAIL,
};

export const salarySlipAccess = {
  list: ['org_admin', 'hr_manager'],
  create: ['org_admin', 'hr_manager'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const salarySlipsCrudConfig = {
  id: 'salary-slips',
  title: 'Salary Slips',
  endpoints: salarySlipEndpoints,
  columns: salarySlipColumns,
  filters: salarySlipFilters,
  formFields: salarySlipFormFields,
  access: salarySlipAccess,
  queryKey: 'salary-slips',
};
