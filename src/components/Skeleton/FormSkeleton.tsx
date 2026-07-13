/**
 * FormSkeleton — Loading state for form/detail/edit pages.
 *
 * Renders a vertical form layout with a configurable number of field
 * placeholders. Each field consists of a label skeleton and an input
 * skeleton, followed by action button skeletons at the bottom.
 *
 * Requirements: 18.1, 18.3
 */

export interface FormSkeletonProps {
  /** Number of form field placeholders to render */
  fields: number;
}

export function FormSkeleton({ fields }: FormSkeletonProps) {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-label="Loading form"
    >
      {Array.from({ length: fields }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          {/* Label skeleton */}
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          {/* Input skeleton */}
          <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
        </div>
      ))}

      {/* Action buttons skeleton */}
      <div className="flex items-center gap-3 pt-4">
        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
      </div>

      <span className="sr-only">Loading...</span>
    </div>
  );
}
