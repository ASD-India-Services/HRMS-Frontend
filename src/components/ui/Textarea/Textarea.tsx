import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cx } from '../cx';
import { FIELD_CLASSES } from '../fieldClasses';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Outlined textarea. Extends native textarea props. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(FIELD_CLASSES, 'py-2', className)} {...rest} />;
});
