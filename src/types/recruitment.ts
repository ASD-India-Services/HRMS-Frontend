/**
 * TypeScript interfaces for Recruitment module.
 * Requirements: 19.1, 19.2, 19.3, 24.2
 */

export type JobOpeningStatus = 'open' | 'closed' | 'on_hold' | 'cancelled';

export interface JobOpening {
  id: string;
  title: string;
  department?: {
    id: number | string;
    name: string;
  } | null;
  department_name?: string | null;
  designation?: {
    id: number | string;
    title?: string;
    name?: string;
  } | null;
  designation_name?: string | null;
  vacancies: number;
  filled?: number;
  status: JobOpeningStatus;
  posted_on: string;
  closes_on: string | null;
  description?: string;
  company_website?: string;
  applicant_count?: number;
  stage_count?: number;
  has_custom_stages?: boolean;
  created_at: string;
}

export type DefaultApplicantStatus = 'applied' | 'screening' | 'interview' | 'selected' | 'onboarded' | 'rejected';
export type ApplicantStatus = DefaultApplicantStatus | (string & {});

export interface RecruitmentStage {
  id: string;
  name: string;
  slug: string;
  color: string;
  order: number;
  is_system: boolean;
  job_opening?: string | null;
  job_opening_title?: string | null;
  applicant_count: number;
  email_enabled?: boolean;
  email_subject?: string;
  email_body?: string;
  created_at: string;
  updated_at: string;
}

export interface JobApplicant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  job_opening: {
    id: string;
    title: string;
  };
  stage?: string | null;
  stage_name?: string | null;
  stage_color?: string | null;
  status: ApplicantStatus;
  resume_url?: string;
  notes?: string;
  rating: number | null;
  referred_by_name?: string | null;
  is_referral?: boolean;
  applied_on: string;
  created_at: string;
}

export interface Interview {
  id: string;
  applicant: {
    id: string;
    name: string;
  };
  job_opening: {
    id: string;
    title: string;
  };
  interviewer: {
    id: number;
    first_name: string;
    last_name: string;
  };
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  feedback?: string;
  rating?: number;
  created_at: string;
}

export interface JobOpeningFilters {
  status?: JobOpeningStatus | '';
  department?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface ApplicantFilters {
  job_opening?: string;
  status?: ApplicantStatus | '';
  search?: string;
  page?: number;
  page_size?: number;
}

export interface InterviewFilters {
  job_opening?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

export interface ChangeStatusPayload {
  status: ApplicantStatus;
  stage?: string;
  notes?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
