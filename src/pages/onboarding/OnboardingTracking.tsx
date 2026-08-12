/**
 * OnboardingTracking Page — HR/Admin interface for tracking employee onboarding
 * progress using DataTable, FilterBar, Pagination, and Can components.
 *
 * - Displays onboarding tasks with completion percentage per employee
 * - URL-synced filters and pagination
 * - RBAC-restricted to org_admin, hr_manager
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { useMemo } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { ONBOARDING } from '@/lib/endpoints';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { Can } from '@/components/Can';
import { AccessDenied } from '@/components/AccessDenied/AccessDenied';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { CrudEndpoints } from '@/hooks/useCrud';

export interface OnboardingTask {
  id: string;
  employee: string;
  title: string;
  category: string;
  status: string;
  due_date: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const onboardingTaskEndpoints: CrudEndpoints = {
  list: ONBOARDING.TASKS,
  create: ONBOARDING.TASKS,
  detail: ONBOARDING.TASK_DETAIL,
  update: ONBOARDING.TASK_DETAIL,
  delete: ONBOARDING.TASK_DETAIL,
};

const onboardingTasksCrud = createCrudHooks<OnboardingTask>({
  queryKey: 'onboarding-tasks',
  endpoints: onboardingTaskEndpoints,
});

const trackingFilters: FilterConfig[] = [
  { key: 'search', label: 'Search employee...', type: 'search', debounceMs: 300 },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'pending', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
    ],
  },
];

/**
 * Calculate onboarding completion percentage.
 * Property 9: progress = (completed / total) * 100 rounded to nearest integer.
 */
export function calculateProgress(tasks: OnboardingTask[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  return Math.round((completed / tasks.length) * 100);
}

function useTrackingColumns(): ColumnDef<OnboardingTask>[] {
  return useMemo(
    () => [
      { key: 'employee_name', header: 'Employee', sortable: true, render: (v: unknown) => (v ? String(v) : '—') },
      { key: 'title', header: 'Task', sortable: true },
      { key: 'template_name', header: 'Template', sortable: true, render: (v: unknown) => (v ? String(v) : '—') },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (value: unknown) => {
          const status = value as string;
          const colors: Record<string, string> = {
            pending: 'bg-gray-100 text-gray-700',
            in_progress: 'bg-blue-100 text-blue-700',
            completed: 'bg-green-100 text-green-700',
          };
          return (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || 'bg-gray-100 text-gray-700'}`}
            >
              {status?.replace('_', ' ') || '—'}
            </span>
          );
        },
      },
      {
        key: 'due_days',
        header: 'Due (days)',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm text-gray-700">
            {value ? `${value} days` : '—'}
          </span>
        ),
      },
    ],
    []
  );
}

export function OnboardingTracking() {
  return (
    <Can
      permissions={['onboarding.manage']}
      fallback={<AccessDenied />}
    >
      <OnboardingTrackingContent />
    </Can>
  );
}

function OnboardingTrackingContent() {
  const columns = useTrackingColumns();

  const {
    filterValues,
    setFilter,
    clearFilters,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useFilterSync({ filters: trackingFilters });

  const apiParams = useMemo(() => {
    const params: Record<string, string | number> = { page, page_size: pageSize };
    if (filterValues.search) params.search = filterValues.search;
    if (filterValues.status) params.status = filterValues.status;
    return params;
  }, [filterValues, page, pageSize]);

  const queryResult = onboardingTasksCrud.useList(apiParams);

  // Calculate progress from loaded tasks
  const progress = useMemo(() => {
    if (!queryResult.data?.results) return 0;
    return calculateProgress(queryResult.data.results);
  }, [queryResult.data]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onboarding Tracking</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track employee onboarding task progress and completion.
          </p>
        </div>
        {queryResult.data && (
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm">
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">{progress}%</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
            <div
              className="h-10 w-10 rounded-full"
              style={{
                background: `conic-gradient(#22c55e ${progress * 3.6}deg, #e5e7eb ${progress * 3.6}deg)`,
              }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Onboarding progress: ${progress}%`}
            />
          </div>
        )}
      </div>

      <FilterBar
        filters={trackingFilters}
        values={filterValues}
        onChange={setFilter}
        onClearAll={clearFilters}
      />

      <DataTable<OnboardingTask>
        queryResult={queryResult}
        columns={columns}
      />

      {queryResult.data && queryResult.data.count > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={queryResult.data.count}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}
