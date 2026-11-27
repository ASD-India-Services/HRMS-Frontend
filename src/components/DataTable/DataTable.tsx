/**
 * DataTable — Generic, configuration-driven table component
 *
 * Renders a table from ColumnDef[] configuration with support for:
 * - Sortable columns with ascending/descending/none toggle
 * - Row click handler for navigation
 * - Column visibility via the hidden column configuration
 * - Custom cell rendering via column.render function
 * - Loading, empty, and error states delegated to sub-components
 * - Row selection with checkbox column and "select all" toggle
 * - Bulk action toolbar when rows are selected
 *
 * Requirements: 17.1, 17.3, 3.4
 */

import { HRMSTable } from '@/components/DataTable/HRMSTable';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { DataTableProps } from '@/types/datatable';
import { BulkActionToolbar } from './BulkActionToolbar';
import { TableSkeleton, ErrorState } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { Iconify } from '@/components/Iconify';
import { IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { matchColumnFilters, useColumnFilterContext } from './ColumnFilterContext';
import {
  formatDate,
  formatTime,
  formatDateTime,
  isIsoDateString,
  isIsoDateTimeString,
} from '@/utils/formatters';
import { useAppFormatting } from '@/hooks/useAppFormatting';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  key: string;
  direction: SortDirection;
}

function allFilterLabel(label: string): string {
  if (/^all\b/i.test(label)) return label;
  if (/s$/i.test(label)) return `All ${label}`;
  if (/[^aeiou]y$/i.test(label)) return `All ${label.slice(0, -1)}ies`;
  return `All ${label}${/(ss|x|ch|sh)$/i.test(label) ? 'es' : 's'}`;
}

/**
 * Get a nested value from an object by key path (supports dot notation)
 */
function getNestedValue<T>(row: T, key: string): unknown {
  const keys = key.split('.');
  let value: unknown = row;
  for (const k of keys) {
    if (value == null) return undefined;
    value = (value as Record<string, unknown>)[k];
  }
  return value;
}
/**
 * Automatically format cell values when no custom col.render is provided,
 * detecting ISO date / datetime strings according to HR Settings.
 */
function formatAutoCellValue(
  value: unknown,
  key: string,
  dateFormat?: string,
  timeFormat?: string,
): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  const keyLower = key.toLowerCase();

  // 1. If value is a Date instance
  if (value instanceof Date) {
    if (keyLower.endsWith('_at') || keyLower.includes('time') || keyLower.includes('datetime')) {
      return formatDateTime(value, dateFormat, timeFormat);
    }
    return formatDate(value, dateFormat);
  }

  // 2. ISO Date (e.g., YYYY-MM-DD or midnight ISO string)
  if (isIsoDateString(value)) {
    return formatDate(value as string, dateFormat);
  }

  // 3. ISO DateTime (e.g., YYYY-MM-DDTHH:MM...)
  if (isIsoDateTimeString(value)) {
    if (keyLower.endsWith('_at') || keyLower.includes('time') || keyLower.includes('datetime')) {
      return formatDateTime(value as string, dateFormat, timeFormat);
    }
    return formatDate(value as string, dateFormat);
  }

  // 4. Date-related column keys
  if (
    keyLower === 'date' ||
    keyLower.endsWith('_date') ||
    keyLower.startsWith('date_') ||
    keyLower.endsWith('_on') ||
    keyLower.startsWith('effective_') ||
    keyLower.startsWith('valid_') ||
    keyLower.startsWith('period_') ||
    keyLower === 'dob' ||
    keyLower.includes('dob')
  ) {
    if (typeof value === 'string' && value.length >= 8 && !isNaN(Date.parse(value))) {
      return formatDate(value, dateFormat);
    }
  }

  // 5. Time-related column keys
  if (
    keyLower === 'time' ||
    keyLower.endsWith('_time') ||
    keyLower.startsWith('time_') ||
    keyLower === 'check_in' ||
    keyLower === 'check_out'
  ) {
    if (typeof value === 'string' && /^\d{1,2}:\d{2}(?::\d{2})?/.test(value.trim())) {
      return formatTime(value, timeFormat);
    }
  }

  return String(value);
}

export function DataTable<T extends Record<string, unknown>>({
  queryResult,
  columns,
  onRowClick,
  selectable,
  bulkActions,
}: DataTableProps<T>) {
  const { dateFormat, timeFormat } = useAppFormatting();
  const filterContext = useColumnFilterContext();
  const [sort, setSort] = useState<SortState>({ key: '', direction: null });
  const [tableSearch, setTableSearch] = useState('');
  const [openColumnFilter, setOpenColumnFilter] = useState<string | null>(null);
  const [filterDraft, setFilterDraft] = useState<{ filterKey: string; values: string[] } | null>(null);
  const [filterOptionSearch, setFilterOptionSearch] = useState('');
  const [filterMenuPosition, setFilterMenuPosition] = useState({ top: 0, left: 0 });
  const filterRootRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const hiddenColumns = useMemo(
    () => new Set(columns.filter((column) => column.hidden).map((column) => String(column.key))),
    [columns],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Visible columns: exclude columns hidden in the table configuration.
  const visibleColumns = useMemo(
    () => columns.filter((col) => !hiddenColumns.has(String(col.key))),
    [columns, hiddenColumns]
  );

  const rawData = queryResult.data?.results ?? [];

  useEffect(() => {
    if (!filterContext) return;
    const availableColumns = rawData.length > 0
      ? visibleColumns.map((column) => ({ key: String(column.key), header: String(column.header) }))
      : [];
    filterContext.setColumns(availableColumns);
  }, [filterContext?.setColumns, rawData.length, visibleColumns]);

  useEffect(() => {
    if (!openColumnFilter) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!filterRootRef.current?.contains(target) && !filterMenuRef.current?.contains(target)) {
        setOpenColumnFilter(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenColumnFilter(null);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openColumnFilter]);

  const columnFilters = filterContext?.filterBar
    ? matchColumnFilters(filterContext.filterBar.filters, visibleColumns.map((column) => ({
        key: String(column.key),
        header: String(column.header),
      })))
    : new Map();

  // Get data from query result
  const isLoading = queryResult.isLoading;
  const isError = queryResult.isError;

  // Client-side search filter: matches search term against all visible column values
  const filteredData = useMemo(() => {
    if (!tableSearch.trim()) return rawData;
    const term = tableSearch.toLowerCase();
    return rawData.filter((row) =>
      visibleColumns.some((col) => {
        const value = getNestedValue(row, String(col.key));
        if (value == null) return false;
        return String(value).toLowerCase().includes(term);
      })
    );
  }, [rawData, tableSearch, visibleColumns]);

  // Client-side sort: sorts filtered data by selected column and direction
  const data = useMemo(() => {
    if (!sort.key || !sort.direction) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      const aVal = getNestedValue(a, sort.key);
      const bVal = getNestedValue(b, sort.key);
      // Handle nulls
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      // Compare actual numbers numerically, but keep numeric-looking text
      // (such as IDs with leading zeroes) in string order.
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        const aNum = Number.isFinite(aVal) ? aVal : 0;
        const bNum = Number.isFinite(bVal) ? bVal : 0;
        return sort.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const comparison = aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' });
      if (comparison !== 0) return sort.direction === 'asc' ? comparison : -comparison;
      return 0;
    });
    return sorted;
  }, [filteredData, sort.key, sort.direction]);

  // Row IDs for selection
  const rowIds = useMemo(
    () => data.map((row) => (row as Record<string, unknown>).id as string).filter(Boolean),
    [data]
  );

  // Selection handlers
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(rowIds);
      } else {
        setSelectedIds([]);
      }
    },
    [rowIds]
  );

  const handleSelectRow = useCallback((rowId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        return prev.includes(rowId) ? prev : [...prev, rowId];
      }
      return prev.filter((id) => id !== rowId);
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Determine if all visible rows are selected
  const allSelected = rowIds.length > 0 && rowIds.every((id) => selectedIds.includes(id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  // Sort control bar rendered above the table
  const renderToolbar = () => {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div data-table-filter-slot="true" className="min-w-0 flex-1" />
        <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
          {/* Search input */}
          <div className="relative">
            <Iconify
              icon="search"
              width={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-disabled"
            />
            <Input
              type="text"
              inputSize="medium"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search in table..."
              className="w-56 pl-9 pr-9"
            />
            {tableSearch && (
              <IconButton
                icon="close"
                size="small"
                onClick={() => setTableSearch('')}
                className="absolute right-1 top-1/2 -translate-y-1/2"
                aria-label="Clear search"
              />
            )}
          </div>
          <div data-table-action-slot="true" className="flex shrink-0 items-center gap-2" />
        </div>
      </div>
    );
  };

  // Checkbox cell renderer
  const renderCheckboxHeader = () => (
    <th className="px-4 py-3 w-10">
      <input
        type="checkbox"
        checked={allSelected}
        ref={(el) => {
          if (el) el.indeterminate = someSelected;
        }}
        onChange={(e) => handleSelectAll(e.target.checked)}
        className="h-4 w-4 rounded border-grey-500/30 text-primary-main focus:ring-primary-main"
        aria-label="Select all rows"
      />
    </th>
  );

  const renderCheckboxCell = (rowId: string) => (
    <td className="px-4 py-3 w-10">
      <input
        type="checkbox"
        checked={selectedIds.includes(rowId)}
        onChange={(e) => {
          e.stopPropagation();
          handleSelectRow(rowId, e.target.checked);
        }}
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4 rounded border-grey-500/30 text-primary-main focus:ring-primary-main"
        aria-label={`Select row ${rowId}`}
      />
    </td>
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="w-full">
        {renderToolbar()}
        <TableSkeleton columns={visibleColumns.length} rows={5} />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="w-full">
        {renderToolbar()}
        <ErrorState onRetry={() => queryResult.refetch()} />
      </div>
    );
  }

  // Empty state — hide toolbar when no raw data exists (not filtered-empty)
  if (rawData.length === 0) {
    return (
      <div className="w-full">
        <Card>
          <EmptyState
            module=""
            title="No records found"
            description="Try adjusting your filters or adding new data."
          />
        </Card>
      </div>
    );
  }

  // Filtered empty (search produced no results but raw data exists)
  if (data.length === 0) {
    return (
      <div className="w-full">
        {renderToolbar()}
        <Card>
          <EmptyState
            module=""
            title="No results found"
            description="No results match your search. Try a different term."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      {renderToolbar()}

      {/* Bulk action toolbar — shown when rows are selected */}
      {selectable && selectedIds.length > 0 && bulkActions && bulkActions.length > 0 && (
        <BulkActionToolbar
          selectedIds={selectedIds}
          bulkActions={bulkActions}
          onClear={handleClearSelection}
        />
      )}

      <Card className="overflow-x-auto rounded-xl shadow-sm">
        <HRMSTable className="min-w-full divide-y divide-divider">
          <thead className="bg-surface-neutral">
            <tr>
              {selectable && renderCheckboxHeader()}
              {visibleColumns.map((col) => {
                const columnKey = String(col.key);
                const filter = columnFilters.get(columnKey);
                const selectedFilterValue = filter
                  ? filterContext?.filterBar?.values[filter.key] ?? ''
                  : '';
                const filterOptions = filter
                  ? [
                      {
                        value: '',
                        label: filter.options?.find((option) => option.value === '')?.label
                          ?? allFilterLabel(filter.label),
                      },
                      ...(filter.options ?? []).filter((option) => option.value !== ''),
                    ]
                  : [];
                const selectableFilterOptions = filterOptions.filter((option) => option.value !== '');
                const appliedFilterValues = selectedFilterValue ? selectedFilterValue.split(',').filter(Boolean) : [];
                const draftFilterValues = filterDraft?.filterKey === filter?.key
                  ? filterDraft?.values ?? appliedFilterValues
                  : appliedFilterValues;
                const isMultiSelect = filter?.type === 'multi-select';
                const areAllOptionsSelected = isMultiSelect
                  ? draftFilterValues.length === 0 || draftFilterValues.length === selectableFilterOptions.length
                  : draftFilterValues.length === 0;
                const visibleFilterOptions = selectableFilterOptions.filter((option) =>
                  option.label.toLowerCase().includes(filterOptionSearch.trim().toLowerCase()),
                );
                const isActionsColumn = typeof col.header === 'string' && /\bactions?\b/i.test(col.header);

                return (
                  <th
                    key={columnKey}
                    className={`px-4 py-3 text-left text-sm font-semibold text-ink-secondary ${isActionsColumn ? 'w-20 text-right' : ''}`}
                  >
                    <div className={`flex w-full items-center gap-1.5 ${isActionsColumn ? 'justify-end' : ''}`}>
                      <span>{col.header}</span>
                      {filter && filterContext?.filterBar && (
                        <div className="relative inline-flex" ref={openColumnFilter === columnKey ? filterRootRef : null}>
                          <button
                            type="button"
                            aria-label={`Filter ${filter.label}`}
                            aria-expanded={openColumnFilter === columnKey}
                            className={`relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-main ${
                              selectedFilterValue
                                ? 'bg-primary-main/10 text-primary-main'
                                : 'text-ink-disabled hover:bg-transparent hover:text-ink-disabled'
                            }`}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (openColumnFilter === columnKey) {
                                setOpenColumnFilter(null);
                              } else {
                                setFilterDraft({ filterKey: filter.key, values: appliedFilterValues });
                                setFilterOptionSearch('');
                                const bounds = event.currentTarget.getBoundingClientRect();
                                const menuHeight = 420;
                                const left = Math.max(8, Math.min(bounds.left, window.innerWidth - 268));
                                const top = window.innerHeight - bounds.bottom < menuHeight && bounds.top > menuHeight
                                  ? bounds.top - menuHeight - 4
                                  : bounds.bottom + 4;
                                setFilterMenuPosition({ top, left });
                                setOpenColumnFilter(columnKey);
                              }
                            }}
                          >
                            <Iconify icon="filter" width={16} />
                            {selectedFilterValue && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary-main" />}
                          </button>
                          {openColumnFilter === columnKey && (
                            createPortal(<div
                              ref={filterMenuRef}
                              role="dialog"
                              aria-label={`${filter.label} filter options`}
                              style={{ position: 'fixed', top: filterMenuPosition.top, left: filterMenuPosition.left }}
                              className="z-[1000] w-[260px] overflow-hidden rounded-xl border border-divider bg-surface-paper p-3 text-left shadow-dropdown"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <div className="border-b border-divider pb-2">
                                <button
                                  type="button"
                                  className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-ink-primary hover:bg-surface-neutral"
                                  onClick={() => {
                                    setSort({ key: columnKey, direction: 'asc' });
                                    setOpenColumnFilter(null);
                                  }}
                                >
                                  <span className="text-base leading-none text-ink-secondary" aria-hidden="true">↕</span>
                                  Sort A → Z
                                </button>
                                <button
                                  type="button"
                                  className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-ink-primary hover:bg-surface-neutral"
                                  onClick={() => {
                                    setSort({ key: columnKey, direction: 'desc' });
                                    setOpenColumnFilter(null);
                                  }}
                                >
                                  <span className="text-base leading-none text-ink-secondary" aria-hidden="true">↕</span>
                                  Sort Z → A
                                </button>
                              </div>

                              <label className="relative my-2 block">
                                <Iconify
                                  icon="search"
                                  width={16}
                                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-disabled"
                                />
                                <input
                                  type="search"
                                  value={filterOptionSearch}
                                  onChange={(event) => setFilterOptionSearch(event.target.value)}
                                  placeholder={`Search ${filter.label.toLowerCase()}...`}
                                  aria-label={`Search ${filter.label.toLowerCase()} options`}
                                  className="h-9 w-full rounded-lg border border-divider bg-surface-paper pl-9 pr-3 text-sm text-ink-primary placeholder:text-ink-disabled focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main"
                                />
                              </label>

                              <div className="max-h-48 overflow-y-auto border-b border-divider pb-2">
                                <label className="flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-1.5 text-sm font-medium text-ink-primary hover:bg-surface-neutral">
                                  <input
                                    type="checkbox"
                                    checked={areAllOptionsSelected}
                                    onChange={() => {
                                      if (isMultiSelect && !areAllOptionsSelected) {
                                        setFilterDraft({
                                          filterKey: filter.key,
                                          values: selectableFilterOptions.map((option) => option.value),
                                        });
                                      } else {
                                        setFilterDraft({ filterKey: filter.key, values: [] });
                                      }
                                    }}
                                    className="h-4 w-4 rounded border-divider accent-primary-main text-primary-main focus:ring-primary-main"
                                  />
                                  Select all
                                </label>
                                {visibleFilterOptions.length === 0 ? (
                                  <p className="px-2 py-3 text-sm text-ink-disabled">
                                    {selectableFilterOptions.length === 0 ? 'No options available' : 'No matching options'}
                                  </p>
                                ) : visibleFilterOptions.map((option) => {
                                  const isChecked = draftFilterValues.includes(option.value);
                                  return (
                                    <label
                                      key={option.value}
                                      className="flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-1.5 text-sm text-ink-secondary hover:bg-surface-neutral"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          const nextValues = isMultiSelect
                                            ? isChecked
                                              ? draftFilterValues.filter((value) => value !== option.value)
                                              : [...draftFilterValues, option.value]
                                            : isChecked ? [] : [option.value];
                                          setFilterDraft({ filterKey: filter.key, values: nextValues });
                                        }}
                                        className="h-4 w-4 rounded border-divider accent-primary-main text-primary-main focus:ring-primary-main"
                                      />
                                      {option.label}
                                    </label>
                                  );
                                })}
                              </div>

                              <div className="flex gap-2 pt-2">
                                <button
                                  type="button"
                                  className="h-9 flex-1 rounded-lg border border-divider bg-surface-paper px-2 text-xs font-semibold text-ink-primary hover:bg-surface-neutral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-main"
                                  onClick={() => {
                                    filterContext.filterBar?.onChange(filter.key, '');
                                    setFilterDraft({ filterKey: filter.key, values: [] });
                                    setOpenColumnFilter(null);
                                  }}
                                >
                                  Clear filter
                                </button>
                                <button
                                  type="button"
                                  className="h-9 flex-1 rounded-lg bg-primary-main px-2 text-xs font-semibold text-primary-contrast hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:ring-offset-2"
                                  onClick={() => {
                                    const allMultiOptionsSelected = isMultiSelect
                                      && selectableFilterOptions.length > 0
                                      && draftFilterValues.length === selectableFilterOptions.length;
                                    const value = isMultiSelect && !allMultiOptionsSelected
                                      ? draftFilterValues.join(',')
                                      : isMultiSelect || areAllOptionsSelected
                                        ? ''
                                        : draftFilterValues[0] ?? '';
                                    filterContext.filterBar?.onChange(filter.key, value);
                                    setOpenColumnFilter(null);
                                  }}
                                >
                                  Apply filter
                                </button>
                              </div>
                            </div>, document.body)
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-surface-paper divide-y divide-divider">
            {data.map((row, rowIdx) => {
              const rowId = (row as Record<string, unknown>).id as string;
              const isSelected = selectable && rowId && selectedIds.includes(rowId);
              return (
                <tr
                  key={rowId ?? rowIdx}
                  className={`${isSelected ? 'bg-primary-lighter' : ''} ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable && rowId && renderCheckboxCell(rowId)}
                  {visibleColumns.map((col) => {
                    const value = getNestedValue(row, String(col.key));
                    const rendered = col.render ? col.render(value, row) : formatAutoCellValue(value, String(col.key), dateFormat, timeFormat);
                    const isActionsColumn = typeof col.header === 'string' && /\bactions?\b/i.test(col.header);
                    return (
                      <td
                        key={String(col.key)}
                        className={`px-4 py-3 text-sm text-ink-primary whitespace-nowrap ${
                          isActionsColumn ? 'w-20 text-right' : ''
                        }`}
                      >
                        {rendered}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </HRMSTable>
      </Card>
    </div>
  );
}
