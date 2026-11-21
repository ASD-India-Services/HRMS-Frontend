/**
 * EmptyState — Module-aware empty state component.
 *
 * Displays a centered illustration, title, description, and an optional CTA
 * button when a list page has zero records. Each HRMS module has a unique
 * default message so users understand what the page is for.
 *
 * The CTA button is hidden when the user lacks the create permission for the
 * module (checked via HrmsPermissionsContext).
 *
 * Requirements: 17.1, 17.2, 17.3
 */

import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { Iconify } from '@/components/Iconify';
import { Button } from '@/components/ui/Button';
import { StateView } from '@/components/ui/StateView';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  /** Module identifier for default messages */
  module: string;
  /** Override title (optional — defaults to module-specific message) */
  title?: string;
  /** Override description (optional — defaults to module-specific message) */
  description?: string;
  /** CTA button label */
  ctaLabel?: string;
  /** Permission required to show CTA (hides CTA if user lacks this) */
  ctaPermission?: string;
  /** CTA click handler */
  onCtaClick?: () => void;
}

// ---------------------------------------------------------------------------
// Module Messages
// ---------------------------------------------------------------------------

export const MODULE_MESSAGES: Record<string, { title: string; description: string; ctaLabel: string }> = {
  employees: {
    title: 'No employees yet',
    description: 'Add your first team member to get started with your organization.',
    ctaLabel: 'Add Employee',
  },
  leaves: {
    title: 'No leave records',
    description: 'Leave applications will appear here once employees start applying.',
    ctaLabel: 'Apply Leave',
  },
  attendance: {
    title: 'No attendance records',
    description: 'Attendance logs will appear here once tracking begins.',
    ctaLabel: 'Mark Attendance',
  },
  payroll: {
    title: 'No payroll runs',
    description: 'Process your first payroll to generate salary slips for employees.',
    ctaLabel: 'Run Payroll',
  },
  recruitment: {
    title: 'No job openings',
    description: 'Create job openings to start building your recruitment pipeline.',
    ctaLabel: 'Create Opening',
  },
  appraisals: {
    title: 'No appraisal cycles',
    description: 'Set up an appraisal cycle to begin evaluating employee performance.',
    ctaLabel: 'Create Cycle',
  },
  expenses: {
    title: 'No expense claims',
    description: 'Expense claims will appear here once employees submit them.',
    ctaLabel: 'Submit Expense',
  },
  onboarding: {
    title: 'No onboarding tasks',
    description: 'Onboarding checklists will appear here for new hires.',
    ctaLabel: 'Create Template',
  },
  training: {
    title: 'No training events',
    description: 'Schedule training sessions to upskill your workforce.',
    ctaLabel: 'Create Training',
  },
  grievances: {
    title: 'No grievances filed',
    description: 'Employee grievances will be listed here for review and resolution.',
    ctaLabel: 'File Grievance',
  },
  travel: {
    title: 'No travel requests',
    description: 'Travel requests from employees will appear here for approval.',
    ctaLabel: 'Create Request',
  },
  overtime: {
    title: 'No overtime requests',
    description: 'Overtime submissions will appear here when employees log extra hours.',
    ctaLabel: 'Log Overtime',
  },
  settlements: {
    title: 'No settlements pending',
    description: 'Final settlements for separated employees will be tracked here.',
    ctaLabel: 'Create Settlement',
  },
};

// ---------------------------------------------------------------------------
// Fallback messages for unknown modules
// ---------------------------------------------------------------------------

const FALLBACK_MESSAGE = {
  title: 'No records found',
  description: 'There are no records to display at the moment.',
  ctaLabel: 'Create',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * EmptyState renders a centered empty state with an illustration, title,
 * description, and an optional permission-gated CTA button (built on the shared StateView).
 */
export function EmptyState({
  module,
  title,
  description,
  ctaLabel,
  ctaPermission,
  onCtaClick,
}: EmptyStateProps) {
  const { hasPermission } = useHrmsPermissionsContext();

  const messages = MODULE_MESSAGES[module] ?? FALLBACK_MESSAGE;
  const displayTitle = title ?? messages.title;
  const displayDescription = description ?? messages.description;
  const displayCtaLabel = ctaLabel ?? messages.ctaLabel;

  // Determine whether to show the CTA button
  const showCta =
    onCtaClick != null &&
    (ctaPermission == null || hasPermission(ctaPermission));

  return (
    <StateView
      role="status"
      aria-label={displayTitle}
      icon="inbox"
      title={displayTitle}
      description={displayDescription}
      action={
        showCta ? (
          <Button startIcon={<Iconify icon="plus" />} onClick={onCtaClick}>
            {displayCtaLabel}
          </Button>
        ) : undefined
      }
    />
  );
}
