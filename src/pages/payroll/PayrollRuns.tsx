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
import { useHRSettings } from '@/hooks/useHRSettings';
import { formatCurrency } from '@/utils/formatters';
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
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

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
          return <span className="font-medium text-ink-primary">{MONTHS[idx] || String(value)}</span>;
        },
      },
      {
        key: 'year',
        header: 'Year',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm text-ink-primary">{String(value)}</span>
        ),
      },
      {
        key: 'total_employees',
        header: 'Total Employees',
        sortable: true,
        render: (value: unknown) => (
          <span className="inline-flex items-center rounded-full bg-surface-neutral px-2 py-0.5 text-xs font-semibold text-ink-primary">
            {String(value ?? 0)}
          </span>
        ),
      },
      {
        key: 'total_amount',
        header: 'Total Amount',
        sortable: true,
        render: (value: unknown) => (
          <span className="text-sm font-medium text-success-dark">
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
      permissions={['payroll_runs.view']}
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
  const { data: hrSettings } = useHRSettings();

  // Active Auto-payslip generation rules from settings
  const activeAutoRules = useMemo(() => {
    let rules = hrSettings?.auto_payslip_rules;
    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      try {
        const saved = localStorage.getItem('hrms_auto_payslip_rules');
        if (saved) rules = JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return (rules || []).filter((r: any) => r.auto_generate);
  }, [hrSettings]);

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
          <h1 className="text-2xl font-bold text-ink-primary">Payroll Runs</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Create, review, and manage payroll runs. Submit for approval and mark as disbursed.
          </p>
        </div>
        <Can permissions={['payroll.create']}>
          <Button
            type="button"
            onClick={() => setShowCreateForm(true)}
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
          </Button>
        </Can>
      </div>

      {/* Payroll Schedule Info */}
      <div className="mb-6 rounded-md border border-primary-light bg-primary-lighter p-3" role="note">
        <div className="flex items-start gap-2">
          <svg className="h-5 w-5 text-primary-main flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-primary-dark">
            Payroll can only be run for the <strong>previous month</strong>. Ensure all attendance, leaves, and deductions are finalized before processing.
          </p>
        </div>
      </div>

      {/* Active Auto-Payslip Generation Rules from Settings */}
      {activeAutoRules.length > 0 && (
        <div className="mb-6 rounded-lg border border-success-light bg-success-lighter/80 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-success-main animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-success-darker">
                Active Auto-Payslip Schedule (Linked to Settings)
              </span>
            </div>
            <span className="text-[11px] font-medium text-success-dark bg-success-lighter/70 px-2 py-0.5 rounded">
              Rule Active
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {activeAutoRules.map((rule: any) => (
              <span
                key={rule.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-success-light bg-surface-paper px-2.5 py-1 text-xs font-medium text-success-darker shadow-2xs"
              >
                <span>🏢 {rule.company}</span>
                <span className="text-grey-300">|</span>
                <span>📅 Auto-generates on {rule.generate_day}</span>
              </span>
            ))}
          </div>
        </div>
      )}

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
          <div className="inline-flex items-center gap-2 rounded-lg bg-primary-lighter border border-primary-light px-4 py-2">
            <svg
              className="h-5 w-5 text-primary-main"
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
            <span className="text-sm font-medium text-primary-dark">
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
        <Modal open onClose={() => {}} labelledBy="PayrollRuns-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="mx-4 p-6 min-h-0 flex-1 overflow-y-auto">
            <h2 id="PayrollRuns-modal-title-1" className="mb-4 text-lg font-semibold text-ink-primary">Create Payroll Run</h2>
            {createError && (
              <div className="mb-4 rounded-md bg-error-lighter border border-error-light p-3">
                <p className="text-sm text-error-dark">{createError}</p>
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
        </Modal>
      )}
    </div>
  );
}
