/**
 * Generic CRUD Hook Factory
 *
 * Creates TanStack Query hooks for list, detail, create, update, and delete
 * operations with automatic cache invalidation.
 *
 * Requirements: 2.3, 2.5, 2.6, 3.1
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginatedResponse } from '@/types/employee';

export interface CrudEndpoints {
  list: string;
  create: string;
  detail: (id: string) => string;
  update: (id: string) => string;
  delete: (id: string) => string;
}

export interface UseCrudOptions {
  /** Unique query key prefix (e.g., 'employees') */
  queryKey: string;
  /** API endpoints */
  endpoints: CrudEndpoints;
}

export interface UseCrudReturn<T> {
  useList: (params?: Record<string, string | number>) => UseQueryResult<PaginatedResponse<T>>;
  useDetail: (id: string) => UseQueryResult<T>;
  useCreate: () => UseMutationResult<T, Error, Record<string, unknown>>;
  useUpdate: (id: string) => UseMutationResult<T, Error, Record<string, unknown>>;
  useDelete: () => UseMutationResult<void, Error, string>;
}

/**
 * Creates a set of TanStack Query hooks for a CRUD resource.
 *
 * @example
 * ```ts
 * const employeeCrud = createCrudHooks<Employee>({
 *   queryKey: 'employees',
 *   endpoints: EMPLOYEES,
 * });
 *
 * // In a component:
 * const { data, isLoading } = employeeCrud.useList({ page: 1, page_size: 25 });
 * const createMutation = employeeCrud.useCreate();
 * ```
 */
export function createCrudHooks<T>(options: UseCrudOptions): UseCrudReturn<T> {
  const { queryKey, endpoints } = options;

  function useList(params?: Record<string, string | number>): UseQueryResult<PaginatedResponse<T>> {
    return useQuery({
      queryKey: [queryKey, 'list', params],
      queryFn: async () => {
        const response = await api.get<PaginatedResponse<T>>(endpoints.list, { params });
        return response.data;
      },
      placeholderData: keepPreviousData,
    });
  }

  function useDetail(id: string): UseQueryResult<T> {
    return useQuery({
      queryKey: [queryKey, 'detail', id],
      queryFn: async () => {
        const response = await api.get<T>(endpoints.detail(id));
        return response.data;
      },
      enabled: !!id,
    });
  }

  function useCreate(): UseMutationResult<T, Error, Record<string, unknown>> {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (data: Record<string, unknown>) => {
        const response = await api.post<T>(endpoints.create, data);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      },
    });
  }

  function useUpdate(id: string): UseMutationResult<T, Error, Record<string, unknown>> {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (data: Record<string, unknown>) => {
        const response = await api.patch<T>(endpoints.update(id), data);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      },
    });
  }

  function useDelete(): UseMutationResult<void, Error, string> {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (id: string) => {
        await api.delete(endpoints.delete(id));
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      },
    });
  }

  return { useList, useDetail, useCreate, useUpdate, useDelete };
}
