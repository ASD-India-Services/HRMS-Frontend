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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCrudHooks } from '@/hooks/useCrud';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Iconify } from '@/components/Iconify';
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
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import api from '@/lib/api';
import type { ColumnDef } from '@/types/datatable';
import { formatDate } from '@/utils/formatters';

const createFields: FieldConfig[] = [
  { key: 'employee', label: 'Employee', type: 'select', optionsEndpoint: '/api/v1/employees/', optionsLabelKey: 'full_name', required: true },
  { key: 'overtime_type', label: 'Overtime Type', type: 'select', required: true, optionsEndpoint: '/api/v1/overtime-types/', optionsLabelKey: 'name' },
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'hours', label: 'Hours', type: 'number', required: true, placeholder: '2' },
  { key: 'remarks', label: 'Remarks', type: 'textarea', placeholder: 'Reason for overtime' },
];

const overtimeCrud = createCrudHooks<OvertimeSlip>({
  queryKey: overtimeSlipsCrudConfig.queryKey,
  endpoints: overtimeSlipsCrudConfig.endpoints,
});


function useOvertimeColumns(): ColumnDef<OvertimeSlip>[] {
  return useMemo(
    () => [
      { key: 'employee_name', header: 'Employee', sortable: true, render: (v: unknown) => (v ? String(v) : '—') },
      {
        key: 'date',
        header: 'Date',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm text-ink-primary">{formatDate(value as string)}</span>
        ),
      },
      {
        key: 'hours',
        header: 'Hours',
        sortable: true,
        render: (value: unknown) => (
          <span className="inline-flex items-center rounded-full bg-primary-lighter px-2 py-0.5 text-xs font-semibold text-primary-dark">
            {String(value ?? '—')}h
          </span>
        ),
      },
      {
        key: 'remarks',
        header: 'Remarks',
        sortable: false,
        render: (value: unknown) => (
          <span className="text-sm text-ink-secondary line-clamp-2 max-w-[200px]">
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
  const { hasPermission } = useHrmsPermissionsContext();
  const canApprove = hasPermission('overtime.approve');
  const isApproverOrAdmin = canApprove;
  const [viewTab, setViewTab] = useState<'mine' | 'approvals'>(isApproverOrAdmin ? 'approvals' : 'mine');

  const { data: currentEmployee } = useQuery({
    queryKey: ['employee', 'me'],
    queryFn: async () => {
      const response = await api.get<{ id: number; full_name?: string }>('/api/v1/employees/me/');
      return response.data;
    },
  });

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
    if (isApproverOrAdmin) {
      if (viewTab === 'mine') params.mine = 'true';
      else if (viewTab === 'approvals') params.approvals = 'true';
    } else {
      params.mine = 'true';
    }
    if (filterValues.status) params.status = filterValues.status;
    if (filterValues.search) params.search = filterValues.search;
    return params;
  }, [filterValues, page, pageSize, viewTab, isApproverOrAdmin]);

  const queryResult = overtimeCrud.useList(apiParams);
  const pendingQueryParams = isApproverOrAdmin && viewTab === 'approvals'
    ? { status: 'submitted', approvals: 'true', page_size: 1 }
    : { status: 'submitted', page_size: 1 };
  const pendingQueryResult = overtimeCrud.useList(pendingQueryParams);
  const pendingCount = pendingQueryResult.data?.count ?? 0;

  return (
    <PageContainer>
      <PageHeader
        title="Overtime Approvals"
        subtitle="Review and approve or reject pending overtime slips."
        actions={<CreateButton permission="overtime.create" label="Log Overtime" onClick={() => setShowCreate(true)} />}
      />
      {isApproverOrAdmin && (
        <Tabs
          items={[
            { value: 'mine', label: 'My Slips' },
            { value: 'approvals', label: 'Team Approvals' },
          ]}
          value={viewTab}
          onChange={(tab) => { setViewTab(tab); setPage(1); }}
        />
      )}
      {queryResult.data && (
        <div className="mb-4 flex items-center gap-4">
          {(() => {
            if (filterValues.status) {
              if (filterValues.status === 'submitted' || filterValues.status === 'pending' || filterValues.status === 'pending_approval') {
                if (queryResult.data.count > 0) {
                  return (
                    <div className="inline-flex items-center gap-2 rounded-lg bg-warning-lighter px-4 py-2">
                      <span className="text-sm font-medium text-warning-dark">
                        {queryResult.data.count} slip{queryResult.data.count !== 1 ? 's' : ''} pending review
                      </span>
                    </div>
                  );
                }
                return (
                  <div className="inline-flex items-center gap-2 rounded-lg bg-success-lighter px-4 py-2">
                    <span className="text-sm font-medium text-success-dark">
                      No overtime slips pending review
                    </span>
                  </div>
                );
              }

              if (filterValues.status === 'approved') {
                return (
                  <div className="inline-flex items-center gap-2 rounded-lg bg-success-lighter px-4 py-2">
                    <span className="text-sm font-medium text-success-dark">
                      {queryResult.data.count} slip{queryResult.data.count !== 1 ? 's' : ''} approved
                    </span>
                  </div>
                );
              }

              if (filterValues.status === 'rejected') {
                return (
                  <div className="inline-flex items-center gap-2 rounded-lg bg-error-lighter px-4 py-2">
                    <span className="text-sm font-medium text-error-dark">
                      {queryResult.data.count} slip{queryResult.data.count !== 1 ? 's' : ''} rejected
                    </span>
                  </div>
                );
              }

              return (
                <div className="inline-flex items-center gap-2 rounded-lg bg-surface-neutral px-4 py-2">
                  <span className="text-sm font-medium text-ink-primary">
                    {queryResult.data.count} slip{queryResult.data.count !== 1 ? 's' : ''} found
                  </span>
                </div>
              );
            }

            // All slips view (no status filter)
            if (pendingCount > 0) {
              return (
                <div className="inline-flex items-center gap-2 rounded-lg bg-warning-lighter px-4 py-2">
                  <span className="text-sm font-medium text-warning-dark">
                    {pendingCount} slip{pendingCount !== 1 ? 's' : ''} pending review
                  </span>
                  <span className="text-xs text-warning-main">({queryResult.data.count} total)</span>
                </div>
              );
            }

            return (
              <div className="inline-flex items-center gap-2 rounded-lg bg-success-lighter px-4 py-2">
                <Iconify icon="check" width={16} className="text-success-main" />
                <span className="text-sm font-medium text-success-dark">
                  No overtime slips pending review
                </span>
                {queryResult.data.count > 0 && (
                  <span className="text-xs text-success-dark">({queryResult.data.count} total slips, all reviewed)</span>
                )}
              </div>
            );
          })()}
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
    </PageContainer>
  );
}
