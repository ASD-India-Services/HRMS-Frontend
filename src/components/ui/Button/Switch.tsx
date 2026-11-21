/**
 * Switch — on/off toggle. A button with role="switch", so it lives with the button primitives.
 */
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from '../cx';

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'role' | 'onChange'> {
  checked: boolean;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      role="switch"
      aria-checked={checked}
      className={cx(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary-main' : 'bg-grey-500/30',
        className,
      )}
      {...rest}
    >
      <span
        className={cx(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-paper shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
});
