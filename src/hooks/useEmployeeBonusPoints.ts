import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { BONUS_POINTS } from '@/lib/endpoints';

export interface EmployeeBonusPoint {
  id: string;
  employee: string;
  employee_name: string;
  employee_code?: string;
  employee_email?: string;
  employee_avatar?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  designation_id?: string | null;
  designation_name?: string | null;
  reporting_manager_id?: string | null;
  reporting_manager_name?: string | null;
  employment_type?: string | null;
  company_name?: string;
  points: number;
  based_on: string;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBonusPointPayload {
  employee: string;
  points: number;
  based_on: string;
}

export interface UpdateBonusPointPayload extends Partial<CreateBonusPointPayload> {
  id: string;
}

export interface BonusPointQueryParams {
  search?: string;
  employee?: string;
  department?: string;
  designation?: string;
  reporting_manager?: string;
  employment_type?: string;
}

export function useEmployeeBonusPoints(params?: BonusPointQueryParams) {
  return useQuery({
    queryKey: ['employee-bonus-points', params],
    queryFn: async () => {
      const res = await api.get(BONUS_POINTS.LIST, { params });
      const data = res.data;
      if (Array.isArray(data)) {
        return { results: data as EmployeeBonusPoint[], count: data.length };
      }
      return {
        results: Array.isArray(data?.results) ? (data.results as EmployeeBonusPoint[]) : [],
        count: data?.count || 0,
      };
    },
  });
}

export function useCreateBonusPoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBonusPointPayload) => {
      const res = await api.post(BONUS_POINTS.CREATE, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-bonus-points'] });
    },
  });
}

export function useUpdateBonusPoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateBonusPointPayload) => {
      const { id, ...data } = payload;
      const res = await api.patch(BONUS_POINTS.DETAIL(id), data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-bonus-points'] });
    },
  });
}

export function useDeleteBonusPoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(BONUS_POINTS.DETAIL(id));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-bonus-points'] });
    },
  });
}

