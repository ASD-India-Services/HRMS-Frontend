/**
 * ColumnVisibilityMenu — Dropdown for toggling column visibility
 *
 * Renders a dropdown button that lists all columns, letting users show/hide
 * columns via checkboxes. Visibility state is persisted to localStorage.
 *
 * Requirements: 17.1
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ColumnDef } from '@/types/datatable';
import { Button } from '@/components/ui/Button';
import { Iconify } from '@/components/Iconify';

const STORAGE_KEY_PREFIX = 'datatable-column-visibility';

interface ColumnVisibilityMenuProps<T> {
  columns: ColumnDef<T>[];
  hiddenColumns: Set<string>;
  onToggle: (columnKey: string, visible: boolean) => void;
  /** Optional storage key suffix for per-table persistence */
  storageKey?: string;
}

export function ColumnVisibilityMenu<T>({
  columns,
  hiddenColumns,
  onToggle,
  storageKey,
}: ColumnVisibilityMenuProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Persist to localStorage when hiddenColumns changes
  useEffect(() => {
    if (storageKey) {
      const key = `${STORAGE_KEY_PREFIX}-${storageKey}`;
      const hidden = Array.from(hiddenColumns);
      localStorage.setItem(key, JSON.stringify(hidden));
    }
  }, [hiddenColumns, storageKey]);

  // Load from localStorage on mount
  useEffect(() => {
    if (storageKey) {
      const key = `${STORAGE_KEY_PREFIX}-${storageKey}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const hidden: string[] = JSON.parse(stored);
          for (const col of columns) {
            const colKey = String(col.key);
            const shouldBeHidden = hidden.includes(colKey);
            const isCurrentlyHidden = hiddenColumns.has(colKey);
            if (shouldBeHidden && !isCurrentlyHidden) {
              onToggle(colKey, false);
            } else if (!shouldBeHidden && isCurrentlyHidden && !col.hidden) {
              onToggle(colKey, true);
            }
          }
        } catch {
          // Ignore invalid localStorage data
        }
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = useCallback(
    (columnKey: string, currentlyHidden: boolean) => {
      onToggle(columnKey, currentlyHidden); // if currently hidden, make visible (true)
    },
    [onToggle]
  );

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="outlined"
        color="inherit"
        size="small"
        startIcon={<Iconify icon="settings" />}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        Columns
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-surface-paper border border-divider rounded shadow-dropdown z-50 py-1">
          <div className="px-3 py-2 border-b border-divider">
            <p className="text-sm font-semibold text-ink-secondary">
              Toggle Columns
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {columns.map((col) => {
              const colKey = String(col.key);
              const isHidden = hiddenColumns.has(colKey);
              return (
                <label
                  key={colKey}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-neutral cursor-pointer text-sm text-ink-secondary"
                >
                  <input
                    type="checkbox"
                    checked={!isHidden}
                    onChange={() => handleToggle(colKey, isHidden)}
                    className="h-4 w-4 rounded border-grey-500/30 text-primary-main focus:ring-primary-main"
                  />
                  {col.header}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
