/**
 * ActionButton — Reusable permission-gated action button component.
 *
 * Provides consistent button styling and permission checks for all
 * action buttons across list pages, detail pages, and table rows.
 *
 * - Primary: Create, Add, Submit, Save (top-right on list pages)
 * - Secondary: Edit, View, Cancel
 * - Danger: Delete, Reject
 * - Success: Approve, Activate
 * - Ghost: Inline/contextual actions
 *
 * If a `permission` prop is provided, the button is hidden when the
 * current user lacks that HRMS permission.
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4
 */

import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActionButtonProps {
  /** Button label text */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** HRMS permission required to show this button (hides if lacking) */
  permission?: string;
  /** Visual variant */
  variant: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Optional icon (SVG path data) to show before label */
  icon?: string;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

// ---------------------------------------------------------------------------
// Style maps
// ---------------------------------------------------------------------------

const VARIANT_CLASSES: Record<ActionButtonProps['variant'], string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
  secondary:
    'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-primary-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500',
};

const SIZE_CLASSES: Record<NonNullable<ActionButtonProps['size']>, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ActionButton renders a styled, permission-gated button.
 * Returns null if the user lacks the required `permission`.
 */
export function ActionButton({
  label,
  onClick,
  permission,
  variant,
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  className = '',
}: ActionButtonProps) {
  const { hasPermission } = useHrmsPermissionsContext();

  // Permission gate: hide the button entirely if user lacks the permission
  if (permission && !hasPermission(permission)) {
    return null;
  }

  const baseClasses =
    'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const classes = [
    baseClasses,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : icon ? (
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      ) : null}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Default icon paths (Heroicons outline style)
// ---------------------------------------------------------------------------

const ICONS = {
  plus: 'M12 4.5v15m7.5-7.5h-15',
  pencil: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z',
  trash: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
  check: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  xMark: 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

// ---------------------------------------------------------------------------
// Convenience buttons (pre-configured variants)
// ---------------------------------------------------------------------------

type ConvenienceButtonProps = Omit<ActionButtonProps, 'variant'>;

/** Primary "Create" button — use on list pages, top-right placement. */
export function CreateButton(props: ConvenienceButtonProps) {
  return <ActionButton {...props} variant="primary" icon={props.icon ?? ICONS.plus} />;
}

/** Secondary "Edit" button — use on detail pages or table rows. */
export function EditButton(props: ConvenienceButtonProps) {
  return <ActionButton {...props} variant="secondary" icon={props.icon ?? ICONS.pencil} />;
}

/** Danger "Delete" button — use for destructive actions. */
export function DeleteButton(props: ConvenienceButtonProps) {
  return <ActionButton {...props} variant="danger" icon={props.icon ?? ICONS.trash} />;
}

/** Success "Approve" button — use for approval workflows. */
export function ApproveButton(props: ConvenienceButtonProps) {
  return <ActionButton {...props} variant="success" icon={props.icon ?? ICONS.check} />;
}

/** Danger "Reject" button — use for rejection workflows. */
export function RejectButton(props: ConvenienceButtonProps) {
  return <ActionButton {...props} variant="danger" icon={props.icon ?? ICONS.xMark} />;
}
