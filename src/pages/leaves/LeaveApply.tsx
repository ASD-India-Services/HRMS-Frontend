/**
 * Leave Application Form
 * Provides leave type dropdown, date range picker, reason textarea, and balance display.
 * Requirements: 27.2
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeaveTypes, useLeaveBalances, useApplyLeave } from '@/hooks/useLeaves';
import { LeaveBalanceCard } from './components/LeaveBalanceCard';

export function LeaveApply() {
  const navigate = useNavigate();
  const { data: leaveTypes, isLoading: typesLoading } = useLeaveTypes();
  const { data: balances, isLoading: balancesLoading } = useLeaveBalances();
  const applyLeave = useApplyLeave();

  const [leaveType, setLeaveType] = useState('');
  const [customLeaveType, setCustomLeaveType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  // Check if the selected leave type is "Others"
  const selectedType = leaveTypes?.find((t) => t.id === leaveType);
  const isOthers = selectedType?.name?.toLowerCase() === 'others';

  const isFormValid = leaveType && fromDate && toDate && reason.trim() && (!isOthers || customLeaveType.trim());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;

    applyLeave.mutate(
      {
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
        reason: isOthers ? `[${customLeaveType.trim()}] ${reason.trim()}` : reason.trim(),
      },
      { onSuccess: () => navigate('/leaves') },
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Apply for Leave</h1>
        <p className="mt-1 text-sm text-gray-600">Submit a new leave application</p>
      </div>

      {/* Leave Balances */}
      <section className="mb-8" aria-label="Leave balances">
        <h2 className="mb-3 text-sm font-medium text-gray-700">Your Leave Balances</h2>
        {balancesLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : balances && balances.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {balances.map((balance) => (
              <LeaveBalanceCard key={balance.id} balance={balance} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No leave balances found.</p>
        )}
      </section>

      {/* Application Form */}
      <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Leave Type */}
          <div className="sm:col-span-2">
            <label htmlFor="leave-type" className="block text-sm font-medium text-gray-700">
              Leave Type <span className="text-red-500">*</span>
            </label>
            <select
              id="leave-type"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              disabled={typesLoading}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-50"
              required
            >
              <option value="">Select leave type</option>
              {leaveTypes
                ?.slice()
                .sort((a, b) => {
                  if (a.name.toLowerCase() === 'others') return 1;
                  if (b.name.toLowerCase() === 'others') return -1;
                  return 0;
                })
                .map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
            </select>
            {isOthers && (
              <input
                type="text"
                value={customLeaveType}
                onChange={(e) => setCustomLeaveType(e.target.value)}
                placeholder="Please specify the leave type"
                className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            )}
          </div>

          {/* From Date */}
          <div>
            <label htmlFor="from-date" className="block text-sm font-medium text-gray-700">
              From Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="from-date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              max={toDate || undefined}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>

          {/* To Date */}
          <div>
            <label htmlFor="to-date" className="block text-sm font-medium text-gray-700">
              To Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="to-date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate || undefined}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>

          {/* Reason */}
          <div className="sm:col-span-2">
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Provide a reason for your leave application..."
              className="mt-1 block w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>
        </div>

        {/* Error message */}
        {applyLeave.isError && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
            Failed to submit leave application. Please try again.
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/leaves')}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isFormValid || applyLeave.isPending}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applyLeave.isPending ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
}
