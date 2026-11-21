/**
 * Tabs — underlined tab strip used for status / view filters. Renders role="tablist" with
 * role="tab" Buttons (aria-selected) so existing keyboard and test semantics stay the same.
 */
import type { ReactNode } from 'react';
import { Button } from '../Button';
import { cx } from '../cx';

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
}

export interface TabsProps<T extends string> {
  items: ReadonlyArray<TabItem<T>>;
  value: T;
  onChange: (value: T) => void;
  'aria-label'?: string;
  className?: string;
}

export function Tabs<T extends string>({ items, value, onChange, className, ...rest }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={rest['aria-label']} className={cx('mb-6 flex flex-wrap gap-6 border-b border-divider', className)}>
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <Button
            key={item.value}
            role="tab"
            aria-selected={selected}
            aria-current={selected ? 'page' : undefined}
            variant="text"
            color="inherit"
            onClick={() => onChange(item.value)}
            className={cx(
              '-mb-px !h-11 !rounded-none border-b-2 !px-1 !font-semibold hover:!bg-transparent',
              selected ? 'border-primary-main !text-primary-main' : 'border-transparent',
            )}
          >
            {item.label}
          </Button>
        );
      })}
    </div>
  );
}
