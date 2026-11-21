/**
 * DataTable — Generic, configuration-driven table component
 *
 * Renders a table from ColumnDef[] configuration with support for:
 * - Sortable columns with ascending/descending/none toggle
 * - Row click handler for navigation
 * - Column visibility via hidden prop and user-controlled toggles
 * - Custom cell rendering via column.render function
 * - Loading, empty, and error states delegated to sub-components
 * - Row selection with checkbox column and "select all" toggle
 * - Bulk action toolbar when rows are selected
 *
 * Requirements: 17.1, 17.3, 3.4
 */

import { useState, useMemo, useCallback } from 'react';
import type { ColumnDef, DataTableProps } from '@/types/datatable';
import { ColumnVisibilityMenu } from './ColumnVisibilityMenu';
import { BulkActionToolbar } from './BulkActionToolbar';
import { TableSkeleton, ErrorState } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { Iconify } from '@/components/Iconify';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  key: string;
  direction: SortDirection;
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

export function DataTable<T extends Record<string, unknown>>({
  queryResult,
  columns,
  onRowClick,
  selectable,
  bulkActions,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>({ key: '', direction: null });
  const [tableSearch, setTableSearch] = useState('');
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
    // Initialize from columns that have hidden: true
    const hidden = new Set<string>();
    for (const col of columns) {
      if (col.hidden) {
        hidden.add(String(col.key));
      }
    }
    return hidden;
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Visible columns: exclude hidden by default + user-toggled columns
  const visibleColumns = useMemo(
    () => columns.filter((col) => !hiddenColumns.has(String(col.key))),
    [columns, hiddenColumns]
  );

  // Sortable columns for the sort dropdown
  const sortableColumns = useMemo(
    () => columns.filter((col) => col.sortable),
    [columns]
  );

  // Handle sort change from dropdown
  const handleSortColumnChange = useCallback((columnKey: string) => {
    if (!columnKey) {
      setSort({ key: '', direction: null });
    } else {
      setSort((prev) => ({
        key: columnKey,
        direction: prev.key === columnKey ? prev.direction : 'asc',
      }));
    }
  }, []);

  const handleSortDirectionToggle = useCallback(() => {
    setSort((prev) => {
      if (!prev.key) return prev;
      return {
        key: prev.key,
        direction: prev.direction === 'asc' ? 'desc' : 'asc',
      };
    });
  }, []);

  // Column visibility toggle handler
  const handleColumnVisibilityChange = useCallback((columnKey: string, visible: boolean) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (visible) {
        next.delete(columnKey);
      } else {
        next.add(columnKey);
      }
      return next;
    });
  }, []);

  // Get data from query result
  const rawData = queryResult.data?.results ?? [];
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
      // Numeric comparison
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sort.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return sort.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sort.direction === 'asc' ? 1 : -1;
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
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        {/* Left side: Search + Sort */}
        <div className="flex items-center gap-3">
          {/* Search input */}
          <div className="relative">
            <Iconify
              icon="search"
              width={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-disabled"
            />
            <Input
              type="text"
              inputSize="small"
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
          {/* Sort controls */}
          {sortableColumns.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-ink-secondary font-medium">Sort:</label>
              <Select
                selectSize="small"
                value={sort.key}
                onChange={(e) => handleSortColumnChange(e.target.value)}
                aria-label="Sort by"
                className="w-40"
              >
                <option value="">None</option>
                {sortableColumns.map((col) => (
                  <option key={String(col.key)} value={String(col.key)}>
                    {col.header}
                  </option>
                ))}
              </Select>
              {sort.key && (
                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  startIcon={<Iconify icon={sort.direction === 'asc' ? 'chevron-up' : 'chevron-down'} />}
                  onClick={handleSortDirectionToggle}
                  aria-label={sort.direction === 'asc' ? 'Sort ascending' : 'Sort descending'}
                >
                  {sort.direction === 'asc' ? 'A→Z' : 'Z→A'}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Right side: Column visibility */}
        <ColumnVisibilityMenu
          columns={columns}
          hiddenColumns={hiddenColumns}
          onToggle={handleColumnVisibilityChange}
        />
      </Card>
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

      <Card className="overflow-x-auto">
        <table className="min-w-full divide-y divide-divider">
          <thead className="bg-surface-neutral">
            <tr>
              {selectable && renderCheckboxHeader()}
              {visibleColumns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-4 py-3 text-left text-sm font-semibold text-ink-secondary"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-surface-paper divide-y divide-divider">
            {data.map((row, rowIdx) => {
              const rowId = (row as Record<string, unknown>).id as string;
              const isSelected = selectable && rowId && selectedIds.includes(rowId);
              return (
                <tr
                  key={rowId ?? rowIdx}
                  className={`${
                    isSelected
                      ? 'bg-primary-lighter'
                      : onRowClick
                        ? 'cursor-pointer hover:bg-primary-main/10 transition-colors'
                        : 'hover:bg-surface-neutral transition-colors'
                  } ${isSelected && onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable && rowId && renderCheckboxCell(rowId)}
                  {visibleColumns.map((col) => {
                    const value = getNestedValue(row, String(col.key));
                    const rendered = col.render ? col.render(value, row) : String(value ?? '');
                    return (
                      <td
                        key={String(col.key)}
                        className="px-4 py-3 text-sm text-ink-primary whitespace-nowrap"
                      >
                        {rendered}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
