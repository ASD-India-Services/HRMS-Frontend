/**
 * RoleGatedRoute
 *
 * Route guard that enforces permission-based access control at the route level.
 * Supports both the new `requiredPermission` prop (checked via HRMS permissions
 * context) and the legacy `allowedRoles` prop (checked via @platform/auth-sdk)
 * for backward compatibility during migration.
 *
 * Sits between FeatureGatedRoute and the page component in the route hierarchy:
 *   ProtectedRoute → FeatureGatedRoute → RoleGatedRoute → PageComponent
 *
 * Requirements: 11.3, 15.6
 */

import { useUser } from '@platform/auth-sdk';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { AccessDenied } from '@/components/AccessDenied/AccessDenied';

interface RoleGatedRouteProps {
  /** HRMS permission required to access this route (e.g. "employees.view") */
  requiredPermission?: string;
  /** Grant access if the user has ANY one of these HRMS permissions. */
  requiredAnyPermission?: string[];
  /** Legacy: roles that grant access to this route (uses @platform/auth-sdk) */
  allowedRoles?: string[];
  children: React.ReactNode;
}

/**
 * Route wrapper that checks access via HRMS permissions (primary) or
 * legacy role check (backward-compatible). Shows a loading state while
 * permissions are being fetched, then renders AccessDenied when access
 * is denied to avoid route loops.
 */
export function RoleGatedRoute({
  requiredPermission,
  requiredAnyPermission,
  allowedRoles,
  children,
}: RoleGatedRouteProps) {
  const { role } = useUser();
  const { hasPermission, roleName, isLoading, error, refetch } = useHrmsPermissionsContext();

  // While permissions are loading, render children optimistically
  if (isLoading) {
    return <>{children}</>;
  }

  // If permission fetch failed, show retry instead of blocking forever
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-gray-600 mb-4">Failed to load permissions. Please try again.</p>
        <button
          onClick={() => refetch()}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // org_admin role bypasses permission checks (full access)
  if (roleName === 'org_admin') {
    return <>{children}</>;
  }

  // Any-of check: user needs at least one of the listed permissions.
  if (requiredAnyPermission && requiredAnyPermission.length > 0) {
    if (requiredAnyPermission.some((p) => hasPermission(p))) {
      return <>{children}</>;
    }
    return <AccessDenied />;
  }

  // Primary check: HRMS permission-based
  if (requiredPermission) {
    if (hasPermission(requiredPermission)) {
      return <>{children}</>;
    }
    return <AccessDenied />;
  }

  // Legacy check: role-based (backward compatibility)
  if (allowedRoles && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      return <AccessDenied />;
    }
    return <>{children}</>;
  }

  // No permission or role specified — deny by default (fail-closed)
  return <AccessDenied />;
}
