/**
 * Training Events CRUD Module Configuration
 *
 * Declarative config for the Training Events module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1
 */

import { TRAINING } from '@/lib/endpoints';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface TrainingEvent {
  id: string;
  name: string;
  event_type: string;
  status: string;
  start_date: string;
  end_date: string;
  trainer: string;
  max_participants: number;
  created_at: string;
  updated_at: string;
}

export const trainingEventColumns: ColumnDef<TrainingEvent>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'event_type', header: 'Type', sortable: true },
  { key: 'status', header: 'Status', sortable: true },
  { key: 'start_date', header: 'Start Date', sortable: true },
  { key: 'end_date', header: 'End Date', sortable: true },
  { key: 'trainer', header: 'Trainer', sortable: true },
  { key: 'max_participants', header: 'Max Participants', sortable: true },
];

export const trainingEventFilters: FilterConfig[] = [
  { key: 'search', label: 'Search events...', type: 'search', debounceMs: 300 },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
];

export const trainingEventFormFields: FieldSchema[] = [
  {
    name: 'name',
    label: 'Event Name',
    type: 'text',
    required: true,
    validation: [{ type: 'required', message: 'Event name is required' }],
  },
  {
    name: 'event_type',
    label: 'Event Type',
    type: 'select',
    required: true,
    options: [
      { value: 'workshop', label: 'Workshop' },
      { value: 'seminar', label: 'Seminar' },
      { value: 'conference', label: 'Conference' },
      { value: 'webinar', label: 'Webinar' },
    ],
  },
  { name: 'start_date', label: 'Start Date', type: 'date', required: true },
  { name: 'end_date', label: 'End Date', type: 'date', required: true },
  { name: 'trainer', label: 'Trainer', type: 'text', placeholder: 'Enter trainer name' },
  { name: 'max_participants', label: 'Max Participants', type: 'number', placeholder: 'Enter max participants' },
];

export const trainingEventEndpoints: CrudEndpoints = {
  list: TRAINING.EVENTS,
  create: TRAINING.EVENTS,
  detail: TRAINING.EVENT_DETAIL,
  update: TRAINING.EVENT_DETAIL,
  delete: TRAINING.EVENT_DETAIL,
};

export const trainingEventAccess = {
  list: ['org_admin', 'hr_manager'],
  create: ['org_admin', 'hr_manager'],
  update: ['org_admin', 'hr_manager'],
  delete: ['org_admin'],
} as const;

export const trainingEventsCrudConfig = {
  id: 'training-events',
  title: 'Training Events',
  endpoints: trainingEventEndpoints,
  columns: trainingEventColumns,
  filters: trainingEventFilters,
  formFields: trainingEventFormFields,
  access: trainingEventAccess,
  queryKey: 'training-events',
};
