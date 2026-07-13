/**
 * Overtime Approval Workflow Configuration
 *
 * Defines the state machine for overtime slip approvals:
 * pending_approval → approved/rejected.
 *
 * Requirements: 14.1, 14.2, 14.3
 */

import type { WorkflowConfig } from '@/types/workflow';
import { OVERTIME } from '@/lib/endpoints';

export const overtimeApprovalWorkflow: WorkflowConfig = {
  id: 'overtime-approval',
  statuses: [
    { key: 'pending_approval', label: 'Pending Approval', color: 'yellow' },
    { key: 'approved', label: 'Approved', color: 'green', terminal: true },
    { key: 'rejected', label: 'Rejected', color: 'red', terminal: true },
  ],
  transitions: [
    {
      from: 'pending_approval',
      to: 'approved',
      action: 'Approve',
      endpoint: (id) => OVERTIME.SLIP_APPROVE(id),
      allowedRoles: ['org_admin', 'hr_manager', 'department_head'],
      variant: 'primary',
      confirm: {
        title: 'Approve Overtime',
        message: 'Are you sure you want to approve this overtime slip?',
      },
    },
    {
      from: 'pending_approval',
      to: 'rejected',
      action: 'Reject',
      endpoint: (id) => OVERTIME.SLIP_REJECT(id),
      allowedRoles: ['org_admin', 'hr_manager', 'department_head'],
      requiresReason: true,
      variant: 'destructive',
    },
  ],
};
