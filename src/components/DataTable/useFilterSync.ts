/**
 * useFilterSync — Hook for synchronizing filter state with URL query params
 *
 * Encodes/decodes filter key-value pairs to/from the URL search string
 * so that filtered views are shareable and bookmarkable.
 *
 * Requirements: 17.2
 */

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FilterConfig } from '@/types/datatable';

export interface UseFilterSyncOptions {
  /** Filter configurations to sync */
  filters: FilterConfig[];
  /** Prefix for URL params to avoid collisions (default: '') */
  paramPrefix?: string;
}

export interface UseFilterSyncResult {
  /** Current filter values from URL */
  filterValues: Record<string, string>;
  /** Update a single filter value */
  setFilter: (key: string, value: string) => void;
  /** Clear all filter values */
  clearFilters: () => void;
  /** Current page from URL (1-based) */
  page: number;
  /** Current page size from URL */
  pageSize: number;
  /** Set page number */
  setPage: (page: number) => void;
  /** Set page size */
  setPageSize: (size: number) => void;
}

/**
 * Encodes filter values into URL search params
 */
export function encodeFiltersToParams(
  filters: Record<string, string>,
  prefix: string = ''
): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== undefined) {
      params[`${prefix}${key}`] = value;
    }
  }
  return params;
}

/**
 * Decodes filter values from URL search params
 */
export function decodeFiltersFromParams(
  searchParams: URLSearchParams,
  filterKeys: string[],
  prefix: string = ''
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of filterKeys) {
    const paramValue = searchParams.get(`${prefix}${key}`);
    values[key] = paramValue ?? '';
  }
  return values;
}

export function useFilterSync({
  filters,
  paramPrefix = '',
}: UseFilterSyncOptions): UseFilterSyncResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const filterKeys = useMemo(() => filters.map((f) => f.key), [filters]);

  const filterValues = useMemo(
    () => decodeFiltersFromParams(searchParams, filterKeys, paramPrefix),
    [searchParams, filterKeys, paramPrefix]
  );

  const page = useMemo(() => {
    const pageParam = searchParams.get(`${paramPrefix}page`);
    const parsed = pageParam ? parseInt(pageParam, 10) : 1;
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
  }, [searchParams, paramPrefix]);

  const pageSize = useMemo(() => {
    const sizeParam = searchParams.get(`${paramPrefix}page_size`);
    const parsed = sizeParam ? parseInt(sizeParam, 10) : 10;
    return isNaN(parsed) || parsed < 1 ? 10 : parsed;
  }, [searchParams, paramPrefix]);

  const setFilter = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === '') {
          next.delete(`${paramPrefix}${key}`);
        } else {
          next.set(`${paramPrefix}${key}`, value);
        }
        // Reset to page 1 when filters change
        next.delete(`${paramPrefix}page`);
        return next;
      });
    },
    [setSearchParams, paramPrefix]
  );

  const clearFilters = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of filterKeys) {
        next.delete(`${paramPrefix}${key}`);
      }
      next.delete(`${paramPrefix}page`);
      return next;
    });
  }, [setSearchParams, filterKeys, paramPrefix]);

  const setPage = useCallback(
    (newPage: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (newPage <= 1) {
          next.delete(`${paramPrefix}page`);
        } else {
          next.set(`${paramPrefix}page`, String(newPage));
        }
        return next;
      });
    },
    [setSearchParams, paramPrefix]
  );

  const setPageSize = useCallback(
    (size: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set(`${paramPrefix}page_size`, String(size));
        // Reset page when size changes
        next.delete(`${paramPrefix}page`);
        return next;
      });
    },
    [setSearchParams, paramPrefix]
  );

  return {
    filterValues,
    setFilter,
    clearFilters,
    page,
    pageSize,
    setPage,
    setPageSize,
  };
}
