/**
 * Route guard that redirects employees with pending/in_progress onboarding
 * to the onboarding wizard. Blocks access to all other routes.
 *
 * Admins and HR managers bypass this guard entirely.
 * Shows children immediately while loading (optimistic) — only redirects
 * once we know onboarding is required.
 */

import { Navigate } from 'react-router-dom';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { roleName, isLoading: permissionsLoading } = useHrmsPermissionsContext();
  const { data: onboardingStatus, isLoading } = useOnboardingStatus();

  // Only apply to employees (not admins/HR)
  if (roleName === 'org_admin' || roleName === 'hr_manager') {
    return <>{children}</>;
  }

  // Show children while loading (avoid blocking render with spinner)
  // Only show spinner if permissions are still loading (no role info yet)
  if (permissionsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // While onboarding status loads, render children optimistically
  if (isLoading) {
    return <>{children}</>;
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
