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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import api from '@/lib/api';
import type { ColumnDef } from '@/types/datatable';

const adminCreateFields: FieldConfig[] = [
  { key: 'employee', label: 'Employee', type: 'select', optionsEndpoint: '/api/v1/employees/', optionsLabelKey: 'full_name', required: true },
  { key: 'grievance_type', label: 'Grievance Type', type: 'select', required: true, optionsEndpoint: '/api/v1/grievance-types/', optionsLabelKey: 'name' },
  { key: 'subject', label: 'Subject', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'textarea', required: true },
];

const employeeCreateFields: FieldConfig[] = [
  { key: 'grievance_type', label: 'Grievance Type', type: 'select', required: true, optionsEndpoint: '/api/v1/grievance-types/', optionsLabelKey: 'name' },
  { key: 'subject', label: 'Subject', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'textarea', required: true },
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
        key: 'subject',
        header: 'Subject',
        sortable: true,
        render: (value: unknown) => (
          <span className="font-medium text-gray-900">{value ? String(value) : '—'}</span>
        ),
      },
      {
        key: 'description',
        header: 'Description',
        sortable: false,
        render: (value: unknown) => (
          <span className="text-sm text-gray-600 line-clamp-2 max-w-[250px]">
            {value ? String(value) : '—'}
          </span>
        ),
      },
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
      permissions={['grievances.view', 'grievances.create']}
      requireAll={false}
      fallback={<AccessDenied />}
    >
      <GrievanceListContent />
    </Can>
  );
}

function GrievanceListContent() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const { hasPermission } = useHrmsPermissionsContext();
  const canManage = hasPermission('grievances.edit') || hasPermission('grievances.approve') || hasPermission('grievances.reject');
  const [viewTab, setViewTab] = useState<'mine' | 'all'>(canManage ? 'all' : 'mine');

  const { data: summary } = useQuery<{
    total: number;
    open: number;
    investigating: number;
    resolved: number;
    closed: number;
    pending: number;
  }>({
    queryKey: ['grievances', 'summary', viewTab],
    queryFn: async () => {
      const response = await api.get('/api/v1/grievances/summary/', {
        params: viewTab === 'mine' ? { mine: 'true' } : {},
      });
      return response.data;
    },
  });

  const { data: currentEmployee } = useQuery({
    queryKey: ['employee', 'me'],
    queryFn: async () => {
      const response = await api.get<{ id: number; full_name?: string }>('/api/v1/employees/me/');
      return response.data;
    },
  });

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
    if (viewTab === 'mine') {
      params.mine = 'true';
    }
    if (filterValues.search) params.search = filterValues.search;
    if (filterValues.status) params.status = filterValues.status;
    return params;
  }, [filterValues, page, pageSize, viewTab]);

  const queryResult = grievanceCrud.useList(apiParams);

  const activeFields = canManage ? adminCreateFields : employeeCreateFields;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grievances</h1>
          <p className="mt-1 text-sm text-gray-600">
            Submit, track, and manage workplace issues and grievances through investigation and resolution.
          </p>
        </div>
        <CreateButton permission="grievances.create" label="File Grievance" onClick={() => setShowCreate(true)} />
      </div>

      {canManage && (
        <div className="mb-4 border-b border-gray-200" role="tablist">
          <nav className="-mb-px flex gap-4">
            <button
              type="button"
              role="tab"
              aria-selected={viewTab === 'mine'}
              onClick={() => { setViewTab('mine'); setPage(1); }}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                viewTab === 'mine'
                  ? 'border-primary-500 text-primary-600 font-semibold'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              My Grievances
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewTab === 'all'}
              onClick={() => { setViewTab('all'); setPage(1); }}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                viewTab === 'all'
                  ? 'border-primary-500 text-primary-600 font-semibold'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              All Grievances
            </button>
          </nav>
        </div>
      )}

      {/* KPI Summary Cards */}
      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => { setFilter('status', ''); setPage(1); }}
            className={`flex flex-col rounded-xl border p-4 text-left transition-all ${
              !filterValues.status
                ? 'border-primary-500 bg-primary-50/40 ring-1 ring-primary-500 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <span className="text-xs font-medium text-gray-500">Total Grievances</span>
            <span className="mt-1 text-2xl font-bold text-gray-900">{summary.total}</span>
          </button>

          <button
            type="button"
            onClick={() => { setFilter('status', 'open'); setPage(1); }}
            className={`flex flex-col rounded-xl border p-4 text-left transition-all ${
              filterValues.status === 'open'
                ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <span className="text-xs font-medium text-amber-700">Open</span>
            <span className="mt-1 text-2xl font-bold text-amber-900">{summary.open}</span>
          </button>

          <button
            type="button"
            onClick={() => { setFilter('status', 'investigating'); setPage(1); }}
            className={`flex flex-col rounded-xl border p-4 text-left transition-all ${
              filterValues.status === 'investigating'
                ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <span className="text-xs font-medium text-blue-700">Investigating</span>
            <span className="mt-1 text-2xl font-bold text-blue-900">{summary.investigating}</span>
          </button>

          <button
            type="button"
            onClick={() => { setFilter('status', 'resolved'); setPage(1); }}
            className={`flex flex-col rounded-xl border p-4 text-left transition-all ${
              filterValues.status === 'resolved'
                ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <span className="text-xs font-medium text-emerald-700">Resolved</span>
            <span className="mt-1 text-2xl font-bold text-emerald-900">{summary.resolved}</span>
          </button>
        </div>
      )}

      {/* Dynamic Status Indicator */}
      {queryResult.data && (
        <div className="mb-4 flex items-center gap-4">
          {(() => {
            const currentStatus = filterValues.status;
            if (currentStatus === 'resolved') {
              return (
                <div className="inline-flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2">
                  <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">
                    {queryResult.data.count} grievance{queryResult.data.count !== 1 ? 's' : ''} resolved
                  </span>
                </div>
              );
            }
            if (currentStatus === 'closed') {
              return (
                <div className="inline-flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-4 py-2">
                  <span className="text-sm font-medium text-gray-800">
                    {queryResult.data.count} grievance{queryResult.data.count !== 1 ? 's' : ''} closed
                  </span>
                </div>
              );
            }
            if (currentStatus === 'investigating') {
              return (
                <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2">
                  <span className="text-sm font-medium text-blue-800">
                    {queryResult.data.count} grievance{queryResult.data.count !== 1 ? 's' : ''} under investigation
                  </span>
                </div>
              );
            }
            if (currentStatus === 'open') {
              return (
                <div className="inline-flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-2">
                  <span className="text-sm font-medium text-yellow-800">
                    {queryResult.data.count} open grievance{queryResult.data.count !== 1 ? 's' : ''} pending review
                  </span>
                </div>
              );
            }

            // No status filter applied:
            const pendingCount = summary?.pending ?? 0;
            if (pendingCount > 0) {
              return (
                <div className="inline-flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-2">
                  <span className="text-sm font-medium text-yellow-800">
                    {pendingCount} grievance{pendingCount !== 1 ? 's' : ''} pending review
                  </span>
                  <span className="text-xs text-yellow-600">({queryResult.data.count} total)</span>
                </div>
              );
            }

            if (queryResult.data.count > 0) {
              return (
                <div className="inline-flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2">
                  <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">
                    All grievances resolved ({queryResult.data.count} total)
                  </span>
                </div>
              );
            }

            return null;
          })()}
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
        fields={activeFields}
        initialValues={currentEmployee?.id ? { employee: currentEmployee.id } : undefined}
        onSubmit={(data) => {
          const payload = { ...data };
          if (!payload.employee && currentEmployee?.id) {
            payload.employee = currentEmployee.id;
          }
          createMutation.mutate(payload);
        }}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
