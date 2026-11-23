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
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import type { WorkflowConfig, WorkflowTransition } from '@/types/workflow';
import { Button, type ButtonProps } from '@/components/ui/Button';

interface TransitionActionsProps {
  /** The current record with id and status */
  record: { id: string; status: string; employee?: unknown; employee_id?: unknown };
  /** Workflow configuration containing transitions */
  config: WorkflowConfig;
  /** Callback when a transition button is clicked */
  onTransition: (transition: WorkflowTransition) => void;
  /** Whether a transition is currently in progress */
  isLoading?: boolean;
}

const VARIANT_PROPS: Record<string, Pick<ButtonProps, 'variant' | 'color'>> = {
  primary: { variant: 'contained', color: 'primary' },
  destructive: { variant: 'contained', color: 'error' },
  secondary: { variant: 'outlined', color: 'inherit' },
};

export function TransitionActions({
  record,
  config,
  onTransition,
  isLoading = false,
}: TransitionActionsProps) {
  const { role } = useUser();
  const { roleName, hasPermission } = useHrmsPermissionsContext();

  const { data: currentEmployee } = useQuery({
    queryKey: ['employee', 'me'],
    queryFn: async () => {
      const response = await api.get<{ id: number }>('/api/v1/employees/me/');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const recEmpId = typeof record.employee === 'object' && record.employee !== null
    ? (record.employee as { id?: number | string }).id
    : (record.employee || record.employee_id);
  const isOwnRecord = Boolean(currentEmployee?.id && recEmpId && String(recEmpId) === String(currentEmployee.id));

  // Filter transitions: `from` matches current status AND user has access
  // Priority: requiredPermission (dynamic) > allowedRoles (legacy)
  const availableTransitions = config.transitions.filter((t) => {
    if (t.from !== record.status) return false;

    // Disallow approving or rejecting own request
    const isApproveOrReject = ['approved', 'rejected'].includes(t.to) ||
      t.action.toLowerCase().includes('approve') ||
      t.action.toLowerCase().includes('reject');
    if (isOwnRecord && isApproveOrReject) {
      return false;
    }

    // If requiredPermission is set, use permission-based check (works with any role)
    if (t.requiredPermission) {
      return hasPermission(t.requiredPermission);
    }

    // Fallback: check JWT role or HRMS role against allowedRoles
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
        const variantProps = VARIANT_PROPS[variant] ?? VARIANT_PROPS.secondary;

        return (
          <Button
            key={`${transition.from}-${transition.to}-${transition.action}`}
            size="small"
            {...variantProps}
            disabled={isLoading}
            onClick={() => onTransition(transition)}
          >
            {transition.action}
          </Button>
        );
      })}
    </div>
  );
}
