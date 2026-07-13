/**
 * TypeScript interfaces for DataTable component
 *
 * Defines column definitions, filter configuration, bulk actions,
 * and the main DataTableProps used by the generic DataTable component.
 *
 * Requirements: 17.1, 18.1
 */

import type { UseQueryResult } from '@tanstack/react-query';
import type { PaginatedResponse } from './employee';

export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  hidden?: boolean;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'search' | 'select' | 'date-range' | 'multi-select';
  options?: { value: string; label: string }[];
  debounceMs?: number; // default 300 for search
}

export interface BulkAction {
  key: string;
  label: string;
  icon?: string;
  variant?: 'default' | 'destructive';
  /** Confirmation dialog before execution */
  confirm?: { title: string; message: string };
  onExecute: (selectedIds: string[]) => Promise<void>;
}

export interface DataTableProps<T> {
  /** TanStack Query result for the paginated data */
  queryResult: UseQueryResult<PaginatedResponse<T>>;
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Filter configuration rendered above the table */
  filters?: FilterConfig[];
  /** Row click handler (typically navigates to detail) */
  onRowClick?: (row: T) => void;
  /** Enable row selection for bulk actions */
  selectable?: boolean;
  /** Bulk action toolbar configuration */
  bulkActions?: BulkAction[];
  /** Page size options (default: [10, 25, 50, 100]) */
  pageSizeOptions?: number[];
  /** Whether filters are encoded in URL query params */
  syncFiltersToUrl?: boolean;
}
