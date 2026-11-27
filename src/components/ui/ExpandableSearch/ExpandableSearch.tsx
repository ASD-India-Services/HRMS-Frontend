import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Iconify } from '@/components/Iconify';
import { cx } from '../cx';

export interface ExpandableSearchProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  'aria-label': string;
  className?: string;
  inputClassName?: string;
  inputSize?: 'small' | 'medium';
}

/** Compact search trigger that expands into the standard search input on demand. */
export function ExpandableSearch({
  value,
  onChange,
  placeholder = 'Search...',
  'aria-label': ariaLabel,
  className,
  inputClassName,
  inputSize = 'medium',
}: ExpandableSearchProps) {
  const [expanded, setExpanded] = useState(Boolean(value));
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) setExpanded(true);
  }, [value]);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const closeWhenOutside = (event: MouseEvent) => {
      if (!value && wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', closeWhenOutside);
    return () => document.removeEventListener('mousedown', closeWhenOutside);
  }, [expanded, value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.currentTarget.blur();
      setExpanded(false);
    }
  };

  return (
    <div ref={wrapperRef} className={cx('relative h-10 shrink-0 transition-[width] duration-200 ease-out', expanded ? 'w-64 md:w-[28rem]' : 'w-10', className)}>
      <button
        type="button"
        aria-label={`Open ${ariaLabel.toLowerCase()}`}
        aria-expanded={expanded}
        tabIndex={expanded ? -1 : 0}
        onClick={() => setExpanded(true)}
        className={cx(
          'absolute left-0 top-0 z-10 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-divider bg-surface-paper text-ink-secondary transition-colors hover:bg-surface-neutral focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-main',
          expanded && 'pointer-events-none opacity-0',
        )}
      >
        <Iconify icon="search" width={21} />
      </button>
      <div
        className={cx(
          'absolute inset-0 h-10 overflow-hidden transition-opacity duration-200 ease-out',
          expanded ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div className="flex h-10 w-full items-center gap-2 rounded-lg border border-grey-500/30 bg-surface-paper px-3">
          <Iconify icon="search" width={19} className="shrink-0 text-ink-disabled" />
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label={ariaLabel}
            tabIndex={expanded ? 0 : -1}
            className={cx('h-full min-w-0 flex-1 bg-transparent text-sm text-ink-primary placeholder:text-ink-disabled focus:outline-none', inputSize === 'small' && 'text-xs', inputClassName)}
          />
        </div>
      </div>
    </div>
  );
}
