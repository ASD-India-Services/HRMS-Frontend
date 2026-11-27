import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@platform/auth-sdk';
import { useShiftPromptStatus, useRespondShiftPrompt } from '@/hooks/useAttendance';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Iconify } from '@/components/Iconify';
import { useToast } from '@/components/ui/Toast';

/**
 * Format remaining seconds into MM:SS display.
 */
function formatCountdown(totalSecs: number): string {
  if (totalSecs <= 0 || isNaN(totalSecs)) return '00:00';
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function ShiftEndConfirmationDialog() {
  const { logout } = useAuth();
  const { showToast } = useToast();
  const { data: statusData, refetch } = useShiftPromptStatus();
  const respondMutation = useRespondShiftPrompt();

  const [isOpen, setIsOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(300);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync state when backend indicates prompt is required
  useEffect(() => {
    if (statusData?.prompt_required) {
      setIsOpen(true);
      const secs = statusData.remaining_seconds ?? 300;
      setRemainingSeconds(secs);
      setTotalSeconds(statusData.timeout_seconds ?? 300);
    } else {
      setIsOpen(false);
    }
  }, [statusData?.prompt_required, statusData?.remaining_seconds, statusData?.timeout_seconds]);

  // Countdown timer when modal is open
  useEffect(() => {
    if (!isOpen || remainingSeconds <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeoutAutoCheckout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, remainingSeconds]);

  // Handle Timeout (Countdown reached 0)
  const handleTimeoutAutoCheckout = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await respondMutation.mutateAsync({
        action: 'timeout',
        session_id: statusData?.session_id,
      });
      showToast('Shift-end prompt expired. You have been automatically checked out.', 'warning');
      setIsOpen(false);
      setTimeout(() => {
        logout();
      }, 1500);
    } catch {
      logout();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Manual Check Out
  const handleManualCheckout = async () => {
    setIsSubmitting(true);
    try {
      await respondMutation.mutateAsync({
        action: 'checkout',
        session_id: statusData?.session_id,
      });
      showToast('Checked out successfully. Logging out...', 'success');
      setIsOpen(false);
      setTimeout(() => {
        logout();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record check out.';
      showToast(msg, 'error');
      setIsSubmitting(false);
    }
  };

  // Handle Continue Working (Overtime)
  const handleContinueWorking = async () => {
    setIsSubmitting(true);
    try {
      const res = await respondMutation.mutateAsync({
        action: 'continue',
        session_id: statusData?.session_id,
      });
      showToast(
        res.detail || 'Overtime extension acknowledged. Session remains active.',
        'info'
      );
      setIsOpen(false);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to extend session.';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const percentage = totalSeconds > 0 ? Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100)) : 0;
  const canContinue = statusData?.can_continue !== false;
  const continueCount = statusData?.continue_count ?? 0;
  const maxContinue = statusData?.max_continue_prompts ?? 3;

  return (
    <Modal
      open={isOpen}
      onClose={() => {}} // Disallow dismissing via click outside
      labelledBy="shift-end-dialog-title"
      size="sm"
      closeOnEscape={false}
      closeOnOverlayClick={false}
    >
      <div className="p-6 text-center select-none">
        {/* Animated Warning / Clock Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning-lighter text-warning-main ring-8 ring-warning-lighter/50 animate-pulse">
          <Iconify icon="attendance" width={36} />
        </div>

        {/* Title */}
        <h3 id="shift-end-dialog-title" className="mt-4 text-lg font-bold text-ink-primary">
          Shift Completed — Action Required
        </h3>

        {/* Subtitle / Shift Info */}
        <p className="mt-1 text-sm text-ink-secondary">
          Your scheduled shift{' '}
          {statusData?.shift_name ? (
            <span className="font-semibold text-ink-primary">"{statusData.shift_name}"</span>
          ) : (
            ''
          )}{' '}
          ended at{' '}
          <span className="font-semibold text-ink-primary">
            {statusData?.shift_end_time || 'the scheduled time'}
          </span>
          .
        </p>

        {/* Countdown Box */}
        <div className="mt-5 rounded-xl border border-divider bg-surface-neutral/60 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-secondary mb-1.5">
            <span>Automatic Logout &amp; Check-Out in:</span>
            <span className="font-mono text-sm font-bold text-error-main">
              {formatCountdown(remainingSeconds)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-grey-200">
            <div
              className="h-full bg-gradient-to-r from-warning-main to-error-main transition-all duration-1000 ease-linear"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {continueCount > 0 && (
            <div className="mt-2.5 text-[11px] text-ink-secondary flex items-center justify-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary-main" />
              <span>
                Overtime Extension active: <strong>{continueCount}</strong> of{' '}
                <strong>{maxContinue}</strong> used
              </span>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-ink-disabled">
          If you are finished for the day, please check out. Otherwise, choose continue to stay clocked in.
        </p>

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          {canContinue && (
            <Button
              variant="outlined"
              color="inherit"
              className="w-full sm:w-auto"
              disabled={isSubmitting}
              onClick={handleContinueWorking}
              startIcon={<Iconify icon="arrow-right" />}
            >
              Continue Working
            </Button>
          )}

          <Button
            color="error"
            className="w-full sm:w-auto font-bold shadow-md"
            disabled={isSubmitting}
            onClick={handleManualCheckout}
            startIcon={<Iconify icon="logout" />}
          >
            {isSubmitting ? 'Processing...' : 'Check Out & Log Out'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
