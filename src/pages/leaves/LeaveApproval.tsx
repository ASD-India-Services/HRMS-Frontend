/**
 * Leave Approval Page — manager interface to approve/reject pending leave applications.
 * Requirements: 27.7
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useLeaveApplications, useApproveLeave, useRejectLeave } from '@/hooks/useLeaves';
import { useDefaultPaginationSize } from '@/hooks/useHRSettings';
import type { LeaveApplication } from '@/types/leave';
import { formatDate } from '@/utils/formatters';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/EmptyState';

interface ApprovalModalProps {
  application: LeaveApplication;
  action: 'approve' | 'reject';
  onClose: () => void;
  onConfirm: (comments: string) => void;
  isPending: boolean;
}

function ApprovalModal({ application, action, onClose, onConfirm, isPending }: ApprovalModalProps) {
  const [comments, setComments] = useState('');
  const employeeName = `${application.employee.first_name} ${application.employee.last_name}`;

  return (
    <Modal open onClose={onClose} labelledBy="modal-title" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
      <div className="p-6 min-h-0 flex-1 overflow-y-auto">
        <h3 id="modal-title" className="text-lg font-semibold text-ink-primary capitalize">
          {action} Leave Application
        </h3>
        <p className="mt-2 text-sm text-ink-secondary">
          {action === 'approve' ? 'Approve' : 'Reject'} the leave request from{' '}
          <span className="font-medium">{employeeName}</span> for{' '}
          <span className="font-medium">{application.leave_type.name}</span> ({formatDate(application.from_date)} – {formatDate(application.to_date)}).
        </p>

        <div className="mt-4">
          <label htmlFor="comments" className="block text-sm font-medium text-ink-primary">
            Comments
          </label>
          <Textarea
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            placeholder={`Add a comment for ${action === 'approve' ? 'approval' : 'rejection'}...`}
            className="mt-1 resize-y"
          />
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outlined" color="inherit"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            color={action === 'approve' ? 'success' : 'error'}
            onClick={() => onConfirm(comments)}
            disabled={isPending}
          >
            {isPending ? 'Processing...' : action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function LeaveApproval() {
  const pageSize = useDefaultPaginationSize();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useLeaveApplications({ status: 'pending', page, page_size: pageSize });
  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();

  const { data: currentEmployee } = useQuery({
    queryKey: ['current-employee'],
    queryFn: async () => {
      const res = await api.get('/api/v1/employees/me/');
      return res.data;
    },
  });

  const [selectedApplication, setSelectedApplication] = useState<LeaveApplication | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve');

  function openModal(application: LeaveApplication, action: 'approve' | 'reject') {
    setSelectedApplication(application);
    setModalAction(action);
  }

  function closeModal() {
    setSelectedApplication(null);
  }

  function handleConfirm(comments: string) {
    if (!selectedApplication) return;

    const mutation = modalAction === 'approve' ? approveLeave : rejectLeave;
    mutation.mutate(
      { id: selectedApplication.id, payload: { comments: comments || undefined } },
      { onSuccess: () => closeModal() },
    );
  }

  return (
    <PageContainer maxWidth="lg">
      <PageHeader title="Leave Approvals" subtitle="Review and approve pending leave applications from your team" />

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-surface-neutral" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-card bg-error-lighter p-4 text-sm text-error-dark" role="alert">
          Failed to load pending leave applications. Please try again.
        </div>
      ) : data && data.results.length > 0 ? (
        <>
          <div className="space-y-3">
            {data.results.map((application) => {
              const employeeName = `${application.employee.first_name} ${application.employee.last_name}`;
              const isOwn = currentEmployee && (
                String(application.employee?.id) === String(currentEmployee.id) ||
                String(application.employee?.employee_id) === String(currentEmployee.employee_id) ||
                String((application.employee as any)?.user_id) === String((currentEmployee as any)?.user_id)
              );

              return (
                <Card
                  key={application.id}
                  className="p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Employee & Leave Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-ink-primary">{employeeName}</h3>
                        {application.employee.department && (
                          <span className="text-xs text-ink-secondary">
                            ({application.employee.department.name})
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-ink-secondary">
                        <span className="font-medium">{application.leave_type.name}</span>
                        {' · '}
                        {formatDate(application.from_date)} – {formatDate(application.to_date)}
                        {' · '}
                        <span className="font-medium">{application.total_days} day{application.total_days !== 1 ? 's' : ''}</span>
                      </p>
                      {application.reason && (
                        <p className="mt-1 text-sm text-ink-secondary line-clamp-2">
                          {application.reason}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex shrink-0 gap-2 items-center">
                      {isOwn ? (
                        <span className="inline-flex items-center rounded bg-warning-lighter px-2.5 py-1 text-xs font-medium text-warning-dark">
                          Own Request (Cannot self-approve)
                        </span>
                      ) : (
                        <>
                          <Button color="success" onClick={() => openModal(application, 'approve')}>
                            Approve
                          </Button>
                          <Button variant="outlined" color="error" onClick={() => openModal(application, 'reject')}>
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-ink-secondary">
              {data.count} pending application{data.count !== 1 ? 's' : ''}
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
        <Card>
          <EmptyState module="leaves" title="No pending applications" description="No pending leave applications to review." />
        </Card>
      )}

      {/* Approval/Rejection Modal */}
      {selectedApplication && (
        <ApprovalModal
          application={selectedApplication}
          action={modalAction}
          onClose={closeModal}
          onConfirm={handleConfirm}
          isPending={approveLeave.isPending || rejectLeave.isPending}
        />
      )}
    </PageContainer>
  );
}
