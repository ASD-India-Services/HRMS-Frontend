/**
 * Leave Approval Page — manager interface to approve/reject pending leave applications.
 * Requirements: 27.7
 */

import { useState } from 'react';
import { useLeaveApplications, useApproveLeave, useRejectLeave } from '@/hooks/useLeaves';
import type { LeaveApplication } from '@/types/leave';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 id="modal-title" className="text-lg font-semibold text-gray-900 capitalize">
          {action} Leave Application
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          {action === 'approve' ? 'Approve' : 'Reject'} the leave request from{' '}
          <span className="font-medium">{employeeName}</span> for{' '}
          <span className="font-medium">{application.leave_type.name}</span> ({formatDate(application.from_date)} – {formatDate(application.to_date)}).
        </p>

        <div className="mt-4">
          <label htmlFor="comments" className="block text-sm font-medium text-gray-700">
            Comments
          </label>
          <textarea
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            placeholder={`Add a comment for ${action === 'approve' ? 'approval' : 'rejection'}...`}
            className="mt-1 block w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(comments)}
            disabled={isPending}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50 ${
              action === 'approve'
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            } focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            {isPending ? 'Processing...' : action === 'approve' ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LeaveApproval() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useLeaveApplications({ status: 'pending', page, page_size: 10 });
  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();

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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leave Approvals</h1>
        <p className="mt-1 text-sm text-gray-600">Review and approve pending leave applications from your team</p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700" role="alert">
          Failed to load pending leave applications. Please try again.
        </div>
      ) : data && data.results.length > 0 ? (
        <>
          <div className="space-y-3">
            {data.results.map((application) => {
              const employeeName = `${application.employee.first_name} ${application.employee.last_name}`;
              return (
                <div
                  key={application.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Employee & Leave Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{employeeName}</h3>
                        {application.employee.department && (
                          <span className="text-xs text-gray-500">
                            ({application.employee.department.name})
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        <span className="font-medium">{application.leave_type.name}</span>
                        {' · '}
                        {formatDate(application.from_date)} – {formatDate(application.to_date)}
                        {' · '}
                        <span className="font-medium">{application.total_days} day{application.total_days !== 1 ? 's' : ''}</span>
                      </p>
                      {application.reason && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                          {application.reason}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => openModal(application, 'approve')}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openModal(application, 'reject')}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {data.count} pending application{data.count !== 1 ? 's' : ''}
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
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">No pending leave applications to review.</p>
        </div>
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
    </div>
  );
}
