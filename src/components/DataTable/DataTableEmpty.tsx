/**
 * DataTableEmpty — Empty state for DataTable
 *
 * Renders a centered empty state with an icon and descriptive text
 * when no records match the current filters.
 *
 * Requirements: 17.4
 */

interface DataTableEmptyProps {
  /** Primary message (default: "No records found") */
  message?: string;
  /** Optional secondary description */
  description?: string;
}

export function DataTableEmpty({
  message = 'No records found',
  description,
}: DataTableEmptyProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-8 text-center bg-gray-50">
      {/* Empty state icon */}
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
      <p className="mt-3 text-gray-500 font-medium">{message}</p>
      {description && <p className="text-gray-400 text-sm mt-1">{description}</p>}
    </div>
  );
}
