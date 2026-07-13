/**
 * CRUD Module Configuration: Salary Structure Assignments
 *
 * Declarative configuration for the Salary Structure Assignments CRUD module,
 * defining columns, filters, form schema, and role-based access.
 *
 * Requirements: 4.6
 */

import { SALARY_STRUCTURE_ASSIGNMENTS, EMPLOYEES, PAYROLL } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface SalaryStructureAssignment {
  id: string;
  employee: string;
  employee_name: string;
  salary_structure: string;
  salary_structure_name: string;
  from_date: string;
  base_amount: string;
  variable_amount: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const salaryStructureAssignmentColumns: ColumnDef<SalaryStructureAssignment>[] = [
  {
    key: 'employee_name',
    header: 'Employee',
    sortable: true,
  },
  {
    key: 'salary_structure_name',
    header: 'Salary Structure',
    sortable: true,
  },
  {
    key: 'from_date',
    header: 'From Date',
    sortable: true,
  },
  {
    key: 'base_amount',
    header: 'Base Amount',
    sortable: true,
    render: (value: unknown) => {
      const num = Number(value);
      return isNaN(num) ? String(value) : num.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    },
  },
  {
    key: 'is_active',
    header: 'Active',
    sortable: true,
    render: (value: unknown) => (value ? 'Yes' : 'No'),
  },
];

export const salaryStructureAssignmentFilters: FilterConfig[] = [
  {
    key: 'search',
    label: 'Search',
    type: 'search',
    debounceMs: 300,
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

export const salaryStructureAssignmentFormFields: FieldSchema[] = [
  {
    name: 'employee',
    label: 'Employee',
    type: 'select',
    required: true,
    placeholder: 'Select employee',
    optionsQuery: {
      queryKey: ['employees', 'options'],
      endpoint: EMPLOYEES.LIST,
    },
    validation: [
      { type: 'required', message: 'Employee is required' },
    ],
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
    validation: [
      { type: 'required', message: 'Salary structure is required' },
    ],
  },
  {
    name: 'from_date',
    label: 'From Date',
    type: 'date',
    required: true,
    validation: [
      { type: 'required', message: 'From date is required' },
    ],
  },
  {
    name: 'base_amount',
    label: 'Base Amount',
    type: 'number',
    required: true,
    placeholder: 'Enter base amount',
    validation: [
      { type: 'required', message: 'Base amount is required' },
    ],
  },
  {
    name: 'variable_amount',
    label: 'Variable Amount',
    type: 'number',
    placeholder: 'Enter variable amount (optional)',
  },
  {
    name: 'is_active',
    label: 'Active',
    type: 'toggle',
  },
];

export const salaryStructureAssignmentEndpoints: CrudEndpoints = {
  list: SALARY_STRUCTURE_ASSIGNMENTS.LIST,
  create: SALARY_STRUCTURE_ASSIGNMENTS.CREATE,
  detail: SALARY_STRUCTURE_ASSIGNMENTS.DETAIL,
  update: SALARY_STRUCTURE_ASSIGNMENTS.UPDATE,
  delete: SALARY_STRUCTURE_ASSIGNMENTS.DELETE,
};

export const salaryStructureAssignmentAccess = {
  list: ['org_admin', 'hr_manager'],
  create: ['org_admin', 'hr_manager'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const salaryStructureAssignmentCrudConfig = {
  id: 'salary-structure-assignments',
  title: 'Salary Structure Assignments',
  endpoints: salaryStructureAssignmentEndpoints,
  columns: salaryStructureAssignmentColumns,
  filters: salaryStructureAssignmentFilters,
  formFields: salaryStructureAssignmentFormFields,
  access: salaryStructureAssignmentAccess,
  queryKey: 'salary-structure-assignments',
} as const;
