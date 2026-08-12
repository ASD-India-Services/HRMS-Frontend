/**
 * PayrollRuns Page — Admin/HR Manager interface for creating, reviewing,
 * and managing payroll runs using the shared DataTable, FilterBar, Pagination,
 * WorkflowEngine, FormBuilder, and Can components.
 *
 * - Uses createCrudHooks with payrollEntriesCrudConfig for data
 * - DataTable with columns for pay_period, department, status, total_employees, total_gross, total_net
 * - FilterBar with status filter and Pagination
 * - Each row shows WorkflowEngine with payrollRunWorkflow config
 * - "Create Payroll Run" button opens a form using FormBuilder
 * - RBAC restricted to org_admin, hr_manager
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import {
  payrollEntriesCrudConfig,
  payrollEntryFormFields,
  type PayrollEntry,
} from '@/config/crud/payrollEntries';
import { payrollRunWorkflow } from '@/config/workflows/payrollRun';
import { DataTable, FilterBar, Pagination, useFilterSync } from '@/components/DataTable';
import { WorkflowEngine } from '@/components/WorkflowEngine';
import { Can } from '@/components/Can';
import { AccessDenied } from '@/components/AccessDenied/AccessDenied';
import { FormBuilder } from '@/components/FormBuilder';
import { BulkActions } from '@/components/BulkActions';
import type { ColumnDef, FilterConfig } from '@/types/datatable';

// Create CRUD hooks from the payroll entries config
const payrollEntriesCrud = createCrudHooks<PayrollEntry>({
  queryKey: payrollEntriesCrudConfig.queryKey,
  endpoints: payrollEntriesCrudConfig.endpoints,
});

// Filters for the payroll runs view
const payrollRunFilters: FilterConfig[] = [
  {
    key: 'search',
    label: 'Search payroll runs...',
    type: 'search',
    debounceMs: 300,
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: '', label: 'All' },
      { value: 'draft', label: 'Draft' },
      { value: 'processing', label: 'Processing' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
];

/**
 * Format a number as currency (INR)
 */
function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Columns for the payroll runs DataTable, including formatted currency
 * and inline workflow actions column.
 */
function usePayrollRunColumns(): ColumnDef<PayrollEntry>[] {
  return useMemo(
    () => [
      {
        key: 'month',
        header: 'Month',
        sortable: true,
        render: (value: unknown) => {
          const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const idx = Number(value) - 1;
          return <span className="font-medium text-gray-900">{MONTHS[idx] || String(value)}</span>;
        },
      },
      {
        key: 'year',
        header: 'Year',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm text-gray-700">{String(value)}</span>
        ),
      },
      {
        key: 'total_employees',
        header: 'Total Employees',
        sortable: true,
        render: (value: unknown) => (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800">
            {String(value ?? 0)}
          </span>
        ),
      },
      {
        key: 'total_amount',
        header: 'Total Amount',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm font-medium text-green-700">
            {formatCurrency(value as number)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status & Actions',
        sortable: false,
        render: (_value: unknown, row: PayrollEntry) => (
          <WorkflowEngine
            config={payrollRunWorkflow}
            record={{ ...row, id: row.id, status: row.status }}
            invalidateKeys={[
              [payrollEntriesCrudConfig.queryKey, 'list'],
            ]}
          />
        ),
      },
    ],
    []
  );
}

/**
 * Main PayrollRuns component wrapped in RBAC check.
 */
export function PayrollRuns() {
  return (
    <Can
      permissions={['payroll.view']}
      fallback={<AccessDenied />}
    >
      <PayrollRunsContent />
    </Can>
  );
}

/**
 * Inner content component with the actual payroll runs table and create form logic.
 */
function PayrollRunsContent() {
  const columns = usePayrollRunColumns();
  const [showCreateForm, setShowCreateForm] = useState(false);

  // URL-synced filters
  const {
    filterValues,
    setFilter,
    clearFilters,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useFilterSync({ filters: payrollRunFilters });

  // Build API params
  const apiParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page,
      page_size: pageSize,
    };

    if (filterValues.status) {
      params.status = filterValues.status;
    }
    if (filterValues.search) {
      params.search = filterValues.search;
    }

    return params;
  }, [filterValues, page, pageSize]);

  // Fetch payroll entries using CRUD hooks
  const queryResult = payrollEntriesCrud.useList(apiParams);

  // Create mutation
  const createMutation = payrollEntriesCrud.useCreate();
  const [createError, setCreateError] = useState<string | null>(null);

  /**
   * Handle payroll run creation form submission
   */
  async function handleCreateSubmit(data: Record<string, unknown>) {
    setCreateError(null);
    try {
      await createMutation.mutateAsync(data);
      setShowCreateForm(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, unknown> } };
      const respData = axiosErr?.response?.data;
      if (respData) {
        // Extract non_field_errors or any general error message
        const nonField = respData.non_field_errors;
        if (Array.isArray(nonField)) {
          setCreateError(nonField.join(' '));
        } else if (typeof respData.detail === 'string') {
          setCreateError(respData.detail);
        } else {
          // Collect all field errors into one message
          const messages = Object.values(respData)
            .flat()
            .filter((v) => typeof v === 'string');
          setCreateError(messages.join(' ') || 'Failed to create payroll run.');
        }
      } else {
        setCreateError('Failed to create payroll run. Please try again.');
      }
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Runs</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create, review, and manage payroll runs. Submit for approval and mark as disbursed.
          </p>
        </div>
        <Can permissions={['payroll.manage']}>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Payroll Run
          </button>
        </Can>
      </div>

      {/* Bulk Export */}
      <BulkActions
        exportEndpoint="/api/v1/salary-slips/export/"
        csvHeaders="employee,pay_period_start,pay_period_end,gross_pay,deductions,net_pay,status"
        exportFilename="salary_slips_export.csv"
        exportPermission="payroll.view"
      />

      {/* Summary badge */}
      {queryResult.data && (
        <div className="mb-4 flex items-center gap-4">
          <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
              />
            </svg>
            <span className="text-sm font-medium text-blue-800">
              {queryResult.data.count} payroll run{queryResult.data.count !== 1 ? 's' : ''}{' '}
              {filterValues.status ? `with status "${filterValues.status}"` : 'total'}
            </span>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar
        filters={payrollRunFilters}
        values={filterValues}
        onChange={setFilter}
        onClearAll={clearFilters}
      />

      {/* Data Table with inline workflow actions */}
      <DataTable<PayrollEntry>
        queryResult={queryResult}
        columns={columns}
      />

      {/* Pagination */}
      {queryResult.data && queryResult.data.count > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={queryResult.data.count}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Create Payroll Run Dialog */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Create Payroll Run</h2>
            {createError && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{createError}</p>
              </div>
            )}
            <FormBuilder
              fields={payrollEntryFormFields}
              onSubmit={handleCreateSubmit}
              onCancel={() => { setShowCreateForm(false); setCreateError(null); }}
              isSubmitting={createMutation.isPending}
              isDialog
            />
          </div>
        </div>
      )}
    </div>
  );
}
