/**
 * AppraisalCycles Page — Admin/HR interface for managing appraisal cycles
 * using DataTable, FilterBar, Pagination, WorkflowEngine, and Can components.
 *
 * - Inline workflow actions (Activate/Start/Complete) per row via WorkflowEngine
 * - URL-synced filters and pagination
 * - RBAC-restricted to org_admin, hr_manager
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import { useMemo } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import {
  appraisalCyclesCrudConfig,
  type AppraisalCycle,
} from '@/config/crud/appraisalCycles';
import { appraisalCycleWorkflow } from '@/config/workflows/appraisalCycle';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { WorkflowEngine } from '@/components/WorkflowEngine';
import { Can } from '@/components/Can';
import { AccessDenied } from '@/components/AccessDenied/AccessDenied';
import type { ColumnDef } from '@/types/datatable';

const appraisalCrud = createCrudHooks<AppraisalCycle>({
  queryKey: appraisalCyclesCrudConfig.queryKey,
  endpoints: appraisalCyclesCrudConfig.endpoints,
});

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function useAppraisalColumns(): ColumnDef<AppraisalCycle>[] {
  return useMemo(
    () => [
      { key: 'name', header: 'Cycle Name', sortable: true },
      {
        key: 'start_date',
        header: 'Start Date',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm text-gray-700">{formatDate(value as string)}</span>
        ),
      },
      {
        key: 'end_date',
        header: 'End Date',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm text-gray-700">{formatDate(value as string)}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status & Actions',
        sortable: false,
        render: (_value: unknown, row: AppraisalCycle) => (
          <WorkflowEngine
            config={appraisalCycleWorkflow}
            record={{ ...row, id: row.id, status: row.status }}
            invalidateKeys={[[appraisalCyclesCrudConfig.queryKey, 'list']]}
          />
        ),
      },
    ],
    []
  );
}

export function AppraisalCycles() {
  return (
    <Can
      roles={['org_admin', 'hr_manager']}
      fallback={<AccessDenied />}
    >
      <AppraisalCyclesContent />
    </Can>
  );
}

function AppraisalCyclesContent() {
  const columns = useAppraisalColumns();
  const filters = appraisalCyclesCrudConfig.filters;

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

  const queryResult = appraisalCrud.useList(apiParams);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Appraisal Cycles</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage performance appraisal cycles and their lifecycle.
        </p>
      </div>

      <FilterBar
        filters={filters}
        values={filterValues}
        onChange={setFilter}
        onClearAll={clearFilters}
      />

      <DataTable<AppraisalCycle>
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
