/**
 * LeaveApprovals Page — Manager/Admin interface for reviewing and approving/rejecting
 * leave applications.
 *
 * - Shows leave applicants list with employee, department, leave type, dates, reason, status
 * - View Applicant modal to inspect complete leave details and applicant info
 * - Inline & modal workflow actions (Approve/Reject) per application
 * - RBAC-restricted to users with 'leaves.approve' permission
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { createCrudHooks } from '@/hooks/useCrud';
import { leaveApplicationsCrudConfig } from '@/config/crud/leaveApplications';
import { leaveApprovalWorkflow } from '@/config/workflows/leaveApproval';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { WorkflowEngine } from '@/components/WorkflowEngine';
import { Can } from '@/components/Can';
import { AccessDenied } from '@/components/AccessDenied/AccessDenied';
import { useApproveLeave, useRejectLeave } from '@/hooks/useLeaves';
import type { LeaveApplication } from '@/types/leave';
import type { ColumnDef } from '@/types/datatable';
import { formatDate } from '@/utils/formatters';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Iconify } from '@/components/Iconify';

// Create CRUD hooks from the leave applications config
const leaveAppsCrud = createCrudHooks<LeaveApplication>({
  queryKey: leaveApplicationsCrudConfig.queryKey,
  endpoints: leaveApplicationsCrudConfig.endpoints,
});

// Extended filters for the approvals view
const approvalFilters = [
  {
    key: 'search',
    label: 'Search employee...',
    type: 'search' as const,
    debounceMs: 300,
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select' as const,
    options: [
      { value: '', label: 'All Statuses' },
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  {
    key: 'leave_type',
    label: 'Leave Type',
    type: 'select' as const,
    options: [
      { value: 'casual', label: 'Casual Leave' },
      { value: 'sick', label: 'Sick Leave' },
      { value: 'earned', label: 'Earned Leave' },
      { value: 'compensatory', label: 'Compensatory Off' },
    ],
  },
];

/**
 * Main LeaveApprovals component wrapped in RBAC check.
 */
export function LeaveApprovals() {
  return (
    <Can
      permissions={['leaves.approve']}
      fallback={<AccessDenied />}
    >
      <LeaveApprovalsContent />
    </Can>
  );
}

/**
 * Inner content component with the actual approvals table logic.
 */
function LeaveApprovalsContent() {
  const [selectedApplicant, setSelectedApplicant] = useState<LeaveApplication | null>(null);
  const [actionComments, setActionComments] = useState('');
  
  const approveMutation = useApproveLeave();
  const rejectMutation = useRejectLeave();

  const { data: currentEmployee } = useQuery({
    queryKey: ['current-employee'],
    queryFn: async () => {
      const res = await api.get('/api/v1/employees/me/');
      return res.data;
    },
  });

  const isOwnApplication = (row: LeaveApplication | null) => {
    if (!row || !currentEmployee) return false;
    const myId = String(currentEmployee.id || '');
    const rowEmpId = String(row.employee?.id || '');
    const myEmpCode = String(currentEmployee.employee_id || '');
    const rowEmpCode = String(row.employee?.employee_id || '');
    const myUserId = String((currentEmployee as any)?.user_id || '');
    const rowUserId = String((row.employee as any)?.user_id || '');
    return (
      (myId && rowEmpId && myId === rowEmpId) ||
      (myEmpCode && rowEmpCode && myEmpCode === rowEmpCode) ||
      (myUserId && rowUserId && myUserId === rowUserId)
    );
  };

  // URL-synced filters with "pending" as default status
  const {
    filterValues,
    setFilter,
    clearFilters,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useFilterSync({ filters: approvalFilters });

  // Build API params — list all leave applications by default
  const apiParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page,
      page_size: pageSize,
    };

    if (filterValues.status) {
      params.status = filterValues.status;
    }
    if (filterValues.search) {
      params.search = filterValues.search;
    }
    if (filterValues.leave_type) {
      params.leave_type = filterValues.leave_type;
    }

    return params;
  }, [filterValues, page, pageSize]);

  // Fetch leave applications using CRUD hooks
  const queryResult = leaveAppsCrud.useList(apiParams);

  // Columns definition including View and Workflow Actions
  const columns: ColumnDef<LeaveApplication>[] = useMemo(
    () => [
      {
        key: 'employee.name',
        header: 'Leave Applicant',
        sortable: true,
        render: (_value: unknown, row: LeaveApplication) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-lighter font-semibold text-primary-dark">
              {row.employee.first_name?.[0] || 'E'}{row.employee.last_name?.[0] || ''}
            </div>
            <div>
              <p className="font-semibold text-ink-primary">
                {row.employee.first_name} {row.employee.last_name}
              </p>
              {row.employee.department && (
                <p className="text-xs text-ink-secondary">{row.employee.department.name}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'leave_type.name',
        header: 'Leave Type',
        sortable: true,
        render: (_value: unknown, row: LeaveApplication) => (
          <span className="inline-flex items-center rounded-full bg-primary-lighter px-2.5 py-0.5 text-xs font-medium text-primary-dark border border-primary-light">
            {row.leave_type.name}
          </span>
        ),
      },
      {
        key: 'from_date',
        header: 'From',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm text-ink-primary">{formatDate(value as string)}</span>
        ),
      },
      {
        key: 'to_date',
        header: 'To',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm text-ink-primary">{formatDate(value as string)}</span>
        ),
      },
      {
        key: 'total_days',
        header: 'Days',
        sortable: true,
        render: (value: unknown) => (
          <span className="inline-flex items-center rounded-full bg-surface-neutral px-2.5 py-0.5 text-xs font-semibold text-ink-primary">
            {String(value)}
          </span>
        ),
      },
      {
        key: 'reason',
        header: 'Reason',
        sortable: false,
        render: (value: unknown) => (
          <span className="text-sm text-ink-secondary line-clamp-2 max-w-[200px]">
            {value ? String(value) : '—'}
          </span>
        ),
      },
      {
        key: 'view_details',
        header: 'View',
        sortable: false,
        render: (_value: unknown, row: LeaveApplication) => (
          <IconButton icon="eye" size="small" aria-label="View" title="View" onClick={() => setSelectedApplicant(row)} />
        ),
      },
      {
        key: 'status',
        header: 'Actions',
        sortable: false,
        render: (_value: unknown, row: LeaveApplication) => {
          if (isOwnApplication(row)) {
            return (
              <span className="inline-flex items-center rounded-full bg-warning-lighter px-2.5 py-0.5 text-xs font-medium text-warning-dark border border-warning-light">
                Self-request (Approval disabled)
              </span>
            );
          }
          return (
            <WorkflowEngine
              config={leaveApprovalWorkflow}
              record={{ ...row, id: row.id, status: row.status }}
              invalidateKeys={[
                [leaveApplicationsCrudConfig.queryKey, 'list'],
              ]}
            />
          );
        },
      },
    ],
    [currentEmployee]
  );

  return (
    <PageContainer>
      {/* Page Header */}
      <PageHeader
        title="Leave Approvals"
        subtitle="Review leave applicants, inspect full application details, and approve or reject leave requests."
      />

      {/* Total count summary */}
      {queryResult.data && (
        <div className="mb-4 flex items-center gap-4">
          <div className="inline-flex items-center gap-2 rounded-lg bg-primary-lighter px-4 py-2">
            <Iconify icon="success" width={20} className="text-primary-main" />
            <span className="text-sm font-medium text-primary-dark">
              Total {queryResult.data.count} employee leave application{queryResult.data.count !== 1 ? 's' : ''}{' '}
              {filterValues.status ? `(${filterValues.status})` : 'listed'}
            </span>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar
        filters={approvalFilters}
        values={filterValues}
        onChange={setFilter}
        onClearAll={clearFilters}
      />

      {/* Data Table with inline workflow actions & View button */}
      <DataTable<LeaveApplication>
        queryResult={queryResult}
        columns={columns}
      />

      {/* Pagination */}
      {queryResult.data && queryResult.data.count > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={queryResult.data.count}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Applicant Detail Modal */}
      {selectedApplicant && (
        <Modal open onClose={() => { setSelectedApplicant(null); setActionComments(''); }} labelledBy="LeaveApprovals-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-divider pb-4">
              <div>
                <h3 id="LeaveApprovals-modal-title-1" className="text-lg font-bold text-ink-primary">Leave Applicant Details</h3>
                <p className="text-xs text-ink-secondary">ID: {selectedApplicant.id}</p>
              </div>
              <IconButton
                icon="close"
                size="small"
                aria-label="Close"
                onClick={() => { setSelectedApplicant(null); setActionComments(''); }}
              />
            </div>

            {/* Applicant Profile Card */}
            <div className="mt-4 flex items-center gap-4 rounded-lg bg-surface-neutral p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-main font-bold text-primary-contrast text-lg">
                {selectedApplicant.employee.first_name?.[0] || 'E'}{selectedApplicant.employee.last_name?.[0] || ''}
              </div>
              <div>
                <h4 className="font-semibold text-ink-primary text-base">
                  {selectedApplicant.employee.first_name} {selectedApplicant.employee.last_name}
                </h4>
                <p className="text-xs text-ink-secondary">{selectedApplicant.employee.email}</p>
                {selectedApplicant.employee.department && (
                  <p className="text-xs text-primary-dark font-medium">{selectedApplicant.employee.department.name}</p>
                )}
              </div>
            </div>

            {/* Application Information Grid */}
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs font-medium text-ink-secondary uppercase">Leave Type</span>
                <p className="font-medium text-ink-primary">{selectedApplicant.leave_type.name}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-ink-secondary uppercase">Total Days</span>
                <p className="font-semibold text-ink-primary">{selectedApplicant.total_days} Day(s)</p>
              </div>
              <div>
                <span className="text-xs font-medium text-ink-secondary uppercase">From Date</span>
                <p className="font-medium text-ink-primary">{formatDate(selectedApplicant.from_date)}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-ink-secondary uppercase">To Date</span>
                <p className="font-medium text-ink-primary">{formatDate(selectedApplicant.to_date)}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-ink-secondary uppercase">Current Status</span>
                <p className="mt-0.5">
                  <span className="inline-flex items-center rounded-full bg-warning-lighter px-2.5 py-0.5 text-xs font-medium capitalize text-warning-dark">
                    {selectedApplicant.status}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-ink-secondary uppercase">Applied On</span>
                <p className="font-medium text-ink-primary">{formatDate(selectedApplicant.created_at)}</p>
              </div>
            </div>

            {/* Reason */}
            <div className="mt-4">
              <span className="text-xs font-medium text-ink-secondary uppercase block mb-1">Reason for Leave</span>
              <div className="rounded-lg bg-surface-neutral p-3 text-sm text-ink-primary">
                {selectedApplicant.reason || 'No reason provided.'}
              </div>
            </div>

            {/* Action Section for Pending Applications */}
            {selectedApplicant.status === 'pending' && isOwnApplication(selectedApplicant) && (
              <div className="mt-5 rounded-card bg-warning-lighter p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-warning-dark">
                  <Iconify icon="warning" width={20} className="shrink-0 text-warning-main" />
                  Self-Approval Not Allowed
                </div>
                <p className="mt-1 text-xs text-warning-dark">
                  This is your own leave application. As per company segregation of duties policy, you cannot approve or reject your own leave. It must be reviewed and approved by your reporting manager or an administrator.
                </p>
              </div>
            )}

            {selectedApplicant.status === 'pending' && !isOwnApplication(selectedApplicant) && (
              <div className="mt-5 border-t border-divider pt-4">
                <label className="block text-xs font-medium text-ink-primary uppercase mb-1">
                  Manager Comments (Optional)
                </label>
                <Textarea
                  value={actionComments}
                  onChange={(e) => setActionComments(e.target.value)}
                  rows={2}
                  placeholder="Enter remarks for approval or rejection..."
                />

                <div className="mt-4 flex items-center justify-end gap-3">
                  <Button variant="outlined" color="error"
                    disabled={rejectMutation.isPending || approveMutation.isPending}
                    onClick={() => {
                      rejectMutation.mutate(
                        { id: selectedApplicant.id, payload: { comments: actionComments } },
                        {
                          onSuccess: () => {
                            setSelectedApplicant(null);
                            setActionComments('');
                            queryResult.refetch();
                          },
                        }
                      );
                    }}
                  >
                    {rejectMutation.isPending ? 'Rejecting...' : 'Reject Leave'}
                  </Button>
                  <Button
                    color="success"
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    onClick={() => {
                      approveMutation.mutate(
                        { id: selectedApplicant.id, payload: { comments: actionComments } },
                        {
                          onSuccess: () => {
                            setSelectedApplicant(null);
                            setActionComments('');
                            queryResult.refetch();
                          },
                        }
                      );
                    }}
                  >
                    {approveMutation.isPending ? 'Approving...' : 'Approve Leave'}
                  </Button>
                </div>
              </div>
            )}

            {/* Close button for non-pending or already reviewed */}
            {selectedApplicant.status !== 'pending' && (
              <div className="mt-6 flex justify-end">
                <Button variant="outlined" color="inherit"
                  onClick={() => setSelectedApplicant(null)}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
