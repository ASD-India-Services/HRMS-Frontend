/**
 * React context provider for HRMS permissions.
 *
 * Wraps the `useHrmsPermissions` hook so that any component in the tree
 * can access the user's resolved permissions without triggering separate
 * network requests. React Query's built-in cache deduplication ensures
 * only one fetch occurs regardless of how many consumers read the context.
 *
 * Now also exposes `permissionScopes` and `getPermissionScope()` for
 * components that need to know which departments a permission is restricted to.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useHrmsPermissions } from '@/hooks/useHrmsPermissions';

interface HrmsPermissionsContextValue {
  permissions: string[];
  roleName: string | null;
  /** permission_code → dept IDs ([] = all depts / org-wide) */
  permissionScopes: Record<string, string[]>;
  hasPermission: (perm: string) => boolean;
  /**
   * Returns dept IDs this permission is scoped to, or null if not held.
   * [] means org-wide (no restriction).
   */
  getPermissionScope: (perm: string) => string[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const HrmsPermissionsContext = createContext<HrmsPermissionsContextValue | null>(null);

interface HrmsPermissionsProviderProps {
  children: ReactNode;
}

export function HrmsPermissionsProvider({ children }: HrmsPermissionsProviderProps) {
  const {
    permissions,
    roleName,
    permissionScopes,
    hasPermission,
    getPermissionScope,
    isLoading,
    error,
    refetch,
  } = useHrmsPermissions();

  return (
    <HrmsPermissionsContext.Provider
      value={{
        permissions,
        roleName,
        permissionScopes,
        hasPermission,
        getPermissionScope,
        isLoading,
        error: error as Error | null,
        refetch,
      }}
    >
      {children}
    </HrmsPermissionsContext.Provider>
  );
}

/**
 * Hook for consumers to access HRMS permissions from context.
 * Must be used within a `<HrmsPermissionsProvider>`.
 */
export function useHrmsPermissionsContext(): HrmsPermissionsContextValue {
  const context = useContext(HrmsPermissionsContext);
  if (!context) {
    throw new Error(
      'useHrmsPermissionsContext must be used within a HrmsPermissionsProvider',
    );
  }
  return context;
}
