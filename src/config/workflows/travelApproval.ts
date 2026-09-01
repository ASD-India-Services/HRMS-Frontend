/**
 * Travel Approval Workflow Configuration
 *
 * Defines the state machine for travel request approvals:
 * draft → submitted → approved/rejected → completed.
 *
 * Requirements: 13.1, 13.2, 13.3
 */

import type { WorkflowConfig } from '@/types/workflow';
import { TRAVEL } from '@/lib/endpoints';

export const travelApprovalWorkflow: WorkflowConfig = {
  id: 'travel-approval',
  statuses: [
    { key: 'draft', label: 'Draft', color: 'gray' },
    { key: 'submitted', label: 'Submitted', color: 'yellow' },
    { key: 'approved', label: 'Approved', color: 'green' },
    { key: 'rejected', label: 'Rejected', color: 'red', terminal: true },
    { key: 'completed', label: 'Completed', color: 'blue', terminal: true },
  ],
  transitions: [
    {
      from: 'draft',
      to: 'submitted',
      action: 'Submit',
      endpoint: (id) => `/api/v1/travel-requests/${id}/submit/`,
      method: 'POST',
      allowedRoles: ['org_admin', 'hr_manager', 'department_head', 'employee'],
      variant: 'primary',
    },
    {
      from: 'submitted',
      to: 'approved',
      action: 'Approve',
      endpoint: (id) => TRAVEL.REQUEST_APPROVE(id),
      requiredPermission: 'travel.approve',
      allowedRoles: ['org_admin', 'hr_manager', 'department_head'],
      variant: 'primary',
      confirm: {
        title: 'Approve Travel Request',
        message: 'Are you sure you want to approve this travel request?',
      },
    },
    {
      from: 'submitted',
      to: 'rejected',
      action: 'Reject',
      endpoint: (id) => TRAVEL.REQUEST_REJECT(id),
      requiredPermission: 'travel.reject',
      allowedRoles: ['org_admin', 'hr_manager', 'department_head'],
      requiresReason: true,
      variant: 'destructive',
    },
    {
      from: 'draft',
      to: 'deleted',
      action: 'Delete',
      endpoint: (id) => `/api/v1/travel-requests/${id}/`,
      method: 'DELETE',
      allowedRoles: ['org_admin', 'hr_manager', 'employee'],
      variant: 'destructive',
      confirm: {
        title: 'Delete Travel Request',
        message: 'Are you sure you want to delete this draft travel request?',
      },
    },
  ],
};
