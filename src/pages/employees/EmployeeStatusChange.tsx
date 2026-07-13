/**
 * EmployeeStatusChange — Status transition dropdown for Employee Detail Page
 *
 * Displays a status dropdown showing available transitions based on the
 * employee's current status. When a new status is selected, shows a form
 * with reason and effective date fields. Submits via PATCH to the backend.
 *
 * Visibility is gated by "employees.edit" permission.
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Can } from '@/components/Can/Can';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type EmployeeStatus =
  | 'active'
  | 'probation'
  | 'suspended'
  | 'terminated'
  | 'resigned'
  | 'on_notice';

export interface EmployeeStatusChangeProps {
  employeeId: string;
  currentStatus: EmployeeStatus;
  onStatusChanged?: () => void;
}

// ─── Status transition rules ────────────────────────────────────────────────────

const STATUS_TRANSITIONS: Record<EmployeeStatus, EmployeeStatus[]> = {
  active: ['suspended', 'terminated', 'resigned', 'on_notice'],
  probation: ['active', 'terminated', 'resigned'],
  suspended: ['active', 'terminated'],
  terminated: [],
  resigned: [],
  on_notice: ['active', 'terminated', 'resigned'],
};

// ─── Display labels ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: 'Active',
  probation: 'Probation',
  suspended: 'Suspended',
  terminated: 'Terminated',
  resigned: 'Resigned',
  on_notice: 'On Notice',
};

// ─── Status color classes ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  active: 'bg-green-100 text-green-800',
  probation: 'bg-amber-100 text-amber-800',
  suspended: 'bg-orange-100 text-orange-800',
  terminated: 'bg-red-100 text-red-800',
  resigned: 'bg-gray-100 text-gray-800',
  on_notice: 'bg-purple-100 text-purple-800',
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function EmployeeStatusChange({
  employeeId,
  currentStatus,
  onStatusChanged,
}: EmployeeStatusChangeProps) {
  const queryClient = useQueryClient();

  const [selectedStatus, setSelectedStatus] = useState<EmployeeStatus | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(getTodayISO());
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const availableTransitions = STATUS_TRANSITIONS[currentStatus];
  const isTerminalState = availableTransitions.length === 0;

  // Mutation for status change
  const statusMutation = useMutation({
    mutationFn: async (payload: {
      status: EmployeeStatus;
      status_reason: string;
      status_effective_date: string;
    }) => {
      const response = await api.patch(`/api/v1/employees/${employeeId}/`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setSuccessMessage('Status updated successfully');
      resetForm();
      onStatusChanged?.();
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  const resetForm = useCallback(() => {
    setSelectedStatus('');
    setShowForm(false);
    setReason('');
    setEffectiveDate(getTodayISO());
    setValidationErrors({});
  }, []);

  const handleStatusSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as EmployeeStatus | '';
    setSelectedStatus(value);
    if (value) {
      setShowForm(true);
      setValidationErrors({});
      statusMutation.reset();
    } else {
      setShowForm(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    statusMutation.reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate fields
    const errors: Record<string, string> = {};
    if (!reason.trim()) {
      errors.reason = 'Reason is required';
    }
    if (!effectiveDate) {
      errors.effectiveDate = 'Effective date is required';
    }
    if (!selectedStatus) {
      errors.status = 'Please select a status';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    statusMutation.mutate({
      status: selectedStatus as EmployeeStatus,
      status_reason: reason.trim(),
      status_effective_date: effectiveDate,
    });
  };

  // Extract backend error message
  const backendError = statusMutation.isError
    ? (statusMutation.error as { response?: { data?: { detail?: string; error?: string; message?: string } } })
        ?.response?.data?.detail ||
      (statusMutation.error as { response?: { data?: { error?: string } } })?.response?.data
        ?.error ||
      (statusMutation.error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ||
      'Failed to update status. Please try again.'
    : null;

  return (
    <Can permissions={['employees.edit']}>
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        {/* Header with current status badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="status-change-select"
              className="text-sm font-medium text-gray-700"
            >
              Status:
            </label>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[currentStatus]}`}
            >
              {STATUS_LABELS[currentStatus]}
            </span>
          </div>
        </div>

        {/* Dropdown or terminal state message */}
        <div className="mt-3">
          {isTerminalState ? (
            <p className="text-sm text-gray-500 italic">No transitions available</p>
          ) : (
            <select
              id="status-change-select"
              value={selectedStatus}
              onChange={handleStatusSelect}
              disabled={statusMutation.isPending}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Change employee status"
            >
              <option value="">Select new status...</option>
              {availableTransitions.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mt-3 rounded-md bg-green-50 p-3" role="status">
            <div className="flex items-center">
              <svg
                className="h-4 w-4 text-green-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="ml-2 text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Status change form */}
        {showForm && selectedStatus && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-600">
              Changing status to{' '}
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[selectedStatus]}`}>
                {STATUS_LABELS[selectedStatus]}
              </span>
            </p>

            {/* Reason field */}
            <div>
              <label
                htmlFor="status-reason"
                className="block text-sm font-medium text-gray-700"
              >
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="status-reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (validationErrors.reason) {
                    setValidationErrors((prev) => {
                      const next = { ...prev };
                      delete next.reason;
                      return next;
                    });
                  }
                }}
                rows={3}
                placeholder="Enter reason for status change..."
                disabled={statusMutation.isPending}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                  validationErrors.reason
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
                aria-invalid={!!validationErrors.reason}
                aria-describedby={validationErrors.reason ? 'reason-error' : undefined}
              />
              {validationErrors.reason && (
                <p id="reason-error" className="mt-1 text-xs text-red-600">
                  {validationErrors.reason}
                </p>
              )}
            </div>

            {/* Effective date field */}
            <div>
              <label
                htmlFor="status-effective-date"
                className="block text-sm font-medium text-gray-700"
              >
                Effective Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="status-effective-date"
                value={effectiveDate}
                onChange={(e) => {
                  setEffectiveDate(e.target.value);
                  if (validationErrors.effectiveDate) {
                    setValidationErrors((prev) => {
                      const next = { ...prev };
                      delete next.effectiveDate;
                      return next;
                    });
                  }
                }}
                disabled={statusMutation.isPending}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                  validationErrors.effectiveDate
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
                aria-invalid={!!validationErrors.effectiveDate}
                aria-describedby={
                  validationErrors.effectiveDate ? 'effective-date-error' : undefined
                }
              />
              {validationErrors.effectiveDate && (
                <p id="effective-date-error" className="mt-1 text-xs text-red-600">
                  {validationErrors.effectiveDate}
                </p>
              )}
            </div>

            {/* Backend error */}
            {backendError && (
              <div className="rounded-md bg-red-50 p-3" role="alert">
                <p className="text-sm text-red-700">{backendError}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={statusMutation.isPending}
                className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {statusMutation.isPending ? (
                  <>
                    <svg
                      className="mr-2 h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={statusMutation.isPending}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </Can>
  );
}
