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
import { Button, IconButton } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Iconify } from '@/components/Iconify';

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
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 rounded bg-grey-200" />
          <div className="h-10 w-full rounded bg-grey-200" />
          <div className="h-4 w-48 rounded bg-grey-200" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-7 w-24 rounded-full bg-grey-200" />
            ))}
          </div>
          <div className="h-4 w-48 rounded bg-grey-200" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-7 w-24 rounded-full bg-grey-200" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Card className="p-6">
      {/* Header */}
      <h2 className="mb-4 text-lg font-semibold text-ink-primary">Permissions</h2>

      {/* Success Toast */}
      {successMessage && (
        <div className="mb-4 rounded-md bg-success-lighter p-3">
          <p className="text-sm font-medium text-success-dark">{successMessage}</p>
        </div>
      )}

      {/* Error Messages */}
      {roleAssignMutation.isError && (
        <div className="mb-4 rounded-md bg-error-lighter p-3">
          <p className="text-sm text-error-dark">
            Failed to update role. Please try again.
          </p>
        </div>
      )}
      {overridesMutation.isError && (
        <div className="mb-4 rounded-md bg-error-lighter p-3">
          <p className="text-sm text-error-dark">
            Failed to save overrides. Please try again.
          </p>
        </div>
      )}

      {/* Role Selector */}
      <div className="mb-6">
        <label
          htmlFor="user-role-select"
          className="mb-1 block text-sm font-medium text-ink-primary"
        >
          Assigned Role
        </label>
        <Can permissions={['roles.manage']}>
          <Select
            id="user-role-select"
            value={selectedRoleId}
            onChange={handleRoleChange}
            disabled={roleAssignMutation.isPending}
            className="disabled:cursor-not-allowed"
          >
            <option value="">— No role assigned —</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
                {role.is_system ? ' (System)' : ''}
              </option>
            ))}
          </Select>
        </Can>
        {!canManage && (
          <p className="mt-1 text-sm text-ink-secondary">
            {roleAssignment?.role_name ?? 'No role assigned'}
          </p>
        )}
      </div>

      {/* Inherited Permissions Section */}
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-medium text-ink-primary">
          Inherited from Role
          {selectedRole && (
            <span className="ml-2 text-xs text-ink-disabled">
              ({inheritedPermissions.length} permissions)
            </span>
          )}
        </h3>
        {inheritedPermissions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {inheritedPermissions.map((perm) => (
              <span
                key={perm}
                className="inline-flex items-center rounded-full bg-surface-neutral px-2.5 py-1 text-xs font-medium text-ink-secondary"
              >
                {perm}
                <span className="ml-1.5 inline-flex items-center rounded-full bg-grey-200 px-1.5 py-0.5 text-[10px] font-medium text-ink-secondary">
                  inherited
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-disabled">
            {selectedRoleId
              ? 'This role has no permissions assigned.'
              : 'No role selected.'}
          </p>
        )}
      </div>

      {/* Override Permissions Section */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-ink-primary">
            Permission Overrides
            {overrides.length > 0 && (
              <span className="ml-2 text-xs text-ink-disabled">
                ({overrides.length})
              </span>
            )}
          </h3>
          <Can permissions={['roles.manage']}>
            <Button
              variant="soft"
              size="small"
              onClick={() => setShowAddOverride(!showAddOverride)}
              startIcon={<Iconify icon="plus" />}
            >
              Add Override
            </Button>
          </Can>
        </div>

        {overrides.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {overrides.map((perm) => (
              <span
                key={perm}
                className="inline-flex items-center rounded-full bg-primary-lighter px-2.5 py-1 text-xs font-medium text-primary-dark"
              >
                {perm}
                <span className="ml-1.5 inline-flex items-center rounded-full bg-primary-lighter px-1.5 py-0.5 text-[10px] font-medium text-primary-main">
                  override
                </span>
                <Can permissions={['roles.manage']}>
                  <IconButton
                    icon="close"
                    size="small"
                    onClick={() => handleRemoveOverride(perm)}
                    className="ml-1 !h-5 !w-5 text-primary-main"
                    aria-label={`Remove override ${perm}`}
                  />
                </Can>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-disabled">No permission overrides configured.</p>
        )}
      </div>

      {/* Add Override Dropdown */}
      {showAddOverride && canManage && (
        <div className="mb-6 rounded-card bg-surface-neutral p-4">
          <label
            htmlFor="add-override-select"
            className="mb-2 block text-sm font-medium text-ink-primary"
          >
            Select permission to add as override
          </label>
          {availableForOverride.length > 0 ? (
            <Select
              id="add-override-select"
              onChange={(e) => {
                if (e.target.value) handleAddOverride(e.target.value);
              }}
              defaultValue=""
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
            </Select>
          ) : (
            <p className="text-sm text-ink-secondary">
              All available permissions are already assigned (inherited or override).
            </p>
          )}
          <Button variant="text" color="inherit" size="small" className="mt-2" onClick={() => setShowAddOverride(false)}>
            Cancel
          </Button>
        </div>
      )}

      {/* Save Button */}
      <Can permissions={['roles.manage']}>
        {overrides.join(',') !== currentOverrides.join(',') && (
          <div className="flex items-center gap-3 border-t border-divider pt-4">
            <Button
              type="button"
              onClick={handleSaveOverrides}
              disabled={overridesMutation.isPending}
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
            </Button>
            <Button variant="text" color="inherit" onClick={() => setOverrides(currentOverrides)}>
              Reset
            </Button>
          </div>
        )}
      </Can>
    </Card>
  );
}

export default UserPermissionsPanel;
