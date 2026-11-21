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
import { formatDate } from '@/utils/formatters';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton } from '@/components/ui/Button';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Iconify } from '@/components/Iconify';

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
    <PageContainer>
      <PageHeader
        title="My Leaves"
        subtitle="View your leave balances, track request statuses, and apply for leaves."
        actions={
          <Button onClick={() => setIsApplyModalOpen(true)} startIcon={<Iconify icon="plus" />}>
            Apply for Leave
          </Button>
        }
      />
      {/* Leave Balances Section */}
      <section className="mb-8" aria-label="My Leave Balances">
        <h2 className="mb-3 text-sm font-semibold text-ink-primary uppercase tracking-wider">Leave Balances</h2>
        {balancesLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-card bg-surface-neutral" />
            ))}
          </div>
        ) : balances && balances.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {balances.map((balance) => (
              <LeaveBalanceCard key={balance.leave_type_id ?? balance.id} balance={balance} />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState module="leaves" title="No leave balances" description="No leave balance information available for the current period." />
          </Card>
        )}
      </section>

      {/* History Section Header & Tabs */}
      <h2 className="mb-4 text-lg font-semibold text-ink-primary">My Leave Applications</h2>

      {/* Status Filter Tabs */}
      <Tabs
        aria-label="Filter applications by status"
        items={STATUS_TABS}
        value={activeStatus}
        onChange={(value) => {
          setActiveStatus(value);
          setPage(1);
        }}
      />
      {/* Applications Table */}
      {isLoading ? (
        <TableSkeleton columns={7} rows={5} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : data && data.results.length > 0 ? (
        <>
          <Card className="overflow-hidden">
            <table className="min-w-full divide-y divide-divider">
              <thead className="bg-surface-neutral">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">Leave Type</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">From</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">To</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">Days</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">Status</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">Reason</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">Applied On</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-ink-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {data.results.map((application) => (
                  <tr key={application.id} className="hover:bg-surface-neutral">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink-primary">
                      {application.leave_type.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                      {formatDate(application.from_date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                      {formatDate(application.to_date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary font-semibold">
                      {application.total_days}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[application.status] || 'bg-surface-neutral text-ink-primary'}`}>
                        {application.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-secondary max-w-[200px] truncate">
                      {application.reason || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                      {formatDate(application.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {(() => {
                        const today = new Date().toISOString().split('T')[0];
                        const hasStarted = application.from_date <= today;
                        const canCancel = !hasStarted && (application.status === 'pending' || application.status === 'approved');
                        if (canCancel) {
                          return (
                            <Button
                              variant="text"
                              color="error"
                              size="small"
                              onClick={() => setCancelId(application.id)}
                              disabled={cancelLeave.isPending}
                            >
                              Cancel
                            </Button>
                          );
                        }
                        if (hasStarted && (application.status === 'approved' || application.status === 'pending')) {
                          return <span className="text-xs text-ink-disabled">Started</span>;
                        }
                        return <span className="text-xs text-ink-disabled">–</span>;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-ink-secondary">
              Showing {data.results.length} of {data.count} applications
            </p>
            <div className="flex gap-2">
              <Button variant="outlined" color="inherit"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!data.previous}
              >
                Previous
              </Button>
              <Button variant="outlined" color="inherit"
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
          onCtaClick={() => setIsApplyModalOpen(true)}
        />
      )}

      {/* Apply for Leave Modal */}
      {isApplyModalOpen && (
        <Modal open onClose={() => setIsApplyModalOpen(false)} labelledBy="MyLeaves-modal-title-1" size="lg" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <div className="mb-4 flex items-center justify-between border-b border-divider pb-3">
              <h2 id="MyLeaves-modal-title-1" className="text-xl font-bold text-ink-primary">Apply for Leave</h2>
              <IconButton icon="close" size="small" aria-label="Close" onClick={() => setIsApplyModalOpen(false)} />
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
        </Modal>
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
    </PageContainer>
  );
}
