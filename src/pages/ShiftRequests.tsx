import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

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
        pending: { bg: 'bg-warning-lighter', text: 'text-warning-dark', label: 'Pending' },
        approved: { bg: 'bg-success-lighter', text: 'text-success-dark', label: 'Approved' },
        rejected: { bg: 'bg-error-lighter', text: 'text-error-dark', label: 'Rejected' },
      };
      const { bg, text, label } = config[status] ?? { bg: 'bg-surface-neutral', text: 'text-ink-primary', label: status };
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
  const canApprove = hasPermission('shift_requests.approve');
  const canReject = hasPermission('shift_requests.reject');
  const isApproverOrAdmin = canApprove || canReject;
  const [viewTab, setViewTab] = useState<'mine' | 'approvals'>(isApproverOrAdmin ? 'approvals' : 'mine');

  const { data: currentEmployee } = useQuery({
    queryKey: ['employee', 'me'],
    queryFn: async () => {
      const response = await api.get<{ id: number; full_name?: string }>('/api/v1/employees/me/');
      return response.data;
    },
  });

  const { filterValues, setFilter, clearFilters, page, pageSize, setPage, setPageSize } = useFilterSync({ filters });
  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, page_size: pageSize };
    if (isApproverOrAdmin) {
      if (viewTab === 'mine') p.mine = 'true';
      else if (viewTab === 'approvals') p.approvals = 'true';
    } else {
      p.mine = 'true';
    }
    Object.entries(filterValues).forEach(([k, v]) => {
      if (v) p[k] = v;
    });
    return p;
  }, [filterValues, page, pageSize, viewTab, isApproverOrAdmin]);

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
        const isOwn = currentEmployee && (row.employee === currentEmployee.id || row.employee_id === currentEmployee.id);
        const canApproveThis = canApprove && !isOwn;
        const canRejectThis = canReject && !isOwn;

        return (
          <div className="flex items-center gap-1">
            {isPending && (
              <>
                {canApproveThis && (
                  <button
                    type="button"
                    onClick={() => setApproveId(row.id as string)}
                    className="inline-flex items-center gap-1 rounded-md bg-success-lighter px-2 py-1 text-xs font-medium text-success-dark ring-1 ring-inset ring-success-main/20 hover:bg-success-lighter transition-colors"
                  >
                    Approve
                  </button>
                )}
                {canRejectThis && (
                  <button
                    type="button"
                    onClick={() => setRejectId(row.id as string)}
                    className="inline-flex items-center gap-1 rounded-md bg-error-lighter px-2 py-1 text-xs font-medium text-error-dark ring-1 ring-inset ring-error-main/20 hover:bg-error-lighter transition-colors"
                  >
                    Reject
                  </button>
                )}
              </>
            )}
            <EditButton permission="shift_requests.create" label="Edit" size="sm" onClick={() => setEditRecord(row)} />
            <DeleteButton permission="shift_requests.create" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
          </div>
        );
      },
    },
  ];

  const handleCreate = (data: Record<string, unknown>) => {
    const payload = { ...data };
    if (!payload.employee && currentEmployee?.id) {
      payload.employee = currentEmployee.id;
    }
    createMutation.mutate(payload, { onSuccess: () => setShowCreate(false) });
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
          <h1 className="text-2xl font-bold text-ink-primary">Shift Requests</h1>
          <p className="mt-1 text-sm text-ink-secondary">Manage employee shift change requests</p>
        </div>
        <CreateButton permission="shift_requests.create" label="Create Request" onClick={() => setShowCreate(true)} />
      </div>

      {isApproverOrAdmin && (
        <div className="mb-4 border-b border-divider" role="tablist">
          <nav className="-mb-px flex gap-4">
            <button
              type="button"
              role="tab"
              aria-selected={viewTab === 'mine'}
              onClick={() => { setViewTab('mine'); setPage(1); }}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                viewTab === 'mine'
                  ? 'border-primary-main text-primary-main font-semibold'
                  : 'border-transparent text-ink-secondary hover:border-divider hover:text-ink-primary'
              }`}
            >
              My Requests
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewTab === 'approvals'}
              onClick={() => { setViewTab('approvals'); setPage(1); }}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                viewTab === 'approvals'
                  ? 'border-primary-main text-primary-main font-semibold'
                  : 'border-transparent text-ink-secondary hover:border-divider hover:text-ink-primary'
              }`}
            >
              Team Approvals
            </button>
          </nav>
        </div>
      )}

      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Shift Request"
        fields={createFields}
        initialValues={currentEmployee?.id ? { employee: currentEmployee.id } : undefined}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />
      <CrudModal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        title="Edit Shift Request"
        fields={createFields}
        initialValues={editRecord ?? undefined}
        onSubmit={handleEdit}
        isLoading={editLoading}
      />

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
        <Modal open onClose={() => { setRejectId(null); setRejectReason(''); }} labelledBy="ShiftRequests-modal-title-1" closeOnEscape={false}>
          <div className="relative z-10 w-full max-w-md rounded-xl bg-surface-paper p-6 shadow-xl">
            <h3 id="ShiftRequests-modal-title-1" className="text-lg font-semibold text-ink-primary mb-2">Reject Shift Request</h3>
            <p className="text-sm text-ink-secondary mb-4">Please provide a reason for rejecting this shift request.</p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason..."
              rows={3}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setRejectId(null); setRejectReason(''); }} className="rounded-md px-3 py-2 text-sm font-medium text-ink-primary hover:bg-surface-neutral">Cancel</button>
              <Button color="error" type="button" onClick={handleReject} disabled={!rejectReason.trim() || rejectLoading}>
                {rejectLoading ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
