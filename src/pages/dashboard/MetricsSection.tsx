/**
 * Dashboard Metrics Section
 *
 * Renders 4 StatCards in a responsive grid showing key HR metrics.
 * Each card is clickable, navigating to the corresponding module.
 * Shows StatCard skeletons while data is being fetched.
 *
 * Requirements: 1.1, 1.3, 1.4, 18.4
 */

import { DashboardMetricCard as StatCard } from '@/components/Dashboard/DashboardMetricCard';
import { DashboardSectionHeading } from '@/components/Dashboard/DashboardSectionHeading';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { Can } from '@/components/Can';

export function MetricsSection() {
  const { data, isLoading } = useDashboardMetrics();

  return (
    <section className="space-y-4">
      <DashboardSectionHeading title="Workforce snapshot" description="Current people, leave, approvals, and hiring at a glance." icon="employees" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Can permissions={['employees.view']}>
          <StatCard
            title="Total Active Employees"
            value={data?.total_active_employees ?? null}
            icon="employees"
            href="/employees"
            isLoading={isLoading}
          />
        </Can>
        <Can permissions={['leaves.view']}>
          <StatCard
            title="On Leave Today"
            value={data?.employees_on_leave_today ?? null}
            icon="leaves"
            href="/my-leaves"
            isLoading={isLoading}
          />
        </Can>
        <Can permissions={['leaves.approve', 'expenses.approve']} requireAll={false}>
          <StatCard
            title="Pending Approvals"
            value={data?.pending_approvals ?? null}
            icon="attendance"
            href="/leaves/approvals"
            isLoading={isLoading}
          />
        </Can>
        <Can permissions={['recruitment.view']}>
          <StatCard
            title="Open Positions"
            value={data?.open_positions ?? null}
            icon="recruitment"
            href="/recruitment"
            isLoading={isLoading}
          />
        </Can>
      </div>
    </section>
  );
}
