/**
 * TypeScript interfaces for Recruitment module.
 * Requirements: 19.1, 19.2, 19.3, 24.2
 */

export type JobOpeningStatus = 'open' | 'closed' | 'on_hold' | 'cancelled';

export interface JobOpening {
  id: string;
  title: string;
  department: {
    id: number;
    name: string;
  };
  designation: {
    id: number;
    title: string;
  };
  vacancies: number;
  filled: number;
  status: JobOpeningStatus;
  posted_on: string;
  closes_on: string | null;
  description?: string;
  created_at: string;
}

export type ApplicantStatus = 'applied' | 'screening' | 'interview' | 'selected' | 'rejected';

export interface JobApplicant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  job_opening: {
    id: string;
    title: string;
  };
  status: ApplicantStatus;
  resume_url?: string;
  rating: number | null;
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
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
