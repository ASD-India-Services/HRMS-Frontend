/**
 * Manager / Team Leader Dashboard View
 *
 * Tailored for Department Heads and Managers.
 * Displays team-wide metrics, pending approvals shortcuts,
 * and analytics charts. All widgets are strictly permission-gated.
 *
 * Receives the dateRange prop from the parent Dashboard so the date
 * range filter doesn't need to be duplicated.
 */

import { MetricsSection } from './MetricsSection';
import { ChartsGrid } from './ChartsGrid';
import { Can } from '@/components/Can';
import { ButtonLink } from '@/components/ui/Button';
import { Iconify } from '@/components/Iconify';
import type { DateRange } from './DateRangeFilter';

interface ManagerDashboardProps {
  dateRange: DateRange;
}

export function ManagerDashboard({ dateRange }: ManagerDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Quick Action Bar for Managers */}
      <div className="flex flex-wrap items-center gap-3">
        <Can permissions={['leaves.approve']}>
          <ButtonLink to="/leaves/approvals" startIcon={<Iconify icon="leaveApprovals" />}>
            Review Leave Approvals
          </ButtonLink>
        </Can>
        <Can permissions={['attendance_register.view']}>
          <ButtonLink to="/attendance-register" variant="outlined" color="inherit" startIcon={<Iconify icon="attendanceRegister" />}>
            Attendance Register
          </ButtonLink>
        </Can>
        <Can permissions={['expenses.approve']}>
          <ButtonLink to="/expenses/approvals" variant="outlined" color="inherit" startIcon={<Iconify icon="expenseApprovals" />}>
            Expense Approvals
          </ButtonLink>
        </Can>
      </div>

      {/* Overview Metric Cards — each gated internally by MetricsSection */}
      <MetricsSection />

      {/* Analytics Charts — each gated internally by ChartsGrid */}
      <ChartsGrid dateRange={dateRange} />
    </div>
  );
}
