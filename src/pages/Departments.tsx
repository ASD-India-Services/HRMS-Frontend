/**
 * Departments list page with full CRUD using DataTable.
 */

import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { departmentCrudConfig } from '@/config/crud/departments';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

const deptCrud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'departments',
  endpoints: departmentCrudConfig.endpoints,
});

const createFields: FieldConfig[] = [
  { key: 'name', label: 'Department Name', type: 'text', required: true, placeholder: 'e.g., Engineering' },
  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
];

export default function Departments() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } =
    useFilterSync({ filters: departmentCrudConfig.filters });

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, page_size: pageSize };
    if (filterValues.search) p.search = filterValues.search;
    if (filterValues.is_active) p.is_active = filterValues.is_active;
    return p;
  }, [filterValues, page, pageSize]);

  const queryResult = deptCrud.useList(params);
  const createMutation = deptCrud.useCreate();
  const deleteMutation = deptCrud.useDelete();

  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...(departmentCrudConfig.columns as ColumnDef<Record<string, unknown>>[]),
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      render: (_value: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          <EditButton permission="departments.edit" label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton permission="departments.delete" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
        </div>
      ),
    },
  ];

  const handleCreate = (data: Record<string, unknown>) => {
    createMutation.mutate(data, { onSuccess: () => setShowCreate(false) });
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      await api.patch(`/api/v1/departments/${editRecord.id}/`, data);
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
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="mt-1 text-sm text-gray-600">Manage organizational departments</p>
        </div>
        <CreateButton permission="departments.create" label="Add Department" onClick={() => setShowCreate(true)} />
      </div>

      <FilterBar
        filters={departmentCrudConfig.filters}
        values={filterValues}
        onChange={setFilter}
        onClearAll={clearFilters}
      />

      <DataTable queryResult={queryResult} columns={columnsWithActions} />

      {queryResult.data && queryResult.data.count > 0 && (
        <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />
      )}

      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Department"
        fields={createFields}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        initialValues={{ is_active: true }}
      />

      <CrudModal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        title="Edit Department"
        fields={createFields}
        onSubmit={handleEdit}
        isLoading={editLoading}
        initialValues={editRecord ?? {}}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { deleteMutation.mutate(deleteId!, { onSuccess: () => setDeleteId(null) }); }}
        title="Delete Department"
        message="Are you sure? Employees in this department will be unassigned."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
