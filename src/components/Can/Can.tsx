/**
 * Can Component — Declarative RBAC
 *
 * A render-children component for inline permission checks within pages.
 * Conditionally renders children based on the current user's permissions.
 *
 * - `permissions`: user must have ALL specified HRMS permissions (checked via HrmsPermissionsContext)
 * - `requireAll`: when false, user only needs ANY one of the specified permissions (default: true)
 * - `roles`: user must have at least one of the specified roles (legacy, uses @platform/auth-sdk)
 * - If both are specified, both conditions must be satisfied
 * - If neither is specified, children are always rendered
 *
 * Requirements: 11.4, 15.7, 16.2
 *
 * @example
 * ```tsx
 * <Can permissions={['employees.edit']}>
 *   <Button onClick={handleApprove}>Approve</Button>
 * </Can>
 *
 * <Can roles={['org_admin', 'hr_manager']}>
 *   <AdminPanel />
 * </Can>
 *
 * <Can permissions={['leaves.approve', 'expenses.approve']} requireAll={false}>
 *   <ApprovalsWidget />
 * </Can>
 * ```
 */

import { useUser } from '@platform/auth-sdk';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';

interface CanProps {
  /** Required role(s) — user must have at least one (legacy, backward compat) */
  roles?: string[];
  /** Required HRMS permission(s) — user must have all (or any, based on requireAll) */
  permissions?: string[];
  /** When true (default), user must have ALL permissions. When false, user needs only ONE. */
  requireAll?: boolean;
  /** Render when access is denied (default: null) */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Declarative RBAC component that conditionally renders children
 * based on HRMS permission checks (primary) and/or role checks (legacy).
 */
export function Can({ roles, permissions, requireAll = true, fallback = null, children }: CanProps) {
  const { role } = useUser();
  const { hasPermission, roleName } = useHrmsPermissionsContext();

  // Check roles: user must have at least one of the specified roles
  // Check both JWT role (legacy) and HRMS role name (primary)
  if (roles && roles.length > 0) {
    const jwtRoleMatch = role && roles.includes(role);
    const hrmsRoleMatch = roleName && roles.includes(roleName);
    if (!jwtRoleMatch && !hrmsRoleMatch) {
      return <>{fallback}</>;
    }
  }

  // Check permissions (primary): ALL or ANY depending on requireAll
  if (permissions && permissions.length > 0) {
    const allowed = requireAll
      ? permissions.every((perm) => hasPermission(perm))
      : permissions.some((perm) => hasPermission(perm));
    if (!allowed) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

