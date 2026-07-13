/**
 * TypeScript interfaces for Appraisal Management
 * Requirements: 20.1, 20.2, 20.3
 */

export type AppraisalCycleStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface AppraisalCycle {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: AppraisalCycleStatus;
  created_at: string;
  updated_at: string;
}

export type AppraisalStatus = 'draft' | 'self_review' | 'manager_review' | 'completed';

export interface AppraisalGoal {
  id: string;
  title: string;
  description?: string;
  weight: number;
  score?: number;
  self_score?: number;
  remarks?: string;
}

export interface Appraisal {
  id: string;
  employee: {
    id: number;
    first_name: string;
    last_name: string;
    employee_id: string;
    department?: { id: number; name: string };
    designation?: { id: number; name: string };
  };
  cycle: AppraisalCycle;
  appraiser: {
    id: number;
    first_name: string;
    last_name: string;
  };
  goals: AppraisalGoal[];
  score?: number;
  status: AppraisalStatus;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface AppraisalFilters {
  cycle?: string;
  status?: AppraisalStatus | '';
  page?: number;
  page_size?: number;
}

export interface PaginatedAppraisalCycleResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AppraisalCycle[];
}

export interface PaginatedAppraisalResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Appraisal[];
}
