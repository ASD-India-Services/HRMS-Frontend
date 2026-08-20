/**
 * TanStack Query hook for fetching the current user's HRMS permissions
 * from the HRMS Backend.
 *
 * This hook fetches permissions resolved by the backend (role permissions
 * merged with user overrides) and provides a `hasPermission` helper for
 * UI gating. It is independent of the Identity Center JWT claims.
 *
 * Now also exposes `permissionScopes` — a map of permission code to the
 * list of department IDs that permission is restricted to. Empty list means
 * org-wide (no restriction).
 *
 * The query is only enabled when the user is authenticated (has a valid
 * access token). This prevents a 401 race condition on initial page load.
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuth } from '@platform/auth-sdk';
import api from '@/lib/api';

interface PermissionsResponse {
  role_name: string | null;
  permissions: string[];
  /** permission_code → dept IDs ([] = all departments / no restriction) */
  permission_scopes: Record<string, string[]>;
}

export function useHrmsPermissions() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, error, refetch } = useQuery<PermissionsResponse>({
    queryKey: ['hrms-permissions'],
    queryFn: () => api.get<PermissionsResponse>('/api/v1/me/permissions/').then((r) => r.data),
    staleTime: 30 * 1000, // 30 seconds — quick permission updates after role/approver changes
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true, // Refetch when user tabs back (catches role changes)
    refetchOnMount: true, // Refetch on navigation to catch updates
    enabled: isAuthenticated,
    retry: 2,
  });

  const permissions = data?.permissions ?? [];
  const roleName = data?.role_name ?? null;
  const permissionScopes = data?.permission_scopes ?? {};

  const hasPermission = useCallback(
    (perm: string): boolean => {
      return permissions.includes(perm);
    },
    [permissions],
  );

  /**
   * Returns the department IDs this permission is scoped to.
   * Empty array = org-wide (no restriction).
   * null = user doesn't have this permission at all.
   */
  const getPermissionScope = useCallback(
    (perm: string): string[] | null => {
      if (!permissions.includes(perm)) return null;
      return permissionScopes[perm] ?? [];
    },
    [permissions, permissionScopes],
  );

  return {
    permissions,
    roleName,
    permissionScopes,
    hasPermission,
    getPermissionScope,
    isLoading: isLoading || !isAuthenticated,
    error,
    refetch,
  };
}
