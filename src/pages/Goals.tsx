import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

const ENDPOINT = '/api/v1/goals/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'goals',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: (id) => `${ENDPOINT}${id}/`, update: (id) => `${ENDPOINT}${id}/`, delete: (id) => `${ENDPOINT}${id}/` },
});

const filters: FilterConfig[] = [
  { key: 'status', label: 'Status', type: 'select', options: [{ value: '', label: 'All' }, { value: 'not_started', label: 'Not Started' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }] },
  { key: 'employee', label: 'Employee', type: 'search', debounceMs: 300 },
];

const createFields: FieldConfig[] = [
  { key: 'goal_name', label: 'Goal Name', type: 'text', required: true, placeholder: 'Enter goal name' },
  { key: 'employee', label: 'Employee', type: 'text', required: true, placeholder: 'Employee ID or name' },
  { key: 'kra', label: 'KRA', type: 'text', placeholder: 'Associated KRA' },
  { key: 'status', label: 'Status', type: 'select', options: [{ value: 'not_started', label: 'Not Started' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }] },
  { key: 'progress_percentage', label: 'Progress %', type: 'number', placeholder: '0' },
];

export default function Goals() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } = useFilterSync({ filters });
  const params = useMemo(() => { const p: Record<string, string | number> = { page, page_size: pageSize }; Object.entries(filterValues).forEach(([k, v]) => { if (v) p[k] = v; }); return p; }, [filterValues, page, pageSize]);
  const queryResult = crud.useList(params);
  const createMutation = crud.useCreate();
  const deleteMutation = crud.useDelete();

  const columns: ColumnDef<Record<string, unknown>>[] = [
    { key: 'goal_name', header: 'Goal', sortable: true },
    { key: 'employee', header: 'Employee', sortable: true },
    { key: 'kra', header: 'KRA', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'progress_percentage', header: 'Progress %', sortable: true },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      render: (_value: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          <EditButton label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} permission="appraisals.delete" />
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
      await api.patch(`${ENDPOINT}${editRecord.id}/`, data);
      setEditRecord(null);
      queryResult.refetch();
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Goals</h1><p className="mt-1 text-sm text-gray-600">Manage employee goals and objectives</p></div>
        <CreateButton label="Create Goal" onClick={() => setShowCreate(true)} />
      </div>
      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columns} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      <CrudModal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Goal" fields={createFields} onSubmit={handleCreate} isLoading={createMutation.isPending} />
      <CrudModal isOpen={!!editRecord} onClose={() => setEditRecord(null)} title="Edit Goal" fields={createFields} onSubmit={handleEdit} isLoading={editLoading} initialValues={editRecord ?? {}} />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { deleteMutation.mutate(deleteId!, { onSuccess: () => setDeleteId(null) }); }}
        title="Delete Record"
        message="Are you sure? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
