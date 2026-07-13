/**
 * Dashboard Metrics Section
 *
 * Renders 4 MetricCards in a responsive grid showing key HR metrics.
 * Each card is clickable, navigating to the corresponding module.
 * Shows CardSkeleton loading state while data is being fetched.
 *
 * Requirements: 1.1, 1.3, 1.4, 18.4
 */

import { MetricCard } from '@/components/MetricCard';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { CardSkeleton } from '@/components/Skeleton';

export function MetricsSection() {
  const { data, isLoading } = useDashboardMetrics();

  if (isLoading) {
    return <CardSkeleton count={4} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Active Employees"
        value={data?.total_active_employees ?? null}
        icon="👥"
        href="/employees"
        isLoading={false}
      />
      <MetricCard
        title="On Leave Today"
        value={data?.employees_on_leave_today ?? null}
        icon="🏖️"
        href="/leaves"
        isLoading={false}
      />
      <MetricCard
        title="Pending Approvals"
        value={data?.pending_approvals ?? null}
        icon="⏳"
        href="/leaves/approvals"
        isLoading={false}
      />
      <MetricCard
        title="Open Positions"
        value={data?.open_positions ?? null}
        icon="💼"
        href="/recruitment"
        isLoading={false}
      />
    </div>
  );
}
