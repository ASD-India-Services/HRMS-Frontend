import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePerformanceData } from '@/hooks/usePerformance';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { DashboardMetricCard as StatCard } from '@/components/Dashboard/DashboardMetricCard';
import { DashboardSectionHeading } from '@/components/Dashboard/DashboardSectionHeading';
import { StateView } from '@/components/ui/StateView';
import { ChartCard, ChartTooltip, DonutChart, AXIS_PROPS, getChartTheme } from '@/components/ui/Chart';
import { Iconify } from '@/components/Iconify';

// ─── Status Colors (design tokens) ──────────────────────────────────────────

const OBJECTIVE_STATUS_COLORS: Record<string, string> = {
  completed: 'rgb(var(--success-main))',
  achieved: 'rgb(var(--success-main))',
  in_progress: 'rgb(var(--info-main))',
  not_started: 'rgb(var(--warning-main))',
  cancelled: 'rgb(var(--grey-500))',
  other: 'rgb(var(--grey-600))',
};

export default function PerformanceDashboard() {
  const { goals, kras, feedbacks, isLoading } = usePerformanceData();

  // 1. Objectives Metric
  const totalObjectives = goals.length;

  // 2. Key Results Metric
  const totalKeyResults = kras.length;

  // 3. Feedbacks Metric
  const totalFeedbacks = feedbacks.length;

  // 4. Objectives At-Risk calculation
  const atRiskObjectives = useMemo(() => {
    const today = new Date();
    return goals.filter((g) => {
      const isCompleted =
        (g.status || '').toLowerCase() === 'completed' ||
        (g.status || '').toLowerCase() === 'achieved' ||
        (g.progress_percentage ?? 0) >= 100;
      if (isCompleted) return false;

      // Check if marked as at_risk
      if ((g.status || '').toLowerCase() === 'at_risk') return true;

      // Check overdue or close to end date with low progress
      if (g.end_date) {
        const endDate = new Date(g.end_date);
        if (endDate < today) return true;
        const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7 && (g.progress_percentage ?? 0) < 50) return true;
      }
      return false;
    });
  }, [goals]);

  const atRiskCount = atRiskObjectives.length;

  // Objective Status Breakdown for populated state
  const objectiveStatusData = useMemo(() => {
    const counts: Record<string, number> = {
      completed: 0,
      in_progress: 0,
      not_started: 0,
      cancelled: 0,
    };

    goals.forEach((g) => {
      const st = (g.status || '').toLowerCase();
      if (st === 'completed' || st === 'achieved') counts.completed++;
      else if (st === 'in_progress') counts.in_progress++;
      else if (st === 'cancelled') counts.cancelled++;
      else counts.not_started++;
    });

    return [
      { name: 'Completed', value: counts.completed, color: OBJECTIVE_STATUS_COLORS.completed },
      { name: 'In Progress', value: counts.in_progress, color: OBJECTIVE_STATUS_COLORS.in_progress },
      { name: 'Not Started', value: counts.not_started, color: OBJECTIVE_STATUS_COLORS.not_started },
      { name: 'Cancelled', value: counts.cancelled, color: OBJECTIVE_STATUS_COLORS.cancelled },
    ].filter((item) => item.value > 0);
  }, [goals]);

  // Key Result Breakdown for populated state
  const kraStatusData = useMemo(() => {
    const active = kras.filter((k) => k.is_active).length;
    const inactive = kras.length - active;
    return [
      { name: 'Active', value: active, color: 'rgb(var(--success-main))' },
      { name: 'Inactive', value: inactive, color: 'rgb(var(--grey-500))' },
    ].filter((item) => item.value > 0);
  }, [kras]);

  // Feedback Rating Breakdown for populated state
  const feedbackRatingData = useMemo(() => {
    const ratings: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    feedbacks.forEach((f) => {
      const r = Math.min(5, Math.max(1, Math.round(Number(f.overall_rating) || 3)));
      ratings[r] = (ratings[r] || 0) + 1;
    });

    return [
      { rating: '5 stars', count: ratings[5], color: 'rgb(var(--success-main))' },
      { rating: '4 stars', count: ratings[4], color: 'rgb(var(--info-main))' },
      { rating: '3 stars', count: ratings[3], color: 'rgb(var(--warning-main))' },
      { rating: '2 stars', count: ratings[2], color: 'rgb(var(--warning-dark))' },
      { rating: '1 star', count: ratings[1], color: 'rgb(var(--error-main))' },
    ];
  }, [feedbacks]);

  const theme = getChartTheme();

  const viewLink = (to: string, label: string) => (
    <ButtonLink to={to} variant="text" size="small" endIcon={<Iconify icon="arrow-right" />} aria-label={label}>
      View
    </ButtonLink>
  );

  return (
    <PageContainer>
      <PageHeader
        title="Performance Dashboard"
        subtitle="Objectives, key results and feedback at a glance"
        actions={
          <ButtonLink to="/goals" startIcon={<Iconify icon="plus" />}>
            Add Objective
          </ButtonLink>
        }
      />

      <DashboardSectionHeading title="Performance snapshot" description="Objectives, key results, feedback, and items that may need attention." icon="goals" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total employee objectives" value={totalObjectives} icon="goals" href="/goals" isLoading={isLoading} />
        <StatCard title="Total key results" value={totalKeyResults} icon="kras" href="/kras" isLoading={isLoading} />
        <StatCard title="Total feedbacks" value={totalFeedbacks} icon="feedback" href="/performance-feedback" isLoading={isLoading} />
        <StatCard
          title="Objectives At-Risk"
          value={atRiskCount}
          icon="warning"
          caption={atRiskCount === 0 ? 'No OKRs are currently At-Risk.' : 'OKRs require immediate attention'}
          isLoading={isLoading}
        />
      </div>

      <DashboardSectionHeading title="Performance analytics" description="Progress and feedback patterns from current performance records." icon="chart" />
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Objective status" action={viewLink('/goals', 'View Objectives')} height={300}>
          {totalObjectives === 0 ? (
            <StateView icon="goals" title="No objectives are available." className="py-0" role="status" />
          ) : (
            <DonutChart data={objectiveStatusData} />
          )}
        </ChartCard>

        <ChartCard title="Key result status" action={viewLink('/kras', 'View Key Results')} height={300}>
          {totalKeyResults === 0 ? (
            <StateView icon="kras" title="No key results are available." className="py-0" role="status" />
          ) : (
            <DonutChart data={kraStatusData} />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Feedback status"
          subtitle={totalFeedbacks > 0 ? `Total Reviews: ${totalFeedbacks}` : undefined}
          action={viewLink('/performance-feedback', 'View Feedbacks')}
          height={300}
        >
          {totalFeedbacks === 0 ? (
            <StateView icon="feedback" title="No feedbacks are available." className="py-0" role="status" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feedbackRatingData}>
                <CartesianGrid {...theme.grid} />
                <XAxis dataKey="rating" tick={theme.tick} {...AXIS_PROPS} />
                <YAxis allowDecimals={false} tick={theme.tick} {...AXIS_PROPS} />
                <Tooltip content={<ChartTooltip />} cursor={theme.cursor} />
                <Bar dataKey="count" name="Reviews" fill="rgb(var(--info-main))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </PageContainer>
  );
}
