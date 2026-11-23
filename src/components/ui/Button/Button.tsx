/**
 * Button — Minimal-style button. Extends native button props so handlers
 * and attributes pass through unchanged. Class map lives in buttonClasses.
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';
import { buttonClasses, type ButtonColor, type ButtonSize, type ButtonVariant } from './buttonClasses';

export type { ButtonVariant, ButtonColor, ButtonSize };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  loading?: boolean;
  /** Icon rendered before the label (18px). */
  startIcon?: ReactNode;
  /** Icon rendered after the label (18px). */
  endIcon?: ReactNode;
}

/** Wrapper that fixes decorative icons to 18px. */
export function ButtonIcon({ children }: { children: ReactNode }) {
  return <span className="inline-flex shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]">{children}</span>;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'contained', color = 'primary', size = 'medium', loading = false, startIcon, endIcon, disabled, className, type = 'button', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(buttonClasses({ variant, color, size }), className)}
      {...rest}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {startIcon && <ButtonIcon>{startIcon}</ButtonIcon>}
      {children}
      {endIcon && <ButtonIcon>{endIcon}</ButtonIcon>}
    </button>
  );
});
