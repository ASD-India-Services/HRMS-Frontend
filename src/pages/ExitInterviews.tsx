import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { CreateButton, EditButton, DeleteButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Iconify } from '@/components/Iconify';
import { cx } from '@/components/ui/cx';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { useUser } from '@platform/auth-sdk';
import { useHRSettings } from '@/hooks/useHRSettings';
import { formatDate } from '@/utils/formatters';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { FieldConfig } from '@/components/CrudModal';

// ─── Endpoints ──────────────────────────────────────────────────────────────────
const EXIT_INTERVIEWS_ENDPOINT = '/api/v1/exit-interviews/';
const RESIGNATION_ENDPOINT = '/api/v1/resignation-requests/';

const exitInterviewCrud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'exit-interviews',
  endpoints: {
    list: EXIT_INTERVIEWS_ENDPOINT,
    create: EXIT_INTERVIEWS_ENDPOINT,
    detail: (id) => `${EXIT_INTERVIEWS_ENDPOINT}${id}/`,
    update: (id) => `${EXIT_INTERVIEWS_ENDPOINT}${id}/`,
    delete: (id) => `${EXIT_INTERVIEWS_ENDPOINT}${id}/`,
  },
});

const resignationCrud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'resignation-requests',
  endpoints: {
    list: RESIGNATION_ENDPOINT,
    create: RESIGNATION_ENDPOINT,
    detail: (id) => `${RESIGNATION_ENDPOINT}${id}/`,
    update: (id) => `${RESIGNATION_ENDPOINT}${id}/`,
    delete: (id) => `${RESIGNATION_ENDPOINT}${id}/`,
  },
});

// ─── Exit Interview Columns & Form ──────────────────────────────────────────────
const exitInterviewColumns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'employee_name', header: 'Employee', sortable: true },
  { key: 'interview_date', header: 'Interview Date', sortable: true, render: (v) => formatDate(v as string) },
  { key: 'interviewer_name', header: 'Interviewer', sortable: true },
  { key: 'overall_experience_rating', header: 'Rating', sortable: true },
  { key: 'would_recommend', header: 'Would Recommend', sortable: true, render: (v: unknown) => (v ? 'Yes' : 'No') },
];

const exitInterviewFilters: FilterConfig[] = [
  { key: 'search', label: 'Search interviews...', type: 'search', debounceMs: 300 },
];

const exitInterviewFields: FieldConfig[] = [
  { key: 'employee', label: 'Employee', type: 'select', required: true, optionsEndpoint: '/api/v1/employees/', optionsLabelKey: 'full_name' },
  { key: 'interview_date', label: 'Interview Date', type: 'date', required: true },
  { key: 'interviewer', label: 'Interviewer', type: 'select', required: true, optionsEndpoint: '/api/v1/employees/', optionsLabelKey: 'full_name' },
  { key: 'separation_reason', label: 'Separation Reason', type: 'text', required: true, placeholder: 'e.g. Better opportunity, Relocation' },
  { key: 'overall_experience_rating', label: 'Rating (1-5)', type: 'number', placeholder: '1-5' },
  { key: 'would_recommend', label: 'Would Recommend', type: 'checkbox' },
];

// ─── Resignation Filters ────────────────────────────────────────────────────────
const resignationFilters: FilterConfig[] = [
  { key: 'search', label: 'Search resignations...', type: 'search', debounceMs: 300 },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'All Statuses', value: '' },
      { label: 'Pending', value: 'pending' },
      { label: 'Approved', value: 'approved' },
      { label: 'Rejected', value: 'rejected' },
      { label: 'Cancelled', value: 'cancelled' },
    ],
  },
];

export default function ExitInterviews() {
  const queryClient = useQueryClient();
  const { hasPermission, roleName } = useHrmsPermissionsContext();
  const { role: authRole } = useUser();
  const { data: hrSettings } = useHRSettings();

  const normalizedRole = (roleName || authRole || '').toLowerCase().trim();
  const isAdminOrHr =
    normalizedRole === 'org_admin' ||
    normalizedRole === 'admin' ||
    normalizedRole === 'administrator' ||
    normalizedRole === 'org admin' ||
    normalizedRole === 'superadmin' ||
    normalizedRole === 'hr' ||
    normalizedRole === 'hr_manager' ||
    normalizedRole === 'hr manager';

  const canApproveResignation = isAdminOrHr || hasPermission('resignation.approve');
  const canCreateResignation = isAdminOrHr || hasPermission('resignation.create');
  const canDeleteResignation = isAdminOrHr || hasPermission('resignation.delete');

  // Tab: 'resignations' | 'exit_interviews'
  const [activeTab, setActiveTab] = useState<'resignations' | 'exit_interviews'>('resignations');

  // Scope toggle for resignations: 'all' | 'mine'
  const [resignationScope, setResignationScope] = useState<'all' | 'mine'>(canApproveResignation ? 'all' : 'mine');

  // Exit Interviews state
  const [showCreateInterview, setShowCreateInterview] = useState(false);
  const [editInterviewRecord, setEditInterviewRecord] = useState<Record<string, unknown> | null>(null);
  const [editInterviewLoading, setEditInterviewLoading] = useState(false);
  const [deleteInterviewId, setDeleteInterviewId] = useState<string | null>(null);

  // Resignation Requests state
  const defaultNoticePeriod = hrSettings?.notice_period_days ?? 30;
  const [showCreateResignation, setShowCreateResignation] = useState(false);
  const [newResignationForm, setNewResignationForm] = useState({
    employee: '',
    resignation_date: new Date().toISOString().split('T')[0],
    notice_period_days: defaultNoticePeriod,
    requested_relieving_date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + defaultNoticePeriod);
      return d.toISOString().split('T')[0];
    })(),
    reason: '',
  });

  const handleOpenCreateResignation = () => {
    const today = new Date();
    const noticeDays = hrSettings?.notice_period_days ?? 30;
    const relieving = new Date(today);
    relieving.setDate(relieving.getDate() + noticeDays);
    setNewResignationForm({
      employee: '',
      resignation_date: today.toISOString().split('T')[0],
      notice_period_days: noticeDays,
      requested_relieving_date: relieving.toISOString().split('T')[0],
      reason: '',
    });
    setShowCreateResignation(true);
  };

  const handleSelectEmployee = (empId: string) => {
    const selectedEmp = employeesList?.results?.find((e: any) => String(e.id) === String(empId));
    const noticeDays = (selectedEmp as any)?.notice_period_days || hrSettings?.notice_period_days || 30;
    const baseDate = newResignationForm.resignation_date ? new Date(newResignationForm.resignation_date) : new Date();
    baseDate.setDate(baseDate.getDate() + noticeDays);
    setNewResignationForm((p) => ({
      ...p,
      employee: empId,
      notice_period_days: noticeDays,
      requested_relieving_date: baseDate.toISOString().split('T')[0],
    }));
  };

  const [approveRecord, setApproveRecord] = useState<Record<string, unknown> | null>(null);
  const [approvedRelievingDate, setApprovedRelievingDate] = useState('');
  const [approveComments, setApproveComments] = useState('');
  const [approveSubmitting, setApproveSubmitting] = useState(false);

  const [rejectRecord, setRejectRecord] = useState<Record<string, unknown> | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const [cancelRecord, setCancelRecord] = useState<Record<string, unknown> | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Exit interview list query
  const interviewFilterSync = useFilterSync({ filters: exitInterviewFilters });
  const interviewParams = useMemo(() => {
    const p: Record<string, string | number> = {
      page: interviewFilterSync.page,
      page_size: interviewFilterSync.pageSize,
    };
    Object.entries(interviewFilterSync.filterValues).forEach(([k, v]) => {
      if (v) p[k] = v;
    });
    return p;
  }, [interviewFilterSync.filterValues, interviewFilterSync.page, interviewFilterSync.pageSize]);
  const interviewQueryResult = exitInterviewCrud.useList(interviewParams);
  const createInterviewMutation = exitInterviewCrud.useCreate();
  const deleteInterviewMutation = exitInterviewCrud.useDelete();

  // Resignation requests list query
  const resignationFilterSync = useFilterSync({ filters: resignationFilters });
  const resignationParams = useMemo(() => {
    const p: Record<string, string | number> = {
      page: resignationFilterSync.page,
      page_size: resignationFilterSync.pageSize,
    };
    if (resignationScope === 'mine') {
      p.mine = 'true';
    }
    Object.entries(resignationFilterSync.filterValues).forEach(([k, v]) => {
      if (v) p[k] = v;
    });
    return p;
  }, [resignationFilterSync.filterValues, resignationFilterSync.page, resignationFilterSync.pageSize, resignationScope]);
  const resignationQueryResult = resignationCrud.useList(resignationParams);

  // Fetch employees list for Admin create resignation
  const { data: employeesList } = useQuery<{ results?: Array<{ id: string; full_name: string }> }>({
    queryKey: ['employees', 'compact'],
    queryFn: async () => {
      const res = await api.get('/api/v1/employees/?page_size=200');
      return res.data;
    },
    enabled: showCreateResignation && isAdminOrHr,
  });

  // Handle notice period days change to auto-update requested relieving date
  const handleNoticeDaysChange = (days: number) => {
    const baseDate = newResignationForm.resignation_date ? new Date(newResignationForm.resignation_date) : new Date();
    baseDate.setDate(baseDate.getDate() + (days || 0));
    setNewResignationForm((prev) => ({
      ...prev,
      notice_period_days: days,
      requested_relieving_date: baseDate.toISOString().split('T')[0],
    }));
  };

  const handleResignationDateChange = (date: string) => {
    const baseDate = date ? new Date(date) : new Date();
    baseDate.setDate(baseDate.getDate() + (newResignationForm.notice_period_days || 0));
    setNewResignationForm((prev) => ({
      ...prev,
      resignation_date: date,
      requested_relieving_date: baseDate.toISOString().split('T')[0],
    }));
  };

  // Submit resignation mutation
  const createResignationMutation = useMutation({
    mutationFn: async (payload: typeof newResignationForm) => {
      const body: Record<string, unknown> = {
        resignation_date: payload.resignation_date,
        notice_period_days: payload.notice_period_days,
        requested_relieving_date: payload.requested_relieving_date,
        reason: payload.reason,
      };
      if (isAdminOrHr && payload.employee) {
        body.employee = payload.employee;
      }
      const res = await api.post(RESIGNATION_ENDPOINT, body);
      return res.data;
    },
    onSuccess: () => {
      setShowCreateResignation(false);
      setNewResignationForm({
        employee: '',
        resignation_date: new Date().toISOString().split('T')[0],
        notice_period_days: 30,
        requested_relieving_date: (() => {
          const d = new Date();
          d.setDate(d.getDate() + 30);
          return d.toISOString().split('T')[0];
        })(),
        reason: '',
      });
      resignationQueryResult.refetch();
      queryClient.invalidateQueries({ queryKey: ['resignation-requests'] });
    },
  });

  // Approve action
  const handleApproveConfirm = async () => {
    if (!approveRecord) return;
    setApproveSubmitting(true);
    try {
      await api.post(`${RESIGNATION_ENDPOINT}${approveRecord.id}/approve/`, {
        approved_relieving_date: approvedRelievingDate || approveRecord.requested_relieving_date,
        comments: approveComments,
      });
      setApproveRecord(null);
      resignationQueryResult.refetch();
      queryClient.invalidateQueries({ queryKey: ['resignation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    } finally {
      setApproveSubmitting(false);
    }
  };

  // Reject action
  const handleRejectConfirm = async () => {
    if (!rejectRecord) return;
    if (!rejectionReason.trim()) return;
    setRejectSubmitting(true);
    try {
      await api.post(`${RESIGNATION_ENDPOINT}${rejectRecord.id}/reject/`, {
        reason: rejectionReason.trim(),
      });
      setRejectRecord(null);
      setRejectionReason('');
      resignationQueryResult.refetch();
      queryClient.invalidateQueries({ queryKey: ['resignation-requests'] });
    } finally {
      setRejectSubmitting(false);
    }
  };

  // Cancel action
  const handleCancelConfirm = async () => {
    if (!cancelRecord) return;
    setCancelSubmitting(true);
    try {
      await api.post(`${RESIGNATION_ENDPOINT}${cancelRecord.id}/cancel/`);
      setCancelRecord(null);
      resignationQueryResult.refetch();
      queryClient.invalidateQueries({ queryKey: ['resignation-requests'] });
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Exit Interview action handlers
  const handleCreateInterview = (data: Record<string, unknown>) => {
    createInterviewMutation.mutate(data, {
      onSuccess: () => setShowCreateInterview(false),
    });
  };

  const handleEditInterview = async (data: Record<string, unknown>) => {
    if (!editInterviewRecord) return;
    setEditInterviewLoading(true);
    try {
      await api.patch(`${EXIT_INTERVIEWS_ENDPOINT}${editInterviewRecord.id}/`, data);
      setEditInterviewRecord(null);
      interviewQueryResult.refetch();
    } finally {
      setEditInterviewLoading(false);
    }
  };

  // ─── Resignation Columns Def ──────────────────────────────────────────────────
  const resignationColumns: ColumnDef<Record<string, unknown>>[] = [
    {
      key: 'employee_name',
      header: 'Employee',
      sortable: true,
      render: (_v, row) => (
        <div>
          <p className="font-semibold text-ink-primary">{(row.employee_name as string) || 'Employee'}</p>
          <p className="text-xs text-ink-secondary">{(row.department_name as string) || (row.employee_number as string) || '--'}</p>
        </div>
      ),
    },
    {
      key: 'resignation_date',
      header: 'Submitted On',
      sortable: true,
      render: (v) => formatDate(v as string),
    },
    {
      key: 'notice_period_days',
      header: 'Notice Period',
      sortable: true,
      render: (v) => `${v ?? 30} days`,
    },
    {
      key: 'requested_relieving_date',
      header: 'Requested Last Day',
      sortable: true,
      render: (v) => formatDate(v as string),
    },
    {
      key: 'approved_relieving_date',
      header: 'Approved Last Day',
      sortable: true,
      render: (v) => (v ? formatDate(v as string) : '--'),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (v) => {
        const status = String(v || 'pending').toLowerCase();
        const styles: Record<string, string> = {
          pending: 'bg-warning-lighter text-warning-dark border-warning-light',
          approved: 'bg-success-lighter text-success-dark border-success-light',
          rejected: 'bg-error-lighter text-error-dark border-error-light',
          cancelled: 'bg-surface-neutral text-ink-secondary border-divider',
        };
        return (
          <span className={cx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize', styles[status] || styles.pending)}>
            {status}
          </span>
        );
      },
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (v) => <p className="max-w-xs truncate text-xs text-ink-secondary" title={v as string}>{v as string}</p>,
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      render: (_v, row) => {
        const isPending = row.status === 'pending';
        return (
          <div className="flex items-center gap-1.5">
            {isPending && canApproveResignation && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs px-2 py-1"
                  onClick={() => {
                    setApproveRecord(row);
                    setApprovedRelievingDate((row.requested_relieving_date as string) || (row.resignation_date as string) || '');
                    setApproveComments('');
                  }}
                >
                  Approve
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  className="border-rose-600 text-rose-700 hover:bg-rose-50 text-xs px-2 py-1"
                  onClick={() => {
                    setRejectRecord(row);
                    setRejectionReason('');
                  }}
                >
                  Reject
                </Button>
              </>
            )}
            {isPending && (
              <Button
                size="small"
                variant="text"
                className="text-xs text-ink-secondary hover:text-ink-primary px-1.5"
                onClick={() => setCancelRecord(row)}
              >
                Cancel
              </Button>
            )}
            {canDeleteResignation && !isPending && (
              <DeleteButton
                permission="resignation.delete"
                label=""
                size="sm"
                onClick={() => setCancelRecord(row)}
              />
            )}
          </div>
        );
      },
    },
  ];

  const interviewColumnsWithActions: ColumnDef<Record<string, unknown>>[] = [
    ...exitInterviewColumns,
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      render: (_value: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-1">
          <EditButton permission="exit_interviews.edit" label="Edit" size="sm" onClick={() => setEditInterviewRecord(row)} />
          <DeleteButton permission="exit_interviews.delete" label="Delete" size="sm" onClick={() => setDeleteInterviewId(row.id as string)} />
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={activeTab === 'resignations' ? 'Resignation Requests' : 'Exit Interviews'}
        subtitle={
          activeTab === 'resignations'
            ? 'Review, approve, and track employee resignation requests and notice periods.'
            : 'Manage employee exit interview records and separation evaluations.'
        }
        actions={
          activeTab === 'resignations' ? (
            canCreateResignation && (isAdminOrHr || hrSettings?.resignation_request) && (
              <Button
                startIcon={<Iconify icon="plus" />}
                onClick={handleOpenCreateResignation}
              >
                Submit Resignation Request
              </Button>
            )
          ) : (
            <CreateButton
              permission="exit_interviews.create"
              label="Create Interview"
              onClick={() => setShowCreateInterview(true)}
            />
          )
        }
      />

      {/* Tabs */}
      <div className="mb-6 flex border-b border-divider">
        <button
          type="button"
          className={cx(
            'flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'resignations'
              ? 'border-primary-main text-primary-main'
              : 'border-transparent text-ink-secondary hover:text-ink-primary hover:border-grey-300'
          )}
          onClick={() => setActiveTab('resignations')}
        >
          <Iconify icon="leaves" width={18} />
          <span>Resignation Requests</span>
        </button>

        <button
          type="button"
          className={cx(
            'flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'exit_interviews'
              ? 'border-primary-main text-primary-main'
              : 'border-transparent text-ink-secondary hover:text-ink-primary hover:border-grey-300'
          )}
          onClick={() => setActiveTab('exit_interviews')}
        >
          <Iconify icon="employees" width={18} />
          <span>Exit Interviews</span>
        </button>
      </div>

      {/* ─── TAB 1: Resignation Requests ─────────────────────────────────────── */}
      {activeTab === 'resignations' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <FilterBar
              filters={resignationFilters}
              values={resignationFilterSync.filterValues}
              onChange={resignationFilterSync.setFilter}
              onClearAll={resignationFilterSync.clearFilters}
            />

            {canApproveResignation && (
              <div className="flex items-center rounded-lg border border-divider bg-surface-paper p-1 shrink-0">
                <button
                  type="button"
                  className={cx(
                    'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                    resignationScope === 'all'
                      ? 'bg-primary-lighter text-primary-dark font-bold'
                      : 'text-ink-secondary hover:text-ink-primary'
                  )}
                  onClick={() => setResignationScope('all')}
                >
                  All Requests
                </button>
                <button
                  type="button"
                  className={cx(
                    'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                    resignationScope === 'mine'
                      ? 'bg-primary-lighter text-primary-dark font-bold'
                      : 'text-ink-secondary hover:text-ink-primary'
                  )}
                  onClick={() => setResignationScope('mine')}
                >
                  My Requests
                </button>
              </div>
            )}
          </div>

          <DataTable queryResult={resignationQueryResult} columns={resignationColumns} />
          {resignationQueryResult.data && resignationQueryResult.data.count > 0 && (
            <Pagination
              page={resignationFilterSync.page}
              pageSize={resignationFilterSync.pageSize}
              totalCount={resignationQueryResult.data.count}
              onPageChange={resignationFilterSync.setPage}
              onPageSizeChange={resignationFilterSync.setPageSize}
            />
          )}
        </div>
      )}

      {/* ─── TAB 2: Exit Interviews ─────────────────────────────────────────── */}
      {activeTab === 'exit_interviews' && (
        <div className="space-y-4">
          <FilterBar
            filters={exitInterviewFilters}
            values={interviewFilterSync.filterValues}
            onChange={interviewFilterSync.setFilter}
            onClearAll={interviewFilterSync.clearFilters}
          />
          <DataTable queryResult={interviewQueryResult} columns={interviewColumnsWithActions} />
          {interviewQueryResult.data && interviewQueryResult.data.count > 0 && (
            <Pagination
              page={interviewFilterSync.page}
              pageSize={interviewFilterSync.pageSize}
              totalCount={interviewQueryResult.data.count}
              onPageChange={interviewFilterSync.setPage}
              onPageSizeChange={interviewFilterSync.setPageSize}
            />
          )}
        </div>
      )}

      {/* ─── Modal: Submit Resignation Request ───────────────────────────────── */}
      <Modal
        open={showCreateResignation}
        onClose={() => setShowCreateResignation(false)}
        labelledBy="resignation-modal-title"
        size="md"
      >
        <ModalHeader className="flex items-center justify-between">
          <h2 id="resignation-modal-title" className="text-lg font-semibold text-ink-primary">Submit Resignation Request</h2>
          <button type="button" onClick={() => setShowCreateResignation(false)} className="text-ink-secondary hover:text-ink-primary">
            <Iconify icon="close" width={18} />
          </button>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4 pt-2">
            {isAdminOrHr && employeesList?.results && (
              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1">
                  Employee (Admin override)
                </label>
                <select
                  value={newResignationForm.employee}
                  onChange={(e) => handleSelectEmployee(e.target.value)}
                  className="w-full rounded-lg border border-divider bg-surface-paper px-3 py-2 text-sm text-ink-primary"
                >
                  <option value="">Myself (Default)</option>
                  {employeesList.results.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1">
                  Resignation Date <span className="text-error-main">*</span>
                </label>
                <Input
                  type="date"
                  value={newResignationForm.resignation_date}
                  onChange={(e) => handleResignationDateChange(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1">
                  Notice Period (days) <span className="text-error-main">*</span>
                </label>
                <Input
                  type="number"
                  min={0}
                  max={365}
                  value={newResignationForm.notice_period_days}
                  onChange={(e) => handleNoticeDaysChange(Number(e.target.value))}
                  required
                />
                <p className="text-xs text-ink-disabled mt-1">
                  Auto-filled from Settings ({hrSettings?.notice_period_days ?? 30} days configured).
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1">
                Requested Last Working Day <span className="text-error-main">*</span>
              </label>
              <Input
                type="date"
                value={newResignationForm.requested_relieving_date}
                onChange={(e) => setNewResignationForm((p) => ({ ...p, requested_relieving_date: e.target.value }))}
                required
              />
              <p className="mt-1 text-xs text-ink-secondary">
                Calculated automatically from your resignation date + notice period.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1">
                Reason for Resignation <span className="text-error-main">*</span>
              </label>
              <Textarea
                rows={3}
                value={newResignationForm.reason}
                onChange={(e) => setNewResignationForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="State your reasons for resignation..."
                required
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outlined" color="inherit" onClick={() => setShowCreateResignation(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const payload: Record<string, any> = { ...newResignationForm };
              if (!payload.employee) delete payload.employee;
              createResignationMutation.mutate(payload, {
                onSuccess: () => {
                  setShowCreateResignation(false);
                  queryClient.invalidateQueries({ queryKey: ['resignation-requests'] });
                },
              });
            }}
            disabled={!newResignationForm.reason.trim() || createResignationMutation.isPending}
          >
            {createResignationMutation.isPending ? 'Submitting...' : 'Submit Resignation'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ─── Modal: Approve Resignation ─────────────────────────────────────── */}
      <Modal
        open={!!approveRecord}
        onClose={() => setApproveRecord(null)}
        labelledBy="approve-modal-title"
        size="md"
      >
        <ModalHeader className="flex items-center justify-between">
          <h2 id="approve-modal-title" className="text-lg font-semibold text-ink-primary">Approve Resignation Request</h2>
          <button type="button" onClick={() => setApproveRecord(null)} className="text-ink-secondary hover:text-ink-primary">
            <Iconify icon="close" width={18} />
          </button>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-ink-primary">
              Approving resignation for <span className="font-semibold text-primary-main">{approveRecord?.employee_name as string}</span>.
            </p>

            <div className="rounded-lg bg-surface-neutral p-3 text-xs text-ink-secondary space-y-1">
              <p><span className="font-medium text-ink-primary">Submitted Date:</span> {formatDate(approveRecord?.resignation_date as string)}</p>
              <p><span className="font-medium text-ink-primary">Requested Relieving Date:</span> {formatDate(approveRecord?.requested_relieving_date as string)}</p>
              <p><span className="font-medium text-ink-primary">Reason:</span> {approveRecord?.reason as string}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1">
                Confirmed Last Working Day (Relieving Date)
              </label>
              <Input
                type="date"
                value={approvedRelievingDate}
                onChange={(e) => setApprovedRelievingDate(e.target.value)}
              />
              <p className="mt-1 text-xs text-ink-secondary">
                Approving this request will automatically update the employee status to <span className="font-semibold">On Notice</span>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1">
                Approver Comments / Instructions
              </label>
              <Textarea
                rows={3}
                value={approveComments}
                onChange={(e) => setApproveComments(e.target.value)}
                placeholder="Optional notes regarding handover, clearance, or notice adjustments..."
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outlined" color="inherit" onClick={() => setApproveRecord(null)}>
            Back
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleApproveConfirm}
            disabled={approveSubmitting}
          >
            {approveSubmitting ? 'Approving...' : 'Confirm Approval'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ─── Modal: Reject Resignation ──────────────────────────────────────── */}
      <Modal
        open={!!rejectRecord}
        onClose={() => setRejectRecord(null)}
        labelledBy="reject-modal-title"
        size="md"
      >
        <ModalHeader className="flex items-center justify-between">
          <h2 id="reject-modal-title" className="text-lg font-semibold text-ink-primary">Reject Resignation Request</h2>
          <button type="button" onClick={() => setRejectRecord(null)} className="text-ink-secondary hover:text-ink-primary">
            <Iconify icon="close" width={18} />
          </button>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-ink-primary">
              Rejecting resignation request submitted by <span className="font-semibold text-primary-main">{rejectRecord?.employee_name as string}</span>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1">
                Rejection Reason <span className="text-error-main">*</span>
              </label>
              <Textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejecting this resignation request..."
                required
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outlined" color="inherit" onClick={() => setRejectRecord(null)}>
            Back
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRejectConfirm}
            disabled={!rejectionReason.trim() || rejectSubmitting}
          >
            {rejectSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ─── Confirm Dialog: Cancel Resignation ─────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!cancelRecord}
        onClose={() => setCancelRecord(null)}
        onConfirm={handleCancelConfirm}
        title="Cancel Resignation Request"
        message="Are you sure you want to cancel this resignation request?"
        confirmLabel="Cancel Request"
        variant="destructive"
        isLoading={cancelSubmitting}
      />

      {/* ─── Modals: Exit Interview Create & Edit ────────────────────────────── */}
      <CrudModal
        isOpen={showCreateInterview}
        onClose={() => setShowCreateInterview(false)}
        title="Create Exit Interview"
        fields={exitInterviewFields}
        onSubmit={handleCreateInterview}
        isLoading={createInterviewMutation.isPending}
      />

      <CrudModal
        isOpen={!!editInterviewRecord}
        onClose={() => setEditInterviewRecord(null)}
        title="Edit Exit Interview"
        fields={exitInterviewFields}
        initialValues={editInterviewRecord ?? undefined}
        onSubmit={handleEditInterview}
        isLoading={editInterviewLoading}
      />

      <ConfirmDialog
        isOpen={!!deleteInterviewId}
        onClose={() => setDeleteInterviewId(null)}
        onConfirm={() => {
          if (deleteInterviewId) {
            deleteInterviewMutation.mutate(deleteInterviewId, {
              onSuccess: () => setDeleteInterviewId(null),
            });
          }
        }}
        title="Delete Record"
        message="Are you sure you want to delete this exit interview record? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteInterviewMutation.isPending}
      />
    </PageContainer>
  );
}
