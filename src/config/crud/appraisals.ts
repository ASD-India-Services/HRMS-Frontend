/**
 * Appraisals CRUD Module Configuration
 *
 * Declarative config for the Appraisals module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1
 */

import { APPRAISALS } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface Appraisal {
  id: string;
  employee: string;
  cycle: string;
  appraiser: string;
  score: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export const appraisalColumns: ColumnDef<Appraisal>[] = [
  { key: 'employee', header: 'Employee', sortable: true },
  { key: 'cycle', header: 'Cycle', sortable: true },
  { key: 'appraiser', header: 'Appraiser', sortable: true },
  { key: 'score', header: 'Score', sortable: true },
  { key: 'status', header: 'Status', sortable: true },
];

export const appraisalFilters: FilterConfig[] = [
  { key: 'search', label: 'Search appraisals...', type: 'search', debounceMs: 300 },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'draft', label: 'Draft' },
      { value: 'submitted', label: 'Submitted' },
      { value: 'completed', label: 'Completed' },
    ],
  },
];

export const appraisalFormFields: FieldSchema[] = [
  {
    name: 'employee',
    label: 'Employee',
    type: 'select',
    required: true,
    optionsQuery: { queryKey: ['employees', 'options'], endpoint: '/api/v1/employees/' },
  },
  {
    name: 'cycle',
    label: 'Appraisal Cycle',
    type: 'select',
    required: true,
    optionsQuery: { queryKey: ['appraisal-cycles', 'options'], endpoint: '/api/v1/appraisals/cycles/' },
  },
  {
    name: 'appraiser',
    label: 'Appraiser',
    type: 'select',
    required: true,
    optionsQuery: { queryKey: ['employees', 'options'], endpoint: '/api/v1/employees/' },
  },
  { name: 'score', label: 'Score', type: 'number', placeholder: 'Enter score' },
];

export const appraisalEndpoints: CrudEndpoints = {
  list: APPRAISALS.LIST,
  create: APPRAISALS.LIST,
  detail: APPRAISALS.DETAIL,
  update: APPRAISALS.DETAIL,
  delete: APPRAISALS.DETAIL,
};

export const appraisalAccess = {
  list: ['org_admin', 'hr_manager'],
  create: ['org_admin', 'hr_manager'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const appraisalsCrudConfig = {
  id: 'appraisals',
  title: 'Appraisals',
  endpoints: appraisalEndpoints,
  columns: appraisalColumns,
  filters: appraisalFilters,
  formFields: appraisalFormFields,
  access: appraisalAccess,
  queryKey: 'appraisals',
};
