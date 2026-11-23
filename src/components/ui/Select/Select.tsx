import { forwardRef, type SelectHTMLAttributes } from 'react';
import { Iconify } from '@/components/Iconify';
import { cx } from '../cx';
import { FIELD_CLASSES } from '../fieldClasses';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** 'small' matches compact toolbars (h-9). Default 'medium' matches Input (h-10). */
  selectSize?: 'medium' | 'small';
}

/** Layout classes passed via `className` apply to the wrapper so existing call sites keep their spacing. */
const LAYOUT_CLASS = /^(-?m[trblxyse]?-|w-|max-w-|min-w-|flex-|grow|shrink|self-|order-|col-|basis-)/;

/** Outlined native select with a trailing chevron. Extends native select props. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, selectSize = 'medium', children, ...rest },
  ref,
) {
  const classes = (className ?? '').split(/\s+/).filter(Boolean);
  const wrapperClasses = classes.filter((c) => LAYOUT_CLASS.test(c));
  const selectClasses = classes.filter((c) => !LAYOUT_CLASS.test(c));
  const hasWidth = wrapperClasses.some((c) => /^(w-|flex-)/.test(c));
  return (
    <div className={cx('relative', !hasWidth && 'w-full', ...wrapperClasses)}>
      <select
        ref={ref}
        className={cx(FIELD_CLASSES, 'appearance-none pr-9', selectSize === 'small' ? 'h-9' : 'h-10', ...selectClasses)}
        {...rest}
      >
        {children}
      </select>
      <Iconify
        icon="chevron-down"
        width={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-disabled"
      />
    </div>
  );
});
