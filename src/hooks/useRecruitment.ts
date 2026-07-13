/**
 * TanStack Query hooks for the Recruitment module.
 * Handles fetching job openings, applicants, interviews, and pipeline transitions.
 * Requirements: 19.1, 19.2, 19.3, 24.2
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  JobOpening,
  JobApplicant,
  Interview,
  JobOpeningFilters,
  ApplicantFilters,
  InterviewFilters,
  ChangeStatusPayload,
  PaginatedResponse,
} from '@/types/recruitment';

// ─── Fetch Functions ─────────────────────────────────────────────────────────

async function fetchJobOpenings(filters: JobOpeningFilters): Promise<PaginatedResponse<JobOpening>> {
  const params: Record<string, string | number> = {};

  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.department) params.department = filters.department;
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;

  const response = await api.get<PaginatedResponse<JobOpening>>('/api/v1/recruitment/job-openings/', { params });
  return response.data;
}

async function fetchJobOpening(id: string): Promise<JobOpening> {
  const response = await api.get<JobOpening>(`/api/v1/recruitment/job-openings/${id}/`);
  return response.data;
}

async function fetchApplicants(filters: ApplicantFilters): Promise<PaginatedResponse<JobApplicant>> {
  const params: Record<string, string | number> = {};

  if (filters.job_opening) params.job_opening = filters.job_opening;
  if (filters.status) params.status = filters.status;
  if (filters.search) params.search = filters.search;
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;

  const response = await api.get<PaginatedResponse<JobApplicant>>('/api/v1/recruitment/applicants/', { params });
  return response.data;
}

async function fetchInterviews(filters: InterviewFilters): Promise<PaginatedResponse<Interview>> {
  const params: Record<string, string | number> = {};

  if (filters.job_opening) params.job_opening = filters.job_opening;
  if (filters.status) params.status = filters.status;
  if (filters.from_date) params.from_date = filters.from_date;
  if (filters.to_date) params.to_date = filters.to_date;
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;

  const response = await api.get<PaginatedResponse<Interview>>('/api/v1/recruitment/interviews/', { params });
  return response.data;
}

async function changeApplicantStatus({ id, payload }: { id: string; payload: ChangeStatusPayload }): Promise<JobApplicant> {
  const response = await api.patch<JobApplicant>(`/api/v1/recruitment/applicants/${id}/change-status/`, payload);
  return response.data;
}

// ─── Query Hooks ─────────────────────────────────────────────────────────────

export function useJobOpenings(filters: JobOpeningFilters) {
  return useQuery({
    queryKey: ['job-openings', filters],
    queryFn: () => fetchJobOpenings(filters),
    placeholderData: keepPreviousData,
  });
}

export function useJobOpening(id: string) {
  return useQuery({
    queryKey: ['job-opening', id],
    queryFn: () => fetchJobOpening(id),
    enabled: !!id,
  });
}

export function useApplicants(filters: ApplicantFilters) {
  return useQuery({
    queryKey: ['applicants', filters],
    queryFn: () => fetchApplicants(filters),
    placeholderData: keepPreviousData,
  });
}

export function useInterviews(filters: InterviewFilters) {
  return useQuery({
    queryKey: ['interviews', filters],
    queryFn: () => fetchInterviews(filters),
    placeholderData: keepPreviousData,
  });
}

// ─── Mutation Hooks ──────────────────────────────────────────────────────────

export function useChangeApplicantStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: changeApplicantStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicants'] });
      queryClient.invalidateQueries({ queryKey: ['job-openings'] });
    },
  });
}
