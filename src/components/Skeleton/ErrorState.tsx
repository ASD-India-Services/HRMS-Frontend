/**
 * ErrorState — Error display with retry action.
 *
 * Shown when a data fetch fails, replacing the skeleton loader.
 * Displays an error icon, title, descriptive message, and an
 * optional "Retry" button. Built on the shared StateView.
 *
 * Requirements: 18.5
 */
import { Iconify } from '@/components/Iconify';
import { Button } from '@/components/ui/Button';
import { StateView } from '@/components/ui/StateView';

export interface ErrorStateProps {
  /** Error title (defaults to "Something went wrong") */
  title?: string;
  /** Descriptive error message (defaults to "An error occurred. Please try again.") */
  message?: string;
  /** Callback for the Retry button; button is hidden if not provided */
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <StateView
      role="alert"
      tone="error"
      icon="warning"
      title={title}
      description={message}
      action={
        onRetry ? (
          <Button variant="outlined" color="inherit" startIcon={<Iconify icon="refresh" />} onClick={onRetry}>
            Retry
          </Button>
        ) : undefined
      }
    />
  );
}
