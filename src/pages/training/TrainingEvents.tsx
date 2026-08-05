/**
 * TrainingEvents Page — HR/Admin interface for managing training events
 * using DataTable, FilterBar, Pagination, WorkflowEngine, and Can components.
 *
 * - Inline workflow actions (Start/Complete/Cancel) per row via WorkflowEngine
 * - URL-synced filters and pagination
 * - RBAC-restricted to org_admin, hr_manager
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { useMemo } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import {
  trainingEventsCrudConfig,
  type TrainingEvent,
} from '@/config/crud/trainingEvents';
import { trainingWorkflow } from '@/config/workflows/training';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { WorkflowEngine } from '@/components/WorkflowEngine';
import { Can } from '@/components/Can';
import { AccessDenied } from '@/components/AccessDenied/AccessDenied';
import type { ColumnDef } from '@/types/datatable';

const trainingCrud = createCrudHooks<TrainingEvent>({
  queryKey: trainingEventsCrudConfig.queryKey,
  endpoints: trainingEventsCrudConfig.endpoints,
});

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function useTrainingColumns(): ColumnDef<TrainingEvent>[] {
  return useMemo(
    () => [
      { key: 'name', header: 'Event Name', sortable: true },
      {
        key: 'event_type',
        header: 'Type',
        sortable: true,
        render: (value: unknown) => (
          <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium capitalize text-purple-700">
            {String(value || '—')}
          </span>
        ),
      },
      {
        key: 'start_date',
        header: 'Start Date',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm text-gray-700">{formatDate(value as string)}</span>
        ),
      },
      { key: 'trainer', header: 'Trainer', sortable: true },
      {
        key: 'max_participants',
        header: 'Max Participants',
        sortable: true,
        render: (value: unknown) => (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800">
            {String(value ?? '—')}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status & Actions',
        sortable: false,
        render: (_value: unknown, row: TrainingEvent) => (
          <WorkflowEngine
            config={trainingWorkflow}
            record={{ ...row, id: row.id, status: row.status }}
            invalidateKeys={[[trainingEventsCrudConfig.queryKey, 'list']]}
          />
        ),
      },
    ],
    []
  );
}

export function TrainingEvents() {
  return (
    <Can
      permissions={['training.view']}
      fallback={<AccessDenied />}
    >
      <TrainingEventsContent />
    </Can>
  );
}

function TrainingEventsContent() {
  const columns = useTrainingColumns();
  const filters = trainingEventsCrudConfig.filters;

  const {
    filterValues,
    setFilter,
    clearFilters,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useFilterSync({ filters });

  const apiParams = useMemo(() => {
    const params: Record<string, string | number> = { page, page_size: pageSize };
    if (filterValues.search) params.search = filterValues.search;
    if (filterValues.status) params.status = filterValues.status;
    return params;
  }, [filterValues, page, pageSize]);

  const queryResult = trainingCrud.useList(apiParams);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Training Events</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage training events, track statuses, and control lifecycle.
        </p>
      </div>

      <FilterBar
        filters={filters}
        values={filterValues}
        onChange={setFilter}
        onClearAll={clearFilters}
      />

      <DataTable<TrainingEvent>
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
