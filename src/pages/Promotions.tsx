import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

const ENDPOINT = '/api/v1/employee-promotions/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'employee-promotions',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: (id) => `${ENDPOINT}${id}/`, update: (id) => `${ENDPOINT}${id}/`, delete: (id) => `${ENDPOINT}${id}/` },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'employee_name', header: 'Employee', sortable: true },
  { key: 'from_designation_name', header: 'From Designation', sortable: true },
  { key: 'new_designation_name', header: 'To Designation', sortable: true },
  { key: 'new_grade_name', header: 'New Grade', sortable: true },
  { key: 'effective_date', header: 'Promotion Date', sortable: true },
  { key: 'status', header: 'Status', sortable: true },
];

const filters: FilterConfig[] = [
  { key: 'search', label: 'Search...', type: 'search', debounceMs: 300 },
];

const createFields: FieldConfig[] = [
  { key: 'employee', label: 'Employee', type: 'select', required: true, optionsEndpoint: '/api/v1/employees/', optionsLabelKey: 'full_name' },
  { key: 'from_designation', label: 'From Designation', type: 'select', required: false, optionsEndpoint: '/api/v1/designations/', optionsLabelKey: 'name' },
  { key: 'new_designation', label: 'To Designation', type: 'select', required: true, optionsEndpoint: '/api/v1/designations/', optionsLabelKey: 'name' },
  { key: 'new_department', label: 'New Department', type: 'select', required: false, optionsEndpoint: '/api/v1/departments/', optionsLabelKey: 'name' },
  { key: 'new_grade', label: 'New Grade', type: 'select', required: false, optionsEndpoint: '/api/v1/employee-grades/', optionsLabelKey: 'name' },
  { key: 'revised_base_amount', label: 'New Base Pay', type: 'text', required: false, placeholder: 'Leave empty to keep current base pay' },
  { key: 'effective_date', label: 'Effective Date', type: 'date', required: true },
];

export default function Promotions() {
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
      const res = await api.post(`/api/v1/employee-promotions/${id}/approve/`);
      setProcessMessage(res.data?.message || 'Promotion approved');
      queryResult.refetch();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setProcessMessage(error.response?.data?.detail || 'Error approving promotion');
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
          <EditButton permission="promotions.edit" label="Edit" size="sm" onClick={() => setEditRecord(row)} />
          <DeleteButton permission="promotions.delete" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
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
      await api.patch(`/api/v1/employee-promotions/${editRecord.id}/`, data);
      setEditRecord(null);
      queryResult.refetch();
    } finally {
      setEditLoading(false);
    }
  };


  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Employee Promotions</h1><p className="mt-1 text-sm text-gray-600">Track and manage employee promotions</p></div>
        <CreateButton permission="promotions.create" label="Create Promotion" onClick={() => setShowCreate(true)} />
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
        title="Create Employee Promotion"
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
