/**
 * Recruitment Workflow Configuration
 *
 * Defines the state machine for recruitment/applicant tracking including
 * statuses, transitions, role-based access, and confirmation dialogs.
 *
 * Stages: Applied → Screening → Interview → Selected → Hired (Onboarded)
 * Can be Rejected at any stage.
 */

import type { WorkflowConfig } from '@/types/workflow';
import { RECRUITMENT } from '@/lib/endpoints';

export const recruitmentWorkflow: WorkflowConfig = {
  id: 'recruitment',
  statuses: [
    { key: 'applied', label: 'Applied', color: 'gray' },
    { key: 'screening', label: 'Screening', color: 'yellow' },
    { key: 'interview', label: 'Interview', color: 'blue' },
    { key: 'selected', label: 'Selected', color: 'green' },
    { key: 'onboarded', label: 'Hired', color: 'green', terminal: true },
    { key: 'rejected', label: 'Rejected', color: 'red', terminal: true },
  ],
  transitions: [
    {
      from: 'applied',
      to: 'screening',
      action: 'Move to Screening',
      endpoint: (id) => RECRUITMENT.JOB_APPLICANT_DETAIL(id),
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'primary',
    },
    {
      from: 'applied',
      to: 'rejected',
      action: 'Reject',
      endpoint: (id) => RECRUITMENT.JOB_APPLICANT_DETAIL(id),
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      requiresReason: true,
      variant: 'destructive',
    },
    {
      from: 'screening',
      to: 'interview',
      action: 'Move to Interview',
      endpoint: (id) => RECRUITMENT.JOB_APPLICANT_DETAIL(id),
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'primary',
    },
    {
      from: 'screening',
      to: 'rejected',
      action: 'Reject',
      endpoint: (id) => RECRUITMENT.JOB_APPLICANT_DETAIL(id),
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      requiresReason: true,
      variant: 'destructive',
    },
    {
      from: 'interview',
      to: 'selected',
      action: 'Select Candidate',
      endpoint: (id) => RECRUITMENT.JOB_APPLICANT_DETAIL(id),
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'primary',
    },
    {
      from: 'interview',
      to: 'rejected',
      action: 'Reject',
      endpoint: (id) => RECRUITMENT.JOB_APPLICANT_DETAIL(id),
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      requiresReason: true,
      variant: 'destructive',
    },
    {
      from: 'selected',
      to: 'onboarded',
      action: 'Hire & Onboard',
      endpoint: (id) => `${RECRUITMENT.JOB_APPLICANTS}${id}/hire/`,
      method: 'POST',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'primary',
      confirm: {
        title: 'Confirm Hire',
        message: 'This will create an employee account for this candidate and send them an invitation. Continue?',
      },
    },
    {
      from: 'selected',
      to: 'rejected',
      action: 'Reject',
      endpoint: (id) => RECRUITMENT.JOB_APPLICANT_DETAIL(id),
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      requiresReason: true,
      variant: 'destructive',
    },
  ],
};
