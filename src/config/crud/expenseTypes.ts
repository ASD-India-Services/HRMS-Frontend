/**
 * Expense Types CRUD Module Configuration
 *
 * Declarative config for the Expense Types module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1, 6.1
 */

import { EXPENSES } from '@/lib/endpoints';
import type { ColumnDef } from '@/types/datatable';
import type { FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';

export const expenseTypesCrudConfig = {
  id: 'expense-types',
  title: 'Expense Types',
  queryKey: 'expense-types',
  endpoints: {
    list: EXPENSES.TYPES,
    create: EXPENSES.TYPES,
    detail: (id: string) => `${EXPENSES.TYPES}${id}/`,
    update: (id: string) => `${EXPENSES.TYPES}${id}/`,
    delete: (id: string) => `${EXPENSES.TYPES}${id}/`,
  },
  columns: [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'description', header: 'Description', sortable: false },
    { key: 'max_amount', header: 'Max Amount', sortable: true },
  ] as ColumnDef<Record<string, unknown>>[],
  filters: [
    { key: 'search', label: 'Search expense types...', type: 'search' },
  ] as FilterConfig[],
  formFields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'max_amount', label: 'Max Amount', type: 'number' },
  ] as FieldSchema[],
  access: {
    list: ['org_admin', 'hr_manager', 'department_head'],
    create: ['org_admin', 'hr_manager', 'department_head', 'employee'],
    update: ['org_admin', 'hr_manager'],
    delete: ['org_admin'],
  },
};
