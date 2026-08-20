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
import { Link } from 'react-router-dom';
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
          <Link
            to="/leaves/approvals"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
          >
            ⏳ Review Leave Approvals
          </Link>
        </Can>
        <Can permissions={['attendance.manage']}>
          <Link
            to="/attendance-register"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            📋 Attendance Register
          </Link>
        </Can>
        <Can permissions={['expenses.approve']}>
          <Link
            to="/expenses/approvals"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            🧾 Expense Approvals
          </Link>
        </Can>
      </div>

      {/* Overview Metric Cards — each gated internally by MetricsSection */}
      <MetricsSection />

      {/* Analytics Charts — each gated internally by ChartsGrid */}
      <ChartsGrid dateRange={dateRange} />
    </div>
  );
}
