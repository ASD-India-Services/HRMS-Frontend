/**
 * Leave Balance Card — displays balance per leave type with a visual indicator.
 * Requirements: 27.2
 */

import type { LeaveBalance } from '@/types/leave';

interface LeaveBalanceCardProps {
  balance: LeaveBalance;
}

export function LeaveBalanceCard({ balance }: LeaveBalanceCardProps) {
  const { leave_type, allocated_days, used_days, remaining_days } = balance;
  const usagePercent = allocated_days > 0 ? (used_days / allocated_days) * 100 : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-gray-900">{leave_type.name}</h4>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-primary-600">{remaining_days}</p>
          <p className="text-xs text-gray-500">remaining</p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <p>{used_days} used</p>
          <p>{allocated_days} allocated</p>
        </div>
      </div>

      {/* Usage bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-primary-500 transition-all"
          style={{ width: `${Math.min(usagePercent, 100)}%` }}
          role="progressbar"
          aria-valuenow={used_days}
          aria-valuemin={0}
          aria-valuemax={allocated_days}
          aria-label={`${leave_type.name} usage: ${used_days} of ${allocated_days} days used`}
        />
      </div>
    </div>
  );
}
