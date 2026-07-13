/**
 * FilterBar — Renders filter inputs for DataTable from FilterConfig[]
 *
 * Supports filter types: search, select, date-range, multi-select
 * Integrates with useFilterSync for URL query string synchronization.
 * Search inputs are debounced by 300ms.
 *
 * Requirements: 17.2, 3.3
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { FilterConfig } from '@/types/datatable';

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
  const hasActiveFilters = Object.values(values).some((v) => v !== '');

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {filters.map((filter) => (
        <FilterInput
          key={filter.key}
          config={filter}
          value={values[filter.key] ?? ''}
          onChange={(value) => onChange(filter.key, value)}
        />
      ))}

      {hasActiveFilters && onClearAll && (
        <button
          onClick={onClearAll}
          className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

interface FilterInputProps {
  config: FilterConfig;
  value: string;
  onChange: (value: string) => void;
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

    case 'select':
      return (
        <div className="flex flex-col">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={config.label}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">{config.label}</option>
            {config.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );

    case 'multi-select':
      return (
        <div className="flex flex-col">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={config.label}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">{config.label}</option>
            {config.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
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
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-500">to</span>
          <input
            type="date"
            value={value.split(',')[1] ?? ''}
            onChange={(e) => {
              const start = value.split(',')[0] ?? '';
              onChange(`${start},${e.target.value}`);
            }}
            aria-label={`${config.label} end date`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
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
        className="rounded-md border border-gray-300 bg-white pl-9 pr-3 py-1.5 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56"
      />
    </div>
  );
}
