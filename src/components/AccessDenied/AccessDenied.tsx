/**
 * AccessDenied
 *
 * Renders a styled 403 "Access Denied" page when a user attempts to
 * navigate to a route they do not have permission to access.
 * Provides a "Go Back" button that navigates to the previous page,
 * or falls back to the dashboard if there is no history entry.
 *
 * Requirements: 15.6 (Unauthorized route access shows Access Denied)
 */

import { useNavigate } from 'react-router-dom';

export function AccessDenied() {
  const navigate = useNavigate();

  function handleGoBack() {
    // If there's browser history, go back; otherwise navigate to dashboard
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 text-center"
      role="main"
      aria-labelledby="access-denied-heading"
    >
      {/* Lock icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10 text-red-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      {/* Error code */}
      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-red-600">
        403 — Forbidden
      </p>

      {/* Heading */}
      <h1
        id="access-denied-heading"
        className="mb-3 text-3xl font-bold text-gray-900"
      >
        Access Denied
      </h1>

      {/* Description */}
      <p className="mb-8 max-w-md text-gray-500">
        You don&apos;t have permission to access this page. Contact your
        administrator if you believe this is an error.
      </p>

      {/* Go Back button */}
      <button
        type="button"
        onClick={handleGoBack}
        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M19 12H5" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Go Back
      </button>
    </div>
  );
}
