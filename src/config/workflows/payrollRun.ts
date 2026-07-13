/**
 * Payroll Run Workflow Configuration
 *
 * Defines the state machine for payroll run processing including
 * statuses, transitions, role-based access, and confirmation dialogs.
 *
 * Requirements: 9.2, 9.4
 */

import type { WorkflowConfig } from '@/types/workflow';

export const payrollRunWorkflow: WorkflowConfig = {
  id: 'payroll-run',
  statuses: [
    { key: 'draft', label: 'Draft', color: 'gray' },
    { key: 'submitted', label: 'Submitted', color: 'yellow' },
    { key: 'disbursed', label: 'Disbursed', color: 'green', terminal: true },
    { key: 'cancelled', label: 'Cancelled', color: 'red', terminal: true },
  ],
  transitions: [
    {
      from: 'draft',
      to: 'submitted',
      action: 'Submit for Approval',
      endpoint: (id) => `/api/v1/payroll-entries/${id}/`,
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'primary',
      confirm: {
        title: 'Submit Payroll',
        message:
          'Submit this payroll run for disbursement? Salary slips will be finalized.',
      },
    },
    {
      from: 'submitted',
      to: 'disbursed',
      action: 'Mark as Disbursed',
      endpoint: (id) => `/api/v1/payroll-entries/${id}/`,
      method: 'PATCH',
      allowedRoles: ['org_admin'],
      variant: 'primary',
      confirm: {
        title: 'Disburse Payroll',
        message:
          'Confirm that all salaries have been disbursed for this payroll run.',
      },
    },
    {
      from: 'draft',
      to: 'cancelled',
      action: 'Cancel',
      endpoint: (id) => `/api/v1/payroll-entries/${id}/`,
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      requiresReason: true,
      variant: 'destructive',
    },
    {
      from: 'submitted',
      to: 'cancelled',
      action: 'Cancel',
      endpoint: (id) => `/api/v1/payroll-entries/${id}/`,
      method: 'PATCH',
      allowedRoles: ['org_admin'],
      requiresReason: true,
      variant: 'destructive',
    },
  ],
};
