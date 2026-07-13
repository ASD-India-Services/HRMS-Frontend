/**
 * Expense Approval Page — manager interface to approve/reject pending expense claims.
 * Requirements: 27.7
 */

import { useState } from 'react';
import { useExpenseClaims, useApproveExpenseClaim } from '@/hooks/useExpenses';
import type { ExpenseClaim } from '@/types/expense';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

interface ApprovalModalProps {
  claim: ExpenseClaim;
  action: 'approve' | 'reject';
  onClose: () => void;
  onConfirm: (comments: string) => void;
  isPending: boolean;
}

function ApprovalModal({ claim, action, onClose, onConfirm, isPending }: ApprovalModalProps) {
  const [comments, setComments] = useState('');
  const employeeName = `${claim.employee.first_name} ${claim.employee.last_name}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 id="modal-title" className="text-lg font-semibold text-gray-900 capitalize">
          {action} Expense Claim
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          {action === 'approve' ? 'Approve' : 'Reject'} the expense claim from{' '}
          <span className="font-medium">{employeeName}</span> for{' '}
          <span className="font-medium">{claim.expense_type.name}</span> — {formatCurrency(claim.amount)}
          {' '}on {formatDate(claim.expense_date)}.
        </p>

        {/* Show description */}
        {claim.description && (
          <div className="mt-3 rounded-md bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-500">Description</p>
            <p className="mt-1 text-sm text-gray-700">{claim.description}</p>
          </div>
        )}

        {/* Show receipts if any */}
        {claim.receipts && claim.receipts.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-500">Receipts ({claim.receipts.length})</p>
            <ul className="mt-1 space-y-1">
              {claim.receipts.map((receipt) => (
                <li key={receipt.id}>
                  <a
                    href={receipt.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:text-primary-700 underline"
                  >
                    {receipt.file_name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

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

export function ExpenseApproval() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useExpenseClaims({ status: 'pending', page, page_size: 10 });
  const approveClaim = useApproveExpenseClaim();

  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve');

  function openModal(claim: ExpenseClaim, action: 'approve' | 'reject') {
    setSelectedClaim(claim);
    setModalAction(action);
  }

  function closeModal() {
    setSelectedClaim(null);
  }

  function handleConfirm(comments: string) {
    if (!selectedClaim) return;

    approveClaim.mutate(
      { id: selectedClaim.id, payload: { action: modalAction, comments: comments || undefined } },
      { onSuccess: () => closeModal() },
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expense Approvals</h1>
        <p className="mt-1 text-sm text-gray-600">Review and approve pending expense claims from your team</p>
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
          Failed to load pending expense claims. Please try again.
        </div>
      ) : data && data.results.length > 0 ? (
        <>
          <div className="space-y-3">
            {data.results.map((claim) => {
              const employeeName = `${claim.employee.first_name} ${claim.employee.last_name}`;
              return (
                <div
                  key={claim.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Employee & Expense Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{employeeName}</h3>
                        {claim.employee.department && (
                          <span className="text-xs text-gray-500">
                            ({claim.employee.department.name})
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        <span className="font-medium">{claim.expense_type.name}</span>
                        {' · '}
                        <span className="font-medium">{formatCurrency(claim.amount)}</span>
                        {' · '}
                        {formatDate(claim.expense_date)}
                      </p>
                      {claim.description && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                          {claim.description}
                        </p>
                      )}
                      {claim.receipts && claim.receipts.length > 0 && (
                        <p className="mt-1 text-xs text-gray-400">
                          {claim.receipts.length} receipt{claim.receipts.length !== 1 ? 's' : ''} attached
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => openModal(claim, 'approve')}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openModal(claim, 'reject')}
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
              {data.count} pending claim{data.count !== 1 ? 's' : ''}
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
          <p className="text-sm text-gray-500">No pending expense claims to review.</p>
        </div>
      )}

      {/* Approval/Rejection Modal */}
      {selectedClaim && (
        <ApprovalModal
          claim={selectedClaim}
          action={modalAction}
          onClose={closeModal}
          onConfirm={handleConfirm}
          isPending={approveClaim.isPending}
        />
      )}
    </div>
  );
}
