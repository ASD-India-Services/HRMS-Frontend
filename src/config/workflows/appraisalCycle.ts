/**
 * Appraisal Cycle Workflow Configuration
 *
 * Defines the state machine for appraisal cycle management including
 * statuses, transitions, role-based access, and confirmation dialogs.
 *
 * Requirements: 8.1, 8.2, 8.6
 */

import type { WorkflowConfig } from '@/types/workflow';

export const appraisalCycleWorkflow: WorkflowConfig = {
  id: 'appraisal-cycle',
  statuses: [
    { key: 'draft', label: 'Draft', color: 'gray' },
    { key: 'active', label: 'Active', color: 'blue' },
    { key: 'completed', label: 'Completed', color: 'green', terminal: true },
    { key: 'cancelled', label: 'Cancelled', color: 'red', terminal: true },
  ],
  transitions: [
    {
      from: 'draft',
      to: 'active',
      action: 'Activate Cycle',
      endpoint: (id) => `/api/v1/appraisals/cycles/${id}/`,
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'primary',
      confirm: {
        title: 'Activate Appraisal Cycle',
        message:
          'This will make the cycle active and allow reviews to begin. Continue?',
      },
    },
    {
      from: 'active',
      to: 'completed',
      action: 'Complete Cycle',
      endpoint: (id) => `/api/v1/appraisals/cycles/${id}/`,
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'primary',
      confirm: {
        title: 'Complete Appraisal Cycle',
        message:
          'All appraisals in this cycle will be finalized. Continue?',
      },
    },
    {
      from: 'active',
      to: 'cancelled',
      action: 'Cancel Cycle',
      endpoint: (id) => `/api/v1/appraisals/cycles/${id}/`,
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'destructive',
    },
  ],
};
