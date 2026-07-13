/**
 * TypeScript interfaces for Training module.
 * Requirements: 24.2
 */

export type TrainingEventStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type EnrollmentStatus = 'enrolled' | 'completed' | 'cancelled' | 'waitlisted';

export interface TrainingEvent {
  id: string;
  name: string;
  description: string;
  type: string;
  trainer: string;
  start_date: string;
  end_date: string;
  location: string;
  max_seats: number;
  enrolled_count: number;
  available_seats: number;
  status: TrainingEventStatus;
  created_at: string;
}

export interface TrainingEnrollment {
  id: string;
  event: {
    id: string;
    name: string;
  };
  employee: {
    id: number;
    first_name: string;
    last_name: string;
  };
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  feedback_score: number | null;
  feedback_comments: string | null;
}

export interface TrainingEventDetail extends TrainingEvent {
  enrollments: TrainingEnrollment[];
  prerequisites: string[];
  syllabus: string;
}

export interface TrainingFilters {
  status?: TrainingEventStatus | '';
  search?: string;
  page?: number;
  page_size?: number;
}

export interface EnrollPayload {
  event: string;
  employee: number;
}

export interface CompleteFeedback {
  feedback_score: number;
  feedback_comments: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
