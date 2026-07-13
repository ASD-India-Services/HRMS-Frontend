/**
 * TanStack Query hooks for the Onboarding module.
 * Handles fetching onboarding tasks/checklist for new hires.
 * Requirements: 24.2
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  OnboardingTask,
  OnboardingFilters,
  OnboardingTaskStatus,
} from '@/types/onboarding';

interface OnboardingTasksResponse {
  tasks: OnboardingTask[];
  total: number;
}

// ─── Fetch Functions ─────────────────────────────────────────────────────────

async function fetchOnboardingTasks(filters: OnboardingFilters): Promise<OnboardingTasksResponse> {
  const params: Record<string, string | number> = {};

  if (filters.employee) params.employee = filters.employee;
  if (filters.status) params.status = filters.status;

  const response = await api.get('/api/v1/onboarding/tasks/', { params });
  const data = response.data;

  // Backend returns paginated {count, results} or plain array
  if (Array.isArray(data)) {
    return { tasks: data, total: data.length };
  }
  if (data && Array.isArray(data.results)) {
    return { tasks: data.results, total: data.count ?? data.results.length };
  }
  // Fallback: if data has a `tasks` property directly (custom endpoint)
  if (data && Array.isArray(data.tasks)) {
    return { tasks: data.tasks, total: data.tasks.length };
  }
  return { tasks: [], total: 0 };
}

async function updateTaskStatus({
  taskId,
  status,
}: {
  taskId: string;
  status: OnboardingTaskStatus;
}): Promise<OnboardingTask> {
  const response = await api.patch<OnboardingTask>(`/api/v1/onboarding/tasks/${taskId}/`, { status });
  return response.data;
}

// ─── Query Hooks ─────────────────────────────────────────────────────────────

export function useOnboardingTasks(filters: OnboardingFilters) {
  return useQuery({
    queryKey: ['onboarding-tasks', filters],
    queryFn: () => fetchOnboardingTasks(filters),
    enabled: !!filters.employee,
  });
}

// ─── Mutation Hooks ──────────────────────────────────────────────────────────

export function useUpdateOnboardingTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTaskStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] });
    },
  });
}
