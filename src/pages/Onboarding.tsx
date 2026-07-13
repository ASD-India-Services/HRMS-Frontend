/**
 * Onboarding module page.
 * Shows the onboarding checklist for the current employee (new hire).
 * Requirements: 24.2
 */

import { OnboardingChecklist } from '@/pages/onboarding/OnboardingChecklist';
import { useUser } from '@platform/auth-sdk';

export default function Onboarding() {
  const { id: userId } = useUser();

  // The onboarding tasks are fetched by employee ID.
  // In a full implementation, we'd fetch the employee record linked to this user.
  // For now, pass the user ID and let the backend handle lookup.
  const employeeId = userId ?? undefined;

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
          <p className="text-sm text-gray-500">No onboarding tasks assigned.</p>
        )}
      </div>
    </div>
  );
}
