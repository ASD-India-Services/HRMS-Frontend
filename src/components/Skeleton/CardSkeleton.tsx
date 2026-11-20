/**
 * CardSkeleton — Loading state for dashboard widgets and summary cards.
 *
 * Renders a responsive grid of card placeholders. Each card includes
 * shimmer rectangles for title, subtitle, and content lines.
 *
 * Requirements: 18.1, 18.4
 */

export interface CardSkeletonProps {
  /** Number of card placeholders to render (default: 3) */
  count?: number;
}

export function CardSkeleton({ count = 3 }: CardSkeletonProps) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      role="status"
      aria-label="Loading cards"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="border border-divider rounded-lg p-5 bg-surface-paper"
        >
          {/* Title skeleton */}
          <div className="h-6 w-2/3 bg-surface-neutral rounded animate-pulse" />
          {/* Subtitle skeleton */}
          <div className="mt-3 h-4 w-1/2 bg-surface-neutral rounded animate-pulse" />
          {/* Content lines */}
          <div className="mt-4 space-y-2">
            <div className="h-4 w-full bg-surface-neutral rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-surface-neutral rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-surface-neutral rounded animate-pulse" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
