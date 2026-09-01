/**
 * Leave Approval Workflow Configuration
 *
 * Defines the state machine for leave application approval including
 * statuses, transitions, role-based access, and confirmation dialogs.
 *
 * Requirements: 5.1, 5.3, 5.4, 5.6
 */

import type { WorkflowConfig } from '@/types/workflow';
import { LEAVES } from '@/lib/endpoints';

export const leaveApprovalWorkflow: WorkflowConfig = {
  id: 'leave-approval',
  statuses: [
    { key: 'pending', label: 'Pending Approval', color: 'yellow' },
    { key: 'approved', label: 'Approved', color: 'green', terminal: true },
    { key: 'rejected', label: 'Rejected', color: 'red', terminal: true },
  ],
  transitions: [
    {
      from: 'pending',
      to: 'approved',
      action: 'Approve',
      endpoint: (id) => LEAVES.APPROVE(id),
      requiredPermission: 'leaves.approve',
      allowedRoles: ['org_admin', 'hr_manager', 'department_head'],
      confirm: {
        title: 'Approve Leave',
        message: 'Are you sure you want to approve this leave application?',
      },
      variant: 'primary',
    },
    {
      from: 'pending',
      to: 'rejected',
      action: 'Reject',
      endpoint: (id) => LEAVES.REJECT(id),
      requiredPermission: 'leaves.reject',
      allowedRoles: ['org_admin', 'hr_manager', 'department_head'],
      requiresReason: true,
      confirm: {
        title: 'Reject Leave',
        message: 'Please provide a reason for rejection.',
      },
      variant: 'destructive',
    },
  ],
};
