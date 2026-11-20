import { forwardRef, type InputHTMLAttributes } from 'react';
import { cx } from '../cx';
import { FIELD_CLASSES } from '../fieldClasses';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Outlined text-like input. Extends native input props. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(FIELD_CLASSES, 'h-10', className)} {...rest} />;
});
