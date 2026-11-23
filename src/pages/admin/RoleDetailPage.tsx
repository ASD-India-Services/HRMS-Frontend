/**
 * Role Detail Page — Admin UI for viewing and editing a role's permissions and data scope.
 *
 * Provides:
 *  1. Data Access Scope selection (Organisation-wide vs Own Department Only vs Normal Employee)
 *  2. Module-wise permission checkboxes
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  PermissionSectionsGrid,
  type PermissionSection,
} from './PermissionSectionsGrid';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Iconify } from '@/components/Iconify';

// ─── Types ───────────────────────────────────────────────────────────────────


type DataScope = 'organisation' | 'department' | 'self';

interface PermissionItem {
  id: string;
  code: string;
  display_name: string;
}

interface RoleDetail {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  data_scope: DataScope;
  permissions: PermissionItem[];
  member_count: number;
  created_at: string;
  updated_at: string;
}

interface PermissionsResponse {
  sections?: PermissionSection[];
  [key: string]: unknown;
}

// ─── API Hooks ───────────────────────────────────────────────────────────────

function useRoleDetail(id: string) {
  return useQuery<RoleDetail>({
    queryKey: ['roles', 'detail', id],
    queryFn: () => api.get(`/api/v1/roles/${id}/`).then((res) => res.data),
    enabled: !!id,
  });
}

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
        <div key={groupIdx} className="rounded-card bg-surface-paper p-4 shadow-card">
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

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: role, isLoading: roleLoading, isError: roleError, error: roleErrorObj } = useRoleDetail(id!);
  const { data: allPermissions, isLoading: permsLoading, isError: permsError } = useAllPermissions();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dataScope, setDataScope] = useState<DataScope>('self');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [permSearch, setPermSearch] = useState('');

  // Initialize from role
  useEffect(() => {
    if (role) {
      setSelectedIds(new Set(role.permissions.map((p) => p.id)));
      setDataScope(role.data_scope || 'self');
    }
  }, [role]);

  // Auto-dismiss success notification
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () =>
      api.patch(`/api/v1/roles/${id}/`, {
        data_scope: dataScope,
        permission_ids: Array.from(selectedIds),
      }),
    onSuccess: () => {
      setSaveSuccess(true);
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ['roles', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      // Force an immediate refetch of the current user's permissions so any
      // page gated on them (e.g. Shift Management tabs) reflects the change
      // right away, without waiting for the stale timer or a reload.
      queryClient.refetchQueries({ queryKey: ['hrms-permissions'] });
    },
    onError: (err: unknown) => {
      setSaveSuccess(false);
      if (err && typeof err === 'object' && 'message' in err) {
        setSaveError((err as Error).message);
      } else {
        setSaveError('Failed to save changes. Please try again.');
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

  const toggleModule = useCallback((modulePermissions: PermissionItem[]) => {
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
  }, []);

  const hasChanges = useMemo(() => {
    if (!role) return false;
    if (dataScope !== (role.data_scope || 'organisation')) return true;
    const original = new Set(role.permissions.map((p) => p.id));
    if (original.size !== selectedIds.size) return true;
    for (const pId of selectedIds) {
      if (!original.has(pId)) return true;
    }
    return false;
  }, [role, dataScope, selectedIds]);

  const sections = useMemo<PermissionSection[]>(
    () => allPermissions?.sections ?? [],
    [allPermissions],
  );

  // Filter the sections/subsections by the search term. A section stays if its
  // own label matches (all its permissions kept) or if any of its permissions
  // match (only the matching ones kept). Empty search returns everything.
  const filteredSections = useMemo<PermissionSection[]>(() => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return sections;

    const matchesPerm = (p: PermissionItem) =>
      p.display_name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);

    const result: PermissionSection[] = [];
    for (const section of sections) {
      const sectionLabelHit = section.label.toLowerCase().includes(q);

      const common = sectionLabelHit
        ? section.common
        : section.common.filter(matchesPerm);

      const subsections = section.subsections
        .map((sub) => {
          const subLabelHit = sub.label.toLowerCase().includes(q);
          const permissions =
            sectionLabelHit || subLabelHit
              ? sub.permissions
              : sub.permissions.filter(matchesPerm);
          return { ...sub, permissions };
        })
        .filter((sub) => sub.permissions.length > 0);

      if (common.length > 0 || subsections.length > 0) {
        result.push({ ...section, common, subsections });
      }
    }
    return result;
  }, [sections, permSearch]);

  if (roleLoading || permsLoading) {
    return (
      <PageContainer>
        <div className="mb-4 h-4 w-28 animate-pulse rounded bg-grey-200" />
        <div className="mb-2 h-7 w-48 animate-pulse rounded bg-grey-200" />
        <div className="mb-6 h-4 w-64 animate-pulse rounded bg-grey-200" />
        <PermissionGridSkeleton />
      </PageContainer>
    );
  }

  if (roleError || permsError) {
    return (
      <PageContainer>
        <ButtonLink to="/admin/roles" variant="text" color="inherit" size="small" className="mb-4 -ml-2.5" startIcon={<Iconify icon="arrow-left" />}>
          Back to Roles
        </ButtonLink>
        <div className="rounded-card bg-error-lighter p-4">
          <p className="text-sm text-error-dark">
            Failed to load role details.{' '}
            {roleErrorObj instanceof Error ? roleErrorObj.message : 'Please try again.'}
          </p>
        </div>
      </PageContainer>
    );
  }

  if (!role || !allPermissions) return null;

  return (
    <PageContainer>
      {/* Header with Save Button — sticky so it stays visible while scrolling */}
      <div className="sticky top-0 z-30 -mx-4 mb-6 bg-surface-neutral/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <PageHeader
          className="!mb-0 items-center"
          breadcrumb={
            <ButtonLink to="/admin/roles" variant="text" color="inherit" size="small" className="-ml-2.5" startIcon={<Iconify icon="arrow-left" />}>
              Back to Roles
            </ButtonLink>
          }
          title={<span className="block truncate">{role.name}</span>}
          subtitle={role.description || undefined}
          actions={
            <>
              {/* Permission search */}
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-disabled">
                  <Iconify icon="search" width={16} />
                </span>
                <Input
                  type="text"
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  placeholder="Search permissions…"
                  aria-label="Search permissions"
                  className="w-48 pl-9 pr-8 sm:w-64"
                />
                {permSearch && (
                  <IconButton
                    icon="close"
                    size="small"
                    aria-label="Clear search"
                    onClick={() => setPermSearch('')}
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                  />
                )}
              </div>
              {hasChanges && <span className="hidden text-sm font-medium text-warning-main sm:inline">Unsaved changes</span>}
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!hasChanges || saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-surface-paper border-t-transparent" />
                    Saving…
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </>
          }
        />
      </div>

      {/* Toast notification for save success */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-center gap-3 rounded-card bg-surface-paper px-4 py-3 shadow-dropdown">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-lighter">
              <Iconify icon="check" width={20} className="text-success-main" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-primary">Settings saved</p>
              <p className="text-xs text-ink-secondary">Permissions and data scope updated successfully.</p>
            </div>
          </div>
        </div>
      )}
      {saveError && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-center gap-3 rounded-card bg-surface-paper px-4 py-3 shadow-dropdown">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-error-lighter">
              <Iconify icon="close" width={20} className="text-error-main" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-primary">Save failed</p>
              <p className="text-xs text-ink-secondary">{saveError}</p>
            </div>
          </div>
        </div>
      )}

      {/* System role warning */}
      {role.is_system && (
        <div className="mb-6 flex items-start gap-3 rounded-card bg-warning-lighter p-4">
          <Iconify icon="warning" width={20} className="mt-0.5 shrink-0 text-warning-main" />
          <p className="text-sm text-warning-dark">This is a system role. Changes may affect core functionality.</p>
        </div>
      )}

      {/* Data Scope Selection Box (Top) */}
      <Card className="mb-8 p-6">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-ink-primary">Data Access Scope</h2>
          <p className="text-sm text-ink-secondary">
            Define the reach of this role when viewing, editing, and managing employee records, attendance, leaves, and approvals.
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
              Can access, view, and manage employees across the <strong>entire organisation</strong> (e.g. HR Manager, Operations Head, Org Admin).
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
              Restricted to employees in their <strong>own assigned department</strong> only (e.g. Department Head, Team Lead, Manager).
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
              Self-service mode: only sees and accesses <strong>their own individual records</strong> (standard employee role).
            </p>
          </label>
        </div>
      </Card>

      {/* Permission Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-ink-primary">Module Permissions</h2>
        {filteredSections.length === 0 ? (
          <Card className="p-8 text-center text-sm text-ink-secondary">
            No permissions match &ldquo;{permSearch}&rdquo;.
          </Card>
        ) : (
          <PermissionSectionsGrid
            sections={filteredSections}
            selectedIds={selectedIds}
            onTogglePermission={togglePermission}
            onToggleGroup={toggleModule}
          />
        )}
      </div>

    </PageContainer>
  );
}
