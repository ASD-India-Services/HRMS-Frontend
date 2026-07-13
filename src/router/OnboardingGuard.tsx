/**
 * Route guard that redirects employees with pending/in_progress onboarding
 * to the onboarding wizard. Blocks access to all other routes.
 *
 * Admins and HR managers bypass this guard entirely.
 */

import { Navigate } from 'react-router-dom';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { roleName } = useHrmsPermissionsContext();
  const { data: onboardingStatus, isLoading } = useOnboardingStatus();

  // Only apply to employees (not admins/HR)
  if (roleName === 'org_admin' || roleName === 'hr_manager') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // If onboarding not completed, redirect to wizard
  if (
    onboardingStatus?.onboarding_status === 'pending' ||
    onboardingStatus?.onboarding_status === 'in_progress'
  ) {
    return <Navigate to="/onboarding/self" replace />;
  }

  return <>{children}</>;
}
