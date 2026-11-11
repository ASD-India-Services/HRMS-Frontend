import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import { HOUR_ACCOUNTS } from '@/lib/endpoints';
import type {
  HourAccount,
  HourAccountFilterParams,
  CreateHourAccountPayload,
  UpdateHourAccountPayload,
} from '@/types/hourAccount';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function fetchHourAccounts(params?: HourAccountFilterParams): Promise<HourAccount[]> {
  const cleanParams: Record<string, string> = {};
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        cleanParams[key] = String(val).trim();
      }
    });
  }

  const res = await api.get<PaginatedResponse<HourAccount> | HourAccount[]>(HOUR_ACCOUNTS.LIST, {
    params: cleanParams,
  });

  if (Array.isArray(res.data)) {
    return res.data;
  }
  if (res.data && Array.isArray((res.data as PaginatedResponse<HourAccount>).results)) {
    return (res.data as PaginatedResponse<HourAccount>).results;
  }
  return [];
}

export function useHourAccounts(params?: HourAccountFilterParams) {
  return useQuery({
    queryKey: ['hour-accounts', params],
    queryFn: () => fetchHourAccounts(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateHourAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateHourAccountPayload) => {
      const res = await api.post<HourAccount>(HOUR_ACCOUNTS.CREATE, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hour-accounts'] });
    },
  });
}

export function useUpdateHourAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateHourAccountPayload }) => {
      const res = await api.patch<HourAccount>(HOUR_ACCOUNTS.UPDATE(id), payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hour-accounts'] });
    },
  });
}

export function useDeleteHourAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(HOUR_ACCOUNTS.DELETE(id));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hour-accounts'] });
    },
  });
}

export function useBulkDeleteHourAccounts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post(HOUR_ACCOUNTS.BULK_DELETE, { ids });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hour-accounts'] });
    },
  });
}

export function useSyncHourAccounts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (year?: number | string) => {
      const res = await api.post(HOUR_ACCOUNTS.SYNC, { year });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hour-accounts'] });
    },
  });
}

