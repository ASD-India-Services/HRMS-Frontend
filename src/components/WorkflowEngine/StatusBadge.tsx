/**
 * StatusBadge
 *
 * Renders a colored badge representing the current workflow status.
 * Looks up the status definition from the workflow config to determine
 * the label and color.
 *
 * Requirements: 5.3, 5.4, 6.3, 6.4, 7.3, 13.2, 13.3, 14.2, 14.3
 */

import type { WorkflowConfig } from '@/types/workflow';

interface StatusBadgeProps {
  /** Current status key of the record */
  status: string;
  /** Workflow configuration containing status definitions */
  config: WorkflowConfig;
}

const COLOR_CLASSES: Record<string, string> = {
  gray: 'bg-surface-neutral text-ink-primary',
  yellow: 'bg-warning-lighter text-warning-dark',
  blue: 'bg-primary-lighter text-primary-dark',
  green: 'bg-success-lighter text-success-dark',
  red: 'bg-error-lighter text-error-dark',
};

export function StatusBadge({ status, config }: StatusBadgeProps) {
  const statusDef = config.statuses.find((s) => s.key === status);

  if (!statusDef) {
    return (
      <span className="inline-flex items-center rounded-full bg-surface-neutral px-2.5 py-0.5 text-xs font-medium text-ink-primary">
        {status}
      </span>
    );
  }

  const colorClass = COLOR_CLASSES[statusDef.color] ?? COLOR_CLASSES.gray;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {statusDef.label}
    </span>
  );
}
