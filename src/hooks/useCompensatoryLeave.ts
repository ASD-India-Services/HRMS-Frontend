import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import { COMPENSATORY_LEAVE } from '@/lib/endpoints';

export interface CompensatoryLeaveRequest {
  id: string;
  employee: string;
  employee_name: string;
  employee_code: string;
  work_date: string;
  formatted_work_date: string;
  reason: string;
  leave_type: string;
  leave_type_name: string;
  days: string | number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  status_display: string;
  created_by: string;
  approved_by: string | null;
  approver_name: string;
  created_at: string;
  updated_at: string;
}

export interface EligibleAttendance {
  id: string;
  attendance_date: string;
  formatted_date: string;
  label: string;
  working_hours: string;
  is_weekend: boolean;
  is_holiday?: boolean;
}

export interface CompensatoryLeaveFilterParams {
  scope?: 'my' | 'all' | 'team';
  status?: string;
  employee?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface CreateCompensatoryLeavePayload {
  employee?: string;
  attendance_date: string;
  description: string;
  leave_type?: string;
  days?: number | string;
}

export function useCompensatoryLeaveRequests(params?: CompensatoryLeaveFilterParams) {
  return useQuery({
    queryKey: ['compensatory-leave-requests', params],
    queryFn: async () => {
      const cleanParams: Record<string, string> = {};
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            cleanParams[k] = String(v).trim();
          }
        });
      }
      const res = await api.get(COMPENSATORY_LEAVE.LIST, { params: cleanParams });
      const data = res.data;
      if (Array.isArray(data)) {
        return { count: data.length, results: data, total_pages: 1, current_page: 1 };
      }
      return {
        count: data?.count || 0,
        results: (data?.results || []) as CompensatoryLeaveRequest[],
        total_pages: Math.max(1, Math.ceil((data?.count || 0) / (params?.page_size || 20))),
        current_page: params?.page || 1,
      };
    },
    placeholderData: keepPreviousData,
  });
}

export function useEligibleAttendances(employeeId?: string) {
  return useQuery({
    queryKey: ['eligible-attendances', employeeId],
    queryFn: async () => {
      const res = await api.get<EligibleAttendance[]>(COMPENSATORY_LEAVE.ELIGIBLE_ATTENDANCES, {
        params: employeeId ? { employee: employeeId } : {},
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: true,
  });
}

export function useCreateCompensatoryLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCompensatoryLeavePayload) => {
      const res = await api.post(COMPENSATORY_LEAVE.CREATE, {
        employee: payload.employee,
        work_date: payload.attendance_date,
        reason: payload.description,
        leave_type: payload.leave_type,
        days: payload.days || '1.0',
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensatory-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
}

export function useApproveCompensatoryLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments?: string }) => {
      const res = await api.post(COMPENSATORY_LEAVE.APPROVE(id), { comments: comments || '' });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensatory-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
}

export function useRejectCompensatoryLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments?: string }) => {
      const res = await api.post(COMPENSATORY_LEAVE.REJECT(id), { comments: comments || '' });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensatory-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
}

export function useDeleteCompensatoryLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(COMPENSATORY_LEAVE.DELETE(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensatory-leave-requests'] });
    },
  });
}

