import { useEffect, useRef } from 'react';
import { useAuth } from '@platform/auth-sdk';
import { HrmsPermissionsProvider, useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function AccountAccessGuard({ children }: { children: React.ReactNode }) {
  const { isLoginRestricted, restrictionReason, isLoading } = useHrmsPermissionsContext();
  const { logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-main border-t-transparent mx-auto" />
          <p className="text-sm text-ink-secondary">Verifying account access...</p>
        </div>
      </div>
    );
  }

  if (isLoginRestricted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-neutral p-4">
        <div className="w-full max-w-md rounded-2xl bg-surface-paper p-8 text-center shadow-lg border border-divider">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-lighter text-error-main">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-ink-primary">Account Access Restricted</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            {restrictionReason || 'Your employee account is restricted from accessing the portal based on organization settings.'}
          </p>
          <div className="mt-6 rounded-lg bg-surface-neutral p-3 text-xs text-ink-disabled">
            If you believe this is an error, please contact your HR department or organization administrator.
          </div>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-lg bg-primary-main px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-dark transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

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
