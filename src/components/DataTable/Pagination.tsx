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
import { Button } from '@/components/ui/Button';
import { Iconify } from '@/components/Iconify';
import { Select } from '@/components/ui/Select';

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
  pageSizeOptions = [10, 20, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize]
  );

  const computedPageSizeOptions = useMemo(() => {
    const optionsSet = new Set(pageSizeOptions);
    if (pageSize && pageSize > 0) {
      optionsSet.add(pageSize);
    }
    return Array.from(optionsSet).sort((a, b) => a - b);
  }, [pageSizeOptions, pageSize]);

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
    // Note: page reset is handled by onPageSizeChange internally
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-divider bg-surface-paper">
      {/* Results summary */}
      <div className="text-sm text-ink-secondary">
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
          <label htmlFor="page-size-select" className="text-sm text-ink-secondary">
            Rows per page:
          </label>
          <Select
            id="page-size-select"
            selectSize="small"
            value={pageSize}
            onChange={handlePageSizeChange}
            className="w-20"
          >
            {computedPageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </div>

        {/* Page navigation */}
        <nav className="flex items-center gap-1" aria-label="Pagination">
          {/* Previous button */}
          <Button
            variant="text"
            color="inherit"
            size="small"
            startIcon={<Iconify icon="arrow-left" />}
            onClick={() => onPageChange(page - 1)}
            disabled={isFirstPage}
            aria-label="Previous page"
          >
            <span className="sr-only sm:not-sr-only">Prev</span>
          </Button>

          {/* Page number buttons */}
          {pageNumbers.map((pageNum, idx) =>
            pageNum === 'ellipsis' ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 py-1.5 text-sm text-ink-secondary"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <Button
                key={pageNum}
                variant={pageNum === page ? 'contained' : 'text'}
                color={pageNum === page ? 'primary' : 'inherit'}
                size="small"
                onClick={() => onPageChange(pageNum)}
                aria-label={`Page ${pageNum}`}
                aria-current={pageNum === page ? 'page' : undefined}
                className="min-w-[2rem]"
              >
                {pageNum}
              </Button>
            )
          )}

          {/* Next button */}
          <Button
            variant="text"
            color="inherit"
            size="small"
            endIcon={<Iconify icon="arrow-right" />}
            onClick={() => onPageChange(page + 1)}
            disabled={isLastPage}
            aria-label="Next page"
          >
            <span className="sr-only sm:not-sr-only">Next</span>
          </Button>
        </nav>
      </div>
    </div>
  );
}
