/**
 * Leave Allocations CRUD Module Configuration
 *
 * Declarative config for the Leave Allocations module — used with createCrudHooks,
 * DataTable, and FormBuilder to render list views, filters, and forms.
 *
 * Requirements: 3.1, 5.1, 5.2
 */

import { LEAVES, EMPLOYEES } from '@/lib/endpoints';
import type { ColumnDef } from '@/types/datatable';
import type { FilterConfig } from '@/types/datatable';
import type { FieldSchema } from '@/types/form';

export const leaveAllocationsCrudConfig = {
  id: 'leave-allocations',
  title: 'Leave Allocations',
  queryKey: 'leave-allocations',
  endpoints: {
    list: LEAVES.ALLOCATIONS,
    create: LEAVES.ALLOCATIONS,
    detail: (id: string) => `${LEAVES.ALLOCATIONS}${id}/`,
    update: (id: string) => `${LEAVES.ALLOCATIONS}${id}/`,
    delete: (id: string) => `${LEAVES.ALLOCATIONS}${id}/`,
  },
  columns: [
    { key: 'employee.name', header: 'Employee', sortable: true },
    { key: 'leave_type.name', header: 'Leave Type', sortable: true },
    { key: 'allocated_days', header: 'Allocated Days', sortable: true },
    { key: 'used_days', header: 'Used Days', sortable: true },
    { key: 'carry_forwarded', header: 'Carry Forwarded', sortable: true },
    { key: 'fiscal_year', header: 'Fiscal Year', sortable: true },
  ] as ColumnDef<Record<string, unknown>>[],
  filters: [
    {
      key: 'fiscal_year',
      label: 'Fiscal Year',
      type: 'select',
      options: [
        { value: '2023-2024', label: '2023-2024' },
        { value: '2024-2025', label: '2024-2025' },
        { value: '2025-2026', label: '2025-2026' },
      ],
    },
    {
      key: 'leave_type',
      label: 'Leave Type',
      type: 'select',
    },
  ] as FilterConfig[],
  formFields: [
    {
      name: 'employee_id',
      label: 'Employee',
      type: 'select',
      required: true,
      optionsQuery: { queryKey: ['employees'], endpoint: EMPLOYEES.LIST },
    },
    {
      name: 'leave_type_id',
      label: 'Leave Type',
      type: 'select',
      required: true,
      optionsQuery: { queryKey: ['leave-types'], endpoint: LEAVES.TYPES },
    },
    {
      name: 'allocated_days',
      label: 'Allocated Days',
      type: 'number',
      required: true,
      validation: [
        { type: 'min', value: 1, message: 'Must allocate at least 1 day' },
      ],
    },
    {
      name: 'fiscal_year',
      label: 'Fiscal Year',
      type: 'select',
      required: true,
      options: [
        { value: '2023-2024', label: '2023-2024' },
        { value: '2024-2025', label: '2024-2025' },
        { value: '2025-2026', label: '2025-2026' },
      ],
    },
  ] as FieldSchema[],
  access: {
    list: ['org_admin', 'hr_manager', 'department_head'],
    create: ['org_admin', 'hr_manager', 'department_head', 'employee'],
    update: ['org_admin', 'hr_manager'],
    delete: ['org_admin'],
  },
};
