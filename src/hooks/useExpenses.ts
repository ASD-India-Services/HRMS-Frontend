/**
 * TanStack Query hooks for Expense Management.
 * Handles fetching expense types, claims, and mutations for submit/approve/reject/upload.
 * Requirements: 27.6, 27.7
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ExpenseType,
  ExpenseClaim,
  ExpenseClaimPayload,
  ExpenseApprovalPayload,
  ExpenseFilters,
  PaginatedExpenseResponse,
} from '@/types/expense';

// --- Fetch Functions ---

async function fetchExpenseTypes(): Promise<ExpenseType[]> {
  const response = await api.get('/api/v1/expenses/types/');
  const data = response.data;
  return Array.isArray(data) ? data : (data.results ?? []);
}

async function fetchExpenseClaims(filters: ExpenseFilters): Promise<PaginatedExpenseResponse> {
  const params: Record<string, string | number> = {};

  if (filters.status) params.status = filters.status;
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;

  const response = await api.get<PaginatedExpenseResponse>('/api/v1/expenses/claims/', { params });
  return response.data;
}

async function submitExpenseClaim(payload: ExpenseClaimPayload): Promise<ExpenseClaim> {
  const response = await api.post<ExpenseClaim>('/api/v1/expenses/claims/', payload);
  return response.data;
}

async function approveExpenseClaim({
  id,
  payload,
}: {
  id: string;
  payload: ExpenseApprovalPayload;
}): Promise<ExpenseClaim> {
  const response = await api.post<ExpenseClaim>(`/api/v1/expenses/claims/${id}/approve/`, payload);
  return response.data;
}

async function uploadReceipt({
  claimId,
  file,
}: {
  claimId: string;
  file: File;
}): Promise<{ id: string; file_name: string; file_url: string; uploaded_at: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(`/api/v1/expenses/claims/${claimId}/receipts/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

// --- Query Hooks ---

export function useExpenseTypes() {
  return useQuery({
    queryKey: ['expense-types'],
    queryFn: fetchExpenseTypes,
  });
}

export function useExpenseClaims(filters: ExpenseFilters) {
  return useQuery({
    queryKey: ['expense-claims', filters],
    queryFn: () => fetchExpenseClaims(filters),
    placeholderData: keepPreviousData,
  });
}

// --- Mutation Hooks ---

export function useSubmitExpenseClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitExpenseClaim,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-claims'] });
    },
  });
}

export function useApproveExpenseClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveExpenseClaim,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-claims'] });
    },
  });
}

export function useUploadReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-claims'] });
    },
  });
}
