import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

const ENDPOINT = '/api/v1/expenses/types/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'expense-types',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: (id) => `${ENDPOINT}${id}/`, update: (id) => `${ENDPOINT}${id}/`, delete: (id) => `${ENDPOINT}${id}/` },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'description', header: 'Description', sortable: false },
  { key: 'max_amount', header: 'Max Amount', sortable: true, render: (v: unknown) => v ? `₹${v}` : '—' },
  { key: 'is_active', header: 'Active', sortable: true, render: (v: unknown) => (v ? 'Yes' : 'No') },
];

const filters: FilterConfig[] = [
  { key: 'search', label: 'Search...', type: 'search', debounceMs: 300 },
];

const createFields: FieldConfig[] = [
  { key: 'name', label: 'Type Name', type: 'text', required: true, placeholder: 'e.g. Travel, Meals, Office Supplies' },
  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe what this type covers' },
  { key: 'max_amount', label: 'Max Claimable Amount (optional)', type: 'number', placeholder: 'Leave empty for no limit' },
  { key: 'is_active', label: 'Active', type: 'checkbox' },
];

export default function ExpenseTypes() {
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
    {
      key: 'id', header: 'Actions', sortable: false,
      render: (_v: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          <EditButton permission="expense_types.edit" label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton permission="expense_types.delete" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Types</h1>
          <p className="mt-1 text-sm text-gray-600">Define categories of expenses employees can claim</p>
        </div>
        <CreateButton permission="expense_types.create" label="Create Expense Type" onClick={() => setShowCreate(true)} />
      </div>
      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      <CrudModal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Expense Type" fields={createFields} onSubmit={(data) => createMutation.mutate(data, { onSuccess: () => setShowCreate(false) })} isLoading={createMutation.isPending} initialValues={{ is_active: true }} />
      <CrudModal isOpen={!!editRecord} onClose={() => setEditRecord(null)} title="Edit Expense Type" fields={createFields} onSubmit={async (data) => { await api.patch(`${ENDPOINT}${editRecord!.id}/`, data); setEditRecord(null); queryResult.refetch(); }} isLoading={editLoading} initialValues={editRecord ?? {}} />
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMutation.mutate(deleteId!, { onSuccess: () => setDeleteId(null) })} title="Delete Expense Type" message="Are you sure? Existing claims using this type will be affected." confirmLabel="Delete" variant="destructive" isLoading={deleteMutation.isPending} />
    </div>
  );
}
