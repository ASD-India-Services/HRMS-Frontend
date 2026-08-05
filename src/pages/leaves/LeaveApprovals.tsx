/**
 * LeaveApprovals Page — Manager/Admin interface for reviewing and approving/rejecting
 * leave applications using the shared DataTable, FilterBar, Pagination,
 * WorkflowEngine, and Can components.
 *
 * - Pre-filters to status="pending" by default
 * - Inline workflow actions (Approve/Reject) per row via WorkflowEngine
 * - URL-synced filters and pagination
 * - RBAC-restricted to org_admin, hr_manager, department_head
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { useMemo } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { leaveApplicationsCrudConfig } from '@/config/crud/leaveApplications';
import { leaveApprovalWorkflow } from '@/config/workflows/leaveApproval';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { WorkflowEngine } from '@/components/WorkflowEngine';
import { Can } from '@/components/Can';
import { AccessDenied } from '@/components/AccessDenied/AccessDenied';
import type { LeaveApplication } from '@/types/leave';
import type { ColumnDef } from '@/types/datatable';

// Create CRUD hooks from the leave applications config
const leaveAppsCrud = createCrudHooks<LeaveApplication>({
  queryKey: leaveApplicationsCrudConfig.queryKey,
  endpoints: leaveApplicationsCrudConfig.endpoints,
});

// Extended filters for the approvals view — includes employee search and date range
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
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
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
 * Format a date string for display
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Columns for the leave approvals DataTable, including an inline workflow actions column.
 */
function useApprovalColumns(): ColumnDef<LeaveApplication>[] {
  return useMemo(
    () => [
      {
        key: 'employee.name',
        header: 'Employee',
        sortable: true,
        render: (_value: unknown, row: LeaveApplication) => (
          <div>
            <p className="font-medium text-gray-900">
              {row.employee.first_name} {row.employee.last_name}
            </p>
            {row.employee.department && (
              <p className="text-xs text-gray-500">{row.employee.department.name}</p>
            )}
          </div>
        ),
      },
      {
        key: 'leave_type.name',
        header: 'Leave Type',
        sortable: true,
        render: (_value: unknown, row: LeaveApplication) => (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            {row.leave_type.name}
          </span>
        ),
      },
      {
        key: 'from_date',
        header: 'From',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm text-gray-700">{formatDate(value as string)}</span>
        ),
      },
      {
        key: 'to_date',
        header: 'To',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm text-gray-700">{formatDate(value as string)}</span>
        ),
      },
      {
        key: 'total_days',
        header: 'Days',
        sortable: true,
        render: (value: unknown) => (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800">
            {String(value)}
          </span>
        ),
      },
      {
        key: 'reason',
        header: 'Reason',
        sortable: false,
        render: (value: unknown) => (
          <span className="text-sm text-gray-600 line-clamp-2 max-w-[200px]">
            {value ? String(value) : '—'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status & Actions',
        sortable: false,
        render: (_value: unknown, row: LeaveApplication) => (
          <WorkflowEngine
            config={leaveApprovalWorkflow}
            record={{ ...row, id: row.id, status: row.status }}
            invalidateKeys={[
              [leaveApplicationsCrudConfig.queryKey, 'list'],
            ]}
          />
        ),
      },
    ],
    []
  );
}

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
  const columns = useApprovalColumns();

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

  // Build API params — default status to "pending" if not explicitly set
  const apiParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page,
      page_size: pageSize,
    };

    // Apply status filter — default to pending for approval queue
    const statusFilter = filterValues.status || 'pending';
    params.status = statusFilter;

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leave Approvals</h1>
        <p className="mt-1 text-sm text-gray-600">
          Review and approve or reject pending leave applications from your team.
        </p>
      </div>

      {/* Pending count summary */}
      {queryResult.data && (
        <div className="mb-4 flex items-center gap-4">
          <div className="inline-flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-2">
            <svg
              className="h-5 w-5 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-yellow-800">
              {queryResult.data.count} application{queryResult.data.count !== 1 ? 's' : ''}{' '}
              {filterValues.status === 'pending' || !filterValues.status ? 'pending review' : 'found'}
            </span>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar
        filters={approvalFilters}
        values={{
          ...filterValues,
          // Show "pending" as selected in the dropdown when using the default
          status: filterValues.status || 'pending',
        }}
        onChange={setFilter}
        onClearAll={clearFilters}
      />

      {/* Data Table with inline workflow actions */}
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
    </div>
  );
}
