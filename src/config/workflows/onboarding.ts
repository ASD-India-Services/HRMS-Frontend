/**
 * Onboarding Workflow Configuration
 *
 * Defines the state machine for onboarding task progression including
 * statuses, transitions, role-based access, and reason requirements.
 *
 * Requirements: 10.1, 10.4, 10.5
 */

import type { WorkflowConfig } from '@/types/workflow';

export const onboardingWorkflow: WorkflowConfig = {
  id: 'onboarding',
  statuses: [
    { key: 'pending', label: 'Pending', color: 'gray' },
    { key: 'in_progress', label: 'In Progress', color: 'blue' },
    { key: 'completed', label: 'Completed', color: 'green', terminal: true },
    { key: 'skipped', label: 'Skipped', color: 'yellow', terminal: true },
  ],
  transitions: [
    {
      from: 'pending',
      to: 'in_progress',
      action: 'Start',
      endpoint: (id) => `/api/v1/onboarding/tasks/${id}/`,
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager', 'employee'],
      variant: 'primary',
    },
    {
      from: 'in_progress',
      to: 'completed',
      action: 'Complete',
      endpoint: (id) => `/api/v1/onboarding/tasks/${id}/complete/`,
      allowedRoles: ['org_admin', 'hr_manager', 'employee'],
      variant: 'primary',
    },
    {
      from: 'pending',
      to: 'skipped',
      action: 'Skip',
      endpoint: (id) => `/api/v1/onboarding/tasks/${id}/`,
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      requiresReason: true,
      variant: 'secondary',
    },
    {
      from: 'in_progress',
      to: 'skipped',
      action: 'Skip',
      endpoint: (id) => `/api/v1/onboarding/tasks/${id}/`,
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      requiresReason: true,
      variant: 'secondary',
    },
  ],
};
