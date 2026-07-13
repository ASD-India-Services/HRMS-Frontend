/**
 * CRUD Module Configuration: Salary Components
 *
 * Declarative configuration for the Salary Components CRUD module,
 * defining columns, filters, form schema, and role-based access.
 *
 * Requirements: 3.6
 */

import { SALARY_COMPONENTS } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface SalaryComponent {
  id: string;
  name: string;
  type: 'earning' | 'deduction';
  abbreviation: string;
  is_tax_applicable: boolean;
  depends_on_payment_days: boolean;
  is_flexible_benefit: boolean;
  formula: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const salaryComponentColumns: ColumnDef<SalaryComponent>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
  },
  {
    key: 'type',
    header: 'Type',
    sortable: true,
    render: (value: unknown) => {
      const v = value as string;
      return v === 'earning' ? 'Earning' : 'Deduction';
    },
  },
  {
    key: 'abbreviation',
    header: 'Abbreviation',
    sortable: true,
  },
  {
    key: 'is_tax_applicable',
    header: 'Tax Applicable',
    sortable: true,
    render: (value: unknown) => (value ? 'Yes' : 'No'),
  },
  {
    key: 'is_active',
    header: 'Active',
    sortable: true,
    render: (value: unknown) => (value ? 'Yes' : 'No'),
  },
];

export const salaryComponentFilters: FilterConfig[] = [
  {
    key: 'search',
    label: 'Search',
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
    key: 'is_active',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'true', label: 'Active' },
      { value: 'false', label: 'Inactive' },
    ],
  },
];

export const salaryComponentFormFields: FieldSchema[] = [
  {
    name: 'name',
    label: 'Component Name',
    type: 'text',
    required: true,
    placeholder: 'Enter component name',
    validation: [
      { type: 'required', message: 'Component name is required' },
      { type: 'maxLength', value: 255, message: 'Name must be 255 characters or fewer' },
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
    validation: [
      { type: 'required', message: 'Component type is required' },
    ],
  },
  {
    name: 'abbreviation',
    label: 'Abbreviation',
    type: 'text',
    placeholder: 'e.g. HRA, DA, PF',
    validation: [
      { type: 'maxLength', value: 20, message: 'Abbreviation must be 20 characters or fewer' },
    ],
  },
  {
    name: 'is_tax_applicable',
    label: 'Tax Applicable',
    type: 'toggle',
  },
  {
    name: 'depends_on_payment_days',
    label: 'Depends on Payment Days',
    type: 'toggle',
  },
  {
    name: 'is_flexible_benefit',
    label: 'Flexible Benefit',
    type: 'toggle',
  },
  {
    name: 'formula',
    label: 'Formula',
    type: 'textarea',
    placeholder: 'Python expression using base, gross_pay, etc.',
  },
  {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    placeholder: 'Enter component description',
  },
  {
    name: 'is_active',
    label: 'Active',
    type: 'toggle',
  },
];

export const salaryComponentEndpoints: CrudEndpoints = {
  list: SALARY_COMPONENTS.LIST,
  create: SALARY_COMPONENTS.CREATE,
  detail: SALARY_COMPONENTS.DETAIL,
  update: SALARY_COMPONENTS.UPDATE,
  delete: SALARY_COMPONENTS.DELETE,
};

export const salaryComponentAccess = {
  list: ['org_admin', 'hr_manager'],
  create: ['org_admin', 'hr_manager'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const salaryComponentCrudConfig = {
  id: 'salary-components',
  title: 'Salary Components',
  endpoints: salaryComponentEndpoints,
  columns: salaryComponentColumns,
  filters: salaryComponentFilters,
  formFields: salaryComponentFormFields,
  access: salaryComponentAccess,
  queryKey: 'salary-components',
} as const;
