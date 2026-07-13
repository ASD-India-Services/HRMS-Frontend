/**
 * ExpenseApprovals Page
 *
 * Manager/admin interface for reviewing and approving/rejecting pending expense claims.
 * Uses DataTable with FilterBar and Pagination (URL-synced), WorkflowEngine for
 * approve/reject transitions, and Can component for RBAC gating.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { useState, useCallback } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { expenseClaimsCrudConfig } from '@/config/crud/expenseClaims';
import { expenseApprovalWorkflow } from '@/config/workflows/expenseApproval';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { WorkflowEngine } from '@/components/WorkflowEngine/WorkflowEngine';
import { Can } from '@/components/Can';
import type { ColumnDef } from '@/types/datatable';

/** Expense claim record shape for the approvals view */
interface ExpenseClaimRecord {
  id: string;
  employee_name: string;
  title: string;
  expense_type: string;
  total_amount: number;
  expense_date: string;
  status: string;
  description?: string;
  department?: string;
}

// Create CRUD hooks from the expense claims config
const expenseClaimsCrud = createCrudHooks<ExpenseClaimRecord>({
  queryKey: expenseClaimsCrudConfig.queryKey,
  endpoints: {
    list: expenseClaimsCrudConfig.endpoints.list,
    create: expenseClaimsCrudConfig.endpoints.create,
    detail: expenseClaimsCrudConfig.endpoints.detail,
    update: expenseClaimsCrudConfig.endpoints.update,
    delete: expenseClaimsCrudConfig.endpoints.delete,
  },
});

/** Approval-specific filters — default to pending status */
const approvalFilters = expenseClaimsCrudConfig.filters;

/** Approval-specific columns with formatted amount and date */
const approvalColumns: ColumnDef<ExpenseClaimRecord>[] = [
  { key: 'employee_name', header: 'Employee', sortable: true },
  { key: 'title', header: 'Title', sortable: true },
  { key: 'expense_type', header: 'Expense Type', sortable: true },
  {
    key: 'total_amount',
    header: 'Amount',
    sortable: true,
    render: (value) => {
      const amount = Number(value);
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(amount);
    },
  },
  {
    key: 'expense_date',
    header: 'Date',
    sortable: true,
    render: (value) => {
      if (!value) return '—';
      return new Date(String(value)).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    },
  },
  { key: 'status', header: 'Status', sortable: true },
];

export function ExpenseApprovals() {
  // URL-synced filter/pagination state
  const {
    filterValues,
    setFilter,
    clearFilters,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useFilterSync({ filters: approvalFilters });

  // Build query params — default to pending status for approvals view
  const queryParams: Record<string, string | number> = {
    page,
    page_size: pageSize,
    status: filterValues.status || 'pending',
    ...Object.fromEntries(
      Object.entries(filterValues).filter(([key, val]) => val && key !== 'status')
    ),
  };

  // Fetch expense claims with filters
  const queryResult = expenseClaimsCrud.useList(queryParams);

  // Expanded row state for inline workflow actions
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Handle row click — expand/collapse detail with workflow actions
  const handleRowClick = useCallback(
    (row: ExpenseClaimRecord) => {
      setExpandedRowId((prev) => (prev === row.id ? null : row.id));
    },
    []
  );

  // Override filter onChange to keep status filter in sync
  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      setFilter(key, value);
    },
    [setFilter]
  );

  return (
    <Can
      roles={['org_admin', 'hr_manager', 'department_head']}
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
            <h2 className="text-lg font-semibold text-red-800">Access Denied</h2>
            <p className="mt-2 text-sm text-red-600">
              You do not have permission to view expense approvals.
            </p>
          </div>
        </div>
      }
    >
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Expense Approvals</h1>
          <p className="mt-1 text-sm text-gray-600">
            Review and approve or reject pending expense claims
          </p>
        </div>

        {/* Filter bar */}
        <FilterBar
          filters={approvalFilters}
          values={{ ...filterValues, status: filterValues.status || 'pending' }}
          onChange={handleFilterChange}
          onClearAll={clearFilters}
        />

        {/* Data table */}
        <DataTable<ExpenseClaimRecord>
          queryResult={queryResult}
          columns={approvalColumns}
          onRowClick={handleRowClick}
        />

        {/* Expanded row detail with WorkflowEngine */}
        {expandedRowId && queryResult.data?.results && (
          <ExpandedClaimDetail
            claimId={expandedRowId}
            claims={queryResult.data.results}
            onCollapse={() => setExpandedRowId(null)}
          />
        )}

        {/* Pagination */}
        {queryResult.data && (
          <Pagination
            page={page}
            pageSize={pageSize}
            totalCount={queryResult.data.count}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>
    </Can>
  );
}

/** Expanded claim detail panel with WorkflowEngine for approve/reject */
interface ExpandedClaimDetailProps {
  claimId: string;
  claims: ExpenseClaimRecord[];
  onCollapse: () => void;
}

function ExpandedClaimDetail({ claimId, claims, onCollapse }: ExpandedClaimDetailProps) {
  const claim = claims.find((c) => c.id === claimId);
  if (!claim) return null;

  const amount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(claim.total_amount));

  const formattedDate = new Date(claim.expense_date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50/30 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {claim.title}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            <span className="font-medium">{claim.employee_name}</span>
            {claim.department && (
              <span className="text-gray-500"> · {claim.department}</span>
            )}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-700">
            <span>
              <span className="font-medium">Type:</span> {claim.expense_type}
            </span>
            <span>
              <span className="font-medium">Amount:</span> {amount}
            </span>
            <span>
              <span className="font-medium">Date:</span> {formattedDate}
            </span>
          </div>
          {claim.description && (
            <p className="mt-2 text-sm text-gray-500">{claim.description}</p>
          )}
        </div>
        <button
          onClick={onCollapse}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
          aria-label="Close detail panel"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Workflow actions */}
      <div className="mt-4 border-t border-indigo-100 pt-4">
        <WorkflowEngine<ExpenseClaimRecord>
          config={expenseApprovalWorkflow}
          record={claim}
          invalidateKeys={[
            [expenseClaimsCrudConfig.queryKey, 'list'],
          ]}
        />
      </div>
    </div>
  );
}
