import { forwardRef, type InputHTMLAttributes } from 'react';
import { cx } from '../cx';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/** Checkbox input. Extends native input props. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cx(
        'h-4 w-4 rounded-sm accent-primary-main border-grey-500 text-primary-main focus:ring-2 focus:ring-primary-main focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...rest}
    />
  );
});
