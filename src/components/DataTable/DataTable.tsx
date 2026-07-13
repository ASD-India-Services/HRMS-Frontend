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

  // Toggle sort: none -> asc -> desc -> none
  const handleSort = useCallback((columnKey: string) => {
    setSort((prev) => {
      if (prev.key !== columnKey) {
        return { key: columnKey, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key: columnKey, direction: 'desc' };
      }
      if (prev.direction === 'desc') {
        return { key: '', direction: null };
      }
      return { key: columnKey, direction: 'asc' };
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
  const data = queryResult.data?.results ?? [];
  const isLoading = queryResult.isLoading;
  const isError = queryResult.isError;

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

  // Total column count including checkbox column
  const totalColumnCount = visibleColumns.length + (selectable ? 1 : 0);

  // Sort indicator
  const renderSortIndicator = (col: ColumnDef<T>) => {
    if (!col.sortable) return null;
    const isActive = sort.key === String(col.key);
    return (
      <span className="ml-1 inline-flex flex-col leading-none">
        <svg
          className={`h-3 w-3 ${isActive && sort.direction === 'asc' ? 'text-indigo-600' : 'text-gray-400'}`}
          viewBox="0 0 10 6"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M5 0L10 6H0L5 0Z" />
        </svg>
        <svg
          className={`h-3 w-3 -mt-0.5 ${isActive && sort.direction === 'desc' ? 'text-indigo-600' : 'text-gray-400'}`}
          viewBox="0 0 10 6"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M5 6L0 0H10L5 6Z" />
        </svg>
      </span>
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
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
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
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        aria-label={`Select row ${rowId}`}
      />
    </td>
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex justify-end mb-2">
          <ColumnVisibilityMenu
            columns={columns}
            hiddenColumns={hiddenColumns}
            onToggle={handleColumnVisibilityChange}
          />
        </div>
        <TableSkeleton columns={visibleColumns.length} rows={5} />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="w-full">
        <div className="flex justify-end mb-2">
          <ColumnVisibilityMenu
            columns={columns}
            hiddenColumns={hiddenColumns}
            onToggle={handleColumnVisibilityChange}
          />
        </div>
        <ErrorState onRetry={() => queryResult.refetch()} />
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="w-full">
        <div className="flex justify-end mb-2">
          <ColumnVisibilityMenu
            columns={columns}
            hiddenColumns={hiddenColumns}
            onToggle={handleColumnVisibilityChange}
          />
        </div>
        <EmptyState
          module=""
          title="No records found"
          description="Try adjusting your filters or adding new data."
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-end mb-2">
        <ColumnVisibilityMenu
          columns={columns}
          hiddenColumns={hiddenColumns}
          onToggle={handleColumnVisibilityChange}
        />
      </div>

      {/* Bulk action toolbar — shown when rows are selected */}
      {selectable && selectedIds.length > 0 && bulkActions && bulkActions.length > 0 && (
        <BulkActionToolbar
          selectedIds={selectedIds}
          bulkActions={bulkActions}
          onClear={handleClearSelection}
        />
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectable && renderCheckboxHeader()}
              {visibleColumns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    col.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                  }`}
                  onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
                  aria-sort={
                    sort.key === String(col.key)
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : sort.direction === 'desc'
                          ? 'descending'
                          : 'none'
                      : undefined
                  }
                >
                  <span className="inline-flex items-center">
                    {col.header}
                    {renderSortIndicator(col)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIdx) => {
              const rowId = (row as Record<string, unknown>).id as string;
              const isSelected = selectable && rowId && selectedIds.includes(rowId);
              return (
                <tr
                  key={rowId ?? rowIdx}
                  className={`${
                    isSelected
                      ? 'bg-indigo-50'
                      : onRowClick
                        ? 'cursor-pointer hover:bg-indigo-50 transition-colors'
                        : 'hover:bg-gray-50 transition-colors'
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
                        className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap"
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
      </div>
    </div>
  );
}
