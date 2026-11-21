/**
 * Leave List Page — displays leave applications with status filter tabs.
 * For employees: shows only their own applications ("My Leave Applications").
 * For managers/admins: shows all team applications ("Team Leave Applications")
 * with additional columns for employee name and approved/rejected by.
 * Requirements: 27.2
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLeaveApplications, useCancelLeave } from '@/hooks/useLeaves';
import { useHrmsPermissions } from '@/hooks/useHrmsPermissions';
import { TableSkeleton, ErrorState } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { BulkActions } from '@/components/BulkActions';
import api from '@/lib/api';
import type { LeaveApplicationStatus } from '@/types/leave';
import { formatDate } from '@/utils/formatters';
import { Button } from '@/components/ui/Button';

const STATUS_TABS: { label: string; value: LeaveApplicationStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
];

const statusStyles: Record<string, string> = {
  pending: 'bg-warning-lighter text-warning-dark',
  approved: 'bg-success-lighter text-success-dark',
  rejected: 'bg-error-lighter text-error-dark',
  cancelled: 'bg-surface-neutral text-ink-primary',
  draft: 'bg-primary-lighter text-primary-dark',
};

export function LeaveList() {
  const [activeStatus, setActiveStatus] = useState<LeaveApplicationStatus | ''>('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { hasPermission } = useHrmsPermissions();

  // If the user has "leaves.approve" permission, they are a manager/admin
  // and the backend returns ALL applications (not just their own)
  const isManagerOrAdmin = hasPermission('leaves.approve');

  // Fetch current user's employee ID to restrict cancel to own applications
  const { data: currentEmployee } = useQuery({
    queryKey: ['employee', 'me'],
    queryFn: async () => {
      const response = await api.get<{ id: number }>('/api/v1/employees/me/');
      return response.data;
    },
  });

  const { data, isLoading, isError, refetch } = useLeaveApplications({
    status: activeStatus || undefined,
    page,
    page_size: 10,
  });
  const cancelLeave = useCancelLeave();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Leave Applications</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {isManagerOrAdmin
              ? 'View all team leave applications and apply for your own leave'
              : 'View and manage your leave requests'}
          </p>
        </div>
        <Link
          to="/leaves/apply"
          className="rounded-md bg-primary-main px-4 py-2 text-sm font-medium text-primary-contrast shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-2"
        >
          Apply for Leave
        </Link>
      </div>

      {/* Bulk Export */}
      <BulkActions
        exportEndpoint="/api/v1/leaves/applications/export/"
        csvHeaders="employee,leave_type,from_date,to_date,total_days,status,reason"
        exportFilename="leaves_export.csv"
        exportPermission="leaves.view"
      />

      {/* Status Tabs */}
      <div className="mb-4 border-b border-divider" role="tablist" aria-label="Filter by status">
        <nav className="-mb-px flex gap-4">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={activeStatus === tab.value}
              onClick={() => { setActiveStatus(tab.value); setPage(1); }}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                activeStatus === tab.value
                  ? 'border-primary-main text-primary-main'
                  : 'border-transparent text-ink-secondary hover:border-divider hover:text-ink-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton columns={6} rows={5} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : data && data.results.length > 0 ? (
        <>
          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-divider bg-surface-paper shadow-sm">
            <table className="min-w-full divide-y divide-divider">
              <thead className="bg-surface-neutral">
                <tr>
                  {isManagerOrAdmin && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">Applied By</th>
                  )}
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">Leave Type</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">From</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">To</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">Days</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">Status</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">
                    {isManagerOrAdmin ? 'Approved / Rejected By' : 'Applied On'}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {data.results.map((application) => (
                  <tr key={application.id} className="hover:bg-surface-neutral">
                    {isManagerOrAdmin && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-primary">
                        <div>
                          <p className="font-medium">
                            {application.employee.first_name} {application.employee.last_name}
                          </p>
                          {application.employee.department && (
                            <p className="text-xs text-ink-secondary">{application.employee.department.name}</p>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink-primary">
                      {application.leave_type.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                      {formatDate(application.from_date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                      {formatDate(application.to_date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                      {application.total_days}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[application.status] || 'bg-surface-neutral text-ink-primary'}`}>
                        {application.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                      {isManagerOrAdmin ? (
                        application.approved_by ? (
                          <span className="text-ink-primary">
                            {application.approved_by.first_name} {application.approved_by.last_name}
                          </span>
                        ) : (
                          <span className="italic text-ink-disabled">Pending</span>
                        )
                      ) : (
                        formatDate(application.created_at)
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {(() => {
                        const today = new Date().toISOString().split('T')[0];
                        const isCompleted = application.status === 'approved' && application.to_date < today;
                        const isOwnApplication = currentEmployee && application.employee.id === currentEmployee.id;
                        const canCancel = isOwnApplication && (application.status === 'pending' || (application.status === 'approved' && !isCompleted));
                        if (canCancel) {
                          return (
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to cancel this leave application?')) {
                                  cancelLeave.mutate(application.id);
                                }
                              }}
                              className="rounded px-2 py-1 text-xs font-medium text-error-main hover:bg-error-lighter border border-error-light"
                              disabled={cancelLeave.isPending}
                            >
                              Cancel
                            </button>
                          );
                        }
                        if (isCompleted) {
                          return <span className="text-xs text-ink-disabled">Completed</span>;
                        }
                        return <span className="text-xs text-ink-disabled">–</span>;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-ink-secondary">
              Showing {data.results.length} of {data.count} applications
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outlined" color="inherit"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!data.previous}
              >
                Previous
              </Button>
              <Button type="button" variant="outlined" color="inherit"
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.next}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          module="leaves"
          ctaPermission="leaves.create"
          onCtaClick={() => navigate('/leaves/apply')}
        />
      )}
    </div>
  );
}
