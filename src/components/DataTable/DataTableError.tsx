/**
 * DataTableError — Error state for DataTable
 *
 * Renders an error card with a message and a retry button
 * when an API request fails.
 *
 * Requirements: 17.5
 */

interface DataTableErrorProps {
  /** Error message to display */
  message: string;
  /** Retry handler invoked when the user clicks the retry button */
  onRetry: () => void;
}

export function DataTableError({ message, onRetry }: DataTableErrorProps) {
  return (
    <div className="border border-error-main/30 rounded-lg p-6 text-center bg-error-lighter">
      {/* Error icon */}
      <svg
        className="mx-auto h-10 w-10 text-error-light"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
      <p className="mt-3 text-error-main font-medium">{message}</p>
      <p className="text-error-main text-sm mt-1">An error occurred while fetching the data.</p>
      <button
        onClick={onRetry}
        className="mt-3 px-4 py-2 text-sm font-medium text-error-contrast bg-error-main rounded hover:bg-error-dark transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
