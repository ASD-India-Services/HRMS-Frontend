/**
 * Leave Application Form
 * Provides leave type dropdown, date range picker, reason textarea, and balance display.
 * Requirements: 27.2
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeaveTypes, useLeaveBalances, useApplyLeave, useCalculateLeaveDays } from '@/hooks/useLeaves';
import { useHRSettings } from '@/hooks/useHRSettings';
import { LeaveBalanceCard } from './components/LeaveBalanceCard';
import { formatCurrency, formatDate } from '@/utils/formatters';
import api from '@/lib/api';

interface LopPolicy {
  is_active: boolean;
  max_days_per_year: string | null;
  used_days: string;
  remaining_days: string | null;
  deduction_per_day: string;
}

interface LeaveApplyProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  hideHeader?: boolean;
}

export function LeaveApply({ onSuccess, onCancel, hideHeader = false }: LeaveApplyProps = {}) {
  const navigate = useNavigate();
  const { data: leaveTypes, isLoading: typesLoading } = useLeaveTypes();
  const { data: balances, isLoading: balancesLoading } = useLeaveBalances();
  const { data: hrSettings } = useHRSettings();
  const applyLeave = useApplyLeave();

  const [lopPolicy, setLopPolicy] = useState<LopPolicy | null>(null);

  // Restrict Past Leave policy check from HR Settings
  const isPastLeaveRestricted = useMemo(() => {
    if (typeof hrSettings?.restrict_past_leave === 'boolean') {
      return hrSettings.restrict_past_leave;
    }
    try {
      const saved = localStorage.getItem('hrms_restrict_past_leave');
      if (saved !== null) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return false;
  }, [hrSettings]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [policyError, setPolicyError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/v1/leaves/lop-policy/balance/')
      .then((res) => setLopPolicy(res.data))
      .catch(() => setLopPolicy(null));
  }, []);

  const [leaveType, setLeaveType] = useState('');
  const [customLeaveType, setCustomLeaveType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  // Live calculation of net leave days (excluding company leaves and public holidays)
  const { data: calcResult, isLoading: calcLoading } = useCalculateLeaveDays(fromDate, toDate, leaveType);

  // Check if the selected leave type is "Others"
  const selectedType = leaveTypes?.find((t) => t.id === leaveType);
  const isOthers = selectedType?.name?.toLowerCase() === 'others';
  const isLop = leaveType === '__lop__';

  const isZeroLeaveDays = calcResult && calcResult.total_days === 0;
  const isFormValid =
    leaveType &&
    fromDate &&
    toDate &&
    !isZeroLeaveDays &&
    reason.trim() &&
    (!isOthers || customLeaveType.trim());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPolicyError(null);

    // Enforce Restrict Past Leave policy
    if (isPastLeaveRestricted && fromDate && fromDate < todayStr) {
      setPolicyError('Past date leave applications are restricted by HR policy. Please select today or a future date.');
      return;
    }

    if (!isFormValid) return;

    applyLeave.mutate(
      {
        leave_type: isLop ? '__lop__' : leaveType,
        from_date: fromDate,
        to_date: toDate,
        reason: isOthers ? `[${customLeaveType.trim()}] ${reason.trim()}` : reason.trim(),
        is_lop: isLop || undefined,
      } as Record<string, unknown>,
      {
        onSuccess: () => {
          if (onSuccess) {
            onSuccess();
          } else {
            navigate('/my-leaves');
          }
        },
      },
    );
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/my-leaves');
    }
  }

  return (
    <div className={hideHeader ? 'w-full' : 'mx-auto max-w-4xl px-4 py-8'}>
      {!hideHeader && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Apply for Leave</h1>
          <p className="mt-1 text-sm text-gray-600">Submit a new leave application</p>
        </div>
      )}

      {/* Leave Balances */}
      <section className="mb-6" aria-label="Leave balances">
        <h2 className="mb-3 text-sm font-medium text-gray-700">Your Leave Balances</h2>
        {balancesLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : balances && balances.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {balances.map((balance) => (
              <LeaveBalanceCard key={balance.leave_type_id ?? balance.id} balance={balance} />
            ))}
            {lopPolicy && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-orange-900">Loss of Pay</h4>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-orange-600">
                      {lopPolicy.remaining_days !== null ? lopPolicy.remaining_days : '∞'}
                    </p>
                    <p className="text-xs text-gray-500">remaining</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>{lopPolicy.used_days} used</p>
                    <p>{lopPolicy.max_days_per_year ?? '∞'} max/year</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-orange-700">
                  {formatCurrency(lopPolicy.deduction_per_day)} deducted per day
                </p>
              </div>
            )}
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
              {lopPolicy && (
                <option value="__lop__">Loss of Pay</option>
              )}
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

          {/* Restrict Past Leave policy indicator & error */}
          {isPastLeaveRestricted && (
            <div className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 shadow-2xs">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span>
                <strong>HR Policy Active:</strong> Restrict Past Leave is ON. Backdated leave applications are not permitted.
              </span>
            </div>
          )}

          {policyError && (
            <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 shadow-2xs">
              {policyError}
            </div>
          )}

          {/* From Date */}
          <div>
            <label htmlFor="from-date" className="block text-sm font-medium text-gray-700">
              From Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="from-date"
              value={fromDate}
              onChange={(e) => {
                setPolicyError(null);
                setFromDate(e.target.value);
              }}
              min={isPastLeaveRestricted ? todayStr : undefined}
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
              onChange={(e) => {
                setPolicyError(null);
                setToDate(e.target.value);
              }}
              min={fromDate || (isPastLeaveRestricted ? todayStr : undefined)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>

          {/* Real-time Leave Calculation Breakdown */}
          {fromDate && toDate && fromDate <= toDate && (
            <div className="sm:col-span-2 rounded-xl border border-blue-200 bg-blue-50/70 p-4 shadow-2xs">
              {calcLoading ? (
                <div className="flex items-center gap-2 text-xs text-blue-700">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <span>Calculating working days and company week-offs...</span>
                </div>
              ) : calcResult ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/80 pb-2.5">
                    <div>
                      <span className="text-xs font-semibold text-blue-900">Leave Duration Summary</span>
                      <p className="text-xs text-blue-700 mt-0.5">
                        {calcResult.calendar_days} calendar {calcResult.calendar_days === 1 ? 'day' : 'days'} selected
                        {calcResult.company_leave_days > 0 && ` • ${calcResult.company_leave_days} company week-off${calcResult.company_leave_days === 1 ? '' : 's'} excluded`}
                        {calcResult.holiday_days > 0 && ` • ${calcResult.holiday_days} public holiday${calcResult.holiday_days === 1 ? '' : 's'} excluded`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500">Total Leave to Deduct:</span>
                      <div className="text-xl font-extrabold text-blue-700">
                        {calcResult.total_days} {calcResult.total_days === 1 ? 'Day' : 'Days'}
                      </div>
                    </div>
                  </div>

                  {/* Day-by-Day Breakdown Pills */}
                  {calcResult.breakdown && calcResult.breakdown.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">Date Breakdown</span>
                      <div className="flex flex-wrap gap-1.5">
                        {calcResult.breakdown.map((item) => (
                          <div
                            key={item.date}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border ${
                              item.is_working_day
                                ? 'bg-white border-blue-300 text-blue-900 shadow-2xs'
                                : 'bg-amber-100/90 border-amber-300 text-amber-900'
                            }`}
                            title={item.reason || 'Working day'}
                          >
                            <span className="font-semibold">{formatDate(item.date)} ({item.day_name.slice(0, 3)}):</span>
                            <span>{item.is_working_day ? 'Leave (Deducted)' : item.reason || 'Week Off (Excluded)'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {calcResult.total_days === 0 && (
                    <div className="rounded-lg bg-amber-50 border border-amber-300 p-2.5 text-xs text-amber-800">
                      ⚠️ The selected dates consist entirely of non-working days or company week-offs. No leave days will be deducted.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

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
          <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700" role="alert">
            {(() => {
              const err = applyLeave.error as { response?: { data?: Record<string, unknown> } } | null;
              const data = err?.response?.data;
              if (data) {
                const messages = Object.values(data).flat().filter(Boolean);
                if (messages.length > 0) {
                  return messages.map((msg, i) => <p key={i}>{String(msg)}</p>);
                }
              }
              return <p>Failed to submit leave application. Please try again.</p>;
            })()}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
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
