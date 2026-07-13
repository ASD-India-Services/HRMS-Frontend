/**
 * Full & Final Settlement Workflow Configuration
 *
 * Defines the state machine for employee settlement processing:
 * draft → pending_approval → approved/rejected.
 *
 * Requirements: 19.1, 19.3, 19.4
 */

import type { WorkflowConfig } from '@/types/workflow';
import { SETTLEMENT } from '@/lib/endpoints';

export const settlementWorkflow: WorkflowConfig = {
  id: 'settlement',
  statuses: [
    { key: 'draft', label: 'Draft', color: 'gray' },
    { key: 'pending_approval', label: 'Pending Approval', color: 'yellow' },
    { key: 'approved', label: 'Approved', color: 'green', terminal: true },
    { key: 'rejected', label: 'Rejected', color: 'red' },
  ],
  transitions: [
    {
      from: 'draft',
      to: 'pending_approval',
      action: 'Submit for Approval',
      endpoint: (id) => SETTLEMENT.DETAIL(id),
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'primary',
      confirm: {
        title: 'Submit Settlement',
        message: 'Submit this settlement for approval?',
      },
    },
    {
      from: 'pending_approval',
      to: 'approved',
      action: 'Approve',
      endpoint: (id) => SETTLEMENT.APPROVE(id),
      allowedRoles: ['org_admin'],
      variant: 'primary',
      confirm: {
        title: 'Approve Settlement',
        message: 'Are you sure you want to approve this full & final settlement?',
      },
    },
    {
      from: 'pending_approval',
      to: 'rejected',
      action: 'Reject',
      endpoint: (id) => SETTLEMENT.DETAIL(id),
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      requiresReason: true,
      variant: 'destructive',
    },
  ],
};
