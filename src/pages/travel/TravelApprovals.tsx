/**
 * TravelApprovals Page — Manager/Admin interface for reviewing and approving/rejecting
 * travel requests using DataTable, FilterBar, Pagination, WorkflowEngine, and Can.
 *
 * - Pre-filters to status="pending_approval" by default
 * - Inline workflow actions (Approve/Reject) per row via WorkflowEngine
 * - URL-synced filters and pagination
 * - RBAC-restricted to org_admin, hr_manager, department_head
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

import { useMemo } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import {
  travelRequestsCrudConfig,
  type TravelRequest,
} from '@/config/crud/travelRequests';
import { travelApprovalWorkflow } from '@/config/workflows/travelApproval';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { WorkflowEngine } from '@/components/WorkflowEngine';
import { Can } from '@/components/Can';
import { AccessDenied } from '@/components/AccessDenied/AccessDenied';
import type { ColumnDef } from '@/types/datatable';

const travelCrud = createCrudHooks<TravelRequest>({
  queryKey: travelRequestsCrudConfig.queryKey,
  endpoints: travelRequestsCrudConfig.endpoints,
});

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function useTravelColumns(): ColumnDef<TravelRequest>[] {
  return useMemo(
    () => [
      { key: 'employee', header: 'Employee', sortable: true },
      { key: 'destination', header: 'Destination', sortable: true },
      {
        key: 'from_date',
        header: 'From',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm text-gray-700">{formatDate(value as string)}</span>
        ),
      },
      {
        key: 'to_date',
        header: 'To',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm text-gray-700">{formatDate(value as string)}</span>
        ),
      },
      {
        key: 'purpose',
        header: 'Purpose',
        sortable: false,
        render: (value: unknown) => (
          <span className="text-sm text-gray-600 line-clamp-2 max-w-[200px]">
            {value ? String(value) : '—'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status & Actions',
        sortable: false,
        render: (_value: unknown, row: TravelRequest) => (
          <WorkflowEngine
            config={travelApprovalWorkflow}
            record={{ ...row, id: row.id, status: row.status }}
            invalidateKeys={[[travelRequestsCrudConfig.queryKey, 'list']]}
          />
        ),
      },
    ],
    []
  );
}

export function TravelApprovals() {
  return (
    <Can
      roles={['org_admin', 'hr_manager', 'department_head']}
      fallback={<AccessDenied />}
    >
      <TravelApprovalsContent />
    </Can>
  );
}

function TravelApprovalsContent() {
  const columns = useTravelColumns();
  const filters = travelRequestsCrudConfig.filters;

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
    const statusFilter = filterValues.status || 'pending_approval';
    params.status = statusFilter;
    if (filterValues.search) params.search = filterValues.search;
    return params;
  }, [filterValues, page, pageSize]);

  const queryResult = travelCrud.useList(apiParams);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Travel Approvals</h1>
        <p className="mt-1 text-sm text-gray-600">
          Review and approve or reject pending travel requests.
        </p>
      </div>

      {queryResult.data && (
        <div className="mb-4 flex items-center gap-4">
          <div className="inline-flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-2">
            <span className="text-sm font-medium text-yellow-800">
              {queryResult.data.count} request{queryResult.data.count !== 1 ? 's' : ''}{' '}
              {filterValues.status === 'pending_approval' || !filterValues.status ? 'pending review' : 'found'}
            </span>
          </div>
        </div>
      )}

      <FilterBar
        filters={filters}
        values={{ ...filterValues, status: filterValues.status || 'pending_approval' }}
        onChange={setFilter}
        onClearAll={clearFilters}
      />

      <DataTable<TravelRequest>
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
