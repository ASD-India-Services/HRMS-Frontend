/**
 * Expense Approval Workflow Configuration
 *
 * Defines the state machine for expense claim and advance approvals:
 * pending → approved/rejected, approved → paid.
 *
 * Requirements: 6.1, 6.3, 6.4, 6.5
 */

import type { WorkflowConfig } from '@/types/workflow';

export const expenseApprovalWorkflow: WorkflowConfig = {
  id: 'expense-approval',
  statuses: [
    { key: 'pending', label: 'Pending Approval', color: 'yellow' },
    { key: 'approved', label: 'Approved', color: 'green' },
    { key: 'rejected', label: 'Rejected', color: 'red', terminal: true },
    { key: 'paid', label: 'Paid', color: 'blue', terminal: true },
  ],
  transitions: [
    {
      from: 'pending',
      to: 'approved',
      action: 'Approve',
      endpoint: (id) => `/api/v1/expenses/claims/${id}/approve/`,
      allowedRoles: ['org_admin', 'hr_manager', 'department_head'],
      variant: 'primary',
      confirm: {
        title: 'Approve Expense',
        message: 'Are you sure you want to approve this expense claim?',
      },
    },
    {
      from: 'pending',
      to: 'rejected',
      action: 'Reject',
      endpoint: (id) => `/api/v1/expenses/claims/${id}/reject/`,
      allowedRoles: ['org_admin', 'hr_manager', 'department_head'],
      requiresReason: true,
      variant: 'destructive',
    },
    {
      from: 'approved',
      to: 'paid',
      action: 'Mark as Paid',
      endpoint: (id) => `/api/v1/expenses/claims/${id}/`,
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'primary',
    },
  ],
};
