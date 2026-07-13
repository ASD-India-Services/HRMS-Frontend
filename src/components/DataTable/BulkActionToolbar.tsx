/**
 * BulkActionToolbar — Renders action buttons for selected rows
 *
 * Appears when rows are selected in the DataTable. Shows a count of selected items,
 * action buttons for each configured BulkAction (with optional confirmation dialogs),
 * and a "Clear selection" button.
 *
 * Requirements: 17.3, 3.4
 */

import { useState, useCallback } from 'react';
import type { BulkAction } from '@/types/datatable';

interface BulkActionToolbarProps {
  selectedIds: string[];
  bulkActions: BulkAction[];
  onClear: () => void;
}

interface ConfirmState {
  isOpen: boolean;
  action: BulkAction | null;
}

export function BulkActionToolbar({
  selectedIds,
  bulkActions,
  onClear,
}: BulkActionToolbarProps) {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    action: null,
  });
  const [executingKey, setExecutingKey] = useState<string | null>(null);

  const handleActionClick = useCallback(
    (action: BulkAction) => {
      if (action.confirm) {
        setConfirmState({ isOpen: true, action });
      } else {
        executeAction(action);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIds]
  );

  const executeAction = useCallback(
    async (action: BulkAction) => {
      setExecutingKey(action.key);
      try {
        await action.onExecute(selectedIds);
        onClear();
      } finally {
        setExecutingKey(null);
        setConfirmState({ isOpen: false, action: null });
      }
    },
    [selectedIds, onClear]
  );

  const handleConfirm = useCallback(() => {
    if (confirmState.action) {
      executeAction(confirmState.action);
    }
  }, [confirmState.action, executeAction]);

  const handleCancelConfirm = useCallback(() => {
    setConfirmState({ isOpen: false, action: null });
  }, []);

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg mb-2">
        <span className="text-sm font-medium text-indigo-700">
          {selectedIds.length} selected
        </span>

        <div className="flex items-center gap-2 ml-2">
          {bulkActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => handleActionClick(action)}
              disabled={executingKey !== null}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                action.variant === 'destructive'
                  ? 'text-red-700 bg-red-100 hover:bg-red-200 border border-red-300'
                  : 'text-gray-700 bg-white hover:bg-gray-100 border border-gray-300'
              }`}
              aria-label={action.label}
            >
              {executingKey === action.key && (
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {action.icon && !executingKey && (
                <span className="text-base" aria-hidden="true">
                  {action.icon}
                </span>
              )}
              {action.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClear}
          className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Clear selection
        </button>
      </div>

      {/* Confirmation Dialog */}
      {confirmState.isOpen && confirmState.action?.confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCancelConfirm}
            aria-hidden="true"
          />
          {/* Dialog */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3
              id="confirm-dialog-title"
              className="text-lg font-semibold text-gray-900"
            >
              {confirmState.action.confirm.title}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {confirmState.action.confirm.message}
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelConfirm}
                disabled={executingKey !== null}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={executingKey !== null}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 ${
                  confirmState.action.variant === 'destructive'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {executingKey !== null && (
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
