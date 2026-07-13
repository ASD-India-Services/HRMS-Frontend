/**
 * Grievances CRUD Module Configuration
 *
 * Declarative config for the Grievances module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1
 */

import { GRIEVANCES } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface Grievance {
  id: string;
  employee: string;
  type: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const grievanceColumns: ColumnDef<Grievance>[] = [
  { key: 'employee', header: 'Employee', sortable: true },
  { key: 'type', header: 'Type', sortable: true },
  { key: 'description', header: 'Description', sortable: false },
  { key: 'priority', header: 'Priority', sortable: true },
  { key: 'status', header: 'Status', sortable: true },
];

export const grievanceFilters: FilterConfig[] = [
  { key: 'search', label: 'Search grievances...', type: 'search', debounceMs: 300 },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'open', label: 'Open' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'resolved', label: 'Resolved' },
      { value: 'closed', label: 'Closed' },
    ],
  },
];

export const grievanceFormFields: FieldSchema[] = [
  {
    name: 'employee',
    label: 'Employee',
    type: 'select',
    required: true,
    optionsQuery: { queryKey: ['employees', 'options'], endpoint: '/api/v1/employees/' },
  },
  {
    name: 'type',
    label: 'Grievance Type',
    type: 'select',
    required: true,
    optionsQuery: { queryKey: ['grievance-types', 'options'], endpoint: '/api/v1/grievance-types/' },
  },
  { name: 'description', label: 'Description', type: 'textarea', required: true },
  {
    name: 'priority',
    label: 'Priority',
    type: 'select',
    required: true,
    options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
    ],
  },
];

export const grievanceEndpoints: CrudEndpoints = {
  list: GRIEVANCES.LIST,
  create: GRIEVANCES.CREATE,
  detail: GRIEVANCES.DETAIL,
  update: GRIEVANCES.DETAIL,
  delete: GRIEVANCES.DETAIL,
};

export const grievanceAccess = {
  list: ['org_admin', 'hr_manager'],
  create: ['org_admin', 'hr_manager', 'employee'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const grievancesCrudConfig = {
  id: 'grievances',
  title: 'Grievances',
  endpoints: grievanceEndpoints,
  columns: grievanceColumns,
  filters: grievanceFilters,
  formFields: grievanceFormFields,
  access: grievanceAccess,
  queryKey: 'grievances',
};
