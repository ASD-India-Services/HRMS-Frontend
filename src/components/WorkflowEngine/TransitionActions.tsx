/**
 * TransitionActions
 *
 * Renders action buttons for valid workflow transitions based on the
 * record's current status and the user's role.
 *
 * - Filters transitions whose `from` matches the current record status
 * - Checks `allowedRoles` against the current user's role via useUser
 * - Renders buttons with variant-based styling (primary, destructive, secondary)
 * - Calls `onTransition` when a button is clicked
 *
 * Requirements: 5.3, 5.4, 6.3, 6.4, 7.3, 13.2, 13.3, 14.2, 14.3
 */

import { useUser } from '@platform/auth-sdk';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import type { WorkflowConfig, WorkflowTransition } from '@/types/workflow';

interface TransitionActionsProps {
  /** The current record with id and status */
  record: { id: string; status: string };
  /** Workflow configuration containing transitions */
  config: WorkflowConfig;
  /** Callback when a transition button is clicked */
  onTransition: (transition: WorkflowTransition) => void;
  /** Whether a transition is currently in progress */
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<string, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
  destructive:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  secondary:
    'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-primary-500',
};

export function TransitionActions({
  record,
  config,
  onTransition,
  isLoading = false,
}: TransitionActionsProps) {
  const { role } = useUser();
  const { roleName } = useHrmsPermissionsContext();

  // Filter transitions: `from` matches current status AND user has an allowed role
  const availableTransitions = config.transitions.filter((t) => {
    if (t.from !== record.status) return false;
    // Check both JWT role and HRMS role
    const jwtMatch = role && t.allowedRoles.includes(role);
    const hrmsMatch = roleName && t.allowedRoles.includes(roleName);
    return jwtMatch || hrmsMatch;
  });

  if (availableTransitions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {availableTransitions.map((transition) => {
        const variant = transition.variant ?? 'secondary';
        const variantClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.secondary;

        return (
          <button
            key={`${transition.from}-${transition.to}-${transition.action}`}
            type="button"
            disabled={isLoading}
            onClick={() => onTransition(transition)}
            className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClass}`}
          >
            {transition.action}
          </button>
        );
      })}
    </div>
  );
}
