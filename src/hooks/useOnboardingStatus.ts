/**
 * Hook to fetch the current employee's onboarding status.
 * Used by OnboardingGuard to redirect employees with pending/in_progress onboarding.
 */

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface OnboardingStep {
  step_number: number;
  step_name: string;
  is_completed: boolean;
  completed_at: string | null;
}

export interface OnboardingStatusResponse {
  onboarding_status: 'pending' | 'in_progress' | 'completed';
  onboarding_completed_at: string | null;
  steps: OnboardingStep[];
}

export function useOnboardingStatus() {
  return useQuery<OnboardingStatusResponse>({
    queryKey: ['onboarding-status'],
    queryFn: () => api.get('/api/v1/onboarding/self/status/').then((r) => r.data),
    staleTime: 30000,
    retry: 1,
  });
}
