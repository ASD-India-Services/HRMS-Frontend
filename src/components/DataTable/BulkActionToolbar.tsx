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
import { Button } from '@/components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';

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
      <div className="flex items-center gap-3 px-4 py-2 bg-primary-lighter border border-primary-main/30 rounded-lg mb-2">
        <span className="text-sm font-medium text-primary-dark">
          {selectedIds.length} selected
        </span>

        <div className="flex items-center gap-2 ml-2">
          {bulkActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => handleActionClick(action)}
              disabled={executingKey !== null}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                action.variant === 'destructive'
                  ? 'text-error-dark bg-error-lighter hover:bg-error-main/20 border border-error-main/30'
                  : 'text-ink-secondary bg-surface-paper hover:bg-grey-500/10 border border-grey-500/30'
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
          className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-ink-secondary hover:text-ink-primary hover:bg-grey-500/10 rounded transition-colors"
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
        <Modal open onClose={handleCancelConfirm} labelledBy="confirm-dialog-title" size="sm" closeOnEscape={false}>
          <ModalHeader>
            <h3 id="confirm-dialog-title" className="text-lg font-bold text-ink-primary">
              {confirmState.action.confirm.title}
            </h3>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-ink-secondary">{confirmState.action.confirm.message}</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outlined" color="inherit" onClick={handleCancelConfirm} disabled={executingKey !== null}>
              Cancel
            </Button>
            <Button
              color={confirmState.action.variant === 'destructive' ? 'error' : 'primary'}
              onClick={handleConfirm}
              loading={executingKey !== null}
            >
              Confirm
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}
