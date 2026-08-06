import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

const ENDPOINT = '/api/v1/shifts/requests/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'shift-requests',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: (id) => `${ENDPOINT}${id}/`, update: (id) => `${ENDPOINT}${id}/`, delete: (id) => `${ENDPOINT}${id}/` },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'employee_name', header: 'Employee', sortable: true, render: (v: unknown) => (v as string) || '—' },
  { key: 'shift_type_name', header: 'Shift Type', sortable: true, render: (v: unknown) => (v as string) || '—' },
  { key: 'from_date', header: 'From Date', sortable: true },
  { key: 'to_date', header: 'To Date', sortable: true },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (value: unknown) => {
      const status = value as string;
      const config: Record<string, { bg: string; text: string; label: string }> = {
        pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending' },
        approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
        rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      };
      const { bg, text, label } = config[status] ?? { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
          {label}
        </span>
      );
    },
  },
  { key: 'reason', header: 'Reason', sortable: false },
];

const filters: FilterConfig[] = [
  { key: 'status', label: 'Status', type: 'select', options: [{ value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }] },
];

const createFields: FieldConfig[] = [
  { key: 'employee', label: 'Employee', type: 'select', required: true, optionsEndpoint: '/api/v1/employees/', optionsLabelKey: 'full_name' },
  { key: 'from_date', label: 'From Date', type: 'date', required: true },
  { key: 'to_date', label: 'To Date', type: 'date', required: true },
  { key: 'shift_type', label: 'Shift Type', type: 'select', required: true, optionsEndpoint: '/api/v1/shifts/types/' },
  { key: 'reason', label: 'Reason', type: 'textarea', placeholder: 'Reason for shift change' },
];

export default function ShiftRequests() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { hasPermission } = useHrmsPermissionsContext();
  const canManage = hasPermission('attendance.edit') || hasPermission('shifts.edit');

  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } = useFilterSync({ filters });
  const params = useMemo(() => { const p: Record<string, string | number> = { page, page_size: pageSize }; Object.entries(filterValues).forEach(([k, v]) => { if (v) p[k] = v; }); return p; }, [filterValues, page, pageSize]);
  const queryResult = crud.useList(params);
  const createMutation = crud.useCreate();
  const deleteMutation = crud.useDelete();

  const handleApprove = async () => {
    if (!approveId) return;
    setApproveLoading(true);
    try {
      await api.post(`${ENDPOINT}${approveId}/approve/`);
      setApproveId(null);
      queryResult.refetch();
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    setRejectLoading(true);
    try {
      await api.post(`${ENDPOINT}${rejectId}/reject/`, { rejection_reason: rejectReason });
      setRejectId(null);
      setRejectReason('');
      queryResult.refetch();
    } finally {
      setRejectLoading(false);
    }
  };

  const columnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...columns,
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      render: (_value: unknown, row: Record<string, unknown>) => {
        const isPending = row.status === 'pending';
        return (
          <div className="flex items-center gap-1">
            {isPending && canManage && (
              <>
                <button
                  type="button"
                  onClick={() => setApproveId(row.id as string)}
                  className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 hover:bg-green-100 transition-colors"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setRejectId(row.id as string)}
                  className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 hover:bg-red-100 transition-colors"
                >
                  Reject
                </button>
              </>
            )}
            <EditButton label="Edit" size="sm" onClick={() => setEditRecord(row)} />
            <DeleteButton label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
          </div>
        );
      },
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Requests</h1>
          <p className="mt-1 text-sm text-gray-600">Manage employee shift change requests</p>
        </div>
        <CreateButton label="Create Request" onClick={() => setShowCreate(true)} />
      </div>
      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      <CrudModal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Shift Request" fields={createFields} onSubmit={handleCreate} isLoading={createMutation.isPending} />
      <CrudModal isOpen={!!editRecord} onClose={() => setEditRecord(null)} title="Edit Shift Request" fields={createFields} initialValues={editRecord ?? undefined} onSubmit={handleEdit} isLoading={editLoading} />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) }); }}
        title="Delete Request"
        message="Are you sure you want to delete this shift request?"
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />

      {/* Approve Confirmation */}
      <ConfirmDialog
        isOpen={!!approveId}
        onClose={() => setApproveId(null)}
        onConfirm={handleApprove}
        title="Approve Shift Request"
        message="Approving will create a shift assignment for this employee on the requested dates. Continue?"
        confirmLabel="Approve"
        variant="default"
        isLoading={approveLoading}
      />

      {/* Reject Dialog */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setRejectId(null); setRejectReason(''); }} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reject Shift Request</h3>
            <p className="text-sm text-gray-600 mb-4">Please provide a reason for rejecting this shift request.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason..."
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setRejectId(null); setRejectReason(''); }} className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Cancel</button>
              <button type="button" onClick={handleReject} disabled={!rejectReason.trim() || rejectLoading} className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50">
                {rejectLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
