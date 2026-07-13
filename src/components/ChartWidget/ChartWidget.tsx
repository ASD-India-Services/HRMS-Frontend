/**
 * Self-fetching chart widget that renders various chart types using Recharts.
 * Each widget owns its data fetch via TanStack Query and has its own error boundary.
 *
 * Supported chart types:
 *  - 'line'   → LineChart with Area fill
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
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import api from '@/lib/api';
import type { ChartWidgetProps, ChartDataPoint, ChartResponse } from '@/types/dashboard';
import { ChartSkeleton } from './ChartSkeleton';
import { ChartError } from './ChartError';

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
];

// --- Error Boundary ---

interface ErrorBoundaryProps {
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
        <ChartError
          message="An unexpected error occurred while rendering this chart."
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

// --- Chart Renderers ---

function renderLineChart(data: ChartDataPoint[], height: number) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="value"
          stroke={CHART_COLORS[0]}
          fill={CHART_COLORS[0]}
          fillOpacity={0.2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function renderBarChart(data: ChartDataPoint[], height: number) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function renderPieChart(data: ChartDataPoint[], height: number, innerRadius = 0) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius="80%"
          paddingAngle={2}
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

function renderFunnelChart(data: ChartDataPoint[], height: number) {
  // Recharts doesn't have a native Funnel chart — use a vertical BarChart
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={100} />
        <Tooltip />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// --- Main Component ---

function ChartWidgetInner({
  queryKey,
  endpoint,
  type,
  dateRange,
  extraParams,
  height = 300,
  onSegmentClick: _onSegmentClick,
}: Omit<ChartWidgetProps, 'title'>) {
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

  if (isLoading) {
    return <ChartSkeleton height={height} />;
  }

  if (isError) {
    return (
      <ChartError
        message={error instanceof Error ? error.message : 'Failed to load chart data'}
        onRetry={() => { refetch(); }}
      />
    );
  }

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
    <div>
      {renderChart()}
    </div>
  );
}

export function ChartWidget(props: ChartWidgetProps) {
  const { title } = props;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>
      <ChartErrorBoundary>
        <ChartWidgetInner {...props} />
      </ChartErrorBoundary>
    </div>
  );
}
