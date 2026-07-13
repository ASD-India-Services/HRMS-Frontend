/**
 * DataTableSkeleton — Loading state for DataTable
 *
 * Renders a table with shimmer/pulse rows matching the column count
 * to indicate data is being fetched.
 *
 * Requirements: 17.4
 */

interface DataTableSkeletonProps {
  /** Number of columns to render */
  columnCount: number;
  /** Number of skeleton rows to display (default: 5) */
  rowCount?: number;
}

export function DataTableSkeleton({ columnCount, rowCount = 5 }: DataTableSkeletonProps) {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columnCount }).map((_, colIdx) => (
              <th
                key={colIdx}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rowCount }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: columnCount }).map((_, colIdx) => (
                <td key={colIdx} className="px-4 py-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
