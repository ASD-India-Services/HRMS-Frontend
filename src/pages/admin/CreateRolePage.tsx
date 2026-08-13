/**
 * Create Role Page — Admin UI for creating a new role with permissions.
 *
 * Displays a form with role name, description, and a permission grid
 * grouped by module. Allows toggling individual permissions or selecting
 * all per module. Navigates back to roles list on success.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
 */

import { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PermissionItem {
  id: string;
  code: string;
  display_name: string;
}

/** GET /api/v1/permissions/ returns permissions grouped by module */
type PermissionsGrouped = Record<string, PermissionItem[]>;

// ─── API Hooks ───────────────────────────────────────────────────────────────

function useAllPermissions() {
  return useQuery<PermissionsGrouped>({
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
          {/* Module header skeleton */}
          <div className="mb-3 flex items-center gap-3">
            <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          </div>
          {/* Permission checkboxes skeleton */}
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string; permission_ids: string[] }) =>
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

  // ─── Permission Toggle Handlers ──────────────────────────────────────────

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
          // Deselect all in this module
          modulePermissions.forEach((p) => next.delete(p.id));
        } else {
          // Select all in this module
          modulePermissions.forEach((p) => next.add(p.id));
        }
        return next;
      });
    },
    [],
  );

  // ─── Derived State ───────────────────────────────────────────────────────

  const sortedModules = useMemo(() => {
    if (!allPermissions) return [];
    return Object.keys(allPermissions).sort();
  }, [allPermissions]);

  const canSubmit = name.trim().length > 0 && !createMutation.isPending;

  // ─── Form Submit Handler ─────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const payload: { name: string; description?: string; permission_ids: string[] } = {
      name: name.trim(),
      permission_ids: Array.from(selectedIds),
    };

    if (description.trim()) {
      payload.description = description.trim();
    }

    createMutation.mutate(payload);
  };

  // ─── Loading State ───────────────────────────────────────────────────────

  if (permsLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Back link skeleton */}
        <div className="mb-4 h-4 w-28 animate-pulse rounded bg-gray-200" />
        {/* Title skeleton */}
        <div className="mb-2 h-7 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mb-6 h-4 w-64 animate-pulse rounded bg-gray-200" />
        {/* Grid skeleton */}
        <PermissionGridSkeleton />
      </div>
    );
  }

  // ─── Error State ─────────────────────────────────────────────────────────

  if (permsError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          to="/admin/roles"
          className="mb-4 inline-flex items-center text-sm text-primary-600 hover:text-primary-800"
        >
          <svg
            className="mr-1 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Roles
        </Link>
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Failed to load permissions. Please try again.
          </p>
        </div>
      </div>
    );
  }

  if (!allPermissions) return null;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        to="/admin/roles"
        className="mb-4 inline-flex items-center text-sm text-primary-600 hover:text-primary-800"
      >
        <svg
          className="mr-1 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Roles
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Role</h1>
        <p className="mt-1 text-sm text-gray-600">
          Define a new role and assign permissions.
        </p>
      </div>

      {/* Error notification */}
      {submitError && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4">
          <svg
            className="h-5 w-5 flex-shrink-0 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v3.75m9.303 3.376c-.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374L10.051 3.378c.866-1.5 3.032-1.5 3.898 0l7.354 12.748ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          <p className="text-sm text-red-800">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Name & Description Fields */}
        <div className="mb-6 space-y-4 rounded-lg border border-gray-200 bg-white p-4">
          <div>
            <label
              htmlFor="role-name"
              className="block text-sm font-medium text-gray-700"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="role-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HR Manager"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label
              htmlFor="role-description"
              className="block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this role's responsibilities"
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Permission Grid */}
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Permissions
          </h2>
          <div className="space-y-4">
            {sortedModules.map((module) => {
              const modulePerms = allPermissions[module];
              const allSelected = modulePerms.every((p) => selectedIds.has(p.id));
              const someSelected =
                !allSelected && modulePerms.some((p) => selectedIds.has(p.id));

              return (
                <div
                  key={module}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  {/* Module header with Select All */}
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onChange={() => toggleModule(modulePerms)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        aria-label={`Select all ${module} permissions`}
                      />
                      <span className="text-sm font-semibold capitalize text-gray-900">
                        {module}
                      </span>
                    </label>
                    <span className="text-xs text-gray-400">
                      {modulePerms.filter((p) => selectedIds.has(p.id)).length}/
                      {modulePerms.length} selected
                    </span>
                  </div>

                  {/* Individual permissions */}
                  <div className="ml-6 space-y-2">
                    {modulePerms.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          aria-label={perm.display_name}
                        />
                        <span className="text-sm text-gray-700">
                          {perm.display_name}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({perm.code})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
