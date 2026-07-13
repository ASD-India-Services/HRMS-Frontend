/**
 * Additional Salary CRUD Module Configuration
 *
 * Declarative config for the Additional Salary module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1, 9.1
 */

import { PAYROLL } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface AdditionalSalary {
  id: string;
  employee: string;
  component: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const additionalSalaryColumns: ColumnDef<AdditionalSalary>[] = [
  {
    key: 'employee',
    header: 'Employee',
    sortable: true,
  },
  {
    key: 'component',
    header: 'Component',
    sortable: true,
  },
  {
    key: 'amount',
    header: 'Amount',
    sortable: true,
  },
  {
    key: 'type',
    header: 'Type',
    sortable: true,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
  },
];

export const additionalSalaryFilters: FilterConfig[] = [
  {
    key: 'search',
    label: 'Search additional salary...',
    type: 'search',
    debounceMs: 300,
  },
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'earning', label: 'Earning' },
      { value: 'deduction', label: 'Deduction' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'draft', label: 'Draft' },
      { value: 'submitted', label: 'Submitted' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
];

export const additionalSalaryFormFields: FieldSchema[] = [
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
    name: 'component',
    label: 'Salary Component',
    type: 'text',
    required: true,
    placeholder: 'Enter salary component name',
    validation: [
      { type: 'required', message: 'Salary component is required' },
    ],
  },
  {
    name: 'amount',
    label: 'Amount',
    type: 'number',
    required: true,
    placeholder: 'Enter amount',
    validation: [
      { type: 'required', message: 'Amount is required' },
      { type: 'min', value: 0, message: 'Amount must be a positive value' },
    ],
  },
  {
    name: 'type',
    label: 'Type',
    type: 'select',
    required: true,
    options: [
      { value: 'earning', label: 'Earning' },
      { value: 'deduction', label: 'Deduction' },
    ],
  },
  {
    name: 'payroll_date',
    label: 'Payroll Date',
    type: 'date',
    placeholder: 'Select payroll date',
  },
];

export const additionalSalaryEndpoints: CrudEndpoints = {
  list: PAYROLL.ADDITIONAL_SALARY,
  create: PAYROLL.ADDITIONAL_SALARY,
  detail: PAYROLL.ADDITIONAL_SALARY_DETAIL,
  update: PAYROLL.ADDITIONAL_SALARY_DETAIL,
  delete: PAYROLL.ADDITIONAL_SALARY_DETAIL,
};

export const additionalSalaryAccess = {
  list: ['org_admin', 'hr_manager'],
  create: ['org_admin', 'hr_manager'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const additionalSalaryCrudConfig = {
  id: 'additional-salary',
  title: 'Additional Salary',
  endpoints: additionalSalaryEndpoints,
  columns: additionalSalaryColumns,
  filters: additionalSalaryFilters,
  formFields: additionalSalaryFormFields,
  access: additionalSalaryAccess,
  queryKey: 'additional-salary',
};
