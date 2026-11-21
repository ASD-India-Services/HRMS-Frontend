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
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/EmptyState';
import { Iconify } from '@/components/Iconify';

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
      <PageContainer>
        <DataTableSkeleton columnCount={6} rowCount={5} />
      </PageContainer>
    );
  }

  if (!hasPermission('roles.manage')) {
    return (
      <PageContainer>
        <div className="rounded-card bg-error-lighter p-4">
          <p className="text-sm text-error-dark">
            You do not have permission to access this page.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Roles"
        subtitle="Manage roles, data access scopes, and their permission assignments"
        actions={
          <Button onClick={() => navigate('/admin/roles/create')} startIcon={<Iconify icon="plus" />}>
            Create Role
          </Button>
        }
      />

      {/* Loading State */}
      {isLoading && <DataTableSkeleton columnCount={6} rowCount={5} />}

      {/* Error State */}
      {isError && (
        <div className="rounded-card bg-error-lighter p-4">
          <p className="text-sm text-error-dark">
            Failed to load roles.{' '}
            {error instanceof Error ? error.message : 'Please try again.'}
          </p>
        </div>
      )}

      {/* Empty State */}
      {roles && roles.length === 0 && (
        <Card>
          <EmptyState
            module="roles"
            title="No roles yet"
            description="Get started by creating a new role for your organization."
            ctaLabel="Create Role"
            onCtaClick={() => navigate('/admin/roles/create')}
          />
        </Card>
      )}

      {/* Roles Table */}
      {roles && roles.length > 0 && (
        <Card className="overflow-x-auto">
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
                      <span className="inline-flex items-center rounded-full bg-primary-lighter px-2.5 py-0.5 text-xs font-medium text-primary-dark">
                        Own Department
                      </span>
                    ) : role.data_scope === 'self' ? (
                      <span className="inline-flex items-center rounded-full bg-surface-neutral px-2.5 py-0.5 text-xs font-medium text-ink-primary">
                        Self Only
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-secondary-lighter px-2.5 py-0.5 text-xs font-medium text-secondary-dark">
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
        </Card>
      )}
    </PageContainer>
  );
}
