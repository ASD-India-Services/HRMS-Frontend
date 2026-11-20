/**
 * ConfirmDialog
 *
 * A reusable confirmation dialog for delete and other destructive actions.
 * Supports a "destructive" variant that renders the confirm button in red.
 *
 * - Modal overlay with backdrop that closes on click
 * - Title, message, and two buttons (Cancel + Confirm)
 * - Loading state on confirm button
 * - Accessible: role="dialog", aria-modal, aria-labelledby
 * - Escape key closes the dialog
 *
 * Requirements: 2.6
 */

import { Button } from '@/components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';

export interface ConfirmDialogProps {
  /** Whether the dialog is visible */
  isOpen: boolean;
  /** Called when the dialog should close (backdrop click, cancel, or escape) */
  onClose: () => void;
  /** Called when the user confirms the action */
  onConfirm: () => void;
  /** Dialog title */
  title: string;
  /** Dialog message/description */
  message: string;
  /** Label for the confirm button (default: "Confirm") */
  confirmLabel?: string;
  /** Label for the cancel button (default: "Cancel") */
  cancelLabel?: string;
  /** Visual variant — "destructive" renders a red confirm button */
  variant?: 'default' | 'destructive';
  /** Whether the confirm action is in progress */
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      labelledBy="confirm-dialog-title"
      size="sm"
      closeOnEscape={!isLoading}
      closeOnOverlayClick={!isLoading}
    >
      <ModalHeader>
        <h2 id="confirm-dialog-title" className="text-lg font-bold text-ink-primary">
          {title}
        </h2>
      </ModalHeader>

      <ModalBody>
        <p className="text-sm text-ink-secondary">{message}</p>
      </ModalBody>

      <ModalFooter>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button color={variant === 'destructive' ? 'error' : 'primary'} onClick={onConfirm} loading={isLoading}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
