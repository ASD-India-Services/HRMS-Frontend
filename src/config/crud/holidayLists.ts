/**
 * Holiday Lists CRUD Module Configuration
 *
 * Declarative config for the Holiday Lists module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1
 */

import { HOLIDAYS } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface HolidayList {
  id: string;
  name: string;
  from_date: string;
  to_date: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const holidayListColumns: ColumnDef<HolidayList>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'from_date', header: 'From Date', sortable: true },
  { key: 'to_date', header: 'To Date', sortable: true },
  {
    key: 'is_default',
    header: 'Default',
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

export const holidayListFilters: FilterConfig[] = [
  { key: 'search', label: 'Search holiday lists...', type: 'search', debounceMs: 300 },
];

export const holidayListFormFields: FieldSchema[] = [
  {
    name: 'name',
    label: 'List Name',
    type: 'text',
    required: true,
    validation: [{ type: 'required', message: 'Holiday list name is required' }],
  },
  { name: 'from_date', label: 'From Date', type: 'date', required: true },
  { name: 'to_date', label: 'To Date', type: 'date', required: true },
  { name: 'is_default', label: 'Default List', type: 'toggle' },
  { name: 'is_active', label: 'Active', type: 'toggle' },
];

export const holidayListEndpoints: CrudEndpoints = {
  list: HOLIDAYS.LISTS,
  create: HOLIDAYS.LISTS,
  detail: HOLIDAYS.LIST_DETAIL,
  update: HOLIDAYS.LIST_DETAIL,
  delete: HOLIDAYS.LIST_DETAIL,
};

export const holidayListAccess = {
  list: ['org_admin', 'hr_manager'],
  create: ['org_admin', 'hr_manager'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const holidayListsCrudConfig = {
  id: 'holiday-lists',
  title: 'Holiday Lists',
  endpoints: holidayListEndpoints,
  columns: holidayListColumns,
  filters: holidayListFilters,
  formFields: holidayListFormFields,
  access: holidayListAccess,
  queryKey: 'holiday-lists',
};
