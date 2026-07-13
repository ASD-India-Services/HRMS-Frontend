/**
 * Job Applicants CRUD Module Configuration
 *
 * Declarative config for the Job Applicants module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1, 7.1, 7.2
 */

import { RECRUITMENT } from '@/lib/endpoints';
import type { ColumnDef } from '@/types/datatable';
import type { FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';

export const jobApplicantsCrudConfig = {
  id: 'job-applicants',
  title: 'Job Applicants',
  queryKey: 'job-applicants',
  endpoints: {
    list: RECRUITMENT.JOB_APPLICANTS,
    create: RECRUITMENT.JOB_APPLICANTS,
    detail: RECRUITMENT.JOB_APPLICANT_DETAIL,
    update: RECRUITMENT.JOB_APPLICANT_DETAIL,
    delete: RECRUITMENT.JOB_APPLICANT_DETAIL,
  },
  columns: [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'phone', header: 'Phone', sortable: false },
    { key: 'job_opening.title', header: 'Job Opening', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
  ] as ColumnDef<Record<string, unknown>>[],
  filters: [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'applied', label: 'Applied' },
        { value: 'screening', label: 'Screening' },
        { value: 'interview', label: 'Interview' },
        { value: 'offer_made', label: 'Offer Made' },
        { value: 'hired', label: 'Hired' },
        { value: 'rejected', label: 'Rejected' },
      ],
    },
  ] as FilterConfig[],
  formFields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'phone' },
    {
      name: 'job_opening_id',
      label: 'Job Opening',
      type: 'select',
      required: true,
      optionsQuery: { queryKey: ['job-openings'], endpoint: '/api/v1/recruitment/job-openings/' },
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'applied', label: 'Applied' },
        { value: 'screening', label: 'Screening' },
        { value: 'interview', label: 'Interview' },
        { value: 'offer_made', label: 'Offer Made' },
        { value: 'hired', label: 'Hired' },
        { value: 'rejected', label: 'Rejected' },
      ],
    },
  ] as FieldSchema[],
  access: {
    list: ['org_admin', 'hr_manager'],
    create: ['org_admin', 'hr_manager'],
    update: ['org_admin', 'hr_manager'],
    delete: ['org_admin'],
  },
};
