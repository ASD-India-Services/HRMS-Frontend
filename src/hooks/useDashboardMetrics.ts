/**
 * TanStack Query hook for fetching dashboard summary metrics.
 *
 * Fetches key HR metrics (active employees, on leave today,
 * pending approvals, open positions) from the employee analytics endpoint.
 * Auto-refreshes every 60 seconds to keep dashboard data current.
 *
 * Requirements: 1.1
 */

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { DashboardMetrics } from '@/types/dashboard';

async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const response = await api.get<DashboardMetrics>('/api/v1/reports/dashboard-summary/');
  return response.data;
}

export function useDashboardMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics'],
    queryFn: fetchDashboardMetrics,
    refetchInterval: 60_000, // Refresh every minute
  });
}
