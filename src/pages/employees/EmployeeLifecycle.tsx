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
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-red-600">Employee ID is required.</p>
      </div>
    );
  }

  if (isLoadingEmployee) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-4 w-64 rounded bg-gray-200" />
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-3 w-3 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-gray-200" />
                  <div className="h-3 w-48 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const employeeName = employee
    ? `${(employee as unknown as Record<string, string>).first_name ?? ''} ${(employee as unknown as Record<string, string>).last_name ?? ''}`.trim()
    : 'Employee';

  const employeeStatus = (employee as unknown as Record<string, string>)?.status ?? 'active';
  const isActive = employeeStatus === 'active';
  const isOnNotice = employeeStatus === 'on_notice';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Employee Lifecycle — {employeeName}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          View the complete lifecycle timeline and manage status transitions.
        </p>
        {/* Current status badge */}
        <div className="mt-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              employeeStatus === 'active'
                ? 'bg-green-100 text-green-800'
                : employeeStatus === 'on_notice'
                  ? 'bg-yellow-100 text-yellow-800'
                  : employeeStatus === 'terminated'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
            }`}
          >
            {employeeStatus.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        </div>
      </div>

      {/* Success toast */}
      {successMessage && (
        <div className="mb-4 rounded-md bg-green-50 p-3" role="status">
          <div className="flex items-center">
            <svg
              className="h-4 w-4 text-green-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
            <p className="ml-2 text-sm font-medium text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Action buttons — guarded by RBAC */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Can roles={['org_admin', 'hr_manager']}>
          {isActive && (
            <>
              <button
                type="button"
                onClick={() => setActiveAction('promote')}
                disabled={isActionPending}
                className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                </svg>
                Promote
              </button>
              <button
                type="button"
                onClick={() => setActiveAction('transfer')}
                disabled={isActionPending}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
                Transfer
              </button>
              <button
                type="button"
                onClick={() => setActiveAction('separate')}
                disabled={isActionPending}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                Initiate Separation
              </button>
            </>
          )}
          {isOnNotice && (
            <p className="text-sm text-yellow-700">
              Employee is currently on notice period. Use the workflow transitions below to finalize separation.
            </p>
          )}
        </Can>
      </div>

      {/* Action form dialog (inline expansion) */}
      {activeAction && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">{getActiveTitle()}</h2>
          <FormBuilder
            fields={getActiveFields()}
            onSubmit={handleActionSubmit}
            onCancel={handleCancel}
            isSubmitting={isActionPending}
          />

          {/* Error messages from mutations */}
          {(promotionMutation.isError || transferMutation.isError || statusMutation.isError) && (
            <div className="mt-4 rounded-md bg-red-50 p-3" role="alert">
              <p className="text-sm text-red-700">
                {activeAction === 'promote' && 'Failed to record promotion. Please try again.'}
                {activeAction === 'transfer' && 'Failed to record transfer. Please try again.'}
                {activeAction === 'separate' && 'Failed to initiate separation. Please try again.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lifecycle Timeline */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Lifecycle Timeline</h2>
        <WorkflowTimeline
          recordId={employeeId}
          endpoint={EMPLOYEES.PROPERTY_HISTORY}
          config={employeeLifecycleConfig}
        />
      </div>
    </div>
  );
}
