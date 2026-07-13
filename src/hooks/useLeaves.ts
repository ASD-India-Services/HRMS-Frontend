/**
 * TanStack Query hooks for Leave Management.
 * Handles fetching leave types, balances, applications, and mutation for apply/approve/reject.
 * Requirements: 27.2, 27.7
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  LeaveType,
  LeaveBalance,
  LeaveApplication,
  LeaveApplicationPayload,
  LeaveApprovalPayload,
  LeaveFilters,
  PaginatedLeaveResponse,
} from '@/types/leave';

// --- Fetch Functions ---

async function fetchLeaveTypes(): Promise<LeaveType[]> {
  const response = await api.get('/api/v1/leaves/types/');
  // Backend may return paginated {count, results} or plain array
  const data = response.data;
  return Array.isArray(data) ? data : (data.results ?? []);
}

async function fetchLeaveBalances(): Promise<LeaveBalance[]> {
  const response = await api.get('/api/v1/leaves/balance/');
  const data = response.data;
  return Array.isArray(data) ? data : (data.results ?? []);
}

async function fetchLeaveApplications(filters: LeaveFilters): Promise<PaginatedLeaveResponse> {
  const params: Record<string, string | number> = {};

  if (filters.status) params.status = filters.status;
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;

  const response = await api.get<PaginatedLeaveResponse>('/api/v1/leaves/applications/', { params });
  return response.data;
}

async function applyLeave(payload: LeaveApplicationPayload): Promise<LeaveApplication> {
  const response = await api.post<LeaveApplication>('/api/v1/leaves/applications/', payload);
  return response.data;
}

async function approveLeave({ id, payload }: { id: string; payload: LeaveApprovalPayload }): Promise<LeaveApplication> {
  const response = await api.post<LeaveApplication>(`/api/v1/leaves/applications/${id}/approve/`, payload);
  return response.data;
}

async function rejectLeave({ id, payload }: { id: string; payload: LeaveApprovalPayload }): Promise<LeaveApplication> {
  const response = await api.post<LeaveApplication>(`/api/v1/leaves/applications/${id}/reject/`, payload);
  return response.data;
}

// --- Query Hooks ---

export function useLeaveTypes() {
  return useQuery({
    queryKey: ['leave-types'],
    queryFn: fetchLeaveTypes,
  });
}

export function useLeaveBalances() {
  return useQuery({
    queryKey: ['leave-balances'],
    queryFn: fetchLeaveBalances,
  });
}

export function useLeaveApplications(filters: LeaveFilters) {
  return useQuery({
    queryKey: ['leave-applications', filters],
    queryFn: () => fetchLeaveApplications(filters),
    placeholderData: keepPreviousData,
  });
}

// --- Mutation Hooks ---

export function useApplyLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: applyLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-applications'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
    },
  });
}

export function useApproveLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-applications'] });
    },
  });
}

export function useRejectLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-applications'] });
    },
  });
}
