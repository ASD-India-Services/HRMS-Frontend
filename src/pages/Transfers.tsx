import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

const ENDPOINT = '/api/v1/employee-transfers/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'employee-transfers',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: (id) => `${ENDPOINT}${id}/`, update: (id) => `${ENDPOINT}${id}/`, delete: (id) => `${ENDPOINT}${id}/` },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'employee_name', header: 'Employee', sortable: true },
  { key: 'new_department_name', header: 'To Department', sortable: true },
  { key: 'new_designation_name', header: 'To Designation', sortable: true },
  { key: 'new_branch_name', header: 'To Branch', sortable: true },
  { key: 'effective_date', header: 'Effective Date', sortable: true },
  { key: 'status', header: 'Status', sortable: true },
];

const filters: FilterConfig[] = [
  { key: 'search', label: 'Search...', type: 'search', debounceMs: 300 },
  { key: 'status', label: 'Status', type: 'select', options: [{ value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'completed', label: 'Completed' }] },
];

const createFields: FieldConfig[] = [
  { key: 'employee', label: 'Employee', type: 'select', required: true, optionsEndpoint: '/api/v1/employees/', optionsLabelKey: 'full_name' },
  { key: 'new_department', label: 'To Department', type: 'select', required: true, optionsEndpoint: '/api/v1/departments/' },
  { key: 'new_designation', label: 'To Designation', type: 'select', optionsEndpoint: '/api/v1/designations/', optionsLabelKey: 'title' },
  { key: 'new_branch', label: 'To Branch', type: 'select', optionsEndpoint: '/api/v1/branches/' },
  { key: 'effective_date', label: 'Effective Date', type: 'date', required: true },
];

export default function Transfers() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [processMessage, setProcessMessage] = useState<string | null>(null);
  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } = useFilterSync({ filters });
  const params = useMemo(() => { const p: Record<string, string | number> = { page, page_size: pageSize }; Object.entries(filterValues).forEach(([k, v]) => { if (v) p[k] = v; }); return p; }, [filterValues, page, pageSize]);
  const queryResult = crud.useList(params);
  const createMutation = crud.useCreate();
  const deleteMutation = crud.useDelete();

  const handleApproveRow = async (id: string) => {
    setApprovingId(id);
    setProcessMessage(null);
    try {
      const res = await api.post(`/api/v1/employee-transfers/${id}/approve/`);
      setProcessMessage(res.data?.message || 'Transfer approved');
      queryResult.refetch();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setProcessMessage(error.response?.data?.detail || 'Error approving transfer');
    } finally {
      setApprovingId(null);
      setTimeout(() => setProcessMessage(null), 5000);
    }
  };


  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...columns,
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      render: (_value: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          {row.status === 'pending' && (
            <button
              onClick={() => handleApproveRow(row.id as string)}
              disabled={approvingId === row.id}
              className="inline-flex items-center rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {approvingId === row.id ? '...' : 'Approve'}
            </button>
          )}
          {row.status === 'completed' && (
            <span className="inline-flex items-center rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
              ✓ Done
            </span>
          )}
          <EditButton permission="transfers.edit" label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton permission="transfers.delete" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
        </div>
      ),
    },
  ];

  const handleCreate = (data: Record<string, unknown>) => {
    createMutation.mutate(data, {
      onSuccess: () => setShowCreate(false),
    });
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      await api.patch(`/api/v1/employee-transfers/${editRecord.id}/`, data);
      setEditRecord(null);
      queryResult.refetch();
    } finally {
      setEditLoading(false);
    }
  };


  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Employee Transfers</h1><p className="mt-1 text-sm text-gray-600">Manage employee department and location transfers</p></div>
        <CreateButton permission="transfers.create" label="Create Transfer" onClick={() => setShowCreate(true)} />
      </div>
      {processMessage && (
        <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
          {processMessage}
        </div>
      )}
      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Employee Transfer"
        fields={createFields}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      {/* Edit Modal */}
      <CrudModal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        title="Edit"
        fields={createFields}
        initialValues={editRecord ?? undefined}
        onSubmit={handleEdit}
        isLoading={editLoading}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, {
              onSuccess: () => setDeleteId(null),
            });
          }
        }}
        title="Delete Record"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
