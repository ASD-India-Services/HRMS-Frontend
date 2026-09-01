/**
 * Full & Final Settlement Workflow Configuration
 *
 * Defines the state machine for employee settlement processing:
 * draft → pending_approval → approved → paid.
 *
 * Requirements: 19.1, 19.3, 19.4
 */

import type { WorkflowConfig } from '@/types/workflow';

export const settlementWorkflow: WorkflowConfig = {
  id: 'settlement',
  statuses: [
    { key: 'draft', label: 'Draft', color: 'gray' },
    { key: 'pending_approval', label: 'Pending Approval', color: 'yellow' },
    { key: 'approved', label: 'Approved', color: 'green' },
    { key: 'paid', label: 'Paid', color: 'blue', terminal: true },
  ],
  transitions: [
    {
      from: 'draft',
      to: 'pending_approval',
      action: 'Submit for Approval',
      endpoint: (id) => `/api/v1/full-final-settlement/${id}/submit/`,
      method: 'POST',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'primary',
      confirm: {
        title: 'Submit Settlement',
        message: 'Submit this settlement for approval? Ensure all amounts are verified.',
      },
    },
    {
      from: 'pending_approval',
      to: 'approved',
      action: 'Approve',
      endpoint: (id) => `/api/v1/full-final-settlement/${id}/approve/`,
      requiredPermission: 'settlements.approve',
      method: 'POST',
      allowedRoles: ['org_admin'],
      variant: 'primary',
      confirm: {
        title: 'Approve Settlement',
        message: 'Are you sure you want to approve this full & final settlement?',
      },
    },
    {
      from: 'pending_approval',
      to: 'draft',
      action: 'Reject',
      endpoint: (id) => `/api/v1/full-final-settlement/${id}/approve/`,
      requiredPermission: 'settlements.reject',
      method: 'POST',
      allowedRoles: ['org_admin'],
      requiresReason: true,
      variant: 'destructive',
    },
    {
      from: 'approved',
      to: 'paid',
      action: 'Mark as Paid',
      endpoint: (id) => `/api/v1/full-final-settlement/${id}/mark-paid/`,
      requiredPermission: 'settlements.mark_paid',
      method: 'POST',
      allowedRoles: ['org_admin'],
      variant: 'primary',
      confirm: {
        title: 'Mark as Paid',
        message: 'Confirm that the settlement amount has been disbursed to the employee.',
      },
    },
    {
      from: 'draft',
      to: 'deleted',
      action: 'Delete',
      endpoint: (id) => `/api/v1/full-final-settlement/${id}/`,
      method: 'DELETE',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'destructive',
      confirm: {
        title: 'Delete Settlement',
        message: 'Permanently delete this draft settlement?',
      },
    },
  ],
};
