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
  employee_id: string;
  month: number;
  year: number;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  status: string;
  payment_date: string | null;
  created_at: string;
  updated_at: string;
}

export const salarySlipColumns: ColumnDef<SalarySlip>[] = [
  {
    key: 'employee_id',
    header: 'Employee',
    sortable: true,
  },
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
  },
  {
    name: 'year',
    label: 'Year',
    type: 'number',
    required: true,
    placeholder: 'e.g. 2025',
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
