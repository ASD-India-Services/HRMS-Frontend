import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

const ENDPOINT = '/api/v1/overtime-categories/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'overtime-categories',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: (id) => `${ENDPOINT}${id}/`, update: (id) => `${ENDPOINT}${id}/`, delete: (id) => `${ENDPOINT}${id}/` },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'is_active', header: 'Active', sortable: true, render: (v: unknown) => (v ? 'Yes' : 'No') },
];

const filters: FilterConfig[] = [
  { key: 'search', label: 'Search...', type: 'search', debounceMs: 300 },
];

const createFields: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Regular, Weekend, Holiday, Night' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
];

export default function OvertimeCategories() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } = useFilterSync({ filters });
  const params = useMemo(() => { const p: Record<string, string | number> = { page, page_size: pageSize }; Object.entries(filterValues).forEach(([k, v]) => { if (v) p[k] = v; }); return p; }, [filterValues, page, pageSize]);
  const queryResult = crud.useList(params);
  const createMutation = crud.useCreate();
  const deleteMutation = crud.useDelete();

  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...columns,
    { key: 'id', header: 'Actions', sortable: false, render: (_v: unknown, row: Record<string, unknown>) => (
      <div className="flex items-center gap-1">
        <EditButton permission="overtime_categories.edit" label="Edit" size="sm" onClick={() => setEditRecord(row)} />
        <DeleteButton permission="overtime_categories.delete" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
      </div>
    )},
  ];

  const handleCreate = (data: Record<string, unknown>) => { createMutation.mutate(data, { onSuccess: () => { setShowCreate(false); queryResult.refetch(); } }); };
  const handleEdit = async (data: Record<string, unknown>) => { if (!editRecord) return; setEditLoading(true); try { await api.patch(`${ENDPOINT}${editRecord.id}/`, data); setEditRecord(null); queryResult.refetch(); } finally { setEditLoading(false); } };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Overtime Categories</h1><p className="mt-1 text-sm text-gray-600">Manage overtime categories used by overtime types</p></div>
        <CreateButton permission="overtime_categories.create" label="Create Category" onClick={() => setShowCreate(true)} />
      </div>
      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}
      <CrudModal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Overtime Category" fields={createFields} onSubmit={handleCreate} isLoading={createMutation.isPending} />
      <CrudModal isOpen={!!editRecord} onClose={() => setEditRecord(null)} title="Edit Overtime Category" fields={createFields} initialValues={editRecord ?? undefined} onSubmit={handleEdit} isLoading={editLoading} />
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) }); }} title="Delete Overtime Category" message="Delete this overtime category?" confirmLabel="Delete" variant="destructive" isLoading={deleteMutation.isPending} />
    </div>
  );
}
