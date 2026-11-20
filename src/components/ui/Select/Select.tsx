import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cx } from '../cx';
import { FIELD_CLASSES } from '../fieldClasses';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/** Outlined native select. Extends native select props. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx(FIELD_CLASSES, 'h-10 pr-8', className)} {...rest}>
      {children}
    </select>
  );
});
