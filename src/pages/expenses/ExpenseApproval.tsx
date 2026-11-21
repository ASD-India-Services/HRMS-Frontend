/**
 * Expense Approval Page — manager interface to approve/reject pending expense claims.
 * Requirements: 27.7
 */

import { useState } from 'react';
import { useExpenseClaims, useApproveExpenseClaim } from '@/hooks/useExpenses';
import type { ExpenseClaim } from '@/types/expense';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

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
    <Modal open onClose={() => {}} labelledBy="modal-title" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
      <div className="p-6 min-h-0 flex-1 overflow-y-auto">
        <h3 id="modal-title" className="text-lg font-semibold text-ink-primary capitalize">
          {action} Expense Claim
        </h3>
        <p className="mt-2 text-sm text-ink-secondary">
          {action === 'approve' ? 'Approve' : 'Reject'} the expense claim from{' '}
          <span className="font-medium">{employeeName}</span> for{' '}
          <span className="font-medium">{claim.expense_type.name}</span> — {formatCurrency(claim.amount)}
          {' '}on {formatDate(claim.expense_date)}.
        </p>

        {/* Show description */}
        {claim.description && (
          <div className="mt-3 rounded-md bg-surface-neutral p-3">
            <p className="text-xs font-medium text-ink-secondary">Description</p>
            <p className="mt-1 text-sm text-ink-primary">{claim.description}</p>
          </div>
        )}

        {/* Show receipts if any */}
        {claim.receipts && claim.receipts.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-ink-secondary">Receipts ({claim.receipts.length})</p>
            <ul className="mt-1 space-y-1">
              {claim.receipts.map((receipt) => (
                <li key={receipt.id}>
                  <a
                    href={receipt.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-main hover:text-primary-dark underline"
                  >
                    {receipt.file_name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

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
            type="button"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <button
            type="button"
            onClick={() => onConfirm(comments)}
            disabled={isPending}
            className={`rounded-md px-4 py-2 text-sm font-medium text-primary-contrast shadow-sm disabled:opacity-50 ${
              action === 'approve'
                ? 'bg-success-main hover:bg-success-dark focus:ring-success-main'
                : 'bg-error-main hover:bg-error-dark focus:ring-error-main'
            } focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            {isPending ? 'Processing...' : action === 'approve' ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>
    </Modal>
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
        <h1 className="text-2xl font-bold text-ink-primary">Expense Approvals</h1>
        <p className="mt-1 text-sm text-ink-secondary">Review and approve pending expense claims from your team</p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-surface-neutral" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-md bg-error-lighter p-4 text-sm text-error-dark" role="alert">
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
                  className="rounded-lg border border-divider bg-surface-paper p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Employee & Expense Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-ink-primary">{employeeName}</h3>
                        {claim.employee.department && (
                          <span className="text-xs text-ink-secondary">
                            ({claim.employee.department.name})
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-ink-secondary">
                        <span className="font-medium">{claim.expense_type.name}</span>
                        {' · '}
                        <span className="font-medium">{formatCurrency(claim.amount)}</span>
                        {' · '}
                        {formatDate(claim.expense_date)}
                      </p>
                      {claim.description && (
                        <p className="mt-1 text-sm text-ink-secondary line-clamp-2">
                          {claim.description}
                        </p>
                      )}
                      {claim.receipts && claim.receipts.length > 0 && (
                        <p className="mt-1 text-xs text-ink-disabled">
                          {claim.receipts.length} receipt{claim.receipts.length !== 1 ? 's' : ''} attached
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => openModal(claim, 'approve')}
                        className="rounded-md bg-success-main px-3 py-1.5 text-sm font-medium text-primary-contrast shadow-sm hover:bg-success-dark focus:outline-none focus:ring-2 focus:ring-success-main focus:ring-offset-2"
                      >
                        Approve
                      </button>
                      <Button type="button" color="error"
                        onClick={() => openModal(claim, 'reject')}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-ink-secondary">
              {data.count} pending claim{data.count !== 1 ? 's' : ''}
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
        <div className="rounded-lg border border-divider bg-surface-paper p-8 text-center">
          <p className="text-sm text-ink-secondary">No pending expense claims to review.</p>
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
