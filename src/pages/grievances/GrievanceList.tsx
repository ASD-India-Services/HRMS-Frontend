/**
 * GrievanceList Page — HR/Admin interface for managing employee grievances
 * using DataTable, FilterBar, Pagination, WorkflowEngine, and Can components.
 *
 * - Inline workflow actions (Assign/Resolve/Close) per row via WorkflowEngine
 * - URL-synced filters and pagination
 * - RBAC-restricted to org_admin, hr_manager
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudHooks } from '@/hooks/useCrud';
import {
  grievancesCrudConfig,
  type Grievance,
} from '@/config/crud/grievances';
import { grievanceWorkflow } from '@/config/workflows/grievance';
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
  { key: 'employee', label: 'Employee', type: 'select', optionsEndpoint: '/api/v1/employees/', optionsLabelKey: 'full_name', required: true },
  { key: 'subject', label: 'Subject', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'textarea', required: true },
  { key: 'grievance_type', label: 'Grievance Type', type: 'select', required: true, optionsEndpoint: '/api/v1/grievance-types/', optionsLabelKey: 'name' },
];

const grievanceCrud = createCrudHooks<Grievance>({
  queryKey: grievancesCrudConfig.queryKey,
  endpoints: grievancesCrudConfig.endpoints,
});

function useGrievanceColumns(): ColumnDef<Grievance>[] {
  return useMemo(
    () => [
      { key: 'employee_name', header: 'Employee', sortable: true, render: (v: unknown) => (v ? String(v) : '—') },
      { key: 'grievance_type_name', header: 'Type', sortable: true, render: (v: unknown) => (v ? String(v) : '—') },
      {
        key: 'status',
        header: 'Status & Actions',
        sortable: false,
        render: (_value: unknown, row: Grievance) => (
          <WorkflowEngine
            config={grievanceWorkflow}
            record={{ ...row, id: row.id, status: row.status }}
            invalidateKeys={[[grievancesCrudConfig.queryKey, 'list']]}
          />
        ),
      },
    ],
    []
  );
}

export function GrievanceList() {
  return (
    <Can
      permissions={['grievances.view']}
      fallback={<AccessDenied />}
    >
      <GrievanceListContent />
    </Can>
  );
}

function GrievanceListContent() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/api/v1/grievances/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grievances'] });
      setShowCreate(false);
    },
  });

  const columns = useGrievanceColumns();
  const filters = grievancesCrudConfig.filters;

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

  const queryResult = grievanceCrud.useList(apiParams);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grievances</h1>
          <p className="mt-1 text-sm text-gray-600">
            Review and manage employee grievances through investigation and resolution.
          </p>
        </div>
        <CreateButton label="File Grievance" onClick={() => setShowCreate(true)} />
      </div>

      {queryResult.data && (
        <div className="mb-4 flex items-center gap-4">
          <div className="inline-flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-2">
            <span className="text-sm font-medium text-yellow-800">
              {queryResult.data.count} grievance{queryResult.data.count !== 1 ? 's' : ''} found
            </span>
          </div>
        </div>
      )}

      <FilterBar
        filters={filters}
        values={filterValues}
        onChange={setFilter}
        onClearAll={clearFilters}
      />

      <DataTable<Grievance>
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
        title="File Grievance"
        fields={createFields}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
