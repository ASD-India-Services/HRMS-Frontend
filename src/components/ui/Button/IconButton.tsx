/**
 * IconButton — round icon-only button. `aria-label` is required so every icon
 * action has an accessible name. `children` renders after the icon (badges) or replaces it (text glyph).
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Iconify, type IconName } from '@/components/Iconify';
import { cx } from '../cx';
import { buttonClasses, type ButtonColor, type ButtonSize } from './buttonClasses';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  'aria-label': string;
  icon?: IconName;
  /** Extra content: a badge over the icon, or a text glyph when no registry icon fits. */
  children?: ReactNode;
  variant?: 'text' | 'soft';
  color?: ButtonColor;
  size?: ButtonSize;
}

const ICON_PX: Record<ButtonSize, number> = { small: 18, medium: 20, large: 24 };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, variant = 'text', color = 'inherit', size = 'medium', className, type = 'button', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(buttonClasses({ variant, color, size, iconOnly: true }), className)}
      {...rest}
    >
      {icon && <Iconify icon={icon} width={ICON_PX[size]} />}
      {children}
    </button>
  );
});
