/**
 * Route guard that redirects any user with pending/in_progress onboarding
 * to the onboarding wizard. Blocks access to all other routes until
 * onboarding is completed — applies to all roles including admin.
 */

import { Navigate } from 'react-router-dom';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { isLoading: permissionsLoading } = useHrmsPermissionsContext();
  const { data: onboardingStatus, isLoading } = useOnboardingStatus();

  // Show spinner while permissions are still loading
  if (permissionsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // Show spinner while onboarding status loads
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-500 border-t-transparent" />
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
