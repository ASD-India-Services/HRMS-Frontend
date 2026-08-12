/**
 * Overtime Approval Workflow Configuration
 *
 * Defines the state machine for overtime slip approvals:
 * draft → submitted → approved/rejected.
 *
 * Requirements: 14.1, 14.2, 14.3
 */

import type { WorkflowConfig } from '@/types/workflow';
import { OVERTIME } from '@/lib/endpoints';

export const overtimeApprovalWorkflow: WorkflowConfig = {
  id: 'overtime-approval',
  statuses: [
    { key: 'draft', label: 'Draft', color: 'gray' },
    { key: 'submitted', label: 'Submitted', color: 'yellow' },
    { key: 'approved', label: 'Approved', color: 'green', terminal: true },
    { key: 'rejected', label: 'Rejected', color: 'red', terminal: true },
  ],
  transitions: [
    {
      from: 'draft',
      to: 'submitted',
      action: 'Submit',
      endpoint: (id) => `/api/v1/overtime-slips/${id}/submit/`,
      method: 'POST',
      allowedRoles: ['org_admin', 'hr_manager', 'department_head', 'employee'],
      variant: 'primary',
    },
    {
      from: 'submitted',
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
      from: 'submitted',
      to: 'rejected',
      action: 'Reject',
      endpoint: (id) => OVERTIME.SLIP_REJECT(id),
      allowedRoles: ['org_admin', 'hr_manager', 'department_head'],
      requiresReason: true,
      variant: 'destructive',
    },
    {
      from: 'draft',
      to: 'deleted',
      action: 'Delete',
      endpoint: (id) => `/api/v1/overtime-slips/${id}/`,
      method: 'DELETE',
      allowedRoles: ['org_admin', 'hr_manager', 'employee'],
      variant: 'destructive',
      confirm: {
        title: 'Delete Overtime Slip',
        message: 'Are you sure you want to delete this draft overtime slip?',
      },
    },
  ],
};
