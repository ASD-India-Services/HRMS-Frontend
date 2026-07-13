/**
 * MetricCardSkeleton
 *
 * Animated pulse/shimmer skeleton matching the MetricCard layout.
 * Shown while metric data is loading.
 *
 * Requirements: 1.1, 1.3
 */

export function MetricCardSkeleton() {
  return (
    <div
      className="block rounded-lg border border-gray-200 bg-white p-5"
      aria-busy="true"
      aria-label="Loading metric"
    >
      <div className="flex items-start justify-between">
        {/* Icon placeholder */}
        <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200" />

        {/* Trend placeholder */}
        <div className="h-5 w-12 animate-pulse rounded bg-gray-200" />
      </div>

      {/* Value placeholder */}
      <div className="mt-4 h-7 w-20 animate-pulse rounded bg-gray-200" />

      {/* Title placeholder */}
      <div className="mt-2 h-4 w-32 animate-pulse rounded bg-gray-200" />
    </div>
  );
}
