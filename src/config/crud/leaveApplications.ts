/**
 * Leave Applications CRUD Module Configuration
 *
 * Declarative config for the Leave Applications module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1, 5.1, 5.2
 */

import { LEAVES } from '@/lib/endpoints';
import type { ColumnDef } from '@/types/datatable';
import type { FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';

export const leaveApplicationsCrudConfig = {
  id: 'leave-applications',
  title: 'Leave Applications',
  queryKey: 'leave-applications',
  endpoints: {
    list: LEAVES.APPLICATIONS,
    create: LEAVES.APPLICATIONS,
    detail: LEAVES.APPLICATION_DETAIL,
    update: LEAVES.APPLICATION_DETAIL,
    delete: LEAVES.APPLICATION_DETAIL,
  },
  columns: [
    { key: 'employee.name', header: 'Employee', sortable: true },
    { key: 'leave_type.name', header: 'Leave Type', sortable: true },
    { key: 'from_date', header: 'From Date', sortable: true },
    { key: 'to_date', header: 'To Date', sortable: true },
    { key: 'total_days', header: 'Total Days', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'reason', header: 'Reason', sortable: false },
  ] as ColumnDef<Record<string, unknown>>[],
  filters: [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
      ],
    },
  ] as FilterConfig[],
  formFields: [
    {
      name: 'leave_type_id',
      label: 'Leave Type',
      type: 'select',
      required: true,
      optionsQuery: { queryKey: ['leave-types'], endpoint: LEAVES.TYPES },
    },
    {
      name: 'from_date',
      label: 'From Date',
      type: 'date',
      required: true,
    },
    {
      name: 'to_date',
      label: 'To Date',
      type: 'date',
      required: true,
      validation: [
        { type: 'dateAfter', value: 'from_date', message: 'End date must be after start date' },
      ],
    },
    {
      name: 'reason',
      label: 'Reason',
      type: 'textarea',
      placeholder: 'Provide a reason for your leave application...',
    },
  ] as FieldSchema[],
  access: {
    list: ['org_admin', 'hr_manager', 'department_head'],
    create: ['org_admin', 'hr_manager', 'department_head', 'employee'],
    update: ['org_admin', 'hr_manager'],
    delete: ['org_admin'],
  },
};
