/**
 * Shared Minimal-style button class map. Used by Button, ButtonLink and IconButton
 * so every button-like control has the same variants, colours and sizes.
 */
export type ButtonVariant = 'contained' | 'outlined' | 'soft' | 'text';
export type ButtonColor = 'inherit' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
export type ButtonSize = 'small' | 'medium' | 'large';

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

const ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  small: 'h-[30px] w-[30px] text-[13px]',
  medium: 'h-9 w-9 text-sm',
  large: 'h-12 w-12 text-[15px]',
};

const BASE_CLASSES =
  'inline-flex shrink-0 items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export interface ButtonClassesOptions {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  /** Square, fully rounded icon-only button (used by IconButton). */
  iconOnly?: boolean;
}

/** Class string for a button-like control. */
export function buttonClasses({ variant = 'contained', color = 'primary', size = 'medium', iconOnly = false }: ButtonClassesOptions = {}): string {
  const colorClasses =
    iconOnly && color === 'inherit' && variant === 'text'
      ? 'text-ink-secondary hover:bg-grey-500/[0.08] hover:text-ink-primary focus-visible:ring-grey-500'
      : COLOR_CLASSES[color][variant];
  return [
    BASE_CLASSES,
    iconOnly ? 'rounded-full' : 'gap-1.5 rounded font-bold',
    colorClasses,
    iconOnly ? ICON_SIZE_CLASSES[size] : SIZE_CLASSES[size],
  ].join(' ');
}


