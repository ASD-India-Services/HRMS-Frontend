/**
 * Roles List Page — Admin UI for viewing and managing roles.
 *
 * Displays all roles with name, description, permission count, and member count.
 * Distinguishes system roles from custom roles with visual badges.
 * Gates access with "roles.manage" permission check.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { DataTableSkeleton } from '@/components/DataTable/DataTableSkeleton';
import { Button } from '@/components/ui/Button';

interface RoleListItem {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  data_scope?: 'organisation' | 'department' | 'self';
  permissions: { id: string; code: string; display_name: string }[];
  member_count: number;
  created_at: string;
  updated_at: string;
}

function useRoles() {
  return useQuery<RoleListItem[]>({
    queryKey: ['roles'],
    queryFn: () => api.get('/api/v1/roles/').then((res) => {
      // Handle both paginated ({results: [...]}) and plain array responses
      const data = res.data;
      return Array.isArray(data) ? data : data.results ?? [];
    }),
  });
}

export default function RolesPage() {
  const navigate = useNavigate();
  const { hasPermission, isLoading: permissionsLoading } = useHrmsPermissionsContext();
  const { data: roles, isLoading, isError, error } = useRoles();

  // Permission gate: require "roles.manage" to access this page
  if (permissionsLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <DataTableSkeleton columnCount={6} rowCount={5} />
      </div>
    );
  }

  if (!hasPermission('roles.manage')) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-md bg-error-lighter p-4">
          <p className="text-sm text-error-dark">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Roles</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Manage roles, data access scopes, and their permission assignments
          </p>
        </div>
        <Button type="button"
          onClick={() => navigate('/admin/roles/create')}
        >
          <svg
            className="-ml-0.5 mr-1.5 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Create Role
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && <DataTableSkeleton columnCount={6} rowCount={5} />}

      {/* Error State */}
      {isError && (
        <div className="rounded-md bg-error-lighter p-4">
          <p className="text-sm text-error-dark">
            Failed to load roles.{' '}
            {error instanceof Error ? error.message : 'Please try again.'}
          </p>
        </div>
      )}

      {/* Empty State */}
      {roles && roles.length === 0 && (
        <div className="py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-grey-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-ink-primary">No roles yet</h3>
          <p className="mt-1 text-sm text-ink-secondary">
            Get started by creating a new role for your organization.
          </p>
          <Button type="button"
            onClick={() => navigate('/admin/roles/create')}
            className="mt-4"
          >
            <svg
              className="-ml-0.5 mr-1.5 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Create Role
          </Button>
        </div>
      )}

      {/* Roles Table */}
      {roles && roles.length > 0 && (
        <div className="overflow-x-auto border border-divider rounded-lg">
          <table className="min-w-full divide-y divide-divider">
            <thead className="bg-surface-neutral">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">
                  Data Scope
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">
                  Permissions
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">
                  Members
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider bg-surface-paper">
              {roles.map((role) => (
                <tr
                  key={role.id}
                  onClick={() => navigate(`/admin/roles/${role.id}`)}
                  className="cursor-pointer hover:bg-surface-neutral transition-colors"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink-primary">
                    {role.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-secondary max-w-xs truncate">
                    {role.description || '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {role.data_scope === 'department' ? (
                      <span className="inline-flex items-center rounded-full bg-primary-lighter border border-primary-light px-2.5 py-0.5 text-xs font-medium text-primary-dark">
                        Own Department
                      </span>
                    ) : role.data_scope === 'self' ? (
                      <span className="inline-flex items-center rounded-full bg-surface-neutral border border-divider px-2.5 py-0.5 text-xs font-medium text-ink-primary">
                        Self Only
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-secondary-lighter border border-secondary-light px-2.5 py-0.5 text-xs font-medium text-secondary-dark">
                        Organisation-wide
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {role.is_system ? (
                      <span className="inline-flex items-center rounded-full bg-secondary-lighter px-2.5 py-0.5 text-xs font-medium text-secondary-dark">
                        System
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-success-lighter px-2.5 py-0.5 text-xs font-medium text-success-dark">
                        Custom
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                    {role.permissions.length}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                    {role.member_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
