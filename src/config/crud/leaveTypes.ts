/**
 * Leave Types CRUD Module Configuration
 *
 * Declarative config for the Leave Types module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1, 5.1, 5.2
 */

import { LEAVES } from '@/lib/endpoints';
import type { ColumnDef } from '@/types/datatable';
import type { FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';

export const leaveTypesCrudConfig = {
  id: 'leave-types',
  title: 'Leave Types',
  queryKey: 'leave-types',
  endpoints: {
    list: LEAVES.TYPES,
    create: LEAVES.TYPES,
    detail: (id: string) => `${LEAVES.TYPES}${id}/`,
    update: (id: string) => `${LEAVES.TYPES}${id}/`,
    delete: (id: string) => `${LEAVES.TYPES}${id}/`,
  },
  columns: [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'max_days_per_year', header: 'Max Days/Year', sortable: true },
    { key: 'is_paid', header: 'Paid', sortable: true },
    { key: 'is_carry_forward', header: 'Carry Forward', sortable: true },
    { key: 'requires_approval', header: 'Requires Approval', sortable: true },
  ] as ColumnDef<Record<string, unknown>>[],
  filters: [
    { key: 'search', label: 'Search leave types...', type: 'search' },
  ] as FilterConfig[],
  formFields: [
    { name: 'name', label: 'Leave Type Name', type: 'text', required: true },
    {
      name: 'max_days_per_year',
      label: 'Max Days Per Year',
      type: 'number',
      required: true,
      validation: [
        { type: 'min', value: 0, message: 'Must be at least 0' },
      ],
    },
    { name: 'is_paid', label: 'Is Paid Leave', type: 'toggle' },
    { name: 'is_carry_forward', label: 'Allow Carry Forward', type: 'toggle' },
    {
      name: 'max_carry_forward_days',
      label: 'Max Carry Forward Days',
      type: 'number',
      visibleWhen: { field: 'is_carry_forward', value: true },
      validation: [
        { type: 'min', value: 0, message: 'Must be at least 0' },
      ],
    },
    { name: 'requires_approval', label: 'Requires Approval', type: 'toggle' },
  ] as FieldSchema[],
  access: {
    list: ['org_admin', 'hr_manager', 'department_head'],
    create: ['org_admin', 'hr_manager', 'department_head', 'employee'],
    update: ['org_admin', 'hr_manager'],
    delete: ['org_admin'],
  },
};
