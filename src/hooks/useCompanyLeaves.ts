import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { LEAVES } from '@/lib/endpoints';

export interface CompanyLeave {
  id: string;
  based_on_week: string;
  based_on_week_display: string;
  based_on_week_day: string;
  based_on_week_day_display: string;
  company: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyLeaveQueryParams {
  search?: string;
  based_on_week?: string;
  based_on_week_day?: string;
  company?: string;
  page?: number;
  page_size?: number;
}

export interface CompanyLeaveOptions {
  weeks: { value: string; label: string }[];
  week_days: { value: string; label: string }[];
  default_company: string;
}

export function useCompanyLeaves(params?: CompanyLeaveQueryParams) {
  return useQuery({
    queryKey: ['company-leaves', params],
    queryFn: async () => {
      const res = await api.get(LEAVES.COMPANY_LEAVES, { params });
      return res.data;
    },
  });
}

export function useCompanyLeaveOptions() {
  return useQuery<CompanyLeaveOptions>({
    queryKey: ['company-leaves-options'],
    queryFn: async () => {
      try {
        const res = await api.get(`${LEAVES.COMPANY_LEAVES}options/`);
        return res.data;
      } catch {
        return {
          weeks: [
            { value: 'all', label: 'All' },
            { value: 'first_week', label: 'First Week' },
            { value: 'second_week', label: 'Second Week' },
            { value: 'third_week', label: 'Third Week' },
            { value: 'fourth_week', label: 'Fourth Week' },
            { value: 'fifth_week', label: 'Fifth Week' },
          ],
          week_days: [
            { value: 'sunday', label: 'Sunday' },
            { value: 'monday', label: 'Monday' },
            { value: 'tuesday', label: 'Tuesday' },
            { value: 'wednesday', label: 'Wednesday' },
            { value: 'thursday', label: 'Thursday' },
            { value: 'friday', label: 'Friday' },
            { value: 'saturday', label: 'Saturday' },
          ],
          default_company: '',
        };
      }
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateCompanyLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CompanyLeave>) => api.post(LEAVES.COMPANY_LEAVES, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['work-records'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['eligible-attendances'] });
    },
  });
}

export function useUpdateCompanyLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CompanyLeave> }) =>
      api.put(LEAVES.COMPANY_LEAVE_DETAIL(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['work-records'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['eligible-attendances'] });
    },
  });
}

export function useDeleteCompanyLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(LEAVES.COMPANY_LEAVE_DETAIL(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['work-records'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['eligible-attendances'] });
    },
  });
}

