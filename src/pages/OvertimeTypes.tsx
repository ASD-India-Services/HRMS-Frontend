import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

const ENDPOINT = '/api/v1/overtime-types/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'overtime-types',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: (id) => `${ENDPOINT}${id}/`, update: (id) => `${ENDPOINT}${id}/`, delete: (id) => `${ENDPOINT}${id}/` },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'category_name', header: 'Category', sortable: false, render: (v: unknown) => (v ? String(v) : '—') },
  { key: 'rate_per_hour', header: 'Rate / Hour', sortable: true, render: (v: unknown) => (v != null ? String(v) : '—') },
  { key: 'is_active', header: 'Active', sortable: true, render: (v: unknown) => (v ? 'Yes' : 'No') },
];

const filters: FilterConfig[] = [
  { key: 'search', label: 'Search...', type: 'search', debounceMs: 300 },
];

const createFields: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Weekend OT, Holiday OT' },
  { key: 'category', label: 'Category', type: 'select', required: true, optionsEndpoint: '/api/v1/overtime-categories/?is_active=true', optionsLabelKey: 'name' },
  { key: 'rate_per_hour', label: 'Rate per Hour', type: 'number', required: true, placeholder: 'e.g. 200.00' },
];

export default function OvertimeTypes() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } = useFilterSync({ filters });
  const params = useMemo(() => { const p: Record<string, string | number> = { page, page_size: pageSize }; Object.entries(filterValues).forEach(([k, v]) => { if (v) p[k] = v; }); return p; }, [filterValues, page, pageSize]);
  const queryResult = crud.useList(params);
  const createMutation = crud.useCreate();
  const deleteMutation = crud.useDelete();

  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...columns,
    { key: 'id', header: 'Actions', sortable: false, render: (_v: unknown, row: Record<string, unknown>) => (
      <div className="flex items-center gap-1">
        <EditButton permission="overtime_types.edit" label="Edit" size="sm" onClick={() => setEditRecord(row)} />
        <DeleteButton permission="overtime_types.delete" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
      </div>
    )},
  ];

  const handleCreate = (data: Record<string, unknown>) => { createMutation.mutate(data, { onSuccess: () => { setShowCreate(false); queryResult.refetch(); } }); };
  const handleEdit = async (data: Record<string, unknown>) => { if (!editRecord) return; setEditLoading(true); try { await api.patch(`${ENDPOINT}${editRecord.id}/`, data); setEditRecord(null); queryResult.refetch(); } finally { setEditLoading(false); } };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Overtime Types</h1><p className="mt-1 text-sm text-gray-600">Manage overtime rate configurations</p></div>
        <CreateButton permission="overtime_types.create" label="Create Type" onClick={() => setShowCreate(true)} />
      </div>
      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}
      <CrudModal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Overtime Type" fields={createFields} onSubmit={handleCreate} isLoading={createMutation.isPending} />
      <CrudModal isOpen={!!editRecord} onClose={() => setEditRecord(null)} title="Edit Overtime Type" fields={createFields} initialValues={editRecord ?? undefined} onSubmit={handleEdit} isLoading={editLoading} />
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => { setDeleteId(null); setDeleteError(null); }}
        onConfirm={() => {
          if (!deleteId) return;
          setDeleteError(null);
          deleteMutation.mutate(deleteId, {
            onSuccess: () => setDeleteId(null),
            onError: (err: unknown) => {
              const e = err as { response?: { data?: { detail?: string } } };
              setDeleteError(
                e.response?.data?.detail ??
                  'Could not delete this overtime type. Please try again.',
              );
              setDeleteId(null);
            },
          });
        }}
        title="Delete Overtime Type"
        message="Delete this overtime type?"
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />

      {deleteError && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-red-200 bg-white px-4 py-3 shadow-lg">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            <p className="text-sm text-gray-700">{deleteError}</p>
            <button type="button" onClick={() => setDeleteError(null)} className="ml-2 text-gray-400 hover:text-gray-600" aria-label="Dismiss">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
