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
import { Iconify } from '@/components/Iconify';

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
            <Button
              key={action.key}
              variant={action.variant === 'destructive' ? 'soft' : 'outlined'}
              color={action.variant === 'destructive' ? 'error' : 'inherit'}
              size="small"
              onClick={() => handleActionClick(action)}
              disabled={executingKey !== null}
              loading={executingKey === action.key}
              startIcon={action.icon && !executingKey ? <span aria-hidden="true">{action.icon}</span> : undefined}
              aria-label={action.label}
            >
              {action.label}
            </Button>
          ))}
        </div>

        <Button
          variant="text"
          color="inherit"
          size="small"
          startIcon={<Iconify icon="close" />}
          onClick={onClear}
          className="ml-auto"
        >
          Clear selection
        </Button>
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
