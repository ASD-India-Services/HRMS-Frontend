/**
 * TanStack Query hooks for Appraisal Management.
 * Handles fetching appraisal cycles, individual appraisals with goals, and filtering.
 * Requirements: 20.1, 20.2, 20.3
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import { APPRAISALS } from '@/lib/endpoints';
import type {
  AppraisalCycle,
  Appraisal,
  AppraisalFilters,
  PaginatedAppraisalCycleResponse,
  PaginatedAppraisalResponse,
} from '@/types/appraisal';

// --- Fetch Functions ---

async function fetchAppraisalCycles(): Promise<PaginatedAppraisalCycleResponse> {
  const response = await api.get<PaginatedAppraisalCycleResponse>(APPRAISALS.CYCLES);
  return response.data;
}

async function fetchAppraisals(filters: AppraisalFilters): Promise<PaginatedAppraisalResponse> {
  const params: Record<string, string | number> = {};

  if (filters.cycle) params.cycle = filters.cycle;
  if (filters.status) params.status = filters.status;
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;

  const response = await api.get<PaginatedAppraisalResponse>(APPRAISALS.LIST, { params });
  return response.data;
}

async function fetchAppraisalDetail(id: string): Promise<Appraisal> {
  const response = await api.get<Appraisal>(APPRAISALS.DETAIL(id));
  return response.data;
}

// --- Query Hooks ---

export function useAppraisalCycles() {
  return useQuery({
    queryKey: ['appraisal-cycles'],
    queryFn: fetchAppraisalCycles,
  });
}

export function useAppraisals(filters: AppraisalFilters) {
  return useQuery({
    queryKey: ['appraisals', filters],
    queryFn: () => fetchAppraisals(filters),
    placeholderData: keepPreviousData,
  });
}

export function useAppraisalDetail(id: string) {
  return useQuery({
    queryKey: ['appraisal', id],
    queryFn: () => fetchAppraisalDetail(id),
    enabled: !!id,
  });
}
