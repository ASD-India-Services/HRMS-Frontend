import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { FilterConfig } from '@/types/datatable';

export interface TableFilterColumn {
  key: string;
  header: string;
}

export interface RegisteredFilterBar {
  id: string;
  filters: FilterConfig[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

interface ColumnFilterContextValue {
  columns: TableFilterColumn[];
  filterBar: RegisteredFilterBar | null;
  setColumns: (columns: TableFilterColumn[]) => void;
  registerFilterBar: (filterBar: RegisteredFilterBar) => void;
  unregisterFilterBar: (id: string) => void;
}

const ColumnFilterContext = createContext<ColumnFilterContextValue | null>(null);

export function ColumnFilterProvider({ children }: { children: ReactNode }) {
  const [columns, setColumnsState] = useState<TableFilterColumn[]>([]);
  const [filterBar, setFilterBar] = useState<RegisteredFilterBar | null>(null);

  const setColumns = useCallback((nextColumns: TableFilterColumn[]) => {
    setColumnsState(nextColumns);
  }, []);
  const registerFilterBar = useCallback((nextFilterBar: RegisteredFilterBar) => {
    setFilterBar(nextFilterBar);
  }, []);
  const unregisterFilterBar = useCallback((id: string) => {
    setFilterBar((current) => (current?.id === id ? null : current));
  }, []);

  const value = useMemo(
    () => ({ columns, filterBar, setColumns, registerFilterBar, unregisterFilterBar }),
    [columns, filterBar, setColumns, registerFilterBar, unregisterFilterBar],
  );

  return <ColumnFilterContext.Provider value={value}>{children}</ColumnFilterContext.Provider>;
}

export function useColumnFilterContext() {
  return useContext(ColumnFilterContext);
}

export function matchColumnFilters(
  filters: FilterConfig[],
  columns: TableFilterColumn[],
): Map<string, FilterConfig> {
  const matches = new Map<string, FilterConfig>();
  const available = columns.filter((column) => column.key !== 'id');
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const filter of filters) {
    if (filter.type !== 'select' && filter.type !== 'multi-select') continue;

    const exactTarget = filter.columnKey
      ? available.find((column) => column.key === filter.columnKey)
      : available.find((column) => column.key === filter.key)
        ?? available.find((column) => normalize(column.header) === normalize(filter.label));
    const terms = [normalize(filter.key), normalize(filter.label)].filter(Boolean);
    const partialMatches = exactTarget ? [] : available.filter((column) => {
      const columnTerms = [normalize(column.key), normalize(column.header)];
      return terms.some((term) => columnTerms.some((columnTerm) =>
        columnTerm.startsWith(term) || columnTerm.endsWith(term),
      ));
    });
    const target = exactTarget ?? (partialMatches.length === 1 ? partialMatches[0] : undefined);

    if (target && !matches.has(target.key)) matches.set(target.key, filter);
  }

  return matches;
}
