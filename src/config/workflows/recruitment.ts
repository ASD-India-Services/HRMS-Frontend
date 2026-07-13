/**
 * Recruitment Workflow Configuration
 *
 * Defines the state machine for recruitment/applicant tracking including
 * statuses, transitions, role-based access, and confirmation dialogs.
 *
 * Requirements: 7.1, 7.3, 7.5
 */

import type { WorkflowConfig } from '@/types/workflow';
import { RECRUITMENT } from '@/lib/endpoints';

export const recruitmentWorkflow: WorkflowConfig = {
  id: 'recruitment',
  statuses: [
    { key: 'applied', label: 'Applied', color: 'gray' },
    { key: 'screening', label: 'Screening', color: 'yellow' },
    { key: 'interview', label: 'Interview', color: 'blue' },
    { key: 'offer_made', label: 'Offer Made', color: 'blue' },
    { key: 'hired', label: 'Hired', color: 'green', terminal: true },
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
      action: 'Schedule Interview',
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
      to: 'offer_made',
      action: 'Make Offer',
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
      from: 'offer_made',
      to: 'hired',
      action: 'Mark as Hired',
      endpoint: (id) => RECRUITMENT.JOB_APPLICANT_DETAIL(id),
      method: 'PATCH',
      allowedRoles: ['org_admin', 'hr_manager'],
      variant: 'primary',
      confirm: {
        title: 'Confirm Hire',
        message: 'Mark this applicant as hired?',
      },
    },
    {
      from: 'offer_made',
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
