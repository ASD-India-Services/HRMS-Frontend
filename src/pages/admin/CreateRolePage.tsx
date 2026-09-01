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
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  PermissionSectionsGrid,
  type PermissionItem,
  type PermissionSection,
} from './PermissionSectionsGrid';

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
          className="rounded-lg border border-gray-200 bg-white p-4"
        >
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
  const [dataScope, setDataScope] = useState<DataScope>('organisation');
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
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 h-4 w-28 animate-pulse rounded bg-gray-200" />
        <div className="mb-2 h-7 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mb-6 h-4 w-64 animate-pulse rounded bg-gray-200" />
        <PermissionGridSkeleton />
      </div>
    );
  }

  if (permsError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          to="/admin/roles"
          className="mb-4 inline-flex items-center text-sm text-primary-600 hover:text-primary-800"
        >
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Roles
        </Link>
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">Failed to load permissions. Please try again.</p>
        </div>
      </div>
    );
  }

  if (!allPermissions) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        to="/admin/roles"
        className="mb-4 inline-flex items-center text-sm text-primary-600 hover:text-primary-800"
      >
        <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Roles
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Role</h1>
        <p className="mt-1 text-sm text-gray-600">
          Define a new role, set its data access scope, and configure permissions.
        </p>
      </div>

      {/* Error notification */}
      {submitError && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4">
          <svg className="h-5 w-5 flex-shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9.303 3.376c-.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374L10.051 3.378c.866-1.5 3.032-1.5 3.898 0l7.354 12.748ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-red-800">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Name & Description Fields */}
        <div className="mb-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <label htmlFor="role-name" className="block text-sm font-medium text-gray-700">
              Role Name <span className="text-red-500">*</span>
            </label>
            <input
              id="role-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Department Head, HR Specialist, Team Lead"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="role-description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this role's purpose and authority"
              rows={2}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Data Scope Selection Box */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-900">Data Access Scope</h2>
            <p className="text-sm text-gray-500">
              Define what employee data and records this role can view, edit, and approve.
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
                Access across the <strong>entire organisation</strong> (e.g. HR Manager, Executive Admin, Operations Head).
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
                Restricted to employees in their <strong>own assigned department</strong> only (e.g. Department Head, Team Lead).
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
                Self-service mode: only accesses <strong>their own individual records</strong> (standard employee role).
              </p>
            </label>
          </div>
        </div>

        {/* Permission Grid */}
        <div className="mb-8 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Module Permissions</h2>
          <PermissionSectionsGrid
            sections={sections}
            selectedIds={selectedIds}
            onTogglePermission={togglePermission}
            onToggleGroup={toggleModule}
            accent="text-indigo-600 focus:ring-indigo-500"
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center rounded-md bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createMutation.isPending ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating…
              </>
            ) : (
              'Create Role'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
