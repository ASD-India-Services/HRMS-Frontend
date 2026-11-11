import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import { WORK_RECORDS } from '@/lib/endpoints';

export interface WorkRecordDay {
  day: number;
  date: string;
  badge: 'P' | 'HP' | 'OL' | 'L' | 'A' | '';
  status: 'present' | 'half_day' | 'on_leave_with_attendance' | 'leave' | 'absent' | 'empty';
  leave_type?: string;
  working_hours: string; // "HH:MM"
  check_in: string; // "HH:MM" or ""
  check_out: string; // "HH:MM" or ""
  shift_name: string;
  is_weekend: boolean;
  is_future: boolean;
}

export interface EmployeeWorkRecord {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  display_name: string;
  department: string;
  designation: string;
  records: Record<string, WorkRecordDay>;
  total_worked_hours: string;
  present_days: number;
  half_days: number;
  absent_days: number;
  leave_days: number;
  on_leave_att_days: number;
}

export interface WorkRecordsResponse {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  days_in_month: number;
  year: number;
  month: string;
  month_num: number;
  results: EmployeeWorkRecord[];
}

export interface WorkRecordsFilterParams {
  year?: number;
  month?: number | string;
  page?: number;
  page_size?: number;
  search?: string;
  // Employee
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  country?: string;
  gender?: string;
  // Work Info
  company?: string;
  reporting_manager?: string;
  department?: string;
  job_position?: string;
  shift?: string;
  work_type?: string;
  employee_tag?: string;
  currently_working?: string;
  // Advanced
  groups?: string;
  permissions?: string;
  probation_from?: string;
  probation_till?: string;
  is_active?: string;
  is_from_onboarding?: string;
  is_directly_converted?: string;
}

export async function fetchWorkRecords(params?: WorkRecordsFilterParams): Promise<WorkRecordsResponse> {
  const cleanParams: Record<string, string> = {};
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        cleanParams[key] = String(val).trim();
      }
    });
  }

  const res = await api.get<WorkRecordsResponse>(WORK_RECORDS.LIST, {
    params: cleanParams,
  });
  return res.data;
}

export function useWorkRecords(params?: WorkRecordsFilterParams) {
  return useQuery({
    queryKey: ['work-records', params],
    queryFn: () => fetchWorkRecords(params),
    placeholderData: keepPreviousData,
  });
}

