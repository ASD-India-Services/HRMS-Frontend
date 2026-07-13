/**
 * Department Approvers list page with full CRUD using DataTable.
 *
 * Requirements: 5.6, 11.5
 */

import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DEPARTMENT_APPROVERS } from '@/lib/endpoints';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

interface DepartmentApprover {
  id: string;
  department_name: string;
  approver_name: string;
  approval_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const columns: ColumnDef<DepartmentApprover>[] = [
  { key: 'department_name', header: 'Department', sortable: true },
  { key: 'approver_name', header: 'Approver', sortable: true },
  { key: 'approval_type', header: 'Approval Type', sortable: true },
  {
    key: 'is_active',
    header: 'Active',
    sortable: true,
    render: (value: unknown) => (value ? 'Yes' : 'No'),
  },
];

const filters: FilterConfig[] = [
  {
    key: 'department',
    label: 'Department',
    type: 'select',
    options: [],
    optionsQuery: {
      queryKey: ['departments', 'options'],
      endpoint: '/api/v1/departments/',
    },
  },
  {
    key: 'approval_type',
    label: 'Approval Type',
    type: 'select',
    options: [
      { value: '', label: 'All Types' },
      { value: 'leave', label: 'Leave' },
      { value: 'expense', label: 'Expense' },
      { value: 'travel', label: 'Travel' },
      { value: 'overtime', label: 'Overtime' },
      { value: 'shift', label: 'Shift' },
      { value: 'attendance', label: 'Attendance' },
    ],
  },
];

const createFields: FieldConfig[] = [
  { key: 'department', label: 'Department', type: 'text', required: true, placeholder: 'Department name or ID' },
  { key: 'approver', label: 'Approver', type: 'text', required: true, placeholder: 'Approver name or ID' },
  { key: 'approval_type', label: 'Approval Type', type: 'select', required: true, options: [{ value: 'leave', label: 'Leave' }, { value: 'expense', label: 'Expense' }, { value: 'travel', label: 'Travel' }, { value: 'overtime', label: 'Overtime' }, { value: 'shift', label: 'Shift' }, { value: 'attendance', label: 'Attendance' }] },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
];

const approverCrud = createCrudHooks<DepartmentApprover>({
  queryKey: 'department-approvers',
  endpoints: {
    list: DEPARTMENT_APPROVERS.LIST,
    create: DEPARTMENT_APPROVERS.CREATE,
    detail: DEPARTMENT_APPROVERS.DETAIL,
    update: DEPARTMENT_APPROVERS.UPDATE,
    delete: DEPARTMENT_APPROVERS.DELETE,
  },
});

export default function DepartmentApprovers() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } =
    useFilterSync({ filters });

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, page_size: pageSize };
    if (filterValues.department) p.department = filterValues.department;
    if (filterValues.approval_type) p.approval_type = filterValues.approval_type;
    return p;
  }, [filterValues, page, pageSize]);

  const queryResult = approverCrud.useList(params);
  const createMutation = approverCrud.useCreate();
  const deleteMutation = approverCrud.useDelete();

  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...(columns as ColumnDef<Record<string, unknown>>[]),
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      render: (_value: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          <EditButton label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
        </div>
      ),
    },
  ];

  const handleCreate = (data: Record<string, unknown>) => {
    createMutation.mutate(data as DepartmentApprover, { onSuccess: () => setShowCreate(false) });
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      await api.patch(`/api/v1/department-approvers/${editRecord.id}/`, data);
      setEditRecord(null);
      queryResult.refetch();
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Department Approvers</h1>
          <p className="mt-1 text-sm text-gray-600">Configure approval workflows per department</p>
        </div>
        <CreateButton label="Create Approver" onClick={() => setShowCreate(true)} />
      </div>

      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />

      {queryResult.data && queryResult.data.count > 0 && (
        <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />
      )}

      <CrudModal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Department Approver" fields={createFields} onSubmit={handleCreate} isLoading={createMutation.isPending} initialValues={{ is_active: true }} />
      <CrudModal isOpen={!!editRecord} onClose={() => setEditRecord(null)} title="Edit Department Approver" fields={createFields} onSubmit={handleEdit} isLoading={editLoading} initialValues={editRecord ?? {}} />
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteMutation.mutate(deleteId!, { onSuccess: () => setDeleteId(null) }); }} title="Delete Approver" message="Are you sure? This action cannot be undone." confirmLabel="Delete" variant="destructive" isLoading={deleteMutation.isPending} />
    </div>
  );
}
