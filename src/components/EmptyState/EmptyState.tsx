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
 * description, and an optional permission-gated CTA button.
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
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      role="status"
      aria-label={displayTitle}
    >
      {/* Illustration — generic empty box/folder icon */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Open box / folder icon */}
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-gray-900">
        {displayTitle}
      </h3>

      {/* Description */}
      <p className="mt-1 max-w-sm text-sm text-gray-500">
        {displayDescription}
      </p>

      {/* CTA Button — hidden when user lacks create permission */}
      {showCta && (
        <button
          type="button"
          onClick={onCtaClick}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {displayCtaLabel}
        </button>
      )}
    </div>
  );
}
