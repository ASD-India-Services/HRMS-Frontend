/**
 * Error state card displayed when a chart's API request fails.
 * Shows an error message and a retry button.
 *
 * Requirements: 1.5
 */

interface ChartErrorProps {
  message?: string;
  onRetry: () => void;
}

export function ChartError({ message = 'Failed to load chart data', onRetry }: ChartErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-error-main/30 bg-error-lighter p-6">
      <svg
        className="h-8 w-8 text-error-light"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
      <p className="text-sm text-error-main">{message}</p>
      <button
        onClick={onRetry}
        className="rounded bg-error-lighter px-3 py-1.5 text-sm font-medium text-error-dark hover:bg-error-main/20 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
