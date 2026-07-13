/**
 * Travel Requests CRUD Module Configuration
 *
 * Declarative config for the Travel Requests module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1
 */

import { TRAVEL } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface TravelRequest {
  id: string;
  employee: string;
  destination: string;
  from_date: string;
  to_date: string;
  purpose: string;
  estimated_cost: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export const travelRequestColumns: ColumnDef<TravelRequest>[] = [
  { key: 'employee', header: 'Employee', sortable: true },
  { key: 'destination', header: 'Destination', sortable: true },
  { key: 'from_date', header: 'From Date', sortable: true },
  { key: 'to_date', header: 'To Date', sortable: true },
  { key: 'purpose', header: 'Purpose', sortable: false },
  { key: 'estimated_cost', header: 'Est. Cost', sortable: true },
  { key: 'status', header: 'Status', sortable: true },
];

export const travelRequestFilters: FilterConfig[] = [
  { key: 'search', label: 'Search requests...', type: 'search', debounceMs: 300 },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'draft', label: 'Draft' },
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
    ],
  },
];

export const travelRequestFormFields: FieldSchema[] = [
  {
    name: 'employee',
    label: 'Employee',
    type: 'select',
    required: true,
    optionsQuery: { queryKey: ['employees', 'options'], endpoint: '/api/v1/employees/' },
  },
  { name: 'destination', label: 'Destination', type: 'text', required: true },
  { name: 'from_date', label: 'From Date', type: 'date', required: true },
  { name: 'to_date', label: 'To Date', type: 'date', required: true },
  { name: 'purpose', label: 'Purpose', type: 'textarea', required: true },
  { name: 'estimated_cost', label: 'Estimated Cost', type: 'number', placeholder: '0.00' },
];

export const travelRequestEndpoints: CrudEndpoints = {
  list: TRAVEL.REQUESTS,
  create: TRAVEL.REQUESTS,
  detail: TRAVEL.REQUEST_DETAIL,
  update: TRAVEL.REQUEST_DETAIL,
  delete: TRAVEL.REQUEST_DETAIL,
};

export const travelRequestAccess = {
  list: ['org_admin', 'hr_manager', 'department_head'],
  create: ['org_admin', 'hr_manager', 'employee'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const travelRequestsCrudConfig = {
  id: 'travel-requests',
  title: 'Travel Requests',
  endpoints: travelRequestEndpoints,
  columns: travelRequestColumns,
  filters: travelRequestFilters,
  formFields: travelRequestFormFields,
  access: travelRequestAccess,
  queryKey: 'travel-requests',
};
