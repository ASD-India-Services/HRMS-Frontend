/**
 * TanStack Query hook for fetching pending approval notifications.
 *
 * Aggregates pending items from the leave applications endpoint to
 * populate the notification bell dropdown. Auto-refreshes every 30 seconds.
 *
 * Requirements: 16.5
 */

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { LEAVES } from '@/lib/endpoints';

export interface NotificationItem {
  id: string;
  type: 'leave_approval' | 'expense_approval' | 'travel_approval' | 'overtime_approval' | 'onboarding_task';
  title: string;
  description: string;
  created_at: string;
  link: string;
}

interface LeaveApplication {
  id: string;
  employee_name?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface PaginatedLeaveResponse {
  results: LeaveApplication[];
  count: number;
}

async function fetchNotifications(): Promise<NotificationItem[]> {
  // Fetch pending leave applications as notifications
  const response = await api.get<PaginatedLeaveResponse>(LEAVES.APPLICATIONS, {
    params: { status: 'pending' },
  });

  const data = response.data;
  const leaves: NotificationItem[] = (data.results ?? []).map((app) => ({
    id: app.id,
    type: 'leave_approval' as const,
    title: 'Leave Request',
    description: `${app.employee_name ?? 'Employee'} requested leave`,
    created_at: app.created_at ?? new Date().toISOString(),
    link: '/leaves/approvals',
  }));

  return leaves;
}

export function useNotifications() {
  return useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 30_000, // Refresh every 30 seconds
  });
}
