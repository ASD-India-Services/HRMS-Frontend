/**
 * Role Detail Page — Admin UI for viewing and editing a role's permissions and data scope.
 *
 * Provides:
 *  1. Data Access Scope selection (Organisation-wide vs Own Department Only vs Normal Employee)
 *  2. Module-wise permission checkboxes
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  PermissionSectionsGrid,
  type PermissionSection,
} from './PermissionSectionsGrid';

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
        <div key={groupIdx} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="ml-6 space-y-2">
            {Array.from({ length: 4 }).map((_, permIdx) => (
              <div key={permIdx} className="flex items-center gap-2">
                <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
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
  const [dataScope, setDataScope] = useState<DataScope>('organisation');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [permSearch, setPermSearch] = useState('');

  // Initialize from role
  useEffect(() => {
    if (role) {
      setSelectedIds(new Set(role.permissions.map((p) => p.id)));
      setDataScope(role.data_scope || 'organisation');
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
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 h-4 w-28 animate-pulse rounded bg-gray-200" />
        <div className="mb-2 h-7 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mb-6 h-4 w-64 animate-pulse rounded bg-gray-200" />
        <PermissionGridSkeleton />
      </div>
    );
  }

  if (roleError || permsError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/admin/roles" className="mb-4 inline-flex items-center text-sm text-primary-600 hover:text-primary-800">
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Roles
        </Link>
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Failed to load role details.{' '}
            {roleErrorObj instanceof Error ? roleErrorObj.message : 'Please try again.'}
          </p>
        </div>
      </div>
    );
  }

  if (!role || !allPermissions) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header with Save Button — sticky so it stays visible while scrolling */}
      <div className="sticky top-0 z-30 -mx-4 mb-6 bg-gray-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {/* Back link */}
        <Link
          to="/admin/roles"
          className="mb-2 inline-flex items-center text-sm text-primary-600 hover:text-primary-800"
        >
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Roles
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-gray-900">{role.name}</h1>
            {role.description && (
              <p className="mt-1 truncate text-sm text-gray-600">{role.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Permission search */}
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                placeholder="Search permissions…"
                aria-label="Search permissions"
                className="w-48 rounded-md border border-gray-300 py-2 pl-9 pr-8 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:w-64"
              />
              {permSearch && (
                <button
                  type="button"
                  onClick={() => setPermSearch('')}
                  aria-label="Clear search"
                  className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {hasChanges && <span className="hidden text-sm font-medium text-amber-600 sm:inline">Unsaved changes</span>}
            <button
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending}
              className="inline-flex items-center whitespace-nowrap rounded-md bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {saveMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast notification for save success */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-white px-4 py-3 shadow-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Settings saved</p>
              <p className="text-xs text-gray-500">Permissions and data scope updated successfully.</p>
            </div>
          </div>
        </div>
      )}
      {saveError && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-white px-4 py-3 shadow-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Save failed</p>
              <p className="text-xs text-gray-500">{saveError}</p>
            </div>
          </div>
        </div>
      )}

      {/* System role warning */}
      {role.is_system && (
        <div className="mb-6 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-amber-800">This is a system role. Changes may affect core functionality.</p>
        </div>
      )}

      {/* Data Scope Selection Box (Top) */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-gray-900">Data Access Scope</h2>
          <p className="text-sm text-gray-500">
            Define the reach of this role when viewing, editing, and managing employee records, attendance, leaves, and approvals.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Option 1: Organisation-wide */}
          <label
            className={`relative flex cursor-pointer flex-col rounded-lg border p-4 shadow-sm transition-all focus:outline-none ${
              dataScope === 'organisation'
                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
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
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                </span>
                <span className="font-semibold text-gray-900">Organisation-wide</span>
              </div>
              <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${dataScope === 'organisation' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                {dataScope === 'organisation' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Can access, view, and manage employees across the <strong>entire organisation</strong> (e.g. HR Manager, Operations Head, Org Admin).
            </p>
          </label>

          {/* Option 2: Own Department Only */}
          <label
            className={`relative flex cursor-pointer flex-col rounded-lg border p-4 shadow-sm transition-all focus:outline-none ${
              dataScope === 'department'
                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
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
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </span>
                <span className="font-semibold text-gray-900">Own Department Only</span>
              </div>
              <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${dataScope === 'department' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                {dataScope === 'department' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Restricted to employees in their <strong>own assigned department</strong> only (e.g. Department Head, Team Lead, Manager).
            </p>
          </label>

          {/* Option 3: Normal Employee (Self Only) */}
          <label
            className={`relative flex cursor-pointer flex-col rounded-lg border p-4 shadow-sm transition-all focus:outline-none ${
              dataScope === 'self'
                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
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
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <span className="font-semibold text-gray-900">Normal Employee</span>
              </div>
              <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${dataScope === 'self' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                {dataScope === 'self' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Self-service mode: only sees and accesses <strong>their own individual records</strong> (standard employee role).
            </p>
          </label>
        </div>
      </div>

      {/* Permission Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Module Permissions</h2>
        {filteredSections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            No permissions match &ldquo;{permSearch}&rdquo;.
          </div>
        ) : (
          <PermissionSectionsGrid
            sections={filteredSections}
            selectedIds={selectedIds}
            onTogglePermission={togglePermission}
            onToggleGroup={toggleModule}
          />
        )}
      </div>

    </div>
  );
}
