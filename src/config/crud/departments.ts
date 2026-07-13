/**
 * CRUD Module Configuration: Departments
 *
 * Declarative configuration for the Departments CRUD module,
 * defining columns, filters, form schema, and role-based access.
 *
 * Requirements: 3.1
 */

import { DEPARTMENTS } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface Department {
  id: string;
  name: string;
  description: string;
  parent_name: string | null;
  head_name: string | null;
  is_active: boolean;
  children_count: number;
  created_at: string;
  updated_at: string;
}

export const departmentColumns: ColumnDef<Department>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
  },
  {
    key: 'description',
    header: 'Description',
    sortable: false,
  },
  {
    key: 'parent_name',
    header: 'Parent Department',
    sortable: true,
  },
  {
    key: 'head_name',
    header: 'Department Head',
    sortable: true,
  },
  {
    key: 'is_active',
    header: 'Active',
    sortable: true,
    render: (value: unknown) => (value ? 'Yes' : 'No'),
  },
  {
    key: 'children_count',
    header: 'Sub-departments',
    sortable: true,
  },
];

export const departmentFilters: FilterConfig[] = [
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

export const departmentFormFields: FieldSchema[] = [
  {
    name: 'name',
    label: 'Department Name',
    type: 'text',
    required: true,
    placeholder: 'Enter department name',
    validation: [
      { type: 'required', message: 'Department name is required' },
      { type: 'maxLength', value: 100, message: 'Name must be 100 characters or fewer' },
    ],
  },
  {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    placeholder: 'Enter department description',
  },
  {
    name: 'parent',
    label: 'Parent Department',
    type: 'select',
    placeholder: 'Select parent department',
    optionsQuery: {
      queryKey: ['departments', 'options'],
      endpoint: DEPARTMENTS.LIST,
    },
  },
  {
    name: 'head',
    label: 'Department Head',
    type: 'select',
    placeholder: 'Select department head',
    optionsQuery: {
      queryKey: ['employees', 'options'],
      endpoint: '/api/v1/employees/',
    },
  },
  {
    name: 'is_active',
    label: 'Active',
    type: 'toggle',
  },
];

export const departmentEndpoints: CrudEndpoints = {
  list: DEPARTMENTS.LIST,
  create: DEPARTMENTS.CREATE,
  detail: DEPARTMENTS.DETAIL,
  update: DEPARTMENTS.UPDATE,
  delete: DEPARTMENTS.DELETE,
};

export const departmentAccess = {
  list: ['org_admin', 'hr_manager'],
  create: ['org_admin', 'hr_manager'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const departmentCrudConfig = {
  id: 'departments',
  title: 'Departments',
  endpoints: departmentEndpoints,
  columns: departmentColumns,
  filters: departmentFilters,
  formFields: departmentFormFields,
  access: departmentAccess,
  queryKey: 'departments',
} as const;
