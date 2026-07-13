/**
 * Full-page loading spinner shown while async data (e.g. permissions)
 * is being fetched. Uses a Tailwind CSS animated spinner.
 */

export function LoadingSpinner() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
