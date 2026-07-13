/**
 * TypeScript interfaces for Dashboard components
 *
 * Defines metrics response types, chart data structures,
 * and props for MetricCard and ChartWidget components.
 *
 * Requirements: 1.1, 1.2
 */

export interface DashboardMetrics {
  total_active_employees: number;
  employees_on_leave_today: number;
  pending_approvals: number;
  open_positions: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  category?: string;
}

export interface ChartResponse {
  title: string;
  data: ChartDataPoint[];
  meta?: Record<string, unknown>;
}

export interface MetricCardProps {
  title: string;
  value: number | string | null;
  icon: string;
  /** Link to navigate on click */
  href: string;
  /** Loading state */
  isLoading: boolean;
  /** Optional trend indicator */
  trend?: { direction: 'up' | 'down' | 'flat'; percentage: number };
}

export interface ChartWidgetProps {
  /** Human-readable title */
  title: string;
  /** TanStack Query key for the chart data */
  queryKey: string[];
  /** API endpoint to fetch chart data */
  endpoint: string;
  /** Chart type */
  type: 'line' | 'bar' | 'pie' | 'donut' | 'funnel';
  /** Date range filter params (injected from parent) */
  dateRange?: { from: string; to: string };
  /** Additional query params to pass to the endpoint */
  extraParams?: Record<string, string>;
  /** Height in pixels */
  height?: number;
  /** Click handler for drill-down navigation */
  onSegmentClick?: (segment: ChartDataPoint) => void;
}
