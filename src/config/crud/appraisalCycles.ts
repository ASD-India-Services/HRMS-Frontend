/**
 * Appraisal Cycles CRUD Module Configuration
 *
 * Declarative config for the Appraisal Cycles module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1
 */

import { APPRAISALS } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface AppraisalCycle {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const appraisalCycleColumns: ColumnDef<AppraisalCycle>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'start_date', header: 'Start Date', sortable: true },
  { key: 'end_date', header: 'End Date', sortable: true },
  { key: 'status', header: 'Status', sortable: true },
];

export const appraisalCycleFilters: FilterConfig[] = [
  { key: 'search', label: 'Search cycles...', type: 'search', debounceMs: 300 },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'draft', label: 'Draft' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
    ],
  },
];

export const appraisalCycleFormFields: FieldSchema[] = [
  {
    name: 'name',
    label: 'Cycle Name',
    type: 'text',
    required: true,
    validation: [{ type: 'required', message: 'Cycle name is required' }],
  },
  { name: 'start_date', label: 'Start Date', type: 'date', required: true },
  { name: 'end_date', label: 'End Date', type: 'date', required: true },
];

export const appraisalCycleEndpoints: CrudEndpoints = {
  list: APPRAISALS.CYCLES,
  create: APPRAISALS.CYCLES,
  detail: APPRAISALS.CYCLE_DETAIL,
  update: APPRAISALS.CYCLE_DETAIL,
  delete: APPRAISALS.CYCLE_DETAIL,
};

export const appraisalCycleAccess = {
  list: ['org_admin', 'hr_manager'],
  create: ['org_admin', 'hr_manager'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const appraisalCyclesCrudConfig = {
  id: 'appraisal-cycles',
  title: 'Appraisal Cycles',
  endpoints: appraisalCycleEndpoints,
  columns: appraisalCycleColumns,
  filters: appraisalCycleFilters,
  formFields: appraisalCycleFormFields,
  access: appraisalCycleAccess,
  queryKey: 'appraisal-cycles',
};
