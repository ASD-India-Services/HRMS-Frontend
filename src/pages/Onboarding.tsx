/**
 * Onboarding module page.
 * Shows the onboarding checklist for the current employee (new hire).
 * Requirements: 24.2
 */

import { useQuery } from '@tanstack/react-query';
import { OnboardingChecklist } from '@/pages/onboarding/OnboardingChecklist';
import api from '@/lib/api';

export default function Onboarding() {
  // Fetch the actual employee record for the current user
  const { data: currentEmployee } = useQuery<{ id: string }>({
    queryKey: ['employee', 'me'],
    queryFn: () => api.get('/api/v1/employees/me/').then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const employeeId = currentEmployee?.id;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Onboarding</h1>
      <p className="mt-1 text-sm text-gray-600">
        New hire onboarding checklists and task tracking.
      </p>
      <div className="mt-6">
        {employeeId ? (
          <OnboardingChecklist employeeId={employeeId} />
        ) : (
          <p className="text-sm text-gray-500">Loading...</p>
        )}
      </div>
    </div>
  );
}
