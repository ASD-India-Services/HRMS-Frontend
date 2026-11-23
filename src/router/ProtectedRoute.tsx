import { useEffect, useRef } from 'react';
import { useAuth } from '@platform/auth-sdk';
import { HrmsPermissionsProvider, useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function AccountAccessGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/**
 * Route guard that requires authentication.
 * If the user is not authenticated and not loading, initiates login redirect.
 *
 * Once authenticated, wraps children with HrmsPermissionsProvider so that
 * the entire authenticated app tree has access to the user's HRMS permissions.
 * The provider fetches permissions from the HRMS Backend via React Query after
 * JWT authentication succeeds.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, login } = useAuth();
  const loginTriggered = useRef(false);

  useEffect(() => {
    // Trigger login immediately when we know user is not authenticated
    if (!isLoading && !isAuthenticated && !loginTriggered.current) {
      loginTriggered.current = true;
      login();
    }
  }, [isLoading, isAuthenticated, login]);

  // Reset if user becomes authenticated (e.g., after token refresh)
  useEffect(() => {
    if (isAuthenticated) {
      loginTriggered.current = false;
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-main border-t-transparent mx-auto" />
          <p className="text-sm text-ink-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-main border-t-transparent mx-auto" />
          <p className="text-sm text-ink-secondary">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <HrmsPermissionsProvider>
      <AccountAccessGuard>{children}</AccountAccessGuard>
    </HrmsPermissionsProvider>
  );
}
