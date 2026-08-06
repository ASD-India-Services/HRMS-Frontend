/**
 * SettlementWorkflow Page — Admin interface for managing full & final settlements
 * using DataTable, FilterBar, Pagination, WorkflowEngine, and Can components.
 *
 * - Inline workflow actions (Submit/Approve/Reject) per row via WorkflowEngine
 * - URL-synced filters and pagination
 * - RBAC-restricted to org_admin, hr_manager
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudHooks } from '@/hooks/useCrud';
import { SETTLEMENT } from '@/lib/endpoints';
import { settlementWorkflow } from '@/config/workflows/settlement';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { WorkflowEngine } from '@/components/WorkflowEngine';
import { CreateButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import type { FieldConfig } from '@/components/CrudModal';
import { Can } from '@/components/Can';
import { AccessDenied } from '@/components/AccessDenied/AccessDenied';
import api from '@/lib/api';
import type { ColumnDef, FilterConfig } from '@/types/datatable';
import type { CrudEndpoints } from '@/hooks/useCrud';

const createFields: FieldConfig[] = [
  { key: 'employee', label: 'Employee', type: 'select', optionsEndpoint: '/api/v1/employees/', optionsLabelKey: 'full_name', required: true },
  { key: 'last_working_date', label: 'Last Working Date', type: 'date', required: true },
  { key: 'reason', label: 'Reason', type: 'select', options: [
    { value: 'resignation', label: 'Resignation' },
    { value: 'termination', label: 'Termination' },
    { value: 'retirement', label: 'Retirement' },
    { value: 'end_of_contract', label: 'End of Contract' },
  ]},
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export interface Settlement {
  id: string;
  employee: string;
  status: string;
  total_amount: number;
  separation_date: string;
  created_at: string;
  updated_at: string;
}

const settlementEndpoints: CrudEndpoints = {
  list: '/api/v1/full-final-settlement/',
  create: '/api/v1/full-final-settlement/',
  detail: SETTLEMENT.DETAIL,
  update: SETTLEMENT.DETAIL,
  delete: SETTLEMENT.DETAIL,
};

const settlementCrud = createCrudHooks<Settlement>({
  queryKey: 'settlements',
  endpoints: settlementEndpoints,
});

const settlementFilters: FilterConfig[] = [
  { key: 'search', label: 'Search employee...', type: 'search', debounceMs: 300 },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'draft', label: 'Draft' },
      { value: 'pending_approval', label: 'Pending Approval' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
    ],
  },
];

function formatCurrency(amount: number): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function useSettlementColumns(): ColumnDef<Settlement>[] {
  return useMemo(
    () => [
      { key: 'employee', header: 'Employee', sortable: true },
      {
        key: 'total_amount',
        header: 'Total Amount',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm font-medium text-gray-900">
            {formatCurrency(value as number)}
          </span>
        ),
      },
      {
        key: 'separation_date',
        header: 'Separation Date',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm text-gray-700">
            {value
              ? new Date(value as string).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status & Actions',
        sortable: false,
        render: (_value: unknown, row: Settlement) => (
          <WorkflowEngine
            config={settlementWorkflow}
            record={{ ...row, id: row.id, status: row.status }}
            invalidateKeys={[['settlements', 'list']]}
          />
        ),
      },
    ],
    []
  );
}

export function SettlementWorkflow() {
  return (
    <Can
      roles={['org_admin', 'hr_manager']}
      fallback={<AccessDenied />}
    >
      <SettlementWorkflowContent />
    </Can>
  );
}

function SettlementWorkflowContent() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/api/v1/settlements/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      setShowCreate(false);
    },
  });

  const columns = useSettlementColumns();

  const {
    filterValues,
    setFilter,
    clearFilters,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useFilterSync({ filters: settlementFilters });

  const apiParams = useMemo(() => {
    const params: Record<string, string | number> = { page, page_size: pageSize };
    if (filterValues.search) params.search = filterValues.search;
    if (filterValues.status) params.status = filterValues.status;
    return params;
  }, [filterValues, page, pageSize]);

  const queryResult = settlementCrud.useList(apiParams);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Full & Final Settlements</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage employee exit settlements — submit, approve, or reject final payouts.
          </p>
        </div>
        <CreateButton label="Create Settlement" onClick={() => setShowCreate(true)} />
      </div>

      <FilterBar
        filters={settlementFilters}
        values={filterValues}
        onChange={setFilter}
        onClearAll={clearFilters}
      />

      <DataTable<Settlement>
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
        title="Create Settlement"
        fields={createFields}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
