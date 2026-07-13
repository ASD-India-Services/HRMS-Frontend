/**
 * Salary Structures CRUD Module Configuration
 *
 * Declarative config for the Salary Structures module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1, 9.1
 */

import { PAYROLL } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface SalaryStructure {
  id: string;
  name: string;
  is_active: boolean;
  earnings: Record<string, unknown>[];
  deductions: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
}

export const salaryStructureColumns: ColumnDef<SalaryStructure>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
  },
  {
    key: 'is_active',
    header: 'Active',
    sortable: true,
    render: (value: unknown) => (value ? 'Yes' : 'No'),
  },
];

export const salaryStructureFilters: FilterConfig[] = [
  {
    key: 'search',
    label: 'Search salary structures...',
    type: 'search',
    debounceMs: 300,
  },
];

export const salaryStructureFormFields: FieldSchema[] = [
  {
    name: 'name',
    label: 'Structure Name',
    type: 'text',
    required: true,
    placeholder: 'Enter salary structure name',
    validation: [
      { type: 'required', message: 'Structure name is required' },
      { type: 'maxLength', value: 200, message: 'Name must be 200 characters or fewer' },
    ],
  },
  {
    name: 'is_active',
    label: 'Active',
    type: 'toggle',
  },
  {
    name: 'earnings',
    label: 'Earnings (JSON)',
    type: 'textarea',
    placeholder: 'Enter earnings components as JSON array',
    helpText: 'Define earning components, e.g. [{"component": "Basic", "amount": 25000}]',
  },
  {
    name: 'deductions',
    label: 'Deductions (JSON)',
    type: 'textarea',
    placeholder: 'Enter deduction components as JSON array',
    helpText: 'Define deduction components, e.g. [{"component": "PF", "amount": 1800}]',
  },
];

export const salaryStructureEndpoints: CrudEndpoints = {
  list: PAYROLL.SALARY_STRUCTURES,
  create: PAYROLL.SALARY_STRUCTURES,
  detail: PAYROLL.SALARY_STRUCTURE_DETAIL,
  update: PAYROLL.SALARY_STRUCTURE_DETAIL,
  delete: PAYROLL.SALARY_STRUCTURE_DETAIL,
};

export const salaryStructureAccess = {
  list: ['org_admin', 'hr_manager'],
  create: ['org_admin', 'hr_manager'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const salaryStructuresCrudConfig = {
  id: 'salary-structures',
  title: 'Salary Structures',
  endpoints: salaryStructureEndpoints,
  columns: salaryStructureColumns,
  filters: salaryStructureFilters,
  formFields: salaryStructureFormFields,
  access: salaryStructureAccess,
  queryKey: 'salary-structures',
};
