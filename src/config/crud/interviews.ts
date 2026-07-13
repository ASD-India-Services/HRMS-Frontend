/**
 * Interviews CRUD Module Configuration
 *
 * Declarative config for the Interviews module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1, 7.1, 7.2
 */

import { RECRUITMENT } from '@/lib/endpoints';
import type { ColumnDef } from '@/types/datatable';
import type { FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';

export const interviewsCrudConfig = {
  id: 'interviews',
  title: 'Interviews',
  queryKey: 'interviews',
  endpoints: {
    list: RECRUITMENT.INTERVIEWS,
    create: RECRUITMENT.INTERVIEWS,
    detail: RECRUITMENT.INTERVIEW_DETAIL,
    update: RECRUITMENT.INTERVIEW_DETAIL,
    delete: RECRUITMENT.INTERVIEW_DETAIL,
  },
  columns: [
    { key: 'applicant.name', header: 'Applicant', sortable: true },
    { key: 'job_opening.title', header: 'Job Opening', sortable: true },
    { key: 'date', header: 'Date', sortable: true },
    { key: 'interviewer', header: 'Interviewer', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'rating', header: 'Rating', sortable: true },
  ] as ColumnDef<Record<string, unknown>>[],
  filters: [] as FilterConfig[],
  formFields: [
    {
      name: 'applicant_id',
      label: 'Applicant',
      type: 'select',
      required: true,
      optionsQuery: { queryKey: ['job-applicants'], endpoint: '/api/v1/recruitment/applicants/' },
    },
    {
      name: 'job_opening_id',
      label: 'Job Opening',
      type: 'select',
      required: true,
      optionsQuery: { queryKey: ['job-openings'], endpoint: '/api/v1/recruitment/job-openings/' },
    },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'interviewer', label: 'Interviewer', type: 'text', required: true },
    { name: 'feedback', label: 'Feedback', type: 'textarea' },
    { name: 'rating', label: 'Rating', type: 'number' },
  ] as FieldSchema[],
  access: {
    list: ['org_admin', 'hr_manager'],
    create: ['org_admin', 'hr_manager'],
    update: ['org_admin', 'hr_manager'],
    delete: ['org_admin'],
  },
};
