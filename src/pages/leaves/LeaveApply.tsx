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
import { formatCurrency } from '@/utils/formatters';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

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
          <h1 className="text-2xl font-bold text-ink-primary">Apply for Leave</h1>
          <p className="mt-1 text-sm text-ink-secondary">Submit a new leave application</p>
        </div>
      )}

      {/* Leave Balances */}
      <section className="mb-6" aria-label="Leave balances">
        <h2 className="mb-3 text-sm font-medium text-ink-primary">Your Leave Balances</h2>
        {balancesLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-surface-neutral" />
            ))}
          </div>
        ) : balances && balances.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {balances.map((balance) => (
              <LeaveBalanceCard key={balance.leave_type_id ?? balance.id} balance={balance} />
            ))}
            {lopPolicy && (
              <div className="rounded-lg border border-warning-light bg-warning-lighter p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-warning-darker">Loss of Pay</h4>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-warning-main">
                      {lopPolicy.remaining_days !== null ? lopPolicy.remaining_days : '∞'}
                    </p>
                    <p className="text-xs text-ink-secondary">remaining</p>
                  </div>
                  <div className="text-right text-xs text-ink-secondary">
                    <p>{lopPolicy.used_days} used</p>
                    <p>{lopPolicy.max_days_per_year ?? '∞'} max/year</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-warning-dark">
                  {formatCurrency(lopPolicy.deduction_per_day)} deducted per day
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-secondary">No leave balances found.</p>
        )}
      </section>

      {/* Application Form */}
      <form onSubmit={handleSubmit} className="rounded-lg border border-divider bg-surface-paper p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Leave Type */}
          <div className="sm:col-span-2">
            <label htmlFor="leave-type" className="block text-sm font-medium text-ink-primary">
              Leave Type <span className="text-error-main">*</span>
            </label>
            <Select
              id="leave-type"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              disabled={typesLoading}
              className="mt-1"
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
            </Select>
            {isOthers && (
              <Input
                type="text"
                value={customLeaveType}
                onChange={(e) => setCustomLeaveType(e.target.value)}
                placeholder="Please specify the leave type"
                className="mt-2"
                required
              />
            )}
          </div>

          {/* Restrict Past Leave policy indicator & error */}
          {isPastLeaveRestricted && (
            <div className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-primary-light bg-primary-lighter/70 p-3 text-xs text-primary-darker shadow-2xs">
              <span className="flex h-2 w-2 rounded-full bg-primary-main animate-pulse" />
              <span>
                <strong>HR Policy Active:</strong> Restrict Past Leave is ON. Backdated leave applications are not permitted.
              </span>
            </div>
          )}

          {policyError && (
            <div className="sm:col-span-2 rounded-lg border border-error-light bg-error-lighter p-3 text-xs text-error-dark shadow-2xs">
              {policyError}
            </div>
          )}

          {/* From Date */}
          <div>
            <label htmlFor="from-date" className="block text-sm font-medium text-ink-primary">
              From Date <span className="text-error-main">*</span>
            </label>
            <Input
              type="date"
              id="from-date"
              value={fromDate}
              onChange={(e) => {
                setPolicyError(null);
                setFromDate(e.target.value);
              }}
              min={isPastLeaveRestricted ? todayStr : undefined}
              max={toDate || undefined}
              className="mt-1"
              required
            />
          </div>

          {/* To Date */}
          <div>
            <label htmlFor="to-date" className="block text-sm font-medium text-ink-primary">
              To Date <span className="text-error-main">*</span>
            </label>
            <Input
              type="date"
              id="to-date"
              value={toDate}
              onChange={(e) => {
                setPolicyError(null);
                setToDate(e.target.value);
              }}
              min={fromDate || (isPastLeaveRestricted ? todayStr : undefined)}
              className="mt-1"
              required
            />
          </div>

          {/* Real-time Leave Calculation Breakdown */}
          {fromDate && toDate && fromDate <= toDate && (
            <div className="sm:col-span-2 rounded-xl border border-primary-light bg-primary-lighter/70 p-4 shadow-2xs">
              {calcLoading ? (
                <div className="flex items-center gap-2 text-xs text-primary-dark">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-main border-t-transparent" />
                  <span>Calculating working days and company week-offs...</span>
                </div>
              ) : calcResult ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary-light/80 pb-2.5">
                    <div>
                      <span className="text-xs font-semibold text-primary-darker">Leave Duration Summary</span>
                      <p className="text-xs text-primary-dark mt-0.5">
                        {calcResult.calendar_days} calendar {calcResult.calendar_days === 1 ? 'day' : 'days'} selected
                        {calcResult.company_leave_days > 0 && ` • ${calcResult.company_leave_days} company week-off${calcResult.company_leave_days === 1 ? '' : 's'} excluded`}
                        {calcResult.holiday_days > 0 && ` • ${calcResult.holiday_days} public holiday${calcResult.holiday_days === 1 ? '' : 's'} excluded`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-ink-secondary">Total Leave to Deduct:</span>
                      <div className="text-xl font-extrabold text-primary-dark">
                        {calcResult.total_days} {calcResult.total_days === 1 ? 'Day' : 'Days'}
                      </div>
                    </div>
                  </div>

                  {/* Day-by-Day Breakdown Pills */}
                  {calcResult.breakdown && calcResult.breakdown.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary-darker">Date Breakdown</span>
                      <div className="flex flex-wrap gap-1.5">
                        {calcResult.breakdown.map((item) => (
                          <div
                            key={item.date}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border ${
                              item.is_working_day
                                ? 'bg-surface-paper border-primary-light text-primary-darker shadow-2xs'
                                : 'bg-warning-lighter/90 border-warning-light text-warning-darker'
                            }`}
                            title={item.reason || 'Working day'}
                          >
                            <span className="font-semibold">{item.date.slice(5)} ({item.day_name.slice(0, 3)}):</span>
                            <span>{item.is_working_day ? 'Leave (Deducted)' : item.reason || 'Week Off (Excluded)'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {calcResult.total_days === 0 && (
                    <div className="rounded-lg bg-warning-lighter border border-warning-light p-2.5 text-xs text-warning-dark">
                      ⚠️ The selected dates consist entirely of non-working days or company week-offs. No leave days will be deducted.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Reason */}
          <div className="sm:col-span-2">
            <label htmlFor="reason" className="block text-sm font-medium text-ink-primary">
              Reason <span className="text-error-main">*</span>
            </label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Provide a reason for your leave application..."
              className="mt-1 resize-y"
              required
            />
          </div>
        </div>

        {/* Error message */}
        {applyLeave.isError && (
          <div className="mt-4 rounded-md bg-error-lighter border border-error-light p-3 text-sm text-error-dark" role="alert">
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
          <Button variant="outlined" color="inherit"
            type="button"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isFormValid || applyLeave.isPending}
          >
            {applyLeave.isPending ? 'Submitting...' : 'Submit Application'}
          </Button>
        </div>
      </form>
    </div>
  );
}
