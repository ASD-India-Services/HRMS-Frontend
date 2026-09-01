/**
 * Grievance Workflow Configuration
 *
 * Defines the state machine for employee grievance handling:
 * open → under_investigation → resolved → closed.
 *
 * Requirements: 12.1, 12.2, 12.3
 */

import type { WorkflowConfig } from '@/types/workflow';

export const grievanceWorkflow: WorkflowConfig = {
  id: 'grievance',
  statuses: [
    { key: 'open', label: 'Open', color: 'yellow' },
    { key: 'investigating', label: 'Investigating', color: 'blue' },
    { key: 'resolved', label: 'Resolved', color: 'green', terminal: true },
    { key: 'closed', label: 'Closed', color: 'gray', terminal: true },
  ],
  transitions: [
    {
      from: 'open',
      to: 'investigating',
      action: 'Assign Investigator',
      endpoint: (id) => `/api/v1/grievances/${id}/assign/`,
      requiredPermission: 'grievances.edit',
      method: 'POST',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'primary',
      formFields: [
        { name: 'handler_id', label: 'Investigator', type: 'select', required: true, optionsQuery: { queryKey: ['employees', 'options'], endpoint: '/api/v1/employees/' } },
      ],
    },
    {
      from: 'investigating',
      to: 'resolved',
      action: 'Mark Resolved',
      endpoint: (id) => `/api/v1/grievances/${id}/status/`,
      requiredPermission: 'grievances.approve',
      method: 'POST',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'primary',
      confirm: {
        title: 'Resolve Grievance',
        message: 'Are you sure you want to mark this grievance as resolved?',
      },
    },
    {
      from: 'open',
      to: 'closed',
      action: 'Close',
      endpoint: (id) => `/api/v1/grievances/${id}/status/`,
      requiredPermission: 'grievances.reject',
      method: 'POST',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'secondary',
    },
    {
      from: 'investigating',
      to: 'closed',
      action: 'Close',
      endpoint: (id) => `/api/v1/grievances/${id}/status/`,
      requiredPermission: 'grievances.reject',
      method: 'POST',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'secondary',
    },
  ],
};
