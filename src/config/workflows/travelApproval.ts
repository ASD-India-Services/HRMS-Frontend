/**
 * Travel Approval Workflow Configuration
 *
 * Defines the state machine for travel request approvals:
 * pending_approval → approved/rejected.
 *
 * Requirements: 13.1, 13.2, 13.3
 */

import type { WorkflowConfig } from '@/types/workflow';
import { TRAVEL } from '@/lib/endpoints';

export const travelApprovalWorkflow: WorkflowConfig = {
  id: 'travel-approval',
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
      endpoint: (id) => TRAVEL.REQUEST_APPROVE(id),
      allowedRoles: ['org_admin', 'hr_manager', 'department_head'],
      variant: 'primary',
      confirm: {
        title: 'Approve Travel Request',
        message: 'Are you sure you want to approve this travel request?',
      },
    },
    {
      from: 'pending_approval',
      to: 'rejected',
      action: 'Reject',
      endpoint: (id) => TRAVEL.REQUEST_REJECT(id),
      allowedRoles: ['org_admin', 'hr_manager', 'department_head'],
      requiresReason: true,
      variant: 'destructive',
    },
  ],
};
