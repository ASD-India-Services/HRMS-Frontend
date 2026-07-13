/**
 * Job Openings CRUD Module Configuration
 *
 * Declarative config for the Job Openings module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1, 7.1, 7.2
 */

import { RECRUITMENT } from '@/lib/endpoints';
import type { ColumnDef } from '@/types/datatable';
import type { FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';

export const jobOpeningsCrudConfig = {
  id: 'job-openings',
  title: 'Job Openings',
  queryKey: 'job-openings',
  endpoints: {
    list: RECRUITMENT.JOB_OPENINGS,
    create: RECRUITMENT.JOB_OPENINGS,
    detail: RECRUITMENT.JOB_OPENING_DETAIL,
    update: RECRUITMENT.JOB_OPENING_DETAIL,
    delete: RECRUITMENT.JOB_OPENING_DETAIL,
  },
  columns: [
    { key: 'title', header: 'Title', sortable: true },
    { key: 'department.name', header: 'Department', sortable: true },
    { key: 'designation.title', header: 'Designation', sortable: true },
    { key: 'vacancies', header: 'Vacancies', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'posted_on', header: 'Posted On', sortable: true },
    { key: 'closes_on', header: 'Closes On', sortable: true },
  ] as ColumnDef<Record<string, unknown>>[],
  filters: [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'open', label: 'Open' },
        { value: 'closed', label: 'Closed' },
        { value: 'on_hold', label: 'On Hold' },
      ],
    },
    {
      key: 'department',
      label: 'Department',
      type: 'select',
      options: [],
    },
  ] as FilterConfig[],
  formFields: [
    { name: 'title', label: 'Title', type: 'text', required: true },
    {
      name: 'department_id',
      label: 'Department',
      type: 'select',
      required: true,
      optionsQuery: { queryKey: ['departments'], endpoint: '/api/v1/departments/' },
    },
    {
      name: 'designation_id',
      label: 'Designation',
      type: 'select',
      required: true,
      optionsQuery: { queryKey: ['designations'], endpoint: '/api/v1/designations/' },
    },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'vacancies', label: 'Vacancies', type: 'number', required: true },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'open', label: 'Open' },
        { value: 'closed', label: 'Closed' },
        { value: 'on_hold', label: 'On Hold' },
      ],
    },
    { name: 'posted_on', label: 'Posted On', type: 'date', required: true },
    { name: 'closes_on', label: 'Closes On', type: 'date' },
  ] as FieldSchema[],
  access: {
    list: ['org_admin', 'hr_manager'],
    create: ['org_admin', 'hr_manager'],
    update: ['org_admin', 'hr_manager'],
    delete: ['org_admin'],
  },
};
