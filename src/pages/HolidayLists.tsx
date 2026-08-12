import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

const ENDPOINT = '/api/v1/holidays/holiday-lists/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'holiday-lists',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: (id) => `${ENDPOINT}${id}/`, update: (id) => `${ENDPOINT}${id}/`, delete: (id) => `${ENDPOINT}${id}/` },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'from_date', header: 'From', sortable: true },
  { key: 'to_date', header: 'To', sortable: true },
  { key: 'is_default', header: 'Default', sortable: true, render: (v: unknown) => (v ? 'Yes' : 'No') },
  { key: 'is_active', header: 'Active', sortable: true, render: (v: unknown) => (v ? 'Yes' : 'No') },
];

const filters: FilterConfig[] = [
  { key: 'search', label: 'Search...', type: 'search', debounceMs: 300 },
];

const createFields: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. India 2026 Holidays' },
  { key: 'from_date', label: 'From Date', type: 'date', required: true },
  { key: 'to_date', label: 'To Date', type: 'date', required: true },
  { key: 'department', label: 'Department (optional)', type: 'select', optionsEndpoint: '/api/v1/departments/', optionsLabelKey: 'name' },
  { key: 'is_default', label: 'Default List', type: 'checkbox' },
];

const entryFields: FieldConfig[] = [
  { key: 'description', label: 'Holiday Name', type: 'text', required: true, placeholder: 'e.g. Independence Day' },
  { key: 'holiday_date', label: 'Date', type: 'date', required: true },
];

export default function HolidayLists() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<Record<string, unknown> | null>(null);
  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } = useFilterSync({ filters });
  const params = useMemo(() => { const p: Record<string, string | number> = { page, page_size: pageSize }; Object.entries(filterValues).forEach(([k, v]) => { if (v) p[k] = v; }); return p; }, [filterValues, page, pageSize]);
  const queryResult = crud.useList(params);
  const createMutation = crud.useCreate();
  const deleteMutation = crud.useDelete();

  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...columns,
    { key: 'id', header: 'Actions', sortable: false, render: (_v: unknown, row: Record<string, unknown>) => (
      <div className="flex items-center gap-1">
        <button onClick={() => setSelectedList(row)} className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100">Entries</button>
        <EditButton label="Edit" size="sm" onClick={() => setEditRecord(row)} />
        <DeleteButton label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
      </div>
    )},
  ];

  const handleCreate = (data: Record<string, unknown>) => {
    const payload = { ...data };
    if (!payload.department) delete payload.department;
    createMutation.mutate(payload, { onSuccess: () => setShowCreate(false) });
  };
  const handleEdit = async (data: Record<string, unknown>) => { if (!editRecord) return; setEditLoading(true); try { const payload = { ...data }; if (!payload.department) payload.department = null; await api.patch(`${ENDPOINT}${editRecord.id}/`, payload); setEditRecord(null); queryResult.refetch(); } finally { setEditLoading(false); } };

  if (selectedList) {
    return <HolidayEntries list={selectedList} onBack={() => setSelectedList(null)} />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Holiday Lists</h1><p className="mt-1 text-sm text-gray-600">Manage holiday calendars for the organization</p></div>
        <CreateButton label="Create Holiday List" onClick={() => setShowCreate(true)} />
      </div>
      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}
      <CrudModal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Holiday List" fields={createFields} onSubmit={handleCreate} isLoading={createMutation.isPending} />
      <CrudModal isOpen={!!editRecord} onClose={() => setEditRecord(null)} title="Edit Holiday List" fields={createFields} initialValues={editRecord ?? undefined} onSubmit={handleEdit} isLoading={editLoading} />
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) }); }} title="Delete Holiday List" message="Delete this holiday list and all its entries?" confirmLabel="Delete" variant="destructive" isLoading={deleteMutation.isPending} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Holiday Entries sub-page
// ---------------------------------------------------------------------------

function HolidayEntries({ list, onBack }: { list: Record<string, unknown>; onBack: () => void }) {
  const listId = list.id as string;
  const entriesEndpoint = `${ENDPOINT}${listId}/entries/`;
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['holiday-entries', listId],
    queryFn: async () => {
      const res = await api.get(entriesEndpoint);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (entryData: Record<string, unknown>) => api.post(entriesEndpoint, entryData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holiday-entries', listId] });
      setShowCreate(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => api.delete(`${entriesEndpoint}${entryId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holiday-entries', listId] });
      setDeleteId(null);
    },
  });

  const entries = Array.isArray(data) ? data : data?.results || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          ← Back to Holiday Lists
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{list.name as string}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {list.from_date as string} to {list.to_date as string} · {entries.length} holidays
            </p>
          </div>
          <CreateButton label="Add Holiday" onClick={() => setShowCreate(true)} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-500 border-t-transparent" /></div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">No holidays added yet. Click "Add Holiday" to add entries.</div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Holiday</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {entries.map((entry: Record<string, unknown>) => (
                <tr key={entry.id as string}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {new Date(entry.holiday_date as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' })}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{entry.description as string}</td>
                  <td className="px-4 py-3 text-right">
                    <DeleteButton label="Delete" size="sm" onClick={() => setDeleteId(entry.id as string)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add Holiday Entry"
        fields={entryFields}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
        title="Delete Holiday"
        message="Remove this holiday from the list?"
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
