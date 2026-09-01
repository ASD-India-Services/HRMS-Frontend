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
    { key: 'completed', label: 'Completed', color: 'blue' },
    { key: 'submitted', label: 'Submitted', color: 'yellow' },
    { key: 'disbursed', label: 'Disbursed', color: 'green' },
    { key: 'cancelled', label: 'Cancelled', color: 'gray' },
  ],
  transitions: [
    {
      from: 'draft',
      to: 'submitted',
      action: 'Submit for Approval',
      endpoint: (id) => `/api/v1/payroll-entries/${id}/`,
      method: 'PATCH',
      allowedRoles: [],
      requiredPermission: 'payroll.submit',
      variant: 'primary',
      confirm: {
        title: 'Submit Payroll',
        message:
          'Submit this payroll run for disbursement? Salary slips will be finalized.',
      },
    },
    {
      from: 'completed',
      to: 'submitted',
      action: 'Submit for Approval',
      endpoint: (id) => `/api/v1/payroll-entries/${id}/`,
      method: 'PATCH',
      allowedRoles: [],
      requiredPermission: 'payroll.submit',
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
      allowedRoles: [],
      requiredPermission: 'payroll.disburse',
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
      action: 'Delete',
      endpoint: (id) => `/api/v1/payroll-entries/${id}/`,
      method: 'DELETE',
      allowedRoles: [],
      requiredPermission: 'payroll.delete',
      variant: 'destructive',
      confirm: {
        title: 'Delete Payroll Run',
        message: 'This will permanently delete this payroll run and all associated salary slips. This cannot be undone.',
      },
    },
    {
      from: 'completed',
      to: 'cancelled',
      action: 'Delete',
      endpoint: (id) => `/api/v1/payroll-entries/${id}/`,
      method: 'DELETE',
      allowedRoles: [],
      requiredPermission: 'payroll.delete',
      variant: 'destructive',
      confirm: {
        title: 'Delete Payroll Run',
        message: 'This will permanently delete this payroll run and all associated salary slips. This cannot be undone.',
      },
    },
    {
      from: 'submitted',
      to: 'cancelled',
      action: 'Reject & Delete',
      endpoint: (id) => `/api/v1/payroll-entries/${id}/`,
      method: 'DELETE',
      allowedRoles: [],
      requiredPermission: 'payroll.delete',
      variant: 'destructive',
      confirm: {
        title: 'Reject Payroll Run',
        message: 'This will permanently delete this payroll run and all salary slips. Use this if the payroll has errors and needs to be re-done from scratch.',
      },
    },
    {
      from: 'disbursed',
      to: 'cancelled',
      action: 'Delete & Re-run',
      endpoint: (id) => `/api/v1/payroll-entries/${id}/`,
      method: 'DELETE',
      allowedRoles: [],
      requiredPermission: 'payroll.delete',
      variant: 'destructive',
      confirm: {
        title: 'Delete Disbursed Payroll Run',
        message: 'This will permanently delete this payroll run and all salary slips for this period. You can then create a new payroll run for the same month. This cannot be undone.',
      },
    },
  ],
  terminalMessage: {},
};
