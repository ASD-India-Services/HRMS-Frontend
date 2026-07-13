import { useEffect, useRef } from 'react';
import { useAuth } from '@platform/auth-sdk';
import { HrmsPermissionsProvider } from '@/contexts/HrmsPermissionsContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard that requires authentication.
 * If the user is not authenticated and not loading, initiates login redirect.
 * Includes a debounce to avoid triggering login during token settlement.
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
    // Only trigger login once, and only after a brief delay to allow
    // AuthProvider to settle tokens from a callback redirect.
    if (!isLoading && !isAuthenticated && !loginTriggered.current) {
      const timer = setTimeout(() => {
        if (!loginTriggered.current) {
          loginTriggered.current = true;
          login();
        }
      }, 500); // 500ms grace period for token settlement
      return () => clearTimeout(timer);
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
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent mx-auto" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent mx-auto" />
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <HrmsPermissionsProvider>
      {children}
    </HrmsPermissionsProvider>
  );
}
