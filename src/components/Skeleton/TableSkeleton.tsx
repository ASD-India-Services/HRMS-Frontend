/**
 * TableSkeleton — Loading state for table/list pages.
 *
 * Renders a table-like structure with a header row and configurable body rows,
 * each cell showing an animated pulse placeholder that approximates the shape
 * and layout of expected table content.
 *
 * Requirements: 18.1, 18.2
 */

export interface TableSkeletonProps {
  /** Number of columns to render */
  columns: number;
  /** Number of body rows to display (default: 5) */
  rows?: number;
}

/** Column width classes for visual variety across cells. */
const CELL_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6', 'w-3/5'];

export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
  return (
    <div
      className="border border-gray-200 rounded-lg overflow-hidden"
      role="status"
      aria-label="Loading table"
    >
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, colIdx) => (
              <th
                key={colIdx}
                className="px-4 py-3 text-left"
              >
                <div className="h-3 bg-gray-300 rounded animate-pulse w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} className="px-4 py-3">
                  <div
                    className={`h-4 bg-gray-200 rounded animate-pulse ${CELL_WIDTHS[colIdx % CELL_WIDTHS.length]}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
