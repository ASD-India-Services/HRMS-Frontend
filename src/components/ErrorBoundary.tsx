import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';

/**
 * Custom error boundary for React Router.
 * Replaces the default developer-facing error screen with a user-friendly UI.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = 'Something went wrong';
  let message = 'An unexpected error occurred. Please try again.';
  let statusCode: number | null = null;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    if (error.status === 404) {
      title = 'Page not found';
      message = "The page you're looking for doesn't exist or has been moved.";
    } else if (error.status === 403) {
      title = 'Access denied';
      message = "You don't have permission to view this page.";
    } else if (error.status === 500) {
      title = 'Server error';
      message = 'Something went wrong on our end. Please try again later.';
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        {statusCode && (
          <p className="text-6xl font-bold text-gray-300">{statusCode}</p>
        )}
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Go back
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
