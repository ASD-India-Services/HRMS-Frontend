/**
 * Expense Claims CRUD Module Configuration
 *
 * Declarative config for the Expense Claims module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1, 6.1
 */

import { EXPENSES } from '@/lib/endpoints';
import type { ColumnDef } from '@/types/datatable';
import type { FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';

export const expenseClaimsCrudConfig = {
  id: 'expense-claims',
  title: 'Expense Claims',
  queryKey: 'expense-claims',
  endpoints: {
    list: EXPENSES.CLAIMS,
    create: EXPENSES.CLAIMS,
    detail: EXPENSES.CLAIM_DETAIL,
    update: EXPENSES.CLAIM_DETAIL,
    delete: EXPENSES.CLAIM_DETAIL,
  },
  columns: [
    { key: 'employee_name', header: 'Employee', sortable: true },
    { key: 'title', header: 'Title', sortable: true },
    { key: 'expense_type', header: 'Expense Type', sortable: true },
    { key: 'total_amount', header: 'Total Amount', sortable: true },
    { key: 'expense_date', header: 'Expense Date', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
  ] as ColumnDef<Record<string, unknown>>[],
  filters: [
    { key: 'search', label: 'Search claims...', type: 'search' },
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
    { name: 'title', label: 'Title', type: 'text', required: true },
    {
      name: 'expense_type',
      label: 'Expense Type',
      type: 'select',
      required: true,
      optionsQuery: { queryKey: ['expense-types'], endpoint: '/api/v1/expenses/types/' },
    },
    { name: 'total_amount', label: 'Total Amount', type: 'number', required: true },
    { name: 'expense_date', label: 'Expense Date', type: 'date', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
  ] as FieldSchema[],
  access: {
    list: ['org_admin', 'hr_manager', 'department_head'],
    create: ['org_admin', 'hr_manager', 'department_head', 'employee'],
    update: ['org_admin', 'hr_manager'],
    delete: ['org_admin'],
  },
};
