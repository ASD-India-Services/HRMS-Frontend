/**
 * Button — Minimal-style button. Extends native button props so handlers
 * and attributes pass through unchanged.
 */
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from '../cx';

export type ButtonVariant = 'contained' | 'outlined' | 'soft' | 'text';
export type ButtonColor = 'inherit' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  loading?: boolean;
}

const COLOR_CLASSES: Record<ButtonColor, Record<ButtonVariant, string>> = {
  inherit: {
    contained: 'bg-grey-800 text-primary-contrast hover:bg-grey-700 focus-visible:ring-grey-500',
    outlined: 'border border-grey-500/30 text-ink-primary hover:bg-grey-500/10 focus-visible:ring-grey-500',
    soft: 'bg-grey-500/10 text-ink-primary hover:bg-grey-500/20 focus-visible:ring-grey-500',
    text: 'text-ink-secondary hover:bg-grey-500/10 hover:text-ink-primary focus-visible:ring-grey-500',
  },
  primary: {
    contained: 'bg-primary-main text-primary-contrast hover:bg-primary-dark focus-visible:ring-primary-main',
    outlined: 'border border-primary-main/50 text-primary-main hover:bg-primary-main/10 focus-visible:ring-primary-main',
    soft: 'bg-primary-main/10 text-primary-dark hover:bg-primary-main/20 focus-visible:ring-primary-main',
    text: 'text-primary-main hover:bg-primary-main/10 focus-visible:ring-primary-main',
  },
  secondary: {
    contained: 'bg-secondary-main text-secondary-contrast hover:bg-secondary-dark focus-visible:ring-secondary-main',
    outlined: 'border border-secondary-main/50 text-secondary-main hover:bg-secondary-main/10 focus-visible:ring-secondary-main',
    soft: 'bg-secondary-main/10 text-secondary-dark hover:bg-secondary-main/20 focus-visible:ring-secondary-main',
    text: 'text-secondary-main hover:bg-secondary-main/10 focus-visible:ring-secondary-main',
  },
  info: {
    contained: 'bg-info-main text-info-contrast hover:bg-info-dark focus-visible:ring-info-main',
    outlined: 'border border-info-main/50 text-info-main hover:bg-info-main/10 focus-visible:ring-info-main',
    soft: 'bg-info-main/10 text-info-dark hover:bg-info-main/20 focus-visible:ring-info-main',
    text: 'text-info-main hover:bg-info-main/10 focus-visible:ring-info-main',
  },
  success: {
    contained: 'bg-success-main text-success-contrast hover:bg-success-dark focus-visible:ring-success-main',
    outlined: 'border border-success-main/50 text-success-main hover:bg-success-main/10 focus-visible:ring-success-main',
    soft: 'bg-success-main/10 text-success-dark hover:bg-success-main/20 focus-visible:ring-success-main',
    text: 'text-success-main hover:bg-success-main/10 focus-visible:ring-success-main',
  },
  warning: {
    contained: 'bg-warning-main text-warning-contrast hover:bg-warning-dark hover:text-primary-contrast focus-visible:ring-warning-main',
    outlined: 'border border-warning-main/50 text-warning-dark hover:bg-warning-main/10 focus-visible:ring-warning-main',
    soft: 'bg-warning-main/10 text-warning-dark hover:bg-warning-main/20 focus-visible:ring-warning-main',
    text: 'text-warning-dark hover:bg-warning-main/10 focus-visible:ring-warning-main',
  },
  error: {
    contained: 'bg-error-main text-error-contrast hover:bg-error-dark focus-visible:ring-error-main',
    outlined: 'border border-error-main/50 text-error-main hover:bg-error-main/10 focus-visible:ring-error-main',
    soft: 'bg-error-main/10 text-error-dark hover:bg-error-main/20 focus-visible:ring-error-main',
    text: 'text-error-main hover:bg-error-main/10 focus-visible:ring-error-main',
  },
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  small: 'h-[30px] px-2.5 text-[13px]',
  medium: 'h-9 px-4 text-sm',
  large: 'h-12 px-5 text-[15px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'contained', color = 'primary', size = 'medium', loading = false, disabled, className, type = 'button', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded font-bold transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        COLOR_CLASSES[color][variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
});
