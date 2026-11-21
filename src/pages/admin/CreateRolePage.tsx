/**
 * Create Role Page — Admin UI for creating a new role with permissions and data access scope.
 *
 * Displays a form with:
 *  1. Role Name & Description
 *  2. Data Access Scope (Organisation-wide vs Own Department Only vs Normal Employee)
 *  3. Module-wise Permission Grid
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  PermissionSectionsGrid,
  type PermissionItem,
  type PermissionSection,
} from './PermissionSectionsGrid';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Iconify } from '@/components/Iconify';

// ─── Types ───────────────────────────────────────────────────────────────────


type DataScope = 'organisation' | 'department' | 'self';

interface PermissionsResponse {
  sections?: PermissionSection[];
  [key: string]: unknown;
}

// ─── API Hooks ───────────────────────────────────────────────────────────────

function useAllPermissions() {
  return useQuery<PermissionsResponse>({
    queryKey: ['permissions', 'all'],
    queryFn: () => api.get('/api/v1/permissions/').then((res) => res.data),
  });
}

// ─── Skeleton Component ──────────────────────────────────────────────────────

function PermissionGridSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, groupIdx) => (
        <div
          key={groupIdx}
          className="rounded-card bg-surface-paper p-4 shadow-card"
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="h-5 w-32 animate-pulse rounded bg-grey-200" />
            <div className="h-4 w-20 animate-pulse rounded bg-grey-200" />
          </div>
          <div className="ml-6 space-y-2">
            {Array.from({ length: 4 }).map((_, permIdx) => (
              <div key={permIdx} className="flex items-center gap-2">
                <div className="h-4 w-4 animate-pulse rounded bg-grey-200" />
                <div className="h-4 w-40 animate-pulse rounded bg-grey-200" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CreateRolePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: allPermissions,
    isLoading: permsLoading,
    isError: permsError,
  } = useAllPermissions();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dataScope, setDataScope] = useState<DataScope>('self');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string; data_scope: DataScope; permission_ids: string[] }) =>
      api.post('/api/v1/roles/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      navigate('/admin/roles');
    },
    onError: (err: unknown) => {
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { detail?: string; name?: string[] } } }).response;
        if (response?.data?.name) {
          setSubmitError(response.data.name[0]);
        } else if (response?.data?.detail) {
          setSubmitError(response.data.detail);
        } else {
          setSubmitError('Failed to create role. Please try again.');
        }
      } else if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Failed to create role. Please try again.');
      }
    },
  });

  const togglePermission = useCallback((permId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  }, []);

  const toggleModule = useCallback(
    (modulePermissions: PermissionItem[]) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        const allSelected = modulePermissions.every((p) => next.has(p.id));
        if (allSelected) {
          modulePermissions.forEach((p) => next.delete(p.id));
        } else {
          modulePermissions.forEach((p) => next.add(p.id));
        }
        return next;
      });
    },
    [],
  );

  const sections = useMemo<PermissionSection[]>(
    () => allPermissions?.sections ?? [],
    [allPermissions],
  );

  const canSubmit = name.trim().length > 0 && !createMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const payload: { name: string; description?: string; data_scope: DataScope; permission_ids: string[] } = {
      name: name.trim(),
      data_scope: dataScope,
      permission_ids: Array.from(selectedIds),
    };

    if (description.trim()) {
      payload.description = description.trim();
    }

    createMutation.mutate(payload);
  };

  if (permsLoading) {
    return (
      <PageContainer>
        <div className="mb-4 h-4 w-28 animate-pulse rounded bg-grey-200" />
        <div className="mb-2 h-7 w-48 animate-pulse rounded bg-grey-200" />
        <div className="mb-6 h-4 w-64 animate-pulse rounded bg-grey-200" />
        <PermissionGridSkeleton />
      </PageContainer>
    );
  }

  if (permsError) {
    return (
      <PageContainer>
        <ButtonLink to="/admin/roles" variant="text" color="inherit" size="small" className="mb-4 -ml-2.5" startIcon={<Iconify icon="arrow-left" />}>
          Back to Roles
        </ButtonLink>
        <div className="rounded-card bg-error-lighter p-4">
          <p className="text-sm text-error-dark">Failed to load permissions. Please try again.</p>
        </div>
      </PageContainer>
    );
  }

  if (!allPermissions) return null;

  return (
    <PageContainer>
      {/* Back link */}
      <ButtonLink to="/admin/roles" variant="text" color="inherit" size="small" className="mb-4 -ml-2.5" startIcon={<Iconify icon="arrow-left" />}>
        Back to Roles
      </ButtonLink>

      {/* Header */}
      <PageHeader
        title="Create Role"
        subtitle="Define a new role, set its data access scope, and configure permissions."
      />

      {/* Error notification */}
      {submitError && (
        <div className="mb-6 flex items-center gap-2 rounded-card bg-error-lighter p-4">
          <Iconify icon="warning" width={20} className="shrink-0 text-error-main" />
          <p className="text-sm text-error-dark">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Name & Description Fields */}
        <Card className="mb-6 space-y-4 p-6">
          <div>
            <label htmlFor="role-name" className="block text-sm font-medium text-ink-primary">
              Role Name <span className="text-error-main">*</span>
            </label>
            <Input
              id="role-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Department Head, HR Specialist, Team Lead"
              required
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="role-description" className="block text-sm font-medium text-ink-primary">
              Description
            </label>
            <Textarea
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this role's purpose and authority"
              rows={2}
              className="mt-1"
            />
          </div>
        </Card>

        {/* Data Scope Selection Box */}
        <Card className="mb-8 p-6">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-ink-primary">Data Access Scope</h2>
            <p className="text-sm text-ink-secondary">
              Define what employee data and records this role can view, edit, and approve.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Option 1: Organisation-wide */}
            <label
              className={`relative flex cursor-pointer flex-col rounded-lg border p-4 shadow-sm transition-all focus:outline-none ${
                dataScope === 'organisation'
                  ? 'border-secondary-main bg-secondary-lighter/50 ring-2 ring-secondary-main'
                  : 'border-divider bg-surface-paper hover:border-divider hover:bg-surface-neutral'
              }`}
            >
              <input
                type="radio"
                name="data_scope"
                value="organisation"
                checked={dataScope === 'organisation'}
                onChange={() => setDataScope('organisation')}
                className="sr-only"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-lighter text-secondary-dark">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                    </svg>
                  </span>
                  <span className="font-semibold text-ink-primary">Organisation-wide</span>
                </div>
                <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${dataScope === 'organisation' ? 'border-secondary-main bg-secondary-main' : 'border-divider'}`}>
                  {dataScope === 'organisation' && <span className="h-1.5 w-1.5 rounded-full bg-surface-paper" />}
                </span>
              </div>
              <p className="mt-2 text-xs text-ink-secondary">
                Access across the <strong>entire organisation</strong> (e.g. HR Manager, Executive Admin, Operations Head).
              </p>
            </label>

            {/* Option 2: Own Department Only */}
            <label
              className={`relative flex cursor-pointer flex-col rounded-lg border p-4 shadow-sm transition-all focus:outline-none ${
                dataScope === 'department'
                  ? 'border-secondary-main bg-secondary-lighter/50 ring-2 ring-secondary-main'
                  : 'border-divider bg-surface-paper hover:border-divider hover:bg-surface-neutral'
              }`}
            >
              <input
                type="radio"
                name="data_scope"
                value="department"
                checked={dataScope === 'department'}
                onChange={() => setDataScope('department')}
                className="sr-only"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-lighter text-secondary-dark">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </span>
                  <span className="font-semibold text-ink-primary">Own Department Only</span>
                </div>
                <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${dataScope === 'department' ? 'border-secondary-main bg-secondary-main' : 'border-divider'}`}>
                  {dataScope === 'department' && <span className="h-1.5 w-1.5 rounded-full bg-surface-paper" />}
                </span>
              </div>
              <p className="mt-2 text-xs text-ink-secondary">
                Restricted to employees in their <strong>own assigned department</strong> only (e.g. Department Head, Team Lead).
              </p>
            </label>

            {/* Option 3: Normal Employee (Self Only) */}
            <label
              className={`relative flex cursor-pointer flex-col rounded-lg border p-4 shadow-sm transition-all focus:outline-none ${
                dataScope === 'self'
                  ? 'border-secondary-main bg-secondary-lighter/50 ring-2 ring-secondary-main'
                  : 'border-divider bg-surface-paper hover:border-divider hover:bg-surface-neutral'
              }`}
            >
              <input
                type="radio"
                name="data_scope"
                value="self"
                checked={dataScope === 'self'}
                onChange={() => setDataScope('self')}
                className="sr-only"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-lighter text-secondary-dark">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <span className="font-semibold text-ink-primary">Normal Employee</span>
                </div>
                <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${dataScope === 'self' ? 'border-secondary-main bg-secondary-main' : 'border-divider'}`}>
                  {dataScope === 'self' && <span className="h-1.5 w-1.5 rounded-full bg-surface-paper" />}
                </span>
              </div>
              <p className="mt-2 text-xs text-ink-secondary">
                Self-service mode: only accesses <strong>their own individual records</strong> (standard employee role).
              </p>
            </label>
          </div>
        </Card>

        {/* Permission Grid */}
        <div className="mb-8 space-y-4">
          <h2 className="text-lg font-semibold text-ink-primary">Module Permissions</h2>
          <PermissionSectionsGrid
            sections={sections}
            selectedIds={selectedIds}
            onTogglePermission={togglePermission}
            onToggleGroup={toggleModule}
            accent="text-secondary-main focus:ring-secondary-main"
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end">
          <Button
            type="submit"
            disabled={!canSubmit}
          >
            {createMutation.isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-surface-paper border-t-transparent" />
                Creating…
              </>
            ) : (
              'Create Role'
            )}
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}
