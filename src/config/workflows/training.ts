/**
 * Training Workflow Configuration
 *
 * Defines the state machine for training event/enrollment lifecycle:
 * scheduled → in_progress → completed, or scheduled → cancelled.
 *
 * Requirements: 11.1, 11.4
 */

import type { WorkflowConfig } from '@/types/workflow';
import { TRAINING } from '@/lib/endpoints';

export const trainingWorkflow: WorkflowConfig = {
  id: 'training',
  statuses: [
    { key: 'scheduled', label: 'Scheduled', color: 'gray' },
    { key: 'in_progress', label: 'In Progress', color: 'blue' },
    { key: 'completed', label: 'Completed', color: 'green', terminal: true },
    { key: 'cancelled', label: 'Cancelled', color: 'red', terminal: true },
  ],
  transitions: [
    {
      from: 'scheduled',
      to: 'in_progress',
      action: 'Start',
      endpoint: (id) => TRAINING.EVENT_DETAIL(id),
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'primary',
    },
    {
      from: 'in_progress',
      to: 'completed',
      action: 'Complete',
      endpoint: (id) => TRAINING.EVENT_DETAIL(id),
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'primary',
      confirm: {
        title: 'Complete Training',
        message: 'Mark this training event as completed?',
      },
    },
    {
      from: 'scheduled',
      to: 'cancelled',
      action: 'Cancel',
      endpoint: (id) => TRAINING.EVENT_DETAIL(id),
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      requiresReason: true,
      variant: 'destructive',
    },
  ],
};
