/**
 * Tabs — shared segmented tab control used for status / view filters. Renders role="tablist" with
 * role="tab" Buttons (aria-selected) so existing keyboard and test semantics stay the same.
 */
import type { ReactNode } from 'react';
import { SegmentedButton } from '../SegmentedControl/SegmentedControl';
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
    <div role="tablist" aria-label={rest['aria-label']} className={cx('mt-4 mb-6 flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1', className)}>
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <SegmentedButton
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-current={selected ? 'page' : undefined}
            selected={selected}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </SegmentedButton>
        );
      })}
    </div>
  );
}
