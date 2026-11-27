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
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
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
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Iconify } from '@/components/Iconify';

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

  // Query client for manual invalidation
  const queryClient = useQueryClient();
  const [isTriggeringAuto, setIsTriggeringAuto] = useState(false);
  const [autoNotification, setAutoNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  /**
   * Handle on-demand trigger of auto-generation rules
   */
  async function handleTriggerAuto() {
    setIsTriggeringAuto(true);
    setAutoNotification(null);
    try {
      const res = await api.post('/api/v1/payroll-entries/auto-generate/', { force: true });
      const data = res.data;
      if (data.status === 'success') {
        setAutoNotification({
          message: data.detail || 'Payroll run auto-generated successfully!',
          type: 'success',
        });
      } else if (data.status === 'already_exists') {
        setAutoNotification({
          message: data.detail || 'Payroll run already exists for this period.',
          type: 'info',
        });
      } else {
        setAutoNotification({
          message: data.detail || 'Auto-payslip trigger finished.',
          type: 'info',
        });
      }
      queryClient.invalidateQueries({ queryKey: [payrollEntriesCrudConfig.queryKey] });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to trigger auto-generation.';
      setAutoNotification({ message: msg, type: 'error' });
    } finally {
      setIsTriggeringAuto(false);
    }
  }

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
    <PageContainer>
      <PageHeader
        title="Payroll Runs"
        subtitle="Create, review, and manage payroll runs. Submit for approval and mark as disbursed."
        actions={
          <Can permissions={['payroll.create']}>
            <Button onClick={() => setShowCreateForm(true)} startIcon={<Iconify icon="plus" />}>
              Create Payroll Run
            </Button>
          </Can>
        }
      />
      {/* Payroll Schedule Info */}
      <div className="mb-6 rounded-card bg-primary-lighter p-4" role="note">
        <div className="flex items-start gap-2">
          <Iconify icon="info" width={20} className="mt-0.5 shrink-0 text-primary-main" />
          <p className="text-sm text-primary-dark">
            Payroll can only be run for the <strong>previous month</strong>. Ensure all attendance, leaves, and deductions are finalized before processing.
          </p>
        </div>
      </div>

      {/* Active Auto-Payslip Generation Rules from Settings */}
      {activeAutoRules.length > 0 && (
        <div className="mb-6 rounded-card bg-success-lighter/80 p-4 border border-success-light">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-success-main animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-success-darker">
                Active Auto-Payslip Schedule (Linked to Settings)
              </span>
              <span className="text-[11px] font-medium text-success-dark bg-success-lighter/70 px-2 py-0.5 rounded">
                Rule Active
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outlined"
                size="small"
                onClick={handleTriggerAuto}
                disabled={isTriggeringAuto}
                className="bg-surface-paper text-success-darker border-success-main/40 hover:bg-success-lighter"
                startIcon={<Iconify icon={isTriggeringAuto ? "eos-icons:loading" : "mdi:lightning-bolt"} />}
              >
                {isTriggeringAuto ? 'Generating...' : 'Trigger Auto-Generation Now'}
              </Button>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {activeAutoRules.map((rule: any) => (
              <span
                key={rule.id}
                className="inline-flex items-center gap-1.5 rounded-md bg-surface-paper px-2.5 py-1 text-xs font-medium text-success-darker shadow-z1"
              >
                <span className="inline-flex items-center gap-1"><Iconify icon="departments" width={14} /> {rule.company}</span>
                <span className="text-ink-disabled">|</span>
                <span className="inline-flex items-center gap-1"><Iconify icon="holidayLists" width={14} /> Auto-generates on {rule.generate_day}</span>
              </span>
            ))}
          </div>
          {autoNotification && (
            <div className={`mt-3 rounded p-2.5 text-xs font-medium flex items-center gap-2 ${
              autoNotification.type === 'success'
                ? 'bg-success-main text-white'
                : autoNotification.type === 'error'
                ? 'bg-error-main text-white'
                : 'bg-primary-main text-white'
            }`}>
              <Iconify icon={autoNotification.type === 'success' ? 'mdi:check-circle' : 'mdi:information'} width={16} />
              <span>{autoNotification.message}</span>
            </div>
          )}
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
          <div className="inline-flex items-center gap-2 rounded-lg bg-primary-lighter px-4 py-2">
            <Iconify icon="payroll" width={20} className="text-primary-main" />
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
              <div className="mb-4 rounded-card bg-error-lighter p-3">
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
    </PageContainer>
  );
}
