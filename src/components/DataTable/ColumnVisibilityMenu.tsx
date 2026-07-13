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
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg
          className="h-4 w-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Columns
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={!isHidden}
                    onChange={() => handleToggle(colKey, isHidden)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
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
