/**
 * TypeScript interfaces for Onboarding module.
 * Requirements: 24.2
 */

export type OnboardingTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  status: OnboardingTaskStatus;
  due_date: string | null;
  completed_at: string | null;
  assigned_to: {
    id: number;
    first_name: string;
    last_name: string;
  } | null;
  category: string;
  sort_order: number;
}

export interface OnboardingChecklist {
  id: string;
  employee: {
    id: number;
    first_name: string;
    last_name: string;
    department: string;
    designation: string;
  };
  template_name: string;
  start_date: string;
  tasks: OnboardingTask[];
  progress_percentage: number;
  created_at: string;
}

export interface OnboardingFilters {
  employee?: string | number;
  status?: OnboardingTaskStatus | '';
}
