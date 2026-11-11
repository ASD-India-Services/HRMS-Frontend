import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import { HELPDESK } from '@/lib/endpoints';
import type {
  FAQCategory,
  FAQ,
  CreateFAQCategoryPayload,
  UpdateFAQCategoryPayload,
  CreateFAQPayload,
  UpdateFAQPayload,
} from '@/types/helpdesk';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ─── FAQ Categories ──────────────────────────────────────────────────────────

async function fetchFAQCategories(search?: string): Promise<FAQCategory[]> {
  const params: Record<string, string> = {};
  if (search) params.search = search;
  const res = await api.get<PaginatedResponse<FAQCategory> | FAQCategory[]>(HELPDESK.CATEGORIES, { params });
  if (Array.isArray(res.data)) {
    return res.data;
  }
  return res.data.results || [];
}

export function useFAQCategories(search?: string) {
  return useQuery({
    queryKey: ['helpdesk', 'faq-categories', search],
    queryFn: () => fetchFAQCategories(search),
    placeholderData: keepPreviousData,
  });
}

export function useCreateFAQCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateFAQCategoryPayload) => {
      const res = await api.post<FAQCategory>(HELPDESK.CATEGORIES, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk', 'faq-categories'] });
    },
  });
}

export function useUpdateFAQCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateFAQCategoryPayload }) => {
      const res = await api.patch<FAQCategory>(HELPDESK.CATEGORY_DETAIL(id), payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk', 'faq-categories'] });
      queryClient.invalidateQueries({ queryKey: ['helpdesk', 'faqs'] });
    },
  });
}

export function useDeleteFAQCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(HELPDESK.CATEGORY_DETAIL(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk', 'faq-categories'] });
      queryClient.invalidateQueries({ queryKey: ['helpdesk', 'faqs'] });
    },
  });
}

// ─── FAQs ────────────────────────────────────────────────────────────────────

interface FAQFilters {
  category?: string;
  search?: string;
  tag?: string;
}

async function fetchFAQs(filters: FAQFilters = {}): Promise<FAQ[]> {
  const params: Record<string, string> = {};
  if (filters.category) params.category = filters.category;
  if (filters.search) params.search = filters.search;
  if (filters.tag) params.tag = filters.tag;

  const res = await api.get<PaginatedResponse<FAQ> | FAQ[]>(HELPDESK.FAQS, { params });
  if (Array.isArray(res.data)) {
    return res.data;
  }
  return res.data.results || [];
}

export function useFAQs(filters: FAQFilters = {}) {
  return useQuery({
    queryKey: ['helpdesk', 'faqs', filters],
    queryFn: () => fetchFAQs(filters),
    placeholderData: keepPreviousData,
  });
}

export function useCreateFAQ() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateFAQPayload) => {
      const res = await api.post<FAQ>(HELPDESK.FAQS, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk', 'faqs'] });
      queryClient.invalidateQueries({ queryKey: ['helpdesk', 'faq-categories'] });
    },
  });
}

export function useUpdateFAQ() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateFAQPayload }) => {
      const res = await api.patch<FAQ>(HELPDESK.FAQ_DETAIL(id), payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk', 'faqs'] });
      queryClient.invalidateQueries({ queryKey: ['helpdesk', 'faq-categories'] });
    },
  });
}

export function useDeleteFAQ() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(HELPDESK.FAQ_DETAIL(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk', 'faqs'] });
      queryClient.invalidateQueries({ queryKey: ['helpdesk', 'faq-categories'] });
    },
  });
}

