/**
 * Dashboard Charts Grid
 *
 * Renders 6 ChartWidgets in a responsive grid layout.
 * Each chart fetches its own data via TanStack Query and manages its own
 * error boundary. Date range is passed from the parent to filter all charts.
 *
 * Requirements: 1.2, 1.5, 1.6
 */

import { ChartWidget } from '@/components/ChartWidget';

const CHARTS_ENDPOINT = '/api/v1/reports/dashboard-charts/';

interface ChartsGridProps {
  dateRange: { from: string; to: string };
}

export function ChartsGrid({ dateRange }: ChartsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      <ChartWidget
        title="Headcount Trend"
        queryKey={['chart', 'headcount-trend']}
        endpoint={CHARTS_ENDPOINT}
        extraParams={{ chart: 'headcount-trend' }}
        type="line"
        dateRange={dateRange}
      />
      <ChartWidget
        title="Department Distribution"
        queryKey={['chart', 'department-distribution']}
        endpoint={CHARTS_ENDPOINT}
        extraParams={{ chart: 'department-distribution' }}
        type="pie"
        dateRange={dateRange}
      />
      <ChartWidget
        title="Attendance Overview"
        queryKey={['chart', 'attendance-overview']}
        endpoint={CHARTS_ENDPOINT}
        extraParams={{ chart: 'attendance-overview' }}
        type="bar"
        dateRange={dateRange}
      />
      <ChartWidget
        title="Leave Statistics"
        queryKey={['chart', 'leave-statistics']}
        endpoint={CHARTS_ENDPOINT}
        extraParams={{ chart: 'leave-statistics' }}
        type="donut"
        dateRange={dateRange}
      />
      <ChartWidget
        title="Payroll Summary"
        queryKey={['chart', 'payroll-summary']}
        endpoint={CHARTS_ENDPOINT}
        extraParams={{ chart: 'payroll-summary' }}
        type="bar"
        dateRange={dateRange}
      />
      <ChartWidget
        title="Recruitment Pipeline"
        queryKey={['chart', 'recruitment-pipeline']}
        endpoint={CHARTS_ENDPOINT}
        extraParams={{ chart: 'recruitment-pipeline' }}
        type="funnel"
        dateRange={dateRange}
      />
    </div>
  );
}
