/**
 * Grievance Workflow Configuration
 *
 * Defines the state machine for employee grievance handling:
 * open → under_investigation → resolved → closed.
 *
 * Requirements: 12.1, 12.2, 12.3
 */

import type { WorkflowConfig } from '@/types/workflow';
import { GRIEVANCES } from '@/lib/endpoints';

export const grievanceWorkflow: WorkflowConfig = {
  id: 'grievance',
  statuses: [
    { key: 'open', label: 'Open', color: 'yellow' },
    { key: 'under_investigation', label: 'Under Investigation', color: 'blue' },
    { key: 'resolved', label: 'Resolved', color: 'green', terminal: true },
    { key: 'closed', label: 'Closed', color: 'gray', terminal: true },
  ],
  transitions: [
    {
      from: 'open',
      to: 'under_investigation',
      action: 'Assign Investigator',
      endpoint: (id) => GRIEVANCES.DETAIL(id),
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'primary',
    },
    {
      from: 'under_investigation',
      to: 'resolved',
      action: 'Mark Resolved',
      endpoint: (id) => GRIEVANCES.DETAIL(id),
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      requiresReason: true,
      variant: 'primary',
      confirm: {
        title: 'Resolve Grievance',
        message: 'Are you sure you want to mark this grievance as resolved?',
      },
    },
    {
      from: 'resolved',
      to: 'closed',
      action: 'Close',
      endpoint: (id) => GRIEVANCES.DETAIL(id),
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'secondary',
    },
  ],
};
