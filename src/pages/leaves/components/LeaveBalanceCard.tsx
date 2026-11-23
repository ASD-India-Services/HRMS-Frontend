/**
 * Leave Balance Card — displays balance per leave type with a visual indicator.
 * Requirements: 27.2
 */

import type { LeaveBalance } from '@/types/leave';
import { Card } from '@/components/ui/Card';

interface LeaveBalanceCardProps {
  balance: LeaveBalance;
}

export function LeaveBalanceCard({ balance }: LeaveBalanceCardProps) {
  const allocated_days = Number(balance.allocated_days) || 0;
  const used_days = Number(balance.used_days) || 0;
  const remaining_days = balance.remaining_days ?? balance.available_balance ?? (allocated_days - used_days);
  const leave_type_name = balance.leave_type_name ?? balance.leave_type?.name ?? 'Unknown';
  const usagePercent = allocated_days > 0 ? (used_days / allocated_days) * 100 : 0;

  return (
    <Card className="p-4">
      <h4 className="text-sm font-semibold text-ink-primary">{leave_type_name}</h4>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-primary-main">{remaining_days}</p>
          <p className="text-xs text-ink-secondary">remaining</p>
        </div>
        <div className="text-right text-xs text-ink-secondary">
          <p>{used_days} used</p>
          <p>{allocated_days} allocated</p>
        </div>
      </div>

      {/* Usage bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-neutral">
        <div
          className="h-full rounded-full bg-primary-main transition-all"
          style={{ width: `${Math.min(usagePercent, 100)}%` }}
          role="progressbar"
          aria-valuenow={used_days}
          aria-valuemin={0}
          aria-valuemax={allocated_days}
          aria-label={`${leave_type_name} usage: ${used_days} of ${allocated_days} days used`}
        />
      </div>
    </Card>
  );
}
