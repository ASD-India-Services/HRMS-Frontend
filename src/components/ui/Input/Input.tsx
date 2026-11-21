import { forwardRef, type InputHTMLAttributes } from 'react';
import { cx } from '../cx';
import { FIELD_CLASSES } from '../fieldClasses';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 'small' matches compact toolbars (h-9). Default 'medium' (h-10). */
  inputSize?: 'medium' | 'small';
}

/** Outlined text-like input. Extends native input props. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, inputSize = 'medium', ...rest }, ref) {
  return <input ref={ref} className={cx(FIELD_CLASSES, inputSize === 'small' ? 'h-9' : 'h-10', className)} {...rest} />;
});
