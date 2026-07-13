/**
 * Pagination — Page navigation component for DataTable
 *
 * Renders pagination controls including:
 * - "Showing X to Y of Z results" summary text
 * - Page size selector dropdown
 * - Previous/Next page buttons
 * - Page number buttons for small total page counts
 *
 * Requirements: 3.2
 */

import { useMemo } from 'react';

export interface PaginationProps {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items across all pages */
  totalCount: number;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize]
  );

  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  // Generate page numbers to display
  const pageNumbers = useMemo(() => {
    // Show page buttons only when total pages <= 7
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // For larger page counts, show first, last, and pages around current
    const pages: (number | 'ellipsis')[] = [];

    if (page <= 3) {
      pages.push(1, 2, 3, 4, 'ellipsis', totalPages);
    } else if (page >= totalPages - 2) {
      pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages);
    }

    return pages;
  }, [page, totalPages]);

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(e.target.value);
    onPageSizeChange(newSize);
    // Reset to page 1 when changing page size
    onPageChange(1);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-white">
      {/* Results summary */}
      <div className="text-sm text-gray-600">
        {totalCount === 0 ? (
          <span>No results</span>
        ) : (
          <span>
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalCount}</span> results
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="page-size-select" className="text-sm text-gray-600">
            Rows per page:
          </label>
          <select
            id="page-size-select"
            value={pageSize}
            onChange={handlePageSizeChange}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Page navigation */}
        <nav className="flex items-center gap-1" aria-label="Pagination">
          {/* Previous button */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={isFirstPage}
            aria-label="Previous page"
            className={`inline-flex items-center rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
              isFirstPage
                ? 'cursor-not-allowed text-gray-300'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span className="sr-only sm:not-sr-only sm:ml-1">Prev</span>
          </button>

          {/* Page number buttons */}
          {pageNumbers.map((pageNum, idx) =>
            pageNum === 'ellipsis' ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 py-1.5 text-sm text-gray-500"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                aria-label={`Page ${pageNum}`}
                aria-current={pageNum === page ? 'page' : undefined}
                className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors min-w-[2rem] ${
                  pageNum === page
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {pageNum}
              </button>
            )
          )}

          {/* Next button */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={isLastPage}
            aria-label="Next page"
            className={`inline-flex items-center rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
              isLastPage
                ? 'cursor-not-allowed text-gray-300'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </nav>
      </div>
    </div>
  );
}
