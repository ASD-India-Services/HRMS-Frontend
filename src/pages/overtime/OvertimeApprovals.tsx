/**
 * OvertimeApprovals Page — Manager/Admin interface for reviewing and approving/rejecting
 * overtime slips using DataTable, FilterBar, Pagination, WorkflowEngine, and Can.
 *
 * - Pre-filters to status="pending_approval" by default
 * - Inline workflow actions (Approve/Reject) per row via WorkflowEngine
 * - URL-synced filters and pagination
 * - RBAC-restricted to org_admin, hr_manager, department_head
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudHooks } from '@/hooks/useCrud';
import {
  overtimeSlipsCrudConfig,
  type OvertimeSlip,
} from '@/config/crud/overtimeSlips';
import { overtimeApprovalWorkflow } from '@/config/workflows/overtimeApproval';
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
  { key: 'overtime_type', label: 'Overtime Type', type: 'select', required: true, optionsEndpoint: '/api/v1/overtime-types/', optionsLabelKey: 'name' },
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'hours', label: 'Hours', type: 'number', required: true, placeholder: '2' },
  { key: 'base_hourly_rate', label: 'Hourly Rate', type: 'number', required: true, placeholder: '0.00' },
  { key: 'remarks', label: 'Remarks', type: 'textarea', placeholder: 'Reason for overtime' },
];

const overtimeCrud = createCrudHooks<OvertimeSlip>({
  queryKey: overtimeSlipsCrudConfig.queryKey,
  endpoints: overtimeSlipsCrudConfig.endpoints,
});

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function useOvertimeColumns(): ColumnDef<OvertimeSlip>[] {
  return useMemo(
    () => [
      { key: 'employee_name', header: 'Employee', sortable: true, render: (v: unknown) => (v ? String(v) : '—') },
      {
        key: 'date',
        header: 'Date',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm text-gray-700">{formatDate(value as string)}</span>
        ),
      },
      {
        key: 'hours',
        header: 'Hours',
        sortable: true,
        render: (value: unknown) => (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
            {String(value ?? '—')}h
          </span>
        ),
      },
      {
        key: 'remarks',
        header: 'Remarks',
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
        render: (_value: unknown, row: OvertimeSlip) => (
          <WorkflowEngine
            config={overtimeApprovalWorkflow}
            record={{ ...row, id: row.id, status: row.status }}
            invalidateKeys={[[overtimeSlipsCrudConfig.queryKey, 'list']]}
          />
        ),
      },
    ],
    []
  );
}

export function OvertimeApprovals() {
  return (
    <Can
      permissions={['overtime.view']}
      fallback={<AccessDenied />}
    >
      <OvertimeApprovalsContent />
    </Can>
  );
}

function OvertimeApprovalsContent() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/api/v1/overtime-slips/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-slips'] });
      setShowCreate(false);
    },
  });

  const columns = useOvertimeColumns();
  const filters = overtimeSlipsCrudConfig.filters;

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
    if (filterValues.status) params.status = filterValues.status;
    if (filterValues.search) params.search = filterValues.search;
    return params;
  }, [filterValues, page, pageSize]);

  const queryResult = overtimeCrud.useList(apiParams);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overtime Approvals</h1>
          <p className="mt-1 text-sm text-gray-600">
            Review and approve or reject pending overtime slips.
          </p>
        </div>
        <CreateButton label="Log Overtime" onClick={() => setShowCreate(true)} />
      </div>

      {queryResult.data && (
        <div className="mb-4 flex items-center gap-4">
          <div className="inline-flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-2">
            <span className="text-sm font-medium text-yellow-800">
              {queryResult.data.count} slip{queryResult.data.count !== 1 ? 's' : ''}{' '}
              {filterValues.status === 'pending_approval' || !filterValues.status ? 'pending review' : 'found'}
            </span>
          </div>
        </div>
      )}

      <FilterBar
        filters={filters}
        values={{ ...filterValues, status: filterValues.status || '' }}
        onChange={setFilter}
        onClearAll={clearFilters}
      />

      <DataTable<OvertimeSlip>
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
        title="Log Overtime"
        fields={createFields}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
