/**
 * User Permission Overrides Panel
 *
 * Displays a user's assigned role, inherited permissions (from role), and
 * individual permission overrides. Allows admins with "roles.manage" permission
 * to change the user's role and add/remove permission overrides.
 *
 * Intended to be used on an employee/user detail page.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Can } from '@/components/Can/Can';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserPermissionsPanelProps {
  userId: string;
}

interface RoleOption {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  permissions: { id: string; code: string; display_name: string }[];
}

interface PermissionItem {
  id: string;
  code: string;
  display_name: string;
}

interface RoleAssignmentResponse {
  id?: string;
  user_id?: string;
  role?: string;
  role_name?: string | null;
  permissions_override?: string[];
}

type GroupedPermissions = Record<string, PermissionItem[]>;

// ─── Component ───────────────────────────────────────────────────────────────

const EMPTY_OVERRIDES: string[] = [];

export function UserPermissionsPanel({
  userId,
}: UserPermissionsPanelProps) {
  const queryClient = useQueryClient();
  const { hasPermission } = useHrmsPermissionsContext();
  const canManage = hasPermission('roles.manage');

  // Fetch the employee's current role assignment from the backend
  const { data: roleAssignment, isLoading: assignmentLoading } =
    useQuery<RoleAssignmentResponse>({
      queryKey: ['employee-role-assignment', userId],
      queryFn: () =>
        api
          .get(`/api/v1/employees/${userId}/role-assignment/`)
          .then((r) => r.data)
          .catch((err) => {
            // 404 means no login account — treat as no assignment
            if (err?.response?.status === 404) {
              return { role_name: null, permissions_override: [] };
            }
            throw err;
          }),
      enabled: !!userId,
      staleTime: 30 * 1000,
    });

  const currentRoleId = roleAssignment?.role ?? '';
  const currentOverrides: string[] = Array.isArray(roleAssignment?.permissions_override)
    ? roleAssignment.permissions_override
    : EMPTY_OVERRIDES;

  // Local state
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [overrides, setOverrides] = useState<string[]>([]);
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync fetched data to local state when it arrives or changes
  useEffect(() => {
    setSelectedRoleId(currentRoleId);
  }, [currentRoleId]);

  useEffect(() => {
    setOverrides(currentOverrides);
  }, [currentOverrides]);

  // ─── Data Fetching ───────────────────────────────────────────────────────

  const { data: roles = [], isLoading: rolesLoading } = useQuery<RoleOption[]>({
    queryKey: ['admin-roles'],
    queryFn: () => api.get('/api/v1/roles/').then((r) => {
      const data = r.data;
      return Array.isArray(data) ? data : data.results ?? [];
    }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allPermissionsGrouped = {}, isLoading: permissionsLoading } =
    useQuery<GroupedPermissions>({
      queryKey: ['admin-permissions-grouped'],
      queryFn: () => api.get('/api/v1/permissions/').then((r) => r.data),
      staleTime: 5 * 60 * 1000,
    });

  // ─── Derived Data ────────────────────────────────────────────────────────

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const inheritedPermissions = selectedRole?.permissions.map((p) => p.code) ?? [];

  // All available permission codes (flat list)
  const allPermissions: PermissionItem[] = Object.values(allPermissionsGrouped).flat();

  // Permissions available to add as overrides (not already inherited or overridden)
  const availableForOverride = allPermissions.filter(
    (p) => !inheritedPermissions.includes(p.code) && !overrides.includes(p.code),
  );

  // ─── Mutations ───────────────────────────────────────────────────────────

  const roleAssignMutation = useMutation({
    mutationFn: (roleId: string) =>
      api.put(`/api/v1/employees/${userId}/role-assignment/`, { role_id: roleId }),
    onSuccess: () => {
      showSuccess('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['employee-role-assignment', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
    },
  });

  const overridesMutation = useMutation({
    mutationFn: (permissions: string[]) =>
      api.patch(`/api/v1/employees/${userId}/role-assignment/`, { permissions_override: permissions }),
    onSuccess: () => {
      showSuccess('Permission overrides saved successfully');
      queryClient.invalidateQueries({ queryKey: ['employee-role-assignment', userId] });
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRoleId = e.target.value;
    setSelectedRoleId(newRoleId);
    if (newRoleId) {
      roleAssignMutation.mutate(newRoleId);
    }
  };

  const handleAddOverride = (code: string) => {
    const updated = [...overrides, code];
    setOverrides(updated);
    setShowAddOverride(false);
  };

  const handleRemoveOverride = (code: string) => {
    setOverrides(overrides.filter((o) => o !== code));
  };

  const handleSaveOverrides = () => {
    overridesMutation.mutate(overrides);
  };

  // ─── Loading State ───────────────────────────────────────────────────────

  if (rolesLoading || permissionsLoading || assignmentLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 rounded bg-gray-200" />
          <div className="h-10 w-full rounded bg-gray-200" />
          <div className="h-4 w-48 rounded bg-gray-200" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-7 w-24 rounded-full bg-gray-200" />
            ))}
          </div>
          <div className="h-4 w-48 rounded bg-gray-200" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-7 w-24 rounded-full bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Permissions</h2>

      {/* Success Toast */}
      {successMessage && (
        <div className="mb-4 rounded-md bg-green-50 p-3">
          <p className="text-sm font-medium text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Error Messages */}
      {roleAssignMutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-800">
            Failed to update role. Please try again.
          </p>
        </div>
      )}
      {overridesMutation.isError && (
        <div className="mb-4 rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-800">
            Failed to save overrides. Please try again.
          </p>
        </div>
      )}

      {/* Role Selector */}
      <div className="mb-6">
        <label
          htmlFor="user-role-select"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Assigned Role
        </label>
        <Can permissions={['roles.manage']}>
          <select
            id="user-role-select"
            value={selectedRoleId}
            onChange={handleRoleChange}
            disabled={roleAssignMutation.isPending}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">— No role assigned —</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
                {role.is_system ? ' (System)' : ''}
              </option>
            ))}
          </select>
        </Can>
        {!canManage && (
          <p className="mt-1 text-sm text-gray-600">
            {roleAssignment?.role_name ?? 'No role assigned'}
          </p>
        )}
      </div>

      {/* Inherited Permissions Section */}
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-medium text-gray-700">
          Inherited from Role
          {selectedRole && (
            <span className="ml-2 text-xs text-gray-400">
              ({inheritedPermissions.length} permissions)
            </span>
          )}
        </h3>
        {inheritedPermissions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {inheritedPermissions.map((perm) => (
              <span
                key={perm}
                className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
              >
                {perm}
                <span className="ml-1.5 inline-flex items-center rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                  inherited
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            {selectedRoleId
              ? 'This role has no permissions assigned.'
              : 'No role selected.'}
          </p>
        )}
      </div>

      {/* Override Permissions Section */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            Permission Overrides
            {overrides.length > 0 && (
              <span className="ml-2 text-xs text-gray-400">
                ({overrides.length})
              </span>
            )}
          </h3>
          <Can permissions={['roles.manage']}>
            <button
              type="button"
              onClick={() => setShowAddOverride(!showAddOverride)}
              className="inline-flex items-center rounded-md bg-primary-50 px-2.5 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
            >
              <svg
                className="mr-1 h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Add Override
            </button>
          </Can>
        </div>

        {overrides.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {overrides.map((perm) => (
              <span
                key={perm}
                className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
              >
                {perm}
                <span className="ml-1.5 inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                  override
                </span>
                <Can permissions={['roles.manage']}>
                  <button
                    type="button"
                    onClick={() => handleRemoveOverride(perm)}
                    className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600 focus:outline-none"
                    aria-label={`Remove override ${perm}`}
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </Can>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No permission overrides configured.</p>
        )}
      </div>

      {/* Add Override Dropdown */}
      {showAddOverride && canManage && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <label
            htmlFor="add-override-select"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Select permission to add as override
          </label>
          {availableForOverride.length > 0 ? (
            <select
              id="add-override-select"
              onChange={(e) => {
                if (e.target.value) handleAddOverride(e.target.value);
              }}
              defaultValue=""
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="" disabled>
                — Select a permission —
              </option>
              {Object.entries(allPermissionsGrouped).map(([module, perms]) => {
                const available = perms.filter(
                  (p) =>
                    !inheritedPermissions.includes(p.code) &&
                    !overrides.includes(p.code),
                );
                if (available.length === 0) return null;
                return (
                  <optgroup key={module} label={module}>
                    {available.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.code} — {p.display_name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          ) : (
            <p className="text-sm text-gray-500">
              All available permissions are already assigned (inherited or override).
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowAddOverride(false)}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Save Button */}
      <Can permissions={['roles.manage']}>
        {overrides.join(',') !== currentOverrides.join(',') && (
          <div className="flex items-center gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={handleSaveOverrides}
              disabled={overridesMutation.isPending}
              className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {overridesMutation.isPending ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Overrides'
              )}
            </button>
            <button
              type="button"
              onClick={() => setOverrides(currentOverrides)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Reset
            </button>
          </div>
        )}
      </Can>
    </div>
  );
}

export default UserPermissionsPanel;
