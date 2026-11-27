/**
 * FilterBar — Renders filter inputs for DataTable from FilterConfig[]
 *
 * Supports filter types: search, select, date-range, multi-select
 * Integrates with useFilterSync for URL query string synchronization.
 * Search inputs are debounced by 300ms.
 *
 * Requirements: 17.2, 3.3
 */

import { useState, useEffect, useRef, useCallback, useId, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQueries } from '@tanstack/react-query';
import type { FilterConfig } from '@/types/datatable';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { SegmentedControl } from '@/components/ui/SegmentedControl/SegmentedControl';
import { matchColumnFilters, useColumnFilterContext } from './ColumnFilterContext';
import api from '@/lib/api';

export interface FilterBarProps {
  /** Filter configuration array */
  filters: FilterConfig[];
  /** Current filter values */
  values: Record<string, string>;
  /** Callback when a filter value changes */
  onChange: (key: string, value: string) => void;
  /** Callback to clear all filters */
  onClearAll?: () => void;
}

function resolveOptions(data: unknown, filter: FilterConfig) {
  const items = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { results?: unknown[] }).results)
      ? (data as { results: unknown[] }).results
      : [];

  return items.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const configuredLabel = filter.optionsQuery?.labelKey;
    const labelValue = typeof configuredLabel === 'function'
      ? configuredLabel(record)
      : (configuredLabel ? record[configuredLabel] : undefined)
        ?? record.name
        ?? record.title
        ?? record.label
        ?? record.id;
    const optionValue = (filter.optionsQuery?.valueKey ? record[filter.optionsQuery.valueKey] : undefined)
      ?? record.value
      ?? record.id
      ?? record.pk;
    if (labelValue == null || optionValue == null) return [];
    return [{ value: String(optionValue), label: String(labelValue) }];
  });
}

/**
 * Debounce hook for search input
 */
function useDebouncedCallback(callback: (value: string) => void, delay: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedFn = useCallback(
    (value: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        callback(value);
      }, delay);
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return debouncedFn;
}

export function FilterBar({ filters, values, onChange, onClearAll }: FilterBarProps) {
  const filterContext = useColumnFilterContext();
  const filterBarId = useId();
  const optionQueries = useQueries({
    queries: filters.map((filter) => ({
      queryKey: filter.optionsQuery?.queryKey ?? ['filter-options', filter.key],
      enabled: Boolean(filter.optionsQuery?.endpoint),
      queryFn: async () => {
        if (!filter.optionsQuery?.endpoint) return filter.options ?? [];
        const response = await api.get(filter.optionsQuery.endpoint);
        return resolveOptions(response.data, filter);
      },
    })),
  });
  const resolvedFilters = useMemo(
    () => filters.map((filter, index) => filter.optionsQuery
      ? { ...filter, options: optionQueries[index]?.data ?? filter.options ?? [] }
      : filter),
    [filters, ...optionQueries.map((query) => query.data)],
  );
  const columnFilterKeys = new Set(
    Array.from(matchColumnFilters(resolvedFilters, filterContext?.columns ?? []).values(), (filter) => filter.key),
  );
  // Skip search-type filters — DataTable has a built-in search bar
  const nonSearchFilters = resolvedFilters.filter((f) => f.type !== 'search' && !columnFilterKeys.has(f.key));
  const hasActiveFilters = Object.values(values).some((v) => v !== '');
  const fallbackRef = useRef<HTMLDivElement>(null);
  const toolbarTargetRef = useRef<HTMLElement | null>(null);
  const [toolbarTarget, setToolbarTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!filterContext) return;
    filterContext.registerFilterBar({ id: filterBarId, filters: resolvedFilters, values, onChange });
    return () => filterContext.unregisterFilterBar(filterBarId);
  }, [filterContext?.registerFilterBar, filterContext?.unregisterFilterBar, filterBarId, resolvedFilters, values, onChange]);

  useEffect(() => {
    const page = fallbackRef.current?.closest<HTMLElement>('[data-page-container]');
    if (!page) return;

    const findToolbar = () => {
      if (toolbarTargetRef.current && !toolbarTargetRef.current.isConnected) {
        toolbarTargetRef.current = null;
        setToolbarTarget(null);
      }
      const target = page.querySelector<HTMLElement>('[data-table-filter-slot]');
      if (target && target !== toolbarTargetRef.current) {
        toolbarTargetRef.current = target;
        setToolbarTarget(target);
      }
    };

    findToolbar();
    const observer = new MutationObserver(findToolbar);
    observer.observe(page, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Don't render anything if only search filters exist
  if (nonSearchFilters.length === 0 && !hasActiveFilters) return null;

  const controls = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {nonSearchFilters.map((filter) => (
        <FilterInput
          key={filter.key}
          config={filter}
          value={values[filter.key] ?? ''}
          onChange={(value) => onChange(filter.key, value)}
        />
      ))}

      {hasActiveFilters && onClearAll && (
        <Button variant="text" color="inherit" size="small" onClick={onClearAll}>
          Clear all
        </Button>
      )}
    </div>
  );

  return toolbarTarget
    ? createPortal(controls, toolbarTarget)
    : <div ref={fallbackRef} className="mb-4">{controls}</div>;
}

interface FilterInputProps {
  config: FilterConfig;
  value: string;
  onChange: (value: string) => void;
}

/** "Status" -> "All Statuses": one placeholder pattern for every filter select. */
function allLabel(label: string): string {
  if (/^all\b/i.test(label)) return label;
  if (/s$/i.test(label)) return `All ${label}`;
  if (/[^aeiou]y$/i.test(label)) return `All ${label.slice(0, -1)}ies`;
  return `All ${label}${/(ss|x|ch|sh)$/i.test(label) ? 'es' : 's'}`;
}
function FilterInput({ config, value, onChange }: FilterInputProps) {
  const debounceMs = config.debounceMs ?? 300;

  switch (config.type) {
    case 'search':
      return (
        <SearchInput
          label={config.label}
          value={value}
          onChange={onChange}
          debounceMs={debounceMs}
        />
      );

    case 'select': {
      const options = config.options ?? [];
      const selectableOptions = options.filter((option) => option.value !== '');
      // Short fixed option sets work better as the shared segmented filter control.
      // Keep larger lists in a select so the toolbar stays compact.
      if (selectableOptions.length > 0 && selectableOptions.length <= 3) {
        const segmentedOptions = [
          { value: '', label: allLabel(config.label) },
          ...selectableOptions,
        ];
        return (
          <SegmentedControl
            items={segmentedOptions}
            value={value}
            onChange={onChange}
            aria-label={config.label}
          />
        );
      }
      return (
        <Select
          selectSize="small"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={config.label}
        >
          <option value="">{allLabel(config.label)}</option>
          {config.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      );
    }

    case 'multi-select':
      return (
        <Select
          selectSize="small"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={config.label}
        >
          <option value="">{allLabel(config.label)}</option>
          {config.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      );

    case 'date-range':
      return (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value.split(',')[0] ?? ''}
            onChange={(e) => {
              const end = value.split(',')[1] ?? '';
              onChange(`${e.target.value},${end}`);
            }}
            aria-label={`${config.label} start date`}
            className="rounded border border-grey-500/30 bg-surface-paper px-3 py-1.5 text-sm text-ink-secondary shadow-card focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main"
          />
          <span className="text-sm text-ink-secondary">to</span>
          <input
            type="date"
            value={value.split(',')[1] ?? ''}
            onChange={(e) => {
              const start = value.split(',')[0] ?? '';
              onChange(`${start},${e.target.value}`);
            }}
            aria-label={`${config.label} end date`}
            className="rounded border border-grey-500/30 bg-surface-paper px-3 py-1.5 text-sm text-ink-secondary shadow-card focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main"
          />
        </div>
      );

    default:
      return null;
  }
}

interface SearchInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  debounceMs: number;
}

function SearchInput({ label, value, onChange, debounceMs }: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const debouncedOnChange = useDebouncedCallback(onChange, debounceMs);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-disabled"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={label}
        aria-label={label}
        className="rounded border border-grey-500/30 bg-surface-paper pl-9 pr-3 py-1.5 text-sm text-ink-secondary shadow-card placeholder:text-ink-disabled focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main w-56"
      />
    </div>
  );
}
