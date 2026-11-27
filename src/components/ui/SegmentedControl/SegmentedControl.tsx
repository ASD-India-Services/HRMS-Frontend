import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean;
  role?: string;
  ariaSelected?: boolean;
}

export function SegmentedButton({ selected, role, ariaSelected, className, children, ...props }: SegmentedButtonProps) {
  return (
    <button
      type="button"
      role={role}
      aria-selected={ariaSelected}
      aria-pressed={role === 'tab' ? undefined : selected}
      className={cx(
        'inline-flex min-h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grey-900 focus-visible:ring-offset-2',
        selected
          ? 'border-grey-900 bg-grey-900 text-white hover:bg-grey-800'
          : 'border-grey-300 bg-white text-ink-primary hover:bg-grey-100',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface SegmentedControlProps<T extends string> {
  items: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  'aria-label': string;
  className?: string;
}

export function SegmentedControl<T extends string>({ items, value, onChange, className, ...rest }: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={rest['aria-label']} className={cx('flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1', className)}>
      {items.map((item) => (
        <SegmentedButton key={item.value} selected={item.value === value} onClick={() => onChange(item.value)}>
          {item.label}
        </SegmentedButton>
      ))}
    </div>
  );
}
