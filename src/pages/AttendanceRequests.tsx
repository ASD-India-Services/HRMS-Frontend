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
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Iconify } from '@/components/Iconify';

const ENDPOINT = '/api/v1/attendance/requests/';
const crud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'attendance-requests',
  endpoints: { list: ENDPOINT, create: ENDPOINT, detail: (id) => `${ENDPOINT}${id}/`, update: (id) => `${ENDPOINT}${id}/`, delete: (id) => `${ENDPOINT}${id}/` },
});

const columns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'employee_name', header: 'Employee', sortable: true, render: (v: unknown) => (v as string) || '—' },
  { key: 'attendance_date', header: 'Date', sortable: true },
  { key: 'check_in_time', header: 'Check In', sortable: true },
  { key: 'check_out_time', header: 'Check Out', sortable: true },
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
  { key: 'attendance_date', label: 'Attendance Date', type: 'date', required: true },
  { key: 'check_in_time', label: 'Check In Time', type: 'text', placeholder: 'HH:MM (e.g., 09:00)' },
  { key: 'check_out_time', label: 'Check Out Time', type: 'text', placeholder: 'HH:MM (e.g., 18:00)' },
  { key: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'Reason for attendance correction' },
];

export default function AttendanceRequests() {
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
  const canApprove = hasPermission('attendance_requests.approve');
  const canReject = hasPermission('attendance_requests.reject');
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
                  <Button size="small" variant="soft" color="success" startIcon={<Iconify icon="check" width={16} />} onClick={() => setApproveId(row.id as string)}>
                    Approve
                  </Button>
                )}
                {canRejectThis && (
                  <Button size="small" variant="soft" color="error" startIcon={<Iconify icon="close" width={16} />} onClick={() => setRejectId(row.id as string)}>
                    Reject
                  </Button>
                )}
              </>
            )}
            <EditButton permission="attendance_requests.create" label="Edit" size="sm" onClick={() => setEditRecord(row)} />
            <DeleteButton permission="attendance_requests.create" label="Delete" size="sm" onClick={() => setDeleteId(row.id as string)} />
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
    createMutation.mutate(payload, {
      onSuccess: () => setShowCreate(false),
    });
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
    <PageContainer>
      <PageHeader title="Attendance Requests" subtitle="Manage attendance correction requests" actions={<CreateButton permission="attendance_requests.create" label="Create Request" onClick={() => setShowCreate(true)} />} />

      {isApproverOrAdmin && (
        <Tabs
          aria-label="Request views"
          items={[
            { value: 'mine', label: 'My Requests' },
            { value: 'approvals', label: 'Team Approvals' },
          ]}
          value={viewTab}
          onChange={(v) => { setViewTab(v); setPage(1); }}
        />
      )}

      <FilterBar filters={filters} values={filterValues} onChange={setFilter} onClearAll={clearFilters} />
      <DataTable queryResult={queryResult} columns={columnsWithActions} />
      {queryResult.data && queryResult.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={queryResult.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      {/* Create Modal */}
      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Attendance Request"
        fields={createFields}
        initialValues={currentEmployee?.id ? { employee: currentEmployee.id } : undefined}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      {/* Edit Modal */}
      <CrudModal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        title="Edit Attendance Request"
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

      {/* Approve Confirmation */}
      <ConfirmDialog
        isOpen={!!approveId}
        onClose={() => setApproveId(null)}
        onConfirm={handleApprove}
        title="Approve Request"
        message="Are you sure you want to approve this attendance request? This will create or update the attendance record for the requested date."
        confirmLabel="Approve"
        variant="default"
        isLoading={approveLoading}
      />

      {/* Reject Dialog */}
      {rejectId && (
        <Modal open onClose={() => { setRejectId(null); setRejectReason(''); }} labelledBy="AttendanceRequests-modal-title-1" closeOnEscape={false}>
          <div className="relative z-10 w-full max-w-md rounded-xl bg-surface-paper p-6 shadow-xl">
            <h3 id="AttendanceRequests-modal-title-1" className="text-lg font-semibold text-ink-primary mb-2">Reject Request</h3>
            <p className="text-sm text-ink-secondary mb-4">
              Please provide a reason for rejecting this attendance request.
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason..."
              rows={3}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="text" color="inherit" onClick={() => { setRejectId(null); setRejectReason(''); }}>Cancel</Button>
              <Button color="error"
                type="button"
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejectLoading}
              >
                {rejectLoading ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
