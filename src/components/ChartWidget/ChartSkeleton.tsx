/**
 * Animated skeleton placeholder displayed while chart data is loading.
 * Renders a shimmer effect matching the specified chart height.
 *
 * Requirements: 1.4
 */

interface ChartSkeletonProps {
  height?: number;
}

export function ChartSkeleton({ height = 300 }: ChartSkeletonProps) {
  return (
    <div
      className="animate-pulse rounded-lg bg-gray-200"
      style={{ height: `${height}px` }}
      role="status"
      aria-label="Loading chart"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
