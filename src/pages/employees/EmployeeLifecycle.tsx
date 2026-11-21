/**
 * EmployeeLifecycle — Employee Lifecycle Timeline Page
 *
 * Displays the employee's complete lifecycle timeline including promotions,
 * transfers, and status changes. Provides action buttons (guarded by RBAC)
 * to initiate promotions, transfers, and separation processes.
 *
 * Each action opens a modal/dialog with the relevant form fields and
 * uses the appropriate API endpoint for the transition.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { EMPLOYEES, PROMOTIONS, TRANSFERS } from '@/lib/endpoints';
import { WorkflowTimeline } from '@/components/WorkflowEngine/WorkflowTimeline';
import { Can } from '@/components/Can';
import { FormBuilder } from '@/components/FormBuilder';
import type { WorkflowConfig } from '@/types/workflow';
import type { FieldSchema } from '@/types/form';
import type { Employee } from '@/types/employee';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Iconify } from '@/components/Iconify';

// Workflow config for employee lifecycle timeline display
const employeeLifecycleConfig: WorkflowConfig = {
  id: 'employee-lifecycle',
  statuses: [
    { key: 'active', label: 'Active', color: 'green' },
    { key: 'on_notice', label: 'On Notice', color: 'yellow' },
    { key: 'terminated', label: 'Terminated', color: 'red', terminal: true },
    { key: 'retired', label: 'Retired', color: 'gray', terminal: true },
  ],
  transitions: [
    {
      from: 'active',
      to: 'on_notice',
      action: 'Initiate Separation',
      endpoint: (id: string) => `/api/v1/employees/${id}/change-status/`,
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      requiresReason: true,
      formFields: [
        { name: 'notice_period_start', label: 'Notice Period Start', type: 'date', required: true },
      ],
    },
    {
      from: 'on_notice',
      to: 'terminated',
      action: 'Terminate',
      endpoint: (id: string) => `/api/v1/employees/${id}/change-status/`,
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      requiresReason: true,
      formFields: [
        { name: 'date_of_leaving', label: 'Date of Leaving', type: 'date', required: true },
      ],
      confirm: { title: 'Confirm Termination', message: 'Are you sure you want to terminate this employee? This action cannot be undone.' },
      variant: 'destructive',
    },
    {
      from: 'on_notice',
      to: 'retired',
      action: 'Retire',
      endpoint: (id: string) => `/api/v1/employees/${id}/change-status/`,
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      formFields: [
        { name: 'date_of_leaving', label: 'Date of Leaving', type: 'date', required: true },
      ],
    },
  ],
};

// Form fields for Promote action
const promotionFields: FieldSchema[] = [
  {
    name: 'new_designation_id',
    label: 'New Designation',
    type: 'select',
    required: true,
    optionsQuery: { queryKey: ['designations'], endpoint: '/api/v1/designations/' },
  },
  {
    name: 'new_department_id',
    label: 'New Department (optional)',
    type: 'select',
    optionsQuery: { queryKey: ['departments'], endpoint: '/api/v1/departments/' },
  },
  { name: 'effective_date', label: 'Effective Date', type: 'date', required: true },
  { name: 'reason', label: 'Reason', type: 'textarea' },
];

// Form fields for Transfer action
const transferFields: FieldSchema[] = [
  {
    name: 'new_department_id',
    label: 'New Department',
    type: 'select',
    required: true,
    optionsQuery: { queryKey: ['departments'], endpoint: '/api/v1/departments/' },
  },
  {
    name: 'new_designation_id',
    label: 'New Designation (optional)',
    type: 'select',
    optionsQuery: { queryKey: ['designations'], endpoint: '/api/v1/designations/' },
  },
  { name: 'new_reporting_manager_id', label: 'New Reporting Manager', type: 'text' },
  { name: 'effective_date', label: 'Effective Date', type: 'date', required: true },
  { name: 'reason', label: 'Reason', type: 'textarea' },
];

// Form fields for Initiate Separation action
const separationFields: FieldSchema[] = [
  { name: 'notice_period_start', label: 'Notice Period Start', type: 'date', required: true },
  { name: 'reason', label: 'Reason for Separation', type: 'textarea', required: true },
];

type LifecycleAction = 'promote' | 'transfer' | 'separate' | null;

export function EmployeeLifecycle() {
  const { id: employeeId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeAction, setActiveAction] = useState<LifecycleAction>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch employee detail
  const { data: employee, isLoading: isLoadingEmployee } = useQuery<Employee>({
    queryKey: ['employees', 'detail', employeeId],
    queryFn: async () => {
      const response = await api.get<Employee>(EMPLOYEES.DETAIL(employeeId!));
      return response.data;
    },
    enabled: !!employeeId,
  });

  // Promotion mutation
  const promotionMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return api.post(PROMOTIONS.CREATE, { employee_id: employeeId, ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', 'detail', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['workflow-timeline', 'employee-lifecycle', employeeId] });
      setSuccessMessage('Promotion recorded successfully');
      setActiveAction(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return api.post(TRANSFERS.CREATE, { employee_id: employeeId, ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', 'detail', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['workflow-timeline', 'employee-lifecycle', employeeId] });
      setSuccessMessage('Transfer recorded successfully');
      setActiveAction(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  // Change status mutation (separation)
  const statusMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return api.patch(`/api/v1/employees/${employeeId}/change-status/`, {
        status: 'on_notice',
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', 'detail', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['workflow-timeline', 'employee-lifecycle', employeeId] });
      setSuccessMessage('Separation initiated successfully');
      setActiveAction(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  const handleActionSubmit = useCallback(
    async (data: Record<string, unknown>) => {
      switch (activeAction) {
        case 'promote':
          await promotionMutation.mutateAsync(data);
          break;
        case 'transfer':
          await transferMutation.mutateAsync(data);
          break;
        case 'separate':
          await statusMutation.mutateAsync(data);
          break;
      }
    },
    [activeAction, promotionMutation, transferMutation, statusMutation]
  );

  const handleCancel = useCallback(() => {
    setActiveAction(null);
  }, []);

  const getActiveFields = (): FieldSchema[] => {
    switch (activeAction) {
      case 'promote':
        return promotionFields;
      case 'transfer':
        return transferFields;
      case 'separate':
        return separationFields;
      default:
        return [];
    }
  };

  const getActiveTitle = (): string => {
    switch (activeAction) {
      case 'promote':
        return 'Record Promotion';
      case 'transfer':
        return 'Record Transfer';
      case 'separate':
        return 'Initiate Separation';
      default:
        return '';
    }
  };

  const isActionPending =
    promotionMutation.isPending || transferMutation.isPending || statusMutation.isPending;

  if (!employeeId) {
    return (
      <PageContainer maxWidth="lg">
        <p className="text-sm text-error-main">Employee ID is required.</p>
      </PageContainer>
    );
  }

  if (isLoadingEmployee) {
    return (
      <PageContainer maxWidth="lg">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-grey-200" />
          <div className="h-4 w-64 rounded bg-grey-200" />
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-3 w-3 rounded-full bg-grey-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-grey-200" />
                  <div className="h-3 w-48 rounded bg-grey-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  const employeeName = employee
    ? `${(employee as unknown as Record<string, string>).first_name ?? ''} ${(employee as unknown as Record<string, string>).last_name ?? ''}`.trim()
    : 'Employee';

  const employeeStatus = (employee as unknown as Record<string, string>)?.status ?? 'active';
  const isActive = employeeStatus === 'active';
  const isOnNotice = employeeStatus === 'on_notice';

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        title={`Employee Lifecycle — ${employeeName}`}
        subtitle="View the complete lifecycle timeline and manage status transitions."
        actions={
          /* Current status badge */
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              employeeStatus === 'active'
                ? 'bg-success-lighter text-success-dark'
                : employeeStatus === 'on_notice'
                  ? 'bg-warning-lighter text-warning-dark'
                  : employeeStatus === 'terminated'
                    ? 'bg-error-lighter text-error-dark'
                    : 'bg-surface-neutral text-ink-primary'
            }`}
          >
            {employeeStatus.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        }
      />
      {/* Success toast */}
      {successMessage && (
        <div className="mb-4 rounded-card bg-success-lighter p-3" role="status">
          <div className="flex items-center">
            <Iconify icon="success" width={18} className="text-success-main" />
            <p className="ml-2 text-sm font-medium text-success-dark">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Action buttons — guarded by RBAC */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Can permissions={['employees.edit']}>
          {isActive && (
            <>
              <Button
                color="secondary"
                onClick={() => setActiveAction('promote')}
                disabled={isActionPending}
                startIcon={<Iconify icon="trend-up" />}
              >
                Promote
              </Button>
              <Button
                onClick={() => setActiveAction('transfer')}
                disabled={isActionPending}
                startIcon={<Iconify icon="arrow-right" />}
              >
                Transfer
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setActiveAction('separate')}
                disabled={isActionPending}
                startIcon={<Iconify icon="logout" />}
              >
                Initiate Separation
              </Button>
            </>
          )}
          {isOnNotice && (
            <p className="text-sm text-warning-dark">
              Employee is currently on notice period. Use the workflow transitions below to finalize separation.
            </p>
          )}
        </Can>
      </div>

      {/* Action form dialog (inline expansion) */}
      {activeAction && (
        <Card className="mb-8">
          <CardHeader title={getActiveTitle()} className="pb-4" />
          <CardContent className="pt-0">
          <FormBuilder
            fields={getActiveFields()}
            onSubmit={handleActionSubmit}
            onCancel={handleCancel}
            isSubmitting={isActionPending}
          />

          {/* Error messages from mutations */}
          {(promotionMutation.isError || transferMutation.isError || statusMutation.isError) && (
            <div className="mt-4 rounded-card bg-error-lighter p-3" role="alert">
              <p className="text-sm text-error-dark">
                {activeAction === 'promote' && 'Failed to record promotion. Please try again.'}
                {activeAction === 'transfer' && 'Failed to record transfer. Please try again.'}
                {activeAction === 'separate' && 'Failed to initiate separation. Please try again.'}
              </p>
            </div>
          )}
          </CardContent>
        </Card>
      )}
      {/* Lifecycle Timeline */}
      <Card>
        <CardHeader title="Lifecycle Timeline" className="pb-4" />
        <CardContent className="pt-0">
          <WorkflowTimeline
            recordId={employeeId}
            endpoint={EMPLOYEES.PROPERTY_HISTORY}
            config={employeeLifecycleConfig}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
