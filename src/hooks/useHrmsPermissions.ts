/**
 * TanStack Query hook for fetching the current user's HRMS permissions
 * from the HRMS Backend.
 *
 * This hook fetches permissions resolved by the backend (role permissions
 * merged with user overrides) and provides a `hasPermission` helper for
 * UI gating. It is independent of the Identity Center JWT claims.
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
}

export function useHrmsPermissions() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, error, refetch } = useQuery<PermissionsResponse>({
    queryKey: ['hrms-permissions'],
    queryFn: () => api.get<PermissionsResponse>('/api/v1/me/permissions/').then((r) => r.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: isAuthenticated, // Only fetch when user has a valid token
    retry: 2, // Retry up to 2 times on failure
  });

  const permissions = data?.permissions ?? [];
  const roleName = data?.role_name ?? null;

  const hasPermission = useCallback(
    (perm: string): boolean => {
      return permissions.includes(perm);
    },
    [permissions],
  );

  return {
    permissions,
    roleName,
    hasPermission,
    isLoading: isLoading || !isAuthenticated,
    error,
    refetch,
  };
}
