/**
 * TanStack Query hooks for the Training module.
 * Handles fetching training events, enrollments, and completion.
 * Requirements: 24.2
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  TrainingEvent,
  TrainingEventDetail,
  TrainingEnrollment,
  TrainingFilters,
  EnrollPayload,
  CompleteFeedback,
  PaginatedResponse,
} from '@/types/training';

// ─── Fetch Functions ─────────────────────────────────────────────────────────

async function fetchTrainingEvents(filters: TrainingFilters): Promise<PaginatedResponse<TrainingEvent>> {
  const params: Record<string, string | number> = {};

  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;

  const response = await api.get<PaginatedResponse<TrainingEvent>>('/api/v1/training/events/', { params });
  return response.data;
}

async function fetchTrainingEvent(id: string): Promise<TrainingEventDetail> {
  const response = await api.get<TrainingEventDetail>(`/api/v1/training/events/${id}/`);
  return response.data;
}

async function enrollInEvent(payload: EnrollPayload): Promise<TrainingEnrollment> {
  const response = await api.post<TrainingEnrollment>('/api/v1/training/enrollments/', payload);
  return response.data;
}

async function completeEnrollment({
  enrollmentId,
  feedback,
}: {
  enrollmentId: string;
  feedback: CompleteFeedback;
}): Promise<TrainingEnrollment> {
  const response = await api.post<TrainingEnrollment>(
    `/api/v1/training/enrollments/${enrollmentId}/complete/`,
    feedback,
  );
  return response.data;
}

// ─── Query Hooks ─────────────────────────────────────────────────────────────

export function useTrainingEvents(filters: TrainingFilters) {
  return useQuery({
    queryKey: ['training-events', filters],
    queryFn: () => fetchTrainingEvents(filters),
    placeholderData: keepPreviousData,
  });
}

export function useTrainingEvent(id: string) {
  return useQuery({
    queryKey: ['training-event', id],
    queryFn: () => fetchTrainingEvent(id),
    enabled: !!id,
  });
}

// ─── Mutation Hooks ──────────────────────────────────────────────────────────

export function useEnrollInEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: enrollInEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-events'] });
      queryClient.invalidateQueries({ queryKey: ['training-event'] });
    },
  });
}

export function useCompleteEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeEnrollment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-events'] });
      queryClient.invalidateQueries({ queryKey: ['training-event'] });
    },
  });
}
