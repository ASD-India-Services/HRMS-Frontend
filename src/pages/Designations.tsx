/**
 * Designations list page with full CRUD.
 */

import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { designationCrudConfig } from '@/config/crud/designations';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

const desigCrud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'designations',
  endpoints: designationCrudConfig.endpoints,
});

const createFields: FieldConfig[] = [
  { key: 'name', label: 'Designation Name', type: 'text', required: true, placeholder: 'e.g., Software Engineer' },
  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of responsibilities' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
];

export default function Designations() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } =
    useFilterSync({ filters: designationCrudConfig.filters });

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, page_size: pageSize };
    if (filterValues.search) p.search = filterValues.search;
    if (filterValues.is_active) p.is_active = filterValues.is_active;
    return p;
  }, [filterValues, page, pageSize]);

  const queryResult = desigCrud.useList(params);
  const createMutation = desigCrud.useCreate();
  const deleteMutation = desigCrud.useDelete();

  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...(designationCrudConfig.columns as ColumnDef<Record<string, unknown>>[]),
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      render: (_value: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          <EditButton label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} permission="employees.delete" />
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
      await api.patch(`/api/v1/designations/${editRecord.id}/`, data);
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
          <h1 className="text-2xl font-bold text-gray-900">Designations</h1>
          <p className="mt-1 text-sm text-gray-600">Manage job designations and titles</p>
        </div>
        <CreateButton label="Add Designation" onClick={() => setShowCreate(true)} permission="employees.create" />
      </div>

      <FilterBar
        filters={designationCrudConfig.filters}
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
        title="Create Designation"
        fields={createFields}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        initialValues={{ is_active: true }}
      />

      <CrudModal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        title="Edit Designation"
        fields={createFields}
        onSubmit={handleEdit}
        isLoading={editLoading}
        initialValues={editRecord ?? {}}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { deleteMutation.mutate(deleteId!, { onSuccess: () => setDeleteId(null) }); }}
        title="Delete Designation"
        message="Are you sure? Employees with this designation will be unassigned."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
