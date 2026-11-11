export interface HourAccount {
  id: string;
  employee: string;
  employee_name: string;
  employee_code?: string;
  employee_avatar?: string | null;
  department_name?: string;
  job_position?: string;
  shift_name?: string;
  work_type?: string;
  reporting_manager?: string;
  work_location?: string;
  company_name?: string;
  country?: string;
  employment_type?: string;
  month: string;
  year: number;
  worked_hours: string;
  pending_hours: string;
  overtime: string;
  created_at?: string;
  updated_at?: string;
}

export interface HourAccountFilterParams {
  search?: string;
  month?: string;
  year?: number | string;
  employee?: string;
  department?: string;
  job_position?: string;
  shift?: string;
  work_type?: string;
  company?: string;
  work_location?: string;
  reporting_manager?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  batch?: string;
  in_time?: string;
  out_time?: string;
  validated?: string;
  ot_approved?: string;
  min_hour?: string;
  at_work_gte?: string;
  at_work_lte?: string;
  pending_gte?: string;
  pending_lte?: string;
  ot_gte?: string;
  ot_lte?: string;
}

export interface CreateHourAccountPayload {
  employee: string;
  month: string;
  year: number;
  worked_hours: string;
  pending_hours: string;
  overtime: string;
}

export interface UpdateHourAccountPayload {
  employee?: string;
  month?: string;
  year?: number;
  worked_hours?: string;
  pending_hours?: string;
  overtime?: string;
}

