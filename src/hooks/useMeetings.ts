import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { MEETINGS } from '@/lib/endpoints';

export interface MeetingEmployee {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  employee_id: string;
  email: string;
  department_name?: string;
  profile_picture?: string | null;
}

export interface QuestionTemplate {
  id: string;
  name: string;
  description: string;
  questions: any[];
  questions_count: number;
  is_active: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  formatted_date: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  status_display: string;
  description: string;
  employees: string[];
  employees_details: MeetingEmployee[];
  managers: string[];
  managers_details: MeetingEmployee[];
  answerable_employees: string[];
  answerable_employees_details: MeetingEmployee[];
  question_template: string | null;
  question_template_name: string | null;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMeetingPayload {
  title: string;
  date: string;
  employees: string[];
  managers: string[];
  answerable_employees?: string[];
  question_template?: string | null;
  description?: string;
  status?: string;
}

export interface UpdateMeetingPayload extends Partial<CreateMeetingPayload> {
  id: string;
}

export interface MeetingQueryParams {
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export function useMeetings(params?: MeetingQueryParams) {
  return useQuery({
    queryKey: ['meetings', params],
    queryFn: async () => {
      const res = await api.get(MEETINGS.LIST, { params });
      const data = res.data;
      if (Array.isArray(data)) {
        return { results: data, count: data.length };
      }
      return {
        results: Array.isArray(data?.results) ? data.results : [],
        count: data?.count || 0,
        next: data?.next,
        previous: data?.previous,
      };
    },
  });
}

export function useMeeting(id: string | null) {
  return useQuery({
    queryKey: ['meeting', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get<Meeting>(MEETINGS.DETAIL(id));
      return res.data;
    },
    enabled: !!id,
  });
}

export function useQuestionTemplates() {
  return useQuery({
    queryKey: ['question-templates'],
    queryFn: async () => {
      const res = await api.get(MEETINGS.QUESTION_TEMPLATES, { params: { active: 'true' } });
      const data = res.data;
      const results = Array.isArray(data) ? data : data?.results || [];
      return results as QuestionTemplate[];
    },
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateMeetingPayload) => {
      const res = await api.post(MEETINGS.CREATE, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateMeetingPayload) => {
      const { id, ...data } = payload;
      const res = await api.patch(MEETINGS.UPDATE(id), data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(MEETINGS.DELETE(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useCancelMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(MEETINGS.CANCEL(id));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useCompleteMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(MEETINGS.COMPLETE(id));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

