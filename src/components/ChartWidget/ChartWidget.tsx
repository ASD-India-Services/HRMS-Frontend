/**
 * Self-fetching chart widget that renders various chart types using Recharts.
 * Each widget owns its data fetch via TanStack Query and has its own error boundary.
 * Rendering is delegated to ChartCard and the shared chart theme (ui/Chart).
 *
 * Supported chart types:
 *  - 'line'   → AreaChart
 *  - 'bar'    → BarChart
 *  - 'pie'    → PieChart
 *  - 'donut'  → PieChart with innerRadius
 *  - 'funnel' → Vertical BarChart (stacked bar representation)
 *
 * Requirements: 1.2, 1.5
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import api from '@/lib/api';
import type { ChartWidgetProps, ChartDataPoint, ChartResponse } from '@/types/dashboard';
import { ChartCard, ChartTooltip, AXIS_PROPS, CHART_HEIGHT, LEGEND_PROPS, getChartTheme } from '@/components/ui/Chart';

// --- Error Boundary ---

interface ErrorBoundaryProps {
  title: string;
  height: number;
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ChartErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ChartWidget render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ChartCard
          title={this.props.title}
          height={this.props.height}
          error="An unexpected error occurred while rendering this chart."
          onRetry={() => {
            this.setState({ hasError: false });
            this.props.onReset?.();
          }}
        />
      );
    }
    return this.props.children;
  }
}

// --- Chart Renderers (all styling comes from the shared chart theme) ---

function renderLineChart(data: ChartDataPoint[], height: number) {
  const theme = getChartTheme();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <CartesianGrid {...theme.grid} />
        <XAxis dataKey="label" tick={theme.tick} {...AXIS_PROPS} />
        <YAxis tick={theme.tick} {...AXIS_PROPS} />
        <Tooltip content={<ChartTooltip />} cursor={theme.cursor} />
        <Area
          type="monotone"
          dataKey="value"
          name="Value"
          stroke={theme.colors[0]}
          fill={theme.colors[0]}
          fillOpacity={0.2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function renderBarChart(data: ChartDataPoint[], height: number) {
  const theme = getChartTheme();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid {...theme.grid} />
        <XAxis dataKey="label" tick={theme.tick} {...AXIS_PROPS} />
        <YAxis tick={theme.tick} {...AXIS_PROPS} />
        <Tooltip content={<ChartTooltip />} cursor={theme.cursor} />
        <Bar dataKey="value" name="Value" fill={theme.colors[0]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function renderPieChart(data: ChartDataPoint[], height: number, innerRadius = 0) {
  const theme = getChartTheme();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="45%"
          innerRadius={innerRadius}
          outerRadius="75%"
          paddingAngle={2}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={theme.colors[index % theme.colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend {...LEGEND_PROPS} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function renderFunnelChart(data: ChartDataPoint[], height: number) {
  // Recharts doesn't have a native Funnel chart — use a vertical BarChart
  const theme = getChartTheme();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid {...theme.grid} vertical horizontal={false} />
        <XAxis type="number" tick={theme.tick} {...AXIS_PROPS} />
        <YAxis type="category" dataKey="label" tick={theme.tick} width={100} {...AXIS_PROPS} />
        <Tooltip content={<ChartTooltip />} cursor={theme.cursor} />
        <Bar dataKey="value" name="Value" radius={[0, 4, 4, 0]}>
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={theme.colors[index % theme.colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// --- Main Component ---

function ChartWidgetInner({
  title,
  queryKey,
  endpoint,
  type,
  dateRange,
  extraParams,
  height = CHART_HEIGHT,
  onSegmentClick: _onSegmentClick,
}: ChartWidgetProps) {
  const { data, isLoading, isError, error, refetch } = useQuery<ChartResponse>({
    queryKey: [...queryKey, dateRange, extraParams],
    queryFn: async () => {
      const params: Record<string, string> = { ...(extraParams ?? {}) };
      if (dateRange?.from) params.from = dateRange.from;
      if (dateRange?.to) params.to = dateRange.to;
      const response = await api.get<ChartResponse>(endpoint, { params });
      return response.data;
    },
  });

  const chartData = data?.data ?? [];

  const renderChart = () => {
    switch (type) {
      case 'line':
        return renderLineChart(chartData, height);
      case 'bar':
        return renderBarChart(chartData, height);
      case 'pie':
        return renderPieChart(chartData, height);
      case 'donut':
        return renderPieChart(chartData, height, 60);
      case 'funnel':
        return renderFunnelChart(chartData, height);
      default:
        return null;
    }
  };

  return (
    <ChartCard
      title={title}
      height={height}
      isLoading={isLoading}
      error={isError ? (error instanceof Error ? error.message : 'Failed to load chart data') : null}
      onRetry={() => { refetch(); }}
      isEmpty={chartData.length === 0}
    >
      {renderChart()}
    </ChartCard>
  );
}

export function ChartWidget(props: ChartWidgetProps) {
  return (
    <ChartErrorBoundary title={props.title} height={props.height ?? CHART_HEIGHT}>
      <ChartWidgetInner {...props} />
    </ChartErrorBoundary>
  );
}
