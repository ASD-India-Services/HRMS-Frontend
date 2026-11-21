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
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Iconify } from '@/components/Iconify';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

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
  active: 'bg-success-lighter text-success-dark',
  probation: 'bg-warning-lighter text-warning-dark',
  suspended: 'bg-warning-lighter text-warning-dark',
  terminated: 'bg-error-lighter text-error-dark',
  resigned: 'bg-surface-neutral text-ink-primary',
  on_notice: 'bg-secondary-lighter text-secondary-dark',
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
      <Card className="p-6">
        {/* Header with current status badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="status-change-select"
              className="text-sm font-medium text-ink-primary"
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
            <p className="text-sm text-ink-secondary italic">No transitions available</p>
          ) : (
            <Select
              id="status-change-select"
              value={selectedStatus}
              onChange={handleStatusSelect}
              disabled={statusMutation.isPending}
              className="disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Change employee status"
            >
              <option value="">Select new status...</option>
              {availableTransitions.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          )}
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mt-3 rounded-card bg-success-lighter p-3" role="status">
            <div className="flex items-center">
              <Iconify icon="success" width={18} className="text-success-main" />
              <p className="ml-2 text-sm font-medium text-success-dark">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Status change form */}
        {showForm && selectedStatus && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 border-t border-divider pt-4">
            <p className="text-sm text-ink-secondary">
              Changing status to{' '}
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[selectedStatus]}`}>
                {STATUS_LABELS[selectedStatus]}
              </span>
            </p>

            {/* Reason field */}
            <div>
              <label
                htmlFor="status-reason"
                className="block text-sm font-medium text-ink-primary"
              >
                Reason <span className="text-error-main">*</span>
              </label>
              <Textarea
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
                className="mt-1"
                aria-invalid={!!validationErrors.reason}
                aria-describedby={validationErrors.reason ? 'reason-error' : undefined}
              />
              {validationErrors.reason && (
                <p id="reason-error" className="mt-1 text-xs text-error-main">
                  {validationErrors.reason}
                </p>
              )}
            </div>

            {/* Effective date field */}
            <div>
              <label
                htmlFor="status-effective-date"
                className="block text-sm font-medium text-ink-primary"
              >
                Effective Date <span className="text-error-main">*</span>
              </label>
              <Input
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
                className="mt-1"
                aria-invalid={!!validationErrors.effectiveDate}
                aria-describedby={
                  validationErrors.effectiveDate ? 'effective-date-error' : undefined
                }
              />
              {validationErrors.effectiveDate && (
                <p id="effective-date-error" className="mt-1 text-xs text-error-main">
                  {validationErrors.effectiveDate}
                </p>
              )}
            </div>

            {/* Backend error */}
            {backendError && (
              <div className="rounded-card bg-error-lighter p-3" role="alert">
                <p className="text-sm text-error-dark">{backendError}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                loading={statusMutation.isPending}
              >
                {statusMutation.isPending ? 'Updating...' : 'Confirm'}
              </Button>
              <Button variant="outlined" color="inherit"
                onClick={handleCancel}
                disabled={statusMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </Can>
  );
}
