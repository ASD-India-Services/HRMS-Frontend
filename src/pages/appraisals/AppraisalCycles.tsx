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

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudHooks } from '@/hooks/useCrud';
import {
  appraisalCyclesCrudConfig,
  type AppraisalCycle,
} from '@/config/crud/appraisalCycles';
import { appraisalCycleWorkflow } from '@/config/workflows/appraisalCycle';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { WorkflowEngine } from '@/components/WorkflowEngine';
import { CreateButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import type { FieldConfig } from '@/components/CrudModal';
import { Can } from '@/components/Can';
import { AccessDenied } from '@/components/AccessDenied/AccessDenied';
import api from '@/lib/api';
import type { ColumnDef } from '@/types/datatable';

const createFields: FieldConfig[] = [
  { key: 'name', label: 'Cycle Name', type: 'text', required: true, placeholder: 'e.g. Q3 2026 Review' },
  { key: 'start_date', label: 'Start Date', type: 'date', required: true },
  { key: 'end_date', label: 'End Date', type: 'date', required: true },
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
  ]},
];

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
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/api/v1/appraisals/cycles/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal-cycles'] });
      setShowCreate(false);
    },
  });

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appraisal Cycles</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage performance appraisal cycles and their lifecycle.
          </p>
        </div>
        <CreateButton label="Create Appraisal Cycle" onClick={() => setShowCreate(true)} />
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

      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Appraisal Cycle"
        fields={createFields}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
