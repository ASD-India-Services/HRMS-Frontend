/**
 * DataTableError — Error state for DataTable
 *
 * Renders the shared error state with a retry button when an API request fails.
 *
 * Requirements: 17.5
 */
import { ErrorState } from '@/components/Skeleton/ErrorState';

interface DataTableErrorProps {
  /** Error message to display */
  message: string;
  /** Retry handler invoked when the user clicks the retry button */
  onRetry: () => void;
}

export function DataTableError({ message, onRetry }: DataTableErrorProps) {
  return <ErrorState title={message} message="An error occurred while fetching the data." onRetry={onRetry} />;
}
