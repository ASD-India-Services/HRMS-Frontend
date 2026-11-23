/**
 * Dashboard Metrics Section
 *
 * Renders 4 StatCards in a responsive grid showing key HR metrics.
 * Each card is clickable, navigating to the corresponding module.
 * Shows StatCard skeletons while data is being fetched.
 *
 * Requirements: 1.1, 1.3, 1.4, 18.4
 */

import { StatCard } from '@/components/ui/StatCard';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { Can } from '@/components/Can';

export function MetricsSection() {
  const { data, isLoading } = useDashboardMetrics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <StatCard key={i} title="" value={null} isLoading />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <Can permissions={['employees.view']}>
        <StatCard
          title="Total Active Employees"
          value={data?.total_active_employees ?? null}
          icon="employees"
          href="/employees"
        />
      </Can>
      <Can permissions={['leaves.view']}>
        <StatCard
          title="On Leave Today"
          value={data?.employees_on_leave_today ?? null}
          icon="leaves"
          href="/my-leaves"
        />
      </Can>
      <Can permissions={['leaves.approve', 'expenses.approve']} requireAll={false}>
        <StatCard
          title="Pending Approvals"
          value={data?.pending_approvals ?? null}
          icon="attendance"
          href="/leaves/approvals"
        />
      </Can>
      <Can permissions={['recruitment.view']}>
        <StatCard
          title="Open Positions"
          value={data?.open_positions ?? null}
          icon="recruitment"
          href="/recruitment"
        />
      </Can>
    </div>
  );
}
