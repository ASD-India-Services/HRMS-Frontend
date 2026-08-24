/**
 * My Leaves Page — Dedicated interface for employees to view their own
 * leave status, balances, application history, cancel pending leaves,
 * and submit new leave applications via an interactive form or modal.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLeaveApplications, useLeaveBalances, useCancelLeave } from '@/hooks/useLeaves';
import { LeaveBalanceCard } from './components/LeaveBalanceCard';
import { LeaveApply } from './LeaveApply';
import { Can } from '@/components/Can';
import { AccessDenied } from '@/components/AccessDenied/AccessDenied';
import { TableSkeleton, ErrorState } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import api from '@/lib/api';
import type { LeaveApplicationStatus } from '@/types/leave';

const STATUS_TABS: { label: string; value: LeaveApplicationStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
];

const statusStyles: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  draft: 'bg-blue-100 text-blue-800',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function MyLeaves() {
  return (
    <Can permissions={['leaves.view']} fallback={<AccessDenied />}>
      <MyLeavesContent />
    </Can>
  );
}

function MyLeavesContent() {
  const [activeStatus, setActiveStatus] = useState<LeaveApplicationStatus | ''>('');
  const [page, setPage] = useState(1);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // Fetch employee balances
  const { data: balances, isLoading: balancesLoading } = useLeaveBalances();

  // Fetch current user's employee record
  const { data: currentEmployee } = useQuery({
    queryKey: ['employee', 'me'],
    queryFn: async () => {
      const response = await api.get<{ id: number }>('/api/v1/employees/me/');
      return response.data;
    },
  });

  // Fetch leave applications for the employee
  const { data, isLoading, isError, refetch } = useLeaveApplications({
    status: activeStatus || undefined,
    page,
    page_size: 10,
    mine: true,
  });

  const cancelLeave = useCancelLeave();
  const [cancelId, setCancelId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Leaves</h1>
          <p className="mt-1 text-sm text-gray-600">
            View your leave balances, track request statuses, and apply for leaves.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsApplyModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Apply for Leave
        </button>
      </div>

      {/* Leave Balances Section */}
      <section className="mb-8" aria-label="My Leave Balances">
        <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wider">Leave Balances</h2>
        {balancesLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : balances && balances.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {balances.map((balance) => (
              <LeaveBalanceCard key={balance.leave_type_id ?? balance.id} balance={balance} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
            No leave balance information available for the current period.
          </div>
        )}
      </section>

      {/* History Section Header & Tabs */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">My Leave Applications</h2>
      </div>

      {/* Status Filter Tabs */}
      <div className="mb-4 border-b border-gray-200" role="tablist" aria-label="Filter applications by status">
        <nav className="-mb-px flex gap-4">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={activeStatus === tab.value}
              onClick={() => {
                setActiveStatus(tab.value);
                setPage(1);
              }}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                activeStatus === tab.value
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Applications Table */}
      {isLoading ? (
        <TableSkeleton columns={7} rows={5} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : data && data.results.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Leave Type</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">From</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">To</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Days</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Reason</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Applied On</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.results.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {application.leave_type.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {formatDate(application.from_date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {formatDate(application.to_date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 font-semibold">
                      {application.total_days}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[application.status] || 'bg-gray-100 text-gray-800'}`}>
                        {application.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                      {application.reason || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {formatDate(application.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {(() => {
                        const today = new Date().toISOString().split('T')[0];
                        const hasStarted = application.from_date <= today;
                        const canCancel = !hasStarted && (application.status === 'pending' || application.status === 'approved');
                        if (canCancel) {
                          return (
                            <button
                              onClick={() => setCancelId(application.id)}
                              className="rounded px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                              disabled={cancelLeave.isPending}
                            >
                              Cancel
                            </button>
                          );
                        }
                        if (hasStarted && (application.status === 'approved' || application.status === 'pending')) {
                          return <span className="text-xs text-gray-400">Started</span>;
                        }
                        return <span className="text-xs text-gray-400">–</span>;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {data.results.length} of {data.count} applications
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!data.previous}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.next}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          module="leaves"
          ctaPermission="leaves.create"
          onCtaClick={() => setIsApplyModalOpen(true)}
        />
      )}

      {/* Apply for Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="relative w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl transition-all">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h2 className="text-xl font-bold text-gray-900">Apply for Leave</h2>
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <LeaveApply
              hideHeader
              onSuccess={() => {
                setIsApplyModalOpen(false);
                refetch();
              }}
              onCancel={() => setIsApplyModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Cancel Leave Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={() => {
          if (cancelId) {
            cancelLeave.mutate(cancelId, {
              onSuccess: () => setCancelId(null),
            });
          }
        }}
        title="Cancel Leave Application"
        message="Are you sure you want to cancel this leave? The leave balance will be restored."
        confirmLabel="Yes, Cancel Leave"
        variant="destructive"
        isLoading={cancelLeave.isPending}
      />
    </div>
  );
}
