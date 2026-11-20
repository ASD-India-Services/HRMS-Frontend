import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  CompanyPolicy,
  CreatePolicyPayload,
  UpdatePolicyPayload,
} from '@/types/policies';

export const POLICIES = {
  LIST: '/api/v1/policies/',
  CREATE: '/api/v1/policies/',
  DETAIL: (id: string) => `/api/v1/policies/${id}/`,
  UPDATE: (id: string) => `/api/v1/policies/${id}/`,
  DELETE: (id: string) => `/api/v1/policies/${id}/`,
} as const;

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

async function fetchPolicies(search?: string): Promise<CompanyPolicy[]> {
  const params: Record<string, string> = {};
  if (search) params.search = search;
  const res = await api.get<PaginatedResponse<CompanyPolicy> | CompanyPolicy[]>(POLICIES.LIST, { params });
  if (Array.isArray(res.data)) {
    return res.data;
  }
  if (res.data && Array.isArray((res.data as PaginatedResponse<CompanyPolicy>).results)) {
    return (res.data as PaginatedResponse<CompanyPolicy>).results;
  }
  return [];
}

export function usePolicies(search?: string) {
  return useQuery({
    queryKey: ['policies', search],
    queryFn: () => fetchPolicies(search),
    placeholderData: keepPreviousData,
  });
}

export function useCreatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePolicyPayload) => {
      const formData = new FormData();
      formData.append('title', payload.title);
      formData.append('body', payload.body);
      if (payload.is_visible_to_all !== undefined) {
        formData.append('is_visible_to_all', String(payload.is_visible_to_all));
      }
      if (payload.company) {
        formData.append('company', payload.company);
      }
      if (payload.attachment) {
        formData.append('attachment', payload.attachment);
      }

      const res = await api.post<CompanyPolicy>(POLICIES.CREATE, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
}

export function useUpdatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdatePolicyPayload }) => {
      const formData = new FormData();
      if (payload.title !== undefined) formData.append('title', payload.title);
      if (payload.body !== undefined) formData.append('body', payload.body);
      if (payload.is_visible_to_all !== undefined) {
        formData.append('is_visible_to_all', String(payload.is_visible_to_all));
      }
      if (payload.company !== undefined) formData.append('company', payload.company);
      if (payload.attachment) {
        formData.append('attachment', payload.attachment);
      }

      const res = await api.patch<CompanyPolicy>(POLICIES.UPDATE(id), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
}

export function useDeletePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(POLICIES.DELETE(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
}

