/**
 * Employee Advances CRUD Module Configuration
 *
 * Declarative config for the Employee Advances module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1, 6.1
 */

import { EXPENSES } from '@/lib/endpoints';
import type { ColumnDef } from '@/types/datatable';
import type { FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';

export const employeeAdvancesCrudConfig = {
  id: 'employee-advances',
  title: 'Employee Advances',
  queryKey: 'employee-advances',
  endpoints: {
    list: EXPENSES.ADVANCES,
    create: EXPENSES.ADVANCES,
    detail: EXPENSES.ADVANCE_DETAIL,
    update: EXPENSES.ADVANCE_DETAIL,
    delete: EXPENSES.ADVANCE_DETAIL,
  },
  columns: [
    { key: 'employee_name', header: 'Employee', sortable: true },
    { key: 'amount', header: 'Amount', sortable: true },
    { key: 'purpose', header: 'Purpose', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'advance_date', header: 'Advance Date', sortable: true },
  ] as ColumnDef<Record<string, unknown>>[],
  filters: [
    { key: 'search', label: 'Search advances...', type: 'search' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'paid', label: 'Paid' },
      ],
    },
  ] as FilterConfig[],
  formFields: [
    {
      name: 'employee',
      label: 'Employee',
      type: 'select',
      required: true,
      optionsQuery: { queryKey: ['employees'], endpoint: '/api/v1/employees/' },
    },
    { name: 'amount', label: 'Amount', type: 'number', required: true },
    { name: 'purpose', label: 'Purpose', type: 'text', required: true },
    { name: 'advance_date', label: 'Advance Date', type: 'date', required: true },
  ] as FieldSchema[],
  access: {
    list: ['org_admin', 'hr_manager', 'department_head'],
    create: ['org_admin', 'hr_manager', 'department_head', 'employee'],
    update: ['org_admin', 'hr_manager'],
    delete: ['org_admin'],
  },
};
