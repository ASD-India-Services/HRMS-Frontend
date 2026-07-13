/**
 * CRUD Module Configuration: Designations
 *
 * Declarative configuration for the Designations CRUD module,
 * defining columns, filters, form schema, and role-based access.
 *
 * Requirements: 3.1
 */

import { DESIGNATIONS } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface Designation {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const designationColumns: ColumnDef<Designation>[] = [
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
    key: 'is_active',
    header: 'Active',
    sortable: true,
    render: (value: unknown) => (value ? 'Yes' : 'No'),
  },
];

export const designationFilters: FilterConfig[] = [
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

export const designationFormFields: FieldSchema[] = [
  {
    name: 'name',
    label: 'Designation Name',
    type: 'text',
    required: true,
    placeholder: 'Enter designation name',
    validation: [
      { type: 'required', message: 'Designation name is required' },
      { type: 'maxLength', value: 100, message: 'Name must be 100 characters or fewer' },
    ],
  },
  {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    placeholder: 'Enter designation description',
  },
  {
    name: 'is_active',
    label: 'Active',
    type: 'toggle',
  },
];

export const designationEndpoints: CrudEndpoints = {
  list: DESIGNATIONS.LIST,
  create: DESIGNATIONS.CREATE,
  detail: DESIGNATIONS.DETAIL,
  update: DESIGNATIONS.UPDATE,
  delete: DESIGNATIONS.DELETE,
};

export const designationAccess = {
  list: ['org_admin', 'hr_manager'],
  create: ['org_admin', 'hr_manager'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const designationCrudConfig = {
  id: 'designations',
  title: 'Designations',
  endpoints: designationEndpoints,
  columns: designationColumns,
  filters: designationFilters,
  formFields: designationFormFields,
  access: designationAccess,
  queryKey: 'designations',
} as const;
