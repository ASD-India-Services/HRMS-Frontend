/**
 * Job Offers CRUD Module Configuration
 *
 * Declarative config for the Job Offers module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1, 7.1, 7.2
 */

import { RECRUITMENT } from '@/lib/endpoints';
import type { ColumnDef } from '@/types/datatable';
import type { FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';

export const jobOffersCrudConfig = {
  id: 'job-offers',
  title: 'Job Offers',
  queryKey: 'job-offers',
  endpoints: {
    list: RECRUITMENT.JOB_OFFERS,
    create: RECRUITMENT.JOB_OFFERS,
    detail: RECRUITMENT.JOB_OFFER_DETAIL,
    update: RECRUITMENT.JOB_OFFER_DETAIL,
    delete: RECRUITMENT.JOB_OFFER_DETAIL,
  },
  columns: [
    { key: 'applicant.name', header: 'Applicant', sortable: true },
    { key: 'designation.title', header: 'Designation', sortable: true },
    { key: 'offered_salary', header: 'Offered Salary', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
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
      name: 'designation_id',
      label: 'Designation',
      type: 'select',
      required: true,
      optionsQuery: { queryKey: ['designations'], endpoint: '/api/v1/designations/' },
    },
    { name: 'offered_salary', label: 'Offered Salary', type: 'number', required: true },
    { name: 'joining_date', label: 'Joining Date', type: 'date', required: true },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'withdrawn', label: 'Withdrawn' },
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
