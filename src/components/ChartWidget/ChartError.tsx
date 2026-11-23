/**
 * Error state displayed when a chart's API request fails.
 * Shows an error message and a retry button (shared ErrorState look).
 *
 * Requirements: 1.5
 */
import { ErrorState } from '@/components/Skeleton/ErrorState';

interface ChartErrorProps {
  message?: string;
  onRetry: () => void;
}

export function ChartError({ message = 'Failed to load chart data', onRetry }: ChartErrorProps) {
  return <ErrorState title="Unable to load chart" message={message} onRetry={onRetry} />;
}
