import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { IconButton } from '@/components/ui/Button';
import { Iconify } from '@/components/Iconify';

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
    <PageContainer>
      <PageHeader title="Overtime Types" subtitle="Manage overtime rate configurations" actions={<CreateButton permission="overtime_types.create" label="Create Type" onClick={() => setShowCreate(true)} />} />
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
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-error-light bg-surface-paper px-4 py-3 shadow-lg">
          <div className="flex items-start gap-3">
            <Iconify icon="warning" width={20} className="mt-0.5 flex-shrink-0 text-error-main" />
            <p className="text-sm text-ink-primary">{deleteError}</p>
            <IconButton icon="close" size="small" onClick={() => setDeleteError(null)} aria-label="Dismiss" className="ml-2" />
          </div>
        </div>
      )}
    </PageContainer>
  );
}
